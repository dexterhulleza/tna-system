/**
 * Tests for AI settings tRPC procedures.
 * Verifies that admin can get/save/test AI settings, and non-admins are forbidden.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// ─── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getAiSettings: vi.fn().mockResolvedValue(null),
    upsertAiSettings: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("./aiProvider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./aiProvider")>();
  return {
    ...actual,
    testAiConnection: vi.fn().mockResolvedValue({ success: true, message: "Connection successful.", modelUsed: "gpt-4o" }),
    getActiveAiSettings: vi.fn().mockResolvedValue(null),
    invokeAI: vi.fn().mockResolvedValue("mock analysis"),
  };
});

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: '{"questions":[]}' } }],
  }),
}));

import { getAiSettings, upsertAiSettings } from "./db";
import { testAiConnection } from "./aiProvider";
import { appRouter } from "./routers";
import type { User } from "../drizzle/schema";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makeCtx(role: "admin" | "user") {
  const user: User = {
    id: role === "admin" ? 1 : 2,
    openId: `open-${role}`,
    name: role,
    email: `${role}@test.com`,
    role,
    adminLevel: role === "admin" ? 1 : 0,
    tnaRole: "worker",
    organization: null,
    jobTitle: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return { user };
}

const adminCaller = appRouter.createCaller(makeCtx("admin") as any);
const userCaller = appRouter.createCaller(makeCtx("user") as any);

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("aiConfig.getSettings", () => {
  it("returns default settings when no settings are saved", async () => {
    vi.mocked(getAiSettings).mockResolvedValueOnce(null);
    const result = await adminCaller.aiConfig.getSettings();
    expect(result.provider).toBe("builtin");
    expect(result.hasApiKey).toBe(false);
  });

  it("returns saved settings with hasApiKey=true when key is set", async () => {
    vi.mocked(getAiSettings).mockResolvedValueOnce({
      id: 1,
      provider: "openai",
      apiKey: "sk-test-key",
      model: "gpt-4o",
      baseUrl: null,
      isActive: true,
      updatedBy: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const result = await adminCaller.aiConfig.getSettings();
    expect(result.provider).toBe("openai");
    expect(result.model).toBe("gpt-4o");
    expect(result.hasApiKey).toBe(true);
  });

  it("throws FORBIDDEN for non-admin users", async () => {
    await expect(userCaller.aiConfig.getSettings()).rejects.toThrow(TRPCError);
  });
});

describe("aiConfig.saveSettings", () => {
  beforeEach(() => {
    vi.mocked(upsertAiSettings).mockResolvedValue(undefined);
  });

  it("saves settings successfully for admin", async () => {
    const result = await adminCaller.aiConfig.saveSettings({
      provider: "openai",
      apiKey: "sk-test-key",
      model: "gpt-4o",
    });
    expect(result.success).toBe(true);
    expect(upsertAiSettings).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "openai", model: "gpt-4o" })
    );
  });

  it("throws FORBIDDEN for non-admin users", async () => {
    await expect(
      userCaller.aiConfig.saveSettings({ provider: "openai", model: "gpt-4o" })
    ).rejects.toThrow(TRPCError);
  });
});

describe("aiConfig.testConnection", () => {
  it("returns success result for admin", async () => {
    const result = await adminCaller.aiConfig.testConnection({
      provider: "openai",
      apiKey: "sk-test",
      model: "gpt-4o",
    });
    expect(result.success).toBe(true);
    expect(testAiConnection).toHaveBeenCalledWith("openai", "sk-test", "gpt-4o", undefined);
  });

  it("throws FORBIDDEN for non-admin users", async () => {
    await expect(
      userCaller.aiConfig.testConnection({ provider: "openai", model: "gpt-4o" })
    ).rejects.toThrow(TRPCError);
  });
});
