/**
 * AI Provider Helper
 * Routes LLM calls through the admin-configured provider (OpenAI, custom OpenAI-compatible)
 * or falls back to the built-in Manus LLM if no external provider is configured.
 */

import OpenAI from "openai";
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
 * Invoke LLM using the configured provider.
 * Priority: configured OpenAI key → built-in Manus LLM
 */
export async function invokeAI(options: LLMCallOptions): Promise<string> {
  const settings = await getActiveAiSettings();

  // Use configured external provider if available
  if (settings && settings.provider !== "builtin" && settings.apiKey) {
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

  // Fall back to built-in Manus LLM
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
  if (provider === "builtin") {
    try {
      const result = await invokeLLM({
        messages: [
          { role: "user", content: 'Reply with exactly: {"status":"ok"}' },
        ],
      });
      const content = result.choices?.[0]?.message?.content ?? "";
      return { success: true, message: "Built-in LLM is working.", modelUsed: "built-in" };
    } catch (err: any) {
      return { success: false, message: `Built-in LLM error: ${err?.message ?? "Unknown error"}` };
    }
  }

  // Test OpenAI-compatible provider
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

    const content = response.choices[0]?.message?.content ?? "";
    return {
      success: true,
      message: `Connection successful. Model: ${response.model}`,
      modelUsed: response.model,
    };
  } catch (err: any) {
    const msg = err?.message ?? "Unknown error";
    // Provide friendly error messages
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
