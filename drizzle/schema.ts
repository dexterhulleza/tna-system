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
  mobile: varchar("mobile", { length: 30 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // TNA-specific role
  tnaRole: mysqlEnum("tnaRole", ["industry_worker", "trainer", "assessor", "hr_officer", "admin", "ld_officer", "line_manager", "employee", "executive_reviewer"]).default("industry_worker"),
  // Admin level (only relevant when role = admin)
  adminLevel: mysqlEnum("adminLevel", ["super_admin", "admin", "sector_manager", "question_manager"]).default("admin"),
  organization: varchar("organization", { length: 255 }),
  jobTitle: varchar("jobTitle", { length: 255 }),
  department: varchar("department", { length: 255 }),
  employeeId: varchar("employeeId", { length: 100 }),
  // Custom auth fields
  passwordHash: varchar("passwordHash", { length: 255 }),
  emailVerified: boolean("emailVerified").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  pendingApproval: boolean("pendingApproval").default(false).notNull(),
  resetToken: varchar("resetToken", { length: 255 }),
  resetTokenExpiry: timestamp("resetTokenExpiry"),
  // HR Officer registration fields
  hrJustification: text("hrJustification"),
  // PSOC-aligned Primary Work Function (required for Employee Respondent)
  workFunctionCategory: varchar("workFunctionCategory", { length: 100 }),
  workFunctionTitle: varchar("workFunctionTitle", { length: 255 }),
  workFunctionPsocCode: varchar("workFunctionPsocCode", { length: 20 }),
  workFunctionOtherText: varchar("workFunctionOtherText", { length: 150 }),
  // Group assignment (for staff)
  groupId: int("groupId"),
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
  expectedCount: int("expectedCount").default(0),
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
  responseValue: float("responseValue"), // for rating/scale (self-assessment)
  responseOptions: json("responseOptions").$type<string[]>(), // for checkbox
  // T1-6: Multi-source scoring fields
  supervisorScore: float("supervisorScore"),        // supervisor validation score
  kpiScore: float("kpiScore"),                      // KPI/performance evidence score
  supervisorNotes: text("supervisorNotes"),          // supervisor comments
  supervisorValidatedAt: timestamp("supervisorValidatedAt"), // when supervisor submitted
  supervisorId: int("supervisorId").references(() => users.id), // who validated
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
// ─── Scoring Weights (T1-6) ─────────────────────────────────────────────────
// Configurable weights for multi-source scoring: self-assessment, supervisor, KPI
export const scoringWeights = mysqlTable("scoring_weights", {
  id: int("id").autoincrement().primaryKey(),
  // Weights must sum to 1.0 (enforced at application layer)
  selfWeight: float("selfWeight").notNull().default(0.5),       // employee self-assessment
  supervisorWeight: float("supervisorWeight").notNull().default(0.3), // supervisor validation
  kpiWeight: float("kpiWeight").notNull().default(0.2),         // KPI/performance evidence
  // Whether supervisor validation is required before computing weighted score
  requireSupervisorValidation: boolean("requireSupervisorValidation").notNull().default(false),
  // Fallback: if supervisor hasn't validated, use self score only
  fallbackToSelfOnly: boolean("fallbackToSelfOnly").notNull().default(true),
  updatedBy: int("updatedBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ScoringWeights = typeof scoringWeights.$inferSelect;
export type InsertScoringWeights = typeof scoringWeights.$inferInsert;

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

// ─── Group Analysis Sections (per-section AI cache) ──────────────────────────
// Stores individually generated TESDA analysis sections per group.
// Each section is generated on-demand and cached here so AI credits are only
// spent once per section per group (unless explicitly regenerated).
export const groupAnalysisSections = mysqlTable("group_analysis_sections", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull().references(() => surveyGroups.id),
  sectionKey: varchar("sectionKey", { length: 60 }).notNull(),
  // sectionKey values: industry_profile | occupational_mapping | competency_gap |
  //   skills_categorization | technology_equipment | priority_matrix |
  //   training_beneficiaries | delivery_mode | training_plan
  sectionTitle: varchar("sectionTitle", { length: 200 }).notNull(),
  content: text("content").notNull(),
  modelUsed: varchar("modelUsed", { length: 100 }),
  generatedBy: int("generatedBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type GroupAnalysisSection = typeof groupAnalysisSections.$inferSelect;
export type InsertGroupAnalysisSection = typeof groupAnalysisSections.$inferInsert;

// ─── TESDA Reference Library ─────────────────────────────────────────────────
// Stores TESDA Training Regulations (TR), Competency Standards (CS), and
// Supermarket micro-credential units for mapping to role competencies.
export const tesdaReferences = mysqlTable("tesda_references", {
  id: int("id").autoincrement().primaryKey(),
  // Classification
  referenceType: mysqlEnum("referenceType", ["TR", "CS", "Supermarket"]).notNull().default("TR"),
  // TR / CS identifiers
  trCode: varchar("trCode", { length: 50 }),           // e.g. "CSS NC II"
  qualificationTitle: varchar("qualificationTitle", { length: 255 }).notNull(), // e.g. "Computer Systems Servicing NC II"
  // Competency Standard unit
  csUnitCode: varchar("csUnitCode", { length: 80 }),   // e.g. "CSS311201"
  csUnitTitle: varchar("csUnitTitle", { length: 255 }), // e.g. "Install and Configure Computer Systems"
  competencyLevel: mysqlEnum("competencyLevel", ["NC I", "NC II", "NC III", "NC IV", "COC", "Other"]).default("NC II"),
  // Descriptor / scope
  descriptor: text("descriptor"),
  // Industry / sector tag for filtering
  industry: varchar("industry", { length: 150 }),
  sector: varchar("sector", { length: 150 }),
  // Status
  isActive: boolean("isActive").notNull().default(true),
  createdBy: int("createdBy").references(() => users.id),
  updatedBy: int("updatedBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type TesdaReference = typeof tesdaReferences.$inferSelect;
export type InsertTesdaReference = typeof tesdaReferences.$inferInsert;

// ─── Audit Logs ───────────────────────────────────────────────────────────────
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id),
  userEmail: varchar("userEmail", { length: 320 }),
  userName: varchar("userName", { length: 255 }),
  action: varchar("action", { length: 100 }).notNull(),
  module: varchar("module", { length: 100 }).notNull(),
  details: text("details"),
  ipAddress: varchar("ipAddress", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ─── Task-to-Competency Mappings (T1-5) ──────────────────────────────────────
// Links survey questions (tasks) to TESDA Reference Library entries (competency units)
// so AI-generated training plans can cite specific TR/CS codes.
export const taskCompetencyMappings = mysqlTable("task_competency_mappings", {
  id: int("id").autoincrement().primaryKey(),
  // The survey question / task being mapped
  questionId: int("questionId").notNull().references(() => questions.id, { onDelete: "cascade" }),
  // The TESDA reference (TR or CS unit) this task maps to
  tesdaReferenceId: int("tesdaReferenceId").notNull().references(() => tesdaReferences.id, { onDelete: "cascade" }),
  // How strongly this task relates to the competency unit (0.0–1.0)
  relevanceScore: float("relevanceScore").default(1.0),
  // Optional notes explaining the mapping rationale
  notes: text("notes"),
  // Whether this mapping was created by AI (auto) or manually by an HR Officer
  mappingSource: mysqlEnum("mappingSource", ["manual", "ai"]).notNull().default("manual"),
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type TaskCompetencyMapping = typeof taskCompetencyMappings.$inferSelect;
export type InsertTaskCompetencyMapping = typeof taskCompetencyMappings.$inferInsert;

// ─── Target Proficiency Levels (T2-1) ────────────────────────────────────────
// Defines the expected/target score for each question, optionally scoped by
// sector, skill area, or TNA role. The gap engine compares actual scores
// against these benchmarks instead of the raw max scale value.
export const targetProficiencies = mysqlTable("target_proficiencies", {
  id: int("id").autoincrement().primaryKey(),
  // Which question this benchmark applies to
  questionId: int("questionId").notNull().references(() => questions.id, { onDelete: "cascade" }),
  // Optional scoping — null = applies to all
  sectorId: int("sectorId").references(() => sectors.id, { onDelete: "cascade" }),
  skillAreaId: int("skillAreaId").references(() => skillAreas.id, { onDelete: "cascade" }),
  // TNA role scope (null = all roles)
  tnaRole: varchar("tnaRole", { length: 60 }),
  // The target score expressed as a percentage (0-100) of the question's scale
  targetScore: float("targetScore").notNull().default(80.0),
  // Optional label, e.g. "Proficient", "Competent", "Expert"
  proficiencyLabel: varchar("proficiencyLabel", { length: 100 }),
  // Rationale / source (e.g. "TESDA NC II standard", "Company policy")
  rationale: text("rationale"),
  isActive: boolean("isActive").notNull().default(true),
  createdBy: int("createdBy").references(() => users.id),
  updatedBy: int("updatedBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type TargetProficiency = typeof targetProficiencies.$inferSelect;
export type InsertTargetProficiency = typeof targetProficiencies.$inferInsert;

// ─── Competency Gap Records (T2-2) ───────────────────────────────────────────
// Persists individual question-level gap results as queryable rows.
// One record per (report, question) pair — replaces the JSON blob in reports.identifiedGaps
// for structured querying, trending, and drill-down.
export const competencyGapRecords = mysqlTable("competency_gap_records", {
  id: int("id").autoincrement().primaryKey(),
  reportId: int("reportId").notNull().references(() => reports.id, { onDelete: "cascade" }),
  surveyId: int("surveyId").notNull().references(() => surveys.id, { onDelete: "cascade" }),
  questionId: int("questionId").notNull().references(() => questions.id, { onDelete: "cascade" }),
  // Scores (all 0-100)
  actualScore: float("actualScore").notNull(),        // weighted composite score
  targetScore: float("targetScore").notNull(),        // from targetProficiencies (or default 80)
  gapScore: float("gapScore").notNull(),              // targetScore - actualScore (positive = gap)
  gapPercentage: float("gapPercentage").notNull(),    // gapScore / targetScore * 100
  // Source breakdown
  selfScore: float("selfScore"),
  supervisorScore: float("supervisorScore"),
  kpiScore: float("kpiScore"),
  // Classification
  category: varchar("category", { length: 100 }).notNull(),
  gapLevel: mysqlEnum("gapLevel", ["critical", "high", "moderate", "low", "none"]).notNull(),
  // Whether a target proficiency record was found (vs. default used)
  usedDefaultTarget: boolean("usedDefaultTarget").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CompetencyGapRecord = typeof competencyGapRecords.$inferSelect;
export type InsertCompetencyGapRecord = typeof competencyGapRecords.$inferInsert;

// ─── Prioritization Matrix (T2-3) ────────────────────────────────────────────
// Ranks training needs for a group by urgency × impact × feasibility.
// HR Officers / Admins can override AI-computed scores and reorder items.
export const prioritizationMatrix = mysqlTable("prioritization_matrix", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull().references(() => surveyGroups.id, { onDelete: "cascade" }),
  // The competency / training need being ranked
  questionId: int("questionId").references(() => questions.id, { onDelete: "set null" }),
  // Human-readable label (may differ from question text after HR edits)
  trainingNeedLabel: varchar("trainingNeedLabel", { length: 500 }).notNull(),
  category: varchar("category", { length: 100 }),
  // Scoring dimensions (1-5 scale)
  urgencyScore: float("urgencyScore").notNull().default(3.0),     // how soon training is needed
  impactScore: float("impactScore").notNull().default(3.0),       // business / performance impact
  feasibilityScore: float("feasibilityScore").notNull().default(3.0), // ease of delivering training
  // Computed: urgency * impact * feasibility (max 125)
  priorityScore: float("priorityScore").notNull().default(27.0),
  // Derived rank within the group (1 = highest priority)
  rank: int("rank"),
  // Supporting data
  affectedCount: int("affectedCount").default(0),   // number of respondents with this gap
  avgGapPct: float("avgGapPct").default(0),          // average gap % across affected respondents
  // Status
  status: mysqlEnum("status", ["pending", "approved", "in_progress", "completed", "deferred"]).notNull().default("pending"),
  // Override flag: true if HR manually edited scores
  isManualOverride: boolean("isManualOverride").notNull().default(false),
  notes: text("notes"),
  createdBy: int("createdBy").references(() => users.id),
  updatedBy: int("updatedBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PrioritizationMatrix = typeof prioritizationMatrix.$inferSelect;
export type InsertPrioritizationMatrix = typeof prioritizationMatrix.$inferInsert;

// ─── Curriculum Blueprints (T3-1) ─────────────────────────────────────────────
// A structured curriculum object replacing free-text training plan narratives.
// Blueprints are linked to a survey group and contain ordered modules across
// 4 curriculum layers (Foundation / Core Role / Context / Advancement).
// Status workflow: Draft → For Review → Approved → Published
export const curriculumBlueprints = mysqlTable("curriculum_blueprints", {
  id: int("id").autoincrement().primaryKey(),
  // Scope — linked to a survey group (one blueprint per group per cycle)
  groupId: int("groupId").notNull().references(() => surveyGroups.id, { onDelete: "cascade" }),
  // Metadata
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  targetAudience: varchar("targetAudience", { length: 500 }),
  // Status workflow
  status: mysqlEnum("status", ["draft", "for_review", "approved", "published"]).notNull().default("draft"),
  // T3-3 TESDA alignment
  alignmentType: mysqlEnum("alignmentType", ["full_tr", "partial_cs", "supermarket", "blended", "none"]).default("none"),
  alignmentCondition: mysqlEnum("alignmentCondition", ["strong", "partial", "emerging", "blended"]).default("emerging"),
  alignmentNotes: text("alignmentNotes"),
  tesdaReferenceId: int("tesdaReferenceId").references(() => tesdaReferences.id, { onDelete: "set null" }),
  // Review / approval metadata
  reviewedBy: int("reviewedBy").references(() => users.id),
  reviewedAt: timestamp("reviewedAt"),
  approvedBy: int("approvedBy").references(() => users.id),
  approvedAt: timestamp("approvedAt"),
  publishedBy: int("publishedBy").references(() => users.id),
  publishedAt: timestamp("publishedAt"),
  overrideReason: text("overrideReason"),   // T3-4: reason for any changes to AI-generated content
  // Generation metadata
  generatedBy: int("generatedBy").references(() => users.id),
  generatedAt: timestamp("generatedAt"),
  modelUsed: varchar("modelUsed", { length: 100 }),
  isAiGenerated: boolean("isAiGenerated").notNull().default(false),
  // Versioning
  version: int("version").notNull().default(1),
  createdBy: int("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CurriculumBlueprint = typeof curriculumBlueprints.$inferSelect;
export type InsertCurriculumBlueprint = typeof curriculumBlueprints.$inferInsert;

// ─── Curriculum Modules (T3-1) ────────────────────────────────────────────────
// Each blueprint contains ordered modules across 4 layers.
// A module maps to one or more competency gap records and optionally to a TESDA CS unit.
export const curriculumModules = mysqlTable("curriculum_modules", {
  id: int("id").autoincrement().primaryKey(),
  blueprintId: int("blueprintId").notNull().references(() => curriculumBlueprints.id, { onDelete: "cascade" }),
  // Curriculum layer
  layer: mysqlEnum("layer", ["foundation", "core_role", "context", "advancement"]).notNull().default("core_role"),
  // Module content
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  // Competency mapping
  competencyCategory: varchar("competencyCategory", { length: 100 }),  // maps to question.category
  tesdaReferenceId: int("tesdaReferenceId").references(() => tesdaReferences.id, { onDelete: "set null" }),
  // Delivery
  durationHours: float("durationHours"),
  modality: mysqlEnum("modality", ["face_to_face", "online", "blended", "on_the_job", "coaching", "self_directed"]).default("blended"),
  // Prerequisites — JSON array of module IDs that must be completed first
  prerequisites: json("prerequisites").$type<number[]>().default([]),
  // Linked gap data
  targetGapLevel: mysqlEnum("targetGapLevel", ["critical", "high", "moderate", "low"]).default("high"),
  estimatedAffectedCount: int("estimatedAffectedCount").default(0),
  // Ordering within the blueprint
  sortOrder: int("sortOrder").notNull().default(0),
  // Override tracking (T3-4)
  isAiGenerated: boolean("isAiGenerated").notNull().default(false),
  overrideReason: text("overrideReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CurriculumModule = typeof curriculumModules.$inferSelect;
export type InsertCurriculumModule = typeof curriculumModules.$inferInsert;

// ═══════════════════════════════════════════════════════════════════════════════
// T4 — Learning Path Engine
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Learning Paths (T4-1) ────────────────────────────────────────────────────
// One path per respondent (or cohort). Generated from gap records + curriculum blueprint.
export const learningPaths = mysqlTable("learning_paths", {
  id: int("id").autoincrement().primaryKey(),
  // Owner
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  groupId: int("groupId").references(() => surveyGroups.id, { onDelete: "set null" }),
  blueprintId: int("blueprintId").references(() => curriculumBlueprints.id, { onDelete: "set null" }),
  // Path metadata
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  pathType: mysqlEnum("pathType", [
    "entry",
    "compliance",
    "performance_recovery",
    "progression",
    "cross_skilling",
  ]).notNull().default("progression"),
  // Status lifecycle: draft → assigned → in_progress → completed → archived
  status: mysqlEnum("status", [
    "draft",
    "assigned",
    "in_progress",
    "completed",
    "archived",
  ]).notNull().default("draft"),
  // Completion rule
  completionRule: mysqlEnum("completionRule", [
    "all_required",
    "minimum_percentage",
    "milestone_based",
  ]).notNull().default("all_required"),
  completionThresholdPct: int("completionThresholdPct").default(80), // used when rule = minimum_percentage
  // Dates
  targetCompletionDate: timestamp("targetCompletionDate"),
  assignedAt: timestamp("assignedAt"),
  assignedBy: int("assignedBy").references(() => users.id, { onDelete: "set null" }),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  // AI generation metadata
  isAiGenerated: boolean("isAiGenerated").notNull().default(false),
  generatedAt: timestamp("generatedAt"),
  modelUsed: varchar("modelUsed", { length: 100 }),
  // Override tracking
  overrideReason: text("overrideReason"),
  createdBy: int("createdBy").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type LearningPath = typeof learningPaths.$inferSelect;
export type InsertLearningPath = typeof learningPaths.$inferInsert;

// ─── Learning Path Steps (T4-1) ───────────────────────────────────────────────
// Each step maps to a curriculum module (or is a standalone intervention).
export const learningPathSteps = mysqlTable("learning_path_steps", {
  id: int("id").autoincrement().primaryKey(),
  pathId: int("pathId").notNull().references(() => learningPaths.id, { onDelete: "cascade" }),
  moduleId: int("moduleId").references(() => curriculumModules.id, { onDelete: "set null" }),
  // Step content (may be copied from module or standalone)
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  layer: mysqlEnum("layer", ["foundation", "core_role", "context", "advancement"]).notNull().default("core_role"),
  modality: mysqlEnum("modality", ["face_to_face", "online", "blended", "on_the_job", "coaching", "self_directed"]).default("blended"),
  durationHours: float("durationHours"),
  competencyCategory: varchar("competencyCategory", { length: 100 }),
  targetGapLevel: mysqlEnum("targetGapLevel", ["critical", "high", "moderate", "low"]).default("high"),
  // Sequencing
  sortOrder: int("sortOrder").notNull().default(0),
  isRequired: boolean("isRequired").notNull().default(true),
  // Exemption
  isExempted: boolean("isExempted").notNull().default(false),
  exemptionReason: text("exemptionReason"),
  exemptedBy: int("exemptedBy").references(() => users.id, { onDelete: "set null" }),
  exemptedAt: timestamp("exemptedAt"),
  // Progress tracking (T4-4)
  progressStatus: mysqlEnum("progressStatus", [
    "not_started",
    "in_progress",
    "completed",
    "exempted",
  ]).notNull().default("not_started"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  completionNotes: text("completionNotes"),
  completionEvidence: varchar("completionEvidence", { length: 1000 }), // URL or reference
  // Milestone flag
  isMilestone: boolean("isMilestone").notNull().default(false),
  milestoneLabel: varchar("milestoneLabel", { length: 200 }),
  // AI generation metadata
  isAiGenerated: boolean("isAiGenerated").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type LearningPathStep = typeof learningPathSteps.$inferSelect;
export type InsertLearningPathStep = typeof learningPathSteps.$inferInsert;
