namespace AgentWebApp.Services.Providers;

/// <summary>
/// Canonical provider names used in configuration (<c>AIProviders:Order</c>) and logs.
/// </summary>
public static class ProviderNames
{
    public const string AzureOpenAI = "AzureOpenAI";
    public const string Anthropic = "Anthropic";
    public const string Gemini = "Gemini";
}

/// <summary>
/// Options for the multi-provider chat completion chain, bound from the
/// <c>AIProviders</c> configuration section.
/// </summary>
public sealed class AIProviderOptions
{
    public const string SectionName = "AIProviders";

    /// <summary>Order used when <see cref="Order"/> is not configured.</summary>
    public static readonly IReadOnlyList<string> DefaultOrder = new[]
    {
        ProviderNames.AzureOpenAI,
        ProviderNames.Anthropic,
        ProviderNames.Gemini
    };

    /// <summary>
    /// Provider names in failover order. The first configured provider is tried first;
    /// on a transient failure (429, quota exhausted, timeout, 5xx) the next one is tried.
    /// Names that are unknown or not configured are skipped.
    ///
    /// Left empty on purpose: the configuration binder appends to a non-empty list, which would
    /// merge the defaults into whatever order the operator configured. <see cref="DefaultOrder"/>
    /// is applied when nothing is configured.
    /// </summary>
    public List<string> Order { get; set; } = new();

    /// <summary>
    /// How many times a single provider is called before moving on to the next one.
    /// Only retryable failures (429 without quota exhaustion, 5xx, timeouts) are retried in place.
    /// </summary>
    public int MaxAttemptsPerProvider { get; set; } = 2;

    /// <summary>Base delay for the exponential backoff between attempts on the same provider.</summary>
    public int InitialRetryDelayMs { get; set; } = 500;

    /// <summary>Upper bound for the backoff delay, including a server supplied Retry-After.</summary>
    public int MaxRetryDelayMs { get; set; } = 8000;

    /// <summary>Per-request timeout applied to every provider call.</summary>
    public int RequestTimeoutSeconds { get; set; } = 60;

    public AzureOpenAIProviderOptions AzureOpenAI { get; set; } = new();

    public AnthropicProviderOptions Anthropic { get; set; } = new();

    public GeminiProviderOptions Gemini { get; set; } = new();
}

/// <summary>Settings shared by every provider.</summary>
public abstract class ProviderOptionsBase
{
    /// <summary>Set to false to keep a provider out of the chain without removing its configuration.</summary>
    public bool Enabled { get; set; } = true;

    /// <summary>Overrides the per-request output token budget for this provider.</summary>
    public int? MaxOutputTokens { get; set; }
}

public sealed class AzureOpenAIProviderOptions : ProviderOptionsBase
{
    /// <summary>Name of the Azure OpenAI model deployment (not the model name).</summary>
    public string DeploymentName { get; set; } = "gpt-4.1-mini";
}

public sealed class AnthropicProviderOptions : ProviderOptionsBase
{
    /// <summary>Anthropic API key. Mounted from Key Vault as <c>Anthropic-ApiKey</c> in AKS.</summary>
    public string ApiKey { get; set; } = string.Empty;

    public string Model { get; set; } = "claude-opus-5";

    public string BaseUrl { get; set; } = "https://api.anthropic.com";

    /// <summary>Value of the required <c>anthropic-version</c> header.</summary>
    public string ApiVersion { get; set; } = "2023-06-01";

    /// <summary>
    /// Current Claude models (Opus 5 and the 4.6+ family) reject sampling parameters with a 400,
    /// so temperature is omitted by default. Enable only when pinning an older model.
    /// </summary>
    public bool SendTemperature { get; set; }
}

public sealed class GeminiProviderOptions : ProviderOptionsBase
{
    /// <summary>Google AI Studio API key. Mounted from Key Vault as <c>Gemini-ApiKey</c> in AKS.</summary>
    public string ApiKey { get; set; } = string.Empty;

    public string Model { get; set; } = "gemini-2.5-flash";

    public string BaseUrl { get; set; } = "https://generativelanguage.googleapis.com";

    public string ApiVersion { get; set; } = "v1beta";
}
