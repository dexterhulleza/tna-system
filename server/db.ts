import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  adminPermissions,
  aiSettings,
  competencyGapRecords,
  groupAnalysisSections,
  prioritizationMatrix,
  questions,
  recommendations,
  reports,
  scoringWeights,
  sectors,
  skillAreas,
  surveyConfigurations,
  surveyGroups,
  surveyResponses,
  surveys,
  targetProficiencies,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
    values.tnaRole = "admin";
    updateSet.tnaRole = "admin";
    values.adminLevel = "super_admin";
    updateSet.adminLevel = "super_admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUserProfile(
  id: number,
  data: { tnaRole?: string; adminLevel?: string; organization?: string; jobTitle?: string; role?: string }
) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data as any).where(eq(users.id, id));
}

// ─── Survey Groups ────────────────────────────────────────────────────────────
export async function getAllSurveyGroups(activeOnly = true) {
  const db = await getDb();
  if (!db) return [];
  const conditions = activeOnly ? [eq(surveyGroups.isActive, true)] : [];
  return db
    .select()
    .from(surveyGroups)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(surveyGroups.sortOrder, surveyGroups.name);
}

export async function getSurveyGroupById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(surveyGroups).where(eq(surveyGroups.id, id)).limit(1);
  return result[0];
}

export async function upsertSurveyGroup(data: {
  id?: number;
  name: string;
  code: string;
  description?: string;
  sectorId?: number | null;
  isActive?: boolean;
  sortOrder?: number;
  expectedCount?: number;
  createdBy?: number;
}) {
  const db = await getDb();
  if (!db) return;
  if (data.id) {
    await db.update(surveyGroups).set(data as any).where(eq(surveyGroups.id, data.id));
    return data.id;
  } else {
    const result = await db.insert(surveyGroups).values(data as any);
    return (result[0] as any).insertId as number;
  }
}

export async function deleteSurveyGroup(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(surveyGroups).set({ isActive: false }).where(eq(surveyGroups.id, id));
}

// ─── Sectors ──────────────────────────────────────────────────────────────────
export async function getAllSectors(activeOnly = true) {
  const db = await getDb();
  if (!db) return [];
  const conditions = activeOnly ? [eq(sectors.isActive, true)] : [];
  return db
    .select()
    .from(sectors)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(sectors.sortOrder, sectors.name);
}

export async function getSectorById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sectors).where(eq(sectors.id, id)).limit(1);
  return result[0];
}

export async function upsertSector(data: {
  id?: number;
  name: string;
  code: string;
  description?: string;
  iconName?: string;
  colorClass?: string;
  isActive?: boolean;
  sortOrder?: number;
}) {
  const db = await getDb();
  if (!db) return;
  if (data.id) {
    await db.update(sectors).set(data as any).where(eq(sectors.id, data.id));
    return data.id;
  } else {
    const result = await db.insert(sectors).values(data as any);
    return (result[0] as any).insertId;
  }
}

export async function deleteSector(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(sectors).set({ isActive: false }).where(eq(sectors.id, id));
}

// ─── Skill Areas ──────────────────────────────────────────────────────────────
export async function getSkillAreasBySector(sectorId: number, activeOnly = true) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(skillAreas.sectorId, sectorId)];
  if (activeOnly) conditions.push(eq(skillAreas.isActive, true));
  return db.select().from(skillAreas).where(and(...conditions)).orderBy(skillAreas.sortOrder, skillAreas.name);
}

export async function getSkillAreaById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(skillAreas).where(eq(skillAreas.id, id)).limit(1);
  return result[0];
}

export async function upsertSkillArea(data: {
  id?: number;
  sectorId: number;
  name: string;
  code: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}) {
  const db = await getDb();
  if (!db) return;
  if (data.id) {
    await db.update(skillAreas).set(data as any).where(eq(skillAreas.id, data.id));
    return data.id;
  } else {
    const result = await db.insert(skillAreas).values(data as any);
    return (result[0] as any).insertId;
  }
}

export async function deleteSkillArea(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(skillAreas).set({ isActive: false }).where(eq(skillAreas.id, id));
}

