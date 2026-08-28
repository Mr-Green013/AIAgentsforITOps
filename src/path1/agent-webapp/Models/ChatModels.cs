namespace AgentWebApp.Models;

/// <summary>
/// Request model for chat endpoint
/// </summary>
public class ChatRequest
{
    /// <summary>
    /// User message/question
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Optional conversation ID for multi-turn conversations
    /// </summary>
    public string? ConversationId { get; set; }

    /// <summary>
    /// Optional user context for personalization
    /// </summary>
    public Dictionary<string, string>? Context { get; set; }
}

/// <summary>
/// Response model for chat endpoint
/// </summary>
public class ChatResponse
{
    /// <summary>
    /// Agent's response message
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Conversation ID for tracking multi-turn conversations
    /// </summary>
    public string ConversationId { get; set; } = string.Empty;

    /// <summary>
    /// Citations/sources used by the agent
    /// </summary>
    public List<Citation>? Citations { get; set; }

    /// <summary>
    /// Response metadata
    /// </summary>
    public ResponseMetadata? Metadata { get; set; }
}

/// <summary>
/// Citation/source information
/// </summary>
public class Citation
{
    /// <summary>
    /// Document name or URL
    /// </summary>
    public string Source { get; set; } = string.Empty;

    /// <summary>
    /// Relevant excerpt from the source
    /// </summary>
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// Confidence score (0-1)
    /// </summary>
    public double Confidence { get; set; }
}

/// <summary>
/// Response metadata
/// </summary>
public class ResponseMetadata
{
    /// <summary>
    /// Response generation timestamp
    /// </summary>
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Model used for generation
    /// </summary>
    public string? Model { get; set; }

    /// <summary>
    /// Provider that produced the answer (AzureOpenAI, Anthropic, Gemini, or "none"
    /// when every provider failed and the answer came from search results only)
    /// </summary>
    public string? Provider { get; set; }

    /// <summary>
    /// True when the primary provider failed and a fallback produced the answer
    /// </summary>
    public bool FallbackUsed { get; set; }

    /// <summary>
    /// One entry per provider attempt, in order, including the failures that triggered a fallback
    /// </summary>
    public List<string>? ProviderAttempts { get; set; }

    /// <summary>
    /// Processing time in milliseconds
    /// </summary>
    public long ProcessingTimeMs { get; set; }
}
