/**
 * AI Provider Helper
 * Routes LLM calls through the admin-configured provider:
 *   - "builtin"  → Manus built-in LLM
 *   - "openai"   → OpenAI API (GPT-4o, GPT-4 Turbo, etc.)
 *   - "gemini"   → Google Gemini API with automatic fallback to gemini-1.5-flash on quota errors
 *   - "custom"   → Any OpenAI-compatible endpoint (Azure, Together, Groq, Ollama…)
 */

import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { aiSettings } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMCallOptions {
  messages: LLMMessage[];
  response_format?: {
    type: "json_schema";
    json_schema: {
      name: string;
      strict: boolean;
      schema: object;
    };
  };
}

/** The model used as automatic fallback when the primary Gemini model hits quota. */
const GEMINI_FALLBACK_MODEL = "gemini-1.5-flash";

/**
 * Returns true if the error is a Gemini quota-exhaustion (429 / RESOURCE_EXHAUSTED).
 */
function isGeminiQuotaError(err: any): boolean {
  const raw: string = err?.message ?? String(err) ?? "";
  return (
    raw.includes("429") ||
    raw.includes("Too Many Requests") ||
    raw.includes("RESOURCE_EXHAUSTED") ||
    raw.includes("Quota exceeded")
  );
}

/**
 * Get the active AI settings from the database.
 * Returns null if no custom provider is configured.
 */
