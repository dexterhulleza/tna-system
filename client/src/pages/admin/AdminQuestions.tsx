import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, BookOpen, Filter } from "lucide-react";

const CATEGORIES = [
  { value: "organizational", label: "Organizational-Level" },
  { value: "job_task", label: "Job / Task-Level" },
  { value: "individual", label: "Individual-Level" },
  { value: "training_feasibility", label: "Training Feasibility" },
  { value: "evaluation_success", label: "Evaluation & Success Criteria" },
];

const QUESTION_TYPES = [
  { value: "text", label: "Text (Open-ended)" },
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "checkbox", label: "Checkbox (Multi-select)" },
  { value: "rating", label: "Rating Scale" },
  { value: "yes_no", label: "Yes / No" },
  { value: "scale", label: "Likert Scale" },
];

const ROLES = ["industry_worker", "trainer", "assessor", "hr_officer", "admin"];
const ROLE_LABELS: Record<string, string> = {
  industry_worker: "Industry Worker", trainer: "Trainer",
  assessor: "Assessor", hr_officer: "HR Officer", admin: "Administrator",
};

const CATEGORY_COLORS: Record<string, string> = {
  organizational: "bg-blue-100 text-blue-700",
  job_task: "bg-purple-100 text-purple-700",
  individual: "bg-green-100 text-green-700",
  training_feasibility: "bg-orange-100 text-orange-700",
  evaluation_success: "bg-red-100 text-red-700",
};

const emptyForm = {
  id: undefined as number | undefined,
  sectorId: null as number | null,
  skillAreaId: null as number | null,
  category: "organizational" as string,
  questionText: "",
  questionType: "text" as string,
  options: [] as string[],
  targetRoles: [] as string[],
  isRequired: true,
  isActive: true,
  helpText: "",
  weight: 1,
  sortOrder: 0,
};

