import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ListOrdered, Zap, Plus, Pencil, Trash2, RefreshCw, CheckCircle2, Clock, PlayCircle, XCircle, PauseCircle } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.JSX.Element }> = {
  pending:     { label: "Pending",     color: "bg-gray-100 text-gray-800",   icon: <Clock className="h-3 w-3" /> },
  approved:    { label: "Approved",    color: "bg-green-100 text-green-800", icon: <CheckCircle2 className="h-3 w-3" /> },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-800",   icon: <PlayCircle className="h-3 w-3" /> },
  completed:   { label: "Completed",   color: "bg-emerald-100 text-emerald-800", icon: <CheckCircle2 className="h-3 w-3" /> },
  deferred:    { label: "Deferred",    color: "bg-yellow-100 text-yellow-800", icon: <PauseCircle className="h-3 w-3" /> },
};

const PRIORITY_COLORS = [
  "bg-red-500",    // rank 1-3
  "bg-orange-400", // rank 4-6
  "bg-yellow-400", // rank 7-10
  "bg-green-400",  // rank 11+
];

function getPriorityColor(rank: number | null) {
  if (!rank) return PRIORITY_COLORS[3];
  if (rank <= 3) return PRIORITY_COLORS[0];
  if (rank <= 6) return PRIORITY_COLORS[1];
  if (rank <= 10) return PRIORITY_COLORS[2];
  return PRIORITY_COLORS[3];
}

