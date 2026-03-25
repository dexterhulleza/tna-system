import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import { BookOpen, Briefcase, GraduationCap, ClipboardCheck, UserCog, ArrowLeft } from "lucide-react";

const ROLES = [
  {
    value: "industry_worker",
    label: "Industry Worker",
    description: "A professional working in an industry who needs training to improve skills and performance.",
    icon: <Briefcase className="w-7 h-7" />,
    color: "border-blue-400 bg-blue-50 hover:bg-blue-100",
    selectedColor: "border-blue-600 bg-blue-100 ring-2 ring-blue-400",
    iconColor: "text-blue-600",
  },
  {
    value: "trainer",
    label: "Trainer",
    description: "A professional who delivers training programs and needs to identify gaps in training delivery.",
    icon: <GraduationCap className="w-7 h-7" />,
    color: "border-green-400 bg-green-50 hover:bg-green-100",
    selectedColor: "border-green-600 bg-green-100 ring-2 ring-green-400",
    iconColor: "text-green-600",
  },
  {
    value: "assessor",
    label: "Assessor",
    description: "An evaluator who assesses competencies and identifies training needs through performance reviews.",
    icon: <ClipboardCheck className="w-7 h-7" />,
    color: "border-purple-400 bg-purple-50 hover:bg-purple-100",
    selectedColor: "border-purple-600 bg-purple-100 ring-2 ring-purple-400",
    iconColor: "text-purple-600",
  },
  {
    value: "hr_officer",
    label: "HR Officer",
    description: "A human resources professional who manages workforce development and training programs.",
    icon: <UserCog className="w-7 h-7" />,
    color: "border-orange-400 bg-orange-50 hover:bg-orange-100",
    selectedColor: "border-orange-600 bg-orange-100 ring-2 ring-orange-400",
    iconColor: "text-orange-600",
  },
];

export default function ProfileSetup() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const currentTnaRole = user?.tnaRole && user.tnaRole !== "admin" ? user.tnaRole : "industry_worker";
  const [selectedRole, setSelectedRole] = useState<string>(currentTnaRole);
  const [organization, setOrganization] = useState(user?.organization || "");
  const [jobTitle, setJobTitle] = useState(user?.jobTitle || "");

  const updateProfile = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated successfully!");
      navigate("/survey/start");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update profile");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate({
      tnaRole: selectedRole as any,
      organization,
      jobTitle,
    });
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      {/* Back to home */}
      <div className="fixed top-4 left-4">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-full border shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Home</span>
        </button>
      </div>
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Set Up Your Profile</h1>
          <p className="text-muted-foreground">
            Tell us about your role so we can tailor the survey to your needs.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="font-display text-lg">Your Role</CardTitle>
              <CardDescription>Select the role that best describes your position.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ROLES.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setSelectedRole(role.value)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      selectedRole === role.value ? role.selectedColor : role.color
                    }`}
                  >
                    <div className={`${role.iconColor} mb-2`}>{role.icon}</div>
                    <div className="font-semibold text-foreground text-sm mb-1">{role.label}</div>
                    <div className="text-xs text-muted-foreground leading-relaxed">{role.description}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="font-display text-lg">Professional Details</CardTitle>
              <CardDescription>Optional information to personalize your report.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="organization">Organization / Company</Label>
                <Input
                  id="organization"
                  placeholder="e.g., WorldSkills Philippines"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="jobTitle">Job Title / Position</Label>
                <Input
                  id="jobTitle"
                  placeholder="e.g., Senior Trainer, Production Manager"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending ? "Saving..." : "Continue to Survey"}
          </Button>
        </form>
      </div>
    </div>
  );
}
