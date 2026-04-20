/**
 * Company Information — Admin Settings Page
 * ONE OBJECTIVE: Set your organization's details so they pre-populate all TNA reports.
 * Stores data in surveyConfigurations with groupId = 0 (global/company-level config).
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Building2, Loader2, Save, CheckCircle2, Info } from "lucide-react";

const GLOBAL_GROUP_ID = 0; // groupId=0 = company-level global config

interface CompanyForm {
  organizationName: string;
  industryContext: string;
  surveyPurpose: string;
  targetParticipants: string;
  regulatoryRequirements: string;
  additionalNotes: string;
}

const EMPTY: CompanyForm = {
  organizationName: "",
  industryContext: "",
  surveyPurpose: "",
  targetParticipants: "",
  regulatoryRequirements: "",
  additionalNotes: "",
};

export default function CompanyInfo() {
  const [form, setForm] = useState<CompanyForm>(EMPTY);
  const [saved, setSaved] = useState(false);

  const { data: existing, isLoading } = trpc.surveyConfig.get.useQuery({ groupId: GLOBAL_GROUP_ID });
  const utils = trpc.useUtils();

  const save = trpc.surveyConfig.save.useMutation({
    onSuccess: () => {
      toast.success("Company information saved.");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      utils.surveyConfig.get.invalidate({ groupId: GLOBAL_GROUP_ID });
    },
    onError: (e) => toast.error(e.message),
  });

  // Pre-fill form from existing config
  useEffect(() => {
    if (existing) {
      setForm({
        organizationName: existing.organizationName ?? "",
        industryContext: existing.industryContext ?? "",
        surveyPurpose: existing.surveyPurpose ?? "",
        targetParticipants: existing.targetParticipants ?? "",
        regulatoryRequirements: existing.regulatoryRequirements ?? "",
        additionalNotes: existing.additionalNotes ?? "",
      });
    }
  }, [existing]);

  const handleSave = () => {
    if (!form.organizationName.trim()) {
      toast.error("Organization name is required.");
      return;
    }
    save.mutate({
      groupId: GLOBAL_GROUP_ID,
      organizationName: form.organizationName.trim(),
      industryContext: form.industryContext.trim() || undefined,
      surveyPurpose: form.surveyPurpose.trim() || undefined,
      targetParticipants: form.targetParticipants.trim() || undefined,
      regulatoryRequirements: form.regulatoryRequirements.trim() || undefined,
      additionalNotes: form.additionalNotes.trim() || undefined,
    });
  };

  const update = (patch: Partial<CompanyForm>) => setForm(f => ({ ...f, ...patch }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold text-slate-900">Company Information</h1>
          </div>
          <p className="text-slate-500 text-sm">
            Set your organization's details. These will pre-populate all TNA reports and survey configurations.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={save.isPending}
          className="gap-2 flex-shrink-0"
        >
          {save.isPending
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : saved
            ? <CheckCircle2 className="w-4 h-4 text-white" />
            : <Save className="w-4 h-4" />
          }
          {save.isPending ? "Saving…" : saved ? "Saved!" : "Save Changes"}
        </Button>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700">
          This information is used as context when generating AI-powered TNA reports and training plans.
          Fill in as much detail as possible for more accurate and relevant outputs.
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">

        {/* Organization Name */}
        <div className="px-6 py-5 space-y-1.5">
          <Label htmlFor="orgName">
            Organization Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="orgName"
            placeholder="e.g., Technical Education and Skills Development Authority"
            value={form.organizationName}
            onChange={(e) => update({ organizationName: e.target.value })}
            autoFocus
          />
          <p className="text-xs text-slate-400">Full legal name of your organization or agency.</p>
        </div>

        {/* Industry / Sector Context */}
        <div className="px-6 py-5 space-y-1.5">
          <Label htmlFor="industry">Industry / Sector Context</Label>
          <Input
            id="industry"
            placeholder="e.g., Technical-Vocational Education and Training (TVET), ICT Sector"
            value={form.industryContext}
            onChange={(e) => update({ industryContext: e.target.value })}
          />
          <p className="text-xs text-slate-400">Describe the industry or sector your organization operates in.</p>
        </div>

        {/* TNA Purpose */}
        <div className="px-6 py-5 space-y-1.5">
          <Label htmlFor="purpose">TNA Purpose / Objective</Label>
          <Textarea
            id="purpose"
            placeholder="e.g., To identify training needs of TVET trainers and assessors in the ICT sector to improve competency delivery."
            value={form.surveyPurpose}
            onChange={(e) => update({ surveyPurpose: e.target.value })}
            className="resize-none"
            rows={3}
          />
          <p className="text-xs text-slate-400">Why is your organization conducting this TNA?</p>
        </div>

        {/* Target Participants */}
        <div className="px-6 py-5 space-y-1.5">
          <Label htmlFor="participants">Target Participants</Label>
          <Input
            id="participants"
            placeholder="e.g., TVET trainers, assessors, and industry workers in Region 10"
            value={form.targetParticipants}
            onChange={(e) => update({ targetParticipants: e.target.value })}
          />
          <p className="text-xs text-slate-400">Who will be taking the TNA survey?</p>
        </div>

        {/* Regulatory Requirements */}
        <div className="px-6 py-5 space-y-1.5">
          <Label htmlFor="regulatory">Regulatory / Compliance Requirements</Label>
          <Textarea
            id="regulatory"
            placeholder="e.g., TESDA Training Regulations, NTESDP 2023-2028 competency standards, RA 7796"
            value={form.regulatoryRequirements}
            onChange={(e) => update({ regulatoryRequirements: e.target.value })}
            className="resize-none"
            rows={2}
          />
          <p className="text-xs text-slate-400">Any regulatory frameworks or compliance standards relevant to your TNA.</p>
        </div>

        {/* Additional Notes */}
        <div className="px-6 py-5 space-y-1.5">
          <Label htmlFor="notes">Additional Notes</Label>
          <Textarea
            id="notes"
            placeholder="Any other context that should be included in AI-generated reports…"
            value={form.additionalNotes}
            onChange={(e) => update({ additionalNotes: e.target.value })}
            className="resize-none"
            rows={3}
          />
          <p className="text-xs text-slate-400">Optional. This will be included as context in AI-generated TNA reports.</p>
        </div>
      </div>

      {/* Save button (bottom) */}
      <div className="flex justify-end pb-8">
        <Button
          onClick={handleSave}
          disabled={save.isPending}
          size="lg"
          className="gap-2"
        >
          {save.isPending
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : saved
            ? <CheckCircle2 className="w-4 h-4 text-white" />
            : <Save className="w-4 h-4" />
          }
          {save.isPending ? "Saving…" : saved ? "Saved!" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
