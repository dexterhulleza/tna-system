/**
 * EditSurveyGroup — /admin/survey-groups/:id/edit
 * ONE OBJECTIVE: Edit an existing survey group using the same 5-step wizard as Create.
 * Pre-fills all form fields from the existing group data.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useParams } from "wouter";
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
  Calendar, Eye, Loader2, Check, AlertCircle, ArrowLeft, QrCode, Link2,
  Copy, ListChecks, LayoutDashboard,
} from "lucide-react";
import QRCode from "qrcode";
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
  name: string;
  code: string;
  description: string;
  sectorId: string;
  isActive: boolean;
  participantNote: string;
  expectedCount: string;
  questionnaireNote: string;
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
        <p className="text-slate-500 text-sm mt-1">Update the name, code, and sector scope for this survey group.</p>
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
function Step2({ form, onChange, groupId }: {
  form: WizardForm;
  onChange: (f: Partial<WizardForm>) => void;
  groupId: number;
}) {
  const [copied, setCopied] = useState(false);
  const surveyUrl = `${window.location.origin}/survey/start?group=${groupId}`;

  const copyLink = () => {
    navigator.clipboard.writeText(surveyUrl).then(() => {
      setCopied(true);
      toast.success("Survey link copied!");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Participants</h2>
        <p className="text-slate-500 text-sm mt-1">Set the expected participant count and review the survey link for this group.</p>
      </div>
      {/* Survey Link */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
        <div className="flex items-start gap-3">
          <QrCode className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-900">Survey link for this group</p>
            <p className="text-sm text-blue-700 mt-1">
              Share this link or QR code with your staff. Anyone who opens the link and completes the survey
              is automatically registered as a participant.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-blue-200">
          <Link2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="text-xs font-mono text-slate-700 truncate flex-1">{surveyUrl}</span>
          <button
            onClick={copyLink}
            className="flex-shrink-0 flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80"
          >
            {copied ? <><Check className="w-3.5 h-3.5 text-green-600" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
          </button>
        </div>
      </div>
      {/* Expected Count */}
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
      {/* Participant Notes */}
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
  );
}

// ─── Step 3: Questionnaire ────────────────────────────────────────────────────
function Step3({ form, onChange }: {
  form: WizardForm;
  onChange: (f: Partial<WizardForm>) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Questionnaire</h2>
        <p className="text-slate-500 text-sm mt-1">Review or update the questionnaire notes for this group.</p>
      </div>
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
        <ClipboardList className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-slate-600">
          <p className="font-medium text-slate-700 mb-1">Questionnaire Management</p>
          <p>
            To add, edit, or remove questions for this group, go to{" "}
            <strong>Admin → Questions</strong> and filter by this group.
            Changes take effect immediately for all future survey sessions.
          </p>
        </div>
      </div>
      <div>
        <Label htmlFor="qNote">Questionnaire Notes (optional)</Label>
        <Textarea
          id="qNote"
          placeholder="e.g., Focus on digital skills and remote work competencies."
          value={form.questionnaireNote}
          onChange={(e) => onChange({ questionnaireNote: e.target.value })}
          className="mt-1 resize-none"
          rows={3}
        />
        <p className="text-xs text-slate-400 mt-1">Internal notes about the questionnaire scope or focus areas.</p>
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
        <p className="text-slate-500 text-sm mt-1">Update the survey period for this group.</p>
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
        <h2 className="text-lg font-bold text-slate-900">Review & Save</h2>
        <p className="text-slate-500 text-sm mt-1">Review the changes below, then click "Save Changes" to confirm.</p>
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
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-700">
          Saving changes will update this group immediately. Active surveys using this group will reflect the changes.
        </p>
      </div>
    </div>
  );
}

