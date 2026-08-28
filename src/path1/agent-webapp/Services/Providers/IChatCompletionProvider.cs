namespace AgentWebApp.Services.Providers;

/// <summary>
/// A single LLM backend (Azure OpenAI, Anthropic, Gemini, ...) behind a uniform interface
/// so the router can fail over between them.
/// </summary>
public interface IChatCompletionProvider
{
    /// <summary>Canonical name, matching the entries in <c>AIProviders:Order</c>.</summary>
    string Name { get; }

    /// <summary>Model or deployment this provider will call.</summary>
    string Model { get; }

    /// <summary>
    /// False when the provider has no usable configuration (missing endpoint or API key)
    /// or has been disabled. Unconfigured providers are skipped by the router.
    /// </summary>
    bool IsConfigured { get; }

    /// <summary>
    /// Runs a single completion. Implementations translate provider specific errors into
    /// <see cref="ProviderCallException"/> so the router can decide between retry, failover and abort.
    /// </summary>
    Task<ProviderCompletion> CompleteAsync(ChatCompletionRequest request, CancellationToken cancellationToken = default);
}