export default function AdminQuestions() {
  const [filterSector, setFilterSector] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [optionInput, setOptionInput] = useState("");

  const { data: sectors } = trpc.sectors.list.useQuery({ activeOnly: false });
  const { data: skillAreas } = trpc.skillAreas.listBySector.useQuery(
    { sectorId: form.sectorId!, activeOnly: false },
    { enabled: !!form.sectorId }
  );
  const { data: questions, isLoading, refetch } = trpc.questions.list.useQuery({
    sectorId: filterSector !== "all" ? parseInt(filterSector) : undefined,
    category: filterCategory !== "all" ? filterCategory : undefined,
    activeOnly: false,
  });

  const upsert = trpc.questions.upsert.useMutation({
    onSuccess: () => { toast.success(form.id ? "Question updated" : "Question created"); refetch(); setShowDialog(false); },
    onError: (e) => toast.error(e.message),
  });
  const del = trpc.questions.delete.useMutation({
    onSuccess: () => { toast.success("Question deleted"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const openCreate = () => { setForm({ ...emptyForm }); setOptionInput(""); setShowDialog(true); };
  const openEdit = (q: any) => {
    setForm({
      id: q.id, sectorId: q.sectorId, skillAreaId: q.skillAreaId,
      category: q.category, questionText: q.questionText,
      questionType: q.questionType, options: q.options || [],
      targetRoles: q.targetRoles || [], isRequired: q.isRequired ?? true,
      isActive: q.isActive ?? true, helpText: q.helpText || "",
      weight: q.weight || 1, sortOrder: q.sortOrder || 0,
    });
    setOptionInput(""); setShowDialog(true);
  };

  const handleSave = () => {
    if (!form.questionText.trim()) { toast.error("Question text is required"); return; }
    upsert.mutate({
      ...form,
      category: form.category as any,
      questionType: form.questionType as any,
      options: form.options.length > 0 ? form.options : null,
    });
  };

  const addOption = () => {
    if (optionInput.trim()) {
      setForm({ ...form, options: [...form.options, optionInput.trim()] });
      setOptionInput("");
    }
  };

  const toggleRole = (role: string) => {
    const roles = form.targetRoles.includes(role)
      ? form.targetRoles.filter((r) => r !== role)
      : [...form.targetRoles, role];
    setForm({ ...form, targetRoles: roles });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Manage Questions</h1>
          <p className="text-muted-foreground text-sm mt-1">Customize survey questions per sector and skill area</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 w-4 h-4" />
          Add Question
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={filterSector} onValueChange={setFilterSector}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Sectors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sectors</SelectItem>
            {sectors?.map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge variant="secondary">{questions?.length ?? 0} questions</Badge>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-2">
          {questions?.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No questions found. Create your first question.</p>
              </CardContent>
            </Card>
          )}
          {questions?.map((q: any) => (
            <Card key={q.id} className={`border-l-4 ${!q.isActive ? "opacity-60" : ""}`}
              style={{ borderLeftColor: q.category === "organizational" ? "#3b82f6" : q.category === "job_task" ? "#8b5cf6" : q.category === "individual" ? "#22c55e" : q.category === "training_feasibility" ? "#f97316" : "#ef4444" }}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge className={`text-xs ${CATEGORY_COLORS[q.category]}`}>
                        {CATEGORIES.find((c) => c.value === q.category)?.label}
                      </Badge>
                      <Badge variant="outline" className="text-xs">{QUESTION_TYPES.find((t) => t.value === q.questionType)?.label}</Badge>
                      {q.sectorId && sectors && (
                        <Badge variant="secondary" className="text-xs">
                          {sectors.find((s: any) => s.id === q.sectorId)?.name || `Sector ${q.sectorId}`}
                        </Badge>
                      )}
                      {!q.sectorId && <Badge variant="secondary" className="text-xs">All Sectors</Badge>}
                      {!q.isActive && <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>}
                    </div>
                    <p className="text-sm text-foreground font-medium">{q.questionText}</p>
                    {q.helpText && <p className="text-xs text-muted-foreground mt-1">{q.helpText}</p>}
                    {q.options && q.options.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-2">
                        {q.options.map((o: string, i: number) => (
                          <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded">{o}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(q)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"
                      onClick={() => { if (confirm("Delete this question?")) del.mutate({ id: q.id }); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{form.id ? "Edit Question" : "Create New Question"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Sector (optional)</Label>
                <Select value={form.sectorId ? String(form.sectorId) : "global"}
                  onValueChange={(v) => setForm({ ...form, sectorId: v === "global" ? null : parseInt(v), skillAreaId: null })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">All Sectors (Global)</SelectItem>
                    {sectors?.map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Skill Area (optional)</Label>
                <Select value={form.skillAreaId ? String(form.skillAreaId) : "none"}
                  onValueChange={(v) => setForm({ ...form, skillAreaId: v === "none" ? null : parseInt(v) })}
                  disabled={!form.sectorId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">All Skill Areas</SelectItem>
                    {skillAreas?.map((sa: any) => <SelectItem key={sa.id} value={String(sa.id)}>{sa.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Question Type *</Label>
                <Select value={form.questionType} onValueChange={(v) => setForm({ ...form, questionType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {QUESTION_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Question Text *</Label>
              <Textarea value={form.questionText} onChange={(e) => setForm({ ...form, questionText: e.target.value })}
                placeholder="Enter the survey question..." rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>Help Text (optional)</Label>
              <Input value={form.helpText} onChange={(e) => setForm({ ...form, helpText: e.target.value })}
                placeholder="Additional guidance for respondents..." />
            </div>
            {["multiple_choice", "checkbox"].includes(form.questionType) && (
              <div className="space-y-2">
                <Label>Answer Options</Label>
                <div className="flex gap-2">
                  <Input value={optionInput} onChange={(e) => setOptionInput(e.target.value)}
                    placeholder="Add an option..." onKeyDown={(e) => e.key === "Enter" && addOption()} />
                  <Button type="button" variant="outline" onClick={addOption}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.options.map((o, i) => (
                    <Badge key={i} variant="secondary" className="cursor-pointer"
                      onClick={() => setForm({ ...form, options: form.options.filter((_, idx) => idx !== i) })}>
                      {o} ×
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Target Roles (leave empty for all roles)</Label>
              <div className="flex flex-wrap gap-2">
                {ROLES.map((r) => (
                  <Badge key={r} variant={form.targetRoles.includes(r) ? "default" : "outline"}
                    className="cursor-pointer" onClick={() => toggleRole(r)}>
                    {ROLE_LABELS[r]}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.isRequired} onCheckedChange={(c) => setForm({ ...form, isRequired: c })} />
                <Label>Required</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.isActive} onCheckedChange={(c) => setForm({ ...form, isActive: c })} />
                <Label>Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={upsert.isPending}>
              {upsert.isPending ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : null}
              {form.id ? "Update Question" : "Create Question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