// ─── Questions ────────────────────────────────────────────────────────────────
export async function getQuestions(filters: {
  sectorId?: number | null;
  skillAreaId?: number | null;
  groupId?: number | null;
  category?: string;
  activeOnly?: boolean;
  adminAll?: boolean; // When true: bypass group restriction and show all questions
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions: any[] = [];
  if (filters.activeOnly !== false) conditions.push(eq(questions.isActive, true));
  if (filters.category) conditions.push(eq(questions.category, filters.category as any));

  // Match questions that apply to this sector OR are global (null sectorId)
  if (filters.sectorId !== undefined) {
    if (filters.sectorId === null) {
      conditions.push(isNull(questions.sectorId));
    } else {
      conditions.push(or(eq(questions.sectorId, filters.sectorId), isNull(questions.sectorId)));
    }
  }

  // Match questions that apply to this skill area OR are global (null skillAreaId)
  if (filters.skillAreaId !== undefined) {
    if (filters.skillAreaId === null) {
      conditions.push(isNull(questions.skillAreaId));
    } else {
      conditions.push(or(eq(questions.skillAreaId, filters.skillAreaId), isNull(questions.skillAreaId)));
    }
  }

  // Group-specific questions filter
  // When groupId is explicitly provided: show questions for that group + global (null)
  // When groupId is undefined (admin "All Groups" view): show ALL questions regardless of group
  // When groupId is null ("No Group" filter): show only global questions (null groupId)
  if (filters.groupId !== undefined && filters.groupId !== null) {
    // Specific group selected: show group-specific + global questions
    if (!filters.adminAll) {
      conditions.push(or(eq(questions.groupId, filters.groupId), isNull(questions.groupId)));
    } else {
      // Admin filtering by a specific group: show only that group's questions
      conditions.push(eq(questions.groupId, filters.groupId));
    }
  } else if (filters.groupId === null && !filters.adminAll) {
    // Explicit null filter (survey context): only global questions
    conditions.push(isNull(questions.groupId));
  }
  // If filters.adminAll is true and groupId is undefined: no group filter — show everything

  return db
    .select()
    .from(questions)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(questions.category, questions.sortOrder, questions.id);
}

export async function getQuestionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(questions).where(eq(questions.id, id)).limit(1);
  return result[0];
}

export async function upsertQuestion(data: {
  id?: number;
  sectorId?: number | null;
  skillAreaId?: number | null;
  groupId?: number | null;
  category: string;
  customCategory?: string;
  targetRoles?: string[];
  questionText: string;
  questionType: string;
  options?: string[] | null;
  minValue?: number;
  maxValue?: number;
  isRequired?: boolean;
  isActive?: boolean;
  sortOrder?: number;
  helpText?: string;
  weight?: number;
  createdBy?: number;
}) {
  const db = await getDb();
  if (!db) return;
  if (data.id) {
    await db.update(questions).set(data as any).where(eq(questions.id, data.id));
    return data.id;
  } else {
    const result = await db.insert(questions).values(data as any);
    return (result[0] as any).insertId;
  }
}

export async function deleteQuestion(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(questions).set({ isActive: false }).where(eq(questions.id, id));
}

export async function bulkDeactivateQuestions(ids: number[]) {
  const db = await getDb();
  if (!db || ids.length === 0) return 0;
  await db.update(questions).set({ isActive: false }).where(inArray(questions.id, ids));
  return ids.length;
}

export async function bulkDeleteQuestions(ids: number[]) {
  const db = await getDb();
  if (!db || ids.length === 0) return 0;
  await db.delete(questions).where(inArray(questions.id, ids));
  return ids.length;
}

// ─── Surveys ──────────────────────────────────────────────────────────────────
export async function createSurvey(data: {
  userId: number;
  sectorId: number;
  skillAreaId?: number | null;
  groupId?: number | null;
  conductedWith?: string;
  conductedWithName?: string;
  respondentName?: string;
  respondentAge?: number;
  respondentGender?: string;
  respondentPosition?: string;
  respondentCompany?: string;
  respondentYearsExperience?: number;
  respondentHighestEducation?: string;
}) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(surveys).values({ ...data, status: "in_progress" } as any);
  return (result[0] as any).insertId as number;
}

export async function updateSurveyRespondentInfo(
  id: number,
  data: {
    respondentName?: string;
    respondentAge?: number;
    respondentGender?: string;
    respondentPosition?: string;
    respondentCompany?: string;
    respondentYearsExperience?: number;
    respondentHighestEducation?: string;
  }
) {
  const db = await getDb();
  if (!db) return;
  await db.update(surveys).set(data as any).where(eq(surveys.id, id));
}

export async function getSurveyById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(surveys).where(eq(surveys.id, id)).limit(1);
  return result[0];
}

export async function getUserSurveys(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      survey: surveys,
      sector: sectors,
      skillArea: skillAreas,
      group: surveyGroups,
    })
    .from(surveys)
    .leftJoin(sectors, eq(surveys.sectorId, sectors.id))
    .leftJoin(skillAreas, eq(surveys.skillAreaId, skillAreas.id))
    .leftJoin(surveyGroups, eq(surveys.groupId, surveyGroups.id))
    .where(eq(surveys.userId, userId))
    .orderBy(desc(surveys.createdAt));
}

export async function getAllSurveys() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      survey: surveys,
      user: users,
      sector: sectors,
      group: surveyGroups,
    })
    .from(surveys)
    .leftJoin(users, eq(surveys.userId, users.id))
    .leftJoin(sectors, eq(surveys.sectorId, sectors.id))
    .leftJoin(surveyGroups, eq(surveys.groupId, surveyGroups.id))
    .orderBy(desc(surveys.createdAt));
}

export async function updateSurveyStatus(
  id: number,
  status: "in_progress" | "completed" | "abandoned",
  currentCategory?: string
) {
  const db = await getDb();
  if (!db) return;
  const updateData: any = { status, currentCategory };
  if (status === "completed") updateData.completedAt = new Date();
  await db.update(surveys).set(updateData).where(eq(surveys.id, id));
}

