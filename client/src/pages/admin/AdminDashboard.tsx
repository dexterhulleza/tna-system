/**
 * Admin / HR Officer Dashboard
 * ONE OBJECTIVE: See what needs action next and take it.
 * Layout: welcome → alerts → stats → 4 action cards → recent groups → quick links
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PlusCircle, ClipboardList, TrendingUp, GraduationCap,
  Building2, Users, CheckCircle2, Clock, AlertCircle,
  ChevronRight, BarChart3, FileText, Bell, Eye, ArrowRight,
  Lightbulb, BookOpen, Tag, Sparkles, Plus, Check, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Inline Create Group Form (reused from previous wizard) ───────────────────
function InlineCreateGroupForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [showForm, setShowForm] = useState(false);
  const utils = trpc.useUtils();

  const upsert = trpc.groups.upsert.useMutation({
    onSuccess: () => {
      toast.success(`Group "${name}" created!`);
      setName(""); setCode(""); setShowForm(false);
      utils.groups.list.invalidate();
      utils.admin.readinessChecklist.invalidate();
      onCreated();
    },
    onError: (e) => toast.error(e.message),
  });

  const { data: groups } = trpc.groups.list.useQuery({ activeOnly: true });
  const activeGroups = groups ?? [];

  const handleCreate = () => {
    if (!name.trim() || !code.trim()) { toast.error("Name and code are required."); return; }
    upsert.mutate({ name: name.trim(), code: code.trim().toUpperCase(), isActive: true, sortOrder: 0 });
  };

  return (
    <div className="space-y-2 mt-2">
      {activeGroups.map((g) => (
        <div key={g.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
          <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
          <span className="text-sm font-medium text-green-800">{g.name}</span>
          <span className="text-xs text-green-600 font-mono ml-auto">{g.code}</span>
        </div>
      ))}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all text-sm text-muted-foreground hover:text-primary"
        >
          <Plus className="w-4 h-4" />
          {activeGroups.length === 0 ? "Create your first group" : "Add another group"}
        </button>
      ) : (
        <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
          <p className="text-xs font-semibold">New Group</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <Label className="text-xs mb-1 block">Group Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Batch 2025 ICT" className="h-8 text-sm" autoFocus onKeyDown={(e) => e.key === "Enter" && handleCreate()} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Code *</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="B25ICT" className="h-8 text-sm font-mono" maxLength={10} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleCreate} disabled={upsert.isPending || !name.trim() || !code.trim()} className="h-7 text-xs gap-1">
              {upsert.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              Create
            </Button>
            <button onClick={() => { setShowForm(false); setName(""); setCode(""); }} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active:    "bg-emerald-100 text-emerald-700 border-emerald-200",
    ongoing:   "bg-blue-100 text-blue-700 border-blue-200",
    completed: "bg-slate-100 text-slate-600 border-slate-200",
    draft:     "bg-amber-100 text-amber-700 border-amber-200",
    closed:    "bg-red-100 text-red-700 border-red-200",
  };
  const cls = map[status?.toLowerCase()] ?? "bg-slate-100 text-slate-600 border-slate-200";
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", cls)}>{label}</span>;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data: stats } = trpc.admin.dashboard.useQuery();
  const { data: checklist } = trpc.admin.readinessChecklist.useQuery();
  const { data: groupsData } = trpc.groups.list.useQuery({ activeOnly: false });
  const groups = groupsData ?? [];

  // ── Derived stats from checklist phases ──
  const phases = checklist?.phases ?? [];
  const totalGroups = groups.length;
  const activeGroups = groups.filter(g => g.isActive).length;
  const totalStaff = stats?.totalUsers ?? 0;
  const submitted = stats?.completedSurveys ?? 0;
  const pending = Math.max(0, totalStaff - submitted);
  const completedGroups = phases.find(p => p.id === 6)?.done ? activeGroups : 0;
  const draftPlans = phases.find(p => p.id === 7)?.done ? 0 : (totalGroups > 0 ? 1 : 0);

  // ── Alerts from checklist phases ──
  const alerts: { type: "warning" | "info" | "success"; message: string; action?: { label: string; href: string } }[] = [];
  if (phases.length > 0) {
    if (!phases.find(p => p.id === 2)?.done)
      alerts.push({ type: "warning", message: "No survey groups created yet. Create your first group to get started.", action: { label: "Create Group", href: "/admin/survey-groups/create" } });
    if (phases.find(p => p.id === 2)?.done && !phases.find(p => p.id === 3)?.done)
      alerts.push({ type: "info", message: "Survey objectives not configured. Set them up before launching surveys.", action: { label: "Configure", href: "/admin/survey-config" } });
    if (phases.find(p => p.id === 6)?.done && !phases.find(p => p.id === 7)?.done)
      alerts.push({ type: "success", message: "Surveys completed! Generate your AI-powered Training Plan now.", action: { label: "Generate Plan", href: "/admin/reports" } });
  }

  const roleLabel = user?.tnaRole === "admin" ? "Administrator" : "HR Officer";
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* ── Welcome Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {user?.name?.split(" ")[0] ?? "there"} 👋
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            <span className="font-medium text-slate-700">{roleLabel}</span>
            {" · "}
            {today}
          </p>
        </div>
        <Button onClick={() => navigate("/admin/survey-groups/create")} className="gap-2 self-start sm:self-auto flex-shrink-0">
          <PlusCircle className="w-4 h-4" />
          New Survey Group
        </Button>
      </div>

      {/* ── Alerts / Reminders ──────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl border text-sm",
                alert.type === "warning" ? "bg-amber-50 border-amber-200 text-amber-800" :
                alert.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" :
                "bg-blue-50 border-blue-200 text-blue-800"
              )}
            >
              {alert.type === "warning" ? <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-500" /> :
               alert.type === "success" ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-500" /> :
               <Bell className="w-4 h-4 flex-shrink-0 text-blue-500" />}
              <span className="flex-1">{alert.message}</span>
              {alert.action && (
                <button
                  onClick={() => navigate(alert.action!.href)}
                  className="text-xs font-semibold underline underline-offset-2 flex-shrink-0"
                >
                  {alert.action.label}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── 6 Stat Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { label: "Total Groups",          value: totalGroups,    icon: ClipboardList, color: "text-blue-600",    bg: "bg-blue-50" },
          { label: "Active Groups",          value: activeGroups,   icon: CheckCircle2,  color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Completed Groups",       value: completedGroups,icon: BarChart3,     color: "text-violet-600",  bg: "bg-violet-50" },
          { label: "Pending Respondents",    value: pending,        icon: Clock,         color: "text-amber-600",   bg: "bg-amber-50" },
          { label: "Submitted Assessments",  value: submitted,      icon: FileText,      color: "text-sky-600",     bg: "bg-sky-50" },
          { label: "Draft Training Plans",   value: draftPlans,     icon: GraduationCap, color: "text-rose-600",    bg: "bg-rose-50" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-2">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", s.bg)}>
              <s.icon className={cn("w-4 h-4", s.color)} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500 leading-tight mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── 4 Primary Action Cards ──────────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Main Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            {
              title: "View Survey Groups",
              description: "Monitor progress, response rates, and status of all survey groups.",
              icon: ClipboardList, color: "text-blue-600", bg: "bg-blue-50",
              href: "/admin/groups", cta: "View Groups", primary: true,
            },
            {
              title: "Create Survey Group",
              description: "Set up a new group with participants, questionnaire, and schedule.",
              icon: PlusCircle, color: "text-emerald-600", bg: "bg-emerald-50",
              href: "/admin/survey-groups/create", cta: "Create Group", primary: true,
            },
            {
              title: "Company Information",
              description: "Update your organization profile, departments, and contact details.",
              icon: Building2, color: "text-violet-600", bg: "bg-violet-50",
              href: "/admin/company", cta: "Update Info", primary: false,
            },
            {
              title: "Training Plans & Outputs",
              description: "Access results, skills gap summaries, training plans, and reports.",
              icon: GraduationCap, color: "text-amber-600", bg: "bg-amber-50",
              href: "/admin/results", cta: "View Outputs", primary: false,
            },
          ].map((card) => (
            <button
              key={card.title}
              onClick={() => navigate(card.href)}
              className={cn(
                "group text-left bg-white rounded-xl border p-5 flex flex-col gap-3 transition-all hover:shadow-md hover:-translate-y-0.5",
                card.primary ? "border-slate-200 hover:border-primary/40" : "border-slate-200 hover:border-slate-300"
              )}
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", card.bg)}>
                <card.icon className={cn("w-5 h-5", card.color)} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900 text-sm">{card.title}</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{card.description}</p>
              </div>
              <div className={cn(
                "flex items-center gap-1 text-xs font-medium transition-colors",
                card.primary ? "text-primary" : "text-slate-500 group-hover:text-slate-700"
              )}>
                {card.cta}
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Recent Survey Groups ─────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recent Survey Groups</h2>
          <button onClick={() => navigate("/admin/groups")} className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
            View all <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {groups.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center">
            <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">No survey groups yet</p>
            <p className="text-slate-400 text-sm mt-1 mb-4">Create your first group to start collecting TNA data.</p>
            <InlineCreateGroupForm onCreated={() => utils.groups.list.invalidate()} />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="hidden md:grid grid-cols-[2fr_80px_100px_120px_90px_40px] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span>Group</span><span>Staff</span><span>Responded</span><span>Progress</span><span>Status</span><span></span>
            </div>
            <div className="divide-y divide-slate-100">
              {groups.slice(0, 6).map((group) => {
                    const responded = 0; // respondent counts require a separate query
                    const total = 0;
                const pct = total > 0 ? Math.round((responded / total) * 100) : 0;
                const status = !group.isActive ? "draft" : pct === 100 ? "completed" : pct > 0 ? "ongoing" : "active";
                return (
                  <div key={group.id} className="grid grid-cols-1 md:grid-cols-[2fr_80px_100px_120px_90px_40px] gap-2 md:gap-4 px-5 py-4 hover:bg-slate-50 transition-colors items-center">
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{group.name}</p>
                      {group.code && <p className="text-xs text-slate-400 mt-0.5 font-mono">{group.code}</p>}
                    </div>
                    <div className="text-sm text-slate-600 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400 hidden md:block" />{total}
                    </div>
                    <div className="text-sm text-slate-600">{responded} / {total}</div>
                    <div className="flex items-center gap-2">
                      <Progress value={pct} className="h-1.5 flex-1" />
                      <span className="text-xs text-slate-500 w-8 text-right">{pct}%</span>
                    </div>
                    <div><StatusBadge status={status} /></div>
                    <div>
                      <button onClick={() => navigate("/admin/groups")} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700" title="View">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {groups.length > 6 && (
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
                <button onClick={() => navigate("/admin/groups")} className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                  View {groups.length - 6} more groups <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Quick Links ──────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Quick Links</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Results & Analytics", icon: TrendingUp,   href: "/admin/results",         color: "text-blue-600" },
            { label: "Training Plans",      icon: GraduationCap, href: "/admin/training-plans",  color: "text-emerald-600" },
            { label: "Reports Archive",     icon: FileText,      href: "/admin/reports",         color: "text-violet-600" },
            { label: "Staff Management",    icon: Users,         href: "/admin/users",           color: "text-amber-600" },
          ].map(link => (
            <button
              key={link.label}
              onClick={() => navigate(link.href)}
              className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-4 py-3 hover:shadow-sm hover:border-slate-300 transition-all text-left group"
            >
              <link.icon className={cn("w-4 h-4 flex-shrink-0", link.color)} />
              <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 flex-1">{link.label}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
