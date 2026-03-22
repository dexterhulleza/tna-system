import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { ArrowLeft, BookOpen, ChevronRight, Info, User, Tag } from "lucide-react";
import { SECTOR_ICONS, SECTOR_COLORS } from "@/types/tna";

const SECTOR_BG: Record<string, string> = {
  ICT: "from-blue-500 to-cyan-500",
  MET: "from-slate-600 to-gray-700",
  CAF: "from-purple-500 to-pink-500",
  HW: "from-green-500 to-emerald-600",
  BPS: "from-orange-500 to-amber-600",
  TL: "from-red-500 to-rose-600",
};

const STEPS = ["sector", "skill_area", "respondent", "options"] as const;
type Step = typeof STEPS[number];

const STEP_LABELS: Record<Step, string> = {
  sector: "Select Sector",
  skill_area: "Skill Area",
  respondent: "Your Info",
  options: "Options",
};

export default function SurveyStart() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("sector");
  const [selectedSectorId, setSelectedSectorId] = useState<number | null>(null);
  const [selectedSkillAreaId, setSelectedSkillAreaId] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [conductedWith, setConductedWith] = useState<"self" | "hr_officer" | "administrator">("self");
  const [conductedWithName, setConductedWithName] = useState("");

  // Respondent info state
  const [respondentName, setRespondentName] = useState(user?.name || "");
  const [respondentAge, setRespondentAge] = useState("");
  const [respondentGender, setRespondentGender] = useState("");
  const [respondentPosition, setRespondentPosition] = useState(user?.jobTitle || "");
  const [respondentCompany, setRespondentCompany] = useState(user?.organization || "");
  const [respondentYearsExperience, setRespondentYearsExperience] = useState("");
  const [respondentHighestEducation, setRespondentHighestEducation] = useState("");

  if (!isAuthenticated) {
    window.location.href = getLoginUrl("/survey/start");
    return null;
  }

  const { data: sectors, isLoading: sectorsLoading } = trpc.sectors.list.useQuery({ activeOnly: true });
  const { data: skillAreas, isLoading: skillAreasLoading } = trpc.skillAreas.listBySector.useQuery(
    { sectorId: selectedSectorId!, activeOnly: true },
    { enabled: !!selectedSectorId }
  );
  const { data: groups } = trpc.groups.list.useQuery({ activeOnly: true });

  const startSurvey = trpc.surveys.start.useMutation({
    onSuccess: ({ surveyId }) => {
      navigate(`/survey/${surveyId}/questions`);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to start survey");
    },
  });

  const selectedSector = sectors?.find((s) => s.id === selectedSectorId);
  const stepIndex = STEPS.indexOf(step);

  const handleSectorSelect = (sectorId: number) => {
    setSelectedSectorId(sectorId);
    setSelectedSkillAreaId(null);
    setStep("skill_area");
  };

  const handleSkillAreaContinue = () => setStep("respondent");
  const handleRespondentContinue = () => setStep("options");

  const handleStartSurvey = () => {
    if (!selectedSectorId) return;
    startSurvey.mutate({
      sectorId: selectedSectorId,
      skillAreaId: selectedSkillAreaId ?? undefined,
      groupId: selectedGroupId ?? undefined,
      conductedWith,
      conductedWithName: conductedWithName || undefined,
      respondentName: respondentName || undefined,
      respondentAge: respondentAge ? parseInt(respondentAge) : undefined,
      respondentGender: respondentGender as any || undefined,
      respondentPosition: respondentPosition || undefined,
      respondentCompany: respondentCompany || undefined,
      respondentYearsExperience: respondentYearsExperience ? parseInt(respondentYearsExperience) : undefined,
      respondentHighestEducation: respondentHighestEducation as any || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <span className="font-display font-semibold text-foreground">Training Needs Analysis</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="hidden sm:block">{user?.name}</span>
            {user?.tnaRole && (
              <Badge variant="secondary" className="capitalize">
                {user.tnaRole.replace(/_/g, " ")}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="container py-8 max-w-4xl">
        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 shrink-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  step === s
                    ? "bg-primary text-white"
                    : stepIndex > i
                    ? "bg-green-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              <span className={`text-sm hidden sm:block ${step === s ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                {STEP_LABELS[s]}
              </span>
              {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Step 1: Sector Selection */}
        {step === "sector" && (
          <div>
            <div className="mb-6">
              <h1 className="font-display text-2xl font-bold text-foreground mb-2">Select Your Sector</h1>
              <p className="text-muted-foreground">
                Choose the WorldSkills sector that best matches your industry or area of expertise.
              </p>
            </div>
            {sectorsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sectors?.map((sector) => (
                  <button
                    key={sector.id}
                    onClick={() => handleSectorSelect(sector.id)}
                    className="text-left rounded-xl overflow-hidden border-2 border-transparent hover:border-primary hover:shadow-lg transition-all group"
                  >
                    <div className={`bg-gradient-to-br ${SECTOR_BG[sector.code] || "from-gray-500 to-gray-600"} p-5 text-white`}>
                      <div className="text-3xl mb-2">{SECTOR_ICONS[sector.code] || "🏭"}</div>
                      <Badge className="bg-white/20 text-white border-white/30 text-xs mb-2">{sector.code}</Badge>
                      <h3 className="font-display font-semibold text-sm leading-tight">{sector.name}</h3>
                    </div>
                    <div className="bg-white p-3 group-hover:bg-primary/5 transition-colors">
                      <p className="text-xs text-muted-foreground line-clamp-2">{sector.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Skill Area */}
        {step === "skill_area" && selectedSector && (
          <div>
            <div className="mb-6">
              <button
                onClick={() => setStep("sector")}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
              >
                <ArrowLeft className="w-4 h-4" /> Back to sectors
              </button>
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${SECTOR_BG[selectedSector.code] || "from-gray-500 to-gray-600"} flex items-center justify-center text-xl`}>
                  {SECTOR_ICONS[selectedSector.code] || "🏭"}
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold text-foreground">{selectedSector.name}</h1>
                  <p className="text-sm text-muted-foreground">Select a specific skill area (optional)</p>
                </div>
              </div>
            </div>

            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-base flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-500" />
                  Skill Area Selection
                </CardTitle>
                <CardDescription>
                  You can select a specific skill area for a more targeted assessment, or proceed with the general sector survey.
                </CardDescription>
              </CardHeader>
            </Card>

            {skillAreasLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => { setSelectedSkillAreaId(null); handleSkillAreaContinue(); }}
                  className="w-full text-left p-4 rounded-xl border-2 border-border hover:border-primary/50 transition-all"
                >
                  <div className="font-semibold text-foreground text-sm">General Sector Survey</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Covers all skill areas within {selectedSector.name}
                  </div>
                </button>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {skillAreas?.map((area) => (
                    <button
                      key={area.id}
                      onClick={() => { setSelectedSkillAreaId(area.id); handleSkillAreaContinue(); }}
                      className={`text-left p-4 rounded-xl border-2 transition-all ${
                        selectedSkillAreaId === area.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Badge variant="outline" className="text-xs mb-1">{area.code}</Badge>
                      <div className="font-semibold text-foreground text-sm">{area.name}</div>
                      {area.description && (
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{area.description}</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Respondent Information */}
        {step === "respondent" && (
          <div>
            <div className="mb-6">
              <button
                onClick={() => setStep("skill_area")}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold text-foreground">Respondent Information</h1>
                  <p className="text-sm text-muted-foreground">Basic details to personalize and contextualize your TNA report.</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 max-w-2xl">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="font-display text-base">Personal Details</CardTitle>
                  <CardDescription>Fields marked with * are recommended for accurate analysis.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="rName">Full Name *</Label>
                      <Input
                        id="rName"
                        placeholder="e.g., Juan dela Cruz"
                        value={respondentName}
                        onChange={(e) => setRespondentName(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="rAge">Age</Label>
                      <Input
                        id="rAge"
                        type="number"
                        placeholder="e.g., 35"
                        min={16}
                        max={80}
                        value={respondentAge}
                        onChange={(e) => setRespondentAge(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="rGender">Gender</Label>
                      <Select value={respondentGender} onValueChange={setRespondentGender}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="non_binary">Non-binary</SelectItem>
                          <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="rEdu">Highest Educational Attainment</Label>
                      <Select value={respondentHighestEducation} onValueChange={setRespondentHighestEducation}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select education level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="elementary">Elementary</SelectItem>
                          <SelectItem value="high_school">High School</SelectItem>
                          <SelectItem value="vocational">Vocational / TVET</SelectItem>
                          <SelectItem value="associate">Associate Degree</SelectItem>
                          <SelectItem value="bachelor">Bachelor's Degree</SelectItem>
                          <SelectItem value="master">Master's Degree</SelectItem>
                          <SelectItem value="doctorate">Doctorate</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="font-display text-base">Professional Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="rPosition">Position / Job Title *</Label>
                      <Input
                        id="rPosition"
                        placeholder="e.g., Senior Trainer"
                        value={respondentPosition}
                        onChange={(e) => setRespondentPosition(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="rCompany">Organization / Company *</Label>
                      <Input
                        id="rCompany"
                        placeholder="e.g., WorldSkills Philippines"
                        value={respondentCompany}
                        onChange={(e) => setRespondentCompany(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="rYears">Years of Experience in Current Field</Label>
                    <Input
                      id="rYears"
                      type="number"
                      placeholder="e.g., 5"
                      min={0}
                      max={50}
                      value={respondentYearsExperience}
                      onChange={(e) => setRespondentYearsExperience(e.target.value)}
                      className="mt-1 max-w-xs"
                    />
                  </div>
                </CardContent>
              </Card>

              <Button
                className="w-full"
                size="lg"
                onClick={handleRespondentContinue}
              >
                Continue to Survey Options
                <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Options */}
        {step === "options" && (
          <div>
            <div className="mb-6">
              <button
                onClick={() => setStep("respondent")}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <h1 className="font-display text-2xl font-bold text-foreground mb-2">Survey Options</h1>
              <p className="text-muted-foreground">Configure how this assessment will be conducted.</p>
            </div>

            <div className="space-y-4 max-w-lg">
              {/* Group Tag */}
              {groups && groups.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="font-display text-base flex items-center gap-2">
                      <Tag className="w-4 h-4 text-primary" />
                      Group Tag
                    </CardTitle>
                    <CardDescription>
                      Assign this survey to a group for cohort-level analysis. Select the group you belong to, if applicable.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <button
                        onClick={() => setSelectedGroupId(null)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                          selectedGroupId === null
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="font-semibold text-sm text-foreground">No Group</div>
                        <div className="text-xs text-muted-foreground">Individual assessment, not assigned to any group</div>
                      </button>
                      {groups.map((group) => (
                        <button
                          key={group.id}
                          onClick={() => setSelectedGroupId(group.id)}
                          className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                            selectedGroupId === group.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Tag className="w-3.5 h-3.5 text-primary" />
                            <div className="font-semibold text-sm text-foreground">{group.name}</div>
                            <Badge variant="outline" className="text-xs">{group.code}</Badge>
                          </div>
                          {group.description && (
                            <div className="text-xs text-muted-foreground mt-1 ml-5">{group.description}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="font-display text-base">Conducted With</CardTitle>
                  <CardDescription>
                    This assessment can be conducted independently or together with an HR Officer or Administrator.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { value: "self", label: "Self-Assessment", desc: "Complete the survey independently" },
                    { value: "hr_officer", label: "With HR Officer", desc: "Conducted together with an HR Officer" },
                    { value: "administrator", label: "With Administrator", desc: "Conducted with a school/training center administrator" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setConductedWith(opt.value as any)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                        conductedWith === opt.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="font-semibold text-sm text-foreground">{opt.label}</div>
                      <div className="text-xs text-muted-foreground">{opt.desc}</div>
                    </button>
                  ))}
                </CardContent>
              </Card>

              {conductedWith !== "self" && (
                <Card>
                  <CardContent className="pt-4">
                    <Label htmlFor="conductedWithName">
                      {conductedWith === "hr_officer" ? "HR Officer Name" : "Administrator Name"}
                    </Label>
                    <Input
                      id="conductedWithName"
                      placeholder="Enter name (optional)"
                      value={conductedWithName}
                      onChange={(e) => setConductedWithName(e.target.value)}
                      className="mt-1"
                    />
                  </CardContent>
                </Card>
              )}

              {/* Survey Summary */}
              <Card className="bg-muted/30">
                <CardContent className="pt-4">
                  <div className="text-sm font-semibold text-foreground mb-2">Survey Summary</div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Respondent:</span>
                      <span className="font-medium text-foreground">{respondentName || user?.name || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Organization:</span>
                      <span className="font-medium text-foreground">{respondentCompany || user?.organization || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sector:</span>
                      <span className="font-medium text-foreground">{selectedSector?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Skill Area:</span>
                      <span className="font-medium text-foreground">
                        {skillAreas?.find((a) => a.id === selectedSkillAreaId)?.name || "General"}
                      </span>
                    </div>
                    {selectedGroupId && (
                      <div className="flex justify-between">
                        <span>Group:</span>
                        <span className="font-medium text-foreground">
                          {groups?.find((g) => g.id === selectedGroupId)?.name}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Your Role:</span>
                      <span className="font-medium text-foreground capitalize">
                        {user?.tnaRole?.replace(/_/g, " ") || "Not set"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button
                className="w-full"
                size="lg"
                onClick={handleStartSurvey}
                disabled={startSurvey.isPending}
              >
                {startSurvey.isPending ? "Starting..." : "Begin Assessment"}
                <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
