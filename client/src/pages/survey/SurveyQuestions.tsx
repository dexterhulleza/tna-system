import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Loader2 } from "lucide-react";
import { CATEGORY_LABELS, CATEGORY_DESCRIPTIONS, type QuestionCategory } from "@/types/tna";

const CATEGORIES: QuestionCategory[] = [
  "organizational",
  "job_task",
  "individual",
  "training_feasibility",
  "evaluation_success",
];

const CATEGORY_COLORS: Record<QuestionCategory, string> = {
  organizational: "bg-blue-500",
  job_task: "bg-purple-500",
  individual: "bg-green-500",
  training_feasibility: "bg-orange-500",
  evaluation_success: "bg-red-500",
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
  const { user } = useAuth();
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [responses, setResponses] = useState<ResponseState>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

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
    onSuccess: ({ reportId }) => {
      navigate(`/survey/${id}/report`);
    },
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
    // Save current category responses
    setIsSaving(true);
    const categoryResponses = (questions || []).map((q) => ({
      questionId: q.id,
      responseText: responses[q.id]?.responseText,
      responseValue: responses[q.id]?.responseValue,
      responseOptions: responses[q.id]?.responseOptions,
    }));

    try {
      await saveResponses.mutateAsync({
        surveyId: id,
        responses: categoryResponses,
        currentCategory,
      });
    } catch (err) {
      toast.error("Failed to save responses");
    } finally {
      setIsSaving(false);
    }

    if (currentCategoryIndex < CATEGORIES.length - 1) {
      setCurrentCategoryIndex((prev) => prev + 1);
      window.scrollTo(0, 0);
    } else {
      // Complete the survey
      setIsCompleting(true);
      completeSurvey.mutate({ surveyId: id });
    }
  };

  const handleBack = () => {
    if (currentCategoryIndex > 0) {
      setCurrentCategoryIndex((prev) => prev - 1);
      window.scrollTo(0, 0);
    } else {
      navigate("/survey/start");
    }
  };

  const progress = ((currentCategoryIndex + 1) / CATEGORIES.length) * 100;

  if (surveyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Survey not found.</p>
          <Button onClick={() => navigate("/survey/start")}>Start New Survey</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <button onClick={handleBack} className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <span className="font-display font-semibold text-foreground hidden sm:block">Training Needs Analysis</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                Category {currentCategoryIndex + 1} of {CATEGORIES.length}
              </span>
            </div>
          </div>
          <Progress value={progress} className="h-1 rounded-none" />
        </div>
      </div>

      <div className="container py-8 max-w-3xl">
        {/* Category Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-3 h-3 rounded-full ${CATEGORY_COLORS[currentCategory]}`} />
            <div className="flex gap-2">
              {CATEGORIES.map((cat, i) => (
                <div
                  key={cat}
                  className={`w-6 h-1.5 rounded-full transition-colors ${
                    i <= currentCategoryIndex ? CATEGORY_COLORS[currentCategory] : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-1">
            {CATEGORY_LABELS[currentCategory]}
          </h1>
          <p className="text-muted-foreground text-sm">{CATEGORY_DESCRIPTIONS[currentCategory]}</p>
        </div>

        {/* Questions */}
        {questionsLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : !questions || questions.length === 0 ? (
          <Card className="mb-6">
            <CardContent className="pt-6 text-center py-12">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="font-semibold text-foreground mb-1">No questions in this category</p>
              <p className="text-sm text-muted-foreground">
                No questions have been configured for this category. Click Next to continue.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {questions.map((question, idx) => (
              <Card key={question.id} className="border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center mt-0.5">
                      {idx + 1}
                    </span>
                    <div>
                      <CardTitle className="font-display text-base font-semibold text-foreground leading-snug">
                        {question.questionText}
                        {question.isRequired && <span className="text-red-500 ml-1">*</span>}
                      </CardTitle>
                      {question.helpText && (
                        <CardDescription className="mt-1 text-xs">{question.helpText}</CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Text */}
                  {question.questionType === "text" && (
                    <Textarea
                      placeholder="Enter your response..."
                      value={responses[question.id]?.responseText || ""}
                      onChange={(e) => handleResponseChange(question.id, "text", e.target.value)}
                      rows={3}
                    />
                  )}

                  {/* Yes/No */}
                  {question.questionType === "yes_no" && (
                    <RadioGroup
                      value={responses[question.id]?.responseText || ""}
                      onValueChange={(v) => handleResponseChange(question.id, "text", v)}
                      className="flex gap-4"
                    >
                      {["Yes", "No"].map((opt) => (
                        <div key={opt} className="flex items-center gap-2">
                          <RadioGroupItem value={opt} id={`${question.id}-${opt}`} />
                          <Label htmlFor={`${question.id}-${opt}`}>{opt}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}

                  {/* Multiple Choice */}
                  {question.questionType === "multiple_choice" && question.options && (
                    <RadioGroup
                      value={responses[question.id]?.responseText || ""}
                      onValueChange={(v) => handleResponseChange(question.id, "text", v)}
                      className="space-y-2"
                    >
                      {(question.options as string[]).map((opt) => (
                        <div key={opt} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                          <RadioGroupItem value={opt} id={`${question.id}-${opt}`} />
                          <Label htmlFor={`${question.id}-${opt}`} className="cursor-pointer flex-1">{opt}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}

                  {/* Checkbox */}
                  {question.questionType === "checkbox" && question.options && (
                    <div className="space-y-2">
                      {(question.options as string[]).map((opt) => (
                        <div key={opt} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                          <Checkbox
                            id={`${question.id}-${opt}`}
                            checked={(responses[question.id]?.responseOptions || []).includes(opt)}
                            onCheckedChange={(checked) => handleCheckboxChange(question.id, opt, !!checked)}
                          />
                          <Label htmlFor={`${question.id}-${opt}`} className="cursor-pointer flex-1">{opt}</Label>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Rating */}
                  {question.questionType === "rating" && (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((val) => (
                          <button
                            key={val}
                            onClick={() => handleResponseChange(question.id, "value", val)}
                            className={`w-10 h-10 rounded-lg border-2 font-semibold text-sm transition-all ${
                              responses[question.id]?.responseValue === val
                                ? "border-primary bg-primary text-white"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>1 - Not at all</span>
                        <span>5 - Fully competent</span>
                      </div>
                    </div>
                  )}

                  {/* Scale */}
                  {question.questionType === "scale" && (
                    <div className="space-y-3">
                      <Slider
                        min={question.minValue || 1}
                        max={question.maxValue || 10}
                        step={1}
                        value={[responses[question.id]?.responseValue || question.minValue || 1]}
                        onValueChange={([v]) => handleResponseChange(question.id, "value", v)}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{question.minValue || 1} - Lowest</span>
                        <span className="font-semibold text-primary text-sm">
                          Current: {responses[question.id]?.responseValue || question.minValue || 1}
                        </span>
                        <span>{question.maxValue || 10} - Highest</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-4 border-t">
          <Button variant="outline" onClick={handleBack} disabled={isSaving || isCompleting}>
            <ArrowLeft className="mr-2 w-4 h-4" />
            {currentCategoryIndex === 0 ? "Cancel" : "Previous"}
          </Button>
          <Button onClick={handleNext} disabled={isSaving || isCompleting}>
            {isSaving || isCompleting ? (
              <>
                <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                {isCompleting ? "Generating Report..." : "Saving..."}
              </>
            ) : currentCategoryIndex === CATEGORIES.length - 1 ? (
              <>
                Complete Assessment
                <CheckCircle2 className="ml-2 w-4 h-4" />
              </>
            ) : (
              <>
                Next Category
                <ArrowRight className="ml-2 w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