// ─── Success Screen ───────────────────────────────────────────────────────────
function SavedScreen({
  groupId,
  groupName,
  groupCode,
  onNavigate,
}: {
  groupId: number;
  groupName: string;
  groupCode: string;
  onNavigate: (path: string) => void;
}) {
  const surveyUrl = `${window.location.origin}/survey/start?group=${groupId}`;
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(surveyUrl, {
      width: 220,
      margin: 2,
      color: { dark: "#1e293b", light: "#ffffff" },
      errorCorrectionLevel: "H",
    }).then(setQrDataUrl).catch(console.error);
  }, [surveyUrl]);

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(surveyUrl).then(() => {
      setCopied(true);
      toast.success("Survey link copied!");
      setTimeout(() => setCopied(false), 2000);
    });
  }, [surveyUrl]);

  const downloadQR = useCallback(() => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `TNA-Survey-QR-${groupCode}.png`;
    a.click();
  }, [qrDataUrl, groupCode]);

  return (
    <div className="py-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Changes Saved!</h2>
        <p className="text-slate-500 mt-1 text-sm">
          <strong className="text-slate-700">{groupName}</strong> has been updated successfully.
        </p>
      </div>
      <div className="flex flex-col md:flex-row gap-6 items-start justify-center">
        {/* QR Code */}
        <div className="flex flex-col items-center gap-3">
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Survey QR Code" className="w-44 h-44" />
            ) : (
              <div className="w-44 h-44 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
              </div>
            )}
          </div>
          <Button
            onClick={downloadQR}
            disabled={!qrDataUrl}
            variant="outline"
            size="sm"
            className="gap-2 w-full"
          >
            <QrCode className="w-4 h-4" />
            Download QR PNG
          </Button>
        </div>
        {/* Link + CTAs */}
        <div className="flex-1 min-w-0 space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Survey Link</p>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <Link2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-sm text-slate-700 truncate flex-1 font-mono">{surveyUrl}</span>
              <button
                onClick={copyLink}
                className="flex-shrink-0 p-1 rounded hover:bg-slate-200 transition-colors"
                title="Copy link"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4 text-slate-500" />
                )}
              </button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button onClick={() => onNavigate("/admin/groups")} className="gap-2 flex-1">
              <ListChecks className="w-4 h-4" />
              View Survey Groups
            </Button>
            <Button variant="outline" onClick={() => onNavigate("/admin")} className="gap-2 flex-1">
              <LayoutDashboard className="w-4 h-4" />
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Edit Wizard Component ───────────────────────────────────────────────
export default function EditSurveyGroup() {
  const [, navigate] = useLocation();
  const { id } = useParams<{ id: string }>();
  const groupId = parseInt(id ?? "0");

  const [currentStep, setCurrentStep] = useState(1);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [form, setForm] = useState<WizardForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const { data: sectors } = trpc.sectors.list.useQuery({ activeOnly: true });
  const { data: group, isLoading: groupLoading, error: groupError } = trpc.groups.getById.useQuery(
    { id: groupId },
    { enabled: !!groupId && groupId > 0 }
  );

  const utils = trpc.useUtils();

  // Pre-fill form from existing group data
  useEffect(() => {
    if (group && !initialized) {
      setForm({
        name: group.name ?? "",
        code: group.code ?? "",
        description: group.description ?? "",
        sectorId: group.sectorId ? String(group.sectorId) : "",
        isActive: group.isActive ?? true,
        participantNote: "",
        expectedCount: group.expectedCount ? String(group.expectedCount) : "",
        questionnaireNote: "",
        startDate: "",
        endDate: "",
        reminderEnabled: false,
      });
      setInitialized(true);
    }
  }, [group, initialized]);

  const upsert = trpc.groups.upsert.useMutation({
    onSuccess: () => {
      toast.success(`Group "${form.name}" updated successfully!`);
      utils.groups.list.invalidate();
      utils.admin.readinessChecklist.invalidate();
      setSaved(true);
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

  const handleSave = () => {
    if (upsert.isPending) return;
    upsert.mutate({
      id: groupId,
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

  // ── Loading / Error states ──
  if (!groupId || groupId <= 0) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
        <p className="font-semibold text-slate-900">Invalid group ID</p>
        <Button className="mt-4" onClick={() => navigate("/admin/groups")}>Back to Survey Groups</Button>
      </div>
    );
  }

  if (groupLoading || !initialized) {
    return (
      <div className="max-w-3xl mx-auto py-12 flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-slate-500 text-sm">Loading group data…</p>
      </div>
    );
  }

  if (groupError || !group) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
        <p className="font-semibold text-slate-900">Group not found</p>
        <p className="text-sm text-slate-500 mt-1">The group you're trying to edit does not exist or has been removed.</p>
        <Button className="mt-4" onClick={() => navigate("/admin/groups")}>Back to Survey Groups</Button>
      </div>
    );
  }

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
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Edit Survey Group</h1>
          <Badge variant="outline" className="font-mono text-xs">{group.code}</Badge>
        </div>
        <p className="text-slate-500 text-sm mt-1">Update the settings for <strong className="text-slate-700">{group.name}</strong>.</p>
      </div>

      {/* Step indicator */}
      <StepIndicator current={currentStep} completed={completed} />

      {/* Step content */}
      <div ref={contentRef} className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
        {saved ? (
          <SavedScreen groupId={groupId} groupName={form.name} groupCode={form.code} onNavigate={navigate} />
        ) : (
          <>
            {currentStep === 1 && <Step1 form={form} onChange={updateForm} sectors={sectors ?? []} />}
            {currentStep === 2 && <Step2 form={form} onChange={updateForm} groupId={groupId} />}
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
      {!saved && (
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
              onClick={handleSave}
              disabled={upsert.isPending}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {upsert.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {upsert.isPending ? "Saving…" : "Save Changes"}
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
