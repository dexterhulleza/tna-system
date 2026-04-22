/**
 * AdminCurriculumDetail — /admin/curriculum/:id
 * T3-1: View and edit a curriculum blueprint with its modules organised by layer.
 * T3-2: Regenerate AI content inline.
 * T3-3: TESDA alignment indicator panel.
 * T3-4: Status workflow controls (advance / revert).
 */
import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft,
  BookOpen,
  Sparkles,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  Send,
  Shield,
  Globe,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Link2,
  AlertCircle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
type Blueprint = {
  id: number;
  groupId: number;
  title: string;
  description: string | null;
  targetAudience: string | null;
  status: "draft" | "for_review" | "approved" | "published";
  alignmentType: "full_tr" | "partial_cs" | "supermarket" | "blended" | "none" | null;
  alignmentCondition: "strong" | "partial" | "emerging" | "blended" | null;
  alignmentNotes: string | null;
  tesdaReferenceId: number | null;
  isAiGenerated: boolean;
  overrideReason: string | null;
  version: number;
  generatedAt: Date | null;
  modelUsed: string | null;
  reviewedAt: Date | null;
  approvedAt: Date | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type Module = {
  id: number;
  blueprintId: number;
  layer: "foundation" | "core_role" | "context" | "advancement";
  title: string;
  description: string | null;
  competencyCategory: string | null;
  durationHours: number | null;
  modality: string | null;
  targetGapLevel: "critical" | "high" | "moderate" | "low" | null;
  estimatedAffectedCount: number | null;
  sortOrder: number;
  isAiGenerated: boolean;
  overrideReason: string | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const LAYERS: { key: Module["layer"]; label: string; color: string; description: string }[] = [
  { key: "foundation", label: "Foundation", color: "bg-slate-100 text-slate-700 border-slate-200", description: "Basic literacy, safety, workplace communication" },
  { key: "core_role", label: "Core Role", color: "bg-blue-100 text-blue-700 border-blue-200", description: "Technical competencies directly addressing identified gaps" },
  { key: "context", label: "Context", color: "bg-amber-100 text-amber-700 border-amber-200", description: "Industry-specific application, regulations, standards" },
  { key: "advancement", label: "Advancement", color: "bg-green-100 text-green-700 border-green-200", description: "Leadership, innovation, career progression" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-700", icon: Clock },
  for_review: { label: "For Review", color: "bg-amber-100 text-amber-700", icon: Send },
  approved: { label: "Approved", color: "bg-blue-100 text-blue-700", icon: Shield },
  published: { label: "Published", color: "bg-green-100 text-green-700", icon: Globe },
};

const ALIGNMENT_CONDITION_CONFIG: Record<string, { label: string; color: string; description: string }> = {
  strong: { label: "Strong", color: "bg-green-100 text-green-700", description: "≥90% of TESDA competency units covered" },
  partial: { label: "Partial", color: "bg-blue-100 text-blue-700", description: "60–89% of competency units covered" },
  emerging: { label: "Emerging", color: "bg-amber-100 text-amber-700", description: "<60% coverage — curriculum is developing" },
  blended: { label: "Blended", color: "bg-purple-100 text-purple-700", description: "Mix of TR, CS cluster, and Supermarket units" },
};

const ALIGNMENT_TYPE_LABELS: Record<string, string> = {
  full_tr: "Full Training Regulation (TR)",
  partial_cs: "Partial Competency Standard (CS) Cluster",
  supermarket: "Supermarket Micro-credential Assembly",
  blended: "Blended (TR + CS + Supermarket)",
  none: "Not yet aligned to TESDA",
};

const MODALITY_LABELS: Record<string, string> = {
  face_to_face: "Face-to-Face",
  online: "Online",
  blended: "Blended",
  on_the_job: "On-the-Job",
  coaching: "Coaching",
  self_directed: "Self-Directed",
};

const GAP_LEVEL_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  moderate: "bg-amber-100 text-amber-700",
  low: "bg-green-100 text-green-700",
};

// ─── Module Form Dialog ───────────────────────────────────────────────────────
function ModuleFormDialog({
  blueprintId,
  module,
  defaultLayer,
  onClose,
}: {
  blueprintId: number;
  module: Module | null;
  defaultLayer?: Module["layer"];
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    layer: module?.layer ?? defaultLayer ?? "core_role",
    title: module?.title ?? "",
    description: module?.description ?? "",
    competencyCategory: module?.competencyCategory ?? "",
    durationHours: module?.durationHours ? String(module.durationHours) : "",
    modality: module?.modality ?? "blended",
    targetGapLevel: module?.targetGapLevel ?? "high",
    estimatedAffectedCount: module?.estimatedAffectedCount ? String(module.estimatedAffectedCount) : "",
    overrideReason: module?.overrideReason ?? "",
  });

  const utils = trpc.useUtils();
  const upsert = trpc.curriculum.upsertModule.useMutation({
    onSuccess: () => {
      toast.success(module ? "Module updated" : "Module added");
      utils.curriculum.getById.invalidate({ id: blueprintId });
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{module ? "Edit Module" : "Add Module"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Layer *</Label>
              <Select value={form.layer} onValueChange={(v) => setForm((f) => ({ ...f, layer: v as Module["layer"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LAYERS.map((l) => <SelectItem key={l.key} value={l.key}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Gap Level</Label>
              <Select value={form.targetGapLevel} onValueChange={(v) => setForm((f) => ({ ...f, targetGapLevel: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["critical", "high", "moderate", "low"].map((l) => (
                    <SelectItem key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Module Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Digital Animation Fundamentals"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description / Learning Outcomes</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="What learners will achieve after completing this module…"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Competency Category</Label>
              <Input
                value={form.competencyCategory}
                onChange={(e) => setForm((f) => ({ ...f, competencyCategory: e.target.value }))}
                placeholder="e.g. Technical Skills"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Duration (hours)</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={form.durationHours}
                onChange={(e) => setForm((f) => ({ ...f, durationHours: e.target.value }))}
                placeholder="e.g. 16"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Modality</Label>
              <Select value={form.modality} onValueChange={(v) => setForm((f) => ({ ...f, modality: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(MODALITY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Affected Staff (est.)</Label>
              <Input
                type="number"
                min="0"
                value={form.estimatedAffectedCount}
                onChange={(e) => setForm((f) => ({ ...f, estimatedAffectedCount: e.target.value }))}
                placeholder="e.g. 12"
              />
            </div>
          </div>
          {module?.isAiGenerated && (
            <div className="space-y-1.5">
              <Label>Override Reason (if modifying AI content)</Label>
              <Textarea
                value={form.overrideReason}
                onChange={(e) => setForm((f) => ({ ...f, overrideReason: e.target.value }))}
                placeholder="Explain why this module was changed from the AI-generated version…"
                rows={2}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() =>
              upsert.mutate({
                id: module?.id,
                blueprintId,
                layer: form.layer as Module["layer"],
                title: form.title,
                description: form.description || null,
                competencyCategory: form.competencyCategory || null,
                durationHours: form.durationHours ? Number(form.durationHours) : null,
                modality: form.modality as any,
                targetGapLevel: form.targetGapLevel as any,
                estimatedAffectedCount: form.estimatedAffectedCount ? Number(form.estimatedAffectedCount) : 0,
                overrideReason: form.overrideReason || null,
              })
            }
            disabled={!form.title || upsert.isPending}
          >
            {upsert.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {module ? "Save Changes" : "Add Module"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Module Row ───────────────────────────────────────────────────────────────
function ModuleRow({
  module,
  onEdit,
  onDelete,
}: {
  module: Module;
  onEdit: (m: Module) => void;
  onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-slate-200 rounded-lg bg-white">
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50"
        onClick={() => setExpanded((e) => !e)}
      >
        <GripVertical className="w-4 h-4 text-slate-300 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-slate-900 truncate">{module.title}</span>
            {module.isAiGenerated && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">AI</span>
            )}
            {module.overrideReason && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Edited</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 flex-wrap">
            {module.competencyCategory && <span>{module.competencyCategory}</span>}
            {module.durationHours && <span>{module.durationHours}h</span>}
            {module.modality && <span>{MODALITY_LABELS[module.modality] ?? module.modality}</span>}
            {module.targetGapLevel && (
              <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-semibold", GAP_LEVEL_COLORS[module.targetGapLevel])}>
                {module.targetGapLevel}
              </span>
            )}
            {module.estimatedAffectedCount ? <span>{module.estimatedAffectedCount} staff</span> : null}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={(e) => { e.stopPropagation(); onEdit(module); }}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
            onClick={(e) => { e.stopPropagation(); onDelete(module.id); }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>
      {expanded && module.description && (
        <div className="px-4 pb-3 pt-0 text-sm text-slate-600 border-t border-slate-100">
          {module.description}
          {module.overrideReason && (
            <p className="mt-2 text-xs text-amber-700 bg-amber-50 p-2 rounded">
              <strong>Override reason:</strong> {module.overrideReason}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── T3-3 Alignment Indicator Panel ──────────────────────────────────────────
function AlignmentPanel({
  blueprint,
  onUpdate,
}: {
  blueprint: Blueprint;
  onUpdate: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    alignmentType: blueprint.alignmentType ?? "none",
    alignmentCondition: blueprint.alignmentCondition ?? "emerging",
    alignmentNotes: blueprint.alignmentNotes ?? "",
  });

  const utils = trpc.useUtils();
  const update = trpc.curriculum.upsert.useMutation({
    onSuccess: () => {
      toast.success("Alignment updated");
      utils.curriculum.getById.invalidate({ id: blueprint.id });
      setEditing(false);
      onUpdate();
    },
    onError: (err) => toast.error(err.message),
  });

  const condCfg = blueprint.alignmentCondition ? ALIGNMENT_CONDITION_CONFIG[blueprint.alignmentCondition] : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Link2 className="w-4 h-4 text-primary" />
          TESDA Alignment Indicator
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {!editing ? (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-slate-700">
                {ALIGNMENT_TYPE_LABELS[blueprint.alignmentType ?? "none"]}
              </span>
              {condCfg && (
                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", condCfg.color)}>
                  {condCfg.label}
                </span>
              )}
            </div>
            {condCfg && (
              <p className="text-xs text-slate-500">{condCfg.description}</p>
            )}
            {blueprint.alignmentNotes && (
              <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded">{blueprint.alignmentNotes}</p>
            )}
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="w-3.5 h-3.5 mr-1.5" />
              Edit Alignment
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs">Alignment Type</Label>
              <Select value={form.alignmentType} onValueChange={(v) => setForm((f) => ({ ...f, alignmentType: v as any }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ALIGNMENT_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Alignment Condition</Label>
              <Select value={form.alignmentCondition} onValueChange={(v) => setForm((f) => ({ ...f, alignmentCondition: v as any }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ALIGNMENT_CONDITION_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-xs">{v.label} — {v.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Alignment Notes</Label>
              <Textarea
                value={form.alignmentNotes}
                onChange={(e) => setForm((f) => ({ ...f, alignmentNotes: e.target.value }))}
                placeholder="Explain the alignment rationale…"
                rows={3}
                className="text-xs"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              <Button
                size="sm"
                onClick={() =>
                  update.mutate({
                    id: blueprint.id,
                    groupId: blueprint.groupId,
                    title: blueprint.title,
                    alignmentType: form.alignmentType as any,
                    alignmentCondition: form.alignmentCondition as any,
                    alignmentNotes: form.alignmentNotes || null,
                  })
                }
                disabled={update.isPending}
              >
                {update.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
                Save
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminCurriculumDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const blueprintId = Number(params.id);

  const [editingModule, setEditingModule] = useState<Module | null | "new">(null);
  const [addingLayer, setAddingLayer] = useState<Module["layer"] | null>(null);

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.curriculum.getById.useQuery({ id: blueprintId });

  const deleteModule = trpc.curriculum.deleteModule.useMutation({
    onSuccess: () => {
      toast.success("Module deleted");
      utils.curriculum.getById.invalidate({ id: blueprintId });
    },
    onError: (err) => toast.error(err.message),
  });

  const advanceStatus = trpc.curriculum.advanceStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      utils.curriculum.getById.invalidate({ id: blueprintId });
    },
    onError: (err) => toast.error(err.message),
  });

  const revertToDraft = trpc.curriculum.revertToDraft.useMutation({
    onSuccess: () => {
      toast.success("Reverted to Draft");
      utils.curriculum.getById.invalidate({ id: blueprintId });
    },
    onError: (err) => toast.error(err.message),
  });

  const regenerate = trpc.curriculum.generateBlueprint.useMutation({
    onSuccess: (result) => {
      toast.success(`Regenerated with ${result.modules.length} modules`);
      utils.curriculum.getById.invalidate({ id: blueprintId });
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-slate-600">Blueprint not found.</p>
        <Button variant="outline" className="mt-3" onClick={() => navigate("/admin/curriculum")}>
          Back to Blueprints
        </Button>
      </div>
    );
  }

  const { blueprint, modules } = data;
  const statusCfg = STATUS_CONFIG[blueprint.status];
  const StatusIcon = statusCfg?.icon ?? Clock;

  const nextStatus: Record<string, "for_review" | "approved" | "published"> = {
    draft: "for_review",
    for_review: "approved",
    approved: "published",
  };
  const next = nextStatus[blueprint.status];

  // Compute stats
  const totalHours = modules.reduce((sum, m) => sum + (m.durationHours ?? 0), 0);
  const layerCounts = LAYERS.map((l) => ({
    ...l,
    count: modules.filter((m) => m.layer === l.key).length,
  }));

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/curriculum")} className="mt-1">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={cn("inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full", statusCfg?.color)}>
              <StatusIcon className="w-3 h-3" />
              {statusCfg?.label}
            </span>
            {blueprint.isAiGenerated && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                <Sparkles className="w-3 h-3" />
                AI Generated
                {blueprint.modelUsed && ` · ${blueprint.modelUsed}`}
              </span>
            )}
            <span className="text-xs text-slate-400">v{blueprint.version}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">{blueprint.title}</h1>
          {blueprint.targetAudience && (
            <p className="text-sm text-slate-500 mt-0.5">Audience: {blueprint.targetAudience}</p>
          )}
        </div>
        {/* Workflow actions */}
        <div className="flex gap-2 flex-shrink-0 flex-wrap">
          {blueprint.isAiGenerated && blueprint.status === "draft" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => regenerate.mutate({ groupId: blueprint.groupId, blueprintId: blueprint.id })}
              disabled={regenerate.isPending}
            >
              {regenerate.isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
              Regenerate
            </Button>
          )}
          {blueprint.status !== "draft" && (
            <Button
              variant="outline"
              size="sm"
              className="text-amber-700 border-amber-300"
              onClick={() => revertToDraft.mutate({ id: blueprint.id })}
              disabled={revertToDraft.isPending}
            >
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Revert to Draft
            </Button>
          )}
          {next && (
            <Button
              size="sm"
              onClick={() => advanceStatus.mutate({ id: blueprint.id, newStatus: next })}
              disabled={advanceStatus.isPending}
            >
              {advanceStatus.isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
              {next === "for_review" ? "Submit for Review" : next === "approved" ? "Approve" : "Publish"}
            </Button>
          )}
        </div>
      </div>

      {/* Description */}
      {blueprint.description && (
        <p className="text-slate-600 text-sm bg-slate-50 p-3 rounded-lg border border-slate-200">
          {blueprint.description}
        </p>
      )}

      {/* Override reason banner */}
      {blueprint.overrideReason && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span><strong>Override note:</strong> {blueprint.overrideReason}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: modules */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats bar */}
          <div className="grid grid-cols-4 gap-3">
            {layerCounts.map((l) => (
              <div key={l.key} className={cn("p-3 rounded-xl border text-center", l.color)}>
                <p className="text-2xl font-bold">{l.count}</p>
                <p className="text-xs font-medium mt-0.5">{l.label}</p>
              </div>
            ))}
          </div>
          {totalHours > 0 && (
            <p className="text-sm text-slate-500">
              Total estimated duration: <strong>{totalHours}h</strong> across {modules.length} modules
            </p>
          )}

          {/* Modules by layer */}
          {LAYERS.map((layer) => {
            const layerModules = modules.filter((m) => m.layer === layer.key);
            return (
              <div key={layer.key}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className={cn("inline-flex items-center gap-1.5 text-sm font-semibold px-2.5 py-1 rounded-full border", layer.color)}>
                      {layer.label}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 ml-1">{layer.description}</p>
                  </div>
                  {blueprint.status === "draft" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setAddingLayer(layer.key); setEditingModule("new"); }}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Add
                    </Button>
                  )}
                </div>
                {layerModules.length === 0 ? (
                  <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center text-sm text-slate-400">
                    No modules in this layer yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {layerModules.map((m) => (
                      <ModuleRow
                        key={m.id}
                        module={m}
                        onEdit={(mod) => setEditingModule(mod)}
                        onDelete={(id) => {
                          if (confirm("Delete this module?")) deleteModule.mutate({ id });
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: sidebar panels */}
        <div className="space-y-4">
          {/* T3-3 Alignment Indicator */}
          <AlignmentPanel blueprint={blueprint as Blueprint} onUpdate={() => {}} />

          {/* Workflow timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                Review Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", blueprint.generatedAt ? "bg-purple-400" : "bg-slate-200")} />
                <span>
                  {blueprint.generatedAt
                    ? `AI generated ${new Date(blueprint.generatedAt).toLocaleDateString()}`
                    : "Not AI generated"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", blueprint.reviewedAt ? "bg-amber-400" : "bg-slate-200")} />
                <span>
                  {blueprint.reviewedAt
                    ? `Submitted for review ${new Date(blueprint.reviewedAt).toLocaleDateString()}`
                    : "Pending review submission"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", blueprint.approvedAt ? "bg-blue-400" : "bg-slate-200")} />
                <span>
                  {blueprint.approvedAt
                    ? `Approved ${new Date(blueprint.approvedAt).toLocaleDateString()}`
                    : "Pending approval"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", blueprint.publishedAt ? "bg-green-400" : "bg-slate-200")} />
                <span>
                  {blueprint.publishedAt
                    ? `Published ${new Date(blueprint.publishedAt).toLocaleDateString()}`
                    : "Not yet published"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Quick stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Module Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {layerCounts.map((l) => (
                <div key={l.key} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{l.label}</span>
                  <span className="font-semibold text-slate-900">{l.count} modules</span>
                </div>
              ))}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-sm font-semibold">
                <span className="text-slate-700">Total</span>
                <span>{modules.length} modules · {totalHours}h</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Module form dialog */}
      {editingModule !== null && (
        <ModuleFormDialog
          blueprintId={blueprintId}
          module={editingModule === "new" ? null : editingModule}
          defaultLayer={addingLayer ?? undefined}
          onClose={() => { setEditingModule(null); setAddingLayer(null); }}
        />
      )}
    </div>
  );
}
