using AgentWebApp.Services;
using AgentWebApp.Services.Providers;
using Azure.AI.OpenAI;
using Azure.Identity;
using Azure.Monitor.OpenTelemetry.AspNetCore;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

// Note: Secrets are mounted as files from Azure Key Vault via CSI Driver
// The CSI driver mounts secrets from Key Vault as read-only files at /mnt/secrets-store/
// This is more secure than environment variables as secrets never exist as Kubernetes secrets
// No direct Key Vault access is needed from the application code.

// Helper function to read secrets from mounted files
string ReadSecretFromFile(string secretName)
{
    var secretsPath = builder.Configuration["SECRETS_PATH"] ?? "/mnt/secrets-store";
    var secretFilePath = Path.Combine(secretsPath, secretName);
    
    if (File.Exists(secretFilePath))
    {
        return File.ReadAllText(secretFilePath).Trim();
    }
    
    // Fallback to configuration (for local development)
    return builder.Configuration[secretName.Replace("-", ":")] ?? string.Empty;
}

// Load secrets from mounted files and add to configuration
builder.Configuration["ApplicationInsights:ConnectionString"] = ReadSecretFromFile("ApplicationInsights-ConnectionString");
builder.Configuration["AzureOpenAI:Endpoint"] = ReadSecretFromFile("AzureOpenAI-Endpoint");
builder.Configuration["AzureSearch:Endpoint"] = ReadSecretFromFile("AzureSearch-Endpoint");
var managedIdentityClientId = ReadSecretFromFile("AKS-ManagedIdentity-ClientId");

// Fallback provider API keys (optional). They are mounted the same way as the Azure secrets,
// and can also be supplied through configuration or the AIProviders__<Provider>__ApiKey env vars.
// Only overwrite configuration when a secret file actually provided a value.
var anthropicApiKey = ReadSecretFromFile("Anthropic-ApiKey");
if (!string.IsNullOrWhiteSpace(anthropicApiKey))
{
    builder.Configuration["AIProviders:Anthropic:ApiKey"] = anthropicApiKey;
}

var geminiApiKey = ReadSecretFromFile("Gemini-ApiKey");
if (!string.IsNullOrWhiteSpace(geminiApiKey))
{
    builder.Configuration["AIProviders:Gemini:ApiKey"] = geminiApiKey;
}

// Configure Azure credentials - use Managed Identity in AKS with workload identity
var credential = new DefaultAzureCredential(new DefaultAzureCredentialOptions
{
    ManagedIdentityClientId = managedIdentityClientId,
    ExcludeVisualStudioCredential = true,
    ExcludeVisualStudioCodeCredential = true,
    ExcludeSharedTokenCacheCredential = true,
    ExcludeInteractiveBrowserCredential = true,
    ExcludeAzureCliCredential = true,
    ExcludeAzurePowerShellCredential = true,
    ExcludeAzureDeveloperCliCredential = true
});

// Add Azure Monitor (Application Insights) for telemetry
// Connection string is read from mounted secret file
var appInsightsConnectionString = builder.Configuration["ApplicationInsights:ConnectionString"];
if (!string.IsNullOrEmpty(appInsightsConnectionString))
{
    builder.Services.AddOpenTelemetry()
        .UseAzureMonitor(options =>
        {
            options.ConnectionString = appInsightsConnectionString;
        });
}

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { 
        Title = "Conference Expert Agent API", 
        Version = "v1",
        Description = "AI Agent for answering questions about Microsoft Ignite and Build conferences"
    });
});

// Register Azure credential as a service
builder.Services.AddSingleton(credential);

// Multi-provider chat completion chain: Azure OpenAI -> Anthropic (Claude) -> Gemini.
// Ordering, per-provider models and retry/timeout budgets all come from the AIProviders section.
builder.Services.Configure<AIProviderOptions>(builder.Configuration.GetSection(AIProviderOptions.SectionName));

var providerOptions = builder.Configuration
    .GetSection(AIProviderOptions.SectionName)
    .Get<AIProviderOptions>() ?? new AIProviderOptions();

// Register the Azure OpenAI client only when an endpoint is available; without it the
// Azure OpenAI provider simply reports itself as unconfigured and the router skips it.
var openAIEndpoint = builder.Configuration["AzureOpenAI:Endpoint"];
if (!string.IsNullOrEmpty(openAIEndpoint))
{
    builder.Services.AddSingleton(sp =>
    {
        var cred = sp.GetRequiredService<DefaultAzureCredential>();
        Console.WriteLine($"Configuring Azure OpenAI client with endpoint: {openAIEndpoint}");
        return new AzureOpenAIClient(new Uri(openAIEndpoint), cred);
    });
}
else
{
    Console.WriteLine("Azure OpenAI endpoint is not configured; the Azure OpenAI provider will be skipped.");
}

// At least one provider has to be usable, otherwise every chat request would fail at runtime.
if (string.IsNullOrEmpty(openAIEndpoint) &&
    string.IsNullOrWhiteSpace(providerOptions.Anthropic.ApiKey) &&
    string.IsNullOrWhiteSpace(providerOptions.Gemini.ApiKey))
{
    throw new InvalidOperationException(
        "No AI provider is configured. Mount the AzureOpenAI-Endpoint secret at /mnt/secrets-store/, " +
        "or configure an Anthropic/Gemini API key under the AIProviders section " +
        "(AIProviders__Anthropic__ApiKey / AIProviders__Gemini__ApiKey).");
}

// Add HTTP client factory
builder.Services.AddHttpClient();

// Dedicated HTTP clients for the REST based providers. Their timeout is kept slightly above the
// per-request budget so the router classifies the timeout instead of HttpClient aborting first.
var httpClientTimeout = TimeSpan.FromSeconds(Math.Max(1, providerOptions.RequestTimeoutSeconds) + 10);
builder.Services.AddHttpClient(AnthropicChatProvider.HttpClientName, client => client.Timeout = httpClientTimeout);
builder.Services.AddHttpClient(GeminiChatProvider.HttpClientName, client => client.Timeout = httpClientTimeout);

// Provider chain. Registration order does not matter - AIProviders:Order defines the failover order.
builder.Services.AddSingleton<IChatCompletionProvider>(sp => new AzureOpenAIChatProvider(
    sp.GetRequiredService<IOptions<AIProviderOptions>>(),
    sp.GetRequiredService<ILogger<AzureOpenAIChatProvider>>(),
    sp.GetService<AzureOpenAIClient>()));
builder.Services.AddSingleton<IChatCompletionProvider, AnthropicChatProvider>();
builder.Services.AddSingleton<IChatCompletionProvider, GeminiChatProvider>();
builder.Services.AddSingleton<IChatCompletionRouter, ChatCompletionRouter>();

// Add application services
builder.Services.AddSingleton<ISearchService, SearchService>();
builder.Services.AddSingleton<IAgentService, AgentService>();

// Add CORS for development
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Health checks
builder.Services.AddHealthChecks();

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    app.UseCors("AllowAll");
}

// Serve static files (index.html chat interface)
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseHttpsRedirection();
app.UseAuthorization();

// API info endpoint
app.MapGet("/api", () => Results.Json(new
{
    service = "Conference Expert Agent API",
    status = "running",
    endpoints = new
    {
        home = "/",
        health = "/health",
        chat = "/api/chat (POST)",
        swagger = "/swagger (development only)"
    },
    version = "1.0.0"
}));

app.MapControllers();
app.MapHealthChecks("/health");

app.Run();
