import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

// ─── Test helpers ────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    openId: "test-user-001",
    name: "Test User",
    email: "test@example.com",
    loginMethod: "manus",
    role: "user",
    tnaRole: "industry_worker",
    adminLevel: null,
    organization: "Test Corp",
    jobTitle: "Engineer",
    yearsExperience: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

function makeAdminUser(overrides: Partial<User> = {}): User {
  return makeUser({
    id: 2,
    openId: "admin-user-001",
    name: "Admin User",
    email: "admin@example.com",
    role: "admin",
    tnaRole: "admin",
    adminLevel: "super_admin",
    ...overrides,
  });
}

function makeContext(user: User | null = null): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

// ─── Auth tests ───────────────────────────────────────────────────────────────

describe("auth.me", () => {
  it("returns null for unauthenticated users", async () => {
    const caller = appRouter.createCaller(makeContext(null));
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user object for authenticated users", async () => {
    const user = makeUser();
    const caller = appRouter.createCaller(makeContext(user));
    const result = await caller.auth.me();
    // auth.me returns ctx.user directly — which is the session user from the DB
    // In test context, it returns the mock user passed in
    expect(result).not.toBeNull();
    expect(result).toHaveProperty("id");
  });
});

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const clearedCookies: string[] = [];
    const user = makeUser();
    const ctx = makeContext(user);
    ctx.res.clearCookie = (name: string) => {
      clearedCookies.push(name);
    };

    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies.length).toBe(1);
  });
});

// ─── Sectors tests ────────────────────────────────────────────────────────────

describe("sectors.list", () => {
  it("returns sectors for public access", async () => {
    const caller = appRouter.createCaller(makeContext(null));
    // sectors.list requires { activeOnly?: boolean } input
    const result = await caller.sectors.list({ activeOnly: true });
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns sectors for authenticated users", async () => {
    const user = makeUser();
    const caller = appRouter.createCaller(makeContext(user));
    const result = await caller.sectors.list({ activeOnly: false });
    expect(Array.isArray(result)).toBe(true);
    // Should have 6 WorldSkills sectors seeded
    expect(result.length).toBeGreaterThanOrEqual(6);
  });
});

// ─── Questions tests ──────────────────────────────────────────────────────────

describe("questions.list", () => {
  it("returns questions for a given sector", async () => {
    const user = makeUser();
    const caller = appRouter.createCaller(makeContext(user));
    // Use sector ID 1 (ICT) which is seeded
    const result = await caller.questions.list({ sectorId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("accepts optional skillAreaId filter", async () => {
    const user = makeUser();
    const caller = appRouter.createCaller(makeContext(user));
    const result = await caller.questions.list({ sectorId: 1, skillAreaId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Admin access control tests ───────────────────────────────────────────────

describe("admin.dashboard", () => {
  it("throws UNAUTHORIZED for unauthenticated users", async () => {
    const caller = appRouter.createCaller(makeContext(null));
    await expect(caller.admin.dashboard()).rejects.toThrow();
  });

  it("throws FORBIDDEN for non-admin users", async () => {
    const user = makeUser({ role: "user" });
    const caller = appRouter.createCaller(makeContext(user));
    await expect(caller.admin.dashboard()).rejects.toThrow();
  });

  it("succeeds for admin users", async () => {
    const admin = makeAdminUser();
    const caller = appRouter.createCaller(makeContext(admin));
    const result = await caller.admin.dashboard();
    expect(result).toBeDefined();
    expect(typeof result.totalUsers).toBe("number");
    expect(typeof result.totalSurveys).toBe("number");
    expect(typeof result.totalReports).toBe("number");
  });
});

describe("admin.users.list", () => {
  it("throws for non-admin users", async () => {
    const user = makeUser({ role: "user" });
    const caller = appRouter.createCaller(makeContext(user));
    await expect(caller.admin.users.list()).rejects.toThrow();
  });

  it("returns user list for admin", async () => {
    const admin = makeAdminUser();
    const caller = appRouter.createCaller(makeContext(admin));
    const result = await caller.admin.users.list();
    expect(Array.isArray(result)).toBe(true);
    // Should have at least the admin user
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── Survey flow tests ────────────────────────────────────────────────────────

describe("surveys.start", () => {
  it("throws UNAUTHORIZED for unauthenticated users", async () => {
    const caller = appRouter.createCaller(makeContext(null));
    await expect(
      caller.surveys.start({ sectorId: 1, tnaRole: "industry_worker" })
    ).rejects.toThrow();
  });

  it("accepts a valid sectorId and creates a survey", async () => {
    const user = makeUser();
    const caller = appRouter.createCaller(makeContext(user));
    // sectorId 1 (ICT) is seeded and valid
    const result = await caller.surveys.start({ sectorId: 1, tnaRole: "industry_worker" });
    expect(result).toHaveProperty("surveyId");
    expect(typeof result.surveyId).toBe("number");
  });
});

describe("surveys.myHistory", () => {
  it("throws for unauthenticated users", async () => {
    const caller = appRouter.createCaller(makeContext(null));
    await expect(caller.surveys.myHistory()).rejects.toThrow();
  });

  it("returns survey history for authenticated users", async () => {
    const user = makeUser();
    const caller = appRouter.createCaller(makeContext(user));
    const result = await caller.surveys.myHistory();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Reports tests ────────────────────────────────────────────────────────────

describe("reports.myReports", () => {
  it("throws for unauthenticated users", async () => {
    const caller = appRouter.createCaller(makeContext(null));
    await expect(caller.reports.myReports()).rejects.toThrow();
  });

  it("returns reports for authenticated users", async () => {
    const user = makeUser();
    const caller = appRouter.createCaller(makeContext(user));
    const result = await caller.reports.myReports();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── User profile tests ───────────────────────────────────────────────────────

describe("auth.updateProfile", () => {
  it("throws for unauthenticated users", async () => {
    const caller = appRouter.createCaller(makeContext(null));
    await expect(
      caller.auth.updateProfile({ tnaRole: "trainer" })
    ).rejects.toThrow();
  });
});
