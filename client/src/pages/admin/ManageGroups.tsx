import { useState } from "react";
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
import { Plus, Pencil, Trash2, Tag, Users, Info, Home, LayoutDashboard, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

type Group = {
  id: number;
  name: string;
  code: string;
  description: string | null;
  sectorId: number | null;
  isActive: boolean;
  sortOrder: number | null;
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

  const utils = trpc.useUtils();
  const { data: groups, isLoading } = trpc.groups.list.useQuery({ activeOnly: false });
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

  const activeGroups = groups?.filter((g) => g.isActive) ?? [];
  const inactiveGroups = groups?.filter((g) => !g.isActive) ?? [];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <button onClick={() => navigate("/")} className="flex items-center gap-1 hover:text-foreground transition-colors">
          <Home className="w-3.5 h-3.5" /><span>Home</span>
        </button>
        <ChevronRight className="w-3.5 h-3.5" />
        <button onClick={() => navigate("/admin")} className="flex items-center gap-1 hover:text-foreground transition-colors">
          <LayoutDashboard className="w-3.5 h-3.5" /><span>Admin Dashboard</span>
        </button>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">Manage Groups</span>
      </nav>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Manage Groups</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create and manage group tags that can be assigned to surveys for cohort-level TNA analysis.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          New Group
        </Button>
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
