namespace AgentWebApp.Services.Providers;

/// <summary>
/// Provider agnostic chat completion request.
/// </summary>
public sealed class ChatCompletionRequest
{
    /// <summary>System / developer instructions.</summary>
    public string SystemPrompt { get; init; } = string.Empty;

    /// <summary>The end user turn, already grounded with any retrieved context.</summary>
    public string UserPrompt { get; init; } = string.Empty;

    /// <summary>Maximum number of tokens the provider may generate.</summary>
    public int MaxOutputTokens { get; init; } = 800;

    /// <summary>Sampling temperature, applied only by providers that accept it.</summary>
    public float Temperature { get; init; } = 0.7f;

    /// <summary>Correlation id used for logging (the conversation id in this app).</summary>
    public string? CorrelationId { get; init; }
}

/// <summary>
/// What a single provider returns when a call succeeds.
/// </summary>
public sealed class ProviderCompletion
{
    public required string Text { get; init; }

    /// <summary>Model or deployment that actually produced the text.</summary>
    public required string Model { get; init; }
}

/// <summary>
/// One attempt against one provider, successful or not. Surfaced in the API response
/// metadata so a fallback is visible to callers instead of being silently swallowed.
/// </summary>
public sealed class ProviderAttempt
{
    public required string ProviderName { get; init; }

    /// <summary>1-based attempt number within that provider.</summary>
    public required int AttemptNumber { get; init; }

    public required bool Succeeded { get; init; }

    public long ElapsedMs { get; init; }

    /// <summary>HTTP status code when the failure came from the provider's API.</summary>
    public int? StatusCode { get; init; }

    public ProviderFailureKind? FailureKind { get; init; }

    public string? Error { get; init; }

    public override string ToString() => Describe();

    /// <summary>Human readable one-liner, used in logs and in the API response metadata.</summary>
    public string Describe()
    {
        if (Succeeded)
        {
            return $"{ProviderName} attempt {AttemptNumber}: succeeded in {ElapsedMs}ms";
        }

        var status = StatusCode.HasValue ? $" HTTP {StatusCode}" : string.Empty;
        return $"{ProviderName} attempt {AttemptNumber}: {FailureKind?.ToString() ?? "Failed"}{status} - {Error}";
    }
}

/// <summary>
/// Result of the whole failover chain: the text plus the trail of attempts that produced it.
/// </summary>
public sealed class ChatCompletionResult
{
    public required string Text { get; init; }

    /// <summary>Provider that produced the text.</summary>
    public required string ProviderName { get; init; }

    public required string Model { get; init; }

    public required IReadOnlyList<ProviderAttempt> Attempts { get; init; }

    /// <summary>True when at least one provider failed before this one succeeded.</summary>
    public bool FallbackUsed => Attempts.Count > 1;
}
