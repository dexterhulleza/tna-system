import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  Users, BookOpen, BarChart3, Settings, FileText, ChevronRight,
  Loader2, Tag, Sparkles, Bot, ClipboardList
} from "lucide-react";
import TNAWizard, { type WizardStep } from "@/components/TNAWizard";

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { data: stats, isLoading } = trpc.admin.dashboard.useQuery();
  const { data: checklist, isLoading: checklistLoading } = trpc.admin.readinessChecklist.useQuery();

  // Map checklist phases (excluding AI Provider — that's admin-only) to WizardStep format
  // The readinessChecklist returns 7 phases; we skip phase 1 (AI Provider) for the HR Officer wizard
  const wizardSteps: WizardStep[] = checklist
    ? checklist.phases
        .filter((p) => p.id !== 1) // Remove AI Provider step — admin-only
        .map((p) => {
          const descriptions: Record<number, string> = {
            2: "Create one or more survey groups to organize your respondents. Each group represents a cohort (e.g., by sector, department, or job role) that will receive the same TNA survey.",
            3: "For each group, define the survey objectives, business goals, and industry context. This context is used by the AI to generate relevant, targeted TNA questions.",
            4: "Ensure there are at least 10 active questions in the question bank. You can generate AI-tailored questions from the Survey Configuration page or add them manually.",
            5: "Share the survey link with your staff so they can register and complete their TNA survey. Each respondent must log in and answer all assigned questions.",
            6: "Wait for staff to complete their surveys. You can monitor completion status from the Reports page. A minimum of one completed survey is required before analysis.",
            7: "Generate the AI-powered Training Plan from the Group Analysis page. Each of the 9 TESDA/NTESDP sections can be generated individually to save AI credits.",
          };
          const actionLabels: Record<number, string> = {
            2: "Manage Groups",
            3: "Survey Configuration",
            4: "Manage Questions",
            5: "Manage Users",
            6: "View Reports",
            7: "Group Analysis",
          };
          const shortLabels: Record<number, string> = {
            2: "Groups",
            3: "Objectives",
            4: "Questions",
            5: "Staff",
            6: "Surveys",
            7: "Training Plan",
          };
          // Re-number: original phases 2-7 become wizard steps 1-6
          const wizardId = p.id - 1;
          return {
            id: wizardId,
            label: p.label,
            shortLabel: shortLabels[p.id] ?? p.label,
            hint: p.hint,
            done: p.done,
            link: p.link,
            actionLabel: actionLabels[p.id] ?? "Go",
            description: descriptions[p.id] ?? "",
          };
        })
    : [];

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

          {/* TNA Campaign Wizard */}
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <ClipboardList className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="font-display text-base">TNA Campaign Workflow</CardTitle>
                  <CardDescription className="text-xs">
                    Follow the 6-step process to launch a complete TNA campaign. Complete each step in order, then generate your training plan.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {checklistLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Checking setup status...</span>
                </div>
              ) : wizardSteps.length > 0 ? (
                <TNAWizard steps={wizardSteps} />
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
