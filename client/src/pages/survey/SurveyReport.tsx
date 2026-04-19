/**
 * Survey Report — ONE OBJECTIVE: Understand your training gaps and download the report.
 * Rules: score + top 3 gaps are the hero · details collapsed · Download PDF always visible
 */
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, Download, AlertTriangle, CheckCircle2,
  TrendingUp, ChevronDown, ChevronUp, Loader2, BarChart3
} from "lucide-react";
import { CATEGORY_LABELS } from "@/types/tna";

const GAP_LEVEL_CONFIG: Record<string, { bg: string; text: string; border: string; label: string; dot: string }> = {
  critical: { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200",    label: "Critical Gap",  dot: "bg-red-500" },
  high:     { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", label: "High Gap",      dot: "bg-orange-500" },
  moderate: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", label: "Moderate Gap",  dot: "bg-yellow-500" },
  medium:   { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", label: "Moderate Gap",  dot: "bg-yellow-500" },
  low:      { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200",  label: "Low Gap",       dot: "bg-green-500" },
  none:     { bg: "bg-slate-50",  text: "text-slate-600",  border: "border-slate-200",  label: "No Gap",        dot: "bg-slate-400" },
};

const PRIORITY_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: "bg-red-100",    text: "text-red-700",    label: "Critical" },
  high:     { bg: "bg-orange-100", text: "text-orange-700", label: "High" },
  medium:   { bg: "bg-yellow-100", text: "text-yellow-700", label: "Medium" },
  low:      { bg: "bg-green-100",  text: "text-green-700",  label: "Low" },
};

export default function SurveyReport() {
  const { surveyId } = useParams<{ surveyId: string }>();
  const [, navigate] = useLocation();
  const [showAllGaps, setShowAllGaps] = useState(false);
  const [showCategoryBreakdown, setShowCategoryBreakdown] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const id = parseInt(surveyId || "0");
  const { data: reportData, isLoading } = trpc.reports.getBySurvey.useQuery({ surveyId: id });

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/reports/${reportData?.report.id}/pdf`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tna-report-${reportData?.report.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("PDF exported!");
    } catch {
      toast.error("PDF export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-slate-700">Analyzing your results…</p>
        <p className="text-xs text-slate-500">This may take a few seconds</p>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <p className="text-slate-500">Report not found.</p>
        <Button onClick={() => navigate("/survey/start")}>Start New Survey</Button>
      </div>
    );
  }

  const { report, sector, skillArea, recommendations } = reportData;
  const overallScore = Math.round(parseFloat(String(report.overallScore || 0)));
  const gapLevel = (report.gapLevel || "none") as string;
  const gapConfig = GAP_LEVEL_CONFIG[gapLevel] || GAP_LEVEL_CONFIG.none;
  const identifiedGaps = (report.identifiedGaps as Array<{ category: string; questionText: string; gapPercentage: number }>) || [];
  const categoryScores = (report.categoryScores as Record<string, number>) || {};

  const topGaps = [...identifiedGaps].sort((a, b) => b.gapPercentage - a.gapPercentage).slice(0, 3);
  const remainingGaps = identifiedGaps.length > 3 ? identifiedGaps.length - 3 : 0;

  const scoreColor = overallScore >= 80 ? "text-green-600" : overallScore >= 60 ? "text-yellow-600" : overallScore >= 40 ? "text-orange-600" : "text-red-600";
  const scoreLabel = overallScore >= 80 ? "Strong" : overallScore >= 60 ? "Moderate" : overallScore >= 40 ? "Needs Work" : "Critical";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* Sticky header — back + download PDF always visible */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto w-full">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </button>
          <Button
            size="sm"
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex-shrink-0"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
            {isExporting ? "Exporting…" : "Download PDF"}
          </Button>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full space-y-4">

        {/* HERO: Score + gap level */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                {sector?.name || "Assessment"}{skillArea ? ` · ${skillArea.name}` : ""}
              </p>
              <h1 className="text-lg font-bold text-slate-900">Your TNA Results</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {new Date(report.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className={`text-4xl font-bold leading-none ${scoreColor}`}>{overallScore}</p>
              <p className="text-xs text-slate-500 mt-1">/ 100</p>
              <p className={`text-xs font-semibold mt-1 ${scoreColor}`}>{scoreLabel}</p>
            </div>
          </div>

          {/* Gap level badge */}
          <div className={`mt-4 flex items-center gap-2 px-3 py-2 rounded-lg border ${gapConfig.bg} ${gapConfig.border}`}>
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${gapConfig.dot}`} />
            <span className={`text-sm font-semibold ${gapConfig.text}`}>{gapConfig.label}</span>
            {gapLevel === "critical" || gapLevel === "high" ? (
              <AlertTriangle className={`w-3.5 h-3.5 ml-auto ${gapConfig.text}`} />
            ) : (
              <CheckCircle2 className={`w-3.5 h-3.5 ml-auto ${gapConfig.text}`} />
            )}
          </div>
        </div>

        {/* TOP 3 GAPS — the most actionable info */}
        {topGaps.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <h2 className="text-sm font-bold text-slate-900">Top Training Gaps</h2>
                <span className="ml-auto text-xs text-slate-400">{identifiedGaps.length} total</span>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {topGaps.map((gap, i) => {
                const pct = Math.round(gap.gapPercentage);
                const barColor = pct >= 70 ? "bg-red-500" : pct >= 40 ? "bg-orange-500" : "bg-yellow-500";
                return (
                  <div key={i} className="px-5 py-3.5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="text-sm text-slate-800 font-medium leading-snug">{gap.questionText}</p>
                      <span className={`text-xs font-bold flex-shrink-0 ${pct >= 70 ? "text-red-600" : pct >= 40 ? "text-orange-600" : "text-yellow-600"}`}>
                        {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {CATEGORY_LABELS[gap.category as keyof typeof CATEGORY_LABELS] || gap.category}
                    </p>
                  </div>
                );
              })}
            </div>
            {remainingGaps > 0 && (
              <button
                onClick={() => setShowAllGaps(!showAllGaps)}
                className="w-full flex items-center justify-center gap-1.5 px-5 py-3 text-xs text-slate-500 hover:bg-slate-50 transition-colors border-t border-slate-100"
              >
                {showAllGaps ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {showAllGaps ? "Show less" : `Show ${remainingGaps} more gap${remainingGaps > 1 ? "s" : ""}`}
              </button>
            )}
            {showAllGaps && (
              <div className="divide-y divide-slate-100 border-t border-slate-100">
                {identifiedGaps.slice(3).map((gap, i) => {
                  const pct = Math.round(gap.gapPercentage);
                  return (
                    <div key={i} className="px-5 py-3 flex items-center justify-between gap-3">
                      <p className="text-sm text-slate-700 leading-snug">{gap.questionText}</p>
                      <span className="text-xs font-semibold text-slate-600 flex-shrink-0">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Category breakdown — collapsed by default */}
        {Object.keys(categoryScores).length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowCategoryBreakdown(!showCategoryBreakdown)}
              className="w-full flex items-center justify-between px-5 py-4 text-sm hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-slate-900">Category Breakdown</span>
              </div>
              {showCategoryBreakdown ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {showCategoryBreakdown && (
              <div className="border-t border-slate-100 px-5 py-4 space-y-3">
                {Object.entries(categoryScores).map(([cat, score]) => {
                  const s = Math.round(score);
                  const barColor = s >= 80 ? "bg-green-500" : s >= 60 ? "bg-yellow-500" : s >= 40 ? "bg-orange-500" : "bg-red-500";
                  const textColor = s >= 80 ? "text-green-600" : s >= 60 ? "text-yellow-600" : s >= 40 ? "text-orange-600" : "text-red-600";
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-slate-700">
                          {CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] || cat}
                        </span>
                        <span className={`text-xs font-bold ${textColor}`}>{s}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(s, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Recommendations — collapsed by default */}
        {recommendations && recommendations.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowRecommendations(!showRecommendations)}
              className="w-full flex items-center justify-between px-5 py-4 text-sm hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="font-semibold text-slate-900">Training Recommendations</span>
                <span className="text-xs text-slate-400">({recommendations.length})</span>
              </div>
              {showRecommendations ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {showRecommendations && (
              <div className="border-t border-slate-100 divide-y divide-slate-100">
                {recommendations.map((rec: any, i: number) => {
                  const priority = (rec.priority || "medium") as string;
                  const pConfig = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
                  return (
                    <div key={i} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <p className="text-sm font-semibold text-slate-900">{rec.title || rec.trainingArea}</p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${pConfig.bg} ${pConfig.text}`}>
                          {pConfig.label}
                        </span>
                      </div>
                      {rec.description && (
                        <p className="text-xs text-slate-500 leading-relaxed">{rec.description}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Start new survey CTA */}
        <div className="pt-2 pb-6">
          <button
            onClick={() => navigate("/survey/start")}
            className="w-full text-center text-sm text-slate-500 hover:text-primary transition-colors py-2"
          >
            Take another assessment →
          </button>
        </div>
      </main>
    </div>
  );
}
