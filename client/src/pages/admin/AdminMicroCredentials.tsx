/**
 * AdminMicroCredentials — T5-1/T5-2
 * Micro-credential recommendation engine + record tracking with status lifecycle.
 * Proposed → Approved → Enrolled → Completed → Stacked
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Award, Loader2, Plus, Sparkles, ChevronRight,
  CheckCircle2, XCircle, BookOpen, Layers, Zap, Target,
  RefreshCw, Trash2, Search,
} from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  proposed:  { label: "Proposed",  color: "text-blue-700",   bg: "bg-blue-50 border-blue-200" },
  approved:  { label: "Approved",  color: "text-green-700",  bg: "bg-green-50 border-green-200" },
  enrolled:  { label: "Enrolled",  color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  completed: { label: "Completed", color: "text-emerald-700",bg: "bg-emerald-50 border-emerald-200" },
  stacked:   { label: "Stacked",   color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  rejected:  { label: "Rejected",  color: "text-red-700",    bg: "bg-red-50 border-red-200" },
};

const STATUS_FLOW: Record<string, string[]> = {
  proposed:  ["approved", "rejected"],
  approved:  ["enrolled", "rejected"],
  enrolled:  ["completed"],
  completed: ["stacked"],
  stacked:   [],
  rejected:  [],
};

const QUALIFICATION_LEVELS = ["NC I", "NC II", "NC III", "NC IV", "COC", "Certificate", "Diploma", "Other"];

export default function AdminMicroCredentials() {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterGroupId, setFilterGroupId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAdvanceDialog, setShowAdvanceDialog] = useState<{ id: number; nextStatus: string } | null>(null);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [generateUserId, setGenerateUserId] = useState<string>("");
  const [generateGroupId, setGenerateGroupId] = useState<string>("");
  const [advanceMeta, setAdvanceMeta] = useState({ rejectionReason: "", certificateNumber: "", issuingBody: "" });
  const [form, setForm] = useState({
    userId: "",
    groupId: "",
    title: "",
    clusterLabel: "",
    workContext: "",
    qualificationLevel: "",
    isWorkRelevant: false,
    isAssessable: false,
    hasModularIntegrity: false,
    isStackable: false,
    description: "",
  });

  const { data: groups } = trpc.groups.list.useQuery({ activeOnly: false });
  const { data: users } = trpc.admin.users.list.useQuery();
  const { data: records, isLoading, refetch } = trpc.microCredentials.list.useQuery({
    status: filterStatus === "all" ? undefined : filterStatus,
    groupId: filterGroupId ?? undefined,
  });

  const upsertMutation = trpc.microCredentials.upsert.useMutation({
    onSuccess: () => { toast.success("Micro-credential saved"); setShowCreateDialog(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const advanceMutation = trpc.microCredentials.advanceStatus.useMutation({
    onSuccess: () => { toast.success("Status updated"); setShowAdvanceDialog(null); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.microCredentials.delete.useMutation({
    onSuccess: () => { toast.success("Deleted"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const generateMutation = trpc.microCredentials.generate.useMutation({
    onSuccess: (data) => {
      toast.success(`Generated ${data.length} micro-credential proposals`);
      setShowGenerateDialog(false);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = (records ?? []).filter((r: any) =>
    !searchQuery || r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.clusterLabel?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusCounts = (records ?? []).reduce((acc: Record<string, number>, r: any) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  function handleCreate() {
    if (!form.userId || !form.title) { toast.error("User and title are required"); return; }
    upsertMutation.mutate({
      userId: parseInt(form.userId),
      groupId: form.groupId ? parseInt(form.groupId) : null,
      title: form.title,
      clusterLabel: form.clusterLabel || null,
      workContext: form.workContext || null,
      qualificationLevel: form.qualificationLevel || null,
      isWorkRelevant: form.isWorkRelevant,
      isAssessable: form.isAssessable,
      hasModularIntegrity: form.hasModularIntegrity,
      isStackable: form.isStackable,
      description: form.description || null,
      status: "proposed",
    });
  }

  function handleAdvance() {
    if (!showAdvanceDialog) return;
    advanceMutation.mutate({
      id: showAdvanceDialog.id,
      newStatus: showAdvanceDialog.nextStatus as any,
      rejectionReason: advanceMeta.rejectionReason || undefined,
      certificateNumber: advanceMeta.certificateNumber || undefined,
      issuingBody: advanceMeta.issuingBody || undefined,
    });
  }

  const qualScore = (r: any) => {
    const rules = [r.isWorkRelevant, r.isAssessable, r.hasModularIntegrity, r.isStackable];
    return rules.filter(Boolean).length;
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-6 h-6 text-amber-500" />
              Micro-Credentials
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              T5-1 Recommendation Engine · T5-2 Record Tracking
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowGenerateDialog(true)}>
              <Sparkles className="w-4 h-4 mr-2 text-purple-500" />
              AI Generate
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Manually
            </Button>
          </div>
        </div>

        {/* Status Summary Cards */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
            <button
              key={status}
              onClick={() => setFilterStatus(filterStatus === status ? "all" : status)}
              className={`rounded-lg border p-3 text-left transition-all ${
                filterStatus === status ? cfg.bg + " border-2" : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className={`text-xl font-bold ${cfg.color}`}>{statusCounts[status] ?? 0}</div>
              <div className="text-xs text-slate-500 mt-0.5">{cfg.label}</div>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by title or cluster..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterGroupId?.toString() ?? "all"} onValueChange={(v) => setFilterGroupId(v === "all" ? null : parseInt(v))}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Groups" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              {(groups ?? []).map((g: any) => (
                <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Records List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No micro-credentials found</p>
            <p className="text-sm mt-1">Use AI Generate to create proposals from gap records</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r: any) => {
              const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.proposed;
              const nextStatuses = STATUS_FLOW[r.status] ?? [];
              const qScore = qualScore(r);
              return (
                <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-all">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        {r.isAiGenerated && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-50 text-purple-600 border border-purple-200">
                            <Sparkles className="w-3 h-3" /> AI
                          </span>
                        )}
                        <span className="text-xs text-slate-400">
                          Qualification Rules: {qScore}/4
                        </span>
                      </div>
                      <h3 className="font-semibold text-slate-900 mt-1">{r.title}</h3>
                      <div className="flex flex-wrap gap-3 mt-1 text-sm text-slate-500">
                        {r.clusterLabel && <span className="flex items-center gap-1"><Layers className="w-3 h-3" />{r.clusterLabel}</span>}
                        {r.workContext && <span className="flex items-center gap-1"><Target className="w-3 h-3" />{r.workContext}</span>}
                        {r.qualificationLevel && <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{r.qualificationLevel}</span>}
                      </div>
                      {/* Qualification Rules */}
                      <div className="flex gap-3 mt-2">
                        {[
                          { key: "isWorkRelevant", label: "Work Relevant" },
                          { key: "isAssessable", label: "Assessable" },
                          { key: "hasModularIntegrity", label: "Modular" },
                          { key: "isStackable", label: "Stackable" },
                        ].map(({ key, label }) => (
                          <span key={key} className={`flex items-center gap-1 text-xs ${r[key] ? "text-green-600" : "text-slate-300"}`}>
                            {r[key] ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {label}
                          </span>
                        ))}
                      </div>
                      {r.description && (
                        <p className="text-sm text-slate-500 mt-2 line-clamp-2">{r.description}</p>
                      )}
                      {r.certificateNumber && (
                        <p className="text-xs text-emerald-600 mt-1">
                          Cert #{r.certificateNumber} · {r.issuingBody}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 items-end shrink-0">
                      {nextStatuses.map((ns) => (
                        <Button
                          key={ns}
                          size="sm"
                          variant={ns === "rejected" ? "outline" : "default"}
                          className={ns === "rejected" ? "text-red-600 border-red-200 hover:bg-red-50" : ""}
                          onClick={() => {
                            setAdvanceMeta({ rejectionReason: "", certificateNumber: "", issuingBody: "" });
                            setShowAdvanceDialog({ id: r.id, nextStatus: ns });
                          }}
                        >
                          {ns === "rejected" ? "Reject" : `→ ${STATUS_CONFIG[ns]?.label ?? ns}`}
                          <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      ))}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-600"
                        onClick={() => {
                          if (confirm("Delete this micro-credential record?")) {
                            deleteMutation.mutate({ id: r.id });
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Micro-Credential</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Staff Member *</Label>
                <Select value={form.userId} onValueChange={(v) => setForm(f => ({ ...f, userId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                  <SelectContent>
                    {(users ?? []).map((u: any) => (
                      <SelectItem key={u.id} value={u.id.toString()}>{u.name ?? u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Group</Label>
                <Select value={form.groupId} onValueChange={(v) => setForm(f => ({ ...f, groupId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    {(groups ?? []).map((g: any) => (
                      <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Title *</Label>
              <Input placeholder="[Cluster] + [Work Context] + [Level]" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Competency Cluster</Label>
                <Input value={form.clusterLabel} onChange={(e) => setForm(f => ({ ...f, clusterLabel: e.target.value }))} />
              </div>
              <div>
                <Label>Work Context</Label>
                <Input value={form.workContext} onChange={(e) => setForm(f => ({ ...f, workContext: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Qualification Level</Label>
              <Select value={form.qualificationLevel} onValueChange={(v) => setForm(f => ({ ...f, qualificationLevel: v }))}>
                <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                <SelectContent>
                  {QUALIFICATION_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* Qualification Rules */}
            <div>
              <Label className="mb-2 block">Qualification Rules</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "isWorkRelevant", label: "Work Relevant" },
                  { key: "isAssessable", label: "Assessable" },
                  { key: "hasModularIntegrity", label: "Modular Integrity" },
                  { key: "isStackable", label: "Stackable" },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(form as any)[key]}
                      onChange={(e) => setForm(f => ({ ...f, [key]: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Advance Status Dialog */}
      <Dialog open={!!showAdvanceDialog} onOpenChange={() => setShowAdvanceDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {showAdvanceDialog?.nextStatus === "rejected" ? "Reject Micro-Credential" : `Advance to ${STATUS_CONFIG[showAdvanceDialog?.nextStatus ?? ""]?.label}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {showAdvanceDialog?.nextStatus === "rejected" && (
              <div>
                <Label>Rejection Reason</Label>
                <Textarea rows={2} value={advanceMeta.rejectionReason} onChange={(e) => setAdvanceMeta(m => ({ ...m, rejectionReason: e.target.value }))} />
              </div>
            )}
            {showAdvanceDialog?.nextStatus === "completed" && (
              <>
                <div>
                  <Label>Certificate Number</Label>
                  <Input value={advanceMeta.certificateNumber} onChange={(e) => setAdvanceMeta(m => ({ ...m, certificateNumber: e.target.value }))} />
                </div>
                <div>
                  <Label>Issuing Body</Label>
                  <Input value={advanceMeta.issuingBody} onChange={(e) => setAdvanceMeta(m => ({ ...m, issuingBody: e.target.value }))} />
                </div>
              </>
            )}
            {!["rejected", "completed"].includes(showAdvanceDialog?.nextStatus ?? "") && (
              <p className="text-sm text-slate-500">Confirm advancing this micro-credential to <strong>{STATUS_CONFIG[showAdvanceDialog?.nextStatus ?? ""]?.label}</strong>?</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdvanceDialog(null)}>Cancel</Button>
            <Button
              onClick={handleAdvance}
              disabled={advanceMutation.isPending}
              variant={showAdvanceDialog?.nextStatus === "rejected" ? "destructive" : "default"}
            >
              {advanceMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Generate Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              AI Generate Micro-Credentials
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-500">
              The AI engine will analyze competency gaps and apply the four TESDA qualification rules (Work Relevance, Assessability, Modular Integrity, Stackability) to generate 3–5 micro-credential proposals.
            </p>
            <div>
              <Label>Staff Member *</Label>
              <Select value={generateUserId} onValueChange={setGenerateUserId}>
                <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent>
                  {(users ?? []).map((u: any) => (
                    <SelectItem key={u.id} value={u.id.toString()}>{u.name ?? u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Group *</Label>
              <Select value={generateGroupId} onValueChange={setGenerateGroupId}>
                <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
                <SelectContent>
                  {(groups ?? []).map((g: any) => (
                    <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!generateUserId || !generateGroupId) { toast.error("Select staff and group"); return; }
                generateMutation.mutate({ userId: parseInt(generateUserId), groupId: parseInt(generateGroupId) });
              }}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
              ) : (
                <><Zap className="w-4 h-4 mr-2" />Generate</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
