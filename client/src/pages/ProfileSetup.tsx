/**
 * Staff Profile Page — Update your personal details, role, work function, and password.
 * ONE OBJECTIVE: keep your profile accurate so your TNA results are meaningful.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import StaffLayout from "@/components/StaffLayout";
import PsocWorkFunctionPicker, { type WorkFunctionValue } from "@/components/PsocWorkFunctionPicker";
import { findPsocFunction, findPsocGroup } from "@/lib/psocData";
import {
  Briefcase, GraduationCap, ClipboardCheck, UserCog,
  User, Mail, Phone, Building, Lock, Eye, EyeOff, CheckCircle2, Loader2,
  MapPin, AlertCircle,
} from "lucide-react";

const ROLES = [
  { value: "industry_worker", label: "Industry Worker / Employee", icon: Briefcase },
  { value: "employee",        label: "Employee Respondent",        icon: User },
  { value: "trainer",         label: "Trainer",                   icon: GraduationCap },
  { value: "assessor",        label: "Assessor",                  icon: ClipboardCheck },
  { value: "hr_officer",      label: "HR Officer",                icon: UserCog },
] as const;

/** Roles that require the PSOC work function field */
const EMPLOYEE_ROLES = new Set(["industry_worker", "employee"]);

export default function ProfileSetup() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  const [name, setName]               = useState("");
  const [organization, setOrganization] = useState("");
  const [jobTitle, setJobTitle]       = useState("");
  const [phone, setPhone]             = useState("");
  const [department, setDepartment]   = useState("");
  const [selectedRole, setSelectedRole] = useState("industry_worker");

  // PSOC work function
  const [workFunction, setWorkFunction] = useState<WorkFunctionValue | null>(null);
  const [workFunctionError, setWorkFunctionError] = useState("");

  const [profileSaved, setProfileSaved] = useState(false);

  const [currentPw, setCurrentPw]     = useState("");
  const [newPw, setNewPw]             = useState("");
  const [confirmPw, setConfirmPw]     = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [pwSaved, setPwSaved]         = useState(false);

  // Populate from user once loaded
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setOrganization(user.organization || "");
      setJobTitle(user.jobTitle || "");
      setPhone((user as any).phone || "");
      setDepartment((user as any).department || "");
      setSelectedRole(user.tnaRole && user.tnaRole !== "admin" ? user.tnaRole : "industry_worker");

      // Restore saved work function
      const u = user as any;
      if (u.workFunctionTitle) {
        const fn = findPsocFunction(u.workFunctionTitle);
        const grp = findPsocGroup(u.workFunctionCategory || "");
        if (fn && grp) {
          setWorkFunction({
            category: u.workFunctionCategory,
            title: u.workFunctionTitle,
            psocCode: u.workFunctionPsocCode || fn.code,
            otherText: u.workFunctionOtherText || "",
            displayLabel: fn.title,
          });
        } else if (u.workFunctionCategory === "OTHERS") {
          setWorkFunction({
            category: "OTHERS",
            title: "OTHERS_SPECIFY",
            psocCode: "10.01",
            otherText: u.workFunctionOtherText || "",
            displayLabel: "Others (specify)",
          });
        }
      }
    }
  }, [user]);

  const isEmployeeRole = EMPLOYEE_ROLES.has(selectedRole);

  const updateProfile = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated!");
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    },
    onError: (err) => toast.error(err.message || "Failed to save profile"),
  });

  const changePassword = trpc.customAuth.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Password changed successfully!");
      setPwSaved(true);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setTimeout(() => setPwSaved(false), 3000);
    },
    onError: (err) => toast.error(err.message || "Failed to change password"),
  });

  const handleSaveProfile = () => {
    if (!name.trim()) { toast.error("Name is required"); return; }

    // Validate work function for employee roles
    if (isEmployeeRole) {
      if (!workFunction) {
        setWorkFunctionError("Primary Work Function is required for Employee Respondent.");
        toast.error("Please select your Primary Work Function.");
        return;
      }
      if (workFunction.title === "OTHERS_SPECIFY" && !workFunction.otherText?.trim()) {
        setWorkFunctionError("Please describe your work function.");
        toast.error("Please describe your work function.");
        return;
      }
    }
    setWorkFunctionError("");

    updateProfile.mutate({
      tnaRole: selectedRole as any,
      organization,
      jobTitle,
      department,
      workFunctionCategory: isEmployeeRole && workFunction ? workFunction.category : null,
      workFunctionTitle:    isEmployeeRole && workFunction ? workFunction.title    : null,
      workFunctionPsocCode: isEmployeeRole && workFunction ? workFunction.psocCode : null,
      workFunctionOtherText: isEmployeeRole && workFunction?.title === "OTHERS_SPECIFY"
        ? workFunction.otherText ?? null
        : null,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <StaffLayout>
      <div className="max-w-xl space-y-6">

        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
          <p className="text-sm text-slate-500 mt-1">Keep your details accurate for better TNA results.</p>
        </div>

        {/* ── Personal Information ── */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Personal Information
            </h2>
          </div>
          <div className="px-5 py-5 space-y-4">
            <div>
              <Label htmlFor="name" className="text-sm font-medium text-slate-700">Full Name</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="name"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-slate-700">Email Address</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={user?.email || ""}
                  disabled
                  className="pl-9 bg-slate-50 text-slate-500 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">Email cannot be changed.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="phone" className="text-sm font-medium text-slate-700">Mobile Number</Label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="phone"
                    placeholder="+63 9XX XXX XXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="department" className="text-sm font-medium text-slate-700">Department</Label>
                <div className="relative mt-1">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="department"
                    placeholder="e.g., IT, HR"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="org" className="text-sm font-medium text-slate-700">Organization</Label>
                <Input
                  id="org"
                  placeholder="Company / Agency"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="title" className="text-sm font-medium text-slate-700">Position / Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Trainer"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Work Information (PSOC) — only for employee roles ── */}
        {isEmployeeRole && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Work Information
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Required for Employee Respondents to enable accurate competency mapping.
              </p>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div>
                <Label className="text-sm font-medium text-slate-700">
                  Primary Work Function
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <div className="mt-1">
                  <PsocWorkFunctionPicker
                    value={workFunction}
                    onChange={(val) => {
                      setWorkFunction(val);
                      if (val) setWorkFunctionError("");
                    }}
                    required
                    error={workFunctionError}
                  />
                </div>
              </div>
              {workFunction && workFunction.title !== "OTHERS_SPECIFY" && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3 flex items-start gap-3">
                  <Briefcase className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-primary">{workFunction.displayLabel}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      PSOC {workFunction.psocCode} · {workFunction.category.replace(/_/g, " ")}
                    </p>
                  </div>
                </div>
              )}
              <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700">
                  Your work function is used for competency gap detection, AI training recommendations,
                  and mapping to TESDA Training Regulations and Competency Standards.
                </p>
              </div>
            </div>
          </div>
        )}

         {/* Save Profile Button */}
        <Button
          onClick={handleSaveProfile}
          disabled={updateProfile.isPending}
          size="lg"
          className="w-full py-6 text-base font-semibold rounded-xl"
        >
          {updateProfile.isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
          ) : profileSaved ? (
            <><CheckCircle2 className="w-4 h-4 mr-2" />Saved!</>
          ) : (
            "Update Profile"
          )}
        </Button>

        {/* ── Change Password ── */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              Change Password
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Leave blank if you don't want to change your password.</p>
          </div>
          <div className="px-5 py-5 space-y-4">
            <div>
              <Label htmlFor="currentPw" className="text-sm font-medium text-slate-700">Current Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="currentPw"
                  type={showCurrent ? "text" : "password"}
                  placeholder="Enter current password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className="pl-9 pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="newPw" className="text-sm font-medium text-slate-700">New Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="newPw"
                  type={showNew ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className="pl-9 pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="confirmPw" className="text-sm font-medium text-slate-700">Confirm New Password</Label>
              <Input
                id="confirmPw"
                type="password"
                placeholder="Repeat new password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                className="mt-1"
              />
              {confirmPw && newPw !== confirmPw && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>
              )}
            </div>
            <Button
              variant="outline"
              className="w-full"
              disabled={changePassword.isPending || !currentPw || !newPw || newPw !== confirmPw || newPw.length < 8}
              onClick={() => {
                changePassword.mutate({ currentPassword: currentPw, newPassword: newPw });
              }}
            >
              {changePassword.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Changing…</>
              ) : pwSaved ? (
                <><CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />Password Updated</>
              ) : (
                "Change Password"
              )}
            </Button>
          </div>
        </div>

        {/* Back to dashboard */}
        <button
          onClick={() => navigate("/dashboard")}
          className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2"
        >
          ← Back to Dashboard
        </button>
      </div>
    </StaffLayout>
  );
}