// ─── Survey Responses ─────────────────────────────────────────────────────────
export async function saveSurveyResponses(
  surveyId: number,
  responses: Array<{
    questionId: number;
    responseText?: string;
    responseValue?: number;
    responseOptions?: string[];
  }>
) {
  const db = await getDb();
  if (!db) return;

  for (const resp of responses) {
    const existing = await db
      .select()
      .from(surveyResponses)
      .where(and(eq(surveyResponses.surveyId, surveyId), eq(surveyResponses.questionId, resp.questionId)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(surveyResponses)
        .set({
          responseText: resp.responseText ?? null,
          responseValue: resp.responseValue ?? null,
          responseOptions: resp.responseOptions ?? null,
        } as any)
        .where(eq(surveyResponses.id, existing[0].id));
    } else {
      await db.insert(surveyResponses).values({
        surveyId,
        questionId: resp.questionId,
        responseText: resp.responseText ?? null,
        responseValue: resp.responseValue ?? null,
        responseOptions: resp.responseOptions ?? null,
      } as any);
    }
  }
}

export async function getSurveyResponses(surveyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      response: surveyResponses,
      question: questions,
    })
    .from(surveyResponses)
    .leftJoin(questions, eq(surveyResponses.questionId, questions.id))
    .where(eq(surveyResponses.surveyId, surveyId));
}

// ─── Reports ──────────────────────────────────────────────────────────────────
export async function createReport(data: {
  surveyId: number;
  userId: number;
  sectorId: number;
  skillAreaId?: number | null;
  overallScore: number;
  gapLevel: string;
  categoryScores: Record<string, number>;
  identifiedGaps: any[];
  summary: string;
}) {
  const db = await getDb();
  if (!db) return null;

  // Delete existing report for this survey if any
  await db.delete(reports).where(eq(reports.surveyId, data.surveyId));

  const result = await db.insert(reports).values(data as any);
  return (result[0] as any).insertId as number;
}

export async function getReportBySurveyId(surveyId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({
      report: reports,
      sector: sectors,
      skillArea: skillAreas,
    })
    .from(reports)
    .leftJoin(sectors, eq(reports.sectorId, sectors.id))
    .leftJoin(skillAreas, eq(reports.skillAreaId, skillAreas.id))
    .where(eq(reports.surveyId, surveyId))
    .limit(1);
  return result[0];
}

export async function getReportById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({
      report: reports,
      sector: sectors,
      skillArea: skillAreas,
    })
    .from(reports)
    .leftJoin(sectors, eq(reports.sectorId, sectors.id))
    .leftJoin(skillAreas, eq(reports.skillAreaId, skillAreas.id))
    .where(eq(reports.id, id))
    .limit(1);
  return result[0];
}

export async function getUserReports(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      report: reports,
      survey: surveys,
      sector: sectors,
      skillArea: skillAreas,
    })
    .from(reports)
    .leftJoin(surveys, eq(reports.surveyId, surveys.id))
    .leftJoin(sectors, eq(reports.sectorId, sectors.id))
    .leftJoin(skillAreas, eq(reports.skillAreaId, skillAreas.id))
    .where(eq(reports.userId, userId))
    .orderBy(desc(reports.createdAt));
}

export async function getAllReports() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      report: reports,
      user: users,
      sector: sectors,
      survey: surveys,
      group: surveyGroups,
    })
    .from(reports)
    .leftJoin(users, eq(reports.userId, users.id))
    .leftJoin(sectors, eq(reports.sectorId, sectors.id))
    .leftJoin(surveys, eq(reports.surveyId, surveys.id))
    .leftJoin(surveyGroups, eq(surveys.groupId, surveyGroups.id))
    .orderBy(desc(reports.createdAt));
}

export async function getReportsByGroup(groupId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      report: reports,
      user: users,
      sector: sectors,
      survey: surveys,
    })
    .from(reports)
    .leftJoin(users, eq(reports.userId, users.id))
    .leftJoin(sectors, eq(reports.sectorId, sectors.id))
    .leftJoin(surveys, eq(reports.surveyId, surveys.id))
    .where(eq(surveys.groupId, groupId))
    .orderBy(desc(reports.createdAt));
}

// ─── Recommendations ──────────────────────────────────────────────────────────
export async function saveRecommendations(
  reportId: number,
  recs: Array<{
    priority: string;
    category?: string;
    title: string;
    description?: string;
    trainingType?: string;
    estimatedDuration?: string;
    estimatedCost?: string;
    sortOrder?: number;
  }>
) {
  const db = await getDb();
  if (!db) return;
  await db.delete(recommendations).where(eq(recommendations.reportId, reportId));
  if (recs.length === 0) return;
  await db.insert(recommendations).values(recs.map((r, i) => ({ ...r, reportId, sortOrder: i } as any)));
}

export async function getRecommendationsByReportId(reportId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(recommendations)
    .where(eq(recommendations.reportId, reportId))
    .orderBy(recommendations.sortOrder);
}

