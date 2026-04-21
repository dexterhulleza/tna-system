import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Users, Search, Settings2, Loader2, Shield, UserPlus,
  CheckCircle, XCircle, UserCheck, UserX, Eye, EyeOff,
  Clock, RefreshCw, KeyRound, AlertTriangle, ShieldAlert
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

// ─── Role definitions ──────────────────────────────────────────────────────────

/** All roles that exist in the system */
const ALL_ROLES: { value: string; label: string; description: string }[] = [
  { value: "hr_officer",          label: "HR Officer",               description: "Manages TNA process within their company" },
  { value: "ld_officer",          label: "L&D Officer",              description: "Learning & Development specialist" },
  { value: "line_manager",        label: "Line Manager / Supervisor", description: "Direct supervisor of respondents" },
  { value: "employee",            label: "Employee Respondent",       description: "Completes TNA assessments" },
  { value: "executive_reviewer",  label: "Executive Reviewer",        description: "Reviews and approves TNA outputs" },
  { value: "admin",               label: "System Administrator",      description: "Full system access — assign with caution" },
];

/** Roles an HR Officer is allowed to assign (SYSTEM_ADMIN excluded) */
const HR_OFFICER_ASSIGNABLE = ["ld_officer", "line_manager", "employee", "executive_reviewer"];

/** Roles a System Administrator can assign (all roles) */
const SYSTEM_ADMIN_ASSIGNABLE = ALL_ROLES.map((r) => r.value);

