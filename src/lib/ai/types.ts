// AI provider abstraction types
// Allows swapping Gemini with any other provider without changing route logic

export type AIRole = "user" | "assistant" | "system";

export interface AIMessage {
  role: AIRole;
  content: string;
}

export interface AIProviderConfig {
  apiKey: string;
  model: string;
  temperature?: number;
  maxOutputTokens?: number;
}

// Structured analysis output — backward compatible with MentorAnalysis
// but enhanced with confidence, tradeIds, and evidenceMetrics
export interface AnalysisPattern {
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  evidence: string;
  confidence?: "high" | "medium" | "low";
  tradeIds?: string[];
  evidenceMetrics?: Record<string, number | string>;
}

export interface AnalysisRecommendation {
  action: string;
  reasoning: string;
  priority: "high" | "medium" | "low";
  confidence?: "high" | "medium" | "low";
  relatedTradeIds?: string[];
}

export interface StructuredAnalysis {
  summary: string;
  patterns: AnalysisPattern[];
  strengths: string[];
  recommendations: AnalysisRecommendation[];
  confidence_note: string;
}

export interface AIProvider {
  /** Generate a text response (chat mode) — returns ReadableStream for streaming */
  chatStream(messages: AIMessage[]): Promise<ReadableStream<Uint8Array>>;

  /** Generate structured analysis (JSON mode) — returns parsed object */
  analyze(messages: AIMessage[]): Promise<StructuredAnalysis>;
}

export class AIError extends Error {
  constructor(
    message: string,
    public code: "MISSING_KEY" | "RATE_LIMIT" | "SERVER_ERROR" | "TIMEOUT" | "PARSE_ERROR" | "NETWORK" | "VALIDATION"
  ) {
    super(message);
    this.name = "AIError";
  }
}
