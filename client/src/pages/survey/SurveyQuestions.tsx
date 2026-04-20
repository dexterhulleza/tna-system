/**
 * Survey Questions — ONE OBJECTIVE: Answer the current section's questions.
 * Rules: full-screen distraction-free · sticky progress bar at top · sticky nav at bottom
 * One category section at a time. No sidebar. No decorative content.
 */
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, ListChecks, Save } from "lucide-react";
import { CATEGORY_LABELS, CATEGORY_DESCRIPTIONS, type QuestionCategory } from "@/types/tna";

const CATEGORIES: QuestionCategory[] = [
  "organizational",
  "job_task",
  "individual",
  "training_feasibility",
  "evaluation_success",
];

const CATEGORY_ACCENT: Record<QuestionCategory, string> = {
  organizational:       "bg-blue-500",
  job_task:             "bg-purple-500",
  individual:           "bg-green-500",
  training_feasibility: "bg-orange-500",
  evaluation_success:   "bg-red-500",
};

const CATEGORY_LIGHT: Record<QuestionCategory, string> = {
  organizational:       "bg-blue-50 text-blue-700",
  job_task:             "bg-purple-50 text-purple-700",
  individual:           "bg-green-50 text-green-700",
  training_feasibility: "bg-orange-50 text-orange-700",
  evaluation_success:   "bg-red-50 text-red-700",
};

type ResponseState = {
  [questionId: number]: {
    responseText?: string;
    responseValue?: number;
    responseOptions?: string[];
  };
};