// ─── Admin Permissions ────────────────────────────────────────────────────────
export async function getAdminPermissions(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(adminPermissions).where(eq(adminPermissions.userId, userId)).limit(1);
  return result[0];
}

export async function upsertAdminPermissions(
  userId: number,
  perms: {
    canManageUsers?: boolean;
    canManageSectors?: boolean;
    canManageQuestions?: boolean;
    canViewAllReports?: boolean;
    canExportData?: boolean;
    assignedSectorIds?: number[];
  }
) {
  const db = await getDb();
  if (!db) return;
  const existing = await getAdminPermissions(userId);
  if (existing) {
    await db.update(adminPermissions).set(perms as any).where(eq(adminPermissions.userId, userId));
  } else {
    await db.insert(adminPermissions).values({ userId, ...perms } as any);
  }
}

// ─── Stats ────────────────────────────────────────────────────────────────────
export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return { totalUsers: 0, totalSurveys: 0, completedSurveys: 0, totalReports: 0, totalGroups: 0 };

  const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
  const [surveyCount] = await db.select({ count: sql<number>`count(*)` }).from(surveys);
  const [completedCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(surveys)
    .where(eq(surveys.status, "completed"));
  const [reportCount] = await db.select({ count: sql<number>`count(*)` }).from(reports);
  const [groupCount] = await db.select({ count: sql<number>`count(*)` }).from(surveyGroups).where(eq(surveyGroups.isActive, true));

  return {
    totalUsers: Number(userCount?.count ?? 0),
    totalSurveys: Number(surveyCount?.count ?? 0),
    completedSurveys: Number(completedCount?.count ?? 0),
    totalReports: Number(reportCount?.count ?? 0),
    totalGroups: Number(groupCount?.count ?? 0),
  };
}

// ─── Survey Configurations ────────────────────────────────────────────────────
export async function getSurveyConfig(groupId: number) {
  const db = await getDb();
  if (!db) return null;
  const [config] = await db
    .select()
    .from(surveyConfigurations)
    .where(eq(surveyConfigurations.groupId, groupId))
    .limit(1);
  return config ?? null;
}

export async function upsertSurveyConfig(data: {
  groupId: number;
  createdBy: number;
  surveyTitle?: string;
  surveyPurpose?: string;
  surveyObjectives?: string[];
  organizationName?: string;
  industryContext?: string;
  businessGoals?: string[];
  targetParticipants?: string;
  participantRoles?: string[];
  expectedParticipantCount?: number;
  targetCompetencies?: string[];
  knownSkillGaps?: string;
  priorityAreas?: string[];
  surveyStartDate?: string;
  surveyEndDate?: string;
  additionalNotes?: string;
  regulatoryRequirements?: string;
}) {
  const db = await getDb();
  if (!db) return null;
  const existing = await getSurveyConfig(data.groupId);
  if (existing) {
    await db
      .update(surveyConfigurations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(surveyConfigurations.id, existing.id));
    return getSurveyConfig(data.groupId);
  } else {
    await db.insert(surveyConfigurations).values(data);
    return getSurveyConfig(data.groupId);
  }
}

export async function saveAiGeneratedQuestions(
  configId: number,
  questions: Array<{
    questionText: string;
    category: string;
    questionType: string;
    rationale: string;
    accepted: boolean;
  }>
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(surveyConfigurations)
    .set({ aiGeneratedQuestions: questions, aiGeneratedAt: new Date() })
    .where(eq(surveyConfigurations.id, configId));
}

// ─── AI Settings ──────────────────────────────────────────────────────────────
export async function getAiSettings() {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(aiSettings).limit(1);
  return rows[0] ?? null;
}

export async function upsertAiSettings(data: {
  provider: string;
  apiKey: string | null;
  model: string;
  baseUrl: string | null;
  updatedBy: number;
}) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(aiSettings).limit(1);
  if (existing.length > 0) {
    await db
      .update(aiSettings)
      .set({
        provider: data.provider,
        apiKey: data.apiKey,
        model: data.model,
        baseUrl: data.baseUrl,
        updatedBy: data.updatedBy,
      })
      .where(eq(aiSettings.id, existing[0].id));
  } else {
    await db.insert(aiSettings).values({
      provider: data.provider,
      apiKey: data.apiKey,
      model: data.model,
      baseUrl: data.baseUrl,
      isActive: true,
      updatedBy: data.updatedBy,
    });
  }
}

// ─── Group Analysis Sections ──────────────────────────────────────────────────
export async function getGroupAnalysisSections(groupId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(groupAnalysisSections)
    .where(eq(groupAnalysisSections.groupId, groupId))
    .orderBy(groupAnalysisSections.sectionKey);
}

