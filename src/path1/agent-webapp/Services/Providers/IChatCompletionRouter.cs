namespace AgentWebApp.Services.Providers;

/// <summary>
/// Runs a chat completion against the configured providers in order, failing over
/// when a provider is rate limited, out of quota, timing out or returning 5xx.
/// </summary>
public interface IChatCompletionRouter
{
    /// <summary>
    /// Calls the first healthy provider that returns a completion.
    /// </summary>
    /// <exception cref="AllProvidersFailedException">Every configured provider failed.</exception>
    /// <exception cref="ProviderCallException">
    /// The request itself was rejected (<see cref="ProviderFailureKind.Fatal"/>), so no further provider is tried.
    /// </exception>
    Task<ChatCompletionResult> CompleteAsync(ChatCompletionRequest request, CancellationToken cancellationToken = default);

    /// <summary>Provider chain as it will be used, for health/diagnostics endpoints.</summary>
    IReadOnlyList<ProviderStatus> DescribeProviders();
}

/// <summary>Diagnostic view of one provider in the chain.</summary>
public sealed class ProviderStatus
{
    public required string Name { get; init; }

    public required string Model { get; init; }

    /// <summary>False when credentials are missing or the provider is disabled; such providers are skipped.</summary>
    public required bool Configured { get; init; }

    /// <summary>1-based position in the failover chain.</summary>
    public required int Position { get; init; }
}