export default function SurveyQuestions() {
  const { surveyId } = useParams<{ surveyId: string }>();
  const [, navigate] = useLocation();
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [responses, setResponses] = useState<ResponseState>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const id = parseInt(surveyId || "0");
  const currentCategory = CATEGORIES[currentCategoryIndex];

  const { data: survey, isLoading: surveyLoading } = trpc.surveys.getById.useQuery({ id });

  const { data: questions, isLoading: questionsLoading } = trpc.questions.list.useQuery(
    {
      sectorId: survey?.sectorId ?? null,
      skillAreaId: survey?.skillAreaId ?? null,
      category: currentCategory,
      activeOnly: true,
    },
    { enabled: !!survey }
  );

  const saveResponses = trpc.surveys.saveResponses.useMutation();
  const completeSurvey = trpc.surveys.complete.useMutation({
    onSuccess: () => navigate(`/survey/${id}/report`),
    onError: (err) => {
      toast.error(err.message || "Failed to complete survey");
      setIsCompleting(false);
    },
  });

  const handleResponseChange = (
    questionId: number,
    type: "text" | "value" | "options",
    value: string | number | string[]
  ) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        ...(type === "text" ? { responseText: value as string } : {}),
        ...(type === "value" ? { responseValue: value as number } : {}),
        ...(type === "options" ? { responseOptions: value as string[] } : {}),
      },
    }));
  };

  const handleCheckboxChange = (questionId: number, option: string, checked: boolean) => {
    const current = responses[questionId]?.responseOptions || [];
    const updated = checked ? [...current, option] : current.filter((o) => o !== option);
    handleResponseChange(questionId, "options", updated);
  };

  const handleNext = async () => {
    setIsSaving(true);
    const categoryResponses = (questions || []).map((q) => ({
      questionId: q.id,
      responseText: responses[q.id]?.responseText,
      responseValue: responses[q.id]?.responseValue,
      responseOptions: responses[q.id]?.responseOptions,
    }));

    setAutoSaveStatus("saving");
    try {
      await saveResponses.mutateAsync({ surveyId: id, responses: categoryResponses, currentCategory });
    } catch {
      toast.error("Failed to save responses");
      setIsSaving(false);
      setAutoSaveStatus("idle");
      return;
    }
    setAutoSaveStatus("saved");
    setTimeout(() => setAutoSaveStatus("idle"), 2500);
    setIsSaving(false);

    if (currentCategoryIndex < CATEGORIES.length - 1) {
      setCurrentCategoryIndex((prev) => prev + 1);
      window.scrollTo(0, 0);
    } else {
      // Show review screen before final submit
      setShowReview(true);
    }
  };

  const handleFinalSubmit = () => {
    setIsCompleting(true);
    completeSurvey.mutate({ surveyId: id });
  };

  const handleBack = () => {
    if (currentCategoryIndex > 0) {
      setCurrentCategoryIndex((prev) => prev - 1);
      window.scrollTo(0, 0);
    } else {
      navigate("/survey/start");
    }
  };

  const isLastCategory = currentCategoryIndex === CATEGORIES.length - 1;
  const progressPct = ((currentCategoryIndex + 1) / CATEGORIES.length) * 100;
  const answeredCount = Object.keys(responses).length;

  // ── REVIEW SCREEN ──
  if (showReview) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
          <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto w-full">
            <button onClick={() => setShowReview(false)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Questions
            </button>
            <span className="text-sm font-semibold text-slate-700">Review Answers</span>
            <span className="text-xs text-slate-400">{answeredCount} answered</span>
          </div>
        </header>
        <main className="flex-1 px-4 py-8 pb-28 max-w-2xl mx-auto w-full">
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <p className="text-sm font-medium text-blue-800">All sections complete. Review below then submit.</p>
            </div>
            {CATEGORIES.map((cat, i) => (
              <div key={cat} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${CATEGORY_ACCENT[cat]}`} />
                    <span className="text-sm font-semibold text-slate-800">{CATEGORY_LABELS[cat]}</span>
                  </div>
                  <button onClick={() => { setShowReview(false); setCurrentCategoryIndex(i); window.scrollTo(0,0); }} className="text-xs text-primary hover:underline">Edit</button>
                </div>
                <div className="px-4 py-3">
                  <p className="text-xs text-slate-500">{CATEGORY_DESCRIPTIONS[cat]}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-xs text-green-700">Section completed</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-slate-200 px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
            <Button variant="outline" onClick={() => setShowReview(false)}>
              <ArrowLeft className="w-4 h-4 mr-1.5" />Back
            </Button>
            <Button onClick={handleFinalSubmit} disabled={isCompleting} className="flex-1 max-w-xs">
              {isCompleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-1.5" />Submit Assessment</>}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (surveyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <p className="text-slate-500">Survey not found.</p>
          <Button onClick={() => navigate("/survey/start")}>Start New Survey</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* STICKY TOP BAR — progress only, no clutter */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between px-4 h-13 py-3 max-w-2xl mx-auto w-full">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>

          {/* Section dots */}
          <div className="flex items-center gap-1.5">
            {CATEGORIES.map((cat, i) => (
              <div
                key={cat}
                className={`h-1.5 rounded-full transition-all ${
                  i < currentCategoryIndex
                    ? "w-4 bg-primary"
                    : i === currentCategoryIndex
                    ? "w-6 bg-primary"
                    : "w-4 bg-slate-200"
                }`}
              />
            ))}
          </div>

          <span className="text-xs text-slate-500 font-medium">
            {currentCategoryIndex + 1} / {CATEGORIES.length}
          </span>
        </div>
        {/* Thin progress line */}
        <div className="h-0.5 bg-slate-100">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </header>

      {/* CONTENT */}
      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full pb-32">

        {/* Section label */}
        <div className="mb-6">
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${CATEGORY_LIGHT[currentCategory]}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${CATEGORY_ACCENT[currentCategory]}`} />
            {CATEGORY_LABELS[currentCategory]}
          </span>
          <h1 className="text-xl font-bold text-slate-900 mt-3 leading-snug">
            {CATEGORY_DESCRIPTIONS[currentCategory]}
          </h1>
        </div>

        {/* Questions */}
        {questionsLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-slate-200 animate-pulse" />
            ))}
          </div>
        ) : !questions || questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-500 mb-3" />
            <p className="font-semibold text-slate-700">No questions in this section</p>
            <p className="text-sm text-slate-500 mt-1">Click Next to continue to the next section.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {questions.map((question, idx) => (
              <div key={question.id} className="bg-white rounded-xl border border-slate-200 p-5">
                {/* Question header */}
                <div className="flex items-start gap-3 mb-4">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center mt-0.5">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 leading-snug">
                      {question.questionText}
                      {question.isRequired && <span className="text-red-500 ml-1">*</span>}
                    </p>
                    {question.helpText && (
                      <p className="text-xs text-slate-500 mt-1">{question.helpText}</p>
                    )}
                  </div>
                </div>

                {/* Answer area */}
                <div className="ml-9">
                  {question.questionType === "text" && (
                    <Textarea
                      placeholder="Type your answer here…"
                      value={responses[question.id]?.responseText || ""}
                      onChange={(e) => handleResponseChange(question.id, "text", e.target.value)}
                      rows={3}
                      className="bg-slate-50 border-slate-200 text-sm resize-none"
                    />
                  )}

                  {question.questionType === "yes_no" && (
                    <RadioGroup
                      value={responses[question.id]?.responseText || ""}
                      onValueChange={(v) => handleResponseChange(question.id, "text", v)}
                      className="flex gap-3"
                    >
                      {["Yes", "No"].map((opt) => (
                        <label
                          key={opt}
                          htmlFor={`${question.id}-${opt}`}
                          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border-2 cursor-pointer transition-all text-sm font-medium ${
                            responses[question.id]?.responseText === opt
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-slate-200 hover:border-slate-300 text-slate-700"
                          }`}
                        >
                          <RadioGroupItem value={opt} id={`${question.id}-${opt}`} className="sr-only" />
                          {opt}
                        </label>
                      ))}
                    </RadioGroup>
                  )}

                  {question.questionType === "multiple_choice" && question.options && (
                    <RadioGroup
                      value={responses[question.id]?.responseText || ""}
                      onValueChange={(v) => handleResponseChange(question.id, "text", v)}
                      className="space-y-2"
                    >
                      {(question.options as string[]).map((opt) => (
                        <label
                          key={opt}
                          htmlFor={`${question.id}-${opt}`}
                          className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all text-sm ${
                            responses[question.id]?.responseText === opt
                              ? "border-primary bg-primary/5 text-primary font-medium"
                              : "border-slate-200 hover:border-slate-300 text-slate-700"
                          }`}
                        >
                          <RadioGroupItem value={opt} id={`${question.id}-${opt}`} className="sr-only" />
                          {opt}
                        </label>
                      ))}
                    </RadioGroup>
                  )}

                  {question.questionType === "checkbox" && question.options && (
                    <div className="space-y-2">
                      {(question.options as string[]).map((opt) => {
                        const checked = (responses[question.id]?.responseOptions || []).includes(opt);
                        return (
                          <label
                            key={opt}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all text-sm ${
                              checked
                                ? "border-primary bg-primary/5 text-primary font-medium"
                                : "border-slate-200 hover:border-slate-300 text-slate-700"
                            }`}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(c) => handleCheckboxChange(question.id, opt, !!c)}
                              className="flex-shrink-0"
                            />
                            {opt}
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {question.questionType === "rating" && (
                    <div className="space-y-3">
                      <Slider
                        min={1}
                        max={5}
                        step={1}
                        value={[responses[question.id]?.responseValue ?? 3]}
                        onValueChange={([v]) => handleResponseChange(question.id, "value", v)}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>1 — Not at all</span>
                        <span className="font-semibold text-primary text-sm">
                          {responses[question.id]?.responseValue ?? 3}
                        </span>
                        <span>5 — Fully</span>
                      </div>
                    </div>
                  )}

                  {question.questionType === "scale" && (
                    <div className="space-y-3">
                      <Slider
                        min={1}
                        max={10}
                        step={1}
                        value={[responses[question.id]?.responseValue ?? 5]}
                        onValueChange={([v]) => handleResponseChange(question.id, "value", v)}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>1 — Low</span>
                        <span className="font-semibold text-primary text-sm">
                          {responses[question.id]?.responseValue ?? 5}
                        </span>
                        <span>10 — High</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* STICKY BOTTOM NAV — always visible primary action */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-slate-200 px-4 py-3 safe-area-pb">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={isSaving || isCompleting}
            className="flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back
          </Button>

          <div className="flex-1 flex justify-center">
            <span className="text-xs text-slate-400 font-medium">
              {CATEGORY_LABELS[currentCategory]}
            </span>
          </div>

          <Button
            onClick={handleNext}
            disabled={isSaving || isCompleting}
            className="flex-shrink-0 min-w-[120px]"
          >
            {isSaving || isCompleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isLastCategory ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Submit
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
