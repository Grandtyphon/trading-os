import { GoogleGenAI, Type, type Schema } from "@google/genai";
import type {
  AIProvider,
  AIProviderConfig,
  AIMessage,
  StructuredAnalysis,
} from "./types";
import { AIError } from "./types";

const SYSTEM_INSTRUCTION = `تو یک منتور معامله‌گری حرفه‌ای هستی که متدولوژی LIT (Liquidity Inducement Theorem) رو تدریس می‌کنی. زبانت فارسی، لحن‌ات مستقیم و صادق بی‌تعارفه.`;

// Response schema for structured analysis output
const analysisSchema: Schema = {
  type: Type.OBJECT,
  required: ["summary", "patterns", "strengths", "recommendations", "confidence_note"],
  properties: {
    summary: {
      type: Type.STRING,
      description: "خلاصه‌ی کلی وضعیت — ۲-۳ جمله با ارقام دقیق",
    },
    patterns: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["title", "description", "severity", "evidence"],
        properties: {
          title: { type: Type.STRING, description: "عنوان کوتاه الگو" },
          description: { type: Type.STRING, description: "توضیح دقیق با ارجاع به داده و ID ترید" },
          severity: { type: Type.STRING, enum: ["high", "medium", "low"] },
          evidence: { type: Type.STRING, description: "دلیل و ارقام مشخص با IDs ترید" },
          confidence: { type: Type.STRING, enum: ["high", "medium", "low"] },
          tradeIds: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "ID ترید‌های مرتبط",
          },
          evidenceMetrics: {
            type: Type.OBJECT,
            description: "متریک‌های证据 مثل count, netR",
          },
        },
      },
    },
    strengths: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    recommendations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["action", "reasoning", "priority"],
        properties: {
          action: { type: Type.STRING, description: "اقدام مشخص و عملی" },
          reasoning: { type: Type.STRING, description: "چرا این اقدام — با ارجاع به داده" },
          priority: { type: Type.STRING, enum: ["high", "medium", "low"] },
          confidence: { type: Type.STRING, enum: ["high", "medium", "low"] },
          relatedTradeIds: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
      },
    },
    confidence_note: {
      type: Type.STRING,
      description: "یادداشت درباره‌ی اطمینان تحلیل و محدودیت‌ها",
    },
  },
};

export class GeminiProvider implements AIProvider {
  private genAI: GoogleGenAI;
  private model: string;
  private temperature: number;
  private maxOutputTokens: number;
  private thinkingLevel: "low" | "medium" | "high" | "none";

  constructor(config: AIProviderConfig) {
    this.genAI = new GoogleGenAI({ apiKey: config.apiKey });
    this.model = config.model || "gemini-3.7-flash";
    this.temperature = config.temperature ?? 0.7;
    this.maxOutputTokens = config.maxOutputTokens ?? 8192;

    const envThinking = process.env.GEMINI_THINKING_LEVEL;
    this.thinkingLevel =
      envThinking === "low" || envThinking === "medium" || envThinking === "high" || envThinking === "none"
        ? envThinking
        : "medium";
  }

  /**
   * Chat mode — streaming text response via @google/genai
   */
  async chatStream(messages: AIMessage[]): Promise<ReadableStream<Uint8Array>> {
    // Convert messages to Gemini format (user/model roles)
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    // Merge consecutive same-role messages
    const merged: typeof contents = [];
    for (const msg of contents) {
      const last = merged[merged.length - 1];
      if (last && last.role === msg.role) {
        (last.parts[0] as any).text += "\n\n" + (msg.parts[0] as any).text;
      } else {
        merged.push({ ...msg });
      }
    }

    // Ensure starts with user
    if (merged.length === 0 || merged[0].role !== "user") {
      merged.unshift({ role: "user", parts: [{ text: "شروع گفتگو" }] });
    }

    // Ensure alternating roles
    const finalContents: typeof contents = [];
    for (let i = 0; i < merged.length; i++) {
      const msg = merged[i];
      if (i > 0 && finalContents[finalContents.length - 1].role === msg.role) {
        finalContents.push({ role: "model", parts: [{ text: "متوجه شدم." }] });
      }
      finalContents.push(msg);
    }

    // Last must be user
    if (finalContents[finalContents.length - 1].role !== "user") {
      finalContents.push({ role: "user", parts: [{ text: "ادامه بده" }] });
    }

    // Take last 20 messages
    const trimmed = finalContents.slice(-20);

    const responseStream = await this.withErrorHandling(() =>
      this.genAI.models.generateContentStream({
        model: this.model,
        contents: trimmed,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: this.temperature,
          maxOutputTokens: this.maxOutputTokens,
          // Thinking config for models that support it (2.5+)
          ...(this.thinkingLevel !== "none" && {
            thinkingConfig: {
              thinkingBudget: this.thinkingLevel === "low" ? 1024 : this.thinkingLevel === "medium" ? 8192 : 24576,
            },
          }),
        },
      })
    );

