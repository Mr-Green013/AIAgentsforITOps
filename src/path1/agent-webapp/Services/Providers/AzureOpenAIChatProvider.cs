using System.ClientModel;
using System.Text;
using Azure;
using Azure.AI.OpenAI;
using Microsoft.Extensions.Options;
using OpenAI.Chat;

namespace AgentWebApp.Services.Providers;

/// <summary>
/// Primary provider: Azure OpenAI, called through the Azure SDK with the app's managed identity.
/// </summary>
public sealed class AzureOpenAIChatProvider : IChatCompletionProvider
{
    private readonly AzureOpenAIClient? _client;
    private readonly AIProviderOptions _options;
    private readonly ILogger<AzureOpenAIChatProvider> _logger;

    public AzureOpenAIChatProvider(
        IOptions<AIProviderOptions> options,
        ILogger<AzureOpenAIChatProvider> logger,
        AzureOpenAIClient? client = null)
    {
        _options = options.Value;
        _logger = logger;
        _client = client;
    }

    public string Name => ProviderNames.AzureOpenAI;

    public string Model => _options.AzureOpenAI.DeploymentName;

    public bool IsConfigured => _options.AzureOpenAI.Enabled && _client is not null;

    public async Task<ProviderCompletion> CompleteAsync(
        ChatCompletionRequest request,
        CancellationToken cancellationToken = default)
    {
        if (_client is null)
        {
            throw new ProviderCallException(
                Name,
                ProviderFailureKind.Failover,
                "Azure OpenAI client is not configured.");
        }

        var deploymentName = _options.AzureOpenAI.DeploymentName;
        var timeout = TimeSpan.FromSeconds(_options.RequestTimeoutSeconds);

        using var timeoutSource = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeoutSource.CancelAfter(timeout);

        var chatMessages = new List<ChatMessage>
        {
            new SystemChatMessage(request.SystemPrompt),
            new UserChatMessage(request.UserPrompt)
        };

        var chatOptions = new ChatCompletionOptions
        {
            MaxOutputTokenCount = _options.AzureOpenAI.MaxOutputTokens ?? request.MaxOutputTokens,
            Temperature = request.Temperature
        };

        try
        {
            _logger.LogDebug("Calling Azure OpenAI deployment {DeploymentName}", deploymentName);

            var chatClient = _client.GetChatClient(deploymentName);
            var response = await chatClient.CompleteChatAsync(chatMessages, chatOptions, timeoutSource.Token);

            var text = ExtractText(response.Value);
            if (string.IsNullOrWhiteSpace(text))
            {
                throw new ProviderCallException(
                    Name,
                    ProviderFailureKind.Failover,
                    $"Azure OpenAI returned an empty completion (finish reason: {response.Value.FinishReason}).");
            }

            return new ProviderCompletion { Text = text, Model = deploymentName };
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (OperationCanceledException ex)
        {
            throw ProviderFailureClassifier.FromTimeout(Name, timeout, ex);
        }
        catch (ClientResultException ex)
        {
            // Thrown by the OpenAI client pipeline (429 rate limit / quota, 5xx, 400, ...).
            throw ProviderFailureClassifier.FromStatusCode(Name, ex.Status, ex.Message);
        }
        catch (RequestFailedException ex)
        {
            // Thrown by Azure.Core based paths, e.g. token acquisition against the endpoint.
            throw ProviderFailureClassifier.FromStatusCode(Name, ex.Status, ex.Message);
        }
        catch (Exception ex) when (ProviderFailureClassifier.IsTransportError(ex))
        {
            throw ProviderFailureClassifier.FromTransportError(Name, ex);
        }
    }

    private static string ExtractText(ChatCompletion completion)
    {
        var builder = new StringBuilder();

        foreach (var part in completion.Content)
        {
            if (!string.IsNullOrEmpty(part.Text))
            {
                builder.Append(part.Text);
            }
        }

        return builder.ToString();
    }
}
