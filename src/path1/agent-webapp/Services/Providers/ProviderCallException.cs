namespace AgentWebApp.Services.Providers;

/// <summary>
/// How the router should react to a provider failure.
/// </summary>
public enum ProviderFailureKind
{
    /// <summary>
    /// The provider could not serve this request (rate limit, quota exhausted, timeout,
    /// 5xx, network error, bad credentials). Try the next provider in the chain.
    /// </summary>
    Failover,

    /// <summary>
    /// The request itself is unacceptable (malformed, too large, refused on content grounds).
    /// Every provider would reject it, so the chain stops immediately.
    /// </summary>
    Fatal
}

/// <summary>
/// Normalized failure raised by every provider implementation.
/// </summary>
public sealed class ProviderCallException : Exception
{
    public ProviderCallException(
        string providerName,
        ProviderFailureKind kind,
        string message,
        bool isRetryable = false,
        int? statusCode = null,
        TimeSpan? retryAfter = null,
        Exception? innerException = null)
        : base(message, innerException)
    {
        ProviderName = providerName;
        Kind = kind;
        IsRetryable = isRetryable;
        StatusCode = statusCode;
        RetryAfter = retryAfter;
    }

    public string ProviderName { get; }

    public ProviderFailureKind Kind { get; }

    /// <summary>
    /// True when calling the same provider again may succeed (429 with capacity, 5xx, timeout).
    /// False for failures a retry cannot fix, such as an invalid key or an exhausted quota.
    /// </summary>
    public bool IsRetryable { get; }

    public int? StatusCode { get; }

    /// <summary>Delay requested by the provider through a <c>Retry-After</c> header, when present.</summary>
    public TimeSpan? RetryAfter { get; }
}

/// <summary>
/// Raised when every configured provider failed, or when none is configured at all.
/// </summary>
public sealed class AllProvidersFailedException : Exception
{
    public AllProvidersFailedException(string message, IReadOnlyList<ProviderAttempt> attempts, Exception? innerException = null)
        : base(message, innerException)
    {
        Attempts = attempts;
    }

    public IReadOnlyList<ProviderAttempt> Attempts { get; }
}
