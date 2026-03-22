import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  adminPermissions,
  questions,
  recommendations,
  reports,
  sectors,
  skillAreas,
  surveyGroups,
  surveyResponses,
  surveys,
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
