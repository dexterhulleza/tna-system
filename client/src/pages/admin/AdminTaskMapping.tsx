import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Link2,
  Search,
  Plus,
  Trash2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

type Mapping = {
  id: number;
  questionId: number;
  questionText: string;
  tesdaReferenceId: number;
  relevanceScore: number | null;
  notes: string | null;
  mappingSource: "manual" | "ai";
  trCode: string | null;
  qualificationTitle: string;
  csUnitCode: string | null;
  csUnitTitle: string | null;
  competencyLevel: string | null;
  referenceType: "TR" | "CS" | "Supermarket";
};

type AiSuggestion = {
  id: number;
  relevanceScore: number;
  rationale: string;
  reference?: {
    id: number;
    trCode: string | null;
    qualificationTitle: string;
    csUnitCode: string | null;
    csUnitTitle: string | null;
    competencyLevel: string | null;
  };
};

const EMPTY_FORM = {
  id: undefined as number | undefined,
  questionId: 0,
  tesdaReferenceId: 0,
  relevanceScore: 1.0,
  notes: "",
  mappingSource: "manual" as "manual" | "ai",
};

const REF_TYPE_COLORS: Record<string, string> = {
  TR: "bg-blue-100 text-blue-700",
  CS: "bg-emerald-100 text-emerald-700",
  Supermarket: "bg-purple-100 text-purple-700",
};

