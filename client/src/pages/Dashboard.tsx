/**
 * Staff Dashboard — ONE OBJECTIVE: Take your assigned survey.
 * Rules: active survey card is the hero · history collapsed · no sidebar clutter
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import StaffLayout from "@/components/StaffLayout";
import {
  BookOpen, FileText, ChevronRight,
  Loader2, AlertTriangle, Clock, ArrowRight, ChevronDown, ChevronUp, AlertCircle
} from "lucide-react";
import { useState } from "react";

const GAP_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  critical: { label: "Critical Gap", bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
  high:     { label: "High Gap",     bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500" },
  moderate: { label: "Medium Gap",   bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500" },
  medium:   { label: "Medium Gap",   bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500" },
  low:      { label: "Low Gap",      bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-500" },
  none:     { label: "No Gap",       bg: "bg-slate-100",  text: "text-slate-600",  dot: "bg-slate-400" },
};

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [showHistory, setShowHistory] = useState(false);

  const { data: reports, isLoading: reportsLoading } = trpc.reports.myReports.useQuery(
    undefined,
    { enabled: !!user }
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate("/");
    return null;
  }

  const recentReports = reports || [];
  const latestReport = recentReports[0];
  const hasCompletedSurvey = recentReports.length > 0;
  const criticalCount = recentReports.filter((r: any) => r.report?.gapLevel === "critical").length;

  return (
    <StaffLayout>
      <div className="space-y-5 max-w-2xl">

        {/* Greeting — minimal */}
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Hi, {user.name?.split(" ")[0] || "there"} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {hasCompletedSurvey
              ? "You've completed a TNA survey. Start a new one anytime."
              : "Complete your TNA survey to discover your training needs."}
          </p>
        </div>

        {/* Profile incomplete warning */}
        {(!user?.tnaRole || !user?.organization) && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-800">Complete your profile first</p>
              <p className="text-xs text-amber-700 mt-0.5">Add your role and organization for accurate results.</p>
            </div>
            <Button size="sm" variant="outline" className="border-amber-400 text-amber-800 hover:bg-amber-100 flex-shrink-0 text-xs" onClick={() => navigate("/profile-setup")}>
              Update
            </Button>
          </div>
        )}

        {/* HERO: Primary action card */}
        <div
          className="bg-primary rounded-2xl p-6 cursor-pointer hover:bg-primary/90 transition-colors"
          onClick={() => navigate("/survey/start")}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg font-bold text-white leading-tight">
                {hasCompletedSurvey ? "Start New Assessment" : "Start Your Assessment"}
              </h2>
              <p className="text-sm text-white/70">
                {hasCompletedSurvey
                  ? "Take another TNA survey to track your progress."
                  : "Answer questions about your competencies. Takes ~15 minutes."}
              </p>
            </div>
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        {/* Latest result — if exists, show as a secondary card */}
        {latestReport && (() => {
          const report = latestReport.report;
          const sector = latestReport.sector;
          const gapLevel = report?.gapLevel || "none";
          const gapConfig = GAP_CONFIG[gapLevel] || GAP_CONFIG.none;
          const score = Math.round(parseFloat(String(report?.overallScore || 0)));
          return (
            <div
              className="bg-white border border-slate-200 rounded-xl p-4 cursor-pointer hover:shadow-sm transition-shadow"
              onClick={() => navigate(`/survey/${report?.surveyId}/report`)}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${gapConfig.dot}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      Latest: {sector?.name || "Assessment"}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {report?.createdAt
                        ? new Date(report.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${gapConfig.bg} ${gapConfig.text}`}>
                    {gapConfig.label}
                  </span>
                  <span className={`text-base font-bold ${score >= 80 ? "text-green-600" : score >= 60 ? "text-yellow-600" : "text-red-600"}`}>
                    {score}%
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>
          );
        })()}

        {/* Critical gap alert */}
        {criticalCount > 0 && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800 font-medium">
              {criticalCount} critical gap{criticalCount > 1 ? "s" : ""} identified — view your report for training recommendations.
            </p>
          </div>
        )}

        {/* History — collapsed by default */}
        {recentReports.length > 1 && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="font-medium">Survey History</span>
                <Badge variant="secondary" className="text-xs">{recentReports.length}</Badge>
              </div>
              {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showHistory && (
              <div className="border-t border-slate-100">
                {reportsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {recentReports.slice(1).map((item: any) => {
                      const report = item.report;
                      const sector = item.sector;
                      const gapLevel = report?.gapLevel || "none";
                      const gapConfig = GAP_CONFIG[gapLevel] || GAP_CONFIG.none;
                      const score = Math.round(parseFloat(String(report?.overallScore || 0)));
                      return (
                        <div
                          key={report?.id}
                          className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
                          onClick={() => navigate(`/survey/${report?.surveyId}/report`)}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">{sector?.name || "Assessment"}</p>
                              <p className="text-xs text-slate-500">
                                {report?.createdAt
                                  ? new Date(report.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                  : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-xs font-medium ${gapConfig.text}`}>{gapConfig.label}</span>
                            <span className={`text-sm font-bold ${score >= 80 ? "text-green-600" : score >= 60 ? "text-yellow-600" : "text-red-600"}`}>
                              {score}%
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </StaffLayout>
  );
}
