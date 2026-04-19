/**
 * HR Officer Dashboard — ONE OBJECTIVE: See what needs action next and do it.
 * Rules: wizard is the hero · stats are secondary (collapsed) · completed steps hidden by default
 */
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  Users, BookOpen, BarChart3, FileText,
  Loader2, Tag, Sparkles, ChevronDown, ChevronUp, ArrowRight
} from "lucide-react";
import TNAWizard, { type WizardStep } from "@/components/TNAWizard";
import { useState } from "react";

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const [showStats, setShowStats] = useState(false);
  const { data: stats } = trpc.admin.dashboard.useQuery();
  const { data: checklist, isLoading: checklistLoading } = trpc.admin.readinessChecklist.useQuery();

  const wizardSteps: WizardStep[] = checklist
    ? checklist.phases
        .filter((p) => p.id !== 1)
        .map((p) => {
          const descriptions: Record<number, string> = {
            2: "Create one or more survey groups to organize your respondents by sector, department, or job role.",
            3: "Define survey objectives and business goals per group. The AI uses this to generate targeted questions.",
            4: "Ensure at least 10 active questions exist. Generate AI-tailored questions from Survey Configuration.",
            5: "Share the survey link with staff so they can register and complete their TNA survey.",
            6: "Monitor survey completion from Reports. At least one completed survey is required before analysis.",
            7: "Generate the AI-powered Training Plan from Group Analysis. Each TESDA section can be generated individually.",
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
          return {
            id: p.id - 1,
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

  // Find the first incomplete step to surface the right CTA
  const firstIncomplete = wizardSteps.find((s) => !s.done);
  const allDone = wizardSteps.length > 0 && wizardSteps.every((s) => s.done);
  const completedCount = wizardSteps.filter((s) => s.done).length;

  return (
    <div className="space-y-5 max-w-4xl">

      {/* Page header — one sentence, no fluff */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">TNA Campaign</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {allDone
              ? "All steps complete — your campaign is ready."
              : firstIncomplete
              ? `Next: ${firstIncomplete.shortLabel}`
              : "Complete each step to launch your TNA campaign."}
          </p>
        </div>
        {/* Stats toggle — secondary info, hidden by default */}
        <button
          onClick={() => setShowStats(!showStats)}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors flex-shrink-0 mt-1"
        >
          {showStats ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {showStats ? "Hide stats" : "View stats"}
        </button>
      </div>

      {/* Stats — collapsed by default, progressive disclosure */}
      {showStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Users", value: stats?.totalUsers ?? 0, icon: Users, color: "text-blue-600 bg-blue-50" },
            { label: "Surveys", value: stats?.totalSurveys ?? 0, icon: BookOpen, color: "text-purple-600 bg-purple-50" },
            { label: "Reports", value: stats?.totalReports ?? 0, icon: FileText, color: "text-green-600 bg-green-50" },
            { label: "Completed", value: stats?.completedSurveys ?? 0, icon: BarChart3, color: "text-orange-600 bg-orange-50" },
          ].map((s) => (
            <Card key={s.label} className="border-slate-200">
              <CardContent className="pt-4 pb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${s.color}`}>
                  <s.icon className="w-4 h-4" />
                </div>
                <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Campaign progress summary bar */}
      {wizardSteps.length > 0 && !checklistLoading && (
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-700">Campaign Setup</span>
              <span className="text-xs text-slate-500">{completedCount} of {wizardSteps.length} steps</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${(completedCount / wizardSteps.length) * 100}%` }}
              />
            </div>
          </div>
          {allDone && (
            <Button size="sm" onClick={() => navigate("/admin/reports")} className="flex-shrink-0">
              View Reports <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      )}

      {/* THE WIZARD — this is the entire page objective */}
      <Card className="border-slate-200">
        <CardContent className="pt-5 pb-5">
          {checklistLoading ? (
            <div className="flex items-center gap-2 text-slate-500 text-sm py-6 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Checking campaign status…</span>
            </div>
          ) : wizardSteps.length > 0 ? (
            <TNAWizard steps={wizardSteps} />
          ) : null}
        </CardContent>
      </Card>

      {/* Quick links — minimal, text-only, below the fold */}
      <div className="flex flex-wrap gap-2 pt-1">
        {[
          { label: "Groups", icon: Tag, path: "/admin/groups" },
          { label: "Questions", icon: BookOpen, path: "/admin/questions" },
          { label: "Users", icon: Users, path: "/admin/users" },
          { label: "Reports", icon: BarChart3, path: "/admin/reports" },
          { label: "Survey Config", icon: Sparkles, path: "/admin/survey-config" },
        ].map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-primary transition-colors px-3 py-1.5 rounded-lg border border-slate-200 hover:border-primary/30 bg-white"
          >
            <item.icon className="w-3.5 h-3.5" />
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
