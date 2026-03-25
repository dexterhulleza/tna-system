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
          const llmResult = await invokeLLM({
            messages: [
              { role: "system", content: "You are a senior TESDA-aligned Training Needs Analysis specialist. Produce structured, comprehensive TNA reports following the TESDA/NTESDP framework. Write professionally but accessibly for HR managers, training officers, and government officials." },
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
