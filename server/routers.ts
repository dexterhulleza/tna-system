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
  getScoringWeights,
  upsertScoringWeights,
  // T2-1 Target Proficiency
  getTargetProficiencies,
  getTargetProficiencyById,
  upsertTargetProficiency,
  deleteTargetProficiency,
  // T2-2 Competency Gap Records
  saveCompetencyGapRecords,
  getCompetencyGapRecordsByReport,
  getCompetencyGapRecordsByGroup,
  aggregateGroupGapRecords,
  // T2-3 Prioritization Matrix
  getPrioritizationMatrix,
  upsertPrioritizationItem,
  deletePrioritizationItem,
  recomputeMatrixRanks,
  generatePrioritizationMatrix,
  // T2-4 Supervisor Validation
  getSurveysForSupervisorValidation,
  getSupervisorValidationProgress,
  saveSupervisorScores,
  // T3 Curriculum Engine
  getCurriculumBlueprintsByGroup,
  getCurriculumBlueprintById,
  getAllCurriculumBlueprints,
  upsertCurriculumBlueprint,
  deleteCurriculumBlueprint,
  advanceBlueprintStatus,
  getCurriculumModulesByBlueprint,
  upsertCurriculumModule,
  deleteCurriculumModule,
  reorderCurriculumModules,
  bulkInsertCurriculumModules,
  deleteAllModulesForBlueprint,
  // T4 Learning Path Engine
  createLearningPath,
  getLearningPathById,
  getLearningPathsByUser,
  listAllLearningPaths,
  updateLearningPath,
  deleteLearningPath,
  createLearningPathStep,
  getStepsForPath,
  updateLearningPathStep,
  deleteLearningPathStep,
  deleteAllStepsForPath,
  computePathProgress,
  // T5 Micro-Credential, Campaigns, Performance Evidence, Analytics
  getMicroCredentialsByUser,
  getMicroCredentialsByGroup,
  getAllMicroCredentials,
  getMicroCredentialById,
  upsertMicroCredential,
  advanceMicroCredentialStatus,
  deleteMicroCredential,
  getAllCampaigns,
  getCampaignById,
  upsertCampaign,
  advanceCampaignStatus,
  refreshCampaignStats,
  deleteCampaign,
  getPerformanceEvidenceByUser,
  getPerformanceEvidenceByGroup,
  getPerformanceEvidenceById,
  upsertPerformanceEvidence,
  verifyPerformanceEvidence,
  deletePerformanceEvidence,
  getWorkforceAnalytics,
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
import { users, auditLogs, tesdaReferences, taskCompetencyMappings } from "../drizzle/schema";
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
          tnaRole: z.enum(["industry_worker", "trainer", "assessor", "hr_officer", "admin", "ld_officer", "line_manager", "employee", "executive_reviewer"]),
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
        // ROLE GOVERNANCE: HR Officers cannot assign System Administrator role
        const callerIsHrOfficer = ctx.user.tnaRole === "hr_officer";
        const targetIsAdmin = input.tnaRole === "admin" || input.role === "admin";
        if (callerIsHrOfficer && targetIsAdmin) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only System Administrators can assign the System Administrator role.",
          });
        }

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
          tnaRole: z.enum(["industry_worker", "trainer", "assessor", "hr_officer", "admin", "ld_officer", "line_manager", "employee", "executive_reviewer"]).optional(),
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

    // Change own password (requires current password verification)
    changePassword: protectedProcedure
      .input(
        z.object({
          currentPassword: z.string().min(1),
          newPassword: z.string().min(8),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [user] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No password set for this account" });
        }
        const valid = await verifyPassword(input.currentPassword, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password is incorrect" });
        }
        const newHash = await hashPassword(input.newPassword);
        await updatePassword(ctx.user.id, newHash);
        await createAuditLog({ userId: ctx.user.id, action: "password_changed", module: "auth", details: "User changed own password" });
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
          tnaRole: z.enum(["industry_worker", "trainer", "assessor", "hr_officer", "admin", "ld_officer", "line_manager", "employee", "executive_reviewer"]).optional(),
          organization: z.string().optional(),
          jobTitle: z.string().optional(),
          department: z.string().optional(),
          // PSOC work function fields
          workFunctionCategory: z.string().max(100).optional().nullable(),
          workFunctionTitle: z.string().max(255).optional().nullable(),
          workFunctionPsocCode: z.string().max(20).optional().nullable(),
          workFunctionOtherText: z.string().max(150).optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        // Validate: if user is employee role, work function is required
        const updateData: Record<string, unknown> = {};
        if (input.tnaRole !== undefined) updateData.tnaRole = input.tnaRole;
        if (input.organization !== undefined) updateData.organization = input.organization;
        if (input.jobTitle !== undefined) updateData.jobTitle = input.jobTitle;
        if (input.department !== undefined) updateData.department = input.department;
        if (input.workFunctionCategory !== undefined) updateData.workFunctionCategory = input.workFunctionCategory;
        if (input.workFunctionTitle !== undefined) updateData.workFunctionTitle = input.workFunctionTitle;
        if (input.workFunctionPsocCode !== undefined) updateData.workFunctionPsocCode = input.workFunctionPsocCode;
        if (input.workFunctionOtherText !== undefined) updateData.workFunctionOtherText = input.workFunctionOtherText;
        await db.update(users).set(updateData).where(eq(users.id, ctx.user.id));
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

        // T2-1: Resolve target proficiencies for all questions in this survey
        const questionIds = responsesWithQuestions.map(r => r.question?.id).filter(Boolean) as number[];
        const targetRows = await getTargetProficiencies({ activeOnly: true });
        const targetMap: import("./tnaEngine").TargetProficiencyMap = new Map();
        for (const { tp } of targetRows) {
          if (questionIds.includes(tp.questionId)) {
            // Use the first match (most specific wins due to ordering in getTargetProficiencies)
            if (!targetMap.has(tp.questionId)) {
              targetMap.set(tp.questionId, { targetScore: tp.targetScore, usedDefaultTarget: false });
            }
          }
        }

        // T1-6: Load scoring weights
        const weightsRow = await getScoringWeights();
        const weights: import("./tnaEngine").ScoringWeightsInput = weightsRow
          ? {
              selfWeight: weightsRow.selfWeight,
              supervisorWeight: weightsRow.supervisorWeight,
              kpiWeight: weightsRow.kpiWeight,
              fallbackToSelfOnly: weightsRow.fallbackToSelfOnly,
            }
          : { selfWeight: 1, supervisorWeight: 0, kpiWeight: 0, fallbackToSelfOnly: true };

        const analysisResult = analyzeGaps(responsesWithQuestions as any, weights, targetMap);

        const reportId = await createReport({
          surveyId: input.surveyId,
          userId: ctx.user.id,
          sectorId: survey.sectorId,
          skillAreaId: survey.skillAreaId,
          ...analysisResult,
        });
        if (!reportId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        // T2-2: Persist structured gap records
        await saveCompetencyGapRecords(reportId, input.surveyId, analysisResult.gapRecords);

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
            tnaRole: z.enum(["industry_worker", "trainer", "assessor", "hr_officer", "admin", "ld_officer", "line_manager", "employee", "executive_reviewer"]),
            adminLevel: z.enum(["super_admin", "admin", "sector_manager", "question_manager"]).optional(),
            organization: z.string().optional(),
            jobTitle: z.string().optional(),
          })
        )
        .mutation(async ({ ctx, input }) => {
          // ROLE GOVERNANCE: HR Officers cannot assign System Administrator role
          const callerIsHrOfficer = ctx.user.tnaRole === "hr_officer";
          const targetIsAdmin = input.tnaRole === "admin" || input.role === "admin";
          if (callerIsHrOfficer && targetIsAdmin) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Only System Administrators can assign the System Administrator role.",
            });
          }
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
  // ─── Task-to-Competency Mappings (T1-5) ─────────────────────────────────────
  taskMapping: router({
    // List all mappings for a given question
    listByQuestion: protectedProcedure
      .input(z.object({ questionId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const rows = await db
          .select({
            id: taskCompetencyMappings.id,
            questionId: taskCompetencyMappings.questionId,
            tesdaReferenceId: taskCompetencyMappings.tesdaReferenceId,
            relevanceScore: taskCompetencyMappings.relevanceScore,
            notes: taskCompetencyMappings.notes,
            mappingSource: taskCompetencyMappings.mappingSource,
            createdAt: taskCompetencyMappings.createdAt,
            trCode: tesdaReferences.trCode,
            qualificationTitle: tesdaReferences.qualificationTitle,
            csUnitCode: tesdaReferences.csUnitCode,
            csUnitTitle: tesdaReferences.csUnitTitle,
            competencyLevel: tesdaReferences.competencyLevel,
            referenceType: tesdaReferences.referenceType,
          })
          .from(taskCompetencyMappings)
          .innerJoin(tesdaReferences, eq(taskCompetencyMappings.tesdaReferenceId, tesdaReferences.id))
          .where(eq(taskCompetencyMappings.questionId, input.questionId));
        return rows;
      }),

    // List all mappings (optionally filtered by groupId)
    listAll: protectedProcedure
      .input(z.object({ groupId: z.number().optional() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { questions: questionsTable } = await import("../drizzle/schema");
        const baseQuery = db
          .select({
            id: taskCompetencyMappings.id,
            questionId: taskCompetencyMappings.questionId,
            questionText: questionsTable.questionText,
            tesdaReferenceId: taskCompetencyMappings.tesdaReferenceId,
            relevanceScore: taskCompetencyMappings.relevanceScore,
            notes: taskCompetencyMappings.notes,
            mappingSource: taskCompetencyMappings.mappingSource,
            trCode: tesdaReferences.trCode,
            qualificationTitle: tesdaReferences.qualificationTitle,
            csUnitCode: tesdaReferences.csUnitCode,
            csUnitTitle: tesdaReferences.csUnitTitle,
            competencyLevel: tesdaReferences.competencyLevel,
            referenceType: tesdaReferences.referenceType,
          })
          .from(taskCompetencyMappings)
          .innerJoin(tesdaReferences, eq(taskCompetencyMappings.tesdaReferenceId, tesdaReferences.id))
          .innerJoin(questionsTable, eq(taskCompetencyMappings.questionId, questionsTable.id));
        if (input.groupId !== undefined) {
          return baseQuery.where(eq(questionsTable.groupId, input.groupId));
        }
        return baseQuery;
      }),

    upsert: protectedProcedure
      .input(z.object({
        id: z.number().optional(),
        questionId: z.number(),
        tesdaReferenceId: z.number(),
        relevanceScore: z.number().min(0).max(1).optional().default(1.0),
        notes: z.string().optional().nullable(),
        mappingSource: z.enum(["manual", "ai"]).optional().default("manual"),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.tnaRole !== "hr_officer") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        if (input.id) {
          await db.update(taskCompetencyMappings)
            .set({ relevanceScore: input.relevanceScore, notes: input.notes ?? null, mappingSource: input.mappingSource })
            .where(eq(taskCompetencyMappings.id, input.id));
          return { id: input.id };
        } else {
          // Prevent duplicate mapping for same question+reference
          const [existing] = await db.select({ id: taskCompetencyMappings.id })
            .from(taskCompetencyMappings)
            .where(and(
              eq(taskCompetencyMappings.questionId, input.questionId),
              eq(taskCompetencyMappings.tesdaReferenceId, input.tesdaReferenceId),
            ));
          if (existing) throw new TRPCError({ code: "CONFLICT", message: "Mapping already exists for this question and reference." });
          const [result] = await db.insert(taskCompetencyMappings).values({
            questionId: input.questionId,
            tesdaReferenceId: input.tesdaReferenceId,
            relevanceScore: input.relevanceScore,
            notes: input.notes ?? null,
            mappingSource: input.mappingSource,
            createdBy: ctx.user.id,
          });
          return { id: (result as any).insertId };
        }
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.tnaRole !== "hr_officer") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(taskCompetencyMappings).where(eq(taskCompetencyMappings.id, input.id));
        return { success: true };
      }),

    // AI-assisted: auto-suggest TESDA references for a question based on its text
    aiSuggest: protectedProcedure
      .input(z.object({ questionId: z.number(), questionText: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.tnaRole !== "hr_officer") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        // Fetch active TESDA references for context
        const refs = await db.select({
          id: tesdaReferences.id,
          trCode: tesdaReferences.trCode,
          qualificationTitle: tesdaReferences.qualificationTitle,
          csUnitCode: tesdaReferences.csUnitCode,
          csUnitTitle: tesdaReferences.csUnitTitle,
          competencyLevel: tesdaReferences.competencyLevel,
        }).from(tesdaReferences).where(eq(tesdaReferences.isActive, true)).limit(100);
        if (refs.length === 0) return [];
        const prompt = `You are a TESDA competency mapping expert. Given the following survey question/task, suggest the most relevant TESDA competency units from the provided list.\n\nTask/Question: "${input.questionText}"\n\nAvailable TESDA References:\n${refs.map(r => `ID:${r.id} | ${r.trCode ?? ''} | ${r.qualificationTitle} | ${r.csUnitCode ?? ''} | ${r.csUnitTitle ?? ''} | ${r.competencyLevel ?? ''}`).join('\n')}\n\nReturn a JSON array of up to 3 best matches with: id (number), relevanceScore (0.0-1.0), rationale (string). Only return the JSON array, no other text.`;
        const aiResponse = await invokeLLM({
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_schema", json_schema: { name: "suggestions", strict: true, schema: { type: "object", properties: { suggestions: { type: "array", items: { type: "object", properties: { id: { type: "number" }, relevanceScore: { type: "number" }, rationale: { type: "string" } }, required: ["id", "relevanceScore", "rationale"], additionalProperties: false } } }, required: ["suggestions"], additionalProperties: false } } },
        });
        const content = aiResponse.choices?.[0]?.message?.content ?? "{}";
        const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
        return (parsed.suggestions ?? []).map((s: any) => ({
          ...s,
          reference: refs.find(r => r.id === s.id),
        }));
      }),
  }),

  // ─── AI Provider Configuration ──────────────────────────────────────────────
  // ─── TESDA Reference Library ───────────────────────────────────────────────────────────────
  tesda: router({
    list: protectedProcedure
      .input(z.object({
        search: z.string().optional(),
        referenceType: z.enum(["TR", "CS", "Supermarket"]).optional(),
        competencyLevel: z.string().optional(),
        industry: z.string().optional(),
        activeOnly: z.boolean().optional().default(true),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const conditions = [];
        if (input.activeOnly) conditions.push(eq(tesdaReferences.isActive, true));
        if (input.referenceType) conditions.push(eq(tesdaReferences.referenceType, input.referenceType));
        if (input.competencyLevel) conditions.push(eq(tesdaReferences.competencyLevel, input.competencyLevel as any));
        if (input.industry) conditions.push(like(tesdaReferences.industry, `%${input.industry}%`));
        if (input.search) {
          conditions.push(or(
            like(tesdaReferences.qualificationTitle, `%${input.search}%`),
            like(tesdaReferences.trCode, `%${input.search}%`),
            like(tesdaReferences.csUnitCode, `%${input.search}%`),
            like(tesdaReferences.csUnitTitle, `%${input.search}%`),
          ));
        }
        const rows = await db.select().from(tesdaReferences)
          .where(conditions.length ? and(...conditions) : undefined)
          .orderBy(tesdaReferences.referenceType, tesdaReferences.qualificationTitle)
          .limit(200);
        return rows;
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [row] = await db.select().from(tesdaReferences).where(eq(tesdaReferences.id, input.id));
        if (!row) throw new TRPCError({ code: "NOT_FOUND" });
        return row;
      }),

    upsert: protectedProcedure
      .input(z.object({
        id: z.number().optional(),
        referenceType: z.enum(["TR", "CS", "Supermarket"]),
        trCode: z.string().max(50).optional().nullable(),
        qualificationTitle: z.string().min(1).max(255),
        csUnitCode: z.string().max(80).optional().nullable(),
        csUnitTitle: z.string().max(255).optional().nullable(),
        competencyLevel: z.enum(["NC I", "NC II", "NC III", "NC IV", "COC", "Other"]).optional().nullable(),
        descriptor: z.string().optional().nullable(),
        industry: z.string().max(150).optional().nullable(),
        sector: z.string().max(150).optional().nullable(),
        isActive: z.boolean().optional().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.tnaRole !== "hr_officer") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        if (input.id) {
          await db.update(tesdaReferences)
            .set({ ...input, updatedBy: ctx.user.id, id: undefined })
            .where(eq(tesdaReferences.id, input.id));
          return { id: input.id };
        } else {
          const [result] = await db.insert(tesdaReferences).values({
            ...input,
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          });
          return { id: (result as any).insertId };
        }
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(tesdaReferences).where(eq(tesdaReferences.id, input.id));
        return { success: true };
      }),

    toggleActive: protectedProcedure
      .input(z.object({ id: z.number(), isActive: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.tnaRole !== "hr_officer") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(tesdaReferences)
          .set({ isActive: input.isActive, updatedBy: ctx.user.id })
          .where(eq(tesdaReferences.id, input.id));
        return { success: true };
      }),
  }),

  // ─── Scoring Weights (T1-6) ─────────────────────────────────────────────────
  scoringWeights: router({
    get: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const weights = await getScoringWeights();
        // Return defaults if no record exists yet
        return weights ?? {
          id: null,
          selfWeight: 0.5,
          supervisorWeight: 0.3,
          kpiWeight: 0.2,
          requireSupervisorValidation: false,
          fallbackToSelfOnly: true,
          updatedBy: null,
          createdAt: null,
          updatedAt: null,
        };
      }),
    update: protectedProcedure
      .input(
        z.object({
          selfWeight: z.number().min(0).max(1),
          supervisorWeight: z.number().min(0).max(1),
          kpiWeight: z.number().min(0).max(1),
          requireSupervisorValidation: z.boolean(),
          fallbackToSelfOnly: z.boolean(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const total = input.selfWeight + input.supervisorWeight + input.kpiWeight;
        if (Math.abs(total - 1.0) > 0.001) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Weights must sum to 1.0 (got ${total.toFixed(3)})` });
        }
        await upsertScoringWeights({ ...input, updatedBy: ctx.user.id });
        return { success: true };
      }),
  }),
  // ─── Target Proficiency Levels (T2-1) ─────────────────────────────────────
  targetProficiency: router({
    list: adminProcedure
      .input(z.object({
        questionId: z.number().optional(),
        sectorId: z.number().optional(),
        skillAreaId: z.number().optional(),
        tnaRole: z.string().optional(),
        activeOnly: z.boolean().optional().default(true),
      }))
      .query(({ input }) => getTargetProficiencies(input)),

    getById: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const row = await getTargetProficiencyById(input.id);
        if (!row) throw new TRPCError({ code: "NOT_FOUND" });
        return row;
      }),

    upsert: adminProcedure
      .input(z.object({
        id: z.number().optional(),
        questionId: z.number(),
        sectorId: z.number().nullable().optional(),
        skillAreaId: z.number().nullable().optional(),
        tnaRole: z.string().nullable().optional(),
        targetScore: z.number().min(0).max(100),
        proficiencyLabel: z.string().max(100).nullable().optional(),
        rationale: z.string().nullable().optional(),
        isActive: z.boolean().optional().default(true),
      }))
      .mutation(({ ctx, input }) => upsertTargetProficiency({ ...input, userId: ctx.user.id })),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteTargetProficiency(input.id)),
  }),

  // ─── Competency Gap Records (T2-2) ──────────────────────────────────────────
  gapRecords: router({
    byReport: protectedProcedure
      .input(z.object({ reportId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Verify access
        const report = await getReportById(input.reportId);
        if (!report) throw new TRPCError({ code: "NOT_FOUND" });
        if (report.report.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return getCompetencyGapRecordsByReport(input.reportId);
      }),

    byGroup: adminProcedure
      .input(z.object({ groupId: z.number() }))
      .query(({ input }) => getCompetencyGapRecordsByGroup(input.groupId)),

    aggregateByGroup: adminProcedure
      .input(z.object({ groupId: z.number() }))
      .query(({ input }) => aggregateGroupGapRecords(input.groupId)),
  }),

  // ─── Prioritization Matrix (T2-3) ───────────────────────────────────────────
  prioritization: router({
    list: adminProcedure
      .input(z.object({ groupId: z.number() }))
      .query(({ input }) => getPrioritizationMatrix(input.groupId)),

    generate: adminProcedure
      .input(z.object({ groupId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const count = await generatePrioritizationMatrix(input.groupId, ctx.user.id);
        return { generated: count };
      }),

    upsert: adminProcedure
      .input(z.object({
        id: z.number().optional(),
        groupId: z.number(),
        questionId: z.number().nullable().optional(),
        trainingNeedLabel: z.string().min(1).max(500),
        category: z.string().nullable().optional(),
        urgencyScore: z.number().min(1).max(5),
        impactScore: z.number().min(1).max(5),
        feasibilityScore: z.number().min(1).max(5),
        affectedCount: z.number().optional(),
        avgGapPct: z.number().optional(),
        status: z.enum(["pending", "approved", "in_progress", "completed", "deferred"]).optional(),
        isManualOverride: z.boolean().optional(),
        notes: z.string().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await upsertPrioritizationItem({ ...input, userId: ctx.user.id });
        await recomputeMatrixRanks(input.groupId);
        return result;
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number(), groupId: z.number() }))
      .mutation(async ({ input }) => {
        await deletePrioritizationItem(input.id);
        await recomputeMatrixRanks(input.groupId);
        return { success: true };
      }),

    updateStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        groupId: z.number(),
        status: z.enum(["pending", "approved", "in_progress", "completed", "deferred"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { prioritizationMatrix: pm } = await import("../drizzle/schema");
        await db.update(pm)
          .set({ status: input.status as any, updatedBy: ctx.user.id })
          .where(eq(pm.id, input.id));
        return { success: true };
      }),
  }),

  // ─── Supervisor Validation (T2-4) ───────────────────────────────────────────
  supervisorValidation: router({
    // List surveys pending validation (for the logged-in supervisor)
    mySurveys: protectedProcedure
      .query(({ ctx }) => getSurveysForSupervisorValidation(ctx.user.id)),

    // Admin: list all surveys for a group with validation progress
    groupSurveys: adminProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ input }) => {
        const groupReports = await getReportsByGroup(input.groupId);
        const result = [];
        for (const r of groupReports) {
          if (!r.survey) continue;
          const progress = await getSupervisorValidationProgress(r.survey.id);
          result.push({
            survey: r.survey,
            user: r.user,
            report: r.report,
            validationProgress: progress,
          });
        }
        return result;
      }),

    // Get survey responses with existing supervisor scores for validation
    getSurveyForValidation: protectedProcedure
      .input(z.object({ surveyId: z.number() }))
      .query(async ({ ctx, input }) => {
        const survey = await getSurveyById(input.surveyId);
        if (!survey) throw new TRPCError({ code: "NOT_FOUND" });
        // Only admins, hr_officers, or line_managers can validate others
        const canValidate = ctx.user.role === "admin" ||
          ctx.user.tnaRole === "hr_officer" ||
          ctx.user.tnaRole === "line_manager";
        if (!canValidate && survey.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const responses = await getSurveyResponses(input.surveyId);
        const progress = await getSupervisorValidationProgress(input.surveyId);
        return { survey, responses, progress };
      }),

    // Submit supervisor scores for a survey
    submitScores: protectedProcedure
      .input(z.object({
        surveyId: z.number(),
        scores: z.array(z.object({
          responseId: z.number(),
          supervisorScore: z.number().min(0).max(100),
          supervisorNotes: z.string().nullable().optional(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const survey = await getSurveyById(input.surveyId);
        if (!survey) throw new TRPCError({ code: "NOT_FOUND" });
        const canValidate = ctx.user.role === "admin" ||
          ctx.user.tnaRole === "hr_officer" ||
          ctx.user.tnaRole === "line_manager";
        if (!canValidate) throw new TRPCError({ code: "FORBIDDEN" });
        await saveSupervisorScores(input.surveyId, ctx.user.id, input.scores);
        return { success: true, count: input.scores.length };
      }),

    // Get validation progress for a specific survey
    progress: protectedProcedure
      .input(z.object({ surveyId: z.number() }))
      .query(({ input }) => getSupervisorValidationProgress(input.surveyId)),
  }),

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

  // ─── Curriculum Engine (T3) ─────────────────────────────────────────────────
  curriculum: router({
    // List all blueprints (admin overview)
    list: adminProcedure
      .input(z.object({ groupId: z.number().optional() }))
      .query(async ({ input }) => {
        if (input.groupId) return getCurriculumBlueprintsByGroup(input.groupId);
        return getAllCurriculumBlueprints();
      }),

    // Get a single blueprint with its modules
    getById: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const blueprint = await getCurriculumBlueprintById(input.id);
        if (!blueprint) throw new TRPCError({ code: "NOT_FOUND" });
        const modules = await getCurriculumModulesByBlueprint(input.id);
        return { blueprint, modules };
      }),

    // Create or update a blueprint
    upsert: adminProcedure
      .input(
        z.object({
          id: z.number().optional(),
          groupId: z.number(),
          title: z.string().min(1),
          description: z.string().optional().nullable(),
          targetAudience: z.string().optional().nullable(),
          status: z.enum(["draft", "for_review", "approved", "published"]).optional(),
          alignmentType: z.enum(["full_tr", "partial_cs", "supermarket", "blended", "none"]).optional(),
          alignmentCondition: z.enum(["strong", "partial", "emerging", "blended"]).optional(),
          alignmentNotes: z.string().optional().nullable(),
          tesdaReferenceId: z.number().optional().nullable(),
          overrideReason: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return upsertCurriculumBlueprint({ ...input, createdBy: ctx.user.id });
      }),

    // Delete a blueprint (cascades to modules)
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteCurriculumBlueprint(input.id);
        return { success: true };
      }),

    // Advance status: draft → for_review → approved → published
    advanceStatus: adminProcedure
      .input(
        z.object({
          id: z.number(),
          newStatus: z.enum(["for_review", "approved", "published"]),
          overrideReason: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return advanceBlueprintStatus(input.id, input.newStatus, ctx.user.id, input.overrideReason);
      }),

    // Revert to draft (for re-editing after review)
    revertToDraft: adminProcedure
      .input(z.object({ id: z.number(), reason: z.string().optional() }))
      .mutation(async ({ input }) => {
        const db = await (await import("./db")).getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { curriculumBlueprints: cb } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await db.update(cb).set({ status: "draft", overrideReason: input.reason ?? null }).where(eq(cb.id, input.id));
        return getCurriculumBlueprintById(input.id);
      }),

    // ── Module CRUD ───────────────────────────────────────────────────────────
    getModules: adminProcedure
      .input(z.object({ blueprintId: z.number() }))
      .query(({ input }) => getCurriculumModulesByBlueprint(input.blueprintId)),

    upsertModule: adminProcedure
      .input(
        z.object({
          id: z.number().optional(),
          blueprintId: z.number(),
          layer: z.enum(["foundation", "core_role", "context", "advancement"]),
          title: z.string().min(1),
          description: z.string().optional().nullable(),
          competencyCategory: z.string().optional().nullable(),
          tesdaReferenceId: z.number().optional().nullable(),
          durationHours: z.number().optional().nullable(),
          modality: z.enum(["face_to_face", "online", "blended", "on_the_job", "coaching", "self_directed"]).optional(),
          prerequisites: z.array(z.number()).optional(),
          targetGapLevel: z.enum(["critical", "high", "moderate", "low"]).optional(),
          estimatedAffectedCount: z.number().optional(),
          sortOrder: z.number().optional(),
          overrideReason: z.string().optional().nullable(),
        })
      )
      .mutation(({ input }) => upsertCurriculumModule(input)),

    deleteModule: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteCurriculumModule(input.id);
        return { success: true };
      }),

    reorderModules: adminProcedure
      .input(z.object({ blueprintId: z.number(), orderedIds: z.array(z.number()) }))
      .mutation(({ input }) => reorderCurriculumModules(input.blueprintId, input.orderedIds)),

    // ── T3-2 AI-assisted curriculum generation ────────────────────────────────
    generateBlueprint: adminProcedure
      .input(
        z.object({
          groupId: z.number(),
          blueprintId: z.number().optional(), // if provided, regenerate into existing blueprint
        })
      )
      .mutation(async ({ ctx, input }) => {
        // 1. Gather context: group info, gap records, prioritization matrix
        const group = await getSurveyGroupById(input.groupId);
        if (!group) throw new TRPCError({ code: "NOT_FOUND", message: "Survey group not found" });

        const gapSummary = await aggregateGroupGapRecords(input.groupId);
        const prioritization = await getPrioritizationMatrix(input.groupId);

        const contextData = JSON.stringify({
          group: { name: group.name, code: group.code, description: group.description },
          topGaps: gapSummary.slice(0, 20).map((g: any) => ({
            category: g.category,
            questionText: g.questionText,
            avgGapPct: g.avgGapPct,
            gapLevel: g.gapLevel,
            affectedCount: g.affectedCount,
          })),
          prioritizedNeeds: prioritization.slice(0, 10).map((p: any) => ({
            label: p.trainingNeedLabel,
            priorityScore: p.priorityScore,
            urgency: p.urgencyScore,
            impact: p.impactScore,
          })),
        }, null, 2);

        const systemPrompt = `You are a TESDA-aligned curriculum design specialist. Generate a structured curriculum blueprint in JSON format based on the provided TNA gap data. The blueprint must follow the 4-layer curriculum architecture: Foundation (basic literacy, safety, workplace communication), Core Role (technical competencies directly addressing identified gaps), Context (industry-specific application, regulations, standards), and Advancement (leadership, innovation, career progression).

Return ONLY valid JSON matching this exact schema:
{
  "title": "string — descriptive curriculum title",
  "description": "string — 2-3 sentence overview",
  "targetAudience": "string — who this curriculum is for",
  "alignmentType": "full_tr|partial_cs|supermarket|blended|none",
  "alignmentCondition": "strong|partial|emerging|blended",
  "alignmentNotes": "string — explanation of TESDA alignment",
  "modules": [
    {
      "layer": "foundation|core_role|context|advancement",
      "title": "string — module title",
      "description": "string — what learners will achieve",
      "competencyCategory": "string — maps to gap category",
      "durationHours": number,
      "modality": "face_to_face|online|blended|on_the_job|coaching|self_directed",
      "targetGapLevel": "critical|high|moderate|low",
      "estimatedAffectedCount": number,
      "sortOrder": number
    }
  ]
}`;

        const userPrompt = `Generate a curriculum blueprint for the following survey group and identified competency gaps:\n\n${contextData}\n\nEnsure modules directly address the identified gaps. Order modules from Foundation to Advancement. Include at least 2 modules per layer where gaps exist. Use realistic duration estimates (4-40 hours per module). Return only the JSON object.`;

        let parsed: any;
        try {
          const result = await invokeAI({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          });
          const raw = typeof result === "string" ? result : (result as any)?.text ?? String(result);
          // Extract JSON from the response
          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error("No JSON found in AI response");
          parsed = JSON.parse(jsonMatch[0]);
        } catch (err: any) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `AI generation failed: ${err?.message ?? "Unknown error"}`,
          });
        }

        const aiSettings = await getActiveAiSettings();
        const modelUsed = aiSettings?.model ?? "built-in";
        const now = new Date();

        // 2. Create or update the blueprint record
        let blueprintId = input.blueprintId;
        if (blueprintId) {
          // Regenerate: update blueprint metadata and delete existing modules
          await upsertCurriculumBlueprint({
            id: blueprintId,
            groupId: input.groupId,
            title: parsed.title ?? `Curriculum Blueprint — ${group.name}`,
            description: parsed.description ?? null,
            targetAudience: parsed.targetAudience ?? null,
            alignmentType: parsed.alignmentType ?? "none",
            alignmentCondition: parsed.alignmentCondition ?? "emerging",
            alignmentNotes: parsed.alignmentNotes ?? null,
            isAiGenerated: true,
            generatedBy: ctx.user.id,
            generatedAt: now,
            modelUsed,
          });
          await deleteAllModulesForBlueprint(blueprintId);
        } else {
          const bp = await upsertCurriculumBlueprint({
            groupId: input.groupId,
            title: parsed.title ?? `Curriculum Blueprint — ${group.name}`,
            description: parsed.description ?? null,
            targetAudience: parsed.targetAudience ?? null,
            status: "draft",
            alignmentType: parsed.alignmentType ?? "none",
            alignmentCondition: parsed.alignmentCondition ?? "emerging",
            alignmentNotes: parsed.alignmentNotes ?? null,
            isAiGenerated: true,
            generatedBy: ctx.user.id,
            generatedAt: now,
            modelUsed,
            createdBy: ctx.user.id,
          });
          blueprintId = bp!.id;
        }

        // 3. Insert modules
        const modulesRaw: any[] = Array.isArray(parsed.modules) ? parsed.modules : [];
        const validLayers = ["foundation", "core_role", "context", "advancement"] as const;
        const validModalities = ["face_to_face", "online", "blended", "on_the_job", "coaching", "self_directed"] as const;
        const validGapLevels = ["critical", "high", "moderate", "low"] as const;
        const modules = modulesRaw.map((m: any, i: number) => ({
          layer: validLayers.includes(m.layer) ? m.layer : "core_role" as const,
          title: String(m.title ?? `Module ${i + 1}`),
          description: m.description ?? null,
          competencyCategory: m.competencyCategory ?? null,
          durationHours: typeof m.durationHours === "number" ? m.durationHours : null,
          modality: validModalities.includes(m.modality) ? m.modality : "blended" as const,
          targetGapLevel: validGapLevels.includes(m.targetGapLevel) ? m.targetGapLevel : "high" as const,
          estimatedAffectedCount: typeof m.estimatedAffectedCount === "number" ? m.estimatedAffectedCount : 0,
          sortOrder: typeof m.sortOrder === "number" ? m.sortOrder : i,
          isAiGenerated: true,
        }));
        await bulkInsertCurriculumModules(blueprintId!, modules);

        const blueprint = await getCurriculumBlueprintById(blueprintId!);
        const savedModules = await getCurriculumModulesByBlueprint(blueprintId!);
        return { blueprint, modules: savedModules };
      }),
  }),

  // ═══════════════════════════════════════════════════════════════════════
  // T4 — Learning Path Engine
  // ═══════════════════════════════════════════════════════════════════════
  learningPaths: router({
    // List all paths (admin/HR view)
    list: adminProcedure
      .input(z.object({
        groupId: z.number().optional(),
        status: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const paths = await listAllLearningPaths(input);
        // Attach step progress for each path
        const result = await Promise.all(paths.map(async (p) => {
          const steps = await getStepsForPath(p.id);
          const progress = computePathProgress(steps);
          return { ...p, stepCount: steps.length, progress };
        }));
        return result;
      }),

    // Get a single path with its steps
    getById: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const path = await getLearningPathById(input.id);
        if (!path) throw new TRPCError({ code: "NOT_FOUND" });
        const steps = await getStepsForPath(input.id);
        const progress = computePathProgress(steps);
        return { ...path, steps, progress };
      }),

    // Staff: get my own paths
    myPaths: protectedProcedure.query(async ({ ctx }) => {
      const paths = await getLearningPathsByUser(ctx.user.id);
      const result = await Promise.all(paths.map(async (p) => {
        const steps = await getStepsForPath(p.id);
        const progress = computePathProgress(steps);
        return { ...p, steps, progress };
      }));
      return result;
    }),

    // Create a path manually (admin)
    create: adminProcedure
      .input(z.object({
        userId: z.number(),
        groupId: z.number().optional(),
        blueprintId: z.number().optional(),
        title: z.string().min(1),
        description: z.string().optional(),
        pathType: z.enum(["entry", "compliance", "performance_recovery", "progression", "cross_skilling"]).default("progression"),
        completionRule: z.enum(["all_required", "minimum_percentage", "milestone_based"]).default("all_required"),
        completionThresholdPct: z.number().min(0).max(100).default(80),
        targetCompletionDate: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await createLearningPath({
          userId: input.userId,
          groupId: input.groupId,
          blueprintId: input.blueprintId,
          title: input.title,
          description: input.description,
          pathType: input.pathType,
          completionRule: input.completionRule,
          completionThresholdPct: input.completionThresholdPct,
          targetCompletionDate: input.targetCompletionDate ? new Date(input.targetCompletionDate) : null,
          createdBy: ctx.user.id,
        });
        return { id };
      }),

    // Update path metadata
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().nullable().optional(),
        pathType: z.enum(["entry", "compliance", "performance_recovery", "progression", "cross_skilling"]).optional(),
        completionRule: z.enum(["all_required", "minimum_percentage", "milestone_based"]).optional(),
        completionThresholdPct: z.number().min(0).max(100).optional(),
        targetCompletionDate: z.string().nullable().optional(),
        overrideReason: z.string().nullable().optional(),
        blueprintId: z.number().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateLearningPath(id, {
          ...data,
          targetCompletionDate: data.targetCompletionDate ? new Date(data.targetCompletionDate) : data.targetCompletionDate === null ? null : undefined,
        });
        return { success: true };
      }),

    // Assign path to user (status: draft → assigned)
    assign: adminProcedure
      .input(z.object({
        id: z.number(),
        targetCompletionDate: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await updateLearningPath(input.id, {
          status: "assigned",
          assignedAt: new Date(),
          assignedBy: ctx.user.id,
          targetCompletionDate: input.targetCompletionDate ? new Date(input.targetCompletionDate) : undefined,
        });
        return { success: true };
      }),

    // Archive a path
    archive: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await updateLearningPath(input.id, { status: "archived" });
        return { success: true };
      }),

    // Delete a path
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteLearningPath(input.id);
        return { success: true };
      }),

    // ── Steps ────────────────────────────────────────────────────────────
    addStep: adminProcedure
      .input(z.object({
        pathId: z.number(),
        moduleId: z.number().optional(),
        title: z.string().min(1),
        description: z.string().optional(),
        layer: z.enum(["foundation", "core_role", "context", "advancement"]).default("core_role"),
        modality: z.enum(["face_to_face", "online", "blended", "on_the_job", "coaching", "self_directed"]).default("blended"),
        durationHours: z.number().optional(),
        competencyCategory: z.string().optional(),
        targetGapLevel: z.enum(["critical", "high", "moderate", "low"]).default("high"),
        sortOrder: z.number().default(0),
        isRequired: z.boolean().default(true),
        isMilestone: z.boolean().default(false),
        milestoneLabel: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await createLearningPathStep(input);
        return { id };
      }),

    updateStep: adminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().nullable().optional(),
        layer: z.enum(["foundation", "core_role", "context", "advancement"]).optional(),
        modality: z.enum(["face_to_face", "online", "blended", "on_the_job", "coaching", "self_directed"]).optional(),
        durationHours: z.number().nullable().optional(),
        competencyCategory: z.string().nullable().optional(),
        targetGapLevel: z.enum(["critical", "high", "moderate", "low"]).optional(),
        sortOrder: z.number().optional(),
        isRequired: z.boolean().optional(),
        isMilestone: z.boolean().optional(),
        milestoneLabel: z.string().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateLearningPathStep(id, data);
        return { success: true };
      }),

    deleteStep: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteLearningPathStep(input.id);
        return { success: true };
      }),

    // ── Progress tracking (T4-4) ─────────────────────────────────────────
    // Staff: update their own step progress
    updateStepProgress: protectedProcedure
      .input(z.object({
        stepId: z.number(),
        progressStatus: z.enum(["not_started", "in_progress", "completed", "exempted"]),
        completionNotes: z.string().optional(),
        completionEvidence: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify the step belongs to a path owned by this user
        const steps = await getStepsForPath(0); // We'll do a direct lookup
        const db = await (await import("./db")).getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { learningPathSteps: lps, learningPaths: lp } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        const [stepRow] = await db
          .select({ pathId: lps.pathId })
          .from(lps)
          .where(eq(lps.id, input.stepId));
        if (!stepRow) throw new TRPCError({ code: "NOT_FOUND" });
        const [pathRow] = await db
          .select({ userId: lp.userId })
          .from(lp)
          .where(eq(lp.id, stepRow.pathId));
        if (!pathRow || pathRow.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        const now = new Date();
        await updateLearningPathStep(input.stepId, {
          progressStatus: input.progressStatus,
          completionNotes: input.completionNotes,
          completionEvidence: input.completionEvidence,
          startedAt: input.progressStatus === "in_progress" ? now : undefined,
          completedAt: input.progressStatus === "completed" ? now : undefined,
        });
        // Auto-update path status based on progress
        const allSteps = await getStepsForPath(stepRow.pathId);
        const progress = computePathProgress(allSteps);
        const path = await getLearningPathById(stepRow.pathId);
        if (path) {
          if (progress === 100 && path.status !== "completed") {
            await updateLearningPath(stepRow.pathId, { status: "completed", completedAt: now });
          } else if (progress > 0 && path.status === "assigned") {
            await updateLearningPath(stepRow.pathId, { status: "in_progress", startedAt: now });
          }
        }
        return { success: true, progress };
      }),

    // Admin: exempt a step for a user
    exemptStep: adminProcedure
      .input(z.object({
        stepId: z.number(),
        exemptionReason: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        await updateLearningPathStep(input.stepId, {
          isExempted: true,
          exemptionReason: input.exemptionReason,
          exemptedBy: ctx.user.id,
          exemptedAt: new Date(),
          progressStatus: "exempted",
        });
        return { success: true };
      }),

    // ── T4-2: AI-assisted path generation ───────────────────────────────
    generatePath: adminProcedure
      .input(z.object({
        userId: z.number(),
        groupId: z.number().optional(),
        blueprintId: z.number().optional(),
        pathType: z.enum(["entry", "compliance", "performance_recovery", "progression", "cross_skilling"]).default("progression"),
        targetCompletionDate: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Gather context: gap records for this user, blueprint modules, role info
        const db = await (await import("./db")).getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { competencyGapRecords: cgr, users: usersT, learningPaths: lp } = await import("../drizzle/schema");
        const { eq, and, desc } = await import("drizzle-orm");

        // Get user info
        const userInfo = await (await import("./db")).getUserById(input.userId);
        if (!userInfo) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

        // Get gap records for this user (via their latest report)
        const userReports = await (await import("./db")).getUserReports(input.userId);
        const latestReport = userReports[0];
        const gapRecords = latestReport
          ? await (await import("./db")).getCompetencyGapRecordsByReport(latestReport.report.id)
          : [];

        // Get blueprint modules if blueprintId provided
        let blueprintModules: any[] = [];
        let blueprintTitle = "";
        if (input.blueprintId) {
          const bp = await getCurriculumBlueprintById(input.blueprintId);
          blueprintTitle = bp?.title ?? "";
          blueprintModules = await getCurriculumModulesByBlueprint(input.blueprintId);
        }

        // Build AI prompt
        const gapSummary = gapRecords
          .filter((r: any) => r.gapSeverity === "critical" || r.gapSeverity === "high")
          .slice(0, 10)
          .map((r: any) => `- ${r.questionText ?? "Question"}: actual=${r.actualScore}, target=${r.targetScore}, gap=${r.gapScore} (${r.gapSeverity})`)
          .join("\n");

        const moduleList = blueprintModules
          .map((m: any, i: number) => `${i + 1}. [${m.layer}] ${m.title} (${m.durationHours ?? "?"} hrs, ${m.modality})`)
          .join("\n");

        const prompt = `You are a learning path designer for a Training Needs Analysis system.

Employee: ${userInfo.name ?? "Unknown"}
Role: ${userInfo.jobTitle ?? userInfo.tnaRole ?? "Staff"}
Path Type: ${input.pathType.replace(/_/g, " ")}

Top Competency Gaps:
${gapSummary || "No gap records available — use general progression steps."}

Curriculum Blueprint: ${blueprintTitle || "Not specified"}
Available Modules:
${moduleList || "No blueprint modules — create standalone steps."}

Generate a sequenced learning path with 4–8 steps. Apply these rules:
1. Foundation steps first, then core role, then context, then advancement.
2. Steps addressing critical/high gaps come before moderate/low gaps.
3. If blueprint modules are available, map steps to them.
4. Each step must have a clear, actionable title.

Return ONLY valid JSON in this exact format:
{
  "title": "string (path title for this employee)",
  "description": "string (1-2 sentence rationale)",
  "steps": [
    {
      "title": "string",
      "description": "string",
      "layer": "foundation|core_role|context|advancement",
      "modality": "face_to_face|online|blended|on_the_job|coaching|self_directed",
      "durationHours": number,
      "competencyCategory": "string or null",
      "targetGapLevel": "critical|high|moderate|low",
      "isRequired": true,
      "isMilestone": false,
      "sortOrder": number
    }
  ]
}`;

        const aiResult = await invokeAI({
          messages: [
            { role: "system", content: "You are a learning path designer. Always respond with valid JSON only." },
            { role: "user", content: prompt },
          ],
           response_format: { type: "json_schema", json_schema: { name: "learning_path", strict: true, schema: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, steps: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, layer: { type: "string" }, modality: { type: "string" }, durationHours: { type: "number" }, competencyCategory: { type: "string" }, targetGapLevel: { type: "string" }, isRequired: { type: "boolean" }, isMilestone: { type: "boolean" }, sortOrder: { type: "number" } }, required: ["title", "description", "layer", "modality", "durationHours", "competencyCategory", "targetGapLevel", "isRequired", "isMilestone", "sortOrder"], additionalProperties: false } } }, required: ["title", "description", "steps"], additionalProperties: false } } },
        });
        const raw = typeof aiResult === "string" ? aiResult : "{}";
        let parsed: any;
        try { parsed = JSON.parse(raw); } catch { parsed = { title: "Generated Learning Path", steps: [] }; }

        const pathTitle = parsed.title ?? `Learning Path — ${userInfo.name ?? "Staff"}`;
        const pathDescription = parsed.description ?? null;
        const rawSteps: any[] = Array.isArray(parsed.steps) ? parsed.steps : [];

        // Create the path record
        const validLayers = ["foundation", "core_role", "context", "advancement"];
        const validModalities = ["face_to_face", "online", "blended", "on_the_job", "coaching", "self_directed"];
        const validGapLevels = ["critical", "high", "moderate", "low"];

        const pathId = await createLearningPath({
          userId: input.userId,
          groupId: input.groupId,
          blueprintId: input.blueprintId,
          title: pathTitle,
          description: pathDescription,
          pathType: input.pathType,
          isAiGenerated: true,
          generatedAt: new Date(),
          targetCompletionDate: input.targetCompletionDate ? new Date(input.targetCompletionDate) : null,
          createdBy: ctx.user.id,
        });

        // Create steps
        const steps = rawSteps.map((s: any, i: number) => ({
          pathId,
          title: typeof s.title === "string" ? s.title : `Step ${i + 1}`,
          description: typeof s.description === "string" ? s.description : null,
          layer: validLayers.includes(s.layer) ? s.layer : "core_role" as const,
          modality: validModalities.includes(s.modality) ? s.modality : "blended" as const,
          durationHours: typeof s.durationHours === "number" ? s.durationHours : null,
          competencyCategory: typeof s.competencyCategory === "string" ? s.competencyCategory : null,
          targetGapLevel: validGapLevels.includes(s.targetGapLevel) ? s.targetGapLevel : "high" as const,
          sortOrder: typeof s.sortOrder === "number" ? s.sortOrder : i,
          isRequired: s.isRequired !== false,
          isMilestone: s.isMilestone === true,
          milestoneLabel: typeof s.milestoneLabel === "string" ? s.milestoneLabel : null,
          isAiGenerated: true,
        }));

        for (const step of steps) {
          await createLearningPathStep(step);
        }

        const savedPath = await getLearningPathById(pathId);
        const savedSteps = await getStepsForPath(pathId);
        return { path: savedPath, steps: savedSteps };
      }),
  }),
  // ─── T5 Micro-Credential Engine ───────────────────────────────────────────
  microCredentials: router({
    list: adminProcedure
      .input(z.object({ groupId: z.number().optional(), status: z.string().optional() }))
      .query(async ({ input }) => {
        return getAllMicroCredentials(input);
      }),
    listByUser: adminProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return getMicroCredentialsByUser(input.userId);
      }),
    getById: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getMicroCredentialById(input.id);
      }),
    upsert: adminProcedure
      .input(z.object({
        id: z.number().optional(),
        userId: z.number(),
        groupId: z.number().nullable().optional(),
        title: z.string(),
        clusterLabel: z.string().nullable().optional(),
        workContext: z.string().nullable().optional(),
        qualificationLevel: z.string().nullable().optional(),
        isWorkRelevant: z.boolean().optional(),
        isAssessable: z.boolean().optional(),
        hasModularIntegrity: z.boolean().optional(),
        isStackable: z.boolean().optional(),
        qualificationScore: z.number().nullable().optional(),
        status: z.string().optional(),
        tesdaReferenceId: z.number().nullable().optional(),
        blueprintId: z.number().nullable().optional(),
        learningPathId: z.number().nullable().optional(),
        description: z.string().nullable().optional(),
        isAiGenerated: z.boolean().optional(),
        aiRationale: z.string().nullable().optional(),
        certificateNumber: z.string().nullable().optional(),
        issuingBody: z.string().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        return upsertMicroCredential(input);
      }),
    advanceStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        newStatus: z.enum(["proposed", "approved", "enrolled", "completed", "stacked", "rejected"]),
        approvedBy: z.number().optional(),
        rejectionReason: z.string().optional(),
        certificateNumber: z.string().optional(),
        issuingBody: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return advanceMicroCredentialStatus(input.id, input.newStatus, {
          approvedBy: input.approvedBy ?? ctx.user.id,
          rejectionReason: input.rejectionReason,
          certificateNumber: input.certificateNumber,
          issuingBody: input.issuingBody,
        });
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteMicroCredential(input.id);
        return { success: true };
      }),
    generate: adminProcedure
      .input(z.object({ groupId: z.number(), userId: z.number() }))
      .mutation(async ({ input }) => {
        // Fetch gap records for this user
        const gapRows = await getAllMicroCredentials({ groupId: input.groupId });
        const { invokeLLM } = await import("./_core/llm");
        const prompt = `You are a TESDA-aligned micro-credential recommendation engine.
Analyze the following competency gaps and generate micro-credential proposals.
For each proposal, apply the four qualification rules:
1. Work Relevance: Is the competency directly tied to work performance?
2. Assessability: Can it be objectively measured/assessed?
3. Modular Integrity: Does it form a coherent, self-contained learning unit?
4. Stackability: Can it be stacked with other credentials toward a full qualification?

Generate 3-5 micro-credential proposals using the naming pattern:
[Competency Cluster] + [Work Context] + [Level]

Return JSON array: [{"title": string, "clusterLabel": string, "workContext": string, "qualificationLevel": string, "isWorkRelevant": boolean, "isAssessable": boolean, "hasModularIntegrity": boolean, "isStackable": boolean, "qualificationScore": number, "description": string, "aiRationale": string}]`;
        const response = await invokeLLM({
          messages: [
            { role: "system", content: prompt },
            { role: "user", content: `User ID: ${input.userId}, Group ID: ${input.groupId}. Generate micro-credential recommendations based on typical competency gaps in a TESDA-aligned workforce.` },
          ],
          response_format: { type: "json_schema", json_schema: { name: "micro_credentials", strict: true, schema: { type: "object", properties: { proposals: { type: "array", items: { type: "object", properties: { title: { type: "string" }, clusterLabel: { type: "string" }, workContext: { type: "string" }, qualificationLevel: { type: "string" }, isWorkRelevant: { type: "boolean" }, isAssessable: { type: "boolean" }, hasModularIntegrity: { type: "boolean" }, isStackable: { type: "boolean" }, qualificationScore: { type: "number" }, description: { type: "string" }, aiRationale: { type: "string" } }, required: ["title", "clusterLabel", "workContext", "qualificationLevel", "isWorkRelevant", "isAssessable", "hasModularIntegrity", "isStackable", "qualificationScore", "description", "aiRationale"], additionalProperties: false } } }, required: ["proposals"], additionalProperties: false } } },
        });
        const raw = response?.choices?.[0]?.message?.content ?? "{}";
        const parsed = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));
        const proposals = parsed.proposals ?? [];
        const saved = [];
        for (const p of proposals) {
          const record = await upsertMicroCredential({
            ...p,
            userId: input.userId,
            groupId: input.groupId,
            isAiGenerated: true,
            status: "proposed",
          });
          saved.push(record);
        }
        return saved;
      }),
  }),

  // ─── T5-4 TNA Campaigns ────────────────────────────────────────────────────
  campaigns: router({
    list: adminProcedure.query(async () => getAllCampaigns()),
    getById: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => getCampaignById(input.id)),
    upsert: adminProcedure
      .input(z.object({
        id: z.number().optional(),
        title: z.string(),
        description: z.string().nullable().optional(),
        status: z.string().optional(),
        startDate: z.string().nullable().optional(),
        endDate: z.string().nullable().optional(),
        linkedGroupIds: z.array(z.number()).nullable().optional(),
        linkedBlueprintIds: z.array(z.number()).nullable().optional(),
        reviewNotes: z.string().nullable().optional(),
        finalizationSummary: z.string().nullable().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return upsertCampaign({
          ...input,
          startDate: input.startDate ? new Date(input.startDate) : null,
          endDate: input.endDate ? new Date(input.endDate) : null,
          createdBy: ctx.user.id,
        });
      }),
    advanceStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        newStatus: z.enum(["draft", "open", "closed", "under_review", "finalized"]),
        finalizationSummary: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return advanceCampaignStatus(input.id, input.newStatus, {
          finalizedBy: ctx.user.id,
          finalizationSummary: input.finalizationSummary,
        });
      }),
    refreshStats: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => refreshCampaignStats(input.id)),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteCampaign(input.id);
        return { success: true };
      }),
  }),

  // ─── T5-5 Performance Evidence ─────────────────────────────────────────────
  performanceEvidence: router({
    listByGroup: adminProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ input }) => getPerformanceEvidenceByGroup(input.groupId)),
    listByUser: protectedProcedure
      .input(z.object({ userId: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        const targetId = input.userId ?? ctx.user.id;
        return getPerformanceEvidenceByUser(targetId);
      }),
    upsert: protectedProcedure
      .input(z.object({
        id: z.number().optional(),
        userId: z.number().optional(),
        groupId: z.number().nullable().optional(),
        evidenceType: z.enum(["kpi", "productivity", "quality", "incident", "audit_finding", "peer_feedback", "customer_feedback", "other"]),
        title: z.string(),
        description: z.string().nullable().optional(),
        metricName: z.string().nullable().optional(),
        metricValue: z.number().nullable().optional(),
        metricTarget: z.number().nullable().optional(),
        metricUnit: z.string().nullable().optional(),
        performanceScore: z.number().min(0).max(100).nullable().optional(),
        periodStart: z.string().nullable().optional(),
        periodEnd: z.string().nullable().optional(),
        sourceDocument: z.string().nullable().optional(),
        questionId: z.number().nullable().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return upsertPerformanceEvidence({
          ...input,
          userId: input.userId ?? ctx.user.id,
          periodStart: input.periodStart ? new Date(input.periodStart) : null,
          periodEnd: input.periodEnd ? new Date(input.periodEnd) : null,
          submittedBy: ctx.user.id,
        });
      }),
    verify: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => verifyPerformanceEvidence(input.id, ctx.user.id)),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deletePerformanceEvidence(input.id);
        return { success: true };
      }),
  }),

  // ─── T5-3 Enterprise Workforce Analytics ───────────────────────────────────
  workforceAnalytics: router({
    get: adminProcedure.query(async () => getWorkforceAnalytics()),
  }),
});
export type AppRouter = typeof appRouter;
