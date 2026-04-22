/**
 * T4-3 — Staff: My Learning Path
 * Staff can:
 *  - See all their assigned learning paths
 *  - View step-by-step progress
 *  - Mark steps as in_progress or completed
 *  - Add completion notes / evidence
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import StaffLayout from "@/components/StaffLayout";
import {
  Route,
  CheckCircle2,
  Circle,
  Clock,
  Ban,
  ChevronDown,
  ChevronRight,
  Loader2,
  BookOpen,
  Sparkles,
  CalendarClock,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft:       { label: "Draft",       color: "bg-slate-100 text-slate-600" },
  assigned:    { label: "Assigned",    color: "bg-blue-100 text-blue-700" },
  in_progress: { label: "In Progress", color: "bg-amber-100 text-amber-700" },
  completed:   { label: "Completed",   color: "bg-green-100 text-green-700" },
  archived:    { label: "Archived",    color: "bg-slate-100 text-slate-400" },
};
const STEP_STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  not_started: { label: "Not Started", icon: Circle,       color: "text-slate-400", bg: "bg-slate-50" },
  in_progress: { label: "In Progress", icon: Clock,        color: "text-amber-500", bg: "bg-amber-50" },
  completed:   { label: "Completed",   icon: CheckCircle2, color: "text-green-500", bg: "bg-green-50" },
  exempted:    { label: "Exempted",    icon: Ban,          color: "text-slate-400", bg: "bg-slate-50" },
};
const LAYER_LABELS: Record<string, string> = {
  foundation: "Foundation",
  core_role:  "Core Role",
  context:    "Context",
  advancement:"Advancement",
};
const LAYER_COLORS: Record<string, string> = {
  foundation: "bg-blue-50 text-blue-700 border-blue-200",
  core_role:  "bg-purple-50 text-purple-700 border-purple-200",
  context:    "bg-amber-50 text-amber-700 border-amber-200",
  advancement:"bg-green-50 text-green-700 border-green-200",
};
const PATH_TYPE_LABELS: Record<string, string> = {
  entry: "Entry",
  compliance: "Compliance",
  performance_recovery: "Performance Recovery",
  progression: "Progression",
  cross_skilling: "Cross-Skilling",
};

// ─── Step Update Dialog ───────────────────────────────────────────────────────
function StepUpdateDialog({
  step,
  onClose,
  onSuccess,
}: {
  step: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [status, setStatus] = useState<string>(step.progressStatus);
  const [notes, setNotes] = useState(step.completionNotes ?? "");
  const [evidence, setEvidence] = useState(step.completionEvidence ?? "");

  const update = trpc.learningPaths.updateStepProgress.useMutation({
    onSuccess: () => {
      toast.success("Step updated");
      onSuccess();
      onClose();
    },
    onError: (e) => toast.error(e.message ?? "Failed to update step"),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{step.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Progress Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(status === "in_progress" || status === "completed") && (
            <div>
              <Label>Completion Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="What did you learn? Any challenges?"
                rows={3}
                className="mt-1"
              />
            </div>
          )}
          {status === "completed" && (
            <div>
              <Label>Evidence / Reference (optional)</Label>
              <Textarea
                value={evidence}
                onChange={e => setEvidence(e.target.value)}
                placeholder="Certificate number, project link, trainer name…"
                rows={2}
                className="mt-1"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => update.mutate({
              stepId: step.id,
              progressStatus: status as any,
              completionNotes: notes || undefined,
              completionEvidence: evidence || undefined,
            })}
            disabled={update.isPending}
          >
            {update.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Save Progress
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Path Card ────────────────────────────────────────────────────────────────
function PathCard({ path, onRefresh }: { path: any; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(path.status === "in_progress" || path.status === "assigned");
  const [selectedStep, setSelectedStep] = useState<any | null>(null);

  const { steps = [], progress } = path;

  const layers = ["foundation", "core_role", "context", "advancement"];
  const stepsByLayer: Record<string, any[]> = {};
  for (const layer of layers) {
    stepsByLayer[layer] = steps.filter((s: any) => s.layer === layer);
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Card header */}
      <div
        className="flex items-start gap-4 p-5 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-shrink-0 mt-0.5">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            progress === 100 ? "bg-green-100" : "bg-primary/10"
          )}>
            {progress === 100
              ? <CheckCircle2 className="w-5 h-5 text-green-600" />
              : <Route className="w-5 h-5 text-primary" />}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">{path.title}</h3>
              {path.description && (
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{path.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", STATUS_CONFIG[path.status]?.color)}>
                {STATUS_CONFIG[path.status]?.label}
              </span>
              {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </div>
          </div>
          {/* Meta row */}
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              {PATH_TYPE_LABELS[path.pathType] ?? path.pathType}
            </span>
            <span className="flex items-center gap-1">
              <Target className="w-3 h-3" />
              {steps.length} steps
            </span>
            {path.targetCompletionDate && (
              <span className="flex items-center gap-1">
                <CalendarClock className="w-3 h-3" />
                Due {new Date(path.targetCompletionDate).toLocaleDateString()}
              </span>
            )}
            {path.isAiGenerated && (
              <span className="flex items-center gap-1 text-violet-500">
                <Sparkles className="w-3 h-3" />AI Generated
              </span>
            )}
          </div>
          {/* Progress bar */}
          <div className="flex items-center gap-2 mt-2.5">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", progress === 100 ? "bg-green-500" : "bg-primary")}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-700 w-8 text-right">{progress}%</span>
          </div>
        </div>
      </div>

      {/* Expanded steps */}
      {expanded && (
        <div className="border-t border-slate-100 px-5 pb-5 pt-4">
          {steps.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No steps defined yet.</p>
          ) : (
            <div className="space-y-4">
              {layers.map(layer => {
                const layerSteps = stepsByLayer[layer];
                if (!layerSteps || layerSteps.length === 0) return null;
                return (
                  <div key={layer}>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      {LAYER_LABELS[layer]}
                    </h4>
                    <div className="space-y-2">
                      {layerSteps.map((step: any, idx: number) => {
                        const statusCfg = STEP_STATUS_CONFIG[step.progressStatus] ?? STEP_STATUS_CONFIG.not_started;
                        const StatusIcon = statusCfg.icon;
                        const canUpdate = !step.isExempted && step.progressStatus !== "exempted";
                        return (
                          <div
                            key={step.id}
                            className={cn(
                              "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                              statusCfg.bg,
                              step.progressStatus === "completed" ? "border-green-200" : "border-slate-100",
                              canUpdate ? "cursor-pointer hover:border-primary/30" : ""
                            )}
                            onClick={() => canUpdate && setSelectedStep(step)}
                          >
                            <div className="flex-shrink-0 mt-0.5">
                              <StatusIcon className={cn("w-4 h-4", statusCfg.color)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={cn(
                                  "text-sm font-medium",
                                  step.progressStatus === "completed" ? "text-slate-500 line-through" : "text-slate-800"
                                )}>
                                  {step.title}
                                </span>
                                <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium", LAYER_COLORS[layer])}>
                                  {LAYER_LABELS[layer]}
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
                                <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
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
                                <p className="text-xs text-slate-500 mt-1 italic">"{step.completionNotes}"</p>
                              )}
                            </div>
                            {canUpdate && (
                              <div className="flex-shrink-0">
                                <span className="text-xs text-primary font-medium">
                                  {step.progressStatus === "not_started" ? "Start" : "Update"}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Step update dialog */}
      {selectedStep && (
        <StepUpdateDialog
          step={selectedStep}
          onClose={() => setSelectedStep(null)}
          onSuccess={() => { setSelectedStep(null); onRefresh(); }}
        />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MyLearningPath() {
  const { data: paths, isLoading, refetch } = trpc.learningPaths.myPaths.useQuery();

  const activePaths = (paths ?? []).filter((p: any) => p.status !== "archived" && p.status !== "draft");
  const completedPaths = (paths ?? []).filter((p: any) => p.status === "completed");
  const inProgressPaths = (paths ?? []).filter((p: any) => p.status === "in_progress");
  const assignedPaths = (paths ?? []).filter((p: any) => p.status === "assigned");

  return (
    <StaffLayout>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Route className="w-6 h-6 text-primary" />
            My Learning Path
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Your personalised training journey based on your TNA results.
          </p>
        </div>

        {/* Summary stats */}
        {activePaths.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Assigned", value: assignedPaths.length, color: "text-blue-700" },
              { label: "In Progress", value: inProgressPaths.length, color: "text-amber-700" },
              { label: "Completed", value: completedPaths.length, color: "text-green-700" },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && activePaths.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Route className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-semibold text-slate-700">No learning path assigned yet</h3>
            <p className="text-slate-400 text-sm mt-2 max-w-sm mx-auto">
              Your HR officer will assign a personalised learning path once your TNA results have been reviewed.
              Complete your assessment first if you haven't already.
            </p>
            <Button variant="outline" className="mt-5" onClick={() => window.location.href = "/survey/start"}>
              <BookOpen className="w-4 h-4 mr-2" />
              Take My Assessment
            </Button>
          </div>
        )}

        {/* Active paths */}
        {!isLoading && activePaths.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
              Active Paths ({activePaths.length})
            </h2>
            {activePaths.map((path: any) => (
              <PathCard key={path.id} path={path} onRefresh={refetch} />
            ))}
          </div>
        )}
      </div>
    </StaffLayout>
  );
}
