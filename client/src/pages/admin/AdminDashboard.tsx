import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Users, BookOpen, BarChart3, Settings, FileText, ChevronRight, Loader2, AlertTriangle, Tag, Sparkles, Bot } from "lucide-react";

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { data: stats, isLoading } = trpc.admin.dashboard.useQuery();

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

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <CardDescription className="text-xs">Configure OpenAI API key or custom AI provider for analysis and question generation</CardDescription>
              </CardHeader>
            </Card>
          </div>


        </>
      )}
    </div>
  );
}
