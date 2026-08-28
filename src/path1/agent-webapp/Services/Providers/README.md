# Multi-Provider LLM Failover

The agent does not depend on a single LLM endpoint. Every completion goes through
`IChatCompletionRouter`, which walks a configured chain of providers and moves on when one
of them cannot serve the request.

```
Provider A (Azure OpenAI)
  ├─ success → use the result
  └─ failure (429 rate limit, quota exceeded, timeout, 5xx, network error)
        ↓
     Provider B (Anthropic / Claude)
       ├─ success → use the result
       └─ failure → Provider C (Gemini)
                      ├─ success → use the result
                      └─ failure → search-only answer (HTTP 200) with the attempt trail
```

## Files

| File | Purpose |
| --- | --- |
| `IChatCompletionProvider.cs` | Uniform interface every backend implements |
| `AzureOpenAIChatProvider.cs` | Azure OpenAI via the Azure SDK and managed identity |
| `AnthropicChatProvider.cs` | Anthropic Messages API (`POST /v1/messages`) over HTTPS |
| `GeminiChatProvider.cs` | Gemini Generative Language API (`:generateContent`) over HTTPS |
| `ChatCompletionRouter.cs` | Retry + failover logic, ordering, logging |
| `ProviderFailureClassifier.cs` | Maps HTTP status codes and transport errors onto retry/failover/abort |
| `AIProviderOptions.cs` | Configuration bound from the `AIProviders` section |

## How failures are classified

| Failure | Same-provider retry | Failover to the next provider |
| --- | --- | --- |
| 429 rate limited (with `Retry-After`) | yes | yes |
| 429 quota exhausted / billing | no | yes |
| 408, 409 | yes | yes |
| 5xx (including Anthropic 529 overloaded) | yes | yes |
| Timeout, DNS/socket/TLS error | yes | yes |
| 401, 403, 404 (bad key, wrong endpoint) | no | yes |
| Other 4xx (malformed, too large), safety refusal / blocked prompt | no | **no** - the chain stops, since every provider would reject the same request |

Retries use exponential backoff with jitter, capped by `MaxRetryDelayMs`, and honour a
`Retry-After` header when the provider sends one.

## Configuration

```jsonc
"AIProviders": {
  "Order": [ "AzureOpenAI", "Anthropic", "Gemini" ],  // failover order
  "MaxAttemptsPerProvider": 2,                        // attempts before moving on
  "InitialRetryDelayMs": 500,
  "MaxRetryDelayMs": 8000,
  "RequestTimeoutSeconds": 60,                        // per provider call

  "AzureOpenAI": { "Enabled": true, "DeploymentName": "gpt-4.1-mini" },
  "Anthropic":   { "Enabled": true, "Model": "claude-opus-5", "ApiKey": "" },
  "Gemini":      { "Enabled": true, "Model": "gemini-2.5-flash", "ApiKey": "" }
}
```

A provider with no credentials (or `Enabled: false`) is skipped, so the workshop keeps working
with Azure OpenAI alone. Startup fails only when *no* provider is usable.

### Supplying keys

| Environment | Azure OpenAI | Anthropic / Gemini |
| --- | --- | --- |
| AKS (default) | `AzureOpenAI-Endpoint` mounted from Key Vault, managed identity for auth | `Anthropic-ApiKey` / `Gemini-ApiKey` mounted from Key Vault at `/mnt/secrets-store/` |
| Local dev | `AzureOpenAI:Endpoint` in user secrets/appsettings | `AIProviders__Anthropic__ApiKey`, `AIProviders__Gemini__ApiKey` env vars |

To add a key in AKS, store it in Key Vault and uncomment the matching entry in
`kubernetes/path1/secretproviderclass.yaml` (the CSI driver fails the pod mount if a listed
secret does not exist yet).

Do not commit API keys - the `ApiKey` fields in `appsettings.json` are placeholders.

## Observability

Every response reports which provider answered:

```json
"metadata": {
  "model": "claude-opus-5",
  "provider": "Anthropic",
  "fallbackUsed": true,
  "providerAttempts": [
    "AzureOpenAI attempt 1: Failover HTTP 429 - AzureOpenAI rejected the request with 429 (rate limited).",
    "AzureOpenAI attempt 2: Failover HTTP 429 - AzureOpenAI rejected the request with 429 (rate limited).",
    "Anthropic attempt 1: succeeded in 1840ms"
  ],
  "processingTimeMs": 4210
}
```

A fallback is logged at warning level (with the failing attempts) so it shows up in
Application Insights, and `GET /api/chat/providers` returns the chain with each provider's
configured state.

## Adding a provider

1. Implement `IChatCompletionProvider` (translate errors with `ProviderFailureClassifier`).
2. Register it: `builder.Services.AddSingleton<IChatCompletionProvider, MyProvider>();`
3. Add its name to `AIProviders:Order`. A registered provider missing from that list is
   appended to the end of the chain rather than dropped.