export default function AdminTaskMapping() {
  const [search, setSearch] = useState("");
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [aiSuggestingFor, setAiSuggestingFor] = useState<{ id: number; questionText: string } | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const { data: mappings = [], refetch } = trpc.taskMapping.listAll.useQuery({});
  const { data: questions = [] } = trpc.questions.list.useQuery({});
  const { data: tesdaRefs = [] } = trpc.tesda.list.useQuery({ activeOnly: true });

  const upsertMutation = trpc.taskMapping.upsert.useMutation({
    onSuccess: () => {
      toast.success(form.id ? "Mapping updated" : "Mapping added");
      setDialogOpen(false);
      refetch();
    },
    onError: (e) => toast.error("Error", { description: e.message }),
  });

  const deleteMutation = trpc.taskMapping.delete.useMutation({
    onSuccess: () => { toast.success("Mapping deleted"); setDeleteId(null); refetch(); },
    onError: (e) => toast.error("Error", { description: e.message }),
  });

  const aiSuggestMutation = trpc.taskMapping.aiSuggest.useMutation({
    onSuccess: (data) => {
      setAiSuggestions(data as AiSuggestion[]);
      setAiLoading(false);
    },
    onError: (e) => {
      toast.error("AI suggestion failed", { description: e.message });
      setAiLoading(false);
    },
  });

  // Group mappings by questionId
  const groupedByQuestion = useMemo(() => {
    const map = new Map<number, { questionText: string; mappings: Mapping[] }>();
    for (const m of mappings) {
      if (!map.has(m.questionId)) {
        map.set(m.questionId, { questionText: m.questionText, mappings: [] });
      }
      map.get(m.questionId)!.mappings.push(m as Mapping);
    }
    return map;
  }, [mappings]);

  // Also include questions that have no mappings yet
  const allQuestions = useMemo(() => {
    const result: { id: number; questionText: string; mappingCount: number }[] = [];
    for (const q of questions) {
      const group = groupedByQuestion.get(q.id);
      result.push({
        id: q.id,
        questionText: q.questionText,
        mappingCount: group?.mappings.length ?? 0,
      });
    }
    return result;
  }, [questions, groupedByQuestion]);

  const filteredQuestions = useMemo(() => {
    if (!search.trim()) return allQuestions;
    const s = search.toLowerCase();
    return allQuestions.filter(q => q.questionText.toLowerCase().includes(s));
  }, [allQuestions, search]);

  function openCreate(questionId: number) {
    setForm({ ...EMPTY_FORM, questionId });
    setDialogOpen(true);
  }

  function openEdit(m: Mapping) {
    setForm({
      id: m.id,
      questionId: m.questionId,
      tesdaReferenceId: m.tesdaReferenceId,
      relevanceScore: m.relevanceScore ?? 1.0,
      notes: m.notes ?? "",
      mappingSource: m.mappingSource,
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.questionId || !form.tesdaReferenceId) {
      toast.error("Please select both a question and a TESDA reference.");
      return;
    }
    upsertMutation.mutate({
      id: form.id,
      questionId: form.questionId,
      tesdaReferenceId: form.tesdaReferenceId,
      relevanceScore: form.relevanceScore,
      notes: form.notes || null,
      mappingSource: form.mappingSource,
    });
  }

  function handleAiSuggest(q: { id: number; questionText: string }) {
    setAiSuggestingFor({ id: q.id, questionText: q.questionText });
    setAiSuggestions([]);
    setAiLoading(true);
    aiSuggestMutation.mutate({ questionId: q.id, questionText: q.questionText });
  }

  function applyAiSuggestion(suggestion: AiSuggestion, questionId: number) {
    upsertMutation.mutate({
      questionId,
      tesdaReferenceId: suggestion.id,
      relevanceScore: suggestion.relevanceScore,
      notes: suggestion.rationale,
      mappingSource: "ai",
    });
  }

  const selectedRef = tesdaRefs.find(r => r.id === form.tesdaReferenceId);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Link2 className="w-6 h-6 text-primary" />
            Task-to-Competency Mapping
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Link survey questions to TESDA Training Regulations and Competency Standards for AI-powered gap analysis.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BookOpen className="w-4 h-4" />
          <span>{mappings.length} mapping{mappings.length !== 1 ? "s" : ""} across {groupedByQuestion.size} question{groupedByQuestion.size !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <strong>How it works:</strong> Each survey question represents a workplace task. Mapping it to a TESDA competency unit allows the AI to generate training recommendations that cite specific TR codes, qualification titles, and competency levels — making training plans TESDA-aligned and audit-ready.
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search questions..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Question list */}
      <div className="space-y-3">
        {filteredQuestions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Link2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No questions found</p>
            <p className="text-sm">Add questions in the Survey Configuration page first.</p>
          </div>
        )}
        {filteredQuestions.map(q => {
          const group = groupedByQuestion.get(q.id);
          const isExpanded = expandedQuestion === q.id;
          return (
            <div key={q.id} className="border rounded-lg overflow-hidden">
              {/* Question header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedQuestion(isExpanded ? null : q.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {isExpanded ? <ChevronUp className="w-4 h-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />}
                  <span className="text-sm font-medium truncate">{q.questionText}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {q.mappingCount > 0 ? (
                    <Badge variant="secondary">{q.mappingCount} mapped</Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-600 border-amber-300">Unmapped</Badge>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={e => { e.stopPropagation(); openCreate(q.id); }}
                    className="h-7 px-2"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={e => { e.stopPropagation(); handleAiSuggest(q); }}
                    className="h-7 px-2 text-purple-600 border-purple-300 hover:bg-purple-50"
                  >
                    <Sparkles className="w-3 h-3 mr-1" /> AI Suggest
                  </Button>
                </div>
              </div>

              {/* Expanded mappings */}
              {isExpanded && (
                <div className="border-t bg-muted/10 p-4 space-y-2">
                  {(!group || group.mappings.length === 0) && (
                    <p className="text-sm text-muted-foreground italic">No competency mappings yet. Click "Add" or "AI Suggest" to create one.</p>
                  )}
                  {group?.mappings.map(m => (
                    <div key={m.id} className="flex items-start justify-between gap-3 p-3 rounded-md bg-background border">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={REF_TYPE_COLORS[m.referenceType] ?? "bg-slate-100 text-slate-700"}>
                            {m.referenceType}
                          </Badge>
                          {m.trCode && <span className="text-xs font-mono text-muted-foreground">{m.trCode}</span>}
                          {m.csUnitCode && <span className="text-xs font-mono text-muted-foreground">{m.csUnitCode}</span>}
                          <span className="text-sm font-medium">{m.qualificationTitle}</span>
                          {m.csUnitTitle && <span className="text-sm text-muted-foreground">— {m.csUnitTitle}</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {m.competencyLevel && <span>Level {m.competencyLevel}</span>}
                          <span>Relevance: {((m.relevanceScore ?? 1) * 100).toFixed(0)}%</span>
                          {m.mappingSource === "ai" && (
                            <span className="flex items-center gap-1 text-purple-600">
                              <Sparkles className="w-3 h-3" /> AI-generated
                            </span>
                          )}
                        </div>
                        {m.notes && <p className="text-xs text-muted-foreground mt-1 italic">{m.notes}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => openEdit(m)}>Edit</Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => setDeleteId(m.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Mapping" : "Add Competency Mapping"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Question display */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Question / Task</Label>
              <p className="text-sm border rounded-md p-2 bg-muted/30">
                {questions.find(q => q.id === form.questionId)?.questionText ?? "—"}
              </p>
            </div>

            {/* TESDA Reference */}
            <div>
              <Label className="text-xs mb-1 block">TESDA Reference *</Label>
              <Select
                value={form.tesdaReferenceId ? String(form.tesdaReferenceId) : ""}
                onValueChange={v => setForm(f => ({ ...f, tesdaReferenceId: Number(v) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a TR / CS unit..." />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {tesdaRefs.map(r => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      <span className="font-mono text-xs mr-2">{r.trCode ?? r.csUnitCode ?? "—"}</span>
                      {r.qualificationTitle}
                      {r.csUnitTitle ? ` — ${r.csUnitTitle}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedRef && (
                <div className="mt-2 p-2 rounded bg-muted/30 text-xs text-muted-foreground">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-xs mr-2 ${REF_TYPE_COLORS[selectedRef.referenceType] ?? ""}`}>{selectedRef.referenceType}</span>
                  {selectedRef.competencyLevel && <>Level {selectedRef.competencyLevel} · </>}
                  {selectedRef.sector}
                </div>
              )}
            </div>

            {/* Relevance Score */}
            <div>
              <Label className="text-xs mb-1 block">Relevance Score: {(form.relevanceScore * 100).toFixed(0)}%</Label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={form.relevanceScore}
                onChange={e => setForm(f => ({ ...f, relevanceScore: Number(e.target.value) }))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
                <span>Low (0%)</span>
                <span>High (100%)</span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label className="text-xs mb-1 block">Mapping Notes (optional)</Label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Explain why this task maps to this competency unit..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {form.id ? "Update" : "Add Mapping"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Suggest Dialog */}
      <Dialog open={!!aiSuggestingFor} onOpenChange={open => { if (!open) { setAiSuggestingFor(null); setAiSuggestions([]); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI Competency Suggestions
            </DialogTitle>
          </DialogHeader>
          {aiSuggestingFor && (
            <div className="space-y-4 py-2">
              <div className="text-sm border rounded-md p-2 bg-muted/30">
                {aiSuggestingFor.questionText}
              </div>
              {aiLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing question and matching TESDA competency units...
                </div>
              )}
              {!aiLoading && aiSuggestions.length === 0 && !aiLoading && (
                <p className="text-sm text-muted-foreground text-center py-4">No suggestions generated. Make sure TESDA references are added to the library first.</p>
              )}
              {aiSuggestions.map((s, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {s.reference?.trCode && <span className="text-xs font-mono text-muted-foreground">{s.reference.trCode}</span>}
                        {s.reference?.csUnitCode && <span className="text-xs font-mono text-muted-foreground">{s.reference.csUnitCode}</span>}
                        <span className="text-sm font-medium">{s.reference?.qualificationTitle ?? `Reference #${s.id}`}</span>
                      </div>
                      {s.reference?.csUnitTitle && <p className="text-xs text-muted-foreground">{s.reference.csUnitTitle}</p>}
                    </div>
                    <Badge variant="secondary">{(s.relevanceScore * 100).toFixed(0)}% match</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground italic">{s.rationale}</p>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      applyAiSuggestion(s, aiSuggestingFor!.id);
                      setAiSuggestingFor(null);
                      setAiSuggestions([]);
                    }}
                    disabled={upsertMutation.isPending}
                  >
                    Apply This Mapping
                  </Button>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAiSuggestingFor(null); setAiSuggestions([]); }}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Mapping</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the competency mapping. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
