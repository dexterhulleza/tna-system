import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserCheck, ClipboardCheck, CheckCircle2, Clock, ChevronRight, ArrowLeft, Save } from "lucide-react";

function ProgressBadge({ validated, total }: { validated: number; total: number }) {
  const pct = total > 0 ? Math.round((validated / total) * 100) : 0;
  const color = pct === 100 ? "bg-green-100 text-green-800" : pct > 0 ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>
      {pct === 100 ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
      {validated}/{total} validated
    </span>
  );
}

export default function AdminSupervisorValidation() {
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [selectedSurveyId, setSelectedSurveyId] = useState<number | null>(null);
  const [scores, setScores] = useState<Record<number, { score: number; notes: string }>>({});
  const [submitting, setSubmitting] = useState(false);

  const { data: groups } = trpc.groups.list.useQuery({ activeOnly: true });
  const { data: groupSurveys, isLoading: loadingGroup, refetch: refetchGroup } = trpc.supervisorValidation.groupSurveys.useQuery(
    { groupId: Number(selectedGroup) },
    { enabled: !!selectedGroup }
  );
  const { data: surveyDetail, isLoading: loadingDetail, refetch: refetchDetail } = trpc.supervisorValidation.getSurveyForValidation.useQuery(
    { surveyId: selectedSurveyId! },
    { enabled: selectedSurveyId != null }
  );

  const submitMutation = trpc.supervisorValidation.submitScores.useMutation({
    onSuccess: (data) => {
      toast.success(`Saved ${data.count} supervisor scores`);
      refetchDetail();
      refetchGroup();
    },
    onError: (e) => toast.error(e.message),
  });

  const groupList = (groups as any[]) ?? [];
  const surveys = (groupSurveys ?? []) as any[];
  const responses = (surveyDetail?.responses ?? []) as any[];
  const progress = surveyDetail?.progress ?? { total: 0, validated: 0 };

  function initScores() {
    const initial: Record<number, { score: number; notes: string }> = {};
    for (const r of responses) {
      initial[r.response.id] = {
        score: r.response.supervisorScore ?? r.response.responseValue ?? 3,
        notes: r.response.supervisorNotes ?? "",
      };
    }
    setScores(initial);
  }

  React.useEffect(() => {
    if (responses.length > 0) initScores();
  }, [surveyDetail]);

  async function handleSubmit() {
    if (!selectedSurveyId) return;
    setSubmitting(true);
    try {
      await submitMutation.mutateAsync({
        surveyId: selectedSurveyId,
        scores: Object.entries(scores).map(([id, s]) => ({
          responseId: Number(id),
          supervisorScore: s.score,
          supervisorNotes: s.notes || null,
        })),
      });
    } finally {
      setSubmitting(false);
    }
  }

  const selectedSurveyInfo = surveys.find((s: any) => s.survey?.id === selectedSurveyId);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserCheck className="h-6 w-6 text-primary" />
          Supervisor Validation
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Review respondents' self-assessments and provide supervisor scores. These are factored into the weighted composite score based on the Scoring Weights configuration.
        </p>
      </div>

      {/* Survey detail view */}
      {selectedSurveyId != null ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSelectedSurveyId(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to list
            </Button>
            <div className="flex-1">
              <span className="font-semibold">{selectedSurveyInfo?.user?.name ?? "Respondent"}</span>
              <span className="text-muted-foreground text-sm ml-2">— {selectedSurveyInfo?.user?.email}</span>
            </div>
            <ProgressBadge validated={progress.validated} total={progress.total} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Progress value={progress.total > 0 ? (progress.validated / progress.total) * 100 : 0} className="w-48 h-2" />
              <p className="text-xs text-muted-foreground mt-1">{progress.validated} of {progress.total} responses validated</p>
            </div>
            <Button onClick={handleSubmit} disabled={submitting || responses.length === 0}>
              <Save className="h-4 w-4 mr-2" />
              {submitting ? "Saving..." : "Save All Scores"}
            </Button>
          </div>

          {loadingDetail ? (
            <div className="text-center py-8 text-muted-foreground">Loading responses...</div>
          ) : responses.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">No responses found for this survey.</CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {responses.map(({ response, question }: any) => {
                if (!question) return null;
                const s = scores[response.id] ?? { score: response.responseValue ?? 3, notes: "" };
                const maxVal = question.maxValue ?? 5;
                const minVal = question.minValue ?? 1;
                const selfPct = maxVal > minVal
                  ? Math.round(((response.responseValue ?? minVal) - minVal) / (maxVal - minVal) * 100)
                  : 60;
                const supPct = s.score;
                const diff = supPct - selfPct;

                return (
                  <Card key={response.id}>
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{question.questionText}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{question.category}</Badge>
                            {response.supervisorValidatedAt && (
                              <span className="text-xs text-green-600 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Validated
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Self: </span>
                              <span className="font-medium">{selfPct}%</span>
                              {response.responseText && <span className="text-muted-foreground ml-1">({response.responseText})</span>}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Supervisor: </span>
                              <span className={`font-medium ${diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : ""}`}>
                                {supPct}%
                              </span>
                              {diff !== 0 && (
                                <span className={`text-xs ml-1 ${diff > 0 ? "text-green-600" : "text-red-600"}`}>
                                  ({diff > 0 ? "+" : ""}{diff}%)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0 space-y-2 w-44">
                          <div>
                            <Label className="text-xs">Score (0–100)</Label>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={s.score}
                              onChange={(e) => setScores(prev => ({
                                ...prev,
                                [response.id]: { ...s, score: Math.min(100, Math.max(0, Number(e.target.value))) }
                              }))}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Notes (optional)</Label>
                            <Textarea
                              value={s.notes}
                              onChange={(e) => setScores(prev => ({
                                ...prev,
                                [response.id]: { ...s, notes: e.target.value }
                              }))}
                              rows={2}
                              className="text-xs resize-none"
                              placeholder="Observation..."
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {responses.length > 0 && (
            <div className="flex justify-end pt-2">
              <Button onClick={handleSubmit} disabled={submitting}>
                <Save className="h-4 w-4 mr-2" />
                {submitting ? "Saving..." : "Save All Scores"}
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* Survey list view */
        <div className="space-y-4">
          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select group..." />
            </SelectTrigger>
            <SelectContent>
              {groupList.map((g: any) => (
                <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!selectedGroup ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <UserCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Select a group to view surveys pending validation</p>
              </CardContent>
            </Card>
          ) : loadingGroup ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : surveys.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <ClipboardCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No completed surveys in this group yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {surveys.map((s: any) => {
                const { survey, user, report, validationProgress } = s;
                if (!survey) return null;
                const { total, validated } = validationProgress ?? { total: 0, validated: 0 };
                const pct = total > 0 ? Math.round((validated / total) * 100) : 0;
                return (
                  <Card
                    key={survey.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedSurveyId(survey.id)}
                  >
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{user?.name ?? "Unknown"}</div>
                          <div className="text-xs text-muted-foreground">{user?.email}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <ProgressBadge validated={validated} total={total} />
                            <Progress value={pct} className="w-24 h-1.5" />
                            <span className="text-xs text-muted-foreground">{pct}%</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {pct === 100 ? (
                            <Badge className="bg-green-100 text-green-800">Complete</Badge>
                          ) : pct > 0 ? (
                            <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>
                          ) : (
                            <Badge variant="outline">Not Started</Badge>
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
