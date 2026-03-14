import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { BookOpen, ChevronRight, Clock, FileText, Plus, Loader2 } from "lucide-react";

const GAP_LEVEL_CONFIG: Record<string, { color: string; label: string }> = {
  critical: { color: "bg-red-100 text-red-700 border-red-200", label: "Critical" },
  high: { color: "bg-orange-100 text-orange-700 border-orange-200", label: "High" },
  moderate: { color: "bg-yellow-100 text-yellow-700 border-yellow-200", label: "Moderate" },
  low: { color: "bg-green-100 text-green-700 border-green-200", label: "Low" },
  none: { color: "bg-gray-100 text-gray-700 border-gray-200", label: "None" },
};

const SECTOR_ICONS: Record<string, string> = {
  ICT: "💻", MET: "⚙️", CAF: "🎨", HW: "❤️", BPS: "🏗️", TL: "🚗",
};

export default function SurveyHistory() {
  const [, navigate] = useLocation();
  const { data: surveys, isLoading } = trpc.surveys.myHistory.useQuery();
  const { data: reports } = trpc.reports.myReports.useQuery();

  const getReport = (surveyId: number) => reports?.find((r) => r.report.surveyId === surveyId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Survey History</h1>
          <p className="text-muted-foreground text-sm mt-1">View all your completed and in-progress assessments</p>
        </div>
        <Button onClick={() => navigate("/survey/start")}>
          <Plus className="mr-2 w-4 h-4" />
          New Survey
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !surveys || surveys.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="font-display font-semibold text-foreground mb-2">No surveys yet</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Start your first Training Needs Analysis to identify your training requirements.
            </p>
            <Button onClick={() => navigate("/survey/start")}>
              <Plus className="mr-2 w-4 h-4" />
              Start Your First Survey
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {surveys.map((item) => {
            const survey = item.survey;
            const sector = item.sector;
            const skillArea = item.skillArea;
            const reportItem = getReport(survey.id);
            const report = reportItem?.report;
            const gapLevel = report?.gapLevel;
            const gapConfig = gapLevel ? GAP_LEVEL_CONFIG[gapLevel] : null;
            const sectorCode = (sector as any)?.code || "";

            return (
              <Card key={survey.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-xl flex-shrink-0">
                        {SECTOR_ICONS[sectorCode] || "📋"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground text-sm">
                            {sector?.name || `Survey #${survey.id}`}
                          </span>
                          {skillArea && (
                            <Badge variant="secondary" className="text-xs">
                              {skillArea.name}
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              survey.status === "completed"
                                ? "border-green-300 text-green-700 bg-green-50"
                                : survey.status === "in_progress"
                                ? "border-blue-300 text-blue-700 bg-blue-50"
                                : "border-gray-300 text-gray-700"
                            }`}
                          >
                            {survey.status?.replace("_", " ")}
                          </Badge>
                          {gapConfig && (
                            <Badge variant="outline" className={`text-xs ${gapConfig.color}`}>
                              {gapConfig.label} Gap
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(survey.createdAt).toLocaleDateString("en-US", {
                              year: "numeric", month: "short", day: "numeric",
                            })}
                          </span>
                          {report && (
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              Score: {Math.round(parseFloat(String(report?.overallScore || 0)))}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {survey.status === "completed" && reportItem ? (
                        <Button size="sm" variant="outline" onClick={() => navigate(`/survey/${survey.id}/report`)}>
                          <FileText className="mr-1 w-3 h-3" />
                          View Report
                        </Button>
                      ) : survey.status === "in_progress" ? (
                        <Button size="sm" onClick={() => navigate(`/survey/${survey.id}/questions`)}>
                          Continue
                          <ChevronRight className="ml-1 w-3 h-3" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
