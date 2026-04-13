import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  Users, BookOpen, BarChart3, Settings, FileText, ChevronRight,
  Loader2, Tag, Sparkles, Bot, CheckCircle2, Circle, ArrowRight, ClipboardList
} from "lucide-react";

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { data: stats, isLoading } = trpc.admin.dashboard.useQuery();
  const { data: checklist, isLoading: checklistLoading } = trpc.admin.readinessChecklist.useQuery();

  const phaseColors = [
    "bg-violet-100 text-violet-700",
    "bg-teal-100 text-teal-700",
    "bg-violet-100 text-violet-700",
    "bg-purple-100 text-purple-700",
    "bg-blue-100 text-blue-700",
    "bg-orange-100 text-orange-700",
    "bg-green-100 text-green-700",
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of the TNA system activity and management</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Users</p>
                    <p className="text-3xl font-bold font-display text-foreground mt-1">{stats?.totalUsers ?? 0}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Surveys</p>
                    <p className="text-3xl font-bold font-display text-foreground mt-1">{stats?.totalSurveys ?? 0}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Reports</p>
                    <p className="text-3xl font-bold font-display text-foreground mt-1">{stats?.totalReports ?? 0}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Completed</p>
                    <p className="text-3xl font-bold font-display text-foreground mt-1">{stats?.completedSurveys ?? 0}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* TNA Setup Readiness Checklist */}
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="font-display text-base">TNA Campaign Readiness</CardTitle>
                    <CardDescription className="text-xs">Complete all 7 phases to launch a TNA campaign for your staff. Click any phase to go directly to that setup step.</CardDescription>
                  </div>
                </div>
                {checklist && (
                  <Badge
                    variant={checklist.overallProgress === 7 ? "default" : "secondary"}
                    className="text-xs flex-shrink-0"
                  >
                    {checklist.overallProgress}/7 Done
                  </Badge>
                )}
              </div>
              {checklist && (
                <Progress value={(checklist.overallProgress / 7) * 100} className="h-2 mt-3" />
              )}
            </CardHeader>
            <CardContent className="pt-0">
              {checklistLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Checking setup status...</span>
                </div>
              ) : checklist ? (
                <div className="divide-y divide-border/50">
                  {checklist.phases.map((phase, idx) => (
                    <button
                      key={phase.id}
                      onClick={() => navigate(phase.link)}
                      className="w-full flex items-center gap-3 py-2.5 px-1 hover:bg-muted/40 transition-colors text-left group rounded-sm"
                    >
                      <div className="flex-shrink-0">
                        {phase.done ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-muted-foreground/30" />
                        )}
                      </div>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${phaseColors[idx]}`}>
                        {phase.id}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium leading-tight ${phase.done ? "text-foreground" : "text-muted-foreground"}`}>
                          {phase.label}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{phase.hint}</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
                    </button>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Quick Actions Grid */}
          <div>
            <h2 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/admin/users")}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="font-display text-base mt-2">Manage Users</CardTitle>
                  <CardDescription className="text-xs">View, edit, and manage user accounts and roles</CardDescription>
                </CardHeader>
              </Card>
              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/admin/questions")}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-purple-600" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="font-display text-base mt-2">Manage Questions</CardTitle>
                  <CardDescription className="text-xs">Customize survey questions per sector and skill area</CardDescription>
                </CardHeader>
              </Card>
              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/admin/sectors")}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
                      <Settings className="w-5 h-5 text-green-600" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="font-display text-base mt-2">Manage Sectors</CardTitle>
                  <CardDescription className="text-xs">Configure WorldSkills sectors and skill areas</CardDescription>
                </CardHeader>
              </Card>
              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/admin/reports")}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-orange-600" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="font-display text-base mt-2">View All Reports</CardTitle>
                  <CardDescription className="text-xs">Access and export all TNA reports across users</CardDescription>
                </CardHeader>
              </Card>
              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/admin/groups")}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center">
                      <Tag className="w-5 h-5 text-teal-600" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="font-display text-base mt-2">Manage Groups</CardTitle>
                  <CardDescription className="text-xs">Create group tags to organize respondents into cohorts for group analysis</CardDescription>
                </CardHeader>
              </Card>
              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/admin/survey-config")}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-violet-600" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="font-display text-base mt-2">Survey Configuration</CardTitle>
                  <CardDescription className="text-xs">Define objectives and business goals per group, then generate AI-tailored TNA questions</CardDescription>
                </CardHeader>
              </Card>
              <Card className="hover:shadow-md transition-shadow cursor-pointer border-primary/20" onClick={() => navigate("/admin/ai-settings")}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="font-display text-base mt-2">AI Provider Settings</CardTitle>
                  <CardDescription className="text-xs">Configure OpenAI, Gemini, or custom AI provider for analysis and question generation</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
