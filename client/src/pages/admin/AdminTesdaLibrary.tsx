import { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

type TesdaRef = {
  id: number;
  referenceType: "TR" | "CS" | "Supermarket";
  trCode: string | null;
  qualificationTitle: string;
  csUnitCode: string | null;
  csUnitTitle: string | null;
  competencyLevel: "NC I" | "NC II" | "NC III" | "NC IV" | "COC" | "Other" | null;
  descriptor: string | null;
  industry: string | null;
  sector: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const EMPTY_FORM = {
  id: undefined as number | undefined,
  referenceType: "TR" as "TR" | "CS" | "Supermarket",
  trCode: "",
  qualificationTitle: "",
  csUnitCode: "",
  csUnitTitle: "",
  competencyLevel: "NC II" as "NC I" | "NC II" | "NC III" | "NC IV" | "COC" | "Other",
  descriptor: "",
  industry: "",
  sector: "",
  isActive: true,
};

const TYPE_COLORS: Record<string, string> = {
  TR: "bg-blue-100 text-blue-800 border-blue-200",
  CS: "bg-purple-100 text-purple-800 border-purple-200",
  Supermarket: "bg-amber-100 text-amber-800 border-amber-200",
};

const LEVEL_COLORS: Record<string, string> = {
  "NC I": "bg-gray-100 text-gray-700",
  "NC II": "bg-green-100 text-green-700",
  "NC III": "bg-teal-100 text-teal-700",
  "NC IV": "bg-indigo-100 text-indigo-700",
  "COC": "bg-orange-100 text-orange-700",
  "Other": "bg-slate-100 text-slate-700",
};

export default function AdminTesdaLibrary() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "TR" | "CS" | "Supermarket">("all");
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [showInactive, setShowInactive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const { data: refs = [], refetch, isLoading } = trpc.tesda.list.useQuery({
    search: search || undefined,
    referenceType: filterType === "all" ? undefined : filterType,
    competencyLevel: filterLevel === "all" ? undefined : filterLevel,
    activeOnly: !showInactive,
  });

  const upsertMutation = trpc.tesda.upsert.useMutation({
    onSuccess: () => {
      toast.success(form.id ? "Reference updated" : "Reference added", { description: form.qualificationTitle });
      setDialogOpen(false);
      refetch();
    },
    onError: (e) => toast.error("Error", { description: e.message }),
  });

  const deleteMutation = trpc.tesda.delete.useMutation({
    onSuccess: () => { toast.success("Reference deleted"); setDeleteId(null); refetch(); },
    onError: (e) => toast.error("Error", { description: e.message }),
  });

  const toggleMutation = trpc.tesda.toggleActive.useMutation({
    onSuccess: () => refetch(),
    onError: (e) => toast.error("Error", { description: e.message }),
  });

  function openCreate() {
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  }

  function openEdit(ref: TesdaRef) {
    setForm({
      id: ref.id,
      referenceType: ref.referenceType,
      trCode: ref.trCode ?? "",
      qualificationTitle: ref.qualificationTitle,
      csUnitCode: ref.csUnitCode ?? "",
      csUnitTitle: ref.csUnitTitle ?? "",
      competencyLevel: ref.competencyLevel ?? "NC II",
      descriptor: ref.descriptor ?? "",
      industry: ref.industry ?? "",
      sector: ref.sector ?? "",
      isActive: ref.isActive,
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    upsertMutation.mutate({
      ...form,
      trCode: form.trCode || null,
      csUnitCode: form.csUnitCode || null,
      csUnitTitle: form.csUnitTitle || null,
      descriptor: form.descriptor || null,
      industry: form.industry || null,
      sector: form.sector || null,
    });
  }

  const grouped = refs.reduce((acc, ref) => {
    const key = ref.referenceType;
    if (!acc[key]) acc[key] = [];
    acc[key].push(ref);
    return acc;
  }, {} as Record<string, TesdaRef[]>);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            TESDA Reference Library
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage Training Regulations (TR), Competency Standards (CS), and Supermarket micro-credential units.
          </p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Add Reference
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search qualifications, TR codes, unit codes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
          <SelectTrigger className="w-40">
            <Filter className="w-3 h-3 mr-1" />
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="TR">TR</SelectItem>
            <SelectItem value="CS">CS</SelectItem>
            <SelectItem value="Supermarket">Supermarket</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterLevel} onValueChange={setFilterLevel}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="NC I">NC I</SelectItem>
            <SelectItem value="NC II">NC II</SelectItem>
            <SelectItem value="NC III">NC III</SelectItem>
            <SelectItem value="NC IV">NC IV</SelectItem>
            <SelectItem value="COC">COC</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch checked={showInactive} onCheckedChange={setShowInactive} id="show-inactive" />
          <label htmlFor="show-inactive">Show inactive</label>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>{refs.length} references found</span>
        {Object.entries(grouped).map(([type, items]) => (
          <span key={type}>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${TYPE_COLORS[type]}`}>{type}</span>
            {" "}{items.length}
          </span>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading references...</div>
      ) : refs.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-xl">
          <BookOpen className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium text-muted-foreground">No references found</p>
          <p className="text-sm text-muted-foreground mt-1">Add TESDA Training Regulations, Competency Standards, or Supermarket units.</p>
          <Button onClick={openCreate} variant="outline" className="mt-4">
            <Plus className="w-4 h-4 mr-2" /> Add First Reference
          </Button>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">TR Code / Qualification</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">CS Unit</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Level</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Industry</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {refs.map((ref) => (
                <>
                  <tr
                    key={ref.id}
                    className={`hover:bg-muted/30 transition-colors ${!ref.isActive ? "opacity-50" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${TYPE_COLORS[ref.referenceType]}`}>
                        {ref.referenceType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium leading-tight">{ref.qualificationTitle}</div>
                      {ref.trCode && <div className="text-xs text-muted-foreground mt-0.5">{ref.trCode}</div>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {ref.csUnitCode ? (
                        <div>
                          <div className="font-mono text-xs text-muted-foreground">{ref.csUnitCode}</div>
                          {ref.csUnitTitle && <div className="text-xs mt-0.5 max-w-[200px] truncate">{ref.csUnitTitle}</div>}
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {ref.competencyLevel ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${LEVEL_COLORS[ref.competencyLevel] ?? ""}`}>
                          {ref.competencyLevel}
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                      {ref.industry ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Switch
                        checked={ref.isActive}
                        onCheckedChange={(v) => toggleMutation.mutate({ id: ref.id, isActive: v })}
                        className="scale-75"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setExpandedId(expandedId === ref.id ? null : ref.id)}
                        >
                          {expandedId === ref.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(ref)}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(ref.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === ref.id && (
                    <tr key={`${ref.id}-expanded`} className="bg-muted/20">
                      <td colSpan={7} className="px-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {ref.descriptor && (
                            <div>
                              <span className="font-medium text-muted-foreground block mb-1">Descriptor</span>
                              <p className="text-foreground leading-relaxed">{ref.descriptor}</p>
                            </div>
                          )}
                          <div className="space-y-1">
                            {ref.sector && <div><span className="font-medium text-muted-foreground">Sector: </span>{ref.sector}</div>}
                            {ref.industry && <div><span className="font-medium text-muted-foreground">Industry: </span>{ref.industry}</div>}
                            <div className="text-xs text-muted-foreground pt-1">
                              Added {new Date(ref.createdAt).toLocaleDateString()} · Updated {new Date(ref.updatedAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Reference" : "Add TESDA Reference"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Reference Type *</Label>
                <Select value={form.referenceType} onValueChange={(v) => setForm(f => ({ ...f, referenceType: v as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TR">TR — Training Regulation</SelectItem>
                    <SelectItem value="CS">CS — Competency Standard</SelectItem>
                    <SelectItem value="Supermarket">Supermarket — Micro-credential</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Competency Level</Label>
                <Select value={form.competencyLevel} onValueChange={(v) => setForm(f => ({ ...f, competencyLevel: v as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["NC I", "NC II", "NC III", "NC IV", "COC", "Other"].map(l => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Qualification Title *</Label>
              <Input
                placeholder="e.g. Computer Systems Servicing NC II"
                value={form.qualificationTitle}
                onChange={(e) => setForm(f => ({ ...f, qualificationTitle: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>TR Code</Label>
                <Input
                  placeholder="e.g. CSS NC II"
                  value={form.trCode}
                  onChange={(e) => setForm(f => ({ ...f, trCode: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>CS Unit Code</Label>
                <Input
                  placeholder="e.g. CSS311201"
                  value={form.csUnitCode}
                  onChange={(e) => setForm(f => ({ ...f, csUnitCode: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>CS Unit Title</Label>
              <Input
                placeholder="e.g. Install and Configure Computer Systems"
                value={form.csUnitTitle}
                onChange={(e) => setForm(f => ({ ...f, csUnitTitle: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Industry</Label>
                <Input
                  placeholder="e.g. Information Technology"
                  value={form.industry}
                  onChange={(e) => setForm(f => ({ ...f, industry: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sector</Label>
                <Input
                  placeholder="e.g. Technical Education"
                  value={form.sector}
                  onChange={(e) => setForm(f => ({ ...f, sector: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Descriptor</Label>
              <Textarea
                placeholder="Brief description of the competency unit scope and coverage..."
                value={form.descriptor}
                onChange={(e) => setForm(f => ({ ...f, descriptor: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm(f => ({ ...f, isActive: v }))}
                id="form-active"
              />
              <label htmlFor="form-active" className="text-sm">Active (visible for competency mapping)</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.qualificationTitle.trim() || upsertMutation.isPending}
            >
              {upsertMutation.isPending ? "Saving..." : form.id ? "Update Reference" : "Add Reference"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Reference?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently remove the TESDA reference. Any existing task-competency mappings using this reference will be affected.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