export async function getGroupAnalysisSection(groupId: number, sectionKey: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(groupAnalysisSections)
    .where(
      and(
        eq(groupAnalysisSections.groupId, groupId),
        eq(groupAnalysisSections.sectionKey, sectionKey)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertGroupAnalysisSection(data: {
  groupId: number;
  sectionKey: string;
  sectionTitle: string;
  content: string;
  modelUsed?: string | null;
  generatedBy?: number | null;
}) {
  const db = await getDb();
  if (!db) return;
  const existing = await getGroupAnalysisSection(data.groupId, data.sectionKey);
  if (existing) {
    await db
      .update(groupAnalysisSections)
      .set({
        sectionTitle: data.sectionTitle,
        content: data.content,
        modelUsed: data.modelUsed ?? null,
        generatedBy: data.generatedBy ?? null,
      })
      .where(eq(groupAnalysisSections.id, existing.id));
  } else {
    await db.insert(groupAnalysisSections).values({
      groupId: data.groupId,
      sectionKey: data.sectionKey,
      sectionTitle: data.sectionTitle,
      content: data.content,
      modelUsed: data.modelUsed ?? null,
      generatedBy: data.generatedBy ?? null,
    });
  }
}

export async function deleteGroupAnalysisSection(groupId: number, sectionKey: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(groupAnalysisSections)
    .where(
      and(
        eq(groupAnalysisSections.groupId, groupId),
        eq(groupAnalysisSections.sectionKey, sectionKey)
      )
    );
}

/**
 * Compute a free (no-AI) group summary by aggregating individual report data.
 * Returns rich statistics coherent with individual reports in the group.
 */
export async function computeGroupSummary(groupId: number) {
  const db = await getDb();
  if (!db) return null;

  const groupReports = await getReportsByGroup(groupId);
  if (groupReports.length === 0) return null;

  const scores = groupReports.map((r) => r.report.overallScore ?? 0);
  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);

  // Score distribution buckets
  const scoreDistribution = {
    "0-20": scores.filter((s) => s <= 20).length,
    "21-40": scores.filter((s) => s > 20 && s <= 40).length,
    "41-60": scores.filter((s) => s > 40 && s <= 60).length,
    "61-80": scores.filter((s) => s > 60 && s <= 80).length,
    "81-100": scores.filter((s) => s > 80).length,
  };

  // Gap level distribution
  const gapLevels = groupReports.map((r) => r.report.gapLevel ?? "none");
  const gapDistribution = gapLevels.reduce<Record<string, number>>((acc, g) => {
    acc[g] = (acc[g] ?? 0) + 1;
    return acc;
  }, {});

  // Category scores aggregation
  const categoryTotals: Record<string, { sum: number; count: number; scores: number[] }> = {};
  for (const r of groupReports) {
    const cs = r.report.categoryScores as Record<string, number> | null;
    if (cs) {
      for (const [cat, score] of Object.entries(cs)) {
        if (!categoryTotals[cat]) categoryTotals[cat] = { sum: 0, count: 0, scores: [] };
        categoryTotals[cat].sum += score;
        categoryTotals[cat].count += 1;
        categoryTotals[cat].scores.push(score);
      }
    }
  }
  const avgCategoryScores = Object.fromEntries(
    Object.entries(categoryTotals).map(([cat, { sum, count }]) => [cat, Math.round(sum / count)])
  );
  // Weakest categories (below 60%)
  const weakCategories = Object.entries(avgCategoryScores)
    .filter(([, score]) => score < 60)
    .sort(([, a], [, b]) => a - b)
    .map(([cat, score]) => ({ category: cat, avgScore: score }));

  // Top gaps across all individuals
  const allGaps: Array<{ category: string; questionText: string; gapPercentage: number }> = [];
  for (const r of groupReports) {
    const gaps = r.report.identifiedGaps as any[] | null;
    if (gaps) {
      allGaps.push(
        ...gaps.map((g: any) => ({
          category: g.category,
          questionText: g.questionText,
          gapPercentage: g.gapPercentage,
        }))
      );
    }
  }
  const gapFrequency: Record<string, { count: number; category: string; totalGap: number }> = {};
  for (const gap of allGaps) {
    const key = gap.questionText;
    if (!gapFrequency[key]) gapFrequency[key] = { count: 0, category: gap.category, totalGap: 0 };
    gapFrequency[key].count += 1;
    gapFrequency[key].totalGap += gap.gapPercentage;
  }
  const topGaps = Object.entries(gapFrequency)
    .map(([text, data]) => ({
      questionText: text,
      category: data.category,
      affectedCount: data.count,
      affectedPct: Math.round((data.count / groupReports.length) * 100),
      avgGapPct: Math.round(data.totalGap / data.count),
    }))
    .sort((a, b) => b.affectedCount - a.affectedCount || b.avgGapPct - a.avgGapPct)
    .slice(0, 10);

  // Individual respondent summary (anonymized for group view)
  const respondentSummaries = groupReports.map((r) => ({
    name: r.user?.name ?? "Anonymous",
    overallScore: r.report.overallScore ?? 0,
    gapLevel: r.report.gapLevel ?? "none",
    sector: r.sector?.name ?? "Unknown",
    completedAt: r.report.createdAt,
  }));

  // Sector distribution
  const sectorCounts: Record<string, number> = {};
  for (const r of groupReports) {
    const s = r.sector?.name ?? "Unknown";
    sectorCounts[s] = (sectorCounts[s] ?? 0) + 1;
  }

  return {
    totalRespondents: groupReports.length,
    avgScore,
    minScore,
    maxScore,
    scoreDistribution,
    gapDistribution,
    avgCategoryScores,
    weakCategories,
    topGaps,
    respondentSummaries,
    sectorDistribution: sectorCounts,
    primarySector: groupReports[0]?.sector?.name ?? "Multiple Sectors",
  };
}

// ─── Scoring Weights (T1-6) ───────────────────────────────────────────────────
export async function getScoringWeights() {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(scoringWeights).orderBy(desc(scoringWeights.updatedAt)).limit(1);
  return rows[0] ?? null;
}

export async function upsertScoringWeights(data: {
  selfWeight: number;
  supervisorWeight: number;
  kpiWeight: number;
  requireSupervisorValidation: boolean;
  fallbackToSelfOnly: boolean;
  updatedBy: number;
}) {
  const db = await getDb();
  if (!db) return null;
  const existing = await getScoringWeights();
  if (existing) {
    await db.update(scoringWeights)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(scoringWeights.id, existing.id));
    return { ...existing, ...data };
  } else {
    const [result] = await db.insert(scoringWeights).values(data);
    return { id: (result as any).insertId, ...data };
  }
}

/**
 * Compute the weighted score for a single response.
 * Falls back to self-only if supervisor hasn't validated and fallbackToSelfOnly is true.
 */
export function computeWeightedScore(
  selfScore: number | null | undefined,
  supervisorScore: number | null | undefined,
  kpiScore: number | null | undefined,
  weights: { selfWeight: number; supervisorWeight: number; kpiWeight: number; fallbackToSelfOnly: boolean }
): number | null {
  if (selfScore == null) return null;
  const hasSupervisor = supervisorScore != null;
  const hasKpi = kpiScore != null;
  if (!hasSupervisor && !hasKpi) {
    // Only self score available
    return selfScore;
  }
  if (!hasSupervisor && weights.fallbackToSelfOnly) {
    // Supervisor not yet validated, fall back to self-only
    return selfScore;
  }
  // Compute weighted average with available sources
  let totalWeight = weights.selfWeight;
  let weightedSum = selfScore * weights.selfWeight;
  if (hasSupervisor) {
    totalWeight += weights.supervisorWeight;
    weightedSum += supervisorScore! * weights.supervisorWeight;
  }
  if (hasKpi) {
    totalWeight += weights.kpiWeight;
    weightedSum += kpiScore! * weights.kpiWeight;
  }
  return totalWeight > 0 ? weightedSum / totalWeight : selfScore;
}

// ─── Target Proficiency Levels (T2-1) ────────────────────────────────────────
export async function getTargetProficiencies(filters: {
  questionId?: number;
  sectorId?: number;
  skillAreaId?: number;
  tnaRole?: string;
  activeOnly?: boolean;
} = {}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters.activeOnly !== false) conditions.push(eq(targetProficiencies.isActive, true));
  if (filters.questionId != null) conditions.push(eq(targetProficiencies.questionId, filters.questionId));
  if (filters.sectorId != null) conditions.push(eq(targetProficiencies.sectorId, filters.sectorId));
  if (filters.skillAreaId != null) conditions.push(eq(targetProficiencies.skillAreaId, filters.skillAreaId));
  if (filters.tnaRole) conditions.push(eq(targetProficiencies.tnaRole, filters.tnaRole));
  return db
    .select({ tp: targetProficiencies, question: questions })
    .from(targetProficiencies)
    .leftJoin(questions, eq(targetProficiencies.questionId, questions.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(targetProficiencies.questionId);
}

export async function getTargetProficiencyById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(targetProficiencies).where(eq(targetProficiencies.id, id));
  return row ?? null;
}

/** Resolve the best-matching target score for a question given context.
 *  Priority: sector+role > sector > role > global > default 80 */
export async function resolveTargetScore(
  questionId: number,
  sectorId?: number | null,
  tnaRole?: string | null
): Promise<{ targetScore: number; usedDefaultTarget: boolean }> {
  const db = await getDb();
  if (!db) return { targetScore: 80, usedDefaultTarget: true };
  const rows = await db
    .select()
    .from(targetProficiencies)
    .where(and(eq(targetProficiencies.questionId, questionId), eq(targetProficiencies.isActive, true)));
  if (rows.length === 0) return { targetScore: 80, usedDefaultTarget: true };
  // Score matching specificity
  const score = (row: typeof rows[0]) => {
    let s = 0;
    if (sectorId && row.sectorId === sectorId) s += 10;
    if (tnaRole && row.tnaRole === tnaRole) s += 5;
    if (!row.sectorId && !row.tnaRole) s += 0; // global
    return s;
  };
  const best = rows.sort((a, b) => score(b) - score(a))[0];
  return { targetScore: best.targetScore, usedDefaultTarget: false };
}

export async function upsertTargetProficiency(data: {
  id?: number;
  questionId: number;
  sectorId?: number | null;
  skillAreaId?: number | null;
  tnaRole?: string | null;
  targetScore: number;
  proficiencyLabel?: string | null;
  rationale?: string | null;
  isActive?: boolean;
  userId: number;
}) {
  const db = await getDb();
  if (!db) return null;
  const { id, userId, ...rest } = data;
  if (id) {
    await db.update(targetProficiencies)
      .set({ ...rest, updatedBy: userId })
      .where(eq(targetProficiencies.id, id));
    return { id };
  } else {
    const [result] = await db.insert(targetProficiencies).values({
      ...rest,
      createdBy: userId,
      updatedBy: userId,
    } as any);
    return { id: (result as any).insertId as number };
  }
}

export async function deleteTargetProficiency(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(targetProficiencies).where(eq(targetProficiencies.id, id));
}

// ─── Competency Gap Records (T2-2) ───────────────────────────────────────────
export async function saveCompetencyGapRecords(
  reportId: number,
  surveyId: number,
  records: Array<{
    questionId: number;
    actualScore: number;
    targetScore: number;
    gapScore: number;
    gapPercentage: number;
    selfScore?: number | null;
    supervisorScore?: number | null;
    kpiScore?: number | null;
    category: string;
    gapLevel: string;
    usedDefaultTarget: boolean;
  }>
) {
  const db = await getDb();
  if (!db) return;
  // Delete existing records for this report
  await db.delete(competencyGapRecords).where(eq(competencyGapRecords.reportId, reportId));
  if (records.length === 0) return;
  await db.insert(competencyGapRecords).values(
    records.map((r) => ({ ...r, reportId, surveyId } as any))
  );
}

export async function getCompetencyGapRecordsByReport(reportId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ gap: competencyGapRecords, question: questions })
    .from(competencyGapRecords)
    .leftJoin(questions, eq(competencyGapRecords.questionId, questions.id))
    .where(eq(competencyGapRecords.reportId, reportId))
    .orderBy(desc(competencyGapRecords.gapScore));
}

