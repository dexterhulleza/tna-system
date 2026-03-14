// TNA System shared types for frontend

export type TnaRole = "industry_worker" | "trainer" | "assessor" | "hr_officer" | "admin";
export type AdminLevel = "super_admin" | "admin" | "sector_manager" | "question_manager";
export type QuestionCategory = "organizational" | "job_task" | "individual" | "training_feasibility" | "evaluation_success";
export type QuestionType = "text" | "multiple_choice" | "checkbox" | "rating" | "yes_no" | "scale";
export type GapLevel = "critical" | "high" | "moderate" | "low" | "none";
export type Priority = "critical" | "high" | "medium" | "low";

export const TNA_ROLE_LABELS: Record<TnaRole, string> = {
  industry_worker: "Industry Worker",
  trainer: "Trainer",
  assessor: "Assessor",
  hr_officer: "HR Officer",
  admin: "Administrator",
};

export const CATEGORY_LABELS: Record<QuestionCategory, string> = {
  organizational: "Organizational-Level Criteria",
  job_task: "Job / Task-Level Criteria",
  individual: "Individual-Level Criteria",
  training_feasibility: "Training Feasibility",
  evaluation_success: "Evaluation & Success Criteria",
};

export const CATEGORY_DESCRIPTIONS: Record<QuestionCategory, string> = {
  organizational: "Assess alignment between training needs and organizational goals, policies, and strategic direction.",
  job_task: "Evaluate specific job duties, task requirements, and performance standards relevant to the role.",
  individual: "Identify personal competency gaps, learning preferences, and professional development needs.",
  training_feasibility: "Determine the practicality, resources, and constraints affecting training delivery.",
  evaluation_success: "Define measurable outcomes, success criteria, and evaluation methods for training programs.",
};

export const GAP_LEVEL_LABELS: Record<GapLevel, string> = {
  critical: "Critical Gap",
  high: "High Gap",
  moderate: "Moderate Gap",
  low: "Low Gap",
  none: "No Gap",
};

export const GAP_LEVEL_COLORS: Record<GapLevel, string> = {
  critical: "text-red-600",
  high: "text-orange-500",
  moderate: "text-yellow-600",
  low: "text-blue-500",
  none: "text-green-600",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const SECTOR_ICONS: Record<string, string> = {
  ICT: "💻",
  MET: "⚙️",
  CAF: "🎨",
  HW: "🏥",
  BPS: "🏗️",
  TL: "🚗",
};

export const SECTOR_COLORS: Record<string, string> = {
  ICT: "from-blue-500 to-cyan-500",
  MET: "from-gray-600 to-slate-700",
  CAF: "from-purple-500 to-pink-500",
  HW: "from-green-500 to-emerald-600",
  BPS: "from-orange-500 to-amber-600",
  TL: "from-red-500 to-rose-600",
};
