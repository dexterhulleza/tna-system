import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, BookOpen, Filter, Tag, Upload, Download, CheckCircle, XCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, X } from "lucide-react";
import { useRef, useMemo } from "react";

const CATEGORIES = [
  { value: "organizational", label: "Organizational-Level" },
  { value: "job_task", label: "Job / Task-Level" },
  { value: "individual", label: "Individual-Level" },
  { value: "training_feasibility", label: "Training Feasibility" },
  { value: "evaluation_success", label: "Evaluation & Success Criteria" },
  { value: "custom", label: "Custom (Group-Specific)" },
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
  custom: "bg-teal-100 text-teal-700",
};

const CATEGORY_BORDER: Record<string, string> = {
  organizational: "#3b82f6",
  job_task: "#8b5cf6",
  individual: "#22c55e",
  training_feasibility: "#f97316",
  evaluation_success: "#ef4444",
  custom: "#14b8a6",
};

const emptyForm = {
  id: undefined as number | undefined,
  sectorId: null as number | null,
  skillAreaId: null as number | null,
  groupId: null as number | null,
  category: "organizational" as string,
  customCategory: "",
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
  const [filterGroup, setFilterGroup] = useState<string>("all");

  const [searchQuery, setSearchQuery] = useState("");

  // Reset to page 1 whenever any filter changes
  const handleFilterSector = (v: string) => { setFilterSector(v); setCurrentPage(1); };
  const handleFilterCategory = (v: string) => { setFilterCategory(v); setCurrentPage(1); };
  const handleFilterGroup = (v: string) => { setFilterGroup(v); setCurrentPage(1); };
  const handleSearch = (v: string) => { setSearchQuery(v); setCurrentPage(1); };
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [optionInput, setOptionInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [batchFile, setBatchFile] = useState<File | null>(null);
  const [batchUploading, setBatchUploading] = useState(false);
  const [batchResult, setBatchResult] = useState<{ total: number; inserted: number; errors: number; results: Array<{ rowNumber: number; status: string; questionText?: string; reason?: string }> } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: sectors } = trpc.sectors.list.useQuery({ activeOnly: false });
  const { data: groups } = trpc.groups.list.useQuery({ activeOnly: false });
  const { data: skillAreas } = trpc.skillAreas.listBySector.useQuery(
    { sectorId: form.sectorId!, activeOnly: false },
    { enabled: !!form.sectorId }
  );
  const { data: questions, isLoading, refetch } = trpc.questions.list.useQuery({
    sectorId: filterSector !== "all" ? parseInt(filterSector) : undefined,
    category: filterCategory !== "all" ? filterCategory : undefined,
    activeOnly: false,
    adminAll: true, // Show ALL questions including group-tagged ones in admin view
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
      groupId: q.groupId ?? null,
      category: q.category, customCategory: q.customCategory || "",
      questionText: q.questionText,
      questionType: q.questionType, options: q.options || [],
      targetRoles: q.targetRoles || [], isRequired: q.isRequired ?? true,
      isActive: q.isActive ?? true, helpText: q.helpText || "",
      weight: q.weight || 1, sortOrder: q.sortOrder || 0,
    });
    setOptionInput(""); setShowDialog(true);
  };

  const handleSave = () => {
    if (!form.questionText.trim()) { toast.error("Question text is required"); return; }
    if (form.category === "custom" && !form.customCategory.trim()) {
      toast.error("Please enter a custom category name"); return;
    }
    upsert.mutate({
      ...form,
      category: form.category as any,
      customCategory: form.category === "custom" ? form.customCategory.trim() : undefined,
      questionType: form.questionType as any,
      options: form.options.length > 0 ? form.options : null,
      groupId: form.groupId ?? null,
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

  // Client-side filters: group + keyword search
  const filteredQuestions = useMemo(() => {
    let base = filterGroup === "all"
      ? questions
      : filterGroup === "none"
      ? questions?.filter((q: any) => !q.groupId)
      : questions?.filter((q: any) => String(q.groupId) === filterGroup);
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      base = base?.filter((item: any) =>
        item.questionText?.toLowerCase().includes(q) ||
        item.helpText?.toLowerCase().includes(q) ||
        item.customCategory?.toLowerCase().includes(q)
      );
    }
    return base ?? [];
  }, [questions, filterGroup, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedQuestions = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredQuestions.slice(start, start + pageSize);
  }, [filteredQuestions, safePage, pageSize]);

  const handleBatchUpload = async () => {
    if (!batchFile) { toast.error("Please select a file"); return; }
    setBatchUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", batchFile);
      const res = await fetch("/api/questions/batch", { method: "POST", body: formData, credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setBatchResult(data);
      if (data.inserted > 0) { refetch(); toast.success(`${data.inserted} question(s) imported successfully`); }
      if (data.errors > 0) toast.warning(`${data.errors} row(s) had errors — check the results below`);
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setBatchUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Manage Questions</h1>
          <p className="text-muted-foreground text-sm mt-1">Customize survey questions per sector, skill area, and group</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setBatchFile(null); setBatchResult(null); setShowBatchDialog(true); }}>
            <Upload className="mr-2 w-4 h-4" />
            Batch Upload
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 w-4 h-4" />
            Add Question
          </Button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search questions by text, help text, or custom category…"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <button
            onClick={() => handleSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={filterSector} onValueChange={handleFilterSector}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Sectors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sectors</SelectItem>
            {sectors?.map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={handleFilterCategory}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterGroup} onValueChange={handleFilterGroup}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Groups" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Groups</SelectItem>
            <SelectItem value="none">No Group (Global)</SelectItem>
            {groups?.map((g: any) => <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge variant="secondary">{filteredQuestions.length} question{filteredQuestions.length !== 1 ? "s" : ""}</Badge>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-2">
          {filteredQuestions.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No questions found. Create your first question.</p>
              </CardContent>
            </Card>
          )}
          {paginatedQuestions.map((q: any) => {
            const groupName = groups?.find((g: any) => g.id === q.groupId)?.name;
            const catLabel = q.category === "custom" && q.customCategory
              ? q.customCategory
              : CATEGORIES.find((c) => c.value === q.category)?.label;
            return (
              <Card key={q.id} className={`border-l-4 ${!q.isActive ? "opacity-60" : ""}`}
                style={{ borderLeftColor: CATEGORY_BORDER[q.category] || "#94a3b8" }}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge className={`text-xs ${CATEGORY_COLORS[q.category] || "bg-teal-100 text-teal-700"}`}>
                          {catLabel}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{QUESTION_TYPES.find((t) => t.value === q.questionType)?.label}</Badge>
                        {q.sectorId && sectors && (
                          <Badge variant="secondary" className="text-xs">
                            {sectors.find((s: any) => s.id === q.sectorId)?.name || `Sector ${q.sectorId}`}
                          </Badge>
                        )}
                        {!q.sectorId && <Badge variant="secondary" className="text-xs">All Sectors</Badge>}
                        {groupName && (
                          <Badge className="text-xs bg-teal-50 text-teal-700 border border-teal-200 gap-1">
                            <Tag className="w-3 h-3" />
                            {groupName}
                          </Badge>
                        )}
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
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {!isLoading && filteredQuestions.length > 0 && (
        <div className="flex items-center justify-between gap-4 pt-2 border-t">
          {/* Page size selector + summary */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Showing {Math.min((safePage - 1) * pageSize + 1, filteredQuestions.length)}–{Math.min(safePage * pageSize, filteredQuestions.length)} of {filteredQuestions.length}
            </span>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 / page</SelectItem>
                <SelectItem value="25">25 / page</SelectItem>
                <SelectItem value="50">50 / page</SelectItem>
                <SelectItem value="100">100 / page</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Page navigation */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline" size="sm" className="h-8 w-8 p-0"
              onClick={() => setCurrentPage(1)}
              disabled={safePage === 1}
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline" size="sm" className="h-8 w-8 p-0"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>

            {/* Page number pills */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && typeof arr[idx - 1] === "number" && (p as number) - (arr[idx - 1] as number) > 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  p === "..." ? (
                    <span key={`ellipsis-${idx}`} className="px-1 text-xs text-muted-foreground">…</span>
                  ) : (
                    <Button
                      key={p}
                      variant={safePage === p ? "default" : "outline"}
                      size="sm"
                      className="h-8 w-8 p-0 text-xs"
                      onClick={() => setCurrentPage(p as number)}
                    >
                      {p}
                    </Button>
                  )
                )}
            </div>

            <Button
              variant="outline" size="sm" className="h-8 w-8 p-0"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline" size="sm" className="h-8 w-8 p-0"
              onClick={() => setCurrentPage(totalPages)}
              disabled={safePage === totalPages}
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{form.id ? "Edit Question" : "Create New Question"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Scope: Sector + Skill Area */}
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

            {/* Group Tag */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-primary" />
                Group Tag (optional)
              </Label>
              <Select
                value={form.groupId ? String(form.groupId) : "none"}
                onValueChange={(v) => setForm({ ...form, groupId: v === "none" ? null : parseInt(v) })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Group (shown to all respondents)</SelectItem>
                  {groups?.map((g: any) => (
                    <SelectItem key={g.id} value={String(g.id)}>
                      {g.name} ({g.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Assign to a group to show this question only to respondents in that group.
              </p>
            </div>

            {/* Category + Custom Category */}
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

            {/* Custom Category Name */}
            {form.category === "custom" && (
              <div className="space-y-1.5">
                <Label>Custom Category Name *</Label>
                <Input
                  value={form.customCategory}
                  onChange={(e) => setForm({ ...form, customCategory: e.target.value })}
                  placeholder="e.g., Safety Compliance, Digital Literacy, Soft Skills..."
                />
                <p className="text-xs text-muted-foreground">
                  This label will appear as a distinct category section in the survey and report.
                </p>
              </div>
            )}

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

      {/* Batch Upload Dialog */}
      <Dialog open={showBatchDialog} onOpenChange={(open) => { setShowBatchDialog(open); if (!open) { setBatchFile(null); setBatchResult(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Batch Upload Questions
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Download template */}
            <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <Download className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Step 1 — Download the Excel template</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The template contains all required columns with instructions and an example row.
                    Fill in your questions, then upload the file below.
                  </p>
                  <Button variant="outline" size="sm" className="mt-2" asChild>
                    <a href="/api/questions/batch/template" download="tna_questions_template.xlsx">
                      <Download className="mr-2 w-3.5 h-3.5" />
                      Download Template (.xlsx)
                    </a>
                  </Button>
                </div>
              </div>
            </div>

            {/* File picker */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Step 2 — Upload your completed file</p>
              <div
                className="rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors p-6 text-center cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                {batchFile ? (
                  <p className="text-sm font-medium text-foreground">{batchFile.name}</p>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">Click to select an Excel or CSV file</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">.xlsx, .xls, .csv — max 10 MB</p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => { setBatchFile(e.target.files?.[0] ?? null); setBatchResult(null); }}
              />
            </div>

            {/* Results */}
            {batchResult && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-muted p-3 text-center">
                    <p className="text-2xl font-bold text-foreground">{batchResult.total}</p>
                    <p className="text-xs text-muted-foreground">Total Rows</p>
                  </div>
                  <div className="rounded-lg bg-green-50 p-3 text-center">
                    <p className="text-2xl font-bold text-green-700">{batchResult.inserted}</p>
                    <p className="text-xs text-green-600">Imported</p>
                  </div>
                  <div className="rounded-lg bg-red-50 p-3 text-center">
                    <p className="text-2xl font-bold text-red-700">{batchResult.errors}</p>
                    <p className="text-xs text-red-600">Errors</p>
                  </div>
                </div>
                {batchResult.results.length > 0 && (
                  <div className="max-h-48 overflow-y-auto rounded-lg border divide-y text-xs">
                    {batchResult.results.map((r) => (
                      <div key={r.rowNumber} className={`flex items-start gap-2 px-3 py-2 ${
                        r.status === "success" ? "bg-green-50/50" : "bg-red-50/50"
                      }`}>
                        {r.status === "success"
                          ? <CheckCircle className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                          : <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <span className="text-muted-foreground">Row {r.rowNumber}: </span>
                          <span className="font-medium">{r.questionText ?? "—"}</span>
                          {r.reason && <p className="text-red-600 mt-0.5">{r.reason}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowBatchDialog(false); setBatchFile(null); setBatchResult(null); }}>Close</Button>
            <Button onClick={handleBatchUpload} disabled={!batchFile || batchUploading}>
              {batchUploading ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <Upload className="mr-2 w-4 h-4" />}
              {batchUploading ? "Uploading..." : "Import Questions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
