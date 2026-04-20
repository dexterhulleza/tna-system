/**
 * Create Survey Group — 5-step wizard
 * Steps: 1. Group Info → 2. Participants → 3. Questionnaire → 4. Schedule → 5. Review & Create
 * ONE OBJECTIVE: Create a new survey group with all required settings.
 */
import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CheckCircle2, Circle, ChevronRight, ChevronLeft, Tag, Users, ClipboardList,
  Calendar, Eye, Loader2, Check, AlertCircle, ArrowLeft,
  QrCode, Upload, Search, Plus, Trash2, Download, Link2, UserPlus, FileSpreadsheet,
  BookOpen, PenLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Step definitions ─────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Group Info",     shortLabel: "Info",          icon: Tag },
  { id: 2, label: "Participants",   shortLabel: "Participants",  icon: Users },
  { id: 3, label: "Questionnaire",  shortLabel: "Questionnaire", icon: ClipboardList },
  { id: 4, label: "Schedule",       shortLabel: "Schedule",      icon: Calendar },
  { id: 5, label: "Review",         shortLabel: "Review",        icon: Eye },
];

// ─── Form state ───────────────────────────────────────────────────────────────
interface WizardForm {
  // Step 1
  name: string;
  code: string;
  description: string;
  sectorId: string;
  isActive: boolean;
  // Step 2
  participantNote: string;
  expectedCount: string;
  // Step 3
  questionnaireNote: string;
  // Step 4
  startDate: string;
  endDate: string;
  reminderEnabled: boolean;
}

const EMPTY_FORM: WizardForm = {
  name: "", code: "", description: "", sectorId: "", isActive: true,
  participantNote: "", expectedCount: "",
  questionnaireNote: "",
  startDate: "", endDate: "", reminderEnabled: false,
};

