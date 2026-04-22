/**
 * AdminCampaigns — T5-4
 * TNA Campaign Lifecycle: Draft → Open → Closed → Under Review → Finalized
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Megaphone, Plus, Loader2, RefreshCw, ChevronRight,
  Users, BarChart3, AlertTriangle, Calendar, Trash2,
  CheckCircle2, FileText,
} from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; description: string }> = {
  draft:        { label: "Draft",        color: "text-slate-600",  bg: "bg-slate-100",   description: "Being prepared" },
  open:         { label: "Open",         color: "text-blue-700",   bg: "bg-blue-100",    description: "Surveys active" },
  closed:       { label: "Closed",       color: "text-orange-700", bg: "bg-orange-100",  description: "Surveys closed" },
  under_review: { label: "Under Review", color: "text-purple-700", bg: "bg-purple-100",  description: "Being analyzed" },
  finalized:    { label: "Finalized",    color: "text-emerald-700",bg: "bg-emerald-100", description: "Complete" },
};

const STATUS_FLOW: Record<string, string[]> = {
  draft:        ["open"],
  open:         ["closed"],
  closed:       ["under_review"],
  under_review: ["finalized"],
  finalized:    [],
};

export default function AdminCampaigns() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAdvanceDialog, setShowAdvanceDialog] = useState<{ id: number; nextStatus: string; title: string } | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState<any | null>(null);
  const [finalizationSummary, setFinalizationSummary] = useState("");
  const [form, setForm] = useState({
    id: undefined as number | undefined,
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    reviewNotes: "",
  });

  const { data: campaigns, isLoading, refetch } = trpc.campaigns.list.useQuery();
  const { data: groups } = trpc.groups.list.useQuery({ activeOnly: false });
  const { data: blueprints } = trpc.curriculum.list.useQuery({});

  const [linkedGroupIds, setLinkedGroupIds] = useState<number[]>([]);
  const [linkedBlueprintIds, setLinkedBlueprintIds] = useState<number[]>([]);

  const upsertMutation = trpc.campaigns.upsert.useMutation({
    onSuccess: () => {
      toast.success(form.id ? "Campaign updated" : "Campaign created");
      setShowCreateDialog(false);
      resetForm();
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const advanceMutation = trpc.campaigns.advanceStatus.useMutation({
    onSuccess: () => {
      toast.success("Campaign status updated");
      setShowAdvanceDialog(null);
      setFinalizationSummary("");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const refreshStatsMutation = trpc.campaigns.refreshStats.useMutation({
    onSuccess: () => { toast.success("Stats refreshed"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.campaigns.delete.useMutation({
    onSuccess: () => { toast.success("Campaign deleted"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  function resetForm() {
    setForm({ id: undefined, title: "", description: "", startDate: "", endDate: "", reviewNotes: "" });
    setLinkedGroupIds([]);
    setLinkedBlueprintIds([]);
  }

  function openEdit(c: any) {
    setForm({
      id: c.id,
      title: c.title,
      description: c.description ?? "",
      startDate: c.startDate ? new Date(c.startDate).toISOString().slice(0, 10) : "",
      endDate: c.endDate ? new Date(c.endDate).toISOString().slice(0, 10) : "",
      reviewNotes: c.reviewNotes ?? "",
    });
    setLinkedGroupIds(Array.isArray(c.linkedGroupIds) ? c.linkedGroupIds : []);
    setLinkedBlueprintIds(Array.isArray(c.linkedBlueprintIds) ? c.linkedBlueprintIds : []);
    setShowCreateDialog(true);
  }

  function handleSave() {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    upsertMutation.mutate({
      ...form,
      linkedGroupIds: linkedGroupIds.length > 0 ? linkedGroupIds : null,
      linkedBlueprintIds: linkedBlueprintIds.length > 0 ? linkedBlueprintIds : null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      reviewNotes: form.reviewNotes || null,
    });
  }

  function toggleGroup(id: number) {
    setLinkedGroupIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }
  function toggleBlueprint(id: number) {
    setLinkedBlueprintIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  const statusCounts = (campaigns ?? []).reduce((acc: Record<string, number>, c: any) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Megaphone className="w-6 h-6 text-blue-500" />
              TNA Campaigns
            </h1>
            <p className="text-slate-500 text-sm mt-1">T5-4 Campaign Lifecycle Management</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              New Campaign
            </Button>
          </div>
        </div>

        {/* Status Pipeline */}
        <div className="flex gap-3 overflow-x-auto pb-1">
          {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
            <div key={status} className={`flex-1 min-w-28 rounded-xl border p-3 ${cfg.bg}`}>
              <div className={`text-2xl font-bold ${cfg.color}`}>{statusCounts[status] ?? 0}</div>
              <div className={`text-xs font-medium ${cfg.color} mt-0.5`}>{cfg.label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{cfg.description}</div>
            </div>
          ))}
        </div>

        {/* Campaign List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : (campaigns ?? []).length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No campaigns yet</p>
            <p className="text-sm mt-1">Create a campaign to organize TNA cycles across groups</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(campaigns ?? []).map((c: any) => {
              const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.draft;
              const nextStatuses = STATUS_FLOW[c.status] ?? [];
              const groupCount = Array.isArray(c.linkedGroupIds) ? c.linkedGroupIds.length : 0;
              const blueprintCount = Array.isArray(c.linkedBlueprintIds) ? c.linkedBlueprintIds.length : 0;
              return (
                <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-all">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        {c.startDate && (
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(c.startDate).toLocaleDateString()} – {c.endDate ? new Date(c.endDate).toLocaleDateString() : "ongoing"}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-slate-900 mt-1.5 text-lg">{c.title}</h3>
                      {c.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{c.description}</p>}

                      {/* Stats Row */}
                      <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          {c.completedSurveys ?? 0}/{c.totalRespondents ?? 0} completed
                        </span>
                        <span className="flex items-center gap-1.5">
                          <BarChart3 className="w-3.5 h-3.5" />
                          Avg gap: {c.avgGapScore ?? "—"}
                        </span>
                        {(c.criticalGapCount ?? 0) > 0 && (
                          <span className="flex items-center gap-1.5 text-red-500">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {c.criticalGapCount} critical
                          </span>
                        )}
                        <span className="text-slate-400">{groupCount} group{groupCount !== 1 ? "s" : ""}</span>
                        <span className="text-slate-400">{blueprintCount} blueprint{blueprintCount !== 1 ? "s" : ""}</span>
                      </div>

                      {c.finalizationSummary && (
                        <div className="mt-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                          <p className="text-xs font-medium text-emerald-700 mb-1 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Finalization Summary
                          </p>
                          <p className="text-sm text-emerald-800">{c.finalizationSummary}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 items-end shrink-0">
                      {/* Advance Status Buttons */}
                      {nextStatuses.map((ns) => (
                        <Button
                          key={ns}
                          size="sm"
                          onClick={() => {
                            setFinalizationSummary("");
                            setShowAdvanceDialog({ id: c.id, nextStatus: ns, title: c.title });
                          }}
                        >
                          → {STATUS_CONFIG[ns]?.label}
                          <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      ))}
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => refreshStatsMutation.mutate({ id: c.id })}
                          disabled={refreshStatsMutation.isPending} title="Refresh stats">
                          <RefreshCw className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(c)} title="Edit">
                          <FileText className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost"
                          className="text-red-400 hover:text-red-600"
                          onClick={() => { if (confirm("Delete this campaign?")) deleteMutation.mutate({ id: c.id }); }}
                          title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => { if (!open) { setShowCreateDialog(false); resetForm(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Campaign" : "New TNA Campaign"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g., Q2 2026 TNA Cycle" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>

            {/* Linked Groups */}
            <div>
              <Label className="mb-2 block">Linked Groups</Label>
              <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                {(groups ?? []).length === 0 ? (
                  <p className="text-xs text-slate-400 p-2">No groups available</p>
                ) : (groups ?? []).map((g: any) => (
                  <label key={g.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={linkedGroupIds.includes(g.id)}
                      onChange={() => toggleGroup(g.id)}
                      className="rounded"
                    />
                    <span className="text-sm">{g.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Linked Blueprints */}
            <div>
              <Label className="mb-2 block">Linked Curriculum Blueprints</Label>
              <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                {(blueprints ?? []).length === 0 ? (
                  <p className="text-xs text-slate-400 p-2">No published blueprints available</p>
                ) : (blueprints ?? []).map((b: any) => (
                  <label key={b.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={linkedBlueprintIds.includes(b.id)}
                      onChange={() => toggleBlueprint(b.id)}
                      className="rounded"
                    />
                    <span className="text-sm">{b.title}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label>Review Notes</Label>
              <Textarea rows={2} value={form.reviewNotes} onChange={(e) => setForm(f => ({ ...f, reviewNotes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {form.id ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Advance Status Dialog */}
      <Dialog open={!!showAdvanceDialog} onOpenChange={() => setShowAdvanceDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Advance to {STATUS_CONFIG[showAdvanceDialog?.nextStatus ?? ""]?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-slate-600">
              Advance <strong>{showAdvanceDialog?.title}</strong> to <strong>{STATUS_CONFIG[showAdvanceDialog?.nextStatus ?? ""]?.label}</strong>?
            </p>
            {showAdvanceDialog?.nextStatus === "finalized" && (
              <div>
                <Label>Finalization Summary</Label>
                <Textarea
                  rows={3}
                  placeholder="Summarize the key findings, decisions, and next steps from this TNA cycle..."
                  value={finalizationSummary}
                  onChange={(e) => setFinalizationSummary(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdvanceDialog(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!showAdvanceDialog) return;
                advanceMutation.mutate({
                  id: showAdvanceDialog.id,
                  newStatus: showAdvanceDialog.nextStatus as any,
                  finalizationSummary: finalizationSummary || undefined,
                });
              }}
              disabled={advanceMutation.isPending}
            >
              {advanceMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
