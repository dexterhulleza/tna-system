/**
 * T4-4 — Admin Learning Paths Management
 * HR/Admin can:
 *  - View all learning paths with progress indicators
 *  - Generate AI paths for individuals
 *  - Assign paths (draft → assigned)
 *  - View/edit path steps
 *  - Exempt individual steps
 *  - Archive paths
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Route,
  Sparkles,
  Plus,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Clock,
  Ban,
  Send,
  Archive,
  Trash2,
  ShieldOff,
  RefreshCw,
  Users,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────
const PATH_TYPE_LABELS: Record<string, string> = {
  entry: "Entry",
  compliance: "Compliance",
  performance_recovery: "Performance Recovery",
  progression: "Progression",
  cross_skilling: "Cross-Skilling",
};
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft:       { label: "Draft",       color: "bg-slate-100 text-slate-700" },
  assigned:    { label: "Assigned",    color: "bg-blue-100 text-blue-700" },
  in_progress: { label: "In Progress", color: "bg-amber-100 text-amber-700" },
  completed:   { label: "Completed",   color: "bg-green-100 text-green-700" },
  archived:    { label: "Archived",    color: "bg-slate-100 text-slate-500" },
};
const STEP_STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  not_started: { label: "Not Started", icon: Circle,       color: "text-slate-400" },
  in_progress: { label: "In Progress", icon: Clock,        color: "text-amber-500" },
  completed:   { label: "Completed",   icon: CheckCircle2, color: "text-green-500" },
  exempted:    { label: "Exempted",    icon: Ban,          color: "text-slate-400" },
};
const LAYER_COLORS: Record<string, string> = {
  foundation: "bg-blue-50 text-blue-700 border-blue-200",
  core_role:  "bg-purple-50 text-purple-700 border-purple-200",
  context:    "bg-amber-50 text-amber-700 border-amber-200",
  advancement:"bg-green-50 text-green-700 border-green-200",
};

// ─── Generate Path Dialog ─────────────────────────────────────────────────────
function GeneratePathDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [userId, setUserId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [blueprintId, setBlueprintId] = useState("");
  const [pathType, setPathType] = useState<string>("progression");
  const [targetDate, setTargetDate] = useState("");

  const { data: users } = trpc.admin.users.list.useQuery();
  const { data: groups } = trpc.groups.list.useQuery({ activeOnly: false });
  const { data: blueprints } = trpc.curriculum.list.useQuery({});

  const generate = trpc.learningPaths.generatePath.useMutation({
    onSuccess: () => {
      toast.success("Learning path generated — AI has created a sequenced path for this employee.");
      onSuccess();
      onClose();
    },
    onError: (e) => toast.error(e.message ?? "Generation failed"),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Generate AI Learning Path
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Employee *</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>
                {(users ?? []).map((u: any) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.name ?? u.email} — {u.jobTitle ?? u.tnaRole ?? "Staff"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Survey Group (optional)</Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {(groups ?? []).map((g: any) => (
                  <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Curriculum Blueprint (optional)</Label>
            <Select value={blueprintId} onValueChange={setBlueprintId}>
              <SelectTrigger><SelectValue placeholder="Select blueprint" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {(blueprints ?? []).map((b: any) => (
                  <SelectItem key={b.id} value={String(b.id)}>{b.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Path Type</Label>
            <Select value={pathType} onValueChange={setPathType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PATH_TYPE_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Target Completion Date (optional)</Label>
            <Input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              if (!userId) { toast.error("Select an employee"); return; }
              generate.mutate({
                userId: Number(userId),
                groupId: groupId && groupId !== "none" ? Number(groupId) : undefined,
                blueprintId: blueprintId && blueprintId !== "none" ? Number(blueprintId) : undefined,
                pathType: pathType as any,
                targetCompletionDate: targetDate || undefined,
              });
            }}
            disabled={generate.isPending}
          >
            {generate.isPending ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Generating…</> : <><Sparkles className="w-4 h-4 mr-2" />Generate</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Path Detail Panel ────────────────────────────────────────────────────────
function PathDetailPanel({
  pathId,
  onRefresh,
}: {
  pathId: number;
  onRefresh: () => void;
}) {
  const [exemptStepId, setExemptStepId] = useState<number | null>(null);
  const [exemptReason, setExemptReason] = useState("");

  const { data, refetch } = trpc.learningPaths.getById.useQuery({ id: pathId });

  const assign = trpc.learningPaths.assign.useMutation({
    onSuccess: () => { toast.success("Path assigned"); refetch(); onRefresh(); },
    onError: (e) => toast.error(e.message ?? "Error"),
  });
  const archive = trpc.learningPaths.archive.useMutation({
    onSuccess: () => { toast.success("Path archived"); refetch(); onRefresh(); },
    onError: (e) => toast.error(e.message ?? "Error"),
  });
  const exempt = trpc.learningPaths.exemptStep.useMutation({
    onSuccess: () => { toast.success("Step exempted"); setExemptStepId(null); setExemptReason(""); refetch(); },
    onError: (e) => toast.error(e.message ?? "Error"),
  });

  if (!data) return <div className="p-6 text-slate-400 text-sm">Loading…</div>;

  const { steps = [], progress } = data as any;

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">{data.title}</h3>
          {data.description && <p className="text-sm text-slate-500 mt-0.5">{data.description}</p>}
          <div className="flex items-center gap-2 mt-2">
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", STATUS_CONFIG[data.status]?.color)}>
              {STATUS_CONFIG[data.status]?.label}
            </span>
            <span className="text-xs text-slate-500">{PATH_TYPE_LABELS[data.pathType]}</span>
            {data.isAiGenerated && (
              <span className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full">AI Generated</span>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {data.status === "draft" && (
            <Button size="sm" onClick={() => assign.mutate({ id: pathId })} disabled={assign.isPending}>
              <Send className="w-3.5 h-3.5 mr-1.5" />Assign
            </Button>
          )}
          {data.status !== "archived" && data.status !== "completed" && (
            <Button size="sm" variant="outline" onClick={() => archive.mutate({ id: pathId })} disabled={archive.isPending}>
              <Archive className="w-3.5 h-3.5 mr-1.5" />Archive
            </Button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-slate-600">Overall Progress</span>
          <span className="text-xs font-bold text-slate-900">{progress}%</span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", progress === 100 ? "bg-green-500" : "bg-primary")}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
          Steps ({steps.length})
        </h4>
        {steps.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No steps defined.</p>
        ) : (
          <div className="space-y-2">
            {steps.map((step: any, idx: number) => {
              const statusCfg = STEP_STATUS_CONFIG[step.progressStatus] ?? STEP_STATUS_CONFIG.not_started;
              const StatusIcon = statusCfg.icon;
              return (
                <div key={step.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex-shrink-0 mt-0.5">
                    <StatusIcon className={cn("w-4 h-4", statusCfg.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-800">{idx + 1}. {step.title}</span>
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium", LAYER_COLORS[step.layer])}>
                        {step.layer.replace("_", " ")}
                      </span>
                      {step.isMilestone && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                          Milestone
                        </span>
                      )}
                      {!step.isRequired && (
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Optional</span>
                      )}
                    </div>
                    {step.description && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{step.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      {step.durationHours && <span>{step.durationHours}h</span>}
                      {step.modality && <span>{step.modality.replace(/_/g, " ")}</span>}
                      {step.competencyCategory && <span>{step.competencyCategory}</span>}
                    </div>
                    {step.isExempted && step.exemptionReason && (
                      <p className="text-xs text-slate-400 mt-1 italic">Exempted: {step.exemptionReason}</p>
                    )}
                    {step.completionNotes && (
                      <p className="text-xs text-slate-500 mt-1">Note: {step.completionNotes}</p>
                    )}
                  </div>
                  {!step.isExempted && step.progressStatus !== "completed" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-shrink-0 h-7 px-2 text-xs text-slate-500"
                      onClick={() => setExemptStepId(step.id)}
                    >
                      <ShieldOff className="w-3 h-3 mr-1" />Exempt
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Exempt dialog */}
      <Dialog open={!!exemptStepId} onOpenChange={() => { setExemptStepId(null); setExemptReason(""); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Exempt Step</DialogTitle></DialogHeader>
          <div className="py-2">
            <Label>Reason for exemption *</Label>
            <Textarea
              value={exemptReason}
              onChange={e => setExemptReason(e.target.value)}
              placeholder="e.g. Employee has prior certification in this area"
              rows={3}
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setExemptStepId(null); setExemptReason(""); }}>Cancel</Button>
            <Button
              onClick={() => {
                if (!exemptReason.trim()) { toast.error("Reason required"); return; }
                exempt.mutate({ stepId: exemptStepId!, exemptionReason: exemptReason });
              }}
              disabled={exempt.isPending}
            >
              Confirm Exemption
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminLearningPaths() {
  const [showGenerate, setShowGenerate] = useState(false);
  const [expandedPathId, setExpandedPathId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterGroupId, setFilterGroupId] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: groups } = trpc.groups.list.useQuery({ activeOnly: false });
  const { data: paths, refetch, isLoading } = trpc.learningPaths.list.useQuery({
    groupId: filterGroupId !== "all" ? Number(filterGroupId) : undefined,
    status: filterStatus !== "all" ? filterStatus : undefined,
  });

  const deletePath = trpc.learningPaths.delete.useMutation({
    onSuccess: () => { toast.success("Path deleted"); refetch(); },
    onError: (e) => toast.error(e.message ?? "Error"),
  });

  const filtered = (paths ?? []).filter((p: any) => {
    if (!search) return true;
    return p.title.toLowerCase().includes(search.toLowerCase());
  });

  // Summary stats
  const total = (paths ?? []).length;
  const assigned = (paths ?? []).filter((p: any) => p.status === "assigned").length;
  const inProgress = (paths ?? []).filter((p: any) => p.status === "in_progress").length;
  const completed = (paths ?? []).filter((p: any) => p.status === "completed").length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Route className="w-6 h-6 text-primary" />
            Learning Paths
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Assign and track individual sequenced learning paths for employees.
          </p>
        </div>
        <Button onClick={() => setShowGenerate(true)}>
          <Sparkles className="w-4 h-4 mr-2" />Generate AI Path
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Paths", value: total, color: "text-slate-900" },
          { label: "Assigned", value: assigned, color: "text-blue-700" },
          { label: "In Progress", value: inProgress, color: "text-amber-700" },
          { label: "Completed", value: completed, color: "text-green-700" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 font-medium">{s.label}</p>
            <p className={cn("text-2xl font-bold mt-1", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Filter className="w-4 h-4" />
        </div>
        <Input
          placeholder="Search paths…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-48 h-8 text-sm"
        />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([v, c]) => (
              <SelectItem key={v} value={v}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterGroupId} onValueChange={setFilterGroupId}>
          <SelectTrigger className="w-44 h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Groups</SelectItem>
            {(groups ?? []).map((g: any) => (
              <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading paths…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Route className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No learning paths yet</p>
            <p className="text-slate-400 text-sm mt-1">Generate an AI path for an employee to get started.</p>
            <Button className="mt-4" onClick={() => setShowGenerate(true)}>
              <Sparkles className="w-4 h-4 mr-2" />Generate First Path
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-8"></TableHead>
                <TableHead>Path Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Steps</TableHead>
                <TableHead>Target Date</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((path: any) => {
                const isExpanded = expandedPathId === path.id;
                return (
                  <>
                    <TableRow
                      key={path.id}
                      className={cn("cursor-pointer hover:bg-slate-50", isExpanded && "bg-slate-50")}
                      onClick={() => setExpandedPathId(isExpanded ? null : path.id)}
                    >
                      <TableCell>
                        {isExpanded
                          ? <ChevronDown className="w-4 h-4 text-slate-400" />
                          : <ChevronRight className="w-4 h-4 text-slate-400" />}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-900 text-sm">{path.title}</div>
                        {path.isAiGenerated && (
                          <span className="text-[10px] text-violet-600">AI Generated</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-600">{PATH_TYPE_LABELS[path.pathType]}</span>
                      </TableCell>
                      <TableCell>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", STATUS_CONFIG[path.status]?.color)}>
                          {STATUS_CONFIG[path.status]?.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full", path.progress === 100 ? "bg-green-500" : "bg-primary")}
                              style={{ width: `${path.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-600 font-medium">{path.progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-600">{path.stepCount} steps</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-500">
                          {path.targetCompletionDate
                            ? new Date(path.targetCompletionDate).toLocaleDateString()
                            : "—"}
                        </span>
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                          onClick={() => {
                            if (confirm("Delete this learning path?")) {
                              deletePath.mutate({ id: path.id });
                            }
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={`${path.id}-detail`}>
                        <TableCell colSpan={8} className="p-0 border-t-0">
                          <div className="border-t border-slate-100">
                            <PathDetailPanel pathId={path.id} onRefresh={refetch} />
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Generate dialog */}
      <GeneratePathDialog
        open={showGenerate}
        onClose={() => setShowGenerate(false)}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
