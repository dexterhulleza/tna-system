/**
 * AI Provider Helper
 * Routes LLM calls through the admin-configured provider:
 *   - "builtin"  → Manus built-in LLM
 *   - "openai"   → OpenAI API (GPT-4o, GPT-4 Turbo, etc.)
 *   - "gemini"   → Google Gemini API (gemini-1.5-pro, gemini-2.0-flash, etc.)
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

  // Gemini model names: strip "models/" prefix if present
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

  // Last message is the current user prompt
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
 * Invoke LLM using the configured provider.
 * Priority: configured external key → built-in Manus LLM
 */
export async function invokeAI(options: LLMCallOptions): Promise<string> {
  const settings = await getActiveAiSettings();
  const isJsonMode = !!options.response_format;

  if (settings && settings.provider !== "builtin" && settings.apiKey) {
    // ── Gemini ─────────────────────────────────────────────────────────────
    if (settings.provider === "gemini") {
      return invokeGemini(
        settings.apiKey,
        settings.model || "gemini-1.5-pro",
        options.messages,
        isJsonMode
      );
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

  // ── Gemini ─────────────────────────────────────────────────────────────────
  if (provider === "gemini") {
    if (!apiKey) {
      return { success: false, message: "API key is required for Gemini." };
    }
    try {
      const text = await invokeGemini(
        apiKey,
        model || "gemini-1.5-pro",
        [{ role: "user", content: 'Reply with exactly: {"status":"ok"}' }],
        false
      );
      return {
        success: true,
        message: `Gemini connection successful. Model: ${model}`,
        modelUsed: model,
      };
    } catch (err: any) {
      const msg = err?.message ?? "Unknown error";
      if (msg.includes("API_KEY_INVALID") || msg.includes("API key not valid")) {
        return { success: false, message: "Invalid Gemini API key. Check your key at aistudio.google.com." };
      }
      if (msg.includes("404") || msg.includes("not found")) {
        return { success: false, message: `Model not found: "${model}". Try gemini-1.5-pro or gemini-2.0-flash.` };
      }
      return { success: false, message: `Gemini connection failed: ${msg}` };
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
