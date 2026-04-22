/**
 * TNA Analysis Engine (T2-enhanced)
 * Performs gap analysis and generates training recommendations.
 *
 * T2-1: Gap is now computed against a target proficiency score (default 80%)
 *       instead of the raw scale maximum.
 * T2-2: Returns structured GapRecord[] alongside legacy GapItem[] for DB persistence.
 * T1-6: Accepts optional scoring weights + supervisor/KPI scores.
 */

type ResponseWithQuestion = {
  response: {
    id: number;
    surveyId: number;
    questionId: number;
    responseText: string | null;
    responseValue: number | null;
    responseOptions: string[] | null;
    supervisorScore?: number | null;
    kpiScore?: number | null;
    createdAt: Date;
    updatedAt: Date;
  };
  question: {
    id: number;
    sectorId: number | null;
    skillAreaId: number | null;
    category: string;
    targetRoles: string[] | null;
    questionText: string;
    questionType: string;
    options: string[] | null;
    minValue: number | null;
    maxValue: number | null;
    isRequired: boolean;
    isActive: boolean;
    sortOrder: number | null;
    helpText: string | null;
    weight: number | null;
    createdBy: number | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
};

export type GapItem = {
  category: string;
  questionId: number;
  questionText: string;
  score: number;
  maxScore: number;
  gapPercentage: number;
};

/** Structured gap record — one per (report, question), persisted to DB (T2-2) */
export type GapRecord = {
  questionId: number;
  actualScore: number;
  targetScore: number;
  gapScore: number;
  gapPercentage: number;
  selfScore: number | null;
  supervisorScore: number | null;
  kpiScore: number | null;
  category: string;
  gapLevel: "critical" | "high" | "moderate" | "low" | "none";
  usedDefaultTarget: boolean;
};

export type ScoringWeightsInput = {
  selfWeight: number;
  supervisorWeight: number;
  kpiWeight: number;
  fallbackToSelfOnly: boolean;
};

export type TargetProficiencyMap = Map<number, { targetScore: number; usedDefaultTarget: boolean }>;

export type AnalysisResult = {
  overallScore: number;
  gapLevel: "critical" | "high" | "moderate" | "low" | "none";
  categoryScores: Record<string, number>;
  identifiedGaps: GapItem[];
  gapRecords: GapRecord[];   // T2-2: structured records for DB persistence
  summary: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  organizational: "Organizational Level",
  job_task: "Job/Task Level",
  individual: "Individual Level",
  training_feasibility: "Training Feasibility",
  evaluation_success: "Evaluation & Success Criteria",
};

const DEFAULT_TARGET_SCORE = 80; // 80% of scale = "proficient"

function computeSelfScore(
  response: ResponseWithQuestion["response"],
  question: NonNullable<ResponseWithQuestion["question"]>
): number {
  const maxVal = question.maxValue ?? 5;
  const minVal = question.minValue ?? 1;
  const range = maxVal - minVal || 1;
  if (question.questionType === "rating" || question.questionType === "scale") {
    const val = response.responseValue ?? minVal;
    return ((val - minVal) / range) * 100;
  } else if (question.questionType === "yes_no") {
    return response.responseText?.toLowerCase() === "yes" ? 100 : 0;
  } else if (question.questionType === "multiple_choice") {
    const opts = question.options ?? [];
    const idx = opts.indexOf(response.responseText ?? "");
    if (idx >= 0 && opts.length > 1) return ((opts.length - 1 - idx) / (opts.length - 1)) * 100;
    return 60;
  }
  return 60;
}

function computeCompositeScore(
  selfScore: number,
  supervisorScore: number | null | undefined,
  kpiScore: number | null | undefined,
  weights: ScoringWeightsInput
): number {
  const hasSup = supervisorScore != null;
  const hasKpi = kpiScore != null;
  if (!hasSup && !hasKpi) return selfScore;
  if (!hasSup && weights.fallbackToSelfOnly) return selfScore;
  let totalWeight = weights.selfWeight;
  let weightedSum = selfScore * weights.selfWeight;
  if (hasSup) { totalWeight += weights.supervisorWeight; weightedSum += supervisorScore! * weights.supervisorWeight; }
  if (hasKpi) { totalWeight += weights.kpiWeight; weightedSum += kpiScore! * weights.kpiWeight; }
  return totalWeight > 0 ? weightedSum / totalWeight : selfScore;
}

function classifyGapLevel(gapPct: number): GapRecord["gapLevel"] {
  if (gapPct >= 50) return "critical";
  if (gapPct >= 35) return "high";
  if (gapPct >= 20) return "moderate";
  if (gapPct > 0) return "low";
  return "none";
}

/**
 * Analyze survey responses and compute gap scores (T2-enhanced).
 *
 * @param responsesWithQuestions  Raw responses joined with question metadata
 * @param weights                 Scoring weights (defaults to self-only)
 * @param targetMap               Pre-resolved target proficiency per questionId
 */
export function analyzeGaps(
  responsesWithQuestions: ResponseWithQuestion[],
  weights: ScoringWeightsInput = { selfWeight: 1, supervisorWeight: 0, kpiWeight: 0, fallbackToSelfOnly: true },
  targetMap: TargetProficiencyMap = new Map()
): AnalysisResult {
  const categoryData: Record<string, { totalScore: number; maxScore: number; gaps: GapItem[] }> = {};
  const gapRecords: GapRecord[] = [];

  for (const { response, question } of responsesWithQuestions) {
    if (!question) continue;

    const cat = question.category;
    if (!categoryData[cat]) {
      categoryData[cat] = { totalScore: 0, maxScore: 0, gaps: [] };
    }

    const qWeight = question.weight ?? 1;

    // 1. Self score (0-100)
    const selfScore = computeSelfScore(response, question);

    // 2. Composite score using weights
    const supervisorScore = response.supervisorScore ?? null;
    const kpiScore = response.kpiScore ?? null;
    const actualScore = computeCompositeScore(selfScore, supervisorScore, kpiScore, weights);

    // 3. Target proficiency (T2-1)
    const targetEntry = targetMap.get(question.id);
    const targetScore = targetEntry?.targetScore ?? DEFAULT_TARGET_SCORE;
    const usedDefaultTarget = targetEntry == null;

    // 4. Gap against target
    const gapScore = Math.max(0, targetScore - actualScore);
    const gapPercentage = targetScore > 0 ? (gapScore / targetScore) * 100 : 0;
    const gapLevel = classifyGapLevel(gapPercentage);

    // 5. Accumulate category scores
    categoryData[cat].totalScore += actualScore * qWeight;
    categoryData[cat].maxScore += 100 * qWeight;

    // 6. Legacy GapItem
    if (gapPercentage > 0) {
      categoryData[cat].gaps.push({
        category: cat,
        questionId: question.id,
        questionText: question.questionText,
        score: Math.round(actualScore * 10) / 10,
        maxScore: 100,
        gapPercentage: Math.round(gapPercentage * 10) / 10,
      });
    }

    // 7. Structured GapRecord (T2-2)
    gapRecords.push({
      questionId: question.id,
      actualScore: Math.round(actualScore * 10) / 10,
      targetScore,
      gapScore: Math.round(gapScore * 10) / 10,
      gapPercentage: Math.round(gapPercentage * 10) / 10,
      selfScore: Math.round(selfScore * 10) / 10,
      supervisorScore: supervisorScore != null ? Math.round(supervisorScore * 10) / 10 : null,
      kpiScore: kpiScore != null ? Math.round(kpiScore * 10) / 10 : null,
      category: cat,
      gapLevel,
      usedDefaultTarget,
    });
  }

  // Compute category scores (0-100)
  const categoryScores: Record<string, number> = {};
  let totalWeightedScore = 0;
  let totalMaxScore = 0;
  const allGaps: GapItem[] = [];

  for (const [cat, data] of Object.entries(categoryData)) {
    const pct = data.maxScore > 0 ? (data.totalScore / data.maxScore) * 100 : 100;
    categoryScores[cat] = Math.round(pct * 10) / 10;
    totalWeightedScore += data.totalScore;
    totalMaxScore += data.maxScore;
    allGaps.push(...data.gaps);
  }

  const overallScore = totalMaxScore > 0 ? Math.round((totalWeightedScore / totalMaxScore) * 1000) / 10 : 100;

  // Determine gap level
  let gapLevel: AnalysisResult["gapLevel"];
  if (overallScore < 40) gapLevel = "critical";
  else if (overallScore < 55) gapLevel = "high";
  else if (overallScore < 70) gapLevel = "moderate";
  else if (overallScore < 85) gapLevel = "low";
  else gapLevel = "none";

  // Sort gaps by severity
  allGaps.sort((a, b) => b.gapPercentage - a.gapPercentage);
  gapRecords.sort((a, b) => b.gapScore - a.gapScore);

  const summary = generateSummary(overallScore, gapLevel, categoryScores, allGaps);

  return { overallScore, gapLevel, categoryScores, identifiedGaps: allGaps, gapRecords, summary };
}

function generateSummary(
  overallScore: number,
  gapLevel: string,
  categoryScores: Record<string, number>,
  gaps: GapItem[]
): string {
  const weakCategories = Object.entries(categoryScores)
    .filter(([, score]) => score < 70)
    .sort(([, a], [, b]) => a - b)
    .map(([cat]) => CATEGORY_LABELS[cat] ?? cat);

  let summary = `Overall training readiness score: ${overallScore.toFixed(1)}%. `;

  if (gapLevel === "none") {
    summary += "The respondent demonstrates strong competency across all assessed areas with minimal training gaps identified.";
  } else if (gapLevel === "low") {
    summary += "Minor training gaps have been identified. Targeted development activities are recommended to strengthen specific competency areas.";
  } else if (gapLevel === "moderate") {
    summary += `Moderate training needs have been identified. `;
    if (weakCategories.length > 0) {
      summary += `Key areas requiring attention include: ${weakCategories.slice(0, 3).join(", ")}. `;
    }
    summary += "A structured training plan is recommended.";
  } else if (gapLevel === "high") {
    summary += `Significant training gaps have been identified across multiple areas. `;
    if (weakCategories.length > 0) {
      summary += `Priority areas for development: ${weakCategories.join(", ")}. `;
    }
    summary += "Immediate training intervention is strongly recommended.";
  } else {
    summary += "Critical training deficiencies have been identified. Urgent and comprehensive training intervention is required across all assessed competency areas.";
  }

  if (gaps.length > 0) {
    const topGap = gaps[0];
    summary += ` The most significant gap is in "${topGap.questionText}" (${topGap.gapPercentage.toFixed(1)}% gap vs. target proficiency).`;
  }

  return summary;
}

/**
 * Generate prioritized training recommendations based on analysis
 */
export function generateRecommendations(
  analysis: AnalysisResult,
  survey: { sectorId: number; skillAreaId?: number | null; respondentPosition?: string | null; respondentYearsExperience?: number | null }
): Array<{
  priority: string;
  category?: string;
  title: string;
  description: string;
  trainingType: string;
  estimatedDuration: string;
  estimatedCost: string;
  sortOrder: number;
}> {
  const recs: Array<{
    priority: string;
    category?: string;
    title: string;
    description: string;
    trainingType: string;
    estimatedDuration: string;
    estimatedCost: string;
    sortOrder: number;
  }> = [];

  let order = 0;

  // Critical gap recommendations
  if (analysis.gapLevel === "critical" || analysis.gapLevel === "high") {
    recs.push({
      priority: "critical",
      category: "organizational",
      title: "Immediate Comprehensive Training Program",
      description:
        "Given the critical training gaps identified, an immediate and comprehensive training intervention is required. This should include a full skills audit, structured learning pathway, and regular progress assessments.",
      trainingType: "formal_training",
      estimatedDuration: "3-6 months",
      estimatedCost: "High investment required",
      sortOrder: order++,
    });
  }

  // Category-specific recommendations
  for (const [cat, score] of Object.entries(analysis.categoryScores).sort(([, a], [, b]) => a - b)) {
    if (score >= 85) continue; // No recommendation needed

    const label = CATEGORY_LABELS[cat] ?? cat;
    let priority = "low";
    let trainingType = "self_directed";
    let duration = "1-2 weeks";
    let cost = "Low";

    if (score < 40) {
      priority = "critical";
      trainingType = "formal_training";
      duration = "2-3 months";
      cost = "High";
    } else if (score < 55) {
      priority = "high";
      trainingType = "workshop";
      duration = "3-4 weeks";
      cost = "Moderate-High";
    } else if (score < 70) {
      priority = "medium";
      trainingType = "mentoring";
      duration = "2-4 weeks";
      cost = "Moderate";
    }

    const catRec = getCategoryRecommendation(cat, score, label);
    recs.push({
      priority,
      category: cat,
      title: catRec.title,
      description: catRec.description,
      trainingType,
      estimatedDuration: duration,
      estimatedCost: cost,
      sortOrder: order++,
    });
  }

  // Skills assessment recommendation
  if (analysis.identifiedGaps.length > 3) {
    recs.push({
      priority: "medium",
      category: "individual",
      title: "Formal Skills Assessment",
      description:
        "Conduct a formal skills assessment to validate current competency levels and establish a baseline for measuring training effectiveness. This will help prioritize training investments and track progress over time.",
      trainingType: "assessment",
      estimatedDuration: "1-2 days",
      estimatedCost: "Low-Moderate",
      sortOrder: order++,
    });
  }

  // On-the-job learning
  recs.push({
    priority: "low",
    category: "job_task",
    title: "Structured On-the-Job Learning",
    description:
      "Complement formal training with structured on-the-job learning opportunities. Assign mentors, create learning projects, and establish regular check-ins to reinforce new skills in the work environment.",
    trainingType: "on_the_job",
    estimatedDuration: "Ongoing",
    estimatedCost: "Low",
    sortOrder: order++,
  });

  // Evaluation recommendation
  recs.push({
    priority: "low",
    category: "evaluation_success",
    title: "Post-Training Evaluation Framework",
    description:
      "Establish clear success metrics and evaluation checkpoints to measure training effectiveness. Schedule follow-up assessments at 30, 60, and 90 days post-training to track skill retention and application.",
    trainingType: "assessment",
    estimatedDuration: "Ongoing",
    estimatedCost: "Low",
    sortOrder: order++,
  });

  return recs;
}

function getCategoryRecommendation(cat: string, score: number, label: string) {
  const templates: Record<string, { title: string; description: string }> = {
    organizational: {
      title: `${label} Training — Organizational Alignment`,
      description: `Score: ${score.toFixed(1)}%. Training gaps at the organizational level indicate misalignment between individual capabilities and organizational goals. Recommended actions include organizational needs assessment workshops, strategic planning participation, and policy/procedure training sessions.`,
    },
    job_task: {
      title: `${label} Training — Technical Skills Development`,
      description: `Score: ${score.toFixed(1)}%. Job and task-level gaps indicate specific technical skills requiring development. Recommended actions include task-specific training modules, hands-on practice sessions, competency-based assessments, and job shadowing with experienced practitioners.`,
    },
    individual: {
      title: `${label} Training — Personal Competency Development`,
      description: `Score: ${score.toFixed(1)}%. Individual-level gaps suggest personal development opportunities. Recommended actions include personalized learning plans, coaching sessions, self-assessment tools, and targeted skill-building workshops aligned with career goals.`,
    },
    training_feasibility: {
      title: `${label} — Training Infrastructure Review`,
      description: `Score: ${score.toFixed(1)}%. Training feasibility gaps indicate potential barriers to effective training delivery. Recommended actions include resource assessment, training environment evaluation, scheduling optimization, and stakeholder engagement to address constraints.`,
    },
    evaluation_success: {
      title: `${label} — Measurement & Accountability Framework`,
      description: `Score: ${score.toFixed(1)}%. Gaps in evaluation and success criteria suggest inadequate measurement frameworks. Recommended actions include defining clear KPIs, establishing baseline measurements, implementing regular progress reviews, and creating accountability structures.`,
    },
  };

  return (
    templates[cat] ?? {
      title: `${label} — Development Program`,
      description: `Score: ${score.toFixed(1)}%. Training gaps identified in this area require structured intervention. A customized development program is recommended.`,
    }
  );
}
