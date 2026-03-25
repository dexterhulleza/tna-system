import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Home, LayoutDashboard, ChevronRight, Settings2, Brain, Plus, X, Loader2,
  CheckCircle2, Circle, Save, Sparkles, Target, Building2, Users, BookOpen,
  Calendar, FileText, AlertTriangle, Info,
} from "lucide-react";
import { useLocation } from "wouter";

const CATEGORY_LABELS: Record<string, string> = {
  organizational: "Organizational",
  job_task: "Job / Task",
  individual: "Individual",
  training_feasibility: "Training Feasibility",
  evaluation_success: "Evaluation & Success",
  custom: "Custom / Group-Specific",
};

const CATEGORY_COLORS: Record<string, string> = {
  organizational: "bg-blue-100 text-blue-700 border-blue-200",
  job_task: "bg-purple-100 text-purple-700 border-purple-200",
  individual: "bg-green-100 text-green-700 border-green-200",
  training_feasibility: "bg-orange-100 text-orange-700 border-orange-200",
  evaluation_success: "bg-pink-100 text-pink-700 border-pink-200",
  custom: "bg-gray-100 text-gray-700 border-gray-200",
};

const QTYPE_LABELS: Record<string, string> = {
  rating: "Rating (1–5)",
  scale: "Scale (1–5)",
  yes_no: "Yes / No",
  text: "Open Text",
  multiple_choice: "Multiple Choice",
};

type AiQuestion = {
  questionText: string;
  category: string;
  questionType: string;
  rationale: string;
  accepted: boolean;
};

type FormState = {
  surveyTitle: string;
  surveyPurpose: string;
  surveyObjectives: string[];
  organizationName: string;
  industryContext: string;
  businessGoals: string[];
  targetParticipants: string;
  participantRoles: string[];
  expectedParticipantCount: string;
  targetCompetencies: string[];
  knownSkillGaps: string;
  priorityAreas: string[];
  surveyStartDate: string;
  surveyEndDate: string;
  additionalNotes: string;
  regulatoryRequirements: string;
};

const EMPTY_FORM: FormState = {
  surveyTitle: "",
  surveyPurpose: "",
  surveyObjectives: [],
  organizationName: "",
  industryContext: "",
  businessGoals: [],
  targetParticipants: "",
  participantRoles: [],
  expectedParticipantCount: "",
  targetCompetencies: [],
  knownSkillGaps: "",
  priorityAreas: [],
  surveyStartDate: "",
  surveyEndDate: "",
  additionalNotes: "",
  regulatoryRequirements: "",
};

