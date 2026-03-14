import type { Express, Request, Response } from "express";
import { getDb } from "./db";
import { reports, recommendations, sectors, skillAreas, users, surveys } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { sdk } from "./_core/sdk";

const CATEGORY_LABELS: Record<string, string> = {
  organizational: "Organizational-Level Criteria",
  job_task: "Job / Task-Level Criteria",
  individual: "Individual-Level Criteria",
  feasibility: "Training Feasibility",
  evaluation: "Evaluation & Success Criteria",
};

const GAP_LABELS: Record<string, string> = {
  critical: "Critical Gap",
  high: "High Gap",
  moderate: "Moderate Gap",
  low: "Low Gap",
  none: "No Gap",
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: "Critical Priority",
  high: "High Priority",
  medium: "Medium Priority",
  low: "Low Priority",
};

export function registerPDFRoutes(app: Express) {
  app.get("/api/reports/:reportId/pdf", async (req: Request, res: Response) => {
    try {
      // Authenticate user
      const cookieName = "tna_session";
      const allCookies = req.headers.cookie || "";
      const sessionToken = allCookies
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith(`${cookieName}=`))
        ?.split("=")[1];

      if (!sessionToken) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      let userId: number;
      try {
        const user = await sdk.authenticateRequest(req);
        userId = user.id;
      } catch {
        return res.status(401).json({ error: "Invalid session" });
      }

      const db = await getDb();
      if (!db) return res.status(500).json({ error: "Database unavailable" });

      const reportId = parseInt(req.params.reportId);
      if (isNaN(reportId)) return res.status(400).json({ error: "Invalid report ID" });

      // Fetch report
      const reportRows = await db.select().from(reports).where(eq(reports.id, reportId)).limit(1);
      if (!reportRows.length) return res.status(404).json({ error: "Report not found" });
      const report = reportRows[0];

      // Check ownership or admin
      const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const user = userRows[0];
      if (!user) return res.status(401).json({ error: "User not found" });

      // Fetch survey to check ownership
      const surveyRows = await db.select().from(surveys).where(eq(surveys.id, report.surveyId)).limit(1);
      const survey = surveyRows[0];
      if (!survey) return res.status(404).json({ error: "Survey not found" });

      if (survey.userId !== userId && user.role !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Fetch related data
      const sectorRows = await db.select().from(sectors).where(eq(sectors.id, report.sectorId)).limit(1);
      const sector = sectorRows[0];

      let skillArea = null;
      if (report.skillAreaId) {
        const saRows = await db.select().from(skillAreas).where(eq(skillAreas.id, report.skillAreaId)).limit(1);
        skillArea = saRows[0] || null;
      }

      const recs = await db.select().from(recommendations).where(eq(recommendations.reportId, reportId));

      // Generate HTML-based PDF content
      const overallScore = parseFloat(String(report.overallScore || 0));
      const gapLevel = report.gapLevel || "none";
      const identifiedGaps = (report.identifiedGaps as Array<{ category: string; questionText: string; gapPercentage: number }>) || [];
      const categoryScores = (report.categoryScores as Record<string, number>) || {};

      const getScoreColor = (score: number) => {
        if (score >= 80) return "#16a34a";
        if (score >= 60) return "#ca8a04";
        if (score >= 40) return "#ea580c";
        return "#dc2626";
      };

      const getScoreLabel = (score: number) => {
        if (score >= 80) return "Strong";
        if (score >= 60) return "Moderate";
        if (score >= 40) return "Needs Improvement";
        return "Critical Gap";
      };

      const getPriorityColor = (priority: string) => {
        const colors: Record<string, string> = {
          critical: "#dc2626",
          high: "#ea580c",
          medium: "#ca8a04",
          low: "#16a34a",
        };
        return colors[priority] || "#6b7280";
      };

      const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>TNA Report #${report.id}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #1e293b; background: #fff; }
  .page { max-width: 800px; margin: 0 auto; padding: 40px; }
  .header { background: linear-gradient(135deg, #1e3a8a, #1d4ed8); color: white; padding: 30px; border-radius: 12px; margin-bottom: 24px; }
  .header h1 { font-size: 22px; font-weight: bold; margin-bottom: 6px; }
  .header .subtitle { font-size: 14px; opacity: 0.85; margin-bottom: 4px; }
  .header .meta { font-size: 11px; opacity: 0.7; }
  .score-badge { float: right; text-align: right; }
  .score-badge .score-num { font-size: 48px; font-weight: bold; line-height: 1; }
  .score-badge .score-label { font-size: 12px; opacity: 0.85; }
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
  .stat-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; text-align: center; }
  .stat-card .stat-value { font-size: 24px; font-weight: bold; margin-bottom: 4px; }
  .stat-card .stat-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 14px; font-weight: bold; color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 6px; margin-bottom: 14px; }
  .progress-row { margin-bottom: 10px; }
  .progress-label { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px; }
  .progress-bar { height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
  .progress-fill { height: 100%; border-radius: 4px; }
  .gap-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border: 1px solid #fed7aa; background: #fff7ed; border-radius: 6px; margin-bottom: 6px; font-size: 11px; }
  .rec-item { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 10px; }
  .rec-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; }
  .rec-title { font-weight: bold; font-size: 12px; color: #1e293b; }
  .rec-priority { font-size: 10px; font-weight: bold; padding: 2px 8px; border-radius: 10px; color: white; }
  .rec-desc { font-size: 11px; color: #475569; line-height: 1.5; margin-bottom: 6px; }
  .rec-meta { font-size: 10px; color: #64748b; }
  .summary-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; font-size: 11px; line-height: 1.7; color: #0c4a6e; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 10px; color: #94a3b8; }
  .clearfix::after { content: ""; display: table; clear: both; }
</style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <div class="header clearfix">
    <div class="score-badge">
      <div class="score-num">${Math.round(overallScore)}</div>
      <div class="score-label">Overall Score</div>
      <div class="score-label" style="font-weight:bold;">${getScoreLabel(overallScore)}</div>
    </div>
    <div>
      <div style="font-size:11px; opacity:0.7; margin-bottom:6px;">TRAINING NEEDS ANALYSIS REPORT</div>
      <h1>${sector?.name || "Training Needs Analysis"}</h1>
      ${skillArea ? `<div class="subtitle">${skillArea.name}</div>` : ""}
      <div class="meta">Report #${report.id} &nbsp;|&nbsp; Generated: ${new Date(report.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
      <div class="meta" style="margin-top:4px;">Gap Level: <strong>${GAP_LABELS[gapLevel] || gapLevel}</strong></div>
    </div>
  </div>

  <!-- Stats -->
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-value" style="color:${getScoreColor(overallScore)}">${Math.round(overallScore)}%</div>
      <div class="stat-label">Overall Score</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" style="color:#ea580c; text-transform:capitalize;">${gapLevel}</div>
      <div class="stat-label">Gap Level</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" style="color:#7c3aed;">${identifiedGaps.length}</div>
      <div class="stat-label">Priority Gaps</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" style="color:#16a34a;">${recs.length}</div>
      <div class="stat-label">Recommendations</div>
    </div>
  </div>

  <!-- Category Scores -->
  ${Object.keys(categoryScores).length > 0 ? `
  <div class="section">
    <div class="section-title">Category Breakdown</div>
    ${Object.entries(categoryScores).map(([cat, score]) => `
    <div class="progress-row">
      <div class="progress-label">
        <span>${CATEGORY_LABELS[cat] || cat}</span>
        <span style="font-weight:bold; color:${getScoreColor(score)}">${Math.round(score)}%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${Math.min(score, 100)}%; background:${getScoreColor(score)};"></div>
      </div>
    </div>`).join("")}
  </div>` : ""}

  <!-- Identified Gaps -->
  ${identifiedGaps.length > 0 ? `
  <div class="section">
    <div class="section-title">Training Gaps Identified</div>
    ${identifiedGaps.slice(0, 10).map((gap) => `
    <div class="gap-item">
      <span>${gap.questionText}</span>
      <span style="color:#ea580c; font-weight:bold; white-space:nowrap; margin-left:12px;">${Math.round(gap.gapPercentage)}% gap</span>
    </div>`).join("")}
  </div>` : ""}

  <!-- Recommendations -->
  ${recs.length > 0 ? `
  <div class="section">
    <div class="section-title">Training Recommendations</div>
    ${recs.map((rec) => `
    <div class="rec-item">
      <div class="rec-header">
        <div class="rec-title">${rec.title}</div>
        <div class="rec-priority" style="background:${getPriorityColor(rec.priority || "medium")}">${PRIORITY_LABELS[rec.priority || "medium"] || rec.priority}</div>
      </div>
      <div class="rec-desc">${rec.description}</div>
      <div class="rec-meta">
        ${rec.trainingType ? `Type: <strong>${rec.trainingType.replace(/_/g, " ")}</strong>` : ""}
        ${rec.estimatedDuration ? ` &nbsp;|&nbsp; Duration: <strong>${rec.estimatedDuration}</strong>` : ""}
        ${rec.estimatedCost ? ` &nbsp;|&nbsp; Est. Cost: <strong>${rec.estimatedCost}</strong>` : ""}
      </div>
    </div>`).join("")}
  </div>` : ""}

  <!-- Summary -->
  ${report.summary ? `
  <div class="section">
    <div class="section-title">Executive Summary</div>
    <div class="summary-box">${report.summary}</div>
  </div>` : ""}

  <div class="footer">
    Training Needs Analysis System &nbsp;|&nbsp; WorldSkills Philippines &nbsp;|&nbsp; Report generated ${new Date().toLocaleDateString()}
  </div>
</div>
</body>
</html>`;

      // Use puppeteer-like approach - just return HTML as PDF via browser print
      // Since we can't use puppeteer in this environment, we'll use a simple HTML-to-PDF approach
      // by sending the HTML with print-ready CSS and a Content-Disposition header
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="tna-report-${report.id}.html"`);
      return res.send(html);
    } catch (error) {
      console.error("[PDF Export] Error:", error);
      return res.status(500).json({ error: "Failed to generate report" });
    }
  });
}
