import { useState, useRef } from "react";
import QRCode from "qrcode";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Tag, Users, Info, Home, LayoutDashboard, ChevronRight, Link2, Check, QrCode, Download, Search, Filter, BarChart2, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useLocation } from "wouter";

type Group = {
  id: number;
  name: string;
  code: string;
  description: string | null;
  sectorId: number | null;
  isActive: boolean;
  sortOrder: number | null;
  expectedCount: number | null;
  createdAt: Date;
};

type FormState = {
  id?: number;
  name: string;
  code: string;
  description: string;
  sectorId: string;
  isActive: boolean;
  sortOrder: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  code: "",
  description: "",
  sectorId: "",
  isActive: true,
  sortOrder: "0",
};

export default function ManageGroups() {
  const [, navigate] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [copiedGroupId, setCopiedGroupId] = useState<number | null>(null);
  const [staffCountGroupId, setStaffCountGroupId] = useState<number | null>(null);
  const [staffCountInput, setStaffCountInput] = useState<string>("");
  const [qrGroupId, setQrGroupId] = useState<number | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const openQrDialog = async (groupId: number, groupName: string) => {
    const url = `${window.location.origin}/survey/start?group=${groupId}`;
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 400,
        margin: 2,
        color: { dark: "#1e293b", light: "#ffffff" },
        errorCorrectionLevel: "H",
      });
      setQrDataUrl(dataUrl);
      setQrGroupId(groupId);
    } catch {
      toast.error("Failed to generate QR code");
    }
  };

  const downloadQr = (groupName: string, groupCode: string) => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `TNA-Survey-QR-${groupCode}.png`;
    link.click();
    toast.success(`QR code downloaded for ${groupName}`);
  };

  const copyGroupLink = (groupId: number) => {
    const url = `${window.location.origin}/survey/start?group=${groupId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedGroupId(groupId);
      toast.success("Survey link copied to clipboard!");
      setTimeout(() => setCopiedGroupId(null), 2000);
    }).catch(() => toast.error("Failed to copy link"));
  };

  const utils = trpc.useUtils();
  const { data: groups, isLoading } = trpc.groups.list.useQuery({ activeOnly: false });

  const setExpectedCount = trpc.groups.upsert.useMutation({
    onSuccess: () => {
      toast.success("Expected participant count updated.");
      utils.groups.list.invalidate();
      setStaffCountGroupId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const openStaffCountDialog = (group: Group) => {
    setStaffCountInput(String(group.expectedCount ?? 0));
    setStaffCountGroupId(group.id);
  };

  const handleSetStaffCount = () => {
    if (!staffCountGroupId) return;
    const group = groups?.find(g => g.id === staffCountGroupId);
    if (!group) return;
    const count = parseInt(staffCountInput) || 0;
    setExpectedCount.mutate({
      id: group.id,
      name: group.name,
      code: group.code,
      description: group.description ?? undefined,
      sectorId: group.sectorId,
      isActive: group.isActive,
      sortOrder: group.sortOrder ?? 0,
      expectedCount: count,
    });
  };
  const { data: sectors } = trpc.sectors.list.useQuery({ activeOnly: true });

  const upsert = trpc.groups.upsert.useMutation({
    onSuccess: () => {
      toast.success(form.id ? "Group updated." : "Group created.");
      utils.groups.list.invalidate();
      setDialogOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteGroup = trpc.groups.delete.useMutation({
    onSuccess: () => {
      toast.success("Group deactivated.");
      utils.groups.list.invalidate();
      setDeleteId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (g: Group) => {
    setForm({
      id: g.id,
      name: g.name,
      code: g.code,
      description: g.description ?? "",
      sectorId: g.sectorId ? String(g.sectorId) : "",
      isActive: g.isActive,
      sortOrder: String(g.sortOrder ?? 0),
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast.error("Name and Code are required.");
      return;
    }
    upsert.mutate({
      id: form.id,
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      description: form.description.trim() || undefined,
      sectorId: form.sectorId ? parseInt(form.sectorId) : null,
      isActive: form.isActive,
      sortOrder: parseInt(form.sortOrder) || 0,
    });
  };

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const allGroups = groups ?? [];
  const filteredGroups = allGroups.filter((g) => {
    const matchesSearch = !search || g.name.toLowerCase().includes(search.toLowerCase()) || g.code.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? g.isActive : !g.isActive);
    return matchesSearch && matchesStatus;
  });
  const activeGroups = filteredGroups.filter((g) => g.isActive);
  const inactiveGroups = filteredGroups.filter((g) => !g.isActive);
  const totalActive = allGroups.filter(g => g.isActive).length;
  const totalInactive = allGroups.filter(g => !g.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Survey Groups</h1>
          <p className="text-slate-500 text-sm mt-1">Manage cohort groups for TNA surveys. Share links or QR codes with staff.</p>
        </div>
        <Button onClick={openCreate} className="gap-2 self-start flex-shrink-0">
          <Plus className="w-4 h-4" />
          New Group
        </Button>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Groups", value: allGroups.length, icon: Tag, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Active", value: totalActive, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Inactive", value: totalInactive, icon: XCircle, color: "text-slate-500", bg: "bg-slate-100" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${s.bg}`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by group name or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "active", "inactive"] as const).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                statusFilter === f
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Info Banner */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4 pb-3">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">How Group Tags Work</p>
              <p>
                Group tags allow you to cluster survey respondents into cohorts (e.g., by batch, department, or training program).
                When respondents take the survey, they can select their group. Administrators can then view an AI-generated
                group analysis under <strong>View All Reports → Group Analysis</strong>, comparing training gaps across the entire cohort.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Groups */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : activeGroups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Tag className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold text-foreground">No groups yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create your first group tag to start organizing survey respondents into cohorts.
            </p>
            <Button className="mt-4 gap-2" onClick={openCreate}>
              <Plus className="w-4 h-4" />
              Create First Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div>
          <h2 className="font-semibold text-foreground mb-3">Active Groups ({activeGroups.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeGroups.map((group) => {
              const sector = sectors?.find((s) => s.id === group.sectorId);
              return (
                <Card key={group.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Tag className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="font-display text-base">{group.name}</CardTitle>
                          <Badge variant="outline" className="text-xs mt-0.5">{group.code}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(group as Group)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(group.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {group.description && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{group.description}</p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      {sector && (
                        <Badge variant="secondary" className="text-xs">
                          {sector.name}
                        </Badge>
                      )}
                      {!group.sectorId && (
                        <Badge variant="secondary" className="text-xs">All Sectors</Badge>
                      )}
                    </div>
                    {/* Expected Count + Progress */}
                    <div className="mt-3 pt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">
                          {(group as Group).expectedCount && (group as Group).expectedCount! > 0
                            ? `0 / ${(group as Group).expectedCount} responded`
                            : "No expected count set"}
                        </span>
                        <button
                          onClick={() => openStaffCountDialog(group as Group)}
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          <Users className="w-3 h-3" />
                          {(group as Group).expectedCount ? "Edit" : "Set count"}
                        </button>
                      </div>
                      {(group as Group).expectedCount && (group as Group).expectedCount! > 0 && (
                        <Progress value={0} className="h-1.5" />
                      )}
                    </div>
                    {/* Survey Share Link + QR */}
                    <div className="mt-2 pt-2 border-t border-border space-y-1">
                      <button
                        onClick={() => copyGroupLink(group.id)}
                        className="w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors py-1 rounded"
                      >
                        {copiedGroupId === group.id
                          ? <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                          : <Link2 className="w-3.5 h-3.5 flex-shrink-0" />}
                        <span className={copiedGroupId === group.id ? "text-green-600 font-medium" : ""}>
                          {copiedGroupId === group.id ? "Link copied!" : "Copy survey link"}
                        </span>
                        <span className="ml-auto text-[10px] font-mono text-muted-foreground/60 truncate max-w-[100px] hidden sm:block">
                          ?group={group.id}
                        </span>
                      </button>
                      <button
                        onClick={() => openQrDialog(group.id, group.name)}
                        className="w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors py-1 rounded"
                      >
                        <QrCode className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Download QR code</span>
                      </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Inactive Groups */}
      {inactiveGroups.length > 0 && (
        <div>
          <h2 className="font-semibold text-muted-foreground mb-3 text-sm">Inactive Groups ({inactiveGroups.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {inactiveGroups.map((group) => (
              <Card key={group.id} className="opacity-60">
                <CardContent className="py-3 px-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{group.name}</span>
                    <Badge variant="outline" className="text-xs">{group.code}</Badge>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openEdit(group as Group)}>
                    Restore
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{form.id ? "Edit Group" : "Create New Group"}</DialogTitle>
            <DialogDescription>
              {form.id
                ? "Update the group tag details."
                : "Create a new group tag to organize survey respondents into cohorts."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label htmlFor="gName">Group Name *</Label>
                <Input
                  id="gName"
                  placeholder="e.g., Batch 2025-A"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="gCode">Code *</Label>
                <Input
                  id="gCode"
                  placeholder="e.g., B2025A"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  className="mt-1 uppercase"
                />
              </div>
              <div>
                <Label htmlFor="gSort">Sort Order</Label>
                <Input
                  id="gSort"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="gDesc">Description</Label>
              <Textarea
                id="gDesc"
                placeholder="Brief description of this group (optional)"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="mt-1 resize-none"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="gSector">Sector Scope (optional)</Label>
              <Select
                value={form.sectorId || "all"}
                onValueChange={(v) => setForm((f) => ({ ...f, sectorId: v === "all" ? "" : v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All sectors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sectors</SelectItem>
                  {sectors?.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Restrict this group to a specific sector, or leave as "All Sectors".
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="gActive"
                checked={form.isActive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
              />
              <Label htmlFor="gActive">Active (visible to survey respondents)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={upsert.isPending}>
              {upsert.isPending ? "Saving..." : form.id ? "Save Changes" : "Create Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={qrGroupId !== null} onOpenChange={(open) => { if (!open) { setQrGroupId(null); setQrDataUrl(null); } }}>
        <DialogContent className="max-w-sm">
          {(() => {
            const group = groups?.find((g) => g.id === qrGroupId);
            if (!group) return null;
            const surveyUrl = `${window.location.origin}/survey/start?group=${group.id}`;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="font-display flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-primary" />
                    QR Code — {group.name}
                  </DialogTitle>
                  <DialogDescription>
                    Staff can scan this QR code to open the survey directly for this group.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4 py-2">
                  {qrDataUrl && (
                    <div className="p-3 bg-white rounded-xl border border-border shadow-sm">
                      <img src={qrDataUrl} alt={`QR code for ${group.name}`} className="w-48 h-48" />
                    </div>
                  )}
                  <div className="w-full">
                    <p className="text-xs text-muted-foreground text-center mb-1">Survey URL</p>
                    <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                      <span className="text-xs font-mono text-foreground truncate flex-1">{surveyUrl}</span>
                      <button
                        onClick={() => copyGroupLink(group.id)}
                        className="text-muted-foreground hover:text-primary flex-shrink-0"
                      >
                        {copiedGroupId === group.id ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Link2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => { setQrGroupId(null); setQrDataUrl(null); }}>Close</Button>
                  <Button onClick={() => downloadQr(group.name, group.code)} className="gap-2">
                    <Download className="w-4 h-4" />
                    Download PNG
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Set Expected Staff Count Dialog */}
      <Dialog open={staffCountGroupId !== null} onOpenChange={(open) => { if (!open) setStaffCountGroupId(null); }}>
        <DialogContent className="max-w-sm">
          {(() => {
            const group = groups?.find(g => g.id === staffCountGroupId);
            if (!group) return null;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="font-display flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Set Expected Participants
                  </DialogTitle>
                  <DialogDescription>
                    How many staff members are expected to complete the survey for <strong>{group.name}</strong>? This is used to calculate the response rate progress bar.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-2">
                  <Label htmlFor="staffCount">Expected Participant Count</Label>
                  <Input
                    id="staffCount"
                    type="number"
                    min="0"
                    placeholder="e.g., 30"
                    value={staffCountInput}
                    onChange={(e) => setStaffCountInput(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Enter 0 to clear the expected count.</p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setStaffCountGroupId(null)}>Cancel</Button>
                  <Button onClick={handleSetStaffCount} disabled={setExpectedCount.isPending}>
                    {setExpectedCount.isPending ? "Saving..." : "Save"}
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Group?</AlertDialogTitle>
            <AlertDialogDescription>
              This will hide the group from new surveys. Existing surveys tagged with this group will retain their tag.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteGroup.mutate({ id: deleteId })}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
