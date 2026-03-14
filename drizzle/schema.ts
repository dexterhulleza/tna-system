import {
  boolean,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  float,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // TNA-specific role
  tnaRole: mysqlEnum("tnaRole", ["industry_worker", "trainer", "assessor", "hr_officer", "admin"]).default("industry_worker"),
  // Admin level (only relevant when role = admin)
  adminLevel: mysqlEnum("adminLevel", ["super_admin", "admin", "sector_manager", "question_manager"]).default("admin"),
  organization: varchar("organization", { length: 255 }),
  jobTitle: varchar("jobTitle", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Sectors (6 WorldSkills Primary Sectors) ──────────────────────────────────
export const sectors = mysqlTable("sectors", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: text("description"),
  iconName: varchar("iconName", { length: 100 }),
  colorClass: varchar("colorClass", { length: 100 }),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Sector = typeof sectors.$inferSelect;
export type InsertSector = typeof sectors.$inferInsert;

// ─── Skill Areas (per Sector) ─────────────────────────────────────────────────
export const skillAreas = mysqlTable("skill_areas", {
  id: int("id").autoincrement().primaryKey(),
  sectorId: int("sectorId").notNull().references(() => sectors.id),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SkillArea = typeof skillAreas.$inferSelect;
export type InsertSkillArea = typeof skillAreas.$inferInsert;

// ─── Questions ────────────────────────────────────────────────────────────────
export const questions = mysqlTable("questions", {
  id: int("id").autoincrement().primaryKey(),
  sectorId: int("sectorId").references(() => sectors.id), // null = applies to all sectors
  skillAreaId: int("skillAreaId").references(() => skillAreas.id), // null = applies to all skill areas
  category: mysqlEnum("category", [
    "organizational",
    "job_task",
    "individual",
    "training_feasibility",
    "evaluation_success",
  ]).notNull(),
  targetRoles: json("targetRoles").$type<string[]>().default(["industry_worker", "trainer", "assessor", "hr_officer"]),
  questionText: text("questionText").notNull(),
  questionType: mysqlEnum("questionType", [
    "text",
    "multiple_choice",
    "checkbox",
    "rating",
    "yes_no",
    "scale",
  ]).notNull().default("rating"),
  options: json("options").$type<string[]>(), // for multiple_choice / checkbox
  minValue: int("minValue").default(1),
  maxValue: int("maxValue").default(5),
  isRequired: boolean("isRequired").default(true).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0),
  helpText: text("helpText"),
  weight: float("weight").default(1.0), // for gap analysis weighting
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = typeof questions.$inferInsert;

// ─── Surveys ──────────────────────────────────────────────────────────────────
export const surveys = mysqlTable("surveys", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  sectorId: int("sectorId").notNull().references(() => sectors.id),
  skillAreaId: int("skillAreaId").references(() => skillAreas.id),
  conductedWith: mysqlEnum("conductedWith", ["self", "hr_officer", "administrator"]).default("self"),
  conductedWithName: varchar("conductedWithName", { length: 255 }),
  status: mysqlEnum("status", ["in_progress", "completed", "abandoned"]).default("in_progress").notNull(),
  currentCategory: varchar("currentCategory", { length: 100 }),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Survey = typeof surveys.$inferSelect;
export type InsertSurvey = typeof surveys.$inferInsert;

// ─── Survey Responses ─────────────────────────────────────────────────────────
export const surveyResponses = mysqlTable("survey_responses", {
  id: int("id").autoincrement().primaryKey(),
  surveyId: int("surveyId").notNull().references(() => surveys.id),
  questionId: int("questionId").notNull().references(() => questions.id),
  responseText: text("responseText"),
  responseValue: float("responseValue"), // for rating/scale
  responseOptions: json("responseOptions").$type<string[]>(), // for checkbox
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type InsertSurveyResponse = typeof surveyResponses.$inferInsert;

// ─── Reports ──────────────────────────────────────────────────────────────────
export const reports = mysqlTable("reports", {
  id: int("id").autoincrement().primaryKey(),
  surveyId: int("surveyId").notNull().references(() => surveys.id).unique(),
  userId: int("userId").notNull().references(() => users.id),
  sectorId: int("sectorId").notNull().references(() => sectors.id),
  skillAreaId: int("skillAreaId").references(() => skillAreas.id),
  overallScore: float("overallScore"), // 0-100
  gapLevel: mysqlEnum("gapLevel", ["critical", "high", "moderate", "low", "none"]),
  categoryScores: json("categoryScores").$type<Record<string, number>>(),
  identifiedGaps: json("identifiedGaps").$type<Array<{
    category: string;
    questionId: number;
    questionText: string;
    score: number;
    maxScore: number;
    gapPercentage: number;
  }>>(),
  summary: text("summary"),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;

// ─── Training Recommendations ─────────────────────────────────────────────────
export const recommendations = mysqlTable("recommendations", {
  id: int("id").autoincrement().primaryKey(),
  reportId: int("reportId").notNull().references(() => reports.id),
  priority: mysqlEnum("priority", ["critical", "high", "medium", "low"]).notNull(),
  category: varchar("category", { length: 100 }),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  trainingType: mysqlEnum("trainingType", [
    "formal_training",
    "on_the_job",
    "mentoring",
    "self_directed",
    "workshop",
    "certification",
    "assessment",
    "coaching",
  ]),
  estimatedDuration: varchar("estimatedDuration", { length: 100 }),
  estimatedCost: varchar("estimatedCost", { length: 100 }),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Recommendation = typeof recommendations.$inferSelect;
export type InsertRecommendation = typeof recommendations.$inferInsert;

// ─── Admin Permissions ────────────────────────────────────────────────────────
export const adminPermissions = mysqlTable("admin_permissions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  canManageUsers: boolean("canManageUsers").default(false),
  canManageSectors: boolean("canManageSectors").default(false),
  canManageQuestions: boolean("canManageQuestions").default(false),
  canViewAllReports: boolean("canViewAllReports").default(false),
  canExportData: boolean("canExportData").default(false),
  assignedSectorIds: json("assignedSectorIds").$type<number[]>().default([]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AdminPermission = typeof adminPermissions.$inferSelect;
export type InsertAdminPermission = typeof adminPermissions.$inferInsert;