    const encoder = new TextEncoder();
    return new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of responseStream) {
            const text = chunk.text;
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();
        } catch (err: any) {
          controller.enqueue(
            encoder.encode(`\n\n[خطا: ${err?.message ?? "stream interrupted"}]`)
          );
          controller.close();
        }
      },
    });
  }

  /**
   * Analysis mode — structured JSON output via responseSchema
   * Uses Gemini's native structured output, NOT prompt-based JSON
   */
  async analyze(messages: AIMessage[]): Promise<StructuredAnalysis> {
    const systemContent = messages.find((m) => m.role === "system")?.content ?? "";
    const userContent = messages.filter((m) => m.role === "user").map((m) => m.content).join("\n\n");

    const fullPrompt = systemContent
      ? `${systemContent}\n\n---\n\n${userContent}`
      : userContent;

    const result = await this.withErrorHandling(() =>
      this.genAI.models.generateContent({
        model: this.model,
        contents: fullPrompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.4, // low temperature for analytical accuracy
          maxOutputTokens: this.maxOutputTokens,
          responseMimeType: "application/json",
          responseSchema: analysisSchema,
          // Thinking for analysis
          ...(this.thinkingLevel !== "none" && {
            thinkingConfig: {
              thinkingBudget: this.thinkingLevel === "low" ? 2048 : this.thinkingLevel === "medium" ? 12288 : 24576,
            },
          }),
        },
      })
    );

    const text = result.text;

    if (!text || text.trim().length === 0) {
      throw new AIError("پاسخ خالی از مدل", "PARSE_ERROR");
    }

    try {
      const parsed = JSON.parse(text);
      return this.validateAnalysis(parsed);
    } catch {
      throw new AIError("خروجی JSON معتبر نیست", "PARSE_ERROR");
    }
  }

  /** Validate and normalize analysis object */
  private validateAnalysis(raw: any): StructuredAnalysis {
    const safe = (val: any, fallback: string) =>
      typeof val === "string" ? val : fallback;

    const safeArray = (val: any): string[] =>
      Array.isArray(val) ? val.filter((x: any) => typeof x === "string") : [];

    const safePatterns = (val: any): StructuredAnalysis["patterns"] => {
      if (!Array.isArray(val)) return [];
      return val
        .filter((p: any) => p && typeof p === "object")
        .map((p: any) => ({
          title: safe(p.title, "بدون عنوان"),
          description: safe(p.description, ""),
          severity: ["high", "medium", "low"].includes(p.severity) ? p.severity : "medium",
          evidence: safe(p.evidence, ""),
          confidence: ["high", "medium", "low"].includes(p.confidence) ? p.confidence : "medium",
          tradeIds: Array.isArray(p.tradeIds) ? p.tradeIds.filter((id: any) => typeof id === "string") : [],
          evidenceMetrics: p.evidenceMetrics && typeof p.evidenceMetrics === "object" ? p.evidenceMetrics : {},
        }));
    };

    const safeRecommendations = (val: any): StructuredAnalysis["recommendations"] => {
      if (!Array.isArray(val)) return [];
      return val
        .filter((r: any) => r && typeof r === "object")
        .map((r: any) => ({
          action: safe(r.action, ""),
          reasoning: safe(r.reasoning, ""),
          priority: ["high", "medium", "low"].includes(r.priority) ? r.priority : "medium",
          confidence: ["high", "medium", "low"].includes(r.confidence) ? r.confidence : "medium",
          relatedTradeIds: Array.isArray(r.relatedTradeIds) ? r.relatedTradeIds.filter((id: any) => typeof id === "string") : [],
        }));
    };

    return {
      summary: safe(raw?.summary, "تحلیل دریافت نشد"),
      patterns: safePatterns(raw?.patterns),
      strengths: safeArray(raw?.strengths),
      recommendations: safeRecommendations(raw?.recommendations),
      confidence_note: safe(raw?.confidence_note, ""),
    };
  }

  /** Wrap API calls with error handling */
  private async withErrorHandling<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new AIError("زمان پاسخ به پایان رسید", "TIMEOUT")),
            55000
          )
        ),
      ]);
    } catch (err: any) {
      if (err instanceof AIError) throw err;

      const msg = err?.message ?? "";
      const lowerMsg = msg.toLowerCase();

      // Rate limit / quota
      if (lowerMsg.includes("429") || lowerMsg.includes("quota exceeded") || lowerMsg.includes("resource_exhausted") || lowerMsg.includes("rate limit")) {
        throw new AIError("محدودیت درخواست — کمی صبر کن", "RATE_LIMIT");
      }

      // API key issues
      if (lowerMsg.includes("api_key_invalid") || lowerMsg.includes("api key not valid") || lowerMsg.includes("unauthorized") || lowerMsg.includes("401") || lowerMsg.includes("403")) {
        throw new AIError("کلید API نامعتبر است", "VALIDATION");
      }

      // Server errors (500, 503)
      if (lowerMsg.includes("500") || lowerMsg.includes("503") || lowerMsg.includes("internal") || lowerMsg.includes("server error")) {
        throw new AIError("خطای سرور هوش مصنوعی", "SERVER_ERROR");
      }

      // Network errors
      if (lowerMsg.includes("fetch") || lowerMsg.includes("network") || lowerMsg.includes("econnrefused") || lowerMsg.includes("etimedout") || lowerMsg.includes("econnreset")) {
        throw new AIError("خطای شبکه — اتصال اینترنت را بررسی کن", "NETWORK");
      }

      // Bad request (400)
      if (lowerMsg.includes("400") || lowerMsg.includes("bad request")) {
        throw new AIError("درخواست نامعتبر — مدل یا تنظیمات را بررسی کن", "VALIDATION");
      }

      throw new AIError("خطای ناشناخته در ارتباط با هوش مصنوعی", "SERVER_ERROR");
    }
  }
}

/** Factory function — reads config from environment */
export function createGeminiProvider(): GeminiProvider {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new AIError(
      "GEMINI_API_KEY تنظیم نشده. در تنظیمات Vercel اضافه کن.",
      "MISSING_KEY"
    );
  }

  return new GeminiProvider({
    apiKey,
    model: process.env.GEMINI_MODEL || "gemini-3.7-flash",
    temperature: 0.7,
    maxOutputTokens: 8192,
  });
}
