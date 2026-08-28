using System.Diagnostics;
using Microsoft.Extensions.Options;

namespace AgentWebApp.Services.Providers;

/// <summary>
/// Failover chain over the registered providers:
///
///   Provider A (Azure OpenAI)
///     success -> return
///     failure (429, quota exhausted, timeout, 5xx, network) -> Provider B (Anthropic / Claude)
///                                                                success -> return
///                                                                failure -> Provider C (Gemini)
///
/// A provider is retried in place only while the failure looks recoverable within a few seconds
/// (rate limit with capacity, 5xx, timeout). Requests the provider rejected on their own merits
/// (malformed, too large, refused) stop the chain immediately - the next provider would reject them too.
/// </summary>
public sealed class ChatCompletionRouter : IChatCompletionRouter
{
    private readonly IReadOnlyList<IChatCompletionProvider> _chain;
    private readonly AIProviderOptions _options;
    private readonly ILogger<ChatCompletionRouter> _logger;

    public ChatCompletionRouter(
        IEnumerable<IChatCompletionProvider> providers,
        IOptions<AIProviderOptions> options,
        ILogger<ChatCompletionRouter> logger)
    {
        _options = options.Value;
        _logger = logger;
        var order = _options.Order.Count > 0 ? _options.Order : AIProviderOptions.DefaultOrder;
        _chain = BuildChain(providers.ToList(), order);

        _logger.LogInformation(
            "AI provider chain: {Chain}",
            string.Join(" -> ", _chain.Select(p => $"{p.Name}({(p.IsConfigured ? "configured" : "skipped")})")));
    }

    public IReadOnlyList<ProviderStatus> DescribeProviders() =>
        _chain.Select((provider, index) => new ProviderStatus
        {
            Name = provider.Name,
            Model = provider.Model,
            Configured = provider.IsConfigured,
            Position = index + 1
        }).ToList();

    public async Task<ChatCompletionResult> CompleteAsync(
        ChatCompletionRequest request,
        CancellationToken cancellationToken = default)
    {
        var attempts = new List<ProviderAttempt>();
        var available = _chain.Where(p => p.IsConfigured).ToList();

        if (available.Count == 0)
        {
            throw new AllProvidersFailedException(
                "No AI provider is configured. Configure at least one of " +
                $"{string.Join(", ", _chain.Select(p => p.Name))} under the '{AIProviderOptions.SectionName}' section.",
                attempts);
        }

        var maxAttempts = Math.Max(1, _options.MaxAttemptsPerProvider);
        ProviderCallException? lastFailure = null;

        for (var providerIndex = 0; providerIndex < available.Count; providerIndex++)
        {
            var provider = available[providerIndex];
            var hasNextProvider = providerIndex < available.Count - 1;

            for (var attemptNumber = 1; attemptNumber <= maxAttempts; attemptNumber++)
            {
                cancellationToken.ThrowIfCancellationRequested();

                var stopwatch = Stopwatch.StartNew();

                try
                {
                    var completion = await provider.CompleteAsync(request, cancellationToken);
                    stopwatch.Stop();

                    attempts.Add(new ProviderAttempt
                    {
                        ProviderName = provider.Name,
                        AttemptNumber = attemptNumber,
                        Succeeded = true,
                        ElapsedMs = stopwatch.ElapsedMilliseconds
                    });

                    if (attempts.Count > 1)
                    {
                        _logger.LogWarning(
                            "Conversation {ConversationId} was served by fallback provider {Provider} after {FailedAttempts} failed attempt(s): {Attempts}",
                            request.CorrelationId,
                            provider.Name,
                            attempts.Count - 1,
                            string.Join(" | ", attempts.Where(a => !a.Succeeded).Select(a => a.Describe())));
                    }
                    else
                    {
                        _logger.LogInformation(
                            "Provider {Provider} ({Model}) answered conversation {ConversationId} in {ElapsedMs}ms",
                            provider.Name,
                            completion.Model,
                            request.CorrelationId,
                            stopwatch.ElapsedMilliseconds);
                    }

                    return new ChatCompletionResult
                    {
                        Text = completion.Text,
                        ProviderName = provider.Name,
                        Model = completion.Model,
                        Attempts = attempts
                    };
                }
                catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
                {
                    // The caller went away - not a provider failure, so do not burn the rest of the chain.
                    throw;
                }
                catch (Exception ex)
                {
                    stopwatch.Stop();

                    var failure = ex as ProviderCallException ?? new ProviderCallException(
                        provider.Name,
                        ProviderFailureKind.Failover,
                        $"{provider.Name} failed unexpectedly: {ex.Message}",
                        innerException: ex);

                    lastFailure = failure;

                    attempts.Add(new ProviderAttempt
                    {
                        ProviderName = provider.Name,
                        AttemptNumber = attemptNumber,
                        Succeeded = false,
                        ElapsedMs = stopwatch.ElapsedMilliseconds,
                        StatusCode = failure.StatusCode,
                        FailureKind = failure.Kind,
                        Error = failure.Message
                    });

                    if (failure.Kind == ProviderFailureKind.Fatal)
                    {
                        _logger.LogError(
                            failure,
                            "Provider {Provider} rejected the request itself; not falling back",
                            provider.Name);

                        throw failure;
                    }

                    var canRetrySameProvider = failure.IsRetryable && attemptNumber < maxAttempts;

                    _logger.LogWarning(
                        failure,
                        "Provider {Provider} attempt {Attempt}/{MaxAttempts} failed ({Status}); {NextStep}",
                        provider.Name,
                        attemptNumber,
                        maxAttempts,
                        failure.StatusCode?.ToString() ?? "no status",
                        canRetrySameProvider
                            ? "retrying the same provider"
                            : hasNextProvider
                                ? $"falling back to {available[providerIndex + 1].Name}"
                                : "no provider left to fall back to");

                    if (!canRetrySameProvider)
                    {
                        break;
                    }

                    await Task.Delay(ComputeDelay(attemptNumber, failure.RetryAfter), cancellationToken);
                }
            }
        }

        throw new AllProvidersFailedException(
            $"All {available.Count} configured AI provider(s) failed: {string.Join(" | ", attempts.Select(a => a.Describe()))}",
            attempts,
            lastFailure);
    }

