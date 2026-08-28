using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace AgentWebApp.Services.Providers;

/// <summary>
/// Tertiary provider: Google Gemini through the Generative Language API.
/// </summary>
public sealed class GeminiChatProvider : IChatCompletionProvider
{
    public const string HttpClientName = "gemini";

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly AIProviderOptions _options;
    private readonly ILogger<GeminiChatProvider> _logger;

    public GeminiChatProvider(
        IHttpClientFactory httpClientFactory,
        IOptions<AIProviderOptions> options,
        ILogger<GeminiChatProvider> logger)
    {
        _httpClientFactory = httpClientFactory;
        _options = options.Value;
        _logger = logger;
    }

    public string Name => ProviderNames.Gemini;

    public string Model => _options.Gemini.Model;

    public bool IsConfigured =>
        _options.Gemini.Enabled && !string.IsNullOrWhiteSpace(_options.Gemini.ApiKey);

    public async Task<ProviderCompletion> CompleteAsync(
        ChatCompletionRequest request,
        CancellationToken cancellationToken = default)
    {
        var settings = _options.Gemini;

        if (!IsConfigured)
        {
            throw new ProviderCallException(
                Name,
                ProviderFailureKind.Failover,
                "Gemini API key is not configured.");
        }

        var timeout = TimeSpan.FromSeconds(_options.RequestTimeoutSeconds);
        using var timeoutSource = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeoutSource.CancelAfter(timeout);

        var url = $"{settings.BaseUrl.TrimEnd('/')}/{settings.ApiVersion.Trim('/')}/models/{settings.Model}:generateContent";

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(BuildPayload(request, settings), Encoding.UTF8, "application/json")
        };

        // The key goes in a header rather than the query string so it never lands in access logs.
        httpRequest.Headers.TryAddWithoutValidation("x-goog-api-key", settings.ApiKey);
        httpRequest.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        var client = _httpClientFactory.CreateClient(HttpClientName);

        HttpResponseMessage response;
        string body;

        try
        {
            _logger.LogDebug("Calling Gemini model {Model}", settings.Model);

            response = await client.SendAsync(httpRequest, timeoutSource.Token);
            body = await response.Content.ReadAsStringAsync(timeoutSource.Token);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (OperationCanceledException ex)
        {
            throw ProviderFailureClassifier.FromTimeout(Name, timeout, ex);
        }
        catch (Exception ex) when (ProviderFailureClassifier.IsTransportError(ex))
        {
            throw ProviderFailureClassifier.FromTransportError(Name, ex);
        }

        using (response)
        {
            if (!response.IsSuccessStatusCode)
            {
                // 429 RESOURCE_EXHAUSTED (rate limit or quota) and 5xx UNAVAILABLE end up as failover.
                throw ProviderFailureClassifier.FromStatusCode(
                    Name,
                    (int)response.StatusCode,
                    body,
                    ProviderFailureClassifier.GetRetryAfter(response));
            }
        }

        return ParseCompletion(body, settings.Model);
    }

    private static string BuildPayload(ChatCompletionRequest request, GeminiProviderOptions settings)
    {
        using var buffer = new MemoryStream();
        using (var writer = new Utf8JsonWriter(buffer))
        {
            writer.WriteStartObject();

            if (!string.IsNullOrWhiteSpace(request.SystemPrompt))
            {
                writer.WriteStartObject("system_instruction");
                writer.WriteStartArray("parts");
                writer.WriteStartObject();
                writer.WriteString("text", request.SystemPrompt);
                writer.WriteEndObject();
                writer.WriteEndArray();
                writer.WriteEndObject();
            }

            writer.WriteStartArray("contents");
            writer.WriteStartObject();
            writer.WriteString("role", "user");
            writer.WriteStartArray("parts");
            writer.WriteStartObject();
            writer.WriteString("text", request.UserPrompt);
            writer.WriteEndObject();
            writer.WriteEndArray();
            writer.WriteEndObject();
            writer.WriteEndArray();

            writer.WriteStartObject("generationConfig");
            writer.WriteNumber("maxOutputTokens", settings.MaxOutputTokens ?? request.MaxOutputTokens);
            writer.WriteNumber("temperature", request.Temperature);
            writer.WriteEndObject();

            writer.WriteEndObject();
        }

        return Encoding.UTF8.GetString(buffer.ToArray());
    }

    private ProviderCompletion ParseCompletion(string body, string configuredModel)
    {
        try
        {
            using var document = JsonDocument.Parse(body);
            var root = document.RootElement;

            // A prompt blocked by safety filters would be blocked for the same reason on a retry.
            if (root.TryGetProperty("promptFeedback", out var feedback) &&
                feedback.TryGetProperty("blockReason", out var blockReason))
            {
                throw new ProviderCallException(
                    Name,
                    ProviderFailureKind.Fatal,
                    $"Gemini blocked the prompt (reason: {blockReason.GetString()}).");
            }

            var builder = new StringBuilder();

            if (root.TryGetProperty("candidates", out var candidates) &&
                candidates.ValueKind == JsonValueKind.Array &&
                candidates.GetArrayLength() > 0)
            {
                var candidate = candidates[0];

                if (candidate.TryGetProperty("content", out var content) &&
                    content.TryGetProperty("parts", out var parts) &&
                    parts.ValueKind == JsonValueKind.Array)
                {
                    foreach (var part in parts.EnumerateArray())
                    {
                        // Thinking models return reasoning parts flagged with "thought": true.
                        if (part.TryGetProperty("thought", out var thought) &&
                            thought.ValueKind == JsonValueKind.True)
                        {
                            continue;
                        }

                        if (part.TryGetProperty("text", out var text))
                        {
                            builder.Append(text.GetString());
                        }
                    }
                }
            }

            var result = builder.ToString();

            if (string.IsNullOrWhiteSpace(result))
            {
                throw new ProviderCallException(
                    Name,
                    ProviderFailureKind.Failover,
                    "Gemini returned a response without any text content.");
            }

            var model = root.TryGetProperty("modelVersion", out var modelVersion)
                ? modelVersion.GetString() ?? configuredModel
                : configuredModel;

            return new ProviderCompletion { Text = result, Model = model };
        }
        catch (JsonException ex)
        {
            throw new ProviderCallException(
                Name,
                ProviderFailureKind.Failover,
                "Gemini returned a response that could not be parsed.",
                isRetryable: true,
                innerException: ex);
        }
    }
}
