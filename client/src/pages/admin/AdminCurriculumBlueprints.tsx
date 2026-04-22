/**
 * AdminCurriculumBlueprints — /admin/curriculum
 * T3-1: Lists all curriculum blueprints across all survey groups.
 * T3-4: Review and approval workflow — Draft → For Review → Approved → Published.
 * T3-2: Trigger AI-assisted generation per group.
 */
import { useState } from "react";
import { useLocation } from "wouter";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  BookOpen,
  Sparkles,
  Loader2,
  Plus,
  Eye,
  Trash2,
  CheckCircle2,
  Clock,
  Send,
  Shield,
  Globe,
  RotateCcw,
  AlertCircle,
  ChevronRight,
  Users,
  Layers,
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
  isAiGenerated: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

type Group = { id: number; name: string; code: string };

// ─── Status helpers ───────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-700", icon: Clock },
  for_review: { label: "For Review", color: "bg-amber-100 text-amber-700", icon: Send },
  approved: { label: "Approved", color: "bg-blue-100 text-blue-700", icon: Shield },
  published: { label: "Published", color: "bg-green-100 text-green-700", icon: Globe },
};

const ALIGNMENT_CONFIG: Record<string, { label: string; color: string }> = {
  strong: { label: "Strong", color: "bg-green-100 text-green-700" },
  partial: { label: "Partial", color: "bg-blue-100 text-blue-700" },
  emerging: { label: "Emerging", color: "bg-amber-100 text-amber-700" },
  blended: { label: "Blended", color: "bg-purple-100 text-purple-700" },
};

const ALIGNMENT_TYPE_LABELS: Record<string, string> = {
  full_tr: "Full TR",
  partial_cs: "Partial CS",
  supermarket: "Supermarket",
  blended: "Blended",
  none: "Not Aligned",
};