export default function AdminPrioritizationMatrix() {
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({
    trainingNeedLabel: "",
    category: "",
    urgencyScore: 3,
    impactScore: 3,
    feasibilityScore: 3,
    notes: "",
    status: "pending" as const,
    isManualOverride: true,
  });

  const { data: groups } = trpc.groups.list.useQuery({ activeOnly: true });
  const { data: matrix, refetch, isLoading } = trpc.prioritization.list.useQuery(
    { groupId: Number(selectedGroup) },
    { enabled: !!selectedGroup }
  );

  const generateMutation = trpc.prioritization.generate.useMutation({
    onSuccess: (data) => {
      toast.success(`Generated ${data.generated} prioritization items from gap records`);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const upsertMutation = trpc.prioritization.upsert.useMutation({
    onSuccess: () => {
      toast.success(editItem ? "Item updated" : "Item added");
      setShowDialog(false);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.prioritization.delete.useMutation({
    onSuccess: () => { toast.success("Item removed"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const statusMutation = trpc.prioritization.updateStatus.useMutation({
    onSuccess: () => refetch(),
    onError: (e) => toast.error(e.message),
  });

  const groupList = (groups as any[]) ?? [];
  const items = (matrix ?? []) as any[];
  const filtered = items.filter(({ item }) => filterStatus === "all" || item.status === filterStatus);

  const priorityScore = form.urgencyScore * form.impactScore * form.feasibilityScore;

  function openCreate() {
    setEditItem(null);
    setForm({ trainingNeedLabel: "", category: "", urgencyScore: 3, impactScore: 3, feasibilityScore: 3, notes: "", status: "pending", isManualOverride: true });
    setShowDialog(true);
  }

  function openEdit(item: any) {
    setEditItem(item);
    setForm({
      trainingNeedLabel: item.trainingNeedLabel,
      category: item.category ?? "",
      urgencyScore: item.urgencyScore,
      impactScore: item.impactScore,
      feasibilityScore: item.feasibilityScore,
      notes: item.notes ?? "",
      status: item.status,
      isManualOverride: true,
    });
    setShowDialog(true);
  }

  function handleSubmit() {
    if (!form.trainingNeedLabel.trim()) { toast.error("Training need label is required"); return; }
    if (!selectedGroup) return;
    upsertMutation.mutate({
      id: editItem?.id,
      groupId: Number(selectedGroup),
      trainingNeedLabel: form.trainingNeedLabel,
      category: form.category || null,
      urgencyScore: form.urgencyScore,
      impactScore: form.impactScore,
      feasibilityScore: form.feasibilityScore,
      notes: form.notes || null,
      status: form.status,
      isManualOverride: form.isManualOverride,
    });
  }

  const approvedCount = items.filter(({ item }) => item.status === "approved" || item.status === "in_progress").length;
  const completedCount = items.filter(({ item }) => item.status === "completed").length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ListOrdered className="h-6 w-6 text-primary" />
            Prioritization Matrix
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Rank training needs by Urgency × Impact × Feasibility. Generate from gap records or add manually.
          </p>
        </div>
        <div className="flex gap-2">
          {selectedGroup && (
            <>
              <Button variant="outline" onClick={() => generateMutation.mutate({ groupId: Number(selectedGroup) })} disabled={generateMutation.isPending}>
                <RefreshCw className={`h-4 w-4 mr-2 ${generateMutation.isPending ? "animate-spin" : ""}`} />
                {generateMutation.isPending ? "Generating..." : "Generate from Gaps"}
              </Button>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" /> Add Item
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-3 items-center">
        <Select value={selectedGroup} onValueChange={setSelectedGroup}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Select group..." />
          </SelectTrigger>
          <SelectContent>
            {groupList.map((g: any) => (
              <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedGroup ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <ListOrdered className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Select a group to view the prioritization matrix</p>
            <p className="text-sm mt-1">Click "Generate from Gaps" to auto-populate from competency gap records.</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-4 gap-3">
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{items.length}</div><div className="text-sm text-muted-foreground">Total items</div></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-blue-600">{approvedCount}</div><div className="text-sm text-muted-foreground">Active</div></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">{completedCount}</div><div className="text-sm text-muted-foreground">Completed</div></CardContent></Card>
            <Card><CardContent className="pt-4">
              <div className="text-2xl font-bold">
                {items.length > 0 ? Math.round(items[0]?.item?.priorityScore ?? 0) : "—"}
              </div>
              <div className="text-sm text-muted-foreground">Top priority score</div>
            </CardContent></Card>
          </div>

          {/* Matrix table */}
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>No items found. Click "Generate from Gaps" or "Add Item" to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filtered.map(({ item, question }) => {
                const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
                return (
                  <Card key={item.id} className="overflow-hidden">
                    <div className="flex">
                      {/* Rank indicator */}
                      <div className={`w-12 flex-shrink-0 flex items-center justify-center text-white font-bold text-lg ${getPriorityColor(item.rank)}`}>
                        {item.rank ?? "—"}
                      </div>
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{item.trainingNeedLabel}</div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {item.category && <Badge variant="outline" className="text-xs">{item.category.replace(/_/g, " ")}</Badge>}
                              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
                                {cfg.icon} {cfg.label}
                              </span>
                              {item.isManualOverride && <Badge variant="secondary" className="text-xs">Manual</Badge>}
                              {item.affectedCount > 0 && <span className="text-xs text-muted-foreground">{item.affectedCount} affected</span>}
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <div className="text-lg font-bold text-primary">{Math.round(item.priorityScore)}</div>
                            <div className="text-xs text-muted-foreground">priority score</div>
                          </div>
                        </div>

                        {/* Score breakdown */}
                        <div className="grid grid-cols-3 gap-2 mt-3">
                          {[
                            { label: "Urgency", value: item.urgencyScore },
                            { label: "Impact", value: item.impactScore },
                            { label: "Feasibility", value: item.feasibilityScore },
                          ].map(({ label, value }) => (
                            <div key={label} className="bg-muted/50 rounded px-2 py-1 text-center">
                              <div className="text-xs text-muted-foreground">{label}</div>
                              <div className="font-semibold">{value}/5</div>
                            </div>
                          ))}
                        </div>

                        {item.notes && <p className="text-xs text-muted-foreground mt-2 italic">{item.notes}</p>}

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-3">
                          <Select
                            value={item.status}
                            onValueChange={(v) => statusMutation.mutate({ id: item.id, groupId: Number(selectedGroup), status: v as any })}
                          >
                            <SelectTrigger className="h-7 text-xs w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>
                            <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"
                            onClick={() => { if (confirm("Remove this item?")) deleteMutation.mutate({ id: item.id, groupId: Number(selectedGroup) }); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Training Need" : "Add Training Need"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Training Need Label *</Label>
              <Input
                placeholder="e.g. Technical Skills — Digital Literacy"
                value={form.trainingNeedLabel}
                onChange={(e) => setForm(f => ({ ...f, trainingNeedLabel: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Category</Label>
              <Input
                placeholder="e.g. job_task, individual, organizational"
                value={form.category}
                onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
              />
            </div>

            {/* Score sliders */}
            {[
              { key: "urgencyScore" as const, label: "Urgency", desc: "How soon is training needed?" },
              { key: "impactScore" as const, label: "Impact", desc: "Business / performance impact if not addressed" },
              { key: "feasibilityScore" as const, label: "Feasibility", desc: "Ease of delivering the training" },
            ].map(({ key, label, desc }) => (
              <div key={key} className="space-y-1.5">
                <div className="flex justify-between">
                  <Label>{label}</Label>
                  <span className="text-sm font-bold text-primary">{form[key]}/5</span>
                </div>
                <Slider
                  min={1}
                  max={5}
                  step={1}
                  value={[form[key]]}
                  onValueChange={([v]) => setForm(f => ({ ...f, [key]: v }))}
                />
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}

            <div className="bg-primary/10 rounded-md p-3 text-center">
              <div className="text-2xl font-bold text-primary">{priorityScore}</div>
              <div className="text-xs text-muted-foreground">Priority Score (U × I × F, max 125)</div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional context or justification..."
                value={form.notes}
                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