export async function getActiveAiSettings() {
  try {
    const db = await getDb();
    if (!db) return null;
    const rows = await db
      .select()
      .from(aiSettings)
      .where(eq(aiSettings.isActive, true))
      .limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Call Gemini API with the given messages.
 * Gemini uses a different SDK so we convert the OpenAI-style message array.
 */
async function invokeGemini(
  apiKey: string,
  model: string,
  messages: LLMMessage[],
  jsonMode: boolean
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);

  // Strip "models/" prefix if present
  const modelName = model.replace(/^models\//, "");

  const geminiModel = genAI.getGenerativeModel({
    model: modelName,
    ...(jsonMode
      ? { generationConfig: { responseMimeType: "application/json" } }
      : {}),
  });

  // Separate system instruction from conversation history
  const systemMsg = messages.find((m) => m.role === "system");
  const conversationMsgs = messages.filter((m) => m.role !== "system");

  // Build Gemini history (all but the last user message)
  const history = conversationMsgs.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const lastMsg = conversationMsgs[conversationMsgs.length - 1];
  const userPrompt = lastMsg?.content ?? "";

  const chat = geminiModel.startChat({
    history,
    ...(systemMsg
      ? { systemInstruction: { role: "user", parts: [{ text: systemMsg.content }] } }
      : {}),
  });

  const result = await chat.sendMessage(userPrompt);
  return result.response.text();
}

/**
 * Invoke Gemini with automatic fallback to GEMINI_FALLBACK_MODEL on quota errors.
 * Returns { text, modelUsed, usedFallback } so callers can log/surface the fallback.
 */
async function invokeGeminiWithFallback(
  apiKey: string,
  primaryModel: string,
  messages: LLMMessage[],
  jsonMode: boolean
): Promise<{ text: string; modelUsed: string; usedFallback: boolean }> {
  try {
    const text = await invokeGemini(apiKey, primaryModel, messages, jsonMode);
    return { text, modelUsed: primaryModel, usedFallback: false };
  } catch (primaryErr: any) {
    if (!isGeminiQuotaError(primaryErr)) {
      // Non-quota error — re-throw with friendly message
      throw new Error(parseGeminiError(primaryErr, primaryModel));
    }

    // Quota error on primary model — try fallback (unless it's already the fallback)
    if (primaryModel === GEMINI_FALLBACK_MODEL) {
      throw new Error(parseGeminiError(primaryErr, primaryModel));
    }

    console.warn(
      `[AI] Gemini quota exhausted for "${primaryModel}". Retrying with fallback "${GEMINI_FALLBACK_MODEL}"…`
    );

    try {
      const text = await invokeGemini(apiKey, GEMINI_FALLBACK_MODEL, messages, jsonMode);
      return { text, modelUsed: GEMINI_FALLBACK_MODEL, usedFallback: true };
    } catch (fallbackErr: any) {
      // Both models failed — surface a combined message
      const fallbackMsg = parseGeminiError(fallbackErr, GEMINI_FALLBACK_MODEL);
      throw new Error(
        `Primary model "${primaryModel}" quota exhausted. Fallback "${GEMINI_FALLBACK_MODEL}" also failed: ${fallbackMsg}`
      );
    }
  }
}

/**
 * Parse a Gemini SDK error into a friendly, actionable message.
 */
function parseGeminiError(err: any, model: string): string {
  const raw: string = err?.message ?? String(err) ?? "Unknown error";

  // 429 – quota exhausted
  if (isGeminiQuotaError(err)) {
    const retryMatch = raw.match(/retry in ([\d.]+s)/i);
    const retryHint = retryMatch ? ` Retry in ${retryMatch[1]}.` : " Please wait before retrying.";
    if (raw.includes("free_tier") || raw.includes("FreeTier")) {
      return `Free-tier quota exhausted for model "${model}".${retryHint} To continue, enable billing at console.cloud.google.com or switch to a model with remaining free quota (e.g. gemini-1.5-flash).`;
    }
    return `API quota exceeded for model "${model}".${retryHint} Check your usage at ai.dev/rate-limit.`;
  }

  // 401 / API key invalid
  if (raw.includes("API_KEY_INVALID") || raw.includes("API key not valid") || raw.includes("401")) {
    return "Invalid Gemini API key. Verify your key at aistudio.google.com/apikey.";
  }

  // 404 / model not found
  if (raw.includes("404") || raw.includes("not found") || raw.includes("MODEL_NOT_FOUND")) {
    return `Model not found: "${model}". Try gemini-1.5-pro, gemini-1.5-flash, or gemini-2.0-flash.`;
  }

  // Network / DNS
  if (raw.includes("ECONNREFUSED") || raw.includes("ENOTFOUND") || raw.includes("fetch")) {
    return "Cannot reach generativelanguage.googleapis.com. Check your network or firewall settings.";
  }

  // Generic fallback — trim to first 200 chars
  const brief = raw.length > 200 ? raw.slice(0, 200) + "…" : raw;
  return `Gemini error: ${brief}`;
}

/**
 * Invoke LLM using the configured provider.
 * For Gemini, automatically falls back to gemini-1.5-flash on quota errors.
 */
export async function invokeAI(options: LLMCallOptions): Promise<string> {
  const settings = await getActiveAiSettings();
  const isJsonMode = !!options.response_format;

  if (settings && settings.provider !== "builtin" && settings.apiKey) {
    // ── Gemini (with auto-fallback) ────────────────────────────────────────
    if (settings.provider === "gemini") {
      const primaryModel = settings.model || "gemini-1.5-pro";
      const { text, modelUsed, usedFallback } = await invokeGeminiWithFallback(
        settings.apiKey,
        primaryModel,
        options.messages,
        isJsonMode
      );
      if (usedFallback) {
        console.info(
          `[AI] Used fallback model "${modelUsed}" because "${primaryModel}" quota was exhausted.`
        );
      }
      return text;
    }

    // ── OpenAI / Custom OpenAI-compatible ──────────────────────────────────
    const client = new OpenAI({
      apiKey: settings.apiKey,
      baseURL: settings.baseUrl || undefined,
    });

    const model = settings.model || "gpt-4o";

    const response = await client.chat.completions.create({
      model,
      messages: options.messages,
      ...(options.response_format
        ? { response_format: options.response_format as any }
        : {}),
    });

    return response.choices[0]?.message?.content ?? "";
  }

  // ── Built-in Manus LLM (fallback) ─────────────────────────────────────────
  const result = await invokeLLM({
    messages: options.messages,
    ...(options.response_format
      ? { response_format: options.response_format as any }
      : {}),
  });

  return (result.choices?.[0]?.message?.content as string) ?? "";
}

/**
 * Test a connection with the given settings (without saving).
 * For Gemini, if the primary model hits quota, automatically tests the fallback model.
 */
export async function testAiConnection(
  provider: string,
  apiKey: string,
  model: string,
  baseUrl?: string
): Promise<{ success: boolean; message: string; modelUsed?: string }> {
  // ── Built-in ───────────────────────────────────────────────────────────────
  if (provider === "builtin") {
    try {
      await invokeLLM({
        messages: [{ role: "user", content: 'Reply with exactly: {"status":"ok"}' }],
      });
      return { success: true, message: "Built-in LLM is working.", modelUsed: "built-in" };
    } catch (err: any) {
      return { success: false, message: `Built-in LLM error: ${err?.message ?? "Unknown error"}` };
    }
  }

  // ── Gemini (with auto-fallback on quota) ───────────────────────────────────
  if (provider === "gemini") {
    if (!apiKey) {
      return { success: false, message: "API key is required for Gemini." };
    }
    const primaryModel = model || "gemini-1.5-pro";
    try {
      const { modelUsed, usedFallback } = await invokeGeminiWithFallback(
        apiKey,
        primaryModel,
        [{ role: "user", content: 'Reply with exactly: {"status":"ok"}' }],
        false
      );
      if (usedFallback) {
        return {
          success: true,
          message: `API key is valid. Note: "${primaryModel}" quota is exhausted — automatically using fallback model "${GEMINI_FALLBACK_MODEL}". AI analysis will use "${GEMINI_FALLBACK_MODEL}" until the quota resets or you switch models.`,
          modelUsed,
        };
      }
      return {
        success: true,
        message: `Gemini connection successful. Model: ${modelUsed}`,
        modelUsed,
      };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  // ── OpenAI / Custom OpenAI-compatible ──────────────────────────────────────
  try {
    const client = new OpenAI({
      apiKey,
      baseURL: baseUrl || undefined,
    });

    const response = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: 'Reply with exactly: {"status":"ok"}' }],
      max_tokens: 20,
    });

    return {
      success: true,
      message: `Connection successful. Model: ${response.model}`,
      modelUsed: response.model,
    };
  } catch (err: any) {
    const msg = err?.message ?? "Unknown error";
    if (msg.includes("401") || msg.includes("Incorrect API key") || msg.includes("invalid_api_key")) {
      return { success: false, message: "Invalid API key. Please check your OpenAI API key." };
    }
    if (msg.includes("404") || msg.includes("model")) {
      return { success: false, message: `Model not found: "${model}". Try gpt-4o, gpt-4-turbo, or gpt-3.5-turbo.` };
    }
    if (msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND")) {
      return { success: false, message: `Cannot connect to ${baseUrl || "api.openai.com"}. Check the Base URL.` };
    }
    return { success: false, message: `Connection failed: ${msg}` };
  }
}
