using AgentWebApp.Models;
using AgentWebApp.Services.Providers;
using System.Diagnostics;
using System.Text;

namespace AgentWebApp.Services;

/// <summary>
/// Implementation of AI Agent service using the RAG (Retrieval Augmented Generation) pattern:
/// 1. Query Azure AI Search for relevant context
/// 2. Send context + user question to the LLM provider chain (Azure OpenAI -> Anthropic -> Gemini)
/// 3. Return intelligent, grounded response
///
/// The completion itself goes through <see cref="IChatCompletionRouter"/>, so a provider that is
/// rate limited, out of quota, timing out or returning 5xx is transparently replaced by the next one.
/// </summary>
public class AgentService : IAgentService
{
    private const string SystemPrompt = @"You are a helpful conference expert assistant specializing in Microsoft Ignite and Build conferences. 
Your role is to answer questions about the Expert Meet-up sessions at these conferences.

When answering:
- Pay CLOSE ATTENTION to years/dates in the question (e.g., 2024 vs 2025 vs 2026)
- Only use information from the CORRECT year mentioned in the question
- Be concise and direct (3-4 sentences when possible)
- Use the provided context to ground your responses
- If the context doesn't contain information for the specific year requested, say so clearly
- Focus on helping users understand session topics, schedules, and expert areas
- Don't make up information - only use what's in the context
- Always mention which conference and year you're answering about";

    private readonly ISearchService _searchService;
    private readonly IChatCompletionRouter _completionRouter;
    private readonly ILogger<AgentService> _logger;

    public AgentService(
        ISearchService searchService,
        IChatCompletionRouter completionRouter,
        ILogger<AgentService> logger)
    {
        _searchService = searchService;
        _completionRouter = completionRouter;
        _logger = logger;
    }

    public async Task<ChatResponse> ProcessMessageAsync(
        ChatRequest request, 
        CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();
        var conversationId = request.ConversationId ?? Guid.NewGuid().ToString();

        try
        {
            _logger.LogInformation(
                "Processing message for conversation {ConversationId}: {Message}", 
                conversationId, 
                request.Message
            );

            // Step 1: Search for relevant context using Azure AI Search
            var searchResults = await _searchService.SearchAsync(
                request.Message, 
                maxResults: 5, 
                cancellationToken
            );

            // Step 2: Build context from search results
            var contextBuilder = new StringBuilder();
            var citations = new List<Citation>();

            await foreach (var result in searchResults.GetResultsAsync())
            {
                var document = result.Document;
                
                // Extract content from document
                var content = document.TryGetValue("content", out var contentValue) 
                    ? contentValue?.ToString() ?? string.Empty 
                    : string.Empty;
                
                var source = document.TryGetValue("metadata_storage_name", out var sourceValue)
                    ? sourceValue?.ToString() ?? "Unknown"
                    : "Unknown";

                if (!string.IsNullOrEmpty(content))
                {
                    contextBuilder.AppendLine($"Source: {source}");
                    contextBuilder.AppendLine(content);
                    contextBuilder.AppendLine();

                    citations.Add(new Citation
                    {
                        Source = source,
                        Content = content.Length > 200 ? content.Substring(0, 200) + "..." : content,
                        Confidence = result.Score ?? 0.0
                    });
                }
            }

            // Step 3: Call the provider chain with the context
            var context = contextBuilder.ToString();
            var completion = await CompleteWithFallbackAsync(
                request.Message,
                context,
                conversationId,
                cancellationToken
            );

            stopwatch.Stop();

            return new ChatResponse
            {
                Message = completion.Text,
                ConversationId = conversationId,
                Citations = citations.Count > 0 ? citations : null,
                Metadata = new ResponseMetadata
                {
                    Timestamp = DateTime.UtcNow,
                    Model = completion.Model,
                    Provider = completion.Provider,
                    FallbackUsed = completion.FallbackUsed,
                    ProviderAttempts = completion.Attempts,
                    ProcessingTimeMs = stopwatch.ElapsedMilliseconds
                }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing message for conversation {ConversationId}", conversationId);
            throw;
        }
    }

    /// <summary>
    /// Runs the completion through the provider chain. If every provider is unavailable the
    /// agent degrades to a search-only answer instead of failing the request outright.
    /// </summary>
    private async Task<AgentCompletion> CompleteWithFallbackAsync(
        string userMessage,
        string context,
        string conversationId,
        CancellationToken cancellationToken)
    {
        var userPrompt = string.IsNullOrEmpty(context)
            ? userMessage
            : $@"Context from conference documents:
{context}

Question: {userMessage}

Please answer based on the context provided above.";

        var completionRequest = new ChatCompletionRequest
        {
            SystemPrompt = SystemPrompt,
            UserPrompt = userPrompt,
            MaxOutputTokens = 800,
            Temperature = 0.7f,
            CorrelationId = conversationId
        };

        try
        {
            var result = await _completionRouter.CompleteAsync(completionRequest, cancellationToken);

            return new AgentCompletion
            {
                Text = result.Text,
                Provider = result.ProviderName,
                Model = result.Model,
                FallbackUsed = result.FallbackUsed,
                Attempts = result.Attempts.Select(a => a.Describe()).ToList()
            };
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (AllProvidersFailedException ex)
        {
            _logger.LogError(ex, "Every AI provider failed for conversation {ConversationId}; answering from search results only", conversationId);

            return new AgentCompletion
            {
                Text = GenerateFallbackResponse(userMessage, context),
                Provider = "none",
                Model = "search-only",
                FallbackUsed = true,
                Attempts = ex.Attempts.Select(a => a.Describe()).ToList()
            };
        }
        catch (ProviderCallException ex)
        {
            // The request itself was rejected (malformed, too large, refused), so no provider would take it.
            _logger.LogError(ex, "Provider {Provider} rejected the request for conversation {ConversationId}", ex.ProviderName, conversationId);

            return new AgentCompletion
            {
                Text = GenerateFallbackResponse(userMessage, context),
                Provider = "none",
                Model = "search-only",
                FallbackUsed = true,
                Attempts = new List<string> { ex.Message }
            };
        }
    }

    private string GenerateFallbackResponse(string userMessage, string context)
    {
        // Last-resort answer built from the search results when no LLM provider is reachable
        
        if (string.IsNullOrEmpty(context))
        {
            return "I don't have enough information to answer that question. Please try rephrasing or asking about Microsoft Ignite or Build conferences.";
        }

        // Extract just the first result to avoid mixing conferences
        var lines = context.Split(new[] { '\n' }, StringSplitOptions.RemoveEmptyEntries);
        var firstSourceIndex = Array.FindIndex(lines, l => l.StartsWith("Source:"));
        
        if (firstSourceIndex >= 0 && lines.Length > firstSourceIndex + 1)
        {
            var source = lines[firstSourceIndex];
            var content = string.Join("\n", lines.Skip(firstSourceIndex + 1)
                .TakeWhile(l => !l.StartsWith("Source:"))
                .Take(15)); // Limit to first 15 lines for readability
            
            return $"Based on the conference information I found:\n\n{source}\n{content}\n\nWould you like to know more about specific topics or sessions?";
        }

        return $"Based on the conference information I found:\n\n{context.Substring(0, Math.Min(400, context.Length))}...\n\nWould you like to know more?";
    }

    /// <summary>Internal carrier for the completion plus the provider trail behind it.</summary>
    private sealed class AgentCompletion
    {
        public required string Text { get; init; }

        public required string Provider { get; init; }

        public required string Model { get; init; }

        public required bool FallbackUsed { get; init; }

        public required List<string> Attempts { get; init; }
    }
}
