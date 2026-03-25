/**
 * AI Provider Helper
 * Routes LLM calls through the admin-configured provider:
 *   - "builtin"  → Manus built-in LLM
 *   - "openai"   → OpenAI API (GPT-4o, GPT-4 Turbo, etc.)
 *   - "gemini"   → Google Gemini API with automatic multi-model fallback chain on quota errors
 *   - "custom"   → Any OpenAI-compatible endpoint (Azure, Together, Groq, Ollama…)
 *
 * Gemini fallback chain (on quota/deprecation):
 *   configured model → gemini-2.5-flash → gemini-2.5-pro → built-in LLM
 *
 * Confirmed working on Tier 1 paid accounts (Mar 2026): gemini-2.5-flash, gemini-2.5-pro
 * Deprecated for new users: gemini-2.0-flash, gemini-1.5-flash, gemini-1.5-pro, gemini-1.0-pro
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

/**
 * Ordered list of fallback models to try when the primary Gemini model hits quota or is unavailable.
 * Models are tried in order; the first one that succeeds is used.
 * If all fail, the system falls back to the built-in Manus LLM.
 *
 * Confirmed working on Tier 1 paid accounts (Mar 2026):
 *   gemini-2.5-flash, gemini-2.5-pro
 * Deprecated/removed (404 for new users):
 *   gemini-2.0-flash, gemini-1.5-flash, gemini-1.5-pro, gemini-1.0-pro
 */
const GEMINI_FALLBACK_CHAIN = ["gemini-2.5-flash", "gemini-2.5-pro"];

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
 * Invoke Gemini with automatic multi-model fallback chain on quota errors.
 * Tries: primaryModel → each model in GEMINI_FALLBACK_CHAIN → built-in LLM.
 * Returns { text, modelUsed, usedFallback, usedBuiltin }.
 */
async function invokeGeminiWithFallback(
  apiKey: string,
  primaryModel: string,
  messages: LLMMessage[],
  jsonMode: boolean,
  llmOptions: LLMCallOptions
): Promise<{ text: string; modelUsed: string; usedFallback: boolean; usedBuiltin: boolean }> {
  // Build the full chain: primary + fallbacks (skip if primary is already in chain)
  const chain = [
    primaryModel,
    ...GEMINI_FALLBACK_CHAIN.filter((m) => m !== primaryModel),
  ];

  let lastError: any = null;

  for (const model of chain) {
    try {
      const text = await invokeGemini(apiKey, model, messages, jsonMode);
      return {
        text,
        modelUsed: model,
        usedFallback: model !== primaryModel,
        usedBuiltin: false,
      };
    } catch (err: any) {
      const raw: string = err?.message ?? String(err) ?? "";
      const isRetryable =
        isGeminiQuotaError(err) ||
        raw.includes("404") ||
        raw.includes("not found") ||
        raw.includes("MODEL_NOT_FOUND") ||
        raw.includes("no longer available");

      if (isRetryable) {
        lastError = err;
        const isLast = model === chain[chain.length - 1];
        console.warn(
          `[AI] Gemini model "${model}" unavailable (quota or deprecated).${isLast ? " All Gemini models exhausted." : " Trying next fallback…"}`
        );
        continue; // try next model in chain
      }
      // Non-retryable error — surface with friendly message immediately
      throw new Error(parseGeminiError(err, model));
    }
  }

  // All Gemini models exhausted — fall back to built-in LLM
  console.warn("[AI] All Gemini models quota-exhausted. Falling back to built-in LLM.");
  try {
    const result = await invokeLLM({
      messages: llmOptions.messages,
      ...(llmOptions.response_format
        ? { response_format: llmOptions.response_format as any }
        : {}),
    });
    const text = (result.choices?.[0]?.message?.content as string) ?? "";
    return { text, modelUsed: "built-in", usedFallback: true, usedBuiltin: true };
  } catch (builtinErr: any) {
    // Both Gemini chain and built-in failed — surface a combined error
    const quotaMsg = parseGeminiError(lastError, primaryModel);
    throw new Error(
      `${quotaMsg} Built-in LLM fallback also failed: ${builtinErr?.message ?? "Unknown error"}. Please try again later or switch to a different AI provider in Admin → AI Settings.`
    );
  }
}

