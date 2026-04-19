/**
 * Profile Setup — ONE OBJECTIVE: Pick your role so we can tailor your survey.
 * Rules: role selection is the ONLY required action · org/title are secondary · always-visible CTA
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Briefcase, GraduationCap, ClipboardCheck, UserCog, ChevronDown, ChevronUp } from "lucide-react";

const ROLES = [
  { value: "industry_worker", label: "Industry Worker", icon: Briefcase, color: "blue" },
  { value: "trainer",         label: "Trainer",         icon: GraduationCap, color: "green" },
  { value: "assessor",        label: "Assessor",        icon: ClipboardCheck, color: "purple" },
  { value: "hr_officer",      label: "HR Officer",      icon: UserCog, color: "orange" },
] as const;

const COLOR_MAP: Record<string, { ring: string; bg: string; text: string; iconBg: string }> = {
  blue:   { ring: "ring-blue-500 border-blue-500",   bg: "bg-blue-50",   text: "text-blue-700",   iconBg: "bg-blue-100" },
  green:  { ring: "ring-green-500 border-green-500", bg: "bg-green-50",  text: "text-green-700",  iconBg: "bg-green-100" },
  purple: { ring: "ring-purple-500 border-purple-500", bg: "bg-purple-50", text: "text-purple-700", iconBg: "bg-purple-100" },
  orange: { ring: "ring-orange-500 border-orange-500", bg: "bg-orange-50", text: "text-orange-700", iconBg: "bg-orange-100" },
};

export default function ProfileSetup() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const existing = user?.tnaRole && user.tnaRole !== "admin" ? user.tnaRole : "industry_worker";
  const [selectedRole, setSelectedRole] = useState<string>(existing);
  const [organization, setOrganization] = useState(user?.organization || "");
  const [jobTitle, setJobTitle] = useState(user?.jobTitle || "");
  const [showDetails, setShowDetails] = useState(!!(user?.organization || user?.jobTitle));

  const updateProfile = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile saved!");
      navigate("/survey/start");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to save profile");
    },
  });

  const handleSubmit = () => {
    updateProfile.mutate({ tnaRole: selectedRole as any, organization, jobTitle });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Slim header */}
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">TNA System</span>
        <span className="text-xs text-slate-400">Step 1 of 1 — Your Profile</span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-6">

          {/* Page title — one sentence */}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">What's your role?</h1>
            <p className="text-sm text-slate-500 mt-1">We'll tailor the survey questions to your position.</p>
          </div>

          {/* Role cards — large tap targets */}
          <div className="grid grid-cols-2 gap-3">
            {ROLES.map((role) => {
              const c = COLOR_MAP[role.color];
              const Icon = role.icon;
              const selected = selectedRole === role.value;
              return (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setSelectedRole(role.value)}
                  className={`
                    relative flex flex-col items-start gap-3 p-4 rounded-xl border-2 text-left transition-all
                    ${selected ? `${c.ring} ${c.bg} ring-2` : "border-slate-200 bg-white hover:border-slate-300"}
                  `}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${selected ? c.iconBg : "bg-slate-100"}`}>
                    <Icon className={`w-5 h-5 ${selected ? c.text : "text-slate-500"}`} />
                  </div>
                  <span className={`text-sm font-semibold ${selected ? c.text : "text-slate-700"}`}>
                    {role.label}
                  </span>
                  {selected && (
                    <span className={`absolute top-2 right-2 w-2 h-2 rounded-full ${c.text.replace("text-", "bg-")}`} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Optional details — hidden by default, progressive disclosure */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <span className="font-medium">Add organization & job title <span className="text-slate-400 font-normal">(optional)</span></span>
              {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showDetails && (
              <div className="px-4 pb-4 space-y-3 border-t border-slate-100">
                <div className="pt-3">
                  <Input
                    placeholder="Organization / Company"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    className="bg-slate-50"
                  />
                </div>
                <Input
                  placeholder="Job Title / Position"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="bg-slate-50"
                />
              </div>
            )}
          </div>

          {/* PRIMARY CTA — always visible, full width */}
          <Button
            onClick={handleSubmit}
            disabled={!selectedRole || updateProfile.isPending}
            size="lg"
            className="w-full py-6 text-base font-semibold rounded-xl"
          >
            {updateProfile.isPending ? "Saving…" : "Continue to Survey"}
            {!updateProfile.isPending && <ArrowRight className="ml-2 w-5 h-5" />}
          </Button>

          <p className="text-center text-xs text-slate-400">
            You can update this anytime from Settings
          </p>
        </div>
      </main>
    </div>
  );
}