    /// <summary>
    /// Orders the registered providers by <c>AIProviders:Order</c>. Providers that are registered
    /// but not named in the configured order are appended, so adding one cannot silently drop it.
    /// </summary>
    private List<IChatCompletionProvider> BuildChain(
        IReadOnlyList<IChatCompletionProvider> providers,
        IReadOnlyList<string> order)
    {
        var chain = new List<IChatCompletionProvider>();

        foreach (var name in order)
        {
            var provider = providers.FirstOrDefault(p =>
                string.Equals(p.Name, name, StringComparison.OrdinalIgnoreCase));

            if (provider is null)
            {
                _logger.LogWarning("Provider '{Provider}' is listed in {Section}:Order but is not registered", name, AIProviderOptions.SectionName);
                continue;
            }

            if (!chain.Contains(provider))
            {
                chain.Add(provider);
            }
        }

        foreach (var provider in providers.Where(p => !chain.Contains(p)))
        {
            _logger.LogInformation(
                "Provider '{Provider}' is registered but not listed in {Section}:Order; appending it to the end of the chain",
                provider.Name,
                AIProviderOptions.SectionName);

            chain.Add(provider);
        }

        return chain;
    }

    private TimeSpan ComputeDelay(int attemptNumber, TimeSpan? retryAfter)
    {
        var maxDelayMs = Math.Max(0, _options.MaxRetryDelayMs);
        var baseDelayMs = Math.Max(0, _options.InitialRetryDelayMs) * Math.Pow(2, attemptNumber - 1);
        var delayMs = Math.Min(baseDelayMs, maxDelayMs);

        if (retryAfter is { } wait)
        {
            // Honour the provider's own back-pressure, but never wait longer than configured.
            delayMs = Math.Min(Math.Max(delayMs, wait.TotalMilliseconds), maxDelayMs);
        }

        // Jitter so replicas that hit the same rate limit do not retry in lockstep.
        delayMs *= 0.75 + (Random.Shared.NextDouble() * 0.5);

        return TimeSpan.FromMilliseconds(delayMs);
    }
}