// ─── Generate Dialog ──────────────────────────────────────────────────────────
function GenerateDialog({
  open,
  onClose,
  groups,
  existingBlueprints,
}: {
  open: boolean;
  onClose: () => void;
  groups: Group[];
  existingBlueprints: Blueprint[];
}) {
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const utils = trpc.useUtils();

  const generate = trpc.curriculum.generateBlueprint.useMutation({
    onSuccess: (data) => {
      toast.success(`Blueprint "${data.blueprint?.title}" generated with ${data.modules.length} modules`);
      utils.curriculum.list.invalidate();
      onClose();
      setSelectedGroupId("");
    },
    onError: (err) => toast.error(err.message),
  });

  const existingForGroup = existingBlueprints.find((b) => b.groupId === Number(selectedGroupId));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI-Generate Curriculum Blueprint
          </DialogTitle>
          <DialogDescription>
            Select a survey group. The AI will analyse gap records and prioritization data to generate a structured 4-layer curriculum blueprint.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Survey Group</Label>
            <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a group…" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={String(g.id)}>
                    {g.name} ({g.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {existingForGroup && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                This group already has a blueprint (<strong>{existingForGroup.title}</strong>). Generating will create a new version alongside the existing one.
              </span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => generate.mutate({ groupId: Number(selectedGroupId) })}
            disabled={!selectedGroupId || generate.isPending}
          >
            {generate.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" />Generate</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create Blueprint Dialog ──────────────────────────────────────────────────
function CreateBlueprintDialog({
  open,
  onClose,
  groups,
}: {
  open: boolean;
  onClose: () => void;
  groups: Group[];
}) {
  const [form, setForm] = useState({ groupId: "", title: "", description: "", targetAudience: "" });
  const utils = trpc.useUtils();

  const create = trpc.curriculum.upsert.useMutation({
    onSuccess: () => {
      toast.success("Blueprint created");
      utils.curriculum.list.invalidate();
      onClose();
      setForm({ groupId: "", title: "", description: "", targetAudience: "" });
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Curriculum Blueprint</DialogTitle>
          <DialogDescription>Create a blank blueprint to fill in manually.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Survey Group *</Label>
            <Select value={form.groupId} onValueChange={(v) => setForm((f) => ({ ...f, groupId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select group…" /></SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={String(g.id)}>{g.name} ({g.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Film & Animation NC II Curriculum"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Brief overview of the curriculum…"
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Target Audience</Label>
            <Input
              value={form.targetAudience}
              onChange={(e) => setForm((f) => ({ ...f, targetAudience: e.target.value }))}
              placeholder="e.g. Junior animators, entry-level staff"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() =>
              create.mutate({
                groupId: Number(form.groupId),
                title: form.title,
                description: form.description || null,
                targetAudience: form.targetAudience || null,
              })
            }
            disabled={!form.groupId || !form.title || create.isPending}
          >
            {create.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Create Blueprint
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Advance Status Dialog (T3-4) ─────────────────────────────────────────────
function AdvanceStatusDialog({
  blueprint,
  onClose,
}: {
  blueprint: Blueprint | null;
  onClose: () => void;
}) {
  const [overrideReason, setOverrideReason] = useState("");
  const utils = trpc.useUtils();

  const nextStatus: Record<string, "for_review" | "approved" | "published"> = {
    draft: "for_review",
    for_review: "approved",
    approved: "published",
  };

  const advance = trpc.curriculum.advanceStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      utils.curriculum.list.invalidate();
      onClose();
      setOverrideReason("");
    },
    onError: (err) => toast.error(err.message),
  });

  const revert = trpc.curriculum.revertToDraft.useMutation({
    onSuccess: () => {
      toast.success("Reverted to Draft");
      utils.curriculum.list.invalidate();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  if (!blueprint) return null;
  const next = nextStatus[blueprint.status];
  const nextLabel = next ? STATUS_CONFIG[next]?.label : null;

  return (
    <Dialog open={!!blueprint} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Blueprint Status</DialogTitle>
          <DialogDescription>
            <strong>{blueprint.title}</strong> — currently <strong>{STATUS_CONFIG[blueprint.status]?.label}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {next && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              Advancing to <strong>{nextLabel}</strong>
              {next === "approved" && " — this signals L&D sign-off on the blueprint content."}
              {next === "published" && " — this makes the blueprint visible to all stakeholders."}
            </div>
          )}
          {(next === "approved" || next === "published") && blueprint.isAiGenerated && (
            <div className="space-y-1.5">
              <Label>Override Reason (required if AI content was modified)</Label>
              <Textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Describe any changes made to the AI-generated content…"
                rows={3}
              />
            </div>
          )}
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {blueprint.status !== "draft" && (
            <Button
              variant="outline"
              className="text-amber-700 border-amber-300 hover:bg-amber-50"
              onClick={() => revert.mutate({ id: blueprint.id })}
              disabled={revert.isPending}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Revert to Draft
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {next && (
            <Button
              onClick={() =>
                advance.mutate({
                  id: blueprint.id,
                  newStatus: next,
                  overrideReason: overrideReason || null,
                })
              }
              disabled={advance.isPending}
            >
              {advance.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Advance to {nextLabel}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Blueprint Card ───────────────────────────────────────────────────────────
function BlueprintCard({
  blueprint,
  groupName,
  onAdvance,
  onDelete,
}: {
  blueprint: Blueprint;
  groupName: string;
  onAdvance: (b: Blueprint) => void;
  onDelete: (id: number) => void;
}) {
  const [, navigate] = useLocation();
  const statusCfg = STATUS_CONFIG[blueprint.status];
  const StatusIcon = statusCfg?.icon ?? Clock;
  const alignCfg = blueprint.alignmentCondition ? ALIGNMENT_CONFIG[blueprint.alignmentCondition] : null;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={cn("inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full", statusCfg?.color)}>
                <StatusIcon className="w-3 h-3" />
                {statusCfg?.label}
              </span>
              {blueprint.isAiGenerated && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                  <Sparkles className="w-3 h-3" />
                  AI Generated
                </span>
              )}
              {alignCfg && (
                <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full", alignCfg.color)}>
                  {blueprint.alignmentType ? ALIGNMENT_TYPE_LABELS[blueprint.alignmentType] : ""}
                  {" · "}
                  {alignCfg.label}
                </span>
              )}
            </div>
            <CardTitle className="text-base leading-snug">{blueprint.title}</CardTitle>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <Users className="w-3 h-3" />
              {groupName}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {blueprint.description && (
          <p className="text-sm text-slate-600 mb-3 line-clamp-2">{blueprint.description}</p>
        )}
        {blueprint.targetAudience && (
          <p className="text-xs text-slate-500 mb-3">
            <span className="font-medium">Audience:</span> {blueprint.targetAudience}
          </p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/admin/curriculum/${blueprint.id}`)}
          >
            <Eye className="w-3.5 h-3.5 mr-1.5" />
            View / Edit
            <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
          {blueprint.status !== "published" && (
            <Button size="sm" variant="outline" onClick={() => onAdvance(blueprint)}>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              {blueprint.status === "draft" ? "Submit for Review" : blueprint.status === "for_review" ? "Approve" : "Publish"}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-red-600 hover:bg-red-50 ml-auto"
            onClick={() => onDelete(blueprint.id)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminCurriculumBlueprints() {
  const [showGenerate, setShowGenerate] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [advanceTarget, setAdvanceTarget] = useState<Blueprint | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterGroup, setFilterGroup] = useState<string>("all");

  const utils = trpc.useUtils();
  const { data: blueprints = [], isLoading } = trpc.curriculum.list.useQuery({});
  const { data: groups = [] } = trpc.groups.list.useQuery({ activeOnly: false });

  const deleteMutation = trpc.curriculum.delete.useMutation({
    onSuccess: () => {
      toast.success("Blueprint deleted");
      utils.curriculum.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const groupMap = Object.fromEntries((groups as Group[]).map((g) => [g.id, g]));

  const filtered = (blueprints as Blueprint[]).filter((b) => {
    if (filterStatus !== "all" && b.status !== filterStatus) return false;
    if (filterGroup !== "all" && String(b.groupId) !== filterGroup) return false;
    return true;
  });

  const statusCounts = (blueprints as Blueprint[]).reduce(
    (acc, b) => { acc[b.status] = (acc[b.status] ?? 0) + 1; return acc; },
    {} as Record<string, number>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            Curriculum Blueprints
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Structured 4-layer curriculum packages generated from TNA gap data. Review and approve before publishing.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Blueprint
          </Button>
          <Button onClick={() => setShowGenerate(true)}>
            <Sparkles className="w-4 h-4 mr-2" />
            AI Generate
          </Button>
        </div>
      </div>

      {/* Status summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <button
              key={key}
              onClick={() => setFilterStatus(filterStatus === key ? "all" : key)}
              className={cn(
                "p-3 rounded-xl border text-left transition-all",
                filterStatus === key ? "border-primary bg-primary/5 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-medium text-slate-500">{cfg.label}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{statusCounts[key] ?? 0}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={filterGroup} onValueChange={setFilterGroup}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="All Groups" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Groups</SelectItem>
            {(groups as Group[]).map((g) => (
              <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filterStatus !== "all" && (
          <Button variant="ghost" size="sm" onClick={() => setFilterStatus("all")}>
            Clear filter
          </Button>
        )}
      </div>

      {/* Blueprint grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <Layers className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-700 mb-1">No blueprints found</h3>
          <p className="text-sm text-slate-500 mb-4">
            {filterStatus !== "all" || filterGroup !== "all"
              ? "Try clearing the filters."
              : "Generate your first curriculum blueprint using the AI button above."}
          </p>
          <Button onClick={() => setShowGenerate(true)}>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Blueprint
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((bp) => (
            <BlueprintCard
              key={bp.id}
              blueprint={bp}
              groupName={groupMap[bp.groupId]?.name ?? `Group #${bp.groupId}`}
              onAdvance={setAdvanceTarget}
              onDelete={(id) => {
                if (confirm("Delete this blueprint and all its modules?")) {
                  deleteMutation.mutate({ id });
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <GenerateDialog
        open={showGenerate}
        onClose={() => setShowGenerate(false)}
        groups={groups as Group[]}
        existingBlueprints={blueprints as Blueprint[]}
      />
      <CreateBlueprintDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        groups={groups as Group[]}
      />
      <AdvanceStatusDialog
        blueprint={advanceTarget}
        onClose={() => setAdvanceTarget(null)}
      />
    </div>
  );
}
