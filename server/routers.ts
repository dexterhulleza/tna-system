import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { invokeAI, testAiConnection, getActiveAiSettings } from "./aiProvider";
import {
  getAiSettings,
  upsertAiSettings,
  bulkDeactivateQuestions,
  bulkDeleteQuestions,
  createReport,
  createSurvey,
  deleteQuestion,
  deleteSector,
  deleteSkillArea,
  deleteSurveyGroup,
  getAllReports,
  getAllSectors,
  getAllSurveys,
  getAllSurveyGroups,
  getAllUsers,
  getAdminPermissions,
  getDashboardStats,
  getQuestionById,
  getQuestions,
  getRecommendationsByReportId,
  getReportById,
  getReportBySurveyId,
  getReportsByGroup,
  getSectorById,
  getSkillAreaById,
  getSkillAreasBySector,
  getSurveyById,
  getSurveyGroupById,
  getSurveyResponses,
  getUserById,
  getUserReports,
  getUserSurveys,
  saveRecommendations,
  saveSurveyResponses,
  updateSurveyStatus,
  updateUserProfile,
  upsertAdminPermissions,
  upsertQuestion,
  upsertSector,
  upsertSkillArea,
  upsertSurveyGroup,
  getSurveyConfig,
  upsertSurveyConfig,
  saveAiGeneratedQuestions,
  computeGroupSummary,
  getGroupAnalysisSections,
  getGroupAnalysisSection,
  upsertGroupAnalysisSection,
  deleteGroupAnalysisSection,
} from "./db";
import { analyzeGaps, generateRecommendations } from "./tnaEngine";
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  setSessionCookie,
  generateResetToken,
  getResetTokenExpiry,
  getUserByEmail,
  getUserByResetToken,
  setResetToken,
  clearResetToken,
  updatePassword,
  createAuditLog,
  generateOpenId,
} from "./customAuth";
import { upsertUser, getDb } from "./db";
import { users, auditLogs } from "../drizzle/schema";
import { and, desc, eq, like, or, sql } from "drizzle-orm";

// ─── Helper: check admin ───────────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  return next({ ctx });
});

const superAdminProcedure = adminProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.adminLevel !== "super_admin" && ctx.user.adminLevel !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Super Admin access required" });
  }
  return next({ ctx });
});

