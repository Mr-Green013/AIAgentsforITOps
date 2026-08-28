using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace AgentWebApp.Services.Providers;

/// <summary>
/// Secondary provider: Anthropic's Messages API (Claude), called over HTTPS.
///
/// Raw HTTP rather than the Anthropic .NET SDK keeps this workshop app free of an extra
/// package reference and matches the Gemini provider next to it; swapping in the official
/// SDK later only changes the body of <see cref="CompleteAsync"/>.
/// </summary>
public sealed class AnthropicChatProvider : IChatCompletionProvider
{
    public const string HttpClientName = "anthropic";

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly AIProviderOptions _options;
    private readonly ILogger<AnthropicChatProvider> _logger;

    public AnthropicChatProvider(
        IHttpClientFactory httpClientFactory,
        IOptions<AIProviderOptions> options,
        ILogger<AnthropicChatProvider> logger)
    {
        _httpClientFactory = httpClientFactory;
        _options = options.Value;
        _logger = logger;
    }

    public string Name => ProviderNames.Anthropic;

    public string Model => _options.Anthropic.Model;

    public bool IsConfigured =>
        _options.Anthropic.Enabled && !string.IsNullOrWhiteSpace(_options.Anthropic.ApiKey);

    public async Task<ProviderCompletion> CompleteAsync(
        ChatCompletionRequest request,
        CancellationToken cancellationToken = default)
    {
        var settings = _options.Anthropic;

        if (!IsConfigured)
        {
            throw new ProviderCallException(
                Name,
                ProviderFailureKind.Failover,
                "Anthropic API key is not configured.");
        }

        var timeout = TimeSpan.FromSeconds(_options.RequestTimeoutSeconds);
        using var timeoutSource = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeoutSource.CancelAfter(timeout);

        var payload = BuildPayload(request, settings);

        using var httpRequest = new HttpRequestMessage(
            HttpMethod.Post,
            $"{settings.BaseUrl.TrimEnd('/')}/v1/messages")
        {
            Content = new StringContent(payload, Encoding.UTF8, "application/json")
        };

        httpRequest.Headers.TryAddWithoutValidation("x-api-key", settings.ApiKey);
        httpRequest.Headers.TryAddWithoutValidation("anthropic-version", settings.ApiVersion);
        httpRequest.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        var client = _httpClientFactory.CreateClient(HttpClientName);

        HttpResponseMessage response;
        string body;

        try
        {
            _logger.LogDebug("Calling Anthropic model {Model}", settings.Model);

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
                // 429 rate_limit_error, 529 overloaded_error and 5xx are all retryable/failover;
                // the classifier decides based on the status code and the error body.
                throw ProviderFailureClassifier.FromStatusCode(
                    Name,
                    (int)response.StatusCode,
                    body,
                    ProviderFailureClassifier.GetRetryAfter(response));
            }
        }

        return ParseCompletion(body, settings.Model);
    }

    private static string BuildPayload(ChatCompletionRequest request, AnthropicProviderOptions settings)
    {
        using var buffer = new MemoryStream();
        using (var writer = new Utf8JsonWriter(buffer))
        {
            writer.WriteStartObject();
            writer.WriteString("model", settings.Model);
            writer.WriteNumber("max_tokens", settings.MaxOutputTokens ?? request.MaxOutputTokens);

            if (!string.IsNullOrWhiteSpace(request.SystemPrompt))
            {
                writer.WriteString("system", request.SystemPrompt);
            }

            // Current Claude models reject temperature/top_p with a 400, so it is opt-in.
            if (settings.SendTemperature)
            {
                writer.WriteNumber("temperature", request.Temperature);
            }

            writer.WriteStartArray("messages");
            writer.WriteStartObject();
            writer.WriteString("role", "user");
            writer.WriteString("content", request.UserPrompt);
            writer.WriteEndObject();
            writer.WriteEndArray();

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

            var model = root.TryGetProperty("model", out var modelElement)
                ? modelElement.GetString() ?? configuredModel
                : configuredModel;

            if (root.TryGetProperty("stop_reason", out var stopReason) &&
                stopReason.ValueKind == JsonValueKind.String &&
                string.Equals(stopReason.GetString(), "refusal", StringComparison.Ordinal))
            {
                // A safety refusal is a property of the request, not of provider capacity:
                // failing over would only ask another model to refuse the same prompt.
                throw new ProviderCallException(
                    Name,
                    ProviderFailureKind.Fatal,
                    "Anthropic declined to answer this request (stop_reason: refusal).");
            }

            var builder = new StringBuilder();

            if (root.TryGetProperty("content", out var content) && content.ValueKind == JsonValueKind.Array)
            {
                foreach (var block in content.EnumerateArray())
                {
                    // Thinking blocks may precede the answer; only text blocks carry the reply.
                    if (block.TryGetProperty("type", out var type) &&
                        string.Equals(type.GetString(), "text", StringComparison.Ordinal) &&
                        block.TryGetProperty("text", out var text))
                    {
                        builder.Append(text.GetString());
                    }
                }
            }

            var result = builder.ToString();

            if (string.IsNullOrWhiteSpace(result))
            {
                throw new ProviderCallException(
                    Name,
                    ProviderFailureKind.Failover,
                    "Anthropic returned a response without any text content.");
            }

            return new ProviderCompletion { Text = result, Model = model };
        }
        catch (JsonException ex)
        {
            throw new ProviderCallException(
                Name,
                ProviderFailureKind.Failover,
                "Anthropic returned a response that could not be parsed.",
                isRetryable: true,
                innerException: ex);
        }
    }
}