export async function getCompetencyGapRecordsByGroup(groupId: number) {
  const db = await getDb();
  if (!db) return [];
  // Join through surveys to filter by groupId
  return db
    .select({ gap: competencyGapRecords, question: questions })
    .from(competencyGapRecords)
    .leftJoin(questions, eq(competencyGapRecords.questionId, questions.id))
    .leftJoin(surveys, eq(competencyGapRecords.surveyId, surveys.id))
    .where(eq(surveys.groupId, groupId))
    .orderBy(desc(competencyGapRecords.gapScore));
}

/** Aggregate gap records for a group: returns top gaps with frequency and avg gap */
export async function aggregateGroupGapRecords(groupId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await getCompetencyGapRecordsByGroup(groupId);
  const freq: Record<number, {
    questionId: number;
    questionText: string;
    category: string;
    count: number;
    totalGap: number;
    totalActual: number;
    totalTarget: number;
  }> = {};
  for (const { gap, question } of rows) {
    const qid = gap.questionId;
    if (!freq[qid]) {
      freq[qid] = {
        questionId: qid,
        questionText: question?.questionText ?? `Q${qid}`,
        category: gap.category,
        count: 0,
        totalGap: 0,
        totalActual: 0,
        totalTarget: 0,
      };
    }
    freq[qid].count += 1;
    freq[qid].totalGap += gap.gapScore;
    freq[qid].totalActual += gap.actualScore;
    freq[qid].totalTarget += gap.targetScore;
  }
  return Object.values(freq)
    .map((f) => ({
      questionId: f.questionId,
      questionText: f.questionText,
      category: f.category,
      affectedCount: f.count,
      avgGapScore: Math.round((f.totalGap / f.count) * 10) / 10,
      avgActualScore: Math.round((f.totalActual / f.count) * 10) / 10,
      avgTargetScore: Math.round((f.totalTarget / f.count) * 10) / 10,
    }))
    .sort((a, b) => b.avgGapScore - a.avgGapScore);
}

