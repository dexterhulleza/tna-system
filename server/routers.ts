import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import {
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
} from "./db";
import { analyzeGaps, generateRecommendations } from "./tnaEngine";

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

        const statsContext = {
          groupName: group.name,
          groupDescription: group.description,
          totalRespondents: groupReports.length,
          averageScore: Math.round(avgScore),
          gapDistribution,
          avgCategoryScores,
          topGaps,
          sectorName: groupReports[0]?.sector?.name ?? "Multiple Sectors",
        };

        // Generate AI analysis narrative
        const prompt = `You are an expert in Training Needs Analysis (TNA) for technical and vocational education, with deep knowledge of WorldSkills International competency frameworks, the ADDIE instructional design model, Mager's performance analysis approach, and the Philippine TESDA competency-based training system.

Analyze the following TNA group data and write a comprehensive analytical narrative for administrators. The narrative must:

1. **Executive Summary** (2-3 sentences): Summarize the group's overall training needs profile.

2. **Analysis Methodology**: Explain how the TNA was conducted — the five-category framework (Organizational, Job/Task, Individual, Training Feasibility, Evaluation & Success), the Likert-scale scoring approach, and gap calculation methodology (score vs. maximum possible score expressed as a percentage gap).

3. **Theoretical Basis**: Reference the following frameworks as the basis of the analysis:
   - Mager & Pipe (1984) Performance Analysis Model — distinguishing skill deficiencies from motivational/environmental issues
   - Boydell (1976) Three-Level TNA Model — organizational, job/task, and individual analysis levels
   - McGhee & Thayer (1961) Three-Level Training Needs Assessment — organizational, task, and person analysis
   - ADDIE Instructional Design Model — Analysis phase as the foundation for training design
   - Philippine TESDA Competency-Based Training (CBT) framework — competency standards alignment

4. **Group-Specific Findings**: Based on the data below, identify the most critical training gaps, patterns across the group, and category-level insights.

5. **Priority Recommendations**: Suggest 3-5 specific, actionable training interventions with rationale, referencing best practices from the literature.

6. **Conclusion**: Summarize the urgency and expected impact of addressing the identified gaps.

GROUP DATA:
${JSON.stringify(statsContext, null, 2)}

Write in a professional, academic tone suitable for a government or institutional training report. Use specific numbers from the data. Format with clear headings using markdown.`;

        let aiAnalysis: string | null = null;
        try {
          const llmResult = await invokeLLM({
            messages: [
              { role: "system", content: "You are an expert TNA analyst writing a formal institutional report." },
              { role: "user", content: prompt },
            ],
          });
          aiAnalysis = (llmResult.choices?.[0]?.message?.content as string) ?? null;
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
  }),

  // ─── Sectors ───────────────────────────────────────────────────────────────
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
});

export type AppRouter = typeof appRouter;
