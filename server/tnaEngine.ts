/**
 * TNA Analysis Engine
 * Performs gap analysis and generates training recommendations
 */

type ResponseWithQuestion = {
  response: {
    id: number;
    surveyId: number;
    questionId: number;
    responseText: string | null;
    responseValue: number | null;
    responseOptions: string[] | null;
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

export type AnalysisResult = {
  overallScore: number;
  gapLevel: "critical" | "high" | "moderate" | "low" | "none";
  categoryScores: Record<string, number>;
  identifiedGaps: GapItem[];
  summary: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  organizational: "Organizational Level",
  job_task: "Job/Task Level",
  individual: "Individual Level",
  training_feasibility: "Training Feasibility",
  evaluation_success: "Evaluation & Success Criteria",
};

/**
 * Analyze survey responses and compute gap scores
 */
export function analyzeGaps(responsesWithQuestions: ResponseWithQuestion[]): AnalysisResult {
  const categoryData: Record<string, { totalScore: number; maxScore: number; gaps: GapItem[] }> = {};

  for (const { response, question } of responsesWithQuestions) {
    if (!question) continue;

    const cat = question.category;
    if (!categoryData[cat]) {
      categoryData[cat] = { totalScore: 0, maxScore: 0, gaps: [] };
    }

    const weight = question.weight ?? 1;
    const maxVal = question.maxValue ?? 5;
    const minVal = question.minValue ?? 1;
    const range = maxVal - minVal;

    let score = 0;
    let maxScore = 0;

    if (question.questionType === "rating" || question.questionType === "scale") {
      const val = response.responseValue ?? minVal;
      score = ((val - minVal) / range) * 100 * weight;
      maxScore = 100 * weight;
    } else if (question.questionType === "yes_no") {
      // "yes" = 100, "no" = 0
      const val = response.responseText?.toLowerCase();
      score = val === "yes" ? 100 * weight : 0;
      maxScore = 100 * weight;
    } else if (question.questionType === "multiple_choice") {
      // Scored based on position in options (first = best)
      const opts = question.options ?? [];
      const chosen = response.responseText ?? "";
      const idx = opts.indexOf(chosen);
      if (idx >= 0 && opts.length > 1) {
        score = ((opts.length - 1 - idx) / (opts.length - 1)) * 100 * weight;
      }
      maxScore = 100 * weight;
    } else if (question.questionType === "text") {
      // Text responses get a neutral 60% score (can't auto-score)
      score = 60 * weight;
      maxScore = 100 * weight;
    } else {
      score = 60 * weight;
      maxScore = 100 * weight;
    }

    categoryData[cat].totalScore += score;
    categoryData[cat].maxScore += maxScore;

    // Identify gap if score < 60%
    const pct = maxScore > 0 ? (score / maxScore) * 100 : 100;
    if (pct < 70) {
      categoryData[cat].gaps.push({
        category: cat,
        questionId: question.id,
        questionText: question.questionText,
        score: Math.round(score * 10) / 10,
        maxScore: Math.round(maxScore * 10) / 10,
        gapPercentage: Math.round((100 - pct) * 10) / 10,
      });
    }
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

  // Generate summary
  const summary = generateSummary(overallScore, gapLevel, categoryScores, allGaps);

  return { overallScore, gapLevel, categoryScores, identifiedGaps: allGaps, summary };
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
    summary += ` A total of ${gaps.length} specific skill gap${gaps.length > 1 ? "s" : ""} ${gaps.length > 1 ? "have" : "has"} been identified for targeted remediation.`;
  }

  return summary;
}

/**
 * Generate prioritized training recommendations based on analysis
 */
export function generateRecommendations(
  analysis: AnalysisResult,
  survey: { sectorId: number; skillAreaId?: number | null }
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
