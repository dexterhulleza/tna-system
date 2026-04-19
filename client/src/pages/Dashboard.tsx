import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import StaffLayout from "@/components/StaffLayout";
import {
  BookOpen, BarChart3, FileText, Plus, ChevronRight,
  Loader2, AlertTriangle, Clock, ArrowRight, AlertCircle
} from "lucide-react";

const GAP_CONFIG: Record<string, { color: string; label: string; bg: string }> = {
  critical: { color: "text-red-700", label: "Critical Gap", bg: "bg-red-100" },
  high: { color: "text-orange-700", label: "High Gap", bg: "bg-orange-100" },
  moderate: { color: "text-yellow-700", label: "Medium Gap", bg: "bg-yellow-100" },
  medium: { color: "text-yellow-700", label: "Medium Gap", bg: "bg-yellow-100" },
  low: { color: "text-green-700", label: "Low Gap", bg: "bg-green-100" },
  none: { color: "text-slate-600", label: "No Gap", bg: "bg-slate-100" },
};

const ROLE_LABELS: Record<string, string> = {
  industry_worker: "Industry Worker",
  trainer: "Trainer",
  assessor: "Assessor",
  hr_officer: "HR Officer",
  admin: "Administrator",
};

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

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

  const recentReports = reports?.slice(0, 5) || [];
  const totalReports = reports?.length || 0;
  const criticalCount = reports?.filter((r: any) => r.report?.gapLevel === "critical").length || 0;
  const avgScore = reports && reports.length > 0
    ? Math.round(reports.reduce((acc: number, r: any) => acc + parseFloat(String(r.report?.overallScore || 0)), 0) / reports.length)
    : null;

  return (
    <StaffLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {user.name?.split(" ")[0] || "User"} 👋
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-slate-500 text-sm">Your training needs analysis dashboard</p>
            {(user as any).tnaRole && (
              <Badge variant="secondary" className="text-xs">
                {ROLE_LABELS[(user as any).tnaRole] || (user as any).tnaRole}
              </Badge>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="border-slate-200">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{totalReports}</p>
              <p className="text-xs text-slate-500 mt-0.5">Total Assessments</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-green-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{avgScore !== null ? `${avgScore}%` : "—"}</p>
              <p className="text-xs text-slate-500 mt-0.5">Avg. Score</p>
            </CardContent>
          </Card>
          <Card className="col-span-2 lg:col-span-1 border-slate-200">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
              <p className="text-xs text-slate-500 mt-0.5">Critical Gaps</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Card
            className="border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 cursor-pointer transition-colors"
            onClick={() => navigate("/survey/start")}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-semibold text-slate-900">Start New Assessment</span>
                  </div>
                  <p className="text-xs text-slate-500 ml-10">Begin a new TNA survey for your sector and role</p>
                </div>
                <ArrowRight className="w-5 h-5 text-primary flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          <Card
            className="border-slate-200 hover:shadow-md cursor-pointer transition-shadow"
            onClick={() => navigate("/survey/history")}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-slate-600" />
                    </div>
                    <span className="font-semibold text-slate-900">Survey History</span>
                  </div>
                  <p className="text-xs text-slate-500 ml-10">View all your past assessments and reports</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Reports */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">Recent Reports</CardTitle>
                <CardDescription className="text-xs">Your latest training needs analysis results</CardDescription>
              </div>
              {totalReports > 5 && (
                <Button variant="ghost" size="sm" onClick={() => navigate("/survey/history")}>
                  View All <ChevronRight className="ml-1 w-3 h-3" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {reportsLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : recentReports.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-7 h-7 text-slate-400" />
                </div>
                <p className="font-semibold text-slate-700 mb-1">No assessments yet</p>
                <p className="text-sm text-slate-500 mb-5">Complete your first TNA survey to see your results here.</p>
                <Button onClick={() => navigate("/survey/start")} size="sm">
                  Start Your First Assessment
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentReports.map((item: any) => {
                  const report = item.report;
                  const sector = item.sector;
                  const gapLevel = report?.gapLevel || "none";
                  const gapConfig = GAP_CONFIG[gapLevel] || GAP_CONFIG.none;
                  const score = Math.round(parseFloat(String(report?.overallScore || 0)));

                  return (
                    <div
                      key={report?.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/survey/${report?.surveyId}/report`)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-slate-900">
                              {sector?.name || "Unknown Sector"}
                            </span>
                            <Badge variant="outline" className={`text-xs ${gapConfig.bg} ${gapConfig.color} border-0`}>
                              {gapConfig.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {report?.createdAt ? new Date(report.createdAt).toLocaleDateString("en-US", {
                              year: "numeric", month: "short", day: "numeric"
                            }) : "—"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className={`text-sm font-bold ${score >= 80 ? "text-green-600" : score >= 60 ? "text-yellow-600" : score >= 40 ? "text-orange-600" : "text-red-600"}`}>
                          {score}%
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profile Completion Prompt */}
        {(!user?.tnaRole || !user?.organization || !user?.jobTitle) && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-800">Complete your profile</p>
                  <p className="text-xs text-amber-700 mt-0.5">Add your role, organization, and job title to get more accurate TNA results.</p>
                </div>
                <Button size="sm" variant="outline" className="border-amber-400 text-amber-800 hover:bg-amber-100 flex-shrink-0" onClick={() => navigate("/profile-setup")}>
                  Update Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </StaffLayout>
  );
}
