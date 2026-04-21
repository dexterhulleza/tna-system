import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const TNA_ROLE_OPTIONS = [
  { value: "industry_worker", label: "Staff / Industry Worker" },
  { value: "hr_officer", label: "HR Officer" },
  { value: "trainer", label: "Trainer" },
  { value: "assessor", label: "Assessor" },
];

export default function CompleteProfile() {
  const [, navigate] = useLocation();
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({
    tnaRole: user?.tnaRole ?? "industry_worker",
    department: user?.department ?? "",
    organization: user?.organization ?? "",
    jobTitle: user?.jobTitle ?? "",
  });
  const [error, setError] = useState<string | null>(null);

  const mutation = trpc.customAuth.completeProfile.useMutation({
    onSuccess: async () => {
      toast.success("Profile completed!");
      await refresh();
      navigate("/dashboard");
    },
    onError: (e) => setError(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    mutation.mutate({
      tnaRole: form.tnaRole as any,
      department: form.department || undefined,
      organization: form.organization || undefined,
      jobTitle: form.jobTitle || undefined,
    });
  };

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Complete Your Profile</h1>
          <p className="text-gray-500 text-sm mt-1">A few more details to get you started</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Profile Setup</CardTitle>
            <CardDescription>
              Hi {user?.name ?? "there"}! Please complete your profile to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label>Role Confirmation</Label>
                <Select value={form.tnaRole} onValueChange={(v) => update("tnaRole", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    {TNA_ROLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
                <Label htmlFor="organization">Organization</Label>
                <Input
                  id="organization"
                  placeholder="e.g. TESDA Region IV-A"
                  value={form.organization}
                  onChange={(e) => update("organization", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobTitle">Position / Job Title</Label>
                <Input
                  id="jobTitle"
                  placeholder="e.g. Software Developer"
                  value={form.jobTitle}
                  onChange={(e) => update("jobTitle", e.target.value)}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  "Save and Continue"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
