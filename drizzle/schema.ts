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

// ─── Survey Groups ────────────────────────────────────────────────────────────
// Admin-created group tags that can be assigned to surveys for cohort analysis
export const surveyGroups = mysqlTable("survey_groups", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: text("description"),
  // Optional sector scope (null = applies to all sectors)
  sectorId: int("sectorId"),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SurveyGroup = typeof surveyGroups.$inferSelect;
export type InsertSurveyGroup = typeof surveyGroups.$inferInsert;

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
  // groupId: if set, this question is only shown to surveys tagged with this group
  groupId: int("groupId"),
  category: mysqlEnum("category", [
    "organizational",
    "job_task",
    "individual",
    "training_feasibility",
    "evaluation_success",
    "custom",
  ]).notNull(),
  // customCategory: human-readable label for category="custom" questions
  customCategory: varchar("customCategory", { length: 255 }),
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
  // Group tag assigned at survey start
  groupId: int("groupId"),
  conductedWith: mysqlEnum("conductedWith", ["self", "hr_officer", "administrator"]).default("self"),
  conductedWithName: varchar("conductedWithName", { length: 255 }),
  // Respondent basic information (captured before survey questions)
  respondentName: varchar("respondentName", { length: 255 }),
  respondentAge: int("respondentAge"),
  respondentGender: mysqlEnum("respondentGender", ["male", "female", "non_binary", "prefer_not_to_say"]),
  respondentPosition: varchar("respondentPosition", { length: 255 }),
  respondentCompany: varchar("respondentCompany", { length: 255 }),
  respondentYearsExperience: int("respondentYearsExperience"),
  respondentHighestEducation: mysqlEnum("respondentHighestEducation", [
    "elementary",
    "high_school",
    "vocational",
    "associate",
    "bachelor",
    "master",
    "doctorate",
    "other",
  ]),
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

// ─── Survey Configurations ──────────────────────────────────────────────────
// Admins/trainers/HR officers define objectives and context per group to guide
// AI-generated question recommendations for that group's TNA.
export const surveyConfigurations = mysqlTable("survey_configurations", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull().references(() => surveyGroups.id),
  // Core objectives
  surveyTitle: varchar("surveyTitle", { length: 500 }),
  surveyPurpose: text("surveyPurpose"),
  surveyObjectives: json("surveyObjectives").$type<string[]>().default([]),
  // Organizational context
  organizationName: varchar("organizationName", { length: 255 }),
  industryContext: text("industryContext"),
  businessGoals: json("businessGoals").$type<string[]>().default([]),
  // Target participants
  targetParticipants: text("targetParticipants"),
  participantRoles: json("participantRoles").$type<string[]>().default([]),
  expectedParticipantCount: int("expectedParticipantCount"),
  // Competency focus
  targetCompetencies: json("targetCompetencies").$type<string[]>().default([]),
  knownSkillGaps: text("knownSkillGaps"),
  priorityAreas: json("priorityAreas").$type<string[]>().default([]),
  // Survey period
  surveyStartDate: varchar("surveyStartDate", { length: 20 }),
  surveyEndDate: varchar("surveyEndDate", { length: 20 }),
  // Additional context
  additionalNotes: text("additionalNotes"),
  regulatoryRequirements: text("regulatoryRequirements"),
  // AI-generated question suggestions (stored as JSON after generation)
  aiGeneratedQuestions: json("aiGeneratedQuestions").$type<Array<{
    questionText: string;
    category: string;
    questionType: string;
    rationale: string;
    accepted: boolean;
  }>>(),
  aiGeneratedAt: timestamp("aiGeneratedAt"),
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SurveyConfiguration = typeof surveyConfigurations.$inferSelect;
export type InsertSurveyConfiguration = typeof surveyConfigurations.$inferInsert;

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

// ─── AI Provider Settings ─────────────────────────────────────────────────────
export const aiSettings = mysqlTable("ai_settings", {
  id: int("id").autoincrement().primaryKey(),
  provider: varchar("provider", { length: 50 }).notNull().default("builtin"),
  apiKey: text("apiKey"),
  model: varchar("model", { length: 100 }).notNull().default("gpt-4o"),
  baseUrl: varchar("baseUrl", { length: 500 }),
  isActive: boolean("isActive").notNull().default(true),
  updatedBy: int("updatedBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AiSettings = typeof aiSettings.$inferSelect;
export type InsertAiSettings = typeof aiSettings.$inferInsert;