// ─── Prioritization Matrix (T2-3) ────────────────────────────────────────────
export async function getPrioritizationMatrix(groupId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ item: prioritizationMatrix, question: questions })
    .from(prioritizationMatrix)
    .leftJoin(questions, eq(prioritizationMatrix.questionId, questions.id))
    .where(eq(prioritizationMatrix.groupId, groupId))
    .orderBy(prioritizationMatrix.rank, desc(prioritizationMatrix.priorityScore));
}

export async function upsertPrioritizationItem(data: {
  id?: number;
  groupId: number;
  questionId?: number | null;
  trainingNeedLabel: string;
  category?: string | null;
  urgencyScore: number;
  impactScore: number;
  feasibilityScore: number;
  affectedCount?: number;
  avgGapPct?: number;
  status?: string;
  isManualOverride?: boolean;
  notes?: string | null;
  userId: number;
}) {
  const db = await getDb();
  if (!db) return null;
  const { id, userId, ...rest } = data;
  const priorityScore = rest.urgencyScore * rest.impactScore * rest.feasibilityScore;
  if (id) {
    await db.update(prioritizationMatrix)
      .set({ ...rest, priorityScore, updatedBy: userId } as any)
      .where(eq(prioritizationMatrix.id, id));
    return { id };
  } else {
    const [result] = await db.insert(prioritizationMatrix).values({
      ...rest,
      priorityScore,
      createdBy: userId,
      updatedBy: userId,
    } as any);
    return { id: (result as any).insertId as number };
  }
}