// ─── Step validation ──────────────────────────────────────────────────────────
function validateStep(step: number, form: WizardForm): string | null {
  if (step === 1) {
    if (!form.name.trim()) return "Group name is required.";
    if (!form.code.trim()) return "Group code is required.";
    if (form.code.length > 12) return "Group code must be 12 characters or fewer.";
  }
  return null;
}

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepIndicator({ current, completed }: { current: number; completed: Set<number> }) {
  return (
    <>
      {/* Desktop: horizontal step tabs */}
      <div className="hidden md:flex items-center mb-6">
        {STEPS.map((step, idx) => {
          const isDone = completed.has(step.id);
          const isActive = step.id === current;
          const Icon = step.icon;
          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <div className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                isDone ? "text-emerald-700" : isActive ? "text-primary" : "text-slate-400"
              )}>
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                  isDone ? "bg-emerald-100 text-emerald-700" :
                  isActive ? "bg-primary text-white" : "bg-slate-100 text-slate-400"
                )}>
                  {isDone ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                </div>
                <span className="hidden lg:block">{step.label}</span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={cn(
                  "flex-1 h-px mx-4",
                  completed.has(step.id) ? "bg-emerald-300" : "bg-slate-200"
                )} />
              )}
            </div>
          );
        })}
      </div>
      {/* Mobile: progress bar + step name */}
      <div className="md:hidden bg-white rounded-xl border border-slate-200 px-4 py-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-slate-900">
            Step {current} of {STEPS.length}: {STEPS[current - 1]?.label}
          </p>
          <span className="text-xs text-slate-500">{Math.round(((current - 1) / STEPS.length) * 100)}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${((current - 1) / STEPS.length) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          {STEPS.map(s => (
            <div
              key={s.id}
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                completed.has(s.id) ? "bg-emerald-500" :
                s.id === current ? "bg-primary" : "bg-slate-200"
              )}
            />
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Step 1: Group Info ───────────────────────────────────────────────────────
function Step1({ form, onChange, sectors }: {
  form: WizardForm;
  onChange: (f: Partial<WizardForm>) => void;
  sectors: { id: number; name: string }[];
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Group Information</h2>
        <p className="text-slate-500 text-sm mt-1">Give this survey group a name and unique code to identify it.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Label htmlFor="name">Group Name <span className="text-destructive">*</span></Label>
          <Input
            id="name"
            placeholder="e.g., Batch 2025 ICT Sector"
            value={form.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="mt-1"
            autoFocus
          />
          <p className="text-xs text-slate-400 mt-1">A descriptive name for this cohort or batch.</p>
        </div>
        <div>
          <Label htmlFor="code">Group Code <span className="text-destructive">*</span></Label>
          <Input
            id="code"
            placeholder="e.g., B25ICT"
            value={form.code}
            onChange={(e) => onChange({ code: e.target.value.toUpperCase() })}
            className="mt-1 font-mono uppercase"
            maxLength={12}
          />
          <p className="text-xs text-slate-400 mt-1">Short unique identifier (max 12 chars).</p>
        </div>
        <div>
          <Label htmlFor="sector">Sector Scope</Label>
          <Select
            value={form.sectorId || "all"}
            onValueChange={(v) => onChange({ sectorId: v === "all" ? "" : v })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="All sectors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sectors</SelectItem>
              {sectors.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-400 mt-1">Optional: restrict to a specific sector.</p>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="desc">Description</Label>
          <Textarea
            id="desc"
            placeholder="Brief description of this group (optional)"
            value={form.description}
            onChange={(e) => onChange({ description: e.target.value })}
            className="mt-1 resize-none"
            rows={2}
          />
        </div>
        <div className="sm:col-span-2 flex items-center gap-3 py-2">
          <Switch
            id="active"
            checked={form.isActive}
            onCheckedChange={(v) => onChange({ isActive: v })}
          />
          <div>
            <Label htmlFor="active" className="cursor-pointer">Active</Label>
            <p className="text-xs text-slate-400">Active groups are visible to survey respondents.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Participants ─────────────────────────────────────────────────────
type ParticipantMethod = "qr" | "manual" | "csv";

function Step2({ form, onChange, groupId }: {
  form: WizardForm;
  onChange: (f: Partial<WizardForm>) => void;
  groupId?: number;
}) {
  const [method, setMethod] = useState<ParticipantMethod>("qr");
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<string[][]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const surveyUrl = groupId ? `${window.location.origin}/survey/start?group=${groupId}` : null;

  // Load registered users for manual search
  const { data: allUsers, isLoading: usersLoading } = trpc.admin.users.list.useQuery();
  const filteredUsers = (allUsers ?? []).filter((u: any) =>
    !search.trim() ||
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    (u.organization ?? "").toLowerCase().includes(search.toLowerCase())
  ).slice(0, 20);

  const toggleUser = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const downloadTemplate = () => {
    const csv = "Name,Email,Department,Position\nJuan Dela Cruz,juan@example.com,ICT,Programmer\nMaria Santos,maria@example.com,Admin,Officer\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "participants-template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = text.trim().split("\n").map(r =>
        r.split(",").map(c => c.trim().replace(/^"|"$/g, ""))
      );
      setCsvPreview(rows.slice(0, 8));
    };
    reader.readAsText(file);
  };

  const METHODS: { id: ParticipantMethod; label: string; icon: React.ElementType; desc: string }[] = [
    { id: "qr",     label: "QR / Open Link",  icon: QrCode,          desc: "Anyone with the link can join" },
    { id: "manual", label: "Search & Select", icon: Search,          desc: "Pick from registered users" },
    { id: "csv",    label: "Upload CSV",       icon: FileSpreadsheet, desc: "Bulk-add from spreadsheet" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Participants</h2>
        <p className="text-slate-500 text-sm mt-1">Choose how staff will be added to this survey group.</p>
      </div>

      {/* Method selector */}
      <div className="grid grid-cols-3 gap-2">
        {METHODS.map(m => (
          <button
            key={m.id}
            onClick={() => setMethod(m.id)}
            className={cn(
              "flex flex-col items-center gap-2 p-3 rounded-xl border text-center transition-all",
              method === m.id
                ? "border-primary bg-primary/5 text-primary"
                : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            )}
          >
            <m.icon className="w-5 h-5" />
            <span className="text-xs font-semibold leading-tight">{m.label}</span>
            <span className="text-xs text-slate-400 leading-tight hidden sm:block">{m.desc}</span>
          </button>
        ))}
      </div>

      {/* ── QR / Open Enrollment ── */}
      {method === "qr" && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <QrCode className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900">Open enrollment via QR / link</p>
                <p className="text-sm text-blue-700 mt-1">
                  Share the survey link or QR code with your staff. Anyone who opens the link and completes the survey
                  is automatically registered as a participant.
                </p>
              </div>
            </div>
            {surveyUrl ? (
              <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-blue-200">
                <Link2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="text-xs font-mono text-slate-700 truncate flex-1">{surveyUrl}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(surveyUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex-shrink-0 flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80"
                >
                  {copied ? <><Check className="w-3.5 h-3.5 text-green-600" /> Copied!</> : "Copy"}
                </button>
              </div>
            ) : (
              <p className="text-xs text-blue-600 italic">Survey link available after the group is created.</p>
            )}
          </div>
          <div>
            <Label htmlFor="expectedCount">Expected number of participants</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                id="expectedCount"
                type="number"
                min={0}
                placeholder="e.g., 30"
                className="w-36"
                value={form.expectedCount}
                onChange={(e) => onChange({ expectedCount: e.target.value })}
              />
              <span className="text-sm text-slate-500">staff members</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Used to calculate response rate progress. Leave blank for unlimited.</p>
          </div>
          <div>
            <Label htmlFor="pNote">Participant Notes (optional)</Label>
            <Textarea
              id="pNote"
              placeholder="e.g., Invite all ICT department staff from Region 10."
              value={form.participantNote}
              onChange={(e) => onChange({ participantNote: e.target.value })}
              className="mt-1 resize-none"
              rows={2}
            />
          </div>
        </div>
      )}

      {/* ── Manual Search & Select ── */}
      {method === "manual" && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by name, email, or organization…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {usersLoading ? (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading users…
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              {filteredUsers.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400">No registered users found.</div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {filteredUsers.map((u: any) => (
                    <label
                      key={u.id}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors",
                        selected.has(u.id) && "bg-primary/5"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(u.id)}
                        onChange={() => toggleUser(u.id)}
                        className="rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{u.name || "(no name)"}</p>
                        <p className="text-xs text-slate-500 truncate">{u.email} · {u.organization || "—"}</p>
                      </div>
                      {selected.has(u.id) && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
          {selected.size > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
              <UserPlus className="w-4 h-4" />
              <span><strong>{selected.size}</strong> participant{selected.size !== 1 ? "s" : ""} selected</span>
            </div>
          )}
          <p className="text-xs text-slate-400">Selected participants will receive the survey link when the group is activated.</p>
        </div>
      )}

      {/* ── CSV Upload ── */}
      {method === "csv" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">Upload a CSV file with participant details.</p>
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" />
              Download Template
            </Button>
          </div>
          <div
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors",
              csvFile ? "border-emerald-300 bg-emerald-50" : "border-slate-200 hover:border-primary/40 hover:bg-slate-50"
            )}
          >
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvFile} />
            {csvFile ? (
              <div className="space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-sm font-medium text-emerald-700">{csvFile.name}</p>
                <p className="text-xs text-emerald-600">
                  {csvPreview.length > 1 ? `${csvPreview.length - 1} participant${csvPreview.length - 1 !== 1 ? "s" : ""} detected` : ""}
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); setCsvFile(null); setCsvPreview([]); }}
                  className="text-xs text-slate-400 hover:text-red-500 mt-1"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-sm text-slate-500">Click to upload CSV file</p>
                <p className="text-xs text-slate-400">Required columns: Name, Email, Department, Position</p>
              </div>
            )}
          </div>
          {csvPreview.length > 1 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 border-b border-slate-200">
                Preview (first {csvPreview.length - 1} row{csvPreview.length - 1 !== 1 ? "s" : ""})
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {(csvPreview[0] ?? []).map((h, i) => (
                        <th key={i} className="px-3 py-2 text-left text-slate-500 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.slice(1).map((row, i) => (
                      <tr key={i} className="border-b border-slate-50 last:border-0">
                        {row.map((cell, j) => (
                          <td key={j} className="px-3 py-2 text-slate-700">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Step 3: Questionnaire ────────────────────────────────────────────────────
type QuestionnaireMethod = "reuse" | "new" | "upload";

interface NewQuestion {
  id: string;
  text: string;
  category: string;
  type: string;
}

function Step3({ form, onChange }: {
  form: WizardForm;
  onChange: (f: Partial<WizardForm>) => void;
}) {
  const [method, setMethod] = useState<QuestionnaireMethod>("reuse");
  const [newQuestions, setNewQuestions] = useState<NewQuestion[]>([]);
  const [qText, setQText] = useState("");
  const [qCategory, setQCategory] = useState("organizational");
  const [qType, setQType] = useState("rating");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<string[][]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load all groups to pick a previously configured one
  const { data: groups } = trpc.groups.list.useQuery({ activeOnly: false });
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const { data: selectedConfig } = trpc.surveyConfig.get.useQuery(
    { groupId: parseInt(selectedGroupId) },
    { enabled: !!selectedGroupId }
  );
  const { data: selectedQuestions } = trpc.questions.list.useQuery(
    { groupId: parseInt(selectedGroupId), activeOnly: true },
    { enabled: !!selectedGroupId }
  );

  const addQuestion = () => {
    if (!qText.trim()) return;
    setNewQuestions(prev => [...prev, {
      id: crypto.randomUUID(),
      text: qText.trim(),
      category: qCategory,
      type: qType,
    }]);
    setQText("");
  };

  const removeQuestion = (id: string) => {
    setNewQuestions(prev => prev.filter(q => q.id !== id));
  };

  const downloadQTemplate = () => {
    const csv = "QuestionText,Category,Type,Options\n\"How would you rate your proficiency in this skill?\",organizational,rating,\n\"Do you have access to the required tools?\",job_task,yes_no,\n\"Select all that apply:\",individual,checkbox,\"Option A|Option B|Option C\"\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "questions-template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = text.trim().split("\n").map(r =>
        r.split(",").map(c => c.trim().replace(/^"|"$/g, ""))
      );
      setCsvPreview(rows.slice(0, 8));
    };
    reader.readAsText(file);
  };

  const CATEGORIES = [
    { value: "organizational", label: "Organizational" },
    { value: "job_task",       label: "Job/Task" },
    { value: "individual",     label: "Individual" },
    { value: "training_feasibility", label: "Training Feasibility" },
    { value: "evaluation_success",   label: "Evaluation Success" },
    { value: "custom",         label: "Custom" },
  ];

  const TYPES = [
    { value: "rating",          label: "Rating (1–5)" },
    { value: "scale",           label: "Scale" },
    { value: "yes_no",          label: "Yes / No" },
    { value: "multiple_choice", label: "Multiple Choice" },
    { value: "checkbox",        label: "Checkboxes" },
    { value: "text",            label: "Open Text" },
  ];

  const METHODS: { id: QuestionnaireMethod; label: string; icon: React.ElementType; desc: string }[] = [
    { id: "reuse",  label: "Reuse Previous Set", icon: BookOpen, desc: "Copy questions from an existing group" },
    { id: "new",    label: "Type New Questions", icon: PenLine,  desc: "Add questions one by one" },
    { id: "upload", label: "Upload CSV",          icon: Upload,   desc: "Bulk-import from a spreadsheet" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Questionnaire Setup</h2>
        <p className="text-slate-500 text-sm mt-1">Choose how to set up questions for this survey group.</p>
      </div>

      {/* Method selector */}
      <div className="grid grid-cols-3 gap-2">
        {METHODS.map(m => (
          <button
            key={m.id}
            onClick={() => setMethod(m.id)}
            className={cn(
              "flex flex-col items-center gap-2 p-3 rounded-xl border text-center transition-all",
              method === m.id
                ? "border-primary bg-primary/5 text-primary"
                : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            )}
          >
            <m.icon className="w-5 h-5" />
            <span className="text-xs font-semibold leading-tight">{m.label}</span>
            <span className="text-xs text-slate-400 leading-tight hidden sm:block">{m.desc}</span>
          </button>
        ))}
      </div>

      {/* ── Reuse Previous Set ── */}
      {method === "reuse" && (
        <div className="space-y-4">
          <div>
            <Label>Select a previously configured group</Label>
            <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Choose a group to copy from…" />
              </SelectTrigger>
              <SelectContent>
                {(groups ?? []).map((g: any) => (
                  <SelectItem key={g.id} value={String(g.id)}>{g.name} ({g.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedGroupId && selectedConfig && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <p className="text-sm font-semibold text-slate-900">
                  {selectedConfig.surveyTitle || "Untitled Survey"}
                </p>
              </div>
              {selectedConfig.surveyPurpose && (
                <p className="text-xs text-slate-600">{selectedConfig.surveyPurpose}</p>
              )}
              {selectedQuestions && selectedQuestions.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-700 mb-2">{selectedQuestions.length} questions will be copied:</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {selectedQuestions.slice(0, 10).map((q: any, i: number) => (
                      <div key={q.id} className="flex items-start gap-2 text-xs text-slate-600">
                        <span className="text-slate-400 flex-shrink-0">{i + 1}.</span>
                        <span className="truncate">{q.questionText}</span>
                        <Badge variant="outline" className="text-xs flex-shrink-0">{q.category}</Badge>
                      </div>
                    ))}
                    {selectedQuestions.length > 10 && (
                      <p className="text-xs text-slate-400 pl-4">…and {selectedQuestions.length - 10} more</p>
                    )}
                  </div>
                </div>
              )}
              {(!selectedQuestions || selectedQuestions.length === 0) && (
                <p className="text-xs text-amber-600">This group has no questions configured yet.</p>
              )}
            </div>
          )}
          <p className="text-xs text-slate-400">Questions will be linked to this new group after creation. You can edit them in the Questions Manager.</p>
        </div>
      )}

      {/* ── Type New Questions ── */}
      {method === "new" && (
        <div className="space-y-4">
          {/* Add question form */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
            <p className="text-sm font-semibold text-slate-700">Add a question</p>
            <div>
              <Label htmlFor="qText">Question Text</Label>
              <Textarea
                id="qText"
                placeholder="e.g., How would you rate your current proficiency in this skill area?"
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                className="mt-1 resize-none bg-white"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={qCategory} onValueChange={setQCategory}>
                  <SelectTrigger className="mt-1 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Question Type</Label>
                <Select value={qType} onValueChange={setQType}>
                  <SelectTrigger className="mt-1 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={addQuestion}
              disabled={!qText.trim()}
              size="sm"
              className="gap-1.5 w-full"
            >
              <Plus className="w-4 h-4" /> Add Question
            </Button>
          </div>

          {/* Question list */}
          {newQuestions.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-600">{newQuestions.length} question{newQuestions.length !== 1 ? "s" : ""} added:</p>
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {newQuestions.map((q, i) => (
                  <div key={q.id} className="flex items-start gap-3 px-4 py-3">
                    <span className="text-xs text-slate-400 flex-shrink-0 mt-0.5">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800">{q.text}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{q.category}</Badge>
                        <Badge variant="outline" className="text-xs">{q.type}</Badge>
                      </div>
                    </div>
                    <button
                      onClick={() => removeQuestion(q.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-sm text-slate-400 border border-dashed border-slate-200 rounded-xl">
              No questions added yet. Use the form above to add your first question.
            </div>
          )}
          <p className="text-xs text-slate-400">Questions will be saved to the Questions Manager after the group is created.</p>
        </div>
      )}

      {/* ── Upload CSV ── */}
      {method === "upload" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">Upload a CSV file with your questions.</p>
            <Button variant="outline" size="sm" onClick={downloadQTemplate} className="gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" />
              Download Template
            </Button>
          </div>
          <div
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors",
              csvFile ? "border-emerald-300 bg-emerald-50" : "border-slate-200 hover:border-primary/40 hover:bg-slate-50"
            )}
          >
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvFile} />
            {csvFile ? (
              <div className="space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-sm font-medium text-emerald-700">{csvFile.name}</p>
                <p className="text-xs text-emerald-600">
                  {csvPreview.length > 1 ? `${csvPreview.length - 1} question${csvPreview.length - 1 !== 1 ? "s" : ""} detected` : ""}
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); setCsvFile(null); setCsvPreview([]); }}
                  className="text-xs text-slate-400 hover:text-red-500 mt-1"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-sm text-slate-500">Click to upload CSV file</p>
                <p className="text-xs text-slate-400">Columns: QuestionText, Category, Type, Options</p>
              </div>
            )}
          </div>
          {csvPreview.length > 1 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 border-b border-slate-200">
                Preview (first {csvPreview.length - 1} row{csvPreview.length - 1 !== 1 ? "s" : ""})
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {(csvPreview[0] ?? []).map((h, i) => (
                        <th key={i} className="px-3 py-2 text-left text-slate-500 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.slice(1).map((row, i) => (
                      <tr key={i} className="border-b border-slate-50 last:border-0">
                        {row.map((cell, j) => (
                          <td key={j} className="px-3 py-2 text-slate-700">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      <div>
        <Label htmlFor="qNote">Questionnaire Notes (optional)</Label>
        <Textarea
          id="qNote"
          placeholder="e.g., Focus on ICT-related competencies and digital skills gaps."
          value={form.questionnaireNote}
          onChange={(e) => onChange({ questionnaireNote: e.target.value })}
          className="mt-1 resize-none"
          rows={2}
        />
      </div>
    </div>
  );
}

// ─── Step 4: Schedule ─────────────────────────────────────────────────────────
function Step4({ form, onChange }: { form: WizardForm; onChange: (f: Partial<WizardForm>) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Schedule</h2>
        <p className="text-slate-500 text-sm mt-1">Set the survey period for this group. Staff can only respond within this window.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={form.startDate}
            onChange={(e) => onChange({ startDate: e.target.value })}
            className="mt-1"
          />
          <p className="text-xs text-slate-400 mt-1">When the survey opens for this group.</p>
        </div>
        <div>
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            type="date"
            value={form.endDate}
            min={form.startDate || undefined}
            onChange={(e) => onChange({ endDate: e.target.value })}
            className="mt-1"
          />
          <p className="text-xs text-slate-400 mt-1">When the survey closes for this group.</p>
        </div>
      </div>
      <div className="flex items-center gap-3 py-2">
        <Switch
          id="reminder"
          checked={form.reminderEnabled}
          onCheckedChange={(v) => onChange({ reminderEnabled: v })}
        />
        <div>
          <Label htmlFor="reminder" className="cursor-pointer">Enable reminders</Label>
          <p className="text-xs text-slate-400">Send reminder notifications to staff who haven't responded yet.</p>
        </div>
      </div>
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600">
        <p className="font-medium text-slate-700 mb-1">Note</p>
        <p>Schedule is optional. If no dates are set, the survey remains open indefinitely while the group is active.</p>
      </div>
    </div>
  );
}

// ─── Step 5: Review ───────────────────────────────────────────────────────────
function Step5({ form, sectors }: { form: WizardForm; sectors: { id: number; name: string }[] }) {
  const sectorName = form.sectorId ? sectors.find(s => String(s.id) === form.sectorId)?.name : "All Sectors";
  const rows = [
    { label: "Group Name",   value: form.name },
    { label: "Code",         value: <span className="font-mono">{form.code}</span> },
    { label: "Sector",       value: sectorName ?? "All Sectors" },
    { label: "Status",       value: form.isActive ? <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border">Active</Badge> : <Badge variant="outline">Inactive</Badge> },
    { label: "Description",  value: form.description || <span className="text-slate-400 italic">None</span> },
    { label: "Expected",     value: form.expectedCount ? `${form.expectedCount} participants` : <span className="text-slate-400 italic">Not set</span> },
    { label: "Start Date",   value: form.startDate || <span className="text-slate-400 italic">Not set</span> },
    { label: "End Date",     value: form.endDate || <span className="text-slate-400 italic">Not set</span> },
    { label: "Reminders",    value: form.reminderEnabled ? "Enabled" : "Disabled" },
    { label: "Participant Notes", value: form.participantNote || <span className="text-slate-400 italic">None</span> },
  ];
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Review & Create</h2>
        <p className="text-slate-500 text-sm mt-1">Review the details below, then click "Create Group" to confirm.</p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {rows.map((row, i) => (
          <div key={row.label} className={cn(
            "flex items-start gap-4 px-5 py-3",
            i < rows.length - 1 ? "border-b border-slate-100" : ""
          )}>
            <span className="text-sm text-slate-500 w-36 flex-shrink-0">{row.label}</span>
            <span className="text-sm text-slate-900 font-medium flex-1">{row.value}</span>
          </div>
        ))}
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700">
          After creating the group, share the survey link or QR code with your staff from the Survey Groups page.
          You can edit group details at any time.
        </p>
      </div>
    </div>
  );
}

// ─── Main Wizard Component ────────────────────────────────────────────────────
export default function CreateSurveyGroup() {
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [form, setForm] = useState<WizardForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [createdGroupId, setCreatedGroupId] = useState<number | undefined>();
  const contentRef = useRef<HTMLDivElement>(null);

  const { data: sectors } = trpc.sectors.list.useQuery({ activeOnly: true });
  const utils = trpc.useUtils();

  const upsert = trpc.groups.upsert.useMutation({
    onSuccess: (data) => {
      if (data) setCreatedGroupId(data);
      toast.success(`Group "${form.name}" created successfully!`);
      utils.groups.list.invalidate();
      utils.admin.readinessChecklist.invalidate();
    },
    onError: (e) => {
      toast.error(e.message);
    },
  });

  const updateForm = (patch: Partial<WizardForm>) => setForm(f => ({ ...f, ...patch }));

  const scrollToTop = () => {
    contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleNext = () => {
    const err = validateStep(currentStep, form);
    if (err) { setError(err); return; }
    setError(null);
    setCompleted(prev => new Set([...Array.from(prev), currentStep]));
    setCurrentStep(s => Math.min(s + 1, STEPS.length));
    scrollToTop();
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep(s => Math.max(s - 1, 1));
    scrollToTop();
  };

  const handleCreate = () => {
    if (upsert.isPending) return;
    upsert.mutate({
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      description: form.description.trim() || undefined,
      sectorId: form.sectorId ? parseInt(form.sectorId) : null,
      isActive: form.isActive,
      sortOrder: 0,
      expectedCount: form.expectedCount ? parseInt(form.expectedCount) : undefined,
    });
  };

  const isFinalStep = currentStep === STEPS.length;
  const isCreated = !!createdGroupId;

  return (
    <div className="max-w-3xl mx-auto">

      {/* Back nav */}
      <button
        onClick={() => navigate("/admin/groups")}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-5"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Survey Groups
      </button>

      {/* Page title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Create Survey Group</h1>
        <p className="text-slate-500 text-sm mt-1">Complete all steps to set up a new survey group for your TNA campaign.</p>
      </div>

      {/* Step indicator */}
      <StepIndicator current={currentStep} completed={completed} />

      {/* Step content */}
      <div ref={contentRef} className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
        {isCreated ? (
          // Success state
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Group Created!</h2>
              <p className="text-slate-500 mt-2">
                <strong>{form.name}</strong> has been created successfully.
                Share the survey link with your staff to start collecting TNA data.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button onClick={() => navigate("/admin/groups")} className="gap-2">
                <ClipboardList className="w-4 h-4" />
                View Survey Groups
              </Button>
              <Button variant="outline" onClick={() => navigate("/admin")} className="gap-2">
                Go to Dashboard
              </Button>
            </div>
          </div>
        ) : (
          <>
            {currentStep === 1 && <Step1 form={form} onChange={updateForm} sectors={sectors ?? []} />}
            {currentStep === 2 && <Step2 form={form} onChange={updateForm} groupId={createdGroupId} />}
            {currentStep === 3 && <Step3 form={form} onChange={updateForm} />}
            {currentStep === 4 && <Step4 form={form} onChange={updateForm} />}
            {currentStep === 5 && <Step5 form={form} sectors={sectors ?? []} />}
          </>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mb-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Navigation controls */}
      {!isCreated && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            {STEPS.map(s => (
              <div
                key={s.id}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  completed.has(s.id) ? "bg-emerald-500" :
                  s.id === currentStep ? "bg-primary" : "bg-slate-200"
                )}
              />
            ))}
          </div>

          {isFinalStep ? (
            <Button
              onClick={handleCreate}
              disabled={upsert.isPending}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {upsert.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {upsert.isPending ? "Creating…" : "Create Group"}
            </Button>
          ) : (
            <Button onClick={handleNext} className="gap-2">
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
