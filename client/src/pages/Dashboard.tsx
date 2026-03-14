import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  BookOpen, BarChart3, FileText, Plus, ChevronRight,
  Loader2, AlertTriangle, CheckCircle2, Clock, User, LogOut
} from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  industry_worker: "Industry Worker",
  trainer: "Trainer",
  assessor: "Assessor",
  hr_officer: "HR Officer",
  admin: "Administrator",
};

const GAP_CONFIG: Record<string, { color: string; label: string }> = {
  critical: { color: "text-red-600 bg-red-50 border-red-200", label: "Critical Gap" },
  high: { color: "text-orange-600 bg-orange-50 border-orange-200", label: "High Gap" },
  moderate: { color: "text-yellow-600 bg-yellow-50 border-yellow-200", label: "Moderate Gap" },
  low: { color: "text-green-600 bg-green-50 border-green-200", label: "Low Gap" },
  none: { color: "text-gray-600 bg-gray-50 border-gray-200", label: "No Gap" },
};

export default function Dashboard() {
  const { user, loading, logout } = useAuth();
  const [, navigate] = useLocation();

  const { data: reports, isLoading: reportsLoading } = trpc.reports.myReports.useQuery(
    undefined,
    { enabled: !!user }
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
  const criticalCount = reports?.filter((r: any) => r.report.gapLevel === "critical").length || 0;
  const avgScore = reports && reports.length > 0
    ? Math.round(reports.reduce((acc: number, r: any) => acc + parseFloat(String(r.report.overallScore || 0)), 0) / reports.length)
    : null;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top Nav */}
      <nav className="bg-white border-b sticky top-0 z-10">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-foreground">TNA System</span>
          </div>
          <div className="flex items-center gap-3">
            {user.role === "admin" && (
              <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
                Admin Panel
              </Button>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="hidden sm:block">{user.name?.split(" ")[0]}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="container py-8 max-w-5xl">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-foreground">
            Welcome back, {user.name?.split(" ")[0] || "User"}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-muted-foreground text-sm">Your training needs analysis dashboard</p>
            {(user as any).tnaRole && (
              <Badge variant="secondary" className="text-xs">
                {ROLE_LABELS[(user as any).tnaRole] || (user as any).tnaRole}
              </Badge>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Total Assessments</p>
                  <p className="text-3xl font-bold font-display text-foreground mt-1">{totalReports}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Avg. Score</p>
                  <p className="text-3xl font-bold font-display text-foreground mt-1">
                    {avgScore !== null ? `${avgScore}%` : "—"}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-2 sm:col-span-1">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Critical Gaps</p>
                  <p className="text-3xl font-bold font-display text-red-600 mt-1">{criticalCount}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <Card className="border-primary/30 bg-primary/5 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate("/survey/start")}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Plus className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-foreground">Start New Assessment</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Begin a new TNA survey for your sector and role</p>
                </div>
                <ChevronRight className="w-5 h-5 text-primary flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate("/survey/history")}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="font-semibold text-foreground">Survey History</span>
                  </div>
                  <p className="text-xs text-muted-foreground">View all your past assessments and reports</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Reports */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-display text-base">Recent Reports</CardTitle>
                <CardDescription className="text-xs">Your latest training needs analysis reports</CardDescription>
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
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : recentReports.length === 0 ? (
              <div className="text-center py-10">
                <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground mb-4">No assessments yet.</p>
                <Button onClick={() => navigate("/survey/start")}>
                  <Plus className="mr-2 w-4 h-4" />
                  Start Your First Assessment
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentReports.map((item: any) => {
                  const report = item.report;
                  const sector = item.sector;
                  const gapLevel = report.gapLevel || "none";
                  const gapConfig = GAP_CONFIG[gapLevel] || GAP_CONFIG.none;
                  const score = Math.round(parseFloat(String(report.overallScore || 0)));

                  return (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/survey/${report.surveyId}/report`)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground">
                              {sector?.name || "Unknown Sector"}
                            </span>
                            <Badge variant="outline" className={`text-xs ${gapConfig.color}`}>
                              {gapConfig.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(report.createdAt).toLocaleDateString("en-US", {
                              year: "numeric", month: "short", day: "numeric"
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className={`text-sm font-bold ${score >= 80 ? "text-green-600" : score >= 60 ? "text-yellow-600" : score >= 40 ? "text-orange-600" : "text-red-600"}`}>
                          {score}%
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
