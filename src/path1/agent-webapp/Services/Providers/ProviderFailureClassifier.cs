using System.Net;
using System.Net.Sockets;

namespace AgentWebApp.Services.Providers;

/// <summary>
/// Maps provider specific errors onto the router's failover model.
///
/// Failover (try the next provider): 408/409/429, all 5xx, network errors, timeouts,
/// and credential/configuration problems (401/403/404) which another provider may not have.
/// Fatal (stop the chain): 4xx errors caused by the request itself, which every provider
/// would reject the same way.
/// </summary>
internal static class ProviderFailureClassifier
{
    private static readonly string[] QuotaMarkers =
    {
        "insufficient_quota",
        "exceeded your current quota",
        "quota exceeded",
        "resource_exhausted",
        "billing"
    };

    /// <summary>
    /// Builds an exception from an HTTP style failure response.
    /// </summary>
    public static ProviderCallException FromStatusCode(
        string providerName,
        int statusCode,
        string? responseBody,
        TimeSpan? retryAfter = null)
    {
        var detail = Summarize(responseBody);

        return statusCode switch
        {
            429 => new ProviderCallException(
                providerName,
                ProviderFailureKind.Failover,
                $"{providerName} rejected the request with 429 ({(IsQuotaExhausted(responseBody) ? "quota exhausted" : "rate limited")}). {detail}",
                // A hard quota stop will not clear within a retry window; a rate limit can.
                isRetryable: !IsQuotaExhausted(responseBody),
                statusCode: statusCode,
                retryAfter: retryAfter),

            408 or 409 => new ProviderCallException(
                providerName,
                ProviderFailureKind.Failover,
                $"{providerName} returned {statusCode}. {detail}",
                isRetryable: true,
                statusCode: statusCode,
                retryAfter: retryAfter),

            >= 500 => new ProviderCallException(
                providerName,
                ProviderFailureKind.Failover,
                $"{providerName} returned a server error ({statusCode}). {detail}",
                isRetryable: true,
                statusCode: statusCode,
                retryAfter: retryAfter),

            401 or 403 or 404 => new ProviderCallException(
                providerName,
                ProviderFailureKind.Failover,
                $"{providerName} is not usable with the current configuration ({statusCode}). {detail}",
                isRetryable: false,
                statusCode: statusCode),

            _ => new ProviderCallException(
                providerName,
                ProviderFailureKind.Fatal,
                $"{providerName} rejected the request ({statusCode}). {detail}",
                isRetryable: false,
                statusCode: statusCode)
        };
    }

    /// <summary>
    /// Builds an exception from a transport level failure (DNS, socket, TLS, ...).
    /// </summary>
    public static ProviderCallException FromTransportError(string providerName, Exception exception) =>
        new(
            providerName,
            ProviderFailureKind.Failover,
            $"{providerName} could not be reached: {exception.Message}",
            isRetryable: true,
            innerException: exception);

    /// <summary>
    /// Builds an exception for a call that exceeded the configured per-request timeout.
    /// </summary>
    public static ProviderCallException FromTimeout(string providerName, TimeSpan timeout, Exception? exception = null) =>
        new(
            providerName,
            ProviderFailureKind.Failover,
            $"{providerName} did not respond within {timeout.TotalSeconds:0.#}s.",
            isRetryable: true,
            statusCode: (int)HttpStatusCode.RequestTimeout,
            innerException: exception);

    /// <summary>
    /// True for exceptions that mean "the call never reached a usable response".
    /// </summary>
    public static bool IsTransportError(Exception exception) =>
        exception is HttpRequestException or SocketException or IOException;

    /// <summary>
    /// Reads a <c>Retry-After</c> header, in either its delay-seconds or HTTP-date form.
    /// </summary>
    public static TimeSpan? GetRetryAfter(HttpResponseMessage response)
    {
        var retryAfter = response.Headers.RetryAfter;

        if (retryAfter?.Delta is { } delta)
        {
            return delta > TimeSpan.Zero ? delta : null;
        }

        if (retryAfter?.Date is { } date)
        {
            var wait = date - DateTimeOffset.UtcNow;
            return wait > TimeSpan.Zero ? wait : null;
        }

        return null;
    }

    private static bool IsQuotaExhausted(string? responseBody)
    {
        if (string.IsNullOrEmpty(responseBody))
        {
            return false;
        }

        foreach (var marker in QuotaMarkers)
        {
            if (responseBody.Contains(marker, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    private static string Summarize(string? responseBody)
    {
        if (string.IsNullOrWhiteSpace(responseBody))
        {
            return string.Empty;
        }

        var single = responseBody.Replace('\n', ' ').Replace('\r', ' ').Trim();
        return single.Length > 400 ? single[..400] + "..." : single;
    }
}