/**
 * Parse a Gemini SDK error into a friendly, actionable message.
 */
function parseGeminiError(err: any, model: string): string {
  const raw: string = err?.message ?? String(err) ?? "Unknown error";

  // 429 – quota exhausted (check this FIRST before other checks)
  if (isGeminiQuotaError(err)) {
    const retryMatch = raw.match(/retry in ([\d.]+s)/i);
    const retryHint = retryMatch ? ` Retry in ${retryMatch[1]}.` : " Please wait before retrying.";
    if (raw.includes("free_tier") || raw.includes("FreeTier")) {
      return `Free-tier quota exhausted for model "${model}".${retryHint} To continue, enable billing at console.cloud.google.com or switch to a model with remaining free quota.`;
    }
    return `API quota exceeded for model "${model}".${retryHint} Check your usage at ai.dev/rate-limit.`;
  }

  // 401 / API key invalid
  if (raw.includes("API_KEY_INVALID") || raw.includes("API key not valid") || raw.includes("401")) {
    return "Invalid Gemini API key. Verify your key at aistudio.google.com/apikey.";
  }

  // 404 / model not found or deprecated
  if (raw.includes("404") || raw.includes("not found") || raw.includes("MODEL_NOT_FOUND") || raw.includes("no longer available")) {
    return `Model "${model}" is not available on your account. Use gemini-2.5-flash or gemini-2.5-pro (confirmed working for Tier 1 paid accounts).`;
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
 * For Gemini, automatically tries a fallback chain on quota errors,
 * ultimately falling back to the built-in Manus LLM if all Gemini models are exhausted.
 */
export async function invokeAI(options: LLMCallOptions): Promise<string> {
  const settings = await getActiveAiSettings();
  const isJsonMode = !!options.response_format;

  if (settings && settings.provider !== "builtin" && settings.apiKey) {
    // ── Gemini (with multi-model fallback chain) ───────────────────────────
    if (settings.provider === "gemini") {
      const primaryModel = settings.model || "gemini-2.5-flash";
      const { text, modelUsed, usedFallback, usedBuiltin } = await invokeGeminiWithFallback(
        settings.apiKey,
        primaryModel,
        options.messages,
        isJsonMode,
        options
      );
      if (usedBuiltin) {
        console.info("[AI] All Gemini models were quota-exhausted; used built-in LLM as final fallback.");
      } else if (usedFallback) {
        console.info(`[AI] Used fallback model "${modelUsed}" because "${primaryModel}" quota was exhausted.`);
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

  // ── Built-in Manus LLM ─────────────────────────────────────────────────────
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
 * For Gemini, if the primary model hits quota, tests fallback models.
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

  // ── Gemini (with fallback chain) ───────────────────────────────────────────
  if (provider === "gemini") {
    if (!apiKey) {
      return { success: false, message: "API key is required for Gemini." };
    }
    const primaryModel = model || "gemini-2.5-flash";
    const testOptions: LLMCallOptions = {
      messages: [{ role: "user", content: 'Reply with exactly: {"status":"ok"}' }],
    };
    try {
      const { modelUsed, usedFallback, usedBuiltin } = await invokeGeminiWithFallback(
        apiKey,
        primaryModel,
        testOptions.messages,
        false,
        testOptions
      );
      if (usedBuiltin) {
        return {
          success: true,
          message: `API key is valid but all Gemini models (${[primaryModel, ...GEMINI_FALLBACK_CHAIN.filter(m => m !== primaryModel)].join(", ")}) are unavailable (quota or deprecated). The system will use the built-in LLM as a final fallback for AI analysis.`,
          modelUsed: "built-in",
        };
      }
      if (usedFallback) {
        return {
          success: true,
          message: `API key is valid. Note: "${primaryModel}" quota is exhausted — automatically using fallback model "${modelUsed}". AI analysis will use "${modelUsed}" until the quota resets.`,
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
