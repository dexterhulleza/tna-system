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
  Calendar, Eye, Loader2, Check, AlertCircle, Building2, ArrowLeft,
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
  // Step 2 (informational — participants join via link)
  participantNote: string;
  // Step 3 (questionnaire config note)
  questionnaireNote: string;
  // Step 4 (schedule — informational for now)
  startDate: string;
  endDate: string;
  reminderEnabled: boolean;
}

const EMPTY_FORM: WizardForm = {
  name: "", code: "", description: "", sectorId: "", isActive: true,
  participantNote: "", questionnaireNote: "",
  startDate: "", endDate: "", reminderEnabled: false,
};

// ─── Step validation ──────────────────────────────────────────────────────────
function validateStep(step: number, form: WizardForm): string | null {
  if (step === 1) {
    if (!form.name.trim()) return "Group name is required.";
    if (!form.code.trim()) return "Group code is required.";
    if (form.code.trim().length < 2) return "Code must be at least 2 characters.";
  }
  return null;
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepIndicator({ current, completed }: { current: number; completed: Set<number> }) {
  return (
    <>
      {/* Desktop: horizontal step tabs */}
      <div className="hidden md:flex items-center justify-between bg-white rounded-xl border border-slate-200 px-6 py-4 mb-6">
        {STEPS.map((step, idx) => {
          const isDone = completed.has(step.id);
          const isCurrent = current === step.id;
          const isLocked = !isDone && !isCurrent && step.id > current;
          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className={cn(
                "flex items-center gap-2.5 flex-shrink-0",
                isLocked ? "opacity-40" : ""
              )}>
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors",
                  isDone ? "bg-emerald-500 text-white" :
                  isCurrent ? "bg-primary text-white shadow-md shadow-primary/30" :
                  "bg-slate-100 text-slate-400"
                )}>
                  {isDone ? <Check className="w-4 h-4" /> : step.id}
                </div>
                <div>
                  <p className={cn(
                    "text-sm font-semibold leading-none",
                    isCurrent ? "text-primary" : isDone ? "text-emerald-600" : "text-slate-400"
                  )}>
                    {step.label}
                  </p>
                </div>
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
function Step2({ form, onChange, groupId }: { form: WizardForm; onChange: (f: Partial<WizardForm>) => void; groupId?: number }) {
  const surveyUrl = groupId ? `${window.location.origin}/survey/start?group=${groupId}` : null;
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    if (!surveyUrl) return;
    navigator.clipboard.writeText(surveyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Participants</h2>
        <p className="text-slate-500 text-sm mt-1">Staff join this group by taking the survey via a shared link or QR code.</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-900">How participants join</p>
            <p className="text-sm text-blue-700 mt-1">
              Share the survey link or QR code with your staff. When they open the link and take the survey,
              they are automatically registered as participants in this group.
            </p>
          </div>
        </div>
        {surveyUrl && (
          <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-blue-200">
            <span className="text-xs font-mono text-slate-700 truncate flex-1">{surveyUrl}</span>
            <button
              onClick={copyLink}
              className="flex-shrink-0 flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {copied ? <><Check className="w-3.5 h-3.5 text-green-600" /> Copied!</> : "Copy link"}
            </button>
          </div>
        )}
        {!surveyUrl && (
          <p className="text-xs text-blue-600 italic">The survey link will be available after the group is created.</p>
        )}
      </div>

      <div>
        <Label htmlFor="pNote">Participant Notes (optional)</Label>
        <Textarea
          id="pNote"
          placeholder="e.g., Invite all ICT department staff from Region 10 to complete this survey."
          value={form.participantNote}
          onChange={(e) => onChange({ participantNote: e.target.value })}
          className="mt-1 resize-none"
          rows={3}
        />
        <p className="text-xs text-slate-400 mt-1">Internal notes about who should be invited. Not shown to participants.</p>
      </div>
    </div>
  );
}

// ─── Step 3: Questionnaire ────────────────────────────────────────────────────
function Step3({ form, onChange }: { form: WizardForm; onChange: (f: Partial<WizardForm>) => void }) {
  // Check if any survey config exists by querying group 0 (global config check)
  const { data: configData } = trpc.surveyConfig.get.useQuery({ groupId: 0 });
  const hasConfig = !!configData;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Questionnaire</h2>
        <p className="text-slate-500 text-sm mt-1">The questionnaire is shared across all groups. Configure it in Survey Configuration.</p>
      </div>

      <div className={cn(
        "rounded-xl p-4 border flex items-start gap-3",
        hasConfig ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
      )}>
        {hasConfig
          ? <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          : <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        }
        <div>
          <p className={cn("text-sm font-semibold", hasConfig ? "text-emerald-900" : "text-amber-900")}>
            {hasConfig ? "Questionnaire configured" : "No questionnaire configured yet"}
          </p>
          <p className={cn("text-sm mt-1", hasConfig ? "text-emerald-700" : "text-amber-700")}>
            {hasConfig
              ? `Survey configuration found. Staff will answer questions based on the configured objectives.`
              : "Go to Survey Configuration to set up objectives and generate questions. You can complete this step and configure the questionnaire later."
            }
          </p>
        </div>
      </div>

      <div>
        <Label htmlFor="qNote">Questionnaire Notes (optional)</Label>
        <Textarea
          id="qNote"
          placeholder="e.g., Focus on ICT-related competencies and digital skills gaps."
          value={form.questionnaireNote}
          onChange={(e) => onChange({ questionnaireNote: e.target.value })}
          className="mt-1 resize-none"
          rows={3}
        />
        <p className="text-xs text-slate-400 mt-1">Internal notes about questionnaire scope or focus areas.</p>
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
            {/* Step dots */}
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
