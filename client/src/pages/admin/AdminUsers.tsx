import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Users, Search, Settings2, Loader2, Shield, User, Home, LayoutDashboard, ChevronRight } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

const TNA_ROLE_LABELS: Record<string, string> = {
  industry_worker: "Industry Worker",
  trainer: "Trainer",
  assessor: "Assessor",
  hr_officer: "HR Officer",
  admin: "Administrator",
};

const ADMIN_LEVEL_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  sector_manager: "Sector Manager",
  question_manager: "Question Manager",
};

export default function AdminUsers() {
  const [, navigate] = useLocation();
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [permForm, setPermForm] = useState<any>({});

  const { data: users, isLoading, refetch } = trpc.admin.users.list.useQuery();
  const updateRole = trpc.admin.users.updateRole.useMutation({
    onSuccess: () => { toast.success("User updated successfully"); refetch(); setEditingUser(null); },
    onError: (e) => toast.error(e.message),
  });
  const updatePerms = trpc.admin.users.updatePermissions.useMutation({
    onSuccess: () => { toast.success("Permissions updated"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const { data: perms } = trpc.admin.users.getPermissions.useQuery(
    { userId: editingUser?.id },
    { enabled: !!editingUser }
  );

  const filtered = users?.filter((u: any) =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const openEdit = (u: any) => {
    setEditingUser(u);
    setEditForm({
      role: u.role || "user",
      tnaRole: u.tnaRole || "industry_worker",
      adminLevel: u.adminLevel || "",
      organization: u.organization || "",
      jobTitle: u.jobTitle || "",
    });
    setPermForm({
      canManageUsers: false,
      canManageSectors: false,
      canManageQuestions: false,
      canViewAllReports: false,
      canExportData: false,
    });
  };

  const handleSave = () => {
    if (!editingUser) return;
    updateRole.mutate({
      userId: editingUser.id,
      role: editForm.role,
      tnaRole: editForm.tnaRole,
      adminLevel: editForm.adminLevel || undefined,
      organization: editForm.organization || undefined,
      jobTitle: editForm.jobTitle || undefined,
    });
    if (editForm.role === "admin") {
      updatePerms.mutate({ userId: editingUser.id, ...permForm });
    }
  };

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <button onClick={() => navigate("/")} className="flex items-center gap-1 hover:text-foreground transition-colors">
          <Home className="w-3.5 h-3.5" /><span>Home</span>
        </button>
        <ChevronRight className="w-3.5 h-3.5" />
        <button onClick={() => navigate("/admin")} className="flex items-center gap-1 hover:text-foreground transition-colors">
          <LayoutDashboard className="w-3.5 h-3.5" /><span>Admin Dashboard</span>
        </button>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">Manage Users</span>
      </nav>
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Manage Users</h1>
        <p className="text-muted-foreground text-sm mt-1">View and manage user accounts, roles, and permissions</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="secondary">{filtered.length} users</Badge>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filtered.map((u: any) => (
                <div key={u.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                      {u.role === "admin" ? (
                        <Shield className="w-4 h-4 text-primary" />
                      ) : (
                        <User className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{u.name || "Unnamed User"}</p>
                      <p className="text-xs text-muted-foreground">{u.email || "No email"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs hidden sm:flex">
                      {TNA_ROLE_LABELS[u.tnaRole] || u.tnaRole || "Not set"}
                    </Badge>
                    {u.role === "admin" && (
                      <Badge className="text-xs bg-primary/10 text-primary border-primary/20 hidden sm:flex">
                        {ADMIN_LEVEL_LABELS[u.adminLevel] || "Admin"}
                      </Badge>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => openEdit(u)}>
                      <Settings2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No users found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(o) => !o && setEditingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Edit User: {editingUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>System Role</Label>
              <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>TNA Role</Label>
              <Select value={editForm.tnaRole} onValueChange={(v) => setEditForm({ ...editForm, tnaRole: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="industry_worker">Industry Worker</SelectItem>
                  <SelectItem value="trainer">Trainer</SelectItem>
                  <SelectItem value="assessor">Assessor</SelectItem>
                  <SelectItem value="hr_officer">HR Officer</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editForm.role === "admin" && (
              <div className="space-y-1.5">
                <Label>Admin Level</Label>
                <Select value={editForm.adminLevel} onValueChange={(v) => setEditForm({ ...editForm, adminLevel: v })}>
                  <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="sector_manager">Sector Manager</SelectItem>
                    <SelectItem value="question_manager">Question Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Organization</Label>
              <Input value={editForm.organization} onChange={(e) => setEditForm({ ...editForm, organization: e.target.value })} placeholder="Company/Institution" />
            </div>
            <div className="space-y-1.5">
              <Label>Job Title</Label>
              <Input value={editForm.jobTitle} onChange={(e) => setEditForm({ ...editForm, jobTitle: e.target.value })} placeholder="Job title" />
            </div>
            {editForm.role === "admin" && (
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Permissions</Label>
                {[
                  { key: "canManageUsers", label: "Manage Users" },
                  { key: "canManageSectors", label: "Manage Sectors" },
                  { key: "canManageQuestions", label: "Manage Questions" },
                  { key: "canViewAllReports", label: "View All Reports" },
                  { key: "canExportData", label: "Export Data" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <Checkbox
                      id={key}
                      checked={permForm[key] || false}
                      onCheckedChange={(c) => setPermForm({ ...permForm, [key]: !!c })}
                    />
                    <label htmlFor={key} className="text-sm cursor-pointer">{label}</label>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={updateRole.isPending}>
              {updateRole.isPending ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
