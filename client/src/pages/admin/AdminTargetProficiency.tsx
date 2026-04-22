import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Target, Plus, Pencil, Trash2, Info, ChevronDown, ChevronUp } from "lucide-react";

const TNA_ROLES = [
  { value: "all", label: "All Roles" },
  { value: "line_manager", label: "Line Manager" },
  { value: "hr_officer", label: "HR Officer" },
  { value: "employee", label: "Employee" },
  { value: "supervisor", label: "Supervisor" },
];

const PROFICIENCY_LABELS = [
  "Beginner",
  "Developing",
  "Competent",
  "Proficient",
  "Expert",
];

const GAP_LEVEL_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  moderate: "bg-yellow-100 text-yellow-800",
  low: "bg-blue-100 text-blue-800",
  none: "bg-green-100 text-green-800",
};

export default function AdminTargetProficiency() {
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);

  const [form, setForm] = useState({
    questionId: 0,
    targetScore: 80,
    proficiencyLabel: "Proficient",
    tnaRole: "all",
    rationale: "",
    isActive: true,
  });

  const { data: proficiencies, refetch } = trpc.targetProficiency.list.useQuery({ activeOnly: false });
  const { data: questionsData } = trpc.questions.list.useQuery({ activeOnly: true });

  const upsertMutation = trpc.targetProficiency.upsert.useMutation({
    onSuccess: () => {
      toast.success(editItem ? "Target updated" : "Target created");
      setShowDialog(false);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.targetProficiency.delete.useMutation({
    onSuccess: () => { toast.success("Target deleted"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const questions = (questionsData as any)?.questions ?? [];

  const filtered = (proficiencies ?? []).filter(({ tp, question }) => {
    const q = question?.questionText ?? "";
    return q.toLowerCase().includes(search.toLowerCase());
  });

  // Group by question
  const grouped: Record<number, { question: any; targets: any[] }> = {};
  for (const row of filtered) {
    const qid = row.tp.questionId;
    if (!grouped[qid]) grouped[qid] = { question: row.question, targets: [] };
    grouped[qid].targets.push(row.tp);
  }

  function openCreate() {
    setEditItem(null);
    setForm({ questionId: questions[0]?.id ?? 0, targetScore: 80, proficiencyLabel: "Proficient", tnaRole: "all", rationale: "", isActive: true });
    setShowDialog(true);
  }

  function openEdit(tp: any) {
    setEditItem(tp);
    setForm({
      questionId: tp.questionId,
      targetScore: tp.targetScore,
      proficiencyLabel: tp.proficiencyLabel ?? "Proficient",
      tnaRole: tp.tnaRole ?? "all",
      rationale: tp.rationale ?? "",
      isActive: tp.isActive,
    });
    setShowDialog(true);
  }

  function handleSubmit() {
    if (!form.questionId) { toast.error("Select a question"); return; }
    upsertMutation.mutate({
      id: editItem?.id,
      questionId: form.questionId,
      targetScore: form.targetScore,
      proficiencyLabel: form.proficiencyLabel,
      tnaRole: form.tnaRole === "all" ? null : form.tnaRole,
      rationale: form.rationale || null,
      isActive: form.isActive,
    });
  }

  const groupEntries = Object.entries(grouped);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Target Proficiency Levels
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Define expected competency benchmarks per question. The gap engine compares actual scores against these targets (default: 80%).
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Add Target
        </Button>
      </div>

      {/* Info banner */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4 pb-3">
          <div className="flex gap-3 text-sm text-blue-800">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <strong>How it works:</strong> When a respondent completes a survey, the TNA engine compares their composite score (self ± supervisor ± KPI) against the target set here.
              A gap = target − actual. If no target is set for a question, the system defaults to <strong>80%</strong>.
              You can scope targets by TNA role to set different expectations for different job levels.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Input
        placeholder="Search by question text..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{groupEntries.length}</div>
            <div className="text-sm text-muted-foreground">Questions with targets</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{(proficiencies ?? []).filter(r => r.tp.isActive).length}</div>
            <div className="text-sm text-muted-foreground">Active targets</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {(proficiencies ?? []).length > 0
                ? Math.round((proficiencies ?? []).reduce((s, r) => s + r.tp.targetScore, 0) / (proficiencies ?? []).length)
                : 80}%
            </div>
            <div className="text-sm text-muted-foreground">Average target score</div>
          </CardContent>
        </Card>
      </div>

      {/* Questions list */}
      {groupEntries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Target className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No target proficiencies defined yet</p>
            <p className="text-sm mt-1">Click "Add Target" to set benchmarks for survey questions.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {groupEntries.map(([qidStr, { question, targets }]) => {
            const qid = Number(qidStr);
            const isExpanded = expandedQuestion === qid;
            return (
              <Card key={qid}>
                <CardHeader
                  className="cursor-pointer py-3 px-4"
                  onClick={() => setExpandedQuestion(isExpanded ? null : qid)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {question?.questionText ?? `Question #${qid}`}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{question?.category ?? "—"}</Badge>
                        <span className="text-xs text-muted-foreground">{targets.length} target{targets.length !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openCreate(); setForm(f => ({ ...f, questionId: qid })); }}>
                        <Plus className="h-3 w-3 mr-1" /> Add
                      </Button>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0 pb-3 px-4">
                    <div className="space-y-2">
                      {targets.map((tp) => (
                        <div key={tp.id} className="flex items-center justify-between bg-muted/40 rounded-md px-3 py-2">
                          <div className="flex items-center gap-3">
                            <div className="text-lg font-bold text-primary">{tp.targetScore}%</div>
                            <div>
                              <div className="text-sm font-medium">{tp.proficiencyLabel ?? "—"}</div>
                              <div className="text-xs text-muted-foreground">
                                Role: {tp.tnaRole ?? "All"} · {tp.isActive ? "Active" : "Inactive"}
                              </div>
                              {tp.rationale && <div className="text-xs text-muted-foreground mt-0.5 italic">{tp.rationale}</div>}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(tp)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive"
                              onClick={() => { if (confirm("Delete this target?")) deleteMutation.mutate({ id: tp.id }); }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Target Proficiency" : "Add Target Proficiency"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Question</Label>
              <Select
                value={String(form.questionId)}
                onValueChange={(v) => setForm(f => ({ ...f, questionId: Number(v) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select question" />
                </SelectTrigger>
                <SelectContent>
                  {questions.map((q: any) => (
                    <SelectItem key={q.id} value={String(q.id)}>
                      <span className="truncate max-w-xs">{q.questionText}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Target Score (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.targetScore}
                  onChange={(e) => setForm(f => ({ ...f, targetScore: Number(e.target.value) }))}
                />
                <p className="text-xs text-muted-foreground">0–100. Default is 80%.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Proficiency Label</Label>
                <Select value={form.proficiencyLabel} onValueChange={(v) => setForm(f => ({ ...f, proficiencyLabel: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROFICIENCY_LABELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>TNA Role Scope</Label>
              <Select value={form.tnaRole} onValueChange={(v) => setForm(f => ({ ...f, tnaRole: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TNA_ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Leave as "All Roles" to apply to everyone.</p>
            </div>

            <div className="space-y-1.5">
              <Label>Rationale / Source</Label>
              <Textarea
                placeholder="e.g. TESDA NC II standard, Company policy 2024..."
                value={form.rationale}
                onChange={(e) => setForm(f => ({ ...f, rationale: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm(f => ({ ...f, isActive: v }))}
              />
              <Label>Active</Label>
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