function TagInput({
  label, values, onChange, placeholder,
}: { label: string; values: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState("");
  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
      setInput("");
    }
  };
  const remove = (i: number) => onChange(values.filter((_, idx) => idx !== i));
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder ?? `Type and press Enter to add`}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="sm" onClick={add} className="shrink-0">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {values.map((v, i) => (
            <span key={i} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
              {v}
              <button onClick={() => remove(i)} className="hover:text-destructive transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SurveyConfiguration() {
  const [, navigate] = useLocation();
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [aiQuestions, setAiQuestions] = useState<AiQuestion[]>([]);
  const [configId, setConfigId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"config" | "questions">("config");
  const [selectedAll, setSelectedAll] = useState(false);

  const { data: groups } = trpc.groups.list.useQuery({ activeOnly: true });
  const { data: config, refetch: refetchConfig } = trpc.surveyConfig.get.useQuery(
    { groupId: selectedGroupId! },
    { enabled: selectedGroupId !== null }
  );

  const utils = trpc.useUtils();

  const saveConfig = trpc.surveyConfig.save.useMutation({
    onSuccess: (data) => {
      toast.success("Configuration saved successfully.");
      if (data) setConfigId(data.id);
      refetchConfig();
    },
    onError: (e) => toast.error(e.message),
  });

  const generateQuestions = trpc.surveyConfig.generateQuestions.useMutation({
    onSuccess: (data) => {
      setAiQuestions(data.questions);
      setConfigId(data.configId);
      setActiveTab("questions");
      toast.success(`${data.questions.length} questions generated! Review and accept the ones you want to add.`);
    },
    onError: (e) => toast.error(e.message),
  });

  const acceptQuestions = trpc.surveyConfig.acceptQuestions.useMutation({
    onSuccess: () => {},
    onError: (e) => toast.error(e.message),
  });
  const addToQuestionBank = trpc.surveyConfig.addToQuestionBank.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.inserted} questions added to the question bank and will now appear in surveys.`);
      utils.questions.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // Populate form from existing config
  useEffect(() => {
    if (config) {
      setConfigId(config.id);
      setForm({
        surveyTitle: config.surveyTitle ?? "",
        surveyPurpose: config.surveyPurpose ?? "",
        surveyObjectives: (config.surveyObjectives as string[]) ?? [],
        organizationName: config.organizationName ?? "",
        industryContext: config.industryContext ?? "",
        businessGoals: (config.businessGoals as string[]) ?? [],
        targetParticipants: config.targetParticipants ?? "",
        participantRoles: (config.participantRoles as string[]) ?? [],
        expectedParticipantCount: config.expectedParticipantCount ? String(config.expectedParticipantCount) : "",
        targetCompetencies: (config.targetCompetencies as string[]) ?? [],
        knownSkillGaps: config.knownSkillGaps ?? "",
        priorityAreas: (config.priorityAreas as string[]) ?? [],
        surveyStartDate: config.surveyStartDate ?? "",
        surveyEndDate: config.surveyEndDate ?? "",
        additionalNotes: config.additionalNotes ?? "",
        regulatoryRequirements: config.regulatoryRequirements ?? "",
      });
      if (config.aiGeneratedQuestions) {
        setAiQuestions(config.aiGeneratedQuestions as AiQuestion[]);
      }
    } else if (selectedGroupId !== null) {
      setForm(EMPTY_FORM);
      setAiQuestions([]);
      setConfigId(null);
    }
  }, [config, selectedGroupId]);

  const handleSave = () => {
    if (!selectedGroupId) { toast.error("Please select a group first."); return; }
    saveConfig.mutate({
      groupId: selectedGroupId,
      ...form,
      expectedParticipantCount: form.expectedParticipantCount ? parseInt(form.expectedParticipantCount) : undefined,
    });
  };

  const handleGenerate = () => {
    if (!selectedGroupId) { toast.error("Please select a group first."); return; }
    if (!form.surveyPurpose && !form.surveyObjectives.length && !form.businessGoals.length) {
      toast.error("Please fill in at least the Survey Purpose, Objectives, or Business Goals before generating questions.");
      return;
    }
    // Save first, then generate
    saveConfig.mutate(
      {
        groupId: selectedGroupId,
        ...form,
        expectedParticipantCount: form.expectedParticipantCount ? parseInt(form.expectedParticipantCount) : undefined,
      },
      {
        onSuccess: () => generateQuestions.mutate({ groupId: selectedGroupId }),
      }
    );
  };

  const toggleQuestion = (i: number) => {
    setAiQuestions((prev) => prev.map((q, idx) => idx === i ? { ...q, accepted: !q.accepted } : q));
  };

  const handleAcceptSelected = () => {
    if (!configId) return;
    const indices = aiQuestions.map((q, i) => q.accepted ? i : -1).filter((i) => i >= 0);
    if (indices.length === 0) { toast.error("No questions selected."); return; }
    // Mark as accepted in config JSON, then insert into the questions table
    acceptQuestions.mutate(
      { configId, acceptedIndices: indices },
      { onSuccess: () => addToQuestionBank.mutate({ configId: configId!, acceptedIndices: indices }) }
    );
  };

  const acceptedCount = aiQuestions.filter((q) => q.accepted).length;

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
        <span className="text-foreground font-medium">Survey Configuration</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Survey Configuration</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Define objectives, business goals, and context per group to generate a tailored TNA question set using AI.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={handleSave} disabled={!selectedGroupId || saveConfig.isPending} className="gap-2">
            {saveConfig.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Config
          </Button>
          <Button onClick={handleGenerate} disabled={!selectedGroupId || generateQuestions.isPending || saveConfig.isPending} className="gap-2">
            {generateQuestions.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generateQuestions.isPending ? "Generating…" : "Generate Questions"}
          </Button>
        </div>
      </div>

      {/* Group Selector */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <Label className="text-sm font-semibold">Select Group</Label>
              <p className="text-xs text-muted-foreground">Choose the group you are configuring this TNA survey for.</p>
            </div>
            <div className="w-72">
              <Select
                value={selectedGroupId ? String(selectedGroupId) : ""}
                onValueChange={(v) => { setSelectedGroupId(parseInt(v)); setActiveTab("config"); }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a group…" />
                </SelectTrigger>
                <SelectContent>
                  {groups?.map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>
                      {g.name} <span className="text-muted-foreground ml-1">({g.code})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedGroupId ? (
        <Card className="border-dashed">
          <CardContent className="pt-12 pb-12 text-center">
            <Settings2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Select a group above to configure its TNA survey.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-1 border-b">
            <button
              onClick={() => setActiveTab("config")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "config" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" />Configuration</span>
            </button>
            <button
              onClick={() => setActiveTab("questions")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "questions" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <span className="flex items-center gap-1.5">
                <Brain className="w-4 h-4" />AI Questions
                {aiQuestions.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">{aiQuestions.length}</Badge>
                )}
              </span>
            </button>
          </div>

          {activeTab === "config" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left column */}
              <div className="space-y-6">
                {/* Survey Identity */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />Survey Identity & Objectives
                    </CardTitle>
                    <CardDescription className="text-xs">Define the purpose and goals of this TNA survey.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Survey Title</Label>
                      <Input
                        value={form.surveyTitle}
                        onChange={(e) => setForm((f) => ({ ...f, surveyTitle: e.target.value }))}
                        placeholder="e.g., Film Animation Competency Assessment 2025"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Survey Purpose <span className="text-destructive">*</span></Label>
                      <Textarea
                        value={form.surveyPurpose}
                        onChange={(e) => setForm((f) => ({ ...f, surveyPurpose: e.target.value }))}
                        placeholder="Describe the main purpose of this TNA survey — what problem it aims to solve or what decisions it will inform."
                        rows={3}
                      />
                    </div>
                    <TagInput
                      label="Survey Objectives"
                      values={form.surveyObjectives}
                      onChange={(v) => setForm((f) => ({ ...f, surveyObjectives: v }))}
                      placeholder="e.g., Identify gaps in 3D animation skills"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Survey Start Date</Label>
                        <Input type="date" value={form.surveyStartDate} onChange={(e) => setForm((f) => ({ ...f, surveyStartDate: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Survey End Date</Label>
                        <Input type="date" value={form.surveyEndDate} onChange={(e) => setForm((f) => ({ ...f, surveyEndDate: e.target.value }))} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Organizational Context */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" />Organizational Context
                    </CardTitle>
                    <CardDescription className="text-xs">Business goals and industry context that the TNA should address.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Organization / Agency Name</Label>
                      <Input
                        value={form.organizationName}
                        onChange={(e) => setForm((f) => ({ ...f, organizationName: e.target.value }))}
                        placeholder="e.g., TESDA Region IV-A"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Industry Context</Label>
                      <Textarea
                        value={form.industryContext}
                        onChange={(e) => setForm((f) => ({ ...f, industryContext: e.target.value }))}
                        placeholder="Describe the industry, sector, or domain context. Include current trends, challenges, or mandates relevant to this TNA."
                        rows={3}
                      />
                    </div>
                    <TagInput
                      label="Business Goals"
                      values={form.businessGoals}
                      onChange={(v) => setForm((f) => ({ ...f, businessGoals: v }))}
                      placeholder="e.g., Increase production output by 20%"
                    />
                    <div className="space-y-1.5">
                      <Label>Regulatory / Compliance Requirements</Label>
                      <Textarea
                        value={form.regulatoryRequirements}
                        onChange={(e) => setForm((f) => ({ ...f, regulatoryRequirements: e.target.value }))}
                        placeholder="Any TESDA, CHED, or industry standards that training must comply with."
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right column */}
              <div className="space-y-6">
                {/* Target Participants */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />Target Participants
                    </CardTitle>
                    <CardDescription className="text-xs">Who will take this survey and what are their roles?</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Participant Description</Label>
                      <Textarea
                        value={form.targetParticipants}
                        onChange={(e) => setForm((f) => ({ ...f, targetParticipants: e.target.value }))}
                        placeholder="Describe the target participants — their background, experience level, and current roles."
                        rows={3}
                      />
                    </div>
                    <TagInput
                      label="Participant Roles / Designations"
                      values={form.participantRoles}
                      onChange={(v) => setForm((f) => ({ ...f, participantRoles: v }))}
                      placeholder="e.g., Junior Animator, 3D Modeler"
                    />
                    <div className="space-y-1.5">
                      <Label>Expected Number of Participants</Label>
                      <Input
                        type="number"
                        min={1}
                        value={form.expectedParticipantCount}
                        onChange={(e) => setForm((f) => ({ ...f, expectedParticipantCount: e.target.value }))}
                        placeholder="e.g., 50"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Competency Focus */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary" />Competency Focus
                    </CardTitle>
                    <CardDescription className="text-xs">Define the competency areas and known gaps this TNA should investigate.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <TagInput
                      label="Target Competencies"
                      values={form.targetCompetencies}
                      onChange={(v) => setForm((f) => ({ ...f, targetCompetencies: v }))}
                      placeholder="e.g., 3D Character Rigging, Storyboarding"
                    />
                    <div className="space-y-1.5">
                      <Label>Known Skill Gaps</Label>
                      <Textarea
                        value={form.knownSkillGaps}
                        onChange={(e) => setForm((f) => ({ ...f, knownSkillGaps: e.target.value }))}
                        placeholder="Describe any pre-identified skill gaps or performance issues that this TNA should confirm or investigate further."
                        rows={3}
                      />
                    </div>
                    <TagInput
                      label="Priority Training Areas"
                      values={form.priorityAreas}
                      onChange={(v) => setForm((f) => ({ ...f, priorityAreas: v }))}
                      placeholder="e.g., Digital Tools Proficiency, Industry Standards"
                    />
                  </CardContent>
                </Card>

                {/* Additional Notes */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Info className="w-4 h-4 text-primary" />Additional Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={form.additionalNotes}
                      onChange={(e) => setForm((f) => ({ ...f, additionalNotes: e.target.value }))}
                      placeholder="Any other context, constraints, or instructions for the AI when generating questions."
                      rows={3}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "questions" && (
            <div className="space-y-4">
              {aiQuestions.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="pt-12 pb-12 text-center">
                    <Brain className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm mb-4">No AI-generated questions yet.</p>
                    <Button onClick={handleGenerate} disabled={generateQuestions.isPending} className="gap-2">
                      {generateQuestions.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      Generate Questions from Configuration
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Toolbar */}
                  <div className="flex items-center justify-between gap-3 bg-muted/40 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        <strong className="text-foreground">{acceptedCount}</strong> of {aiQuestions.length} selected
                      </span>
                      <button
                        onClick={() => {
                          const allAccepted = aiQuestions.every((q) => q.accepted);
                          setAiQuestions((prev) => prev.map((q) => ({ ...q, accepted: !allAccepted })));
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        {aiQuestions.every((q) => q.accepted) ? "Deselect All" : "Select All"}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generateQuestions.isPending} className="gap-1.5">
                        {generateQuestions.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        Regenerate
                      </Button>
                      <Button size="sm" onClick={handleAcceptSelected} disabled={acceptedCount === 0 || acceptQuestions.isPending || addToQuestionBank.isPending} className="gap-1.5">
                        {(acceptQuestions.isPending || addToQuestionBank.isPending) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        Add {acceptedCount > 0 ? `${acceptedCount} ` : ""}to Question Bank
                      </Button>
                    </div>
                  </div>

                  {/* Info banner */}
                  <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
                    <p>Review each question and select the ones you want to add to the question bank for this group. Accepted questions will be tagged to the selected group and available in surveys.</p>
                  </div>

                  {/* Question list */}
                  <div className="space-y-3">
                    {aiQuestions.map((q, i) => (
                      <div
                        key={i}
                        onClick={() => toggleQuestion(i)}
                        className={`flex gap-3 p-4 rounded-lg border cursor-pointer transition-all ${q.accepted ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-muted-foreground/40"}`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {q.accepted
                            ? <CheckCircle2 className="w-5 h-5 text-primary" />
                            : <Circle className="w-5 h-5 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground leading-snug">{q.questionText}</p>
                          <p className="text-xs text-muted-foreground mt-1 italic">{q.rationale}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className={`text-xs ${CATEGORY_COLORS[q.category] ?? ""}`}>
                              {CATEGORY_LABELS[q.category] ?? q.category}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">{QTYPE_LABELS[q.questionType] ?? q.questionType}</Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