export async function deletePrioritizationItem(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(prioritizationMatrix).where(eq(prioritizationMatrix.id, id));
}

/** Recompute ranks for all items in a group after any change */
export async function recomputeMatrixRanks(groupId: number) {
  const db = await getDb();
  if (!db) return;
  const items = await db
    .select({ id: prioritizationMatrix.id, priorityScore: prioritizationMatrix.priorityScore })
    .from(prioritizationMatrix)
    .where(eq(prioritizationMatrix.groupId, groupId))
    .orderBy(desc(prioritizationMatrix.priorityScore));
  for (let i = 0; i < items.length; i++) {
    await db.update(prioritizationMatrix)
      .set({ rank: i + 1 })
      .where(eq(prioritizationMatrix.id, items[i].id));
  }
}

/** Auto-generate prioritization matrix from aggregated gap records for a group */
export async function generatePrioritizationMatrix(groupId: number, userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const aggregated = await aggregateGroupGapRecords(groupId);
  if (aggregated.length === 0) return 0;
  // Get total respondents for this group
  const groupReports = await getReportsByGroup(groupId);
  const totalRespondents = groupReports.length || 1;
  // Delete existing non-manual-override items
  await db.delete(prioritizationMatrix)
    .where(and(eq(prioritizationMatrix.groupId, groupId), eq(prioritizationMatrix.isManualOverride, false)));
  // Insert new items derived from gap data
  for (const gap of aggregated) {
    const affectedPct = gap.affectedCount / totalRespondents;
    // Urgency: based on avg gap score (higher gap = more urgent)
    const urgency = Math.min(5, Math.max(1, Math.round((gap.avgGapScore / 20) * 5)));
    // Impact: based on affected percentage (more people = higher impact)
    const impact = Math.min(5, Math.max(1, Math.round(affectedPct * 5)));
    // Feasibility: default 3 (neutral) — HR can override
    const feasibility = 3;
    const priorityScore = urgency * impact * feasibility;
    await db.insert(prioritizationMatrix).values({
      groupId,
      questionId: gap.questionId,
      trainingNeedLabel: gap.questionText,
      category: gap.category,
      urgencyScore: urgency,
      impactScore: impact,
      feasibilityScore: feasibility,
      priorityScore,
      affectedCount: gap.affectedCount,
      avgGapPct: gap.avgGapScore,
      status: "pending",
      isManualOverride: false,
      createdBy: userId,
      updatedBy: userId,
    } as any);
  }
  await recomputeMatrixRanks(groupId);
  return aggregated.length;
}

// ─── Supervisor Validation (T2-4) ────────────────────────────────────────────
/** Get all surveys pending supervisor validation for a given supervisor user */
export async function getSurveysForSupervisorValidation(supervisorUserId: number) {
  const db = await getDb();
  if (!db) return [];
  // Find surveys in the same group(s) as the supervisor's assigned group
  // where at least one response has no supervisorScore yet
  const supervisorUser = await getUserById(supervisorUserId);
  if (!supervisorUser) return [];
  // Get all completed surveys in the supervisor's group
  const conditions = [eq(surveys.status, "completed" as any)];
  if (supervisorUser.groupId) {
    conditions.push(eq(surveys.groupId, supervisorUser.groupId));
  }
  return db
    .select({ survey: surveys, user: users })
    .from(surveys)
    .leftJoin(users, eq(surveys.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(surveys.completedAt));
}

/** Get validation progress for a survey: how many responses have supervisor scores */
export async function getSupervisorValidationProgress(surveyId: number) {
  const db = await getDb();
  if (!db) return { total: 0, validated: 0 };
  const allResponses = await db
    .select({ id: surveyResponses.id, supervisorScore: surveyResponses.supervisorScore })
    .from(surveyResponses)
    .where(eq(surveyResponses.surveyId, surveyId));
  const total = allResponses.length;
  const validated = allResponses.filter((r) => r.supervisorScore != null).length;
  return { total, validated };
}

/** Save supervisor scores for a batch of responses */
export async function saveSupervisorScores(
  surveyId: number,
  supervisorId: number,
  scores: Array<{ responseId: number; supervisorScore: number; supervisorNotes?: string | null }>
) {
  const db = await getDb();
  if (!db) return;
  const now = new Date();
  for (const s of scores) {
    await db.update(surveyResponses)
      .set({
        supervisorScore: s.supervisorScore,
        supervisorNotes: s.supervisorNotes ?? null,
        supervisorId,
        supervisorValidatedAt: now,
      })
      .where(and(eq(surveyResponses.id, s.responseId), eq(surveyResponses.surveyId, surveyId)));
  }
}