export const appRouter = router({
  // ─── Custom Auth ──────────────────────────────────────────────────────────
  customAuth: router({
    register: publicProcedure
      .input(
        z.object({
          name: z.string().min(2),
          email: z.string().email(),
          mobile: z.string().optional(),
          password: z.string().min(8),
          // 'staff' | 'hr_officer'
          tnaRole: z.enum(["industry_worker", "hr_officer"]),
          // Staff-specific
          department: z.string().optional(),
          employeeId: z.string().optional(),
          groupId: z.number().optional(),
          // HR-specific
          organization: z.string().optional(),
          jobTitle: z.string().optional(),
          hrJustification: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Check if email already exists
        const existing = await getUserByEmail(input.email);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "Email already registered" });

        const passwordHash = await hashPassword(input.password);
        const openId = generateOpenId();
        const isHR = input.tnaRole === "hr_officer";

        await upsertUser({
          openId,
          name: input.name,
          email: input.email,
          mobile: input.mobile ?? null,
          loginMethod: "password",
          role: "user",
          tnaRole: input.tnaRole,
          organization: input.organization ?? null,
          jobTitle: input.jobTitle ?? null,
          department: input.department ?? null,
          employeeId: input.employeeId ?? null,
          groupId: input.groupId ?? null,
          passwordHash,
          emailVerified: false,
          isActive: !isHR, // HR accounts start inactive until approved
          pendingApproval: isHR,
          hrJustification: input.hrJustification ?? null,
          lastSignedIn: new Date(),
        });

        const newUser = await getUserByEmail(input.email);
        if (!newUser) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Registration failed" });

        await createAuditLog({
          userId: newUser.id,
          userEmail: newUser.email,
          userName: newUser.name ?? undefined,
          action: "REGISTER",
          module: "Auth",
          details: `Self-registered as ${input.tnaRole}${isHR ? " (pending approval)" : ""}`,
          ipAddress: ctx.req.ip,
        });

        if (isHR) {
          return { success: true, pendingApproval: true };
        }

        // Auto-approve staff — create session
        const token = await createSessionToken({
          openId: newUser.openId,
          appId: process.env.VITE_APP_ID ?? "tna",
          name: newUser.name ?? "",
        });
        setSessionCookie(ctx.req, ctx.res, token);
        return { success: true, pendingApproval: false, user: newUser };
      }),

    login: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const user = await getUserByEmail(input.email);
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
        }
        const valid = await verifyPassword(input.password, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
        }
        if (!user.isActive) {
          if (user.pendingApproval) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Your account is pending approval by an Administrator" });
          }
          throw new TRPCError({ code: "FORBIDDEN", message: "Your account has been deactivated" });
        }

        // Update last signed in
        await upsertUser({ openId: user.openId, lastSignedIn: new Date() });

        const token = await createSessionToken({
          openId: user.openId,
          appId: process.env.VITE_APP_ID ?? "tna",
          name: user.name ?? "",
        });
        setSessionCookie(ctx.req, ctx.res, token);

        await createAuditLog({
          userId: user.id,
          userEmail: user.email,
          userName: user.name ?? undefined,
          action: "LOGIN",
          module: "Auth",
          details: "Custom password login",
          ipAddress: ctx.req.ip,
        });

        return { success: true, user };
      }),

    forgotPassword: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const user = await getUserByEmail(input.email);
        // Always return success to prevent email enumeration
        if (!user) return { success: true };

        const token = generateResetToken();
        const expiry = getResetTokenExpiry();
        await setResetToken(user.id, token, expiry);

        // In production, send email. For now, return token in response for demo.
        // TODO: integrate email service
        console.log(`[Auth] Password reset token for ${input.email}: ${token}`);
        return { success: true, resetToken: token }; // remove token from response in production
      }),

    resetPassword: publicProcedure
      .input(
        z.object({
          token: z.string(),
          newPassword: z.string().min(8),
        })
      )
      .mutation(async ({ input }) => {
        const user = await getUserByResetToken(input.token);
        if (!user) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired reset token" });

        const passwordHash = await hashPassword(input.newPassword);
        await updatePassword(user.id, passwordHash);

        await createAuditLog({
          userId: user.id,
          userEmail: user.email,
          userName: user.name ?? undefined,
          action: "PASSWORD_RESET",
          module: "Auth",
        });

        return { success: true };
      }),

    // Admin: create user directly
    adminCreateUser: protectedProcedure
      .input(
        z.object({
          name: z.string().min(2),
          email: z.string().email(),
          mobile: z.string().optional(),
          tnaRole: z.enum(["industry_worker", "trainer", "assessor", "hr_officer", "admin"]),
          role: z.enum(["user", "admin"]).default("user"),
          adminLevel: z.enum(["super_admin", "admin", "sector_manager", "question_manager"]).optional(),
          organization: z.string().optional(),
          jobTitle: z.string().optional(),
          department: z.string().optional(),
          employeeId: z.string().optional(),
          groupId: z.number().optional(),
          password: z.string().min(8).optional(),
          sendActivationEmail: z.boolean().default(false),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });

        const existing = await getUserByEmail(input.email);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "Email already registered" });

        const openId = generateOpenId();
        const passwordHash = input.password ? await hashPassword(input.password) : null;

        await upsertUser({
          openId,
          name: input.name,
          email: input.email,
          mobile: input.mobile ?? null,
          loginMethod: "password",
          role: input.role,
          tnaRole: input.tnaRole,
          adminLevel: input.adminLevel ?? undefined,
          organization: input.organization ?? null,
          jobTitle: input.jobTitle ?? null,
          department: input.department ?? null,
          employeeId: input.employeeId ?? null,
          groupId: input.groupId ?? null,
          passwordHash: passwordHash ?? undefined,
          emailVerified: false,
          isActive: true,
          pendingApproval: false,
          lastSignedIn: new Date(),
        });

        const newUser = await getUserByEmail(input.email);

        await createAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          userName: ctx.user.name ?? undefined,
          action: "CREATE_USER",
          module: "User Management",
          details: `Created user ${input.email} with role ${input.tnaRole}`,
          ipAddress: ctx.req.ip,
        });

        return { success: true, user: newUser };
      }),

    // Admin: approve/activate/deactivate user
    updateUserStatus: protectedProcedure
      .input(
        z.object({
          userId: z.number(),
          isActive: z.boolean().optional(),
          pendingApproval: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const updateData: Record<string, unknown> = {};
        if (input.isActive !== undefined) updateData.isActive = input.isActive;
        if (input.pendingApproval !== undefined) updateData.pendingApproval = input.pendingApproval;

        await db.update(users).set(updateData).where(eq(users.id, input.userId));

        const targetUser = await getUserById(input.userId);
        await createAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          userName: ctx.user.name ?? undefined,
          action: input.isActive ? "ACTIVATE_USER" : "DEACTIVATE_USER",
          module: "User Management",
          details: `Updated user ID ${input.userId}`,
          ipAddress: ctx.req.ip,
        });

        return { success: true };
      }),

    // Admin: reset another user's password
    adminResetPassword: protectedProcedure
      .input(
        z.object({
          userId: z.number(),
          newPassword: z.string().min(8),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const passwordHash = await hashPassword(input.newPassword);
        await updatePassword(input.userId, passwordHash);

        await createAuditLog({
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          userName: ctx.user.name ?? undefined,
          action: "ADMIN_RESET_PASSWORD",
          module: "User Management",
          details: `Reset password for user ID ${input.userId}`,
          ipAddress: ctx.req.ip,
        });

        return { success: true };
      }),

    // Admin: list all users with filters
    listUsers: protectedProcedure
      .input(
        z.object({
          search: z.string().optional(),
          tnaRole: z.string().optional(),
          isActive: z.boolean().optional(),
          pendingApproval: z.boolean().optional(),
        }).optional()
      )
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) return [];

        let query = db.select().from(users).$dynamic();
        const conditions = [];

        if (input?.search) {
          conditions.push(
            or(
              like(users.name, `%${input.search}%`),
              like(users.email, `%${input.search}%`)
            )
          );
        }
        if (input?.tnaRole) {
          conditions.push(eq(users.tnaRole, input.tnaRole as any));
        }
        if (input?.isActive !== undefined) {
          conditions.push(eq(users.isActive, input.isActive));
        }
        if (input?.pendingApproval !== undefined) {
          conditions.push(eq(users.pendingApproval, input.pendingApproval));
        }

        if (conditions.length > 0) {
          const { and: drizzleAnd } = await import("drizzle-orm");
          query = query.where(drizzleAnd(...conditions));
        }

        return query.orderBy(desc(users.createdAt));
      }),

    // Audit logs
    getAuditLogs: protectedProcedure
      .input(
        z.object({
          limit: z.number().default(25),
          offset: z.number().default(0),
          action: z.string().optional(),
          search: z.string().optional(),
        }).optional()
      )
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) return { logs: [], total: 0 };
        const conditions: any[] = [];
        if (input?.action) conditions.push(eq(auditLogs.action, input.action));
        if (input?.search) {
          const q = `%${input.search}%`;
          conditions.push(sql`(${auditLogs.userName} LIKE ${q} OR ${auditLogs.userEmail} LIKE ${q})`);
        }
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
        const [rows, countRows] = await Promise.all([
          db.select().from(auditLogs)
            .where(whereClause)
            .orderBy(desc(auditLogs.createdAt))
            .limit(input?.limit ?? 25)
            .offset(input?.offset ?? 0),
          db.select({ count: sql<number>`count(*)` }).from(auditLogs).where(whereClause),
        ]);
        return { logs: rows, total: Number(countRows[0]?.count ?? 0) };
      }),
        // Complete profile (for users with missing info)
    completeProfile: protectedProcedure
      .input(
        z.object({
          tnaRole: z.enum(["industry_worker", "trainer", "assessor", "hr_officer", "admin"]).optional(),
          department: z.string().optional(),
          organization: z.string().optional(),
          jobTitle: z.string().optional(),
          groupId: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const updateData: Record<string, unknown> = {};
        if (input.tnaRole) updateData.tnaRole = input.tnaRole;
        if (input.department) updateData.department = input.department;
        if (input.organization) updateData.organization = input.organization;
        if (input.jobTitle) updateData.jobTitle = input.jobTitle;
        if (input.groupId !== undefined) updateData.groupId = input.groupId;
        await db.update(users).set(updateData).where(eq(users.id, ctx.user.id));
        return { success: true };
      }),
  }),

  system: systemRouter,

  // ─── Auth ──────────────────────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return null;
      const user = await getUserById(ctx.user.id);
      return user ?? null;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    updateProfile: protectedProcedure
      .input(
        z.object({
          tnaRole: z.enum(["industry_worker", "trainer", "assessor", "hr_officer", "admin"]).optional(),
          organization: z.string().optional(),
          jobTitle: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await updateUserProfile(ctx.user.id, input);
        return { success: true };
      }),
  }),

  // ─── Survey Groups ─────────────────────────────────────────────────────────
  groups: router({
    list: publicProcedure
      .input(z.object({ activeOnly: z.boolean().optional().default(true) }))
      .query(({ input }) => getAllSurveyGroups(input.activeOnly)),

    getById: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => getSurveyGroupById(input.id)),

    upsert: adminProcedure
      .input(
        z.object({
          id: z.number().optional(),
          name: z.string().min(1),
          code: z.string().min(1),
          description: z.string().optional(),
          sectorId: z.number().nullable().optional(),
          isActive: z.boolean().optional(),
          sortOrder: z.number().optional(),
          expectedCount: z.number().min(0).optional(),
        })
      )
      .mutation(({ ctx, input }) => upsertSurveyGroup({ ...input, createdBy: ctx.user.id })),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteSurveyGroup(input.id)),

    // Get all reports for a specific group with AI-generated analysis
    groupAnalysis: adminProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ input }) => {
        const group = await getSurveyGroupById(input.groupId);
        if (!group) throw new TRPCError({ code: "NOT_FOUND" });

        const groupReports = await getReportsByGroup(input.groupId);
        if (groupReports.length === 0) {
          return { group, reports: [], analysis: null };
        }

        // Aggregate statistics for the group
        const scores = groupReports.map((r) => r.report.overallScore ?? 0);
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const gapLevels = groupReports.map((r) => r.report.gapLevel ?? "none");
        const gapDistribution = gapLevels.reduce<Record<string, number>>((acc, g) => {
          acc[g] = (acc[g] ?? 0) + 1;
          return acc;
        }, {});

        // Category scores aggregation
        const categoryTotals: Record<string, { sum: number; count: number }> = {};
        for (const r of groupReports) {
          const cs = r.report.categoryScores as Record<string, number> | null;
          if (cs) {
            for (const [cat, score] of Object.entries(cs)) {
              if (!categoryTotals[cat]) categoryTotals[cat] = { sum: 0, count: 0 };
              categoryTotals[cat].sum += score;
              categoryTotals[cat].count += 1;
            }
          }
        }
        const avgCategoryScores = Object.fromEntries(
          Object.entries(categoryTotals).map(([cat, { sum, count }]) => [cat, Math.round(sum / count)])
        );

        // Collect top gaps across group
        const allGaps: Array<{ category: string; questionText: string; gapPercentage: number }> = [];
        for (const r of groupReports) {
          const gaps = r.report.identifiedGaps as any[] | null;
          if (gaps) {
            allGaps.push(...gaps.map((g: any) => ({
              category: g.category,
              questionText: g.questionText,
              gapPercentage: g.gapPercentage,
            })));
          }
        }
        // Top 5 most common gaps
        const gapFrequency: Record<string, { count: number; category: string; avgGap: number }> = {};
        for (const gap of allGaps) {
          const key = gap.questionText;
          if (!gapFrequency[key]) gapFrequency[key] = { count: 0, category: gap.category, avgGap: 0 };
          gapFrequency[key].count += 1;
          gapFrequency[key].avgGap += gap.gapPercentage;
        }
        const topGaps = Object.entries(gapFrequency)
          .map(([text, data]) => ({
            questionText: text,
            category: data.category,
            frequency: data.count,
            avgGapPercentage: Math.round(data.avgGap / data.count),
          }))
          .sort((a, b) => b.frequency - a.frequency || b.avgGapPercentage - a.avgGapPercentage)
          .slice(0, 5);

        // Fetch survey configuration for this group (objectives, business goals, etc.)
        const surveyConfig = await getSurveyConfig(input.groupId).catch(() => null);
        const statsContext = {
          groupName: group.name,
          groupDescription: group.description,
          totalRespondents: groupReports.length,
          averageScore: Math.round(avgScore),
          gapDistribution,
          avgCategoryScores,
          topGaps,
          sectorName: groupReports[0]?.sector?.name ?? "Multiple Sectors",
          // Survey configuration context
          surveyTitle: surveyConfig?.surveyTitle ?? null,
          surveyPurpose: surveyConfig?.surveyPurpose ?? null,
          surveyObjectives: surveyConfig?.surveyObjectives ?? [],
          organizationName: surveyConfig?.organizationName ?? null,
          industryContext: surveyConfig?.industryContext ?? null,
          businessGoals: surveyConfig?.businessGoals ?? [],
          targetParticipants: surveyConfig?.targetParticipants ?? null,
          participantRoles: surveyConfig?.participantRoles ?? [],
          targetCompetencies: surveyConfig?.targetCompetencies ?? [],
          knownSkillGaps: surveyConfig?.knownSkillGaps ?? null,
          priorityAreas: surveyConfig?.priorityAreas ?? [],
          regulatoryRequirements: surveyConfig?.regulatoryRequirements ?? null,
        };
        // Generate AI analysis — TESDA/NTESDP framework: Industry Demand → Competency Gaps → Training Priorities → Implementation Plan
        const prompt = `You are a senior Training Needs Analysis specialist working within the TESDA (Technical Education and Skills Development Authority) framework and aligned with the National Technical Education and Skills Development Plan (NTESDP). Your task is to produce a comprehensive, structured TNA report based on survey results and group configuration data.

Write for a mixed audience: HR managers, training officers, industry partners, and government officials. Use clear, professional language — avoid overly academic jargon but maintain technical accuracy appropriate for workforce development planning.

---
SURVEY DATA AND GROUP CONFIGURATION:
${JSON.stringify(statsContext, null, 2)}
---

Produce the TNA Analysis Report using EXACTLY the following 9 sections in order. Use the section headings exactly as written below.

## Section 1: Industry Profile and Context

Analyze the industry direction and future skills demand for this group/sector. Cover:
- **Industry Overview:** Describe the current state and growth trajectory of the industry/sector represented by this group. Reference global and local trends.
- **Future Skills Demand:** What competencies will be in high demand in the next 3-5 years? Consider automation, digitalization, regulatory changes, and market shifts.
- **Industry Challenges:** What are the key challenges this sector faces that training must address?
- **Alignment with NTESDP:** How does this group's training needs align with national priority sectors and the NTESDP goals?
- **Regulatory and Standards Context:** Mention relevant TESDA qualifications, Philippine Qualifications Framework (PQF) levels, or industry standards that apply.

## Section 2: Occupational Mapping (Job Role Analysis)

Identify priority job roles and their competency requirements based on the survey data. Cover:
- **Priority Job Roles Identified:** List the key occupational roles represented in this survey group (based on participant roles and sector data).
- **Core Competency Requirements per Role:** For each priority role, list the essential competencies required (technical/functional, core, and cross-cutting).
- **Current Competency Level:** Based on survey scores, describe the current average competency level of participants.
- **Required Competency Level:** What level is needed to meet industry standards or organizational goals?
- **Critical Role Gaps:** Which roles show the most significant gap between current and required competency?

## Section 3: Competency Gap Analysis

Determine the gaps between current competencies and required competencies. Cover:
- **Overall Gap Summary:** State the overall average score (${statsContext.averageScore}/100) and what it means in plain terms.
- **Gap by Category:** For each TNA category (Organizational, Job/Task, Individual, Training Feasibility, Evaluation), describe the gap level and what it indicates.
- **Top 5 Critical Gaps:** List the most frequently identified gaps from the survey, with gap percentage and business impact.
- **Root Cause Analysis:** For each major gap, suggest the likely root cause (lack of training, outdated equipment, poor processes, unclear standards, etc.).
- **Gap Priority Classification:** Classify each gap as Critical (immediate action needed), Significant (action within 6 months), or Moderate (plan within 12 months).

## Section 4: Skills Categorization (Aligned with TESDA Framework)

Categorize identified skills gaps according to the TESDA competency framework:
- **Basic Competencies:** Communication, teamwork, problem-solving, workplace safety, environmental awareness. Which are deficient?
- **Common Competencies:** Sector-wide technical skills applicable across multiple job roles. What gaps exist?
- **Core Competencies:** Specific technical skills required for the particular qualification/job role. What are the critical gaps?
- **Cross-Cutting Competencies:** Digital literacy, entrepreneurship, innovation, sustainability. What is the current level?
- **TESDA Qualification Alignment:** Map identified gaps to specific TESDA National Certificates (NC I, NC II, NC III, NC IV) or qualifications that would address them.

## Section 5: Technology and Equipment Requirements Analysis

Identify what technology, tools, and equipment are needed for effective training delivery:
- **Current Technology/Equipment Status:** Based on survey responses, what is the current state of technology and equipment access?
- **Required Technology for Training:** List specific tools, software, machines, or equipment needed to deliver the recommended training.
- **Digital Infrastructure Needs:** What digital platforms, learning management systems, or connectivity requirements are needed?
- **Equipment Investment Estimate:** Provide a rough categorization (Low/Medium/High investment) for technology and equipment needs.
- **Technology Gaps vs. Training Gaps:** Distinguish between gaps caused by lack of skills vs. lack of proper tools/equipment.

## Section 6: Training Priority Matrix

Rank training needs based on urgency, number of workers affected, economic impact, and NTESDP alignment. Present as a prioritized list:

For each training priority, provide:
**Priority [Number]: [Training Topic Name]**
- Urgency Level: 🔴 Critical / 🟡 High / 🟢 Medium
- Workers Affected: [Estimated number or percentage]
- Economic Impact: High / Medium / Low (explain briefly)
- NTESDP Alignment: [Which NTESDP priority sector or goal this supports]
- Justification: One paragraph explaining why this is a priority

End this section with a summary matrix table (in markdown table format) showing all priorities ranked.

## Section 7: Training Beneficiaries

Identify who should receive training and at what level:
- **New Entrants:** What foundational training do new workers in this sector/role need?
- **Existing Workers (Upskilling):** What skills do current employees need to upgrade to meet current standards?
- **Existing Workers (Reskilling):** Are there workers who need to transition to new roles or adapt to new technologies?
- **Supervisors and Team Leaders:** What management, coaching, and technical leadership training is needed?
- **Trainers and Assessors:** What trainer upskilling or assessor certification is needed to deliver quality training?
- **Industry Partners:** What orientation or partnership training would help industry stakeholders support training delivery?
- **Beneficiary Count Estimate:** Based on survey data, estimate the total number of potential training beneficiaries per category.

## Section 8: Training Delivery Mode Analysis

Recommend the most effective and feasible training delivery approaches:
- **Face-to-Face / Classroom Training:** Which topics require in-person instruction? Why?
- **Online / E-Learning:** Which topics can be effectively delivered online? What platforms are recommended?
- **Blended Learning:** Which topics benefit from a mix of online and face-to-face? Describe the blend.
- **On-the-Job Training (OJT) / Apprenticeship:** Which competencies are best developed through supervised workplace practice?
- **Competency-Based Training (CBT):** How should TESDA's CBT approach be applied to the priority training areas?
- **Industry Immersion / Plant Visit:** Are there topics where exposure to actual industry environments is essential?
- **Delivery Feasibility:** Consider geographic reach, participant availability, budget constraints, and trainer availability.

## Section 9: Training Plan Output

Present the final recommended training plan as a structured table. Use this exact markdown table format:

| Priority | Training Program Title | Target Group | Duration | Delivery Mode | Partner Industry/Organization | Expected Outcome |
|----------|----------------------|--------------|----------|---------------|-------------------------------|------------------|

After the table, add:
- **Implementation Timeline:** A simple 12-month rollout schedule (Q1, Q2, Q3, Q4)
- **Estimated Total Investment:** Low / Medium / High with brief justification
- **Quick Wins (0-3 months):** Which training can start immediately with minimal resources?
- **Success Metrics:** How will the organization know if training was effective? List 3-5 measurable indicators.
- **Next Steps:** List 5 concrete actions the organization should take in the next 30 days to begin implementation.

---
Write in a professional but accessible tone. Use actual data numbers from the survey results wherever possible. If data is limited, acknowledge this and provide recommendations based on the available information and industry best practices.`
        let aiAnalysis: string | null = null;
        try {
          aiAnalysis = await invokeAI({
            messages: [
              { role: "system", content: "You are a senior TESDA-aligned Training Needs Analysis specialist. Produce structured, comprehensive TNA reports following the TESDA/NTESDP framework. Write professionally but accessibly for HR managers, training officers, and government officials." },
              { role: "user", content: prompt },
            ],
          });
        } catch (err) {
          console.warn("[GroupAnalysis] LLM call failed:", err);
        }

        return {
          group,
          reports: groupReports,
          stats: statsContext,
          analysis: aiAnalysis,
        };
      }),

    // ── Free computed summary (no AI credits) ────────────────────────────────
    groupSummary: adminProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ input }) => {
        const group = await getSurveyGroupById(input.groupId);
        if (!group) throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });
        const summary = await computeGroupSummary(input.groupId);
        const sections = await getGroupAnalysisSections(input.groupId);
        const surveyConfig = await getSurveyConfig(input.groupId).catch(() => null);
        return { group, summary, sections, surveyConfig };
      }),

    // ── Get cached sections ───────────────────────────────────────────────────
    getAnalysisSections: adminProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ input }) => {
        return getGroupAnalysisSections(input.groupId);
      }),

    // ── Generate a single TESDA section on demand ─────────────────────────────
    generateSection: adminProcedure
      .input(
        z.object({
          groupId: z.number(),
          sectionKey: z.enum([
            "industry_profile",
            "occupational_mapping",
            "competency_gap",
            "skills_categorization",
            "technology_equipment",
            "priority_matrix",
            "training_beneficiaries",
            "delivery_mode",
            "training_plan",
          ]),
          forceRegenerate: z.boolean().optional().default(false),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Return cached version unless forceRegenerate
        if (!input.forceRegenerate) {
          const cached = await getGroupAnalysisSection(input.groupId, input.sectionKey);
          if (cached) return { section: cached, fromCache: true };
        }

        const group = await getSurveyGroupById(input.groupId);
        if (!group) throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });

        const summary = await computeGroupSummary(input.groupId);
        if (!summary || summary.totalRespondents === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No survey responses found for this group." });
        }

        const surveyConfig = await getSurveyConfig(input.groupId).catch(() => null);
        const existingSections = await getGroupAnalysisSections(input.groupId);

        // Build context string from summary
        const contextData = JSON.stringify({
          groupName: group.name,
          groupDescription: group.description,
          organizationName: surveyConfig?.organizationName ?? null,
          industryContext: surveyConfig?.industryContext ?? null,
          surveyPurpose: surveyConfig?.surveyPurpose ?? null,
          surveyObjectives: surveyConfig?.surveyObjectives ?? [],
          businessGoals: surveyConfig?.businessGoals ?? [],
          targetParticipants: surveyConfig?.targetParticipants ?? null,
          participantRoles: surveyConfig?.participantRoles ?? [],
          targetCompetencies: surveyConfig?.targetCompetencies ?? [],
          knownSkillGaps: surveyConfig?.knownSkillGaps ?? null,
          priorityAreas: surveyConfig?.priorityAreas ?? [],
          regulatoryRequirements: surveyConfig?.regulatoryRequirements ?? null,
          totalRespondents: summary.totalRespondents,
          avgScore: summary.avgScore,
          minScore: summary.minScore,
          maxScore: summary.maxScore,
          scoreDistribution: summary.scoreDistribution,
          gapDistribution: summary.gapDistribution,
          avgCategoryScores: summary.avgCategoryScores,
          weakCategories: summary.weakCategories,
          topGaps: summary.topGaps,
          sectorDistribution: summary.sectorDistribution,
          primarySector: summary.primarySector,
        }, null, 2);

        // Include already-generated sections as context for coherence
        const priorSectionsContext = existingSections.length > 0
          ? `\n\nALREADY GENERATED SECTIONS (use these for coherence and cross-referencing):\n` +
            existingSections
              .filter((s) => s.sectionKey !== input.sectionKey)
              .map((s) => `### ${s.sectionTitle}\n${s.content.slice(0, 800)}...`)
              .join("\n\n")
          : "";

        const SECTION_PROMPTS: Record<string, { title: string; prompt: string }> = {
          industry_profile: {
            title: "Section 1: Industry Profile and Context",
            prompt: `Write Section 1: Industry Profile and Context for a TESDA/NTESDP Training Needs Analysis report.\n\nCover:\n- Industry direction and future skills demand based on survey data\n- Key industry trends affecting workforce requirements\n- Regulatory and policy context (TESDA, NTESDP, relevant legislation)\n- Economic significance of the sector\n- Current workforce profile based on survey respondents\n\nWrite 3-5 substantive paragraphs. Reference actual numbers from the survey data.`,
          },
          occupational_mapping: {
            title: "Section 2: Occupational Mapping (Job Role Analysis)",
            prompt: `Write Section 2: Occupational Mapping for a TESDA/NTESDP TNA report.\n\nCover:\n- Priority job roles identified from the survey group\n- Competency requirements per role aligned with TESDA qualification standards\n- Critical occupations with the highest training needs\n- Role-specific skill requirements vs. current competency levels\n- TESDA qualification levels applicable to identified roles\n\nInclude a markdown table mapping job roles to required competencies and current gaps.`,
          },
          competency_gap: {
            title: "Section 3: Competency Gap Analysis",
            prompt: `Write Section 3: Competency Gap Analysis for a TESDA/NTESDP TNA report.\n\nCover:\n- Gaps between current competencies and required competencies\n- Analysis of the top identified gaps from survey data (reference specific gap percentages)\n- Category-by-category gap breakdown\n- Critical vs. moderate vs. minor gaps\n- Root cause analysis for major gaps\n\nInclude a markdown table showing categories, average scores, gap percentages, and severity levels. Reference the actual survey numbers.`,
          },
          skills_categorization: {
            title: "Section 4: Skills Categorization (TESDA Framework)",
            prompt: `Write Section 4: Skills Categorization aligned with the TESDA framework for a TNA report.\n\nCategorize identified skills needs into:\n- **Basic Competencies:** Communication, teamwork, problem-solving, digital literacy\n- **Common Competencies:** Shared across the sector/industry\n- **Core Competencies:** Specific to the occupation/qualification\n- **Cross-Cutting Competencies:** 21st century skills, sustainability, entrepreneurship\n\nFor each category, list specific skills identified as gaps from the survey data. Align with TESDA Training Regulations where applicable.`,
          },
          technology_equipment: {
            title: "Section 5: Technology and Equipment Requirements",
            prompt: `Write Section 5: Technology and Equipment Requirements Analysis for a TESDA/NTESDP TNA report.\n\nCover:\n- Equipment and technology needed for training delivery\n- Digital infrastructure requirements\n- Equipment investment estimate (Low/Medium/High) with justification\n- Technology gaps vs. skills gaps distinction\n- Specific tools, machines, or platforms required per training area\n\nReference the survey data to justify equipment needs. Include a markdown table of required equipment/technology by training area.`,
          },
          priority_matrix: {
            title: "Section 6: Training Priority Matrix",
            prompt: `Write Section 6: Training Priority Matrix for a TESDA/NTESDP TNA report.\n\nRank training needs based on: urgency, number of workers affected, economic impact, and NTESDP alignment.\n\nFor each priority, provide:\n- Priority number and training topic\n- Urgency level (🔴 Critical / 🟡 High / 🟢 Medium)\n- Workers affected (count and percentage from survey data)\n- Economic impact (High/Medium/Low with brief explanation)\n- NTESDP alignment\n- One-paragraph justification\n\nEnd with a summary markdown table of all priorities ranked. Reference actual survey numbers throughout.`,
          },
          training_beneficiaries: {
            title: "Section 7: Training Beneficiaries",
            prompt: `Write Section 7: Training Beneficiaries for a TESDA/NTESDP TNA report.\n\nIdentify who should receive training:\n- **New Entrants:** Foundational training needs\n- **Existing Workers (Upskilling):** Skills upgrade needs\n- **Existing Workers (Reskilling):** Role transition needs\n- **Supervisors and Team Leaders:** Management and technical leadership training\n- **Trainers and Assessors:** Trainer upskilling and assessor certification\n- **Industry Partners:** Orientation and partnership training\n\nFor each group, estimate beneficiary count based on survey data. Include a markdown table summarizing beneficiary groups, estimated numbers, and priority training areas.`,
          },
          delivery_mode: {
            title: "Section 8: Training Delivery Mode Analysis",
            prompt: `Write Section 8: Training Delivery Mode Analysis for a TESDA/NTESDP TNA report.\n\nRecommend delivery approaches for each priority training area:\n- Face-to-Face / Classroom Training\n- Online / E-Learning\n- Blended Learning\n- On-the-Job Training (OJT) / Apprenticeship\n- Competency-Based Training (CBT) per TESDA standards\n- Industry Immersion / Plant Visit\n\nConsider: geographic reach, participant availability, budget constraints, trainer availability.\nInclude a markdown table mapping training topics to recommended delivery modes with justification.`,
          },
          training_plan: {
            title: "Section 9: Training Plan Output",
            prompt: `Write Section 9: Training Plan Output for a TESDA/NTESDP TNA report.\n\nPresent the final recommended training plan as a structured markdown table:\n\n| Priority | Training Program Title | Target Group | Duration | Delivery Mode | Partner Industry/Organization | Expected Outcome |\n|----------|----------------------|--------------|----------|---------------|-------------------------------|------------------|\n\nAfter the table, add:\n- **Implementation Timeline:** 12-month rollout schedule (Q1-Q4)\n- **Estimated Total Investment:** Low/Medium/High with justification\n- **Quick Wins (0-3 months):** Training that can start immediately\n- **Success Metrics:** 3-5 measurable indicators\n- **Next Steps:** 5 concrete actions for the next 30 days\n\nEnsure this plan is coherent with and directly addresses the gaps and priorities identified in the previous sections.`,
          },
        };

        const sectionDef = SECTION_PROMPTS[input.sectionKey];
        if (!sectionDef) throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown section key" });

        const systemPrompt = `You are a senior TESDA-aligned Training Needs Analysis specialist producing a section of a comprehensive TNA report. Write professionally but accessibly for HR managers, training officers, and government officials. Use actual data numbers from the survey results wherever possible. Be specific and actionable.`;

        const userPrompt = `SURVEY DATA AND GROUP CONFIGURATION:\n${contextData}${priorSectionsContext}\n\n---\n\n${sectionDef.prompt}\n\nWrite only this section. Do not include other sections. Use markdown formatting with headers, tables, and bullet points as appropriate.`;

        let content: string;
        let modelUsed: string | undefined;
        try {
          const result = await invokeAI({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          });
          content = typeof result === "string" ? result : (result as any)?.text ?? String(result);
          // Try to get model info from active settings
          const aiSettings = await getActiveAiSettings();
          modelUsed = aiSettings?.model ?? "built-in";
        } catch (err: any) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `AI generation failed: ${err?.message ?? "Unknown error"}. Check Admin → AI Settings.`,
          });
        }

        await upsertGroupAnalysisSection({
          groupId: input.groupId,
          sectionKey: input.sectionKey,
          sectionTitle: sectionDef.title,
          content,
          modelUsed,
          generatedBy: ctx.user.id,
        });

        const saved = await getGroupAnalysisSection(input.groupId, input.sectionKey);
        return { section: saved!, fromCache: false };
      }),

    // ── Delete a cached section (force next generate to re-run AI) ────────────
    deleteSection: adminProcedure
      .input(z.object({ groupId: z.number(), sectionKey: z.string() }))
      .mutation(async ({ input }) => {
        await deleteGroupAnalysisSection(input.groupId, input.sectionKey);
        return { success: true };
      }),
  }),
  // ─── Sectorss ───────────────────────────────────────────────────────────────
  sectors: router({
    list: publicProcedure
      .input(z.object({ activeOnly: z.boolean().optional().default(true) }))
      .query(({ input }) => getAllSectors(input.activeOnly)),

    getById: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => getSectorById(input.id)),

    upsert: adminProcedure
      .input(
        z.object({
          id: z.number().optional(),
          name: z.string().min(1),
          code: z.string().min(1),
          description: z.string().optional(),
          iconName: z.string().optional(),
          colorClass: z.string().optional(),
          isActive: z.boolean().optional(),
          sortOrder: z.number().optional(),
        })
      )
      .mutation(({ input }) => upsertSector(input)),

    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => deleteSector(input.id)),
  }),

  // ─── Skill Areas ───────────────────────────────────────────────────────────
  skillAreas: router({
    listBySector: publicProcedure
      .input(z.object({ sectorId: z.number(), activeOnly: z.boolean().optional().default(true) }))
      .query(({ input }) => getSkillAreasBySector(input.sectorId, input.activeOnly)),

    getById: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => getSkillAreaById(input.id)),

    upsert: adminProcedure
      .input(
        z.object({
          id: z.number().optional(),
          sectorId: z.number(),
          name: z.string().min(1),
          code: z.string().min(1),
          description: z.string().optional(),
          isActive: z.boolean().optional(),
          sortOrder: z.number().optional(),
        })
      )
      .mutation(({ input }) => upsertSkillArea(input)),

    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => deleteSkillArea(input.id)),
  }),

  // ─── Questions ─────────────────────────────────────────────────────────────
  questions: router({
    list: publicProcedure
      .input(
        z.object({
          sectorId: z.number().nullable().optional(),
          skillAreaId: z.number().nullable().optional(),
          groupId: z.number().nullable().optional(),
          category: z.string().optional(),
          activeOnly: z.boolean().optional().default(true),
          adminAll: z.boolean().optional().default(false),
        })
      )
      .query(({ input }) => getQuestions(input)),

    getById: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => getQuestionById(input.id)),

    upsert: adminProcedure
      .input(
        z.object({
          id: z.number().optional(),
          sectorId: z.number().nullable().optional(),
          skillAreaId: z.number().nullable().optional(),
          groupId: z.number().nullable().optional(),
          category: z.enum(["organizational", "job_task", "individual", "training_feasibility", "evaluation_success", "custom"]),
          customCategory: z.string().optional(),
          targetRoles: z.array(z.string()).optional(),
          questionText: z.string().min(1),
          questionType: z.enum(["text", "multiple_choice", "checkbox", "rating", "yes_no", "scale"]),
          options: z.array(z.string()).nullable().optional(),
          minValue: z.number().optional(),
          maxValue: z.number().optional(),
          isRequired: z.boolean().optional(),
          isActive: z.boolean().optional(),
          sortOrder: z.number().optional(),
          helpText: z.string().optional(),
          weight: z.number().optional(),
        })
      )
      .mutation(({ ctx, input }) => upsertQuestion({ ...input, createdBy: ctx.user.id })),

    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => deleteQuestion(input.id)),

    bulkDeactivate: adminProcedure
      .input(z.object({ ids: z.array(z.number()).min(1) }))
      .mutation(({ input }) => bulkDeactivateQuestions(input.ids)),

    bulkDelete: adminProcedure
      .input(z.object({ ids: z.array(z.number()).min(1) }))
      .mutation(({ input }) => bulkDeleteQuestions(input.ids)),
  }),

  // ─── Surveys ───────────────────────────────────────────────────────────────
  surveys: router({
    start: protectedProcedure
      .input(
        z.object({
          sectorId: z.number(),
          skillAreaId: z.number().nullable().optional(),
          groupId: z.number().nullable().optional(),
          conductedWith: z.enum(["self", "hr_officer", "administrator"]).optional(),
          conductedWithName: z.string().optional(),
          // Respondent basic info
          respondentName: z.string().optional(),
          respondentAge: z.number().optional(),
          respondentGender: z.enum(["male", "female", "non_binary", "prefer_not_to_say"]).optional(),
          respondentPosition: z.string().optional(),
          respondentCompany: z.string().optional(),
          respondentYearsExperience: z.number().optional(),
          respondentHighestEducation: z.enum([
            "elementary", "high_school", "vocational", "associate",
            "bachelor", "master", "doctorate", "other",
          ]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const surveyId = await createSurvey({ userId: ctx.user.id, ...input });
        return { surveyId };
      }),

    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
      const survey = await getSurveyById(input.id);
      if (!survey) throw new TRPCError({ code: "NOT_FOUND" });
      if (survey.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return survey;
    }),

    myHistory: protectedProcedure.query(({ ctx }) => getUserSurveys(ctx.user.id)),

    allSurveys: adminProcedure.query(() => getAllSurveys()),

    saveResponses: protectedProcedure
      .input(
        z.object({
          surveyId: z.number(),
          responses: z.array(
            z.object({
              questionId: z.number(),
              responseText: z.string().optional(),
              responseValue: z.number().optional(),
              responseOptions: z.array(z.string()).optional(),
            })
          ),
          currentCategory: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const survey = await getSurveyById(input.surveyId);
        if (!survey) throw new TRPCError({ code: "NOT_FOUND" });
        if (survey.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        await saveSurveyResponses(input.surveyId, input.responses);
        if (input.currentCategory) {
          await updateSurveyStatus(input.surveyId, "in_progress", input.currentCategory);
        }
        return { success: true };
      }),

    complete: protectedProcedure
      .input(z.object({ surveyId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const survey = await getSurveyById(input.surveyId);
        if (!survey) throw new TRPCError({ code: "NOT_FOUND" });
        if (survey.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

        await updateSurveyStatus(input.surveyId, "completed");

        const responsesWithQuestions = await getSurveyResponses(input.surveyId);
        const analysisResult = analyzeGaps(responsesWithQuestions);

        const reportId = await createReport({
          surveyId: input.surveyId,
          userId: ctx.user.id,
          sectorId: survey.sectorId,
          skillAreaId: survey.skillAreaId,
          ...analysisResult,
        });

        if (!reportId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const recs = generateRecommendations(analysisResult, survey);
        await saveRecommendations(reportId, recs);

        return { reportId };
      }),

    getResponses: protectedProcedure
      .input(z.object({ surveyId: z.number() }))
      .query(async ({ ctx, input }) => {
        const survey = await getSurveyById(input.surveyId);
        if (!survey) throw new TRPCError({ code: "NOT_FOUND" });
        if (survey.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return getSurveyResponses(input.surveyId);
      }),
  }),

  // ─── Reports ───────────────────────────────────────────────────────────────
  reports: router({
    getBySurvey: protectedProcedure
      .input(z.object({ surveyId: z.number() }))
      .query(async ({ ctx, input }) => {
        const result = await getReportBySurveyId(input.surveyId);
        if (!result) return null;
        if (result.report.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const recs = await getRecommendationsByReportId(result.report.id);
        return { ...result, recommendations: recs };
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const result = await getReportById(input.id);
        if (!result) throw new TRPCError({ code: "NOT_FOUND" });
        if (result.report.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const recs = await getRecommendationsByReportId(result.report.id);
        return { ...result, recommendations: recs };
      }),

    myReports: protectedProcedure.query(({ ctx }) => getUserReports(ctx.user.id)),

    allReports: adminProcedure.query(() => getAllReports()),
  }),

  // ─── Admin ─────────────────────────────────────────────────────────────────
  admin: router({
    dashboard: adminProcedure.query(() => getDashboardStats()),
    readinessChecklist: adminProcedure.query(async () => {
      const db_module = await import("./db");
      const { getDb } = await import("./db");
      const db = await getDb();
      const { sql: drizzleSql, eq } = await import("drizzle-orm");
      const schema = await import("../drizzle/schema");
      // Phase 1: AI provider configured?
      const aiSettings = await getActiveAiSettings();
      const aiConfigured = !!(aiSettings && aiSettings.provider !== "builtin" && aiSettings.apiKey);
      // Phase 2: At least one active group?
      const groups = await db_module.getAllSurveyGroups();
      const activeGroups = groups.filter((g: { isActive: boolean }) => g.isActive);
      const hasGroups = activeGroups.length > 0;
      // Phase 3: At least one group has a survey config?
      let configuredGroups = 0;
      if (db) {
        const [configCount] = await db.select({ count: drizzleSql<number>`count(distinct groupId)` }).from(schema.surveyConfigurations);
        configuredGroups = Number(configCount?.count ?? 0);
      }
      const hasConfigs = configuredGroups > 0;
      // Phase 4: At least 10 active questions?
      let activeQuestionCount = 0;
      if (db) {
        const [qCount] = await db.select({ count: drizzleSql<number>`count(*)` }).from(schema.questions).where(eq(schema.questions.isActive, true));
        activeQuestionCount = Number(qCount?.count ?? 0);
      }
      const hasQuestions = activeQuestionCount >= 10;
      // Phase 5: At least one registered user (non-admin)?
      const allUsers = await db_module.getAllUsers();
      const staffUsers = allUsers.filter((u: { role: string }) => u.role !== "admin");
      const hasStaff = staffUsers.length > 0;
      // Phase 6: At least one completed survey?
      let completedSurveys = 0;
      if (db) {
        const [sCount] = await db.select({ count: drizzleSql<number>`count(*)` }).from(schema.surveys).where(eq(schema.surveys.status, "completed"));
        completedSurveys = Number(sCount?.count ?? 0);
      }
      const hasSurveys = completedSurveys > 0;
      // Phase 7: At least one group analysis section generated?
      let analysisSections = 0;
      if (db) {
        const [aCount] = await db.select({ count: drizzleSql<number>`count(*)` }).from(schema.groupAnalysisSections);
        analysisSections = Number(aCount?.count ?? 0);
      }
      const hasAnalysis = analysisSections > 0;
      return {
        phases: [
          { id: 1, label: "AI Provider Configured", done: aiConfigured, link: "/admin/ai-settings", hint: aiConfigured ? `Provider: ${aiSettings?.provider ?? "builtin"}` : "Configure Gemini or OpenAI API key" },
          { id: 2, label: "Groups Created", done: hasGroups, link: "/admin/groups", hint: hasGroups ? `${activeGroups.length} active group(s)` : "Create at least one respondent group" },
          { id: 3, label: "Survey Objectives Set", done: hasConfigs, link: "/admin/survey-config", hint: hasConfigs ? `${configuredGroups} group(s) configured` : "Set TNA objectives and business context per group" },
          { id: 4, label: "Questions Ready", done: hasQuestions, link: "/admin/questions", hint: hasQuestions ? `${activeQuestionCount} active questions` : "Add at least 10 active questions (generate via AI or upload Excel)" },
          { id: 5, label: "Staff Registered", done: hasStaff, link: "/admin/users", hint: hasStaff ? `${staffUsers.length} staff registered` : "Share the survey URL so staff can register and take the TNA" },
          { id: 6, label: "Surveys Completed", done: hasSurveys, link: "/admin/reports", hint: hasSurveys ? `${completedSurveys} completed survey(s)` : "Waiting for staff to complete their surveys" },
          { id: 7, label: "Training Plan Generated", done: hasAnalysis, link: "/admin/reports", hint: hasAnalysis ? `${analysisSections} section(s) generated` : "Generate AI Training Plan sections from Group Analysis" },
        ],
        overallProgress: [aiConfigured, hasGroups, hasConfigs, hasQuestions, hasStaff, hasSurveys, hasAnalysis].filter(Boolean).length,
      };
    }),

    users: router({
      list: adminProcedure.query(() => getAllUsers()),

      updateRole: superAdminProcedure
        .input(
          z.object({
            userId: z.number(),
            role: z.enum(["user", "admin"]),
            tnaRole: z.enum(["industry_worker", "trainer", "assessor", "hr_officer", "admin"]),
            adminLevel: z.enum(["super_admin", "admin", "sector_manager", "question_manager"]).optional(),
            organization: z.string().optional(),
            jobTitle: z.string().optional(),
          })
        )
        .mutation(async ({ input }) => {
          await updateUserProfile(input.userId, input);
          return { success: true };
        }),

      updatePermissions: superAdminProcedure
        .input(
          z.object({
            userId: z.number(),
            canManageUsers: z.boolean().optional(),
            canManageSectors: z.boolean().optional(),
            canManageQuestions: z.boolean().optional(),
            canViewAllReports: z.boolean().optional(),
            canExportData: z.boolean().optional(),
            assignedSectorIds: z.array(z.number()).optional(),
          })
        )
        .mutation(async ({ input }) => {
          const { userId, ...perms } = input;
          await upsertAdminPermissions(userId, perms);
          return { success: true };
        }),

      getPermissions: adminProcedure
        .input(z.object({ userId: z.number() }))
        .query(({ input }) => getAdminPermissions(input.userId)),
    }),
  }),

  // ─── Survey Configuration ──────────────────────────────────────────────────
  surveyConfig: router({
      get: protectedProcedure
        .input(z.object({ groupId: z.number() }))
        .query(({ input }) => getSurveyConfig(input.groupId)),

      save: protectedProcedure
        .input(
          z.object({
            groupId: z.number(),
            surveyTitle: z.string().optional(),
            surveyPurpose: z.string().optional(),
            surveyObjectives: z.array(z.string()).optional(),
            organizationName: z.string().optional(),
            industryContext: z.string().optional(),
            businessGoals: z.array(z.string()).optional(),
            targetParticipants: z.string().optional(),
            participantRoles: z.array(z.string()).optional(),
            expectedParticipantCount: z.number().optional(),
            targetCompetencies: z.array(z.string()).optional(),
            knownSkillGaps: z.string().optional(),
            priorityAreas: z.array(z.string()).optional(),
            surveyStartDate: z.string().optional(),
            surveyEndDate: z.string().optional(),
            additionalNotes: z.string().optional(),
            regulatoryRequirements: z.string().optional(),
          })
        )
        .mutation(async ({ ctx, input }) => {
          const config = await upsertSurveyConfig({ ...input, createdBy: ctx.user.id });
          return config;
        }),

      generateQuestions: protectedProcedure
        .input(z.object({ groupId: z.number() }))
        .mutation(async ({ ctx, input }) => {
          const config = await getSurveyConfig(input.groupId);
          if (!config) throw new TRPCError({ code: "NOT_FOUND", message: "Survey configuration not found. Please save the configuration first." });

          const contextSummary = [
            config.surveyTitle ? `Survey Title: ${config.surveyTitle}` : "",
            config.surveyPurpose ? `Purpose: ${config.surveyPurpose}` : "",
            config.surveyObjectives?.length ? `Objectives:\n${(config.surveyObjectives as string[]).map((o, i) => `  ${i + 1}. ${o}`).join("\n")}` : "",
            config.organizationName ? `Organization: ${config.organizationName}` : "",
            config.industryContext ? `Industry Context: ${config.industryContext}` : "",
            config.businessGoals?.length ? `Business Goals:\n${(config.businessGoals as string[]).map((g, i) => `  ${i + 1}. ${g}`).join("\n")}` : "",
            config.targetParticipants ? `Target Participants: ${config.targetParticipants}` : "",
            config.participantRoles?.length ? `Participant Roles: ${(config.participantRoles as string[]).join(", ")}` : "",
            config.targetCompetencies?.length ? `Target Competencies:\n${(config.targetCompetencies as string[]).map((c, i) => `  ${i + 1}. ${c}`).join("\n")}` : "",
            config.knownSkillGaps ? `Known Skill Gaps: ${config.knownSkillGaps}` : "",
            config.priorityAreas?.length ? `Priority Areas: ${(config.priorityAreas as string[]).join(", ")}` : "",
            config.regulatoryRequirements ? `Regulatory Requirements: ${config.regulatoryRequirements}` : "",
          ].filter(Boolean).join("\n\n");

          const systemPrompt = `You are a TESDA-certified Training Needs Analysis specialist with expertise in the TESDA Competency-Based Training (CBT) framework, the National Technical Education and Skills Development Plan (NTESDP), and the Philippine Qualifications Framework (PQF). Your role is to generate comprehensive, targeted survey questions that will effectively gather data across all dimensions of the TESDA TNA framework.

The survey questions you generate must cover all 9 dimensions of the TESDA TNA framework:
1. Industry Profile and Context — questions about industry trends, future skills demand, regulatory requirements
2. Occupational Mapping — questions about job roles, competency requirements, role clarity
3. Competency Gap Analysis — questions measuring current vs. required competency levels
4. Skills Categorization — questions covering Basic, Common, Core, and Cross-Cutting competencies per TESDA
5. Technology and Equipment Requirements — questions about tools, software, equipment access and proficiency
6. Training Priority Assessment — questions about urgency, number of workers affected, business impact
7. Training Beneficiaries — questions identifying who needs what type of training
8. Training Delivery Preferences — questions about preferred learning modes, schedule constraints, accessibility
9. Training Outcomes and Evaluation — questions about expected results, success metrics, ROI expectations

For each question, assign the most appropriate TNA category:
- "organizational" — for industry context, strategic alignment, organizational readiness questions
- "job_task" — for occupational mapping, competency requirements, task analysis questions
- "individual" — for personal competency gaps, skills self-assessment, career development questions
- "training_feasibility" — for technology needs, delivery mode, budget, schedule, beneficiary questions
- "evaluation_success" — for expected outcomes, success metrics, training impact questions
- "custom" — for sector-specific or group-specific questions

Return ONLY a valid JSON array of question objects. Each object must have exactly these fields:
- questionText: string (the actual survey question — clear, specific, answerable)
- category: one of "organizational"|"job_task"|"individual"|"training_feasibility"|"evaluation_success"|"custom"
- questionType: one of "rating"|"yes_no"|"scale"|"text"|"multiple_choice"
- rationale: string (which TESDA framework dimension this covers and why it is important)
- accepted: boolean (always set to false initially)`;
          const userPrompt = `Based on the following TNA survey configuration, generate 25-30 targeted survey questions that will gather comprehensive data for a TESDA-aligned Training Needs Analysis.

${contextSummary}

Requirements:
- Distribute questions across ALL 9 TESDA TNA framework dimensions (at least 2-3 questions per dimension)
- Include questions that identify: industry skills demand, competency gaps, technology needs, training priorities, beneficiary groups, preferred delivery modes, and expected outcomes
- For rating/scale questions: use a 1-5 scale where 1=Very Low/Not at all and 5=Very High/Excellent
- For multiple_choice questions: provide clear answer options in the question text
- Make questions specific to the industry context and participant roles provided
- Include questions that will directly feed into the Training Plan Output (priority, duration, delivery mode, expected outcomes)
- Ensure questions are appropriate for the identified training beneficiaries (new entrants, existing workers, supervisors, trainers)`;

          // Check if we have a configured external AI provider
          const aiSettingsRow = await getActiveAiSettings();
          const useExternalAI = aiSettingsRow && aiSettingsRow.provider !== "builtin" && aiSettingsRow.apiKey;

          let generatedQuestions: Array<{ questionText: string; category: string; questionType: string; rationale: string; accepted: boolean }>;

          if (useExternalAI) {
            // Use invokeAI which routes through the configured OpenAI provider
            const jsonInstruction = `\n\nIMPORTANT: Return ONLY a valid JSON object with this exact structure: {"questions": [...]}. No markdown, no code fences, just raw JSON. Each question must have: questionText (string), category (one of: organizational|job_task|individual|training_feasibility|evaluation_success|custom), questionType (one of: rating|yes_no|scale|text|multiple_choice), rationale (string), accepted (boolean, always false).`;
            const rawContent = await invokeAI({
              messages: [
                { role: "system", content: systemPrompt + jsonInstruction },
                { role: "user", content: userPrompt },
              ],
            });
            // Strip markdown code fences if present
            const cleaned = rawContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
            const parsedExternal = JSON.parse(cleaned) as { questions: typeof generatedQuestions };
            generatedQuestions = parsedExternal.questions;
          } else {
            // Use built-in LLM with structured JSON schema
            const builtinResponse = await invokeLLM({
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
              response_format: {
                type: "json_schema",
                json_schema: {
                  name: "tna_questions",
                  strict: true,
                  schema: {
                    type: "object",
                    properties: {
                      questions: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            questionText: { type: "string" },
                            category: { type: "string", enum: ["organizational", "job_task", "individual", "training_feasibility", "evaluation_success", "custom"] },
                            questionType: { type: "string", enum: ["rating", "yes_no", "scale", "text", "multiple_choice"] },
                            rationale: { type: "string" },
                            accepted: { type: "boolean" },
                          },
                          required: ["questionText", "category", "questionType", "rationale", "accepted"],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: ["questions"],
                    additionalProperties: false,
                  },
                },
              },
            });
            const rawBuiltin = builtinResponse.choices[0].message.content as string;
            const parsedBuiltin = JSON.parse(rawBuiltin) as { questions: typeof generatedQuestions };
            generatedQuestions = parsedBuiltin.questions;
          }
          await saveAiGeneratedQuestions(config.id, generatedQuestions!);
          return { questions: generatedQuestions, configId: config.id };
        }),

      acceptQuestions: protectedProcedure
        .input(
          z.object({
            configId: z.number(),
            acceptedIndices: z.array(z.number()),
          })
        )
        .mutation(async ({ input }) => {
          const db_module = await import("./db");
          const db = await db_module.getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
          const { surveyConfigurations: scTable } = await import("../drizzle/schema");
          const { eq: eqOp } = await import("drizzle-orm");
          const [config] = await db.select().from(scTable).where(eqOp(scTable.id, input.configId)).limit(1);
          if (!config) throw new TRPCError({ code: "NOT_FOUND" });
          const existing = (config.aiGeneratedQuestions ?? []) as Array<{ questionText: string; category: string; questionType: string; rationale: string; accepted: boolean }>;
          const updated = existing.map((q, i) => ({ ...q, accepted: input.acceptedIndices.includes(i) }));
          await saveAiGeneratedQuestions(input.configId, updated);
          return { success: true, count: input.acceptedIndices.length };
        }),
      addToQuestionBank: protectedProcedure
        .input(
          z.object({
            configId: z.number(),
            acceptedIndices: z.array(z.number()),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const db_module = await import("./db");
          const db = await db_module.getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
          const { surveyConfigurations: scTable, questions: qTable } = await import("../drizzle/schema");
          const { eq: eqOp } = await import("drizzle-orm");
          const [config] = await db.select().from(scTable).where(eqOp(scTable.id, input.configId)).limit(1);
          if (!config) throw new TRPCError({ code: "NOT_FOUND" });
          const existing = (config.aiGeneratedQuestions ?? []) as Array<{ questionText: string; category: string; questionType: string; rationale: string; accepted: boolean }>;
          const toInsert = input.acceptedIndices
            .map(i => existing[i])
            .filter(Boolean);
          if (toInsert.length === 0) return { success: true, inserted: 0 };
          // Map AI category names to valid enum values
          const validCategories = ["organizational", "job_task", "individual", "training_feasibility", "evaluation_success", "custom"] as const;
          const validTypes = ["rating", "yes_no", "scale", "text", "multiple_choice"] as const;
          const rows = toInsert.map(q => {
            const cat = validCategories.includes(q.category as typeof validCategories[number])
              ? q.category as typeof validCategories[number]
              : "custom";
            const qtype = validTypes.includes(q.questionType as typeof validTypes[number])
              ? q.questionType as typeof validTypes[number]
              : "rating";
            return {
              questionText: q.questionText,
              category: cat,
              customCategory: cat === "custom" ? q.category : null,
              questionType: qtype,
              sectorId: null, // AI questions apply to all sectors; scoped by groupId instead
              groupId: config.groupId ?? null,
              helpText: q.rationale ?? null,
              isActive: true,
            };
          });
          await db.insert(qTable).values(rows);
          // Mark all accepted questions in the config
          const updated = existing.map((q, i) => ({ ...q, accepted: input.acceptedIndices.includes(i) }));
          await saveAiGeneratedQuestions(input.configId, updated);
          return { success: true, inserted: rows.length };
        }),
    }),
  // ─── AI Provider Configuration ──────────────────────────────────────────────
  aiConfig: router({
    getSettings: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const settings = await getAiSettings();
        if (!settings) {
          return { provider: "builtin", model: "gpt-4o", baseUrl: null, hasApiKey: false, updatedAt: null };
        }
        return {
          provider: settings.provider,
          model: settings.model,
          baseUrl: settings.baseUrl,
          hasApiKey: !!settings.apiKey,
          updatedAt: settings.updatedAt,
        };
      }),
    saveSettings: protectedProcedure
      .input(
        z.object({
          provider: z.enum(["builtin", "openai", "gemini", "custom"]),
          apiKey: z.string().optional(),
          model: z.string().min(1),
          baseUrl: z.string().url().optional().or(z.literal("")),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await upsertAiSettings({
          provider: input.provider,
          apiKey: input.apiKey ?? null,
          model: input.model,
          baseUrl: input.baseUrl || null,
          updatedBy: ctx.user.id,
        });
        return { success: true };
      }),
    testConnection: protectedProcedure
      .input(
        z.object({
          provider: z.enum(["builtin", "openai", "gemini", "custom"]),
          apiKey: z.string().optional(),
          model: z.string().min(1),
          baseUrl: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const result = await testAiConnection(
          input.provider,
          input.apiKey ?? "",
          input.model,
          input.baseUrl
        );
        return result;
      }),
  }),
});
export type AppRouter = typeof appRouter;
