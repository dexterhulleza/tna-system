import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import {
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
        // Generate AI analysis — plain-language, action-oriented training plan
        const prompt = `You are a practical training advisor helping an organization understand what training they need and why. Your job is to write a clear, easy-to-understand Training Action Plan based on survey results.

IMPORTANT WRITING RULES:
- Write as if explaining to a manager or HR officer who is NOT a training expert
- Use simple, everyday language — avoid jargon and academic terms
- Be specific: use actual numbers, percentages, and topic names from the data
- Be direct: tell them exactly what to do, not just what was observed
- Use short paragraphs and bullet points for easy reading
- If data is limited, say so honestly and suggest what additional info is needed

---
SURVEY DATA:
${JSON.stringify(statsContext, null, 2)}
---

Write the Training Action Plan using EXACTLY these sections in order:

## 📋 Quick Summary
In 3-5 plain sentences: Who took this survey, what sector/group, how many people, and the single most important training finding. Make it something a busy executive can read in 30 seconds.

## 🎯 What This Survey Is About
Explain the purpose of this TNA in simple terms:
- What organization or group is this for?
- What were they trying to find out?
- What business goals or objectives are they trying to achieve?
- Who are the participants (their roles, experience level)?

## ⚠️ What Happens If We Do Nothing
List 3-5 specific, realistic consequences of NOT providing training. Be concrete — mention productivity loss, compliance risks, competitive disadvantage, staff turnover, safety issues, or missed opportunities. Make it feel urgent but honest.

## 📚 Recommended Training Topics
List each recommended training topic as a clear, named course or program. For each topic:
**Topic Title:** [Specific, descriptive name like "Advanced 3D Animation Pipeline for Production" not just "Animation Training"]
- **Why this is needed:** One sentence explaining the gap this fills
- **Who should attend:** Specific roles or departments
- **Priority level:** 🔴 Urgent (do within 1-3 months) / 🟡 Important (3-6 months) / 🟢 Plan ahead (6-12 months)
- **Suggested format:** Face-to-face workshop / Online self-paced / Blended / On-the-job coaching
- **Estimated duration:** (e.g., 2 days, 40 hours, 3-month program)

## 💰 Training Investment Guide
Provide a practical investment overview:
- **Budget range estimate:** Low / Medium / High investment (explain what factors drive cost)
- **Suggested schedule:** Propose a realistic training calendar (e.g., Q1: Topic A, Q2: Topic B)
- **Quick wins:** Which training can be done cheaply and quickly with high impact?
- **Long-term investments:** Which training requires more budget but builds lasting capability?
- **Cost-saving tips:** Any ways to reduce cost (e.g., internal trainers, online platforms, batch training)

## 🏆 What Skills Will Be Gained
For each major training area, list the specific competencies participants will have AFTER training:
- Use action verbs: "Will be able to...", "Can now...", "Knows how to..."
- Group by skill category (Technical Skills, Soft Skills, Leadership, Compliance, etc.)
- Connect each skill to a real job task or business outcome

## 📈 Expected Results After Training
What will improve in the organization after training is completed? Be specific:
- Performance improvements (e.g., "Reduce production errors by an estimated X%")
- Efficiency gains (e.g., "Faster project completion, less rework")
- Quality improvements
- Employee confidence and morale
- Compliance or certification achievements
- Business goal progress (connect back to stated objectives)

## 🎓 Learning Outcomes Per Training Area
For each recommended training topic, state 3-5 clear learning outcomes using this format:
"After completing [Topic Name], participants will be able to: [specific, measurable outcome]"
Keep these practical and job-relevant, not theoretical.

## 📅 Suggested Training Schedule
Provide a simple 12-month training roadmap:
- **Months 1-3 (Urgent):** [List topics]
- **Months 4-6 (Important):** [List topics]
- **Months 7-12 (Development):** [List topics]
Include any prerequisites (e.g., "Topic B should come after Topic A")

## 👥 Who Should Attend What
Create a simple table or list showing:
- Which training is for ALL staff
- Which training is for specific roles or departments
- Which training is for managers/supervisors only
- Which training is optional but recommended

## 🔑 Key Takeaways for Decision-Makers
End with 5-7 bullet points that a CEO, HR Director, or Department Head can act on immediately. Each bullet should be one clear, actionable sentence starting with a verb (e.g., "Allocate budget for...", "Schedule...", "Partner with...", "Prioritize...").

Write in a warm, professional tone — like a trusted advisor giving honest advice, not a formal academic report. Use the actual data numbers wherever possible.`

        let aiAnalysis: string | null = null;
        try {
          const llmResult = await invokeLLM({
            messages: [
              { role: "system", content: "You are a practical training advisor who writes clear, action-oriented training plans for non-specialist audiences. You use plain language, specific recommendations, and always focus on what the organization should DO next." },
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

          const systemPrompt = `You are an expert Training Needs Analysis (TNA) specialist with deep knowledge of competency frameworks, adult learning theory, and workforce development. Your role is to generate targeted, practical survey questions that will effectively identify training gaps and development needs.

You follow evidence-based TNA methodologies including:
- McGhee & Thayer's Three-Level Analysis (Organizational, Job/Task, Individual)
- Mager & Pipe's Performance Analysis model
- Boydell's Training Needs Identification framework
- ADDIE instructional design model
- TESDA Competency-Based Training (CBT) standards

Generate survey questions that are:
1. Specific and measurable
2. Aligned with the stated business objectives and competency gaps
3. Appropriate for the target participant roles
4. Grounded in the industry context provided
5. Balanced across TNA categories (organizational, job/task, individual, training feasibility, evaluation)

Return ONLY a valid JSON array of question objects. Each object must have exactly these fields:
- questionText: string (the actual survey question)
- category: one of "organizational"|"job_task"|"individual"|"training_feasibility"|"evaluation_success"|"custom"
- questionType: one of "rating"|"yes_no"|"scale"|"text"|"multiple_choice"
- rationale: string (brief explanation of why this question is relevant based on the context)
- accepted: boolean (always set to false initially)`;

          const userPrompt = `Based on the following TNA survey configuration, generate 20-25 targeted survey questions that will help identify training needs and competency gaps.

${contextSummary}

Generate questions that directly address the stated objectives, business goals, and competency areas. Distribute questions across all relevant TNA categories. For rating/scale questions, they will use a 1-5 scale. Focus on questions that will surface actionable training insights.`;

          const response = await invokeLLM({
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

          const content = response.choices[0].message.content as string;
          const parsed = JSON.parse(content) as { questions: Array<{ questionText: string; category: string; questionType: string; rationale: string; accepted: boolean }> };
          const generatedQuestions = parsed.questions;

          await saveAiGeneratedQuestions(config.id, generatedQuestions);
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
});
export type AppRouter = typeof appRouter;