/** Human-readable labels for display */
const TNA_ROLE_LABELS: Record<string, string> = Object.fromEntries(
  ALL_ROLES.map((r) => [r.value, r.label])
);
// Legacy label support
TNA_ROLE_LABELS["industry_worker"] = "Industry Worker";
TNA_ROLE_LABELS["trainer"] = "Trainer";
TNA_ROLE_LABELS["assessor"] = "Assessor";

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminUsers() {
  const { user: currentUser } = useAuth();

  // Determine caller's authority level
  const callerIsHrOfficer = currentUser?.tnaRole === "hr_officer";
  const callerIsSystemAdmin = currentUser?.tnaRole === "admin" || currentUser?.role === "admin";
  const assignableRoles = callerIsSystemAdmin ? SYSTEM_ADMIN_ASSIGNABLE : HR_OFFICER_ASSIGNABLE;

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [permForm, setPermForm] = useState<any>({});
  const [showAddUser, setShowAddUser] = useState(false);
  const [showResetPw, setShowResetPw] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);

  const [addForm, setAddForm] = useState({
    name: "", email: "", mobile: "", password: "",
    tnaRole: "employee" as string,
    role: "user" as "user" | "admin",
    organization: "", jobTitle: "", department: "", employeeId: "",
  });

  const { data: allUsers, isLoading, refetch } = trpc.customAuth.listUsers.useQuery({});
  const { data: pendingUsers, refetch: refetchPending } = trpc.customAuth.listUsers.useQuery({ pendingApproval: true });

  const { data: perms } = trpc.admin.users.getPermissions.useQuery(
    { userId: editingUser?.id },
    { enabled: !!editingUser }
  );

  const updateRole = trpc.admin.users.updateRole.useMutation({
    onSuccess: () => { toast.success("User updated"); refetch(); setEditingUser(null); },
    onError: (e) => toast.error(e.message),
  });
  const updatePerms = trpc.admin.users.updatePermissions.useMutation({
    onSuccess: () => { toast.success("Permissions updated"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const updateStatus = trpc.customAuth.updateUserStatus.useMutation({
    onSuccess: () => { toast.success("User status updated"); refetch(); refetchPending(); },
    onError: (e) => toast.error(e.message),
  });
  const adminCreateUser = trpc.customAuth.adminCreateUser.useMutation({
    onSuccess: () => { toast.success("User created successfully"); refetch(); setShowAddUser(false); resetAddForm(); },
    onError: (e) => toast.error(e.message),
  });
  const adminResetPassword = trpc.customAuth.adminResetPassword.useMutation({
    onSuccess: () => { toast.success("Password reset successfully"); setShowResetPw(null); setNewPassword(""); },
    onError: (e) => toast.error(e.message),
  });

  const resetAddForm = () => setAddForm({
    name: "", email: "", mobile: "", password: "",
    tnaRole: "employee", role: "user",
    organization: "", jobTitle: "", department: "", employeeId: "",
  });

  const filtered = (allUsers ?? []).filter((u: any) => {
    const matchSearch = !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.tnaRole === roleFilter;
    return matchSearch && matchRole;
  });

  const openEdit = (u: any) => {
    setEditingUser(u);
    setEditForm({
      role: u.role || "user",
      tnaRole: u.tnaRole || "employee",
      adminLevel: u.adminLevel || "",
      organization: u.organization || "",
      jobTitle: u.jobTitle || "",
    });
    setPermForm({
      canManageUsers: perms?.canManageUsers ?? false,
      canManageSectors: perms?.canManageSectors ?? false,
      canManageQuestions: perms?.canManageQuestions ?? false,
      canViewAllReports: perms?.canViewAllReports ?? false,
      canExportData: perms?.canExportData ?? false,
    });
  };

  const handleSave = () => {
    if (!editingUser) return;
    // Frontend guard: HR Officer cannot assign System Administrator
    if (callerIsHrOfficer && (editForm.tnaRole === "admin" || editForm.role === "admin")) {
      toast.error("Only System Administrators can assign the System Administrator role.");
      return;
    }
    updateRole.mutate({
      userId: editingUser.id,
      role: editForm.role,
      tnaRole: editForm.tnaRole,
      adminLevel: editForm.adminLevel || undefined,
      organization: editForm.organization,
      jobTitle: editForm.jobTitle,
    });
    if (editForm.role === "admin") {
      updatePerms.mutate({ userId: editingUser.id, ...permForm });
    }
  };

  // Check if the user being edited currently has System Admin role
  const editingUserIsSystemAdmin = editingUser?.tnaRole === "admin" || editingUser?.role === "admin";
  const hrOfficerEditingAdmin = callerIsHrOfficer && editingUserIsSystemAdmin;

  const UserCard = ({ u }: { u: any }) => (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
        <span className="text-blue-700 font-semibold text-sm">
          {u.name?.charAt(0)?.toUpperCase() ?? "?"}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">{u.name ?? "—"}</span>
          <Badge
            variant={u.tnaRole === "admin" ? "default" : "secondary"}
            className={`text-xs shrink-0 ${u.tnaRole === "admin" ? "bg-purple-600" : ""}`}
          >
            {u.tnaRole === "admin" ? <ShieldAlert className="w-3 h-3 mr-1" /> : u.role === "admin" ? <Shield className="w-3 h-3 mr-1" /> : null}
            {TNA_ROLE_LABELS[u.tnaRole] ?? u.tnaRole ?? "Unknown"}
          </Badge>
          {!u.isActive && (
            <Badge variant="destructive" className="text-xs shrink-0">Inactive</Badge>
          )}
          {u.pendingApproval && (
            <Badge variant="outline" className="text-xs border-amber-400 text-amber-600 shrink-0">
              <Clock className="w-3 h-3 mr-1" /> Pending
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground truncate">{u.email}</div>
        {u.organization && <div className="text-xs text-muted-foreground truncate">{u.organization}</div>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          size="sm" variant="ghost"
          title={u.isActive ? "Deactivate" : "Activate"}
          onClick={() => updateStatus.mutate({ userId: u.id, isActive: !u.isActive })}
          className={u.isActive ? "text-green-600 hover:text-red-600" : "text-red-500 hover:text-green-600"}
        >
          {u.isActive ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
        </Button>
        <Button size="sm" variant="ghost" title="Reset Password" onClick={() => setShowResetPw(u)}>
          <KeyRound className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="ghost" title="Edit" onClick={() => openEdit(u)}>
          <Settings2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground text-sm">Manage users, roles, and access control</p>
        </div>
        <Button onClick={() => setShowAddUser(true)} className="bg-blue-600 hover:bg-blue-700">
          <UserPlus className="w-4 h-4 mr-2" /> Add User
        </Button>
      </div>

      {/* Role governance notice for HR Officers */}
      {callerIsHrOfficer && (
        <Alert className="border-amber-300 bg-amber-50">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-amber-800 text-sm">
            <strong>Role Governance:</strong> As an HR Officer, you can assign L&D Officer, Line Manager / Supervisor, Employee Respondent, and Executive Reviewer roles within your company. Only System Administrators can assign the System Administrator role.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">
            All Users
            {allUsers && <Badge variant="secondary" className="ml-2 text-xs">{allUsers.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending Approval
            {pendingUsers && pendingUsers.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">{pendingUsers.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-52">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="industry_worker">Industry Worker</SelectItem>
                    <SelectItem value="trainer">Trainer</SelectItem>
                    <SelectItem value="assessor">Assessor</SelectItem>
                    <SelectItem value="hr_officer">HR Officer</SelectItem>
                    <SelectItem value="ld_officer">L&D Officer</SelectItem>
                    <SelectItem value="line_manager">Line Manager / Supervisor</SelectItem>
                    <SelectItem value="employee">Employee Respondent</SelectItem>
                    <SelectItem value="executive_reviewer">Executive Reviewer</SelectItem>
                    {callerIsSystemAdmin && <SelectItem value="admin">System Administrator</SelectItem>}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" onClick={() => refetch()} title="Refresh">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map((u: any) => <UserCard key={u.id} u={u} />)}
                  {filtered.length === 0 && (
                    <div className="py-12 text-center text-muted-foreground text-sm">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No users found
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">HR Officer Approval Queue</CardTitle>
              <CardDescription>Review and approve or reject HR Officer account requests</CardDescription>
            </CardHeader>
            <CardContent>
              {!pendingUsers || pendingUsers.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-40 text-green-500" />
                  No pending approvals
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingUsers.map((u: any) => (
                    <div key={u.id} className="p-4 rounded-lg border bg-amber-50 border-amber-200">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm">{u.name}</span>
                            <Badge variant="outline" className="text-xs border-amber-400 text-amber-700">HR Officer Request</Badge>
                          </div>
                          <div className="text-xs text-gray-600 mb-1">{u.email}</div>
                          {u.organization && <div className="text-xs text-gray-600"><span className="font-medium">Org:</span> {u.organization}</div>}
                          {u.jobTitle && <div className="text-xs text-gray-600"><span className="font-medium">Position:</span> {u.jobTitle}</div>}
                          {u.hrJustification && (
                            <div className="text-xs text-gray-600 mt-2 p-2 bg-white rounded border border-amber-100">
                              <span className="font-medium">Justification:</span> {u.hrJustification}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => updateStatus.mutate({ userId: u.id, isActive: true, pendingApproval: false })}
                            disabled={updateStatus.isPending}>
                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50"
                            onClick={() => updateStatus.mutate({ userId: u.id, isActive: false, pendingApproval: false })}
                            disabled={updateStatus.isPending}>
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(o) => !o && setEditingUser(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User: {editingUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">

            {/* Warning: HR Officer trying to edit a System Admin */}
            {hrOfficerEditingAdmin && (
              <Alert className="border-red-300 bg-red-50">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-800 text-sm">
                  This user has the <strong>System Administrator</strong> role. You cannot modify their role assignment. Only a System Administrator can change this.
                </AlertDescription>
              </Alert>
            )}

            {/* Role Assignment — Checkbox-based per spec */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Assign Role</Label>
              <p className="text-xs text-muted-foreground">
                {callerIsHrOfficer
                  ? "As an HR Officer, you can assign the following roles within your company."
                  : "As a System Administrator, you can assign any role."}
              </p>
              <div className="space-y-2 pt-1">
                {ALL_ROLES.filter((r) => assignableRoles.includes(r.value)).map((r) => (
                  <div key={r.value} className="flex items-start gap-3 p-2.5 rounded-md border hover:bg-accent/20">
                    <Checkbox
                      id={`role-${r.value}`}
                      checked={editForm.tnaRole === r.value}
                      disabled={hrOfficerEditingAdmin}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setEditForm({
                            ...editForm,
                            tnaRole: r.value,
                            role: r.value === "admin" ? "admin" : "user",
                          });
                        }
                      }}
                    />
                    <label htmlFor={`role-${r.value}`} className={`flex-1 cursor-pointer ${hrOfficerEditingAdmin ? "opacity-50" : ""}`}>
                      <div className="text-sm font-medium flex items-center gap-1.5">
                        {r.value === "admin" && <ShieldAlert className="w-3.5 h-3.5 text-purple-600" />}
                        {r.label}
                      </div>
                      <div className="text-xs text-muted-foreground">{r.description}</div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Admin Level — only shown for System Admin callers assigning admin role */}
            {callerIsSystemAdmin && editForm.tnaRole === "admin" && (
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

            {/* Permissions — only for System Admin callers editing admin users */}
            {callerIsSystemAdmin && editForm.tnaRole === "admin" && (
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
                    <Checkbox id={key} checked={permForm[key] || false} onCheckedChange={(c) => setPermForm({ ...permForm, [key]: !!c })} />
                    <label htmlFor={key} className="text-sm cursor-pointer">{label}</label>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={updateRole.isPending || hrOfficerEditingAdmin}
              title={hrOfficerEditingAdmin ? "Cannot modify System Administrator role" : undefined}
            >
              {updateRole.isPending ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : null}Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={showAddUser} onOpenChange={(o) => { if (!o) { setShowAddUser(false); resetAddForm(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add New User</DialogTitle></DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              // Frontend guard
              if (callerIsHrOfficer && (addForm.tnaRole === "admin" || addForm.role === "admin")) {
                toast.error("Only System Administrators can assign the System Administrator role.");
                return;
              }
              adminCreateUser.mutate({
                name: addForm.name,
                email: addForm.email,
                mobile: addForm.mobile || undefined,
                password: addForm.password || undefined,
                tnaRole: addForm.tnaRole as any,
                role: addForm.role,
                organization: addForm.organization || undefined,
                jobTitle: addForm.jobTitle || undefined,
                department: addForm.department || undefined,
                employeeId: addForm.employeeId || undefined,
              });
            }}
            className="space-y-4 py-2"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Full Name <span className="text-red-500">*</span></Label>
                <Input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder="Juan dela Cruz" required />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Email <span className="text-red-500">*</span></Label>
                <Input type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} placeholder="user@example.com" required />
              </div>

              {/* Role assignment — checkbox-based per spec */}
              <div className="space-y-2 col-span-2">
                <Label className="text-sm font-semibold">Assign Role <span className="text-red-500">*</span></Label>
                <div className="space-y-1.5">
                  {ALL_ROLES.filter((r) => assignableRoles.includes(r.value)).map((r) => (
                    <div key={r.value} className="flex items-center gap-2.5 p-2 rounded border hover:bg-accent/20">
                      <Checkbox
                        id={`add-role-${r.value}`}
                        checked={addForm.tnaRole === r.value}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setAddForm({
                              ...addForm,
                              tnaRole: r.value,
                              role: r.value === "admin" ? "admin" : "user",
                            });
                          }
                        }}
                      />
                      <label htmlFor={`add-role-${r.value}`} className="text-sm cursor-pointer flex items-center gap-1.5">
                        {r.value === "admin" && <ShieldAlert className="w-3.5 h-3.5 text-purple-600" />}
                        <span className="font-medium">{r.label}</span>
                        <span className="text-xs text-muted-foreground">— {r.description}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Department</Label>
                <Input value={addForm.department} onChange={(e) => setAddForm({ ...addForm, department: e.target.value })} placeholder="e.g. IT" />
              </div>
              <div className="space-y-1.5">
                <Label>Employee ID</Label>
                <Input value={addForm.employeeId} onChange={(e) => setAddForm({ ...addForm, employeeId: e.target.value })} placeholder="EMP-001" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Organization</Label>
                <Input value={addForm.organization} onChange={(e) => setAddForm({ ...addForm, organization: e.target.value })} placeholder="Company/Institution" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Job Title</Label>
                <Input value={addForm.jobTitle} onChange={(e) => setAddForm({ ...addForm, jobTitle: e.target.value })} placeholder="e.g. Training Coordinator" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Initial Password</Label>
                <div className="relative">
                  <Input type={showNewPw ? "text" : "password"} value={addForm.password} onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} placeholder="Min. 8 characters" className="pr-10" />
                  <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowAddUser(false); resetAddForm(); }}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={adminCreateUser.isPending}>
                {adminCreateUser.isPending ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <UserPlus className="mr-2 w-4 h-4" />}Create User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!showResetPw} onOpenChange={(o) => { if (!o) { setShowResetPw(null); setNewPassword(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Reset Password</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Set a new password for <strong>{showResetPw?.name}</strong></p>
            <div className="space-y-1.5">
              <Label>New Password</Label>
              <div className="relative">
                <Input type={showNewPw ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 8 characters" className="pr-10" />
                <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowResetPw(null); setNewPassword(""); }}>Cancel</Button>
            <Button onClick={() => adminResetPassword.mutate({ userId: showResetPw.id, newPassword })} disabled={adminResetPassword.isPending || newPassword.length < 8} className="bg-blue-600 hover:bg-blue-700">
              {adminResetPassword.isPending ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <KeyRound className="mr-2 w-4 h-4" />}Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
