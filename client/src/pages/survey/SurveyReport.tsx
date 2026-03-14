import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, Download, BookOpen, AlertTriangle, CheckCircle2,
  TrendingUp, Clock, Star, ChevronDown, ChevronUp, Loader2,
  BarChart3, Target, Award, Users
} from "lucide-react";
import { CATEGORY_LABELS } from "@/types/tna";

const PRIORITY_CONFIG = {
  critical: { color: "bg-red-100 text-red-700 border-red-200", icon: "🔴", label: "Critical" },
  high: { color: "bg-orange-100 text-orange-700 border-orange-200", icon: "🟠", label: "High" },
  medium: { color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: "🟡", label: "Medium" },
  low: { color: "bg-green-100 text-green-700 border-green-200", icon: "🟢", label: "Low" },
};

const TRAINING_TYPE_ICONS: Record<string, string> = {
  formal_training: "🎓",
  on_the_job: "🔧",
  mentoring: "👥",
  self_study: "📚",
  workshop: "🏫",
  online_course: "💻",
  certification: "🏆",
  coaching: "🎯",
};

export default function SurveyReport() {
  const { surveyId } = useParams<{ surveyId: string }>();
  const [, navigate] = useLocation();
  const [expandedRec, setExpandedRec] = useState<number | null>(null);
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
      toast.success("PDF exported successfully!");
    } catch (err) {
      toast.error("PDF export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="font-semibold text-foreground">Generating your report...</p>
          <p className="text-sm text-muted-foreground mt-1">Analyzing training needs and preparing recommendations</p>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Report not found.</p>
          <Button onClick={() => navigate("/survey/start")}>Start New Survey</Button>
        </div>
      </div>
    );
  }

  const { report, sector, skillArea, recommendations } = reportData;
  const overallScore = report.overallScore ? parseFloat(String(report.overallScore)) : 0;
  const gapLevel = report.gapLevel || "none";
  const identifiedGaps = (report.identifiedGaps as Array<{category: string; questionText: string; gapPercentage: number}>) || [];
  const categoryScores = (report.categoryScores as Record<string, number>) || {};

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Strong";
    if (score >= 60) return "Moderate";
    if (score >= 40) return "Needs Improvement";
    return "Critical Gap";
  };

  return (
    <div className="min-h-screen bg-muted/30 print:bg-white">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 print:hidden">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/dashboard")} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <span className="font-display font-semibold text-foreground">Training Needs Analysis Report</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              Print
            </Button>
            <Button size="sm" onClick={handleExportPDF} disabled={isExporting}>
              {isExporting ? (
                <Loader2 className="mr-2 w-4 h-4 animate-spin" />
              ) : (
                <Download className="mr-2 w-4 h-4" />
              )}
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="container py-8 max-w-4xl">
        {/* Report Header */}
        <div className="bg-gradient-to-r from-primary to-blue-700 rounded-2xl p-6 text-white mb-6 print:bg-primary">
          <div className="flex items-start justify-between">
            <div>
              <Badge className="bg-white/20 text-white border-white/30 mb-3">Training Needs Analysis Report</Badge>
              <h1 className="font-display text-2xl font-bold mb-1">{sector?.name || "Sector"}</h1>
              {skillArea && <p className="text-blue-100 text-sm mb-2">{skillArea.name}</p>}
              <p className="text-blue-100 text-xs">
                Generated on {new Date(report.createdAt).toLocaleDateString("en-US", {
                  year: "numeric", month: "long", day: "numeric"
                })}
              </p>
            </div>
            <div className="text-right">
              <div className={`text-5xl font-bold font-display ${overallScore >= 60 ? "text-white" : "text-red-200"}`}>
                {Math.round(overallScore)}
              </div>
              <div className="text-blue-100 text-sm">Overall Score</div>
              <div className="text-white font-semibold text-sm mt-1">{getScoreLabel(overallScore)}</div>
            </div>
          </div>
        </div>

        {/* Score Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 text-center">
              <BarChart3 className="w-6 h-6 text-primary mx-auto mb-2" />
              <div className={`text-2xl font-bold font-display ${getScoreColor(overallScore)}`}>
                {Math.round(overallScore)}%
              </div>
              <div className="text-xs text-muted-foreground">Overall Score</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <AlertTriangle className="w-6 h-6 text-orange-500 mx-auto mb-2" />
              <div className="text-2xl font-bold font-display text-orange-600 capitalize">
                {gapLevel}
              </div>
              <div className="text-xs text-muted-foreground">Gap Level</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <Target className="w-6 h-6 text-purple-500 mx-auto mb-2" />
              <div className="text-2xl font-bold font-display text-purple-600">
                {identifiedGaps.length}
              </div>
              <div className="text-xs text-muted-foreground">Priority Gaps</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <Award className="w-6 h-6 text-green-500 mx-auto mb-2" />
              <div className="text-2xl font-bold font-display text-green-600">
                {recommendations?.length || 0}
              </div>
              <div className="text-xs text-muted-foreground">Recommendations</div>
            </CardContent>
          </Card>
        </div>

        {/* Category Scores */}
        {Object.keys(categoryScores).length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="font-display text-base flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Category Breakdown
              </CardTitle>
              <CardDescription>Performance scores across all assessment categories</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(categoryScores).map(([cat, score]) => (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">
                      {CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] || cat}
                    </span>
                    <span className={`text-sm font-semibold ${getScoreColor(score)}`}>
                      {Math.round(score)}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${getScoreBg(score)}`}
                      style={{ width: `${Math.min(score, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Priority Gaps */}
        {identifiedGaps.length > 0 && (
          <Card className="mb-6 border-orange-200 bg-orange-50/50">
            <CardHeader>
              <CardTitle className="font-display text-base flex items-center gap-2 text-orange-700">
                <AlertTriangle className="w-5 h-5" />
                Training Gaps Identified
              </CardTitle>
              <CardDescription>Areas requiring attention based on your assessment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {identifiedGaps.slice(0, 8).map((gap, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-white rounded-lg border border-orange-200">
                    <span className="text-sm text-orange-700 font-medium">{gap.questionText}</span>
                    <Badge variant="outline" className="border-orange-300 text-orange-700 bg-white text-xs">
                      {Math.round(gap.gapPercentage)}% gap
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recommendations */}
        {recommendations && recommendations.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="font-display text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Training Recommendations
              </CardTitle>
              <CardDescription>
                Prioritized recommendations based on your identified training needs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommendations.map((rec, i) => {
                  const priority = (rec.priority || "medium") as keyof typeof PRIORITY_CONFIG;
                  const config = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.medium;
                const isExpanded = expandedRec === i;

                return (
                  <div key={i} className={`rounded-xl border p-4 ${config.color}`}>
                    <button
                      className="w-full text-left"
                      onClick={() => setExpandedRec(isExpanded ? null : i)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <span className="text-lg mt-0.5">{(rec.trainingType ? TRAINING_TYPE_ICONS[rec.trainingType] : null) || "📋"}</span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm">{rec.title}</span>
                              <Badge variant="outline" className={`text-xs ${config.color}`}>
                                {config.icon} {config.label}
                              </Badge>
                              {rec.estimatedDuration && (
                                <span className="flex items-center gap-1 text-xs opacity-75">
                                  <Clock className="w-3 h-3" />
                                  {rec.estimatedDuration}
                                </span>
                              )}
                            </div>
                            <p className="text-xs opacity-75 mt-0.5 line-clamp-1">{rec.description}</p>
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 flex-shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 flex-shrink-0 mt-1" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-current/20 space-y-2">
                        <p className="text-sm">{rec.description}</p>

                        <div className="flex items-center gap-4 text-xs opacity-75 pt-1">
                          <span>Type: <strong>{rec.trainingType?.replace(/_/g, " ")}</strong></span>
                          {rec.estimatedDuration && <span>Duration: <strong>{rec.estimatedDuration}</strong></span>}
                          {rec.estimatedCost && <span>Est. Cost: <strong>{rec.estimatedCost}</strong></span>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Summary */}
        {report.summary && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="font-display text-base flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Executive Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{report.summary}</p>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 print:hidden">
          <Button variant="outline" onClick={() => navigate("/dashboard")} className="flex-1">
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back to Dashboard
          </Button>
          <Button variant="outline" onClick={() => navigate("/survey/start")} className="flex-1">
            <BookOpen className="mr-2 w-4 h-4" />
            Start New Survey
          </Button>
          <Button onClick={handleExportPDF} disabled={isExporting} className="flex-1">
            {isExporting ? (
              <Loader2 className="mr-2 w-4 h-4 animate-spin" />
            ) : (
              <Download className="mr-2 w-4 h-4" />
            )}
            Export PDF Report
          </Button>
        </div>
      </div>
    </div>
  );
}
