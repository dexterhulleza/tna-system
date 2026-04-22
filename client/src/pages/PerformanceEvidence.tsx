/**
 * PerformanceEvidence — T5-5
 * Staff-facing page to submit KPI/productivity/quality evidence.
 * Admins can view group evidence and verify records.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ClipboardList, Plus, Loader2, CheckCircle2, Clock,
  Trash2, RefreshCw, TrendingUp, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import StaffLayout from "@/components/StaffLayout";

const EVIDENCE_TYPES = [
  { value: "kpi",               label: "KPI Achievement" },
  { value: "productivity",      label: "Productivity Metric" },
  { value: "quality",           label: "Quality Score" },
  { value: "incident",          label: "Incident / Near-Miss" },
  { value: "audit_finding",     label: "Audit Finding" },
  { value: "peer_feedback",     label: "Peer Feedback" },
  { value: "customer_feedback", label: "Customer Feedback" },
  { value: "other",             label: "Other" },
];

const TYPE_COLORS: Record<string, string> = {
  kpi:               "bg-blue-100 text-blue-700",
  productivity:      "bg-indigo-100 text-indigo-700",
  quality:           "bg-purple-100 text-purple-700",
  incident:          "bg-red-100 text-red-700",
  audit_finding:     "bg-orange-100 text-orange-700",
  peer_feedback:     "bg-green-100 text-green-700",
  customer_feedback: "bg-teal-100 text-teal-700",
  other:             "bg-slate-100 text-slate-600",
};

const emptyForm = {
  id: undefined as number | undefined,
  evidenceType: "kpi" as string,
  title: "",
  description: "",
  metricName: "",
  metricValue: "",
  metricTarget: "",
  metricUnit: "",
  performanceScore: "",
  periodStart: "",
  periodEnd: "",
  sourceDocument: "",
};

export default function PerformanceEvidence() {
  const { user } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const { data: evidence, isLoading, refetch } = trpc.performanceEvidence.listByUser.useQuery({});

  const upsertMutation = trpc.performanceEvidence.upsert.useMutation({
    onSuccess: () => {
      toast.success(form.id ? "Evidence updated" : "Evidence submitted");
      setShowDialog(false);
      setForm({ ...emptyForm });
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.performanceEvidence.delete.useMutation({
    onSuccess: () => { toast.success("Deleted"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  function openEdit(e: any) {
    setForm({
      id: e.id,
      evidenceType: e.evidenceType,
      title: e.title,
      description: e.description ?? "",
      metricName: e.metricName ?? "",
      metricValue: e.metricValue?.toString() ?? "",
      metricTarget: e.metricTarget?.toString() ?? "",
      metricUnit: e.metricUnit ?? "",
      performanceScore: e.performanceScore?.toString() ?? "",
      periodStart: e.periodStart ? new Date(e.periodStart).toISOString().slice(0, 10) : "",
      periodEnd: e.periodEnd ? new Date(e.periodEnd).toISOString().slice(0, 10) : "",
      sourceDocument: e.sourceDocument ?? "",
    });
    setShowDialog(true);
  }

  function handleSave() {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    upsertMutation.mutate({
      id: form.id,
      evidenceType: form.evidenceType as any,
      title: form.title,
      description: form.description || null,
      metricName: form.metricName || null,
      metricValue: form.metricValue ? parseFloat(form.metricValue) : null,
      metricTarget: form.metricTarget ? parseFloat(form.metricTarget) : null,
      metricUnit: form.metricUnit || null,
      performanceScore: form.performanceScore ? parseFloat(form.performanceScore) : null,
      periodStart: form.periodStart || null,
      periodEnd: form.periodEnd || null,
      sourceDocument: form.sourceDocument || null,
    });
  }

  const verifiedCount = (evidence ?? []).filter((e: any) => e.isVerified).length;
  const pendingCount = (evidence ?? []).filter((e: any) => !e.isVerified).length;

  return (
    <StaffLayout>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-teal-500" />
              Performance Evidence
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Submit KPI results, productivity metrics, and quality data to support your TNA
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button onClick={() => { setForm({ ...emptyForm }); setShowDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Evidence
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-2xl font-bold text-slate-900">{(evidence ?? []).length}</div>
            <div className="text-sm text-slate-500 mt-0.5">Total Records</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div className="text-2xl font-bold text-emerald-700">{verifiedCount}</div>
            <div className="text-sm text-emerald-600 mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Verified
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="text-2xl font-bold text-amber-700">{pendingCount}</div>
            <div className="text-sm text-amber-600 mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Pending Verification
            </div>
          </div>
        </div>

        {/* Evidence List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : (evidence ?? []).length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No evidence submitted yet</p>
            <p className="text-sm mt-1">Add KPI results, quality scores, or other performance data</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(evidence ?? []).map((e: any) => (
              <div key={e.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-all">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[e.evidenceType] ?? TYPE_COLORS.other}`}>
                        {EVIDENCE_TYPES.find(t => t.value === e.evidenceType)?.label ?? e.evidenceType}
                      </span>
                      {e.isVerified ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                          <CheckCircle2 className="w-3 h-3" /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-500">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-slate-900 mt-1">{e.title}</h3>
                    {e.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{e.description}</p>}

                    {/* Metrics */}
                    {(e.metricName || e.performanceScore != null) && (
                      <div className="flex flex-wrap gap-4 mt-2 text-sm">
                        {e.metricName && (
                          <span className="flex items-center gap-1 text-slate-600">
                            <TrendingUp className="w-3 h-3" />
                            {e.metricName}: <strong>{e.metricValue ?? "—"}</strong>
                            {e.metricTarget && <span className="text-slate-400"> / {e.metricTarget}</span>}
                            {e.metricUnit && <span className="text-slate-400"> {e.metricUnit}</span>}
                          </span>
                        )}
                        {e.performanceScore != null && (
                          <span className={`font-semibold ${e.performanceScore >= 80 ? "text-green-600" : e.performanceScore >= 60 ? "text-yellow-600" : "text-red-600"}`}>
                            Score: {e.performanceScore}/100
                          </span>
                        )}
                      </div>
                    )}

                    {/* Period */}
                    {(e.periodStart || e.periodEnd) && (
                      <p className="text-xs text-slate-400 mt-1">
                        Period: {e.periodStart ? new Date(e.periodStart).toLocaleDateString() : "—"} – {e.periodEnd ? new Date(e.periodEnd).toLocaleDateString() : "ongoing"}
                      </p>
                    )}
                    {e.sourceDocument && (
                      <p className="text-xs text-slate-400 mt-0.5">Source: {e.sourceDocument}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 items-end shrink-0">
                    {!e.isVerified && (
                      <Button size="sm" variant="ghost" onClick={() => openEdit(e)}>Edit</Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-600"
                      onClick={() => { if (confirm("Delete this evidence record?")) deleteMutation.mutate({ id: e.id }); }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) { setShowDialog(false); setForm({ ...emptyForm }); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Evidence" : "Add Performance Evidence"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Evidence Type *</Label>
              <Select value={form.evidenceType} onValueChange={(v) => setForm(f => ({ ...f, evidenceType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVIDENCE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g., Q1 Sales Target Achievement" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            {/* Metric Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Metric Name</Label>
                <Input value={form.metricName} onChange={(e) => setForm(f => ({ ...f, metricName: e.target.value }))} placeholder="e.g., Sales Volume" />
              </div>
              <div>
                <Label>Unit</Label>
                <Input value={form.metricUnit} onChange={(e) => setForm(f => ({ ...f, metricUnit: e.target.value }))} placeholder="e.g., units, %, PHP" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Actual Value</Label>
                <Input type="number" value={form.metricValue} onChange={(e) => setForm(f => ({ ...f, metricValue: e.target.value }))} />
              </div>
              <div>
                <Label>Target Value</Label>
                <Input type="number" value={form.metricTarget} onChange={(e) => setForm(f => ({ ...f, metricTarget: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Performance Score (0–100)</Label>
              <Input type="number" min={0} max={100} value={form.performanceScore} onChange={(e) => setForm(f => ({ ...f, performanceScore: e.target.value }))} />
            </div>

            {/* Period */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Period Start</Label>
                <Input type="date" value={form.periodStart} onChange={(e) => setForm(f => ({ ...f, periodStart: e.target.value }))} />
              </div>
              <div>
                <Label>Period End</Label>
                <Input type="date" value={form.periodEnd} onChange={(e) => setForm(f => ({ ...f, periodEnd: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Source Document / Reference</Label>
              <Input value={form.sourceDocument} onChange={(e) => setForm(f => ({ ...f, sourceDocument: e.target.value }))} placeholder="e.g., Q1 Sales Report, HR-2026-001" />
            </div>

            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700">
                Evidence will be reviewed and verified by your HR officer or line manager. Verified records are used in your weighted TNA score.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); setForm({ ...emptyForm }); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {form.id ? "Update" : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StaffLayout>
  );
}
