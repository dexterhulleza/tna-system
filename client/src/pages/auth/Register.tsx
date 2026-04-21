import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  Eye, EyeOff, Loader2, BookOpen, AlertCircle,
  CheckCircle2, Users, Briefcase, Clock
} from "lucide-react";
import { toast } from "sonner";

type RegistrationState = "form" | "success" | "pending";

export default function Register() {
  const [, navigate] = useLocation();
  const [state, setState] = useState<RegistrationState>("form");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
    tnaRole: "industry_worker" as "industry_worker" | "hr_officer",
    // Staff fields
    department: "",
    employeeId: "",
    // HR fields
    organization: "",
    jobTitle: "",
    hrJustification: "",
  });

  const registerMutation = trpc.customAuth.register.useMutation({
    onSuccess: (data) => {
      if (data.pendingApproval) {
        setState("pending");
      } else {
        setState("success");
        setTimeout(() => navigate("/dashboard"), 2000);
      }
    },
    onError: (e) => {
      setError(e.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    registerMutation.mutate({
      name: form.name,
      email: form.email,
      mobile: form.mobile || undefined,
      password: form.password,
      tnaRole: form.tnaRole,
      department: form.department || undefined,
      employeeId: form.employeeId || undefined,
      organization: form.organization || undefined,
      jobTitle: form.jobTitle || undefined,
      hrJustification: form.hrJustification || undefined,
    });
  };

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  if (state === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0 text-center">
          <CardContent className="pt-10 pb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
            <p className="text-gray-500 mb-6">Your account has been created. Redirecting to your dashboard...</p>
            <Button onClick={() => navigate("/dashboard")} className="bg-blue-600 hover:bg-blue-700">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "pending") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0 text-center">
          <CardContent className="pt-10 pb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Pending Approval</h2>
            <p className="text-gray-500 mb-2">
              Your HR Officer account registration has been submitted.
            </p>
            <p className="text-gray-500 mb-6 text-sm">
              An Administrator will review and approve your account. You will be notified once approved.
            </p>
            <Button variant="outline" onClick={() => navigate("/login")}>
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-500 text-sm mt-1">Join the TNA System</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Registration</CardTitle>
            <CardDescription>Fill in your details to create your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Basic Info */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="name"
                    placeholder="Juan dela Cruz"
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address <span className="text-red-500">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile Number</Label>
                  <Input
                    id="mobile"
                    type="tel"
                    placeholder="+63 9XX XXX XXXX"
                    value={form.mobile}
                    onChange={(e) => update("mobile", e.target.value)}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 8 characters"
                      value={form.password}
                      onChange={(e) => update("password", e.target.value)}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Re-enter your password"
                      value={form.confirmPassword}
                      onChange={(e) => update("confirmPassword", e.target.value)}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-3">
                <Label>I am registering as <span className="text-red-500">*</span></Label>
                <RadioGroup
                  value={form.tnaRole}
                  onValueChange={(v) => update("tnaRole", v)}
                  className="grid grid-cols-2 gap-3"
                >
                  <label
                    htmlFor="role-staff"
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      form.tnaRole === "industry_worker"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <RadioGroupItem value="industry_worker" id="role-staff" className="sr-only" />
                    <Users className="w-5 h-5 text-blue-600 shrink-0" />
                    <div>
                      <div className="font-medium text-sm">Staff</div>
                      <div className="text-xs text-gray-500">Take assessments</div>
                    </div>
                  </label>

                  <label
                    htmlFor="role-hr"
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      form.tnaRole === "hr_officer"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <RadioGroupItem value="hr_officer" id="role-hr" className="sr-only" />
                    <Briefcase className="w-5 h-5 text-blue-600 shrink-0" />
                    <div>
                      <div className="font-medium text-sm">HR Officer</div>
                      <div className="text-xs text-gray-500">Manage campaigns</div>
                    </div>
                  </label>
                </RadioGroup>
              </div>

              {/* Conditional: Staff fields */}
              {form.tnaRole === "industry_worker" && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-sm font-medium text-blue-800">Staff Information</p>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="department">Department / Group</Label>
                      <Input
                        id="department"
                        placeholder="e.g. Information Technology"
                        value={form.department}
                        onChange={(e) => update("department", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="employeeId">Employee ID (optional)</Label>
                      <Input
                        id="employeeId"
                        placeholder="e.g. EMP-001"
                        value={form.employeeId}
                        onChange={(e) => update("employeeId", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Conditional: HR fields */}
              {form.tnaRole === "hr_officer" && (
                <div className="space-y-4 p-4 bg-amber-50 rounded-lg border border-amber-100">
                  <p className="text-sm font-medium text-amber-800">HR Officer Information</p>
                  <Alert className="bg-amber-50 border-amber-200">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-700 text-xs">
                      HR Officer accounts require Administrator approval before you can log in.
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="organization">Organization <span className="text-red-500">*</span></Label>
                      <Input
                        id="organization"
                        placeholder="e.g. Department of Labor and Employment"
                        value={form.organization}
                        onChange={(e) => update("organization", e.target.value)}
                        required={form.tnaRole === "hr_officer"}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="jobTitle">Position / Job Title</Label>
                      <Input
                        id="jobTitle"
                        placeholder="e.g. HR Manager"
                        value={form.jobTitle}
                        onChange={(e) => update("jobTitle", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hrJustification">Justification</Label>
                      <Textarea
                        id="hrJustification"
                        placeholder="Briefly explain why you need HR Officer access..."
                        value={form.hrJustification}
                        onChange={(e) => update("hrJustification", e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating account...</>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              Already have an account?{" "}
              <Link href="/login" className="text-blue-600 font-medium hover:underline">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
