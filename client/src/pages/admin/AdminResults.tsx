/**
 * Results & Analytics — ONE OBJECTIVE: Understand how your groups are performing.
 * Shows: response rates per group, category score breakdowns, top skill gaps across all groups.
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3, TrendingDown, TrendingUp, Users, AlertTriangle,
  CheckCircle2, Loader2, ChevronRight, RefreshCw, Download,
} from "lucide-react";
import { useLocation } from "wouter";
import { CATEGORY_LABELS, type QuestionCategory } from "@/types/tna";

const GAP_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  critical: { bg: "bg-red-50",    text: "text-red-700",    bar: "bg-red-500" },
  high:     { bg: "bg-orange-50", text: "text-orange-700", bar: "bg-orange-500" },
  moderate: { bg: "bg-yellow-50", text: "text-yellow-700", bar: "bg-yellow-500" },
  medium:   { bg: "bg-yellow-50", text: "text-yellow-700", bar: "bg-yellow-500" },
  low:      { bg: "bg-green-50",  text: "text-green-700",  bar: "bg-green-500" },
  none:     { bg: "bg-slate-50",  text: "text-slate-600",  bar: "bg-slate-400" },
};

const CATEGORY_COLORS: Record<string, string> = {
  organizational:       "bg-blue-500",
  job_task:             "bg-purple-500",
  individual:           "bg-green-500",
  training_feasibility: "bg-orange-500",
  evaluation_success:   "bg-red-500",
};

export default function AdminResults() {
  const [, navigate] = useLocation();
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "groups" | "gaps">("overview");

  const { data: groups, isLoading: groupsLoading } = trpc.groups.list.useQuery({ activeOnly: false });
  const { data: allReports, isLoading: reportsLoading } = trpc.reports.allReports.useQuery();

  const { data: groupAnalysis, isLoading: analysisLoading } = trpc.groups.groupAnalysis.useQuery(
    { groupId: selectedGroupId! },
    { enabled: selectedGroupId !== null }
  );

  // Aggregate stats across all groups
  const overallStats = useMemo(() => {
    if (!allReports) return null;
    const total = allReports.length;
    if (total === 0) return { total: 0, avgScore: 0, criticalCount: 0, completedGroups: 0 };
    const avgScore = Math.round(
      allReports.reduce((sum: number, r: any) => sum + parseFloat(String(r.report?.overallScore ?? 0)), 0) / total
    );
    const criticalCount = allReports.filter((r: any) => r.report?.gapLevel === "critical").length;
    const groupIds = new Set(allReports.map((r: any) => r.survey?.groupId).filter(Boolean));
    return { total, avgScore, criticalCount, completedGroups: groupIds.size };
  }, [allReports]);

  // Per-group response stats
  const groupStats = useMemo(() => {
    if (!groups || !allReports) return [];
    return groups.map((g) => {
      const groupReports = allReports.filter((r: any) => r.survey?.groupId === g.id);
      const count = groupReports.length;
      const expected = (g as any).expectedCount || 0;
      const rate = expected > 0 ? Math.min(100, Math.round((count / expected) * 100)) : null;
      const avgScore = count > 0
        ? Math.round(groupReports.reduce((s: number, r: any) => s + parseFloat(String(r.report?.overallScore ?? 0)), 0) / count)
        : 0;
      const topGapLevel = count > 0
        ? groupReports.reduce((worst: string, r: any) => {
            const levels = ["critical", "high", "moderate", "medium", "low", "none"];
            const cur = r.report?.gapLevel ?? "none";
            return levels.indexOf(cur) < levels.indexOf(worst) ? cur : worst;
          }, "none")
        : "none";
      return { ...g, count, expected, rate, avgScore, topGapLevel };
    });
  }, [groups, allReports]);

  // Top gaps across ALL reports
  const topGapsAll = useMemo(() => {
    if (!allReports) return [];
    const freq: Record<string, { count: number; category: string; totalGap: number }> = {};
    for (const r of allReports as any[]) {
      const gaps = r.report?.identifiedGaps as any[] | null;
      if (gaps) {
        for (const g of gaps) {
          const key = g.questionText || g.category;
          if (!freq[key]) freq[key] = { count: 0, category: g.category, totalGap: 0 };
          freq[key].count += 1;
          freq[key].totalGap += g.gapPercentage || 0;
        }
      }
    }
    return Object.entries(freq)
      .map(([text, d]) => ({ text, category: d.category, frequency: d.count, avgGap: Math.round(d.totalGap / d.count) }))
      .sort((a, b) => b.frequency - a.frequency || b.avgGap - a.avgGap)
      .slice(0, 10);
  }, [allReports]);

  const isLoading = groupsLoading || reportsLoading;

  return (
    <div className="space-y-6">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Results & Analytics</h1>
            <p className="text-sm text-slate-500 mt-1">
              {overallStats ? `${overallStats.total} completed assessments across ${overallStats.completedGroups} groups` : "Loading…"}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/reports")}>
            <Download className="w-4 h-4 mr-2" />
            Full Reports
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* ── SUMMARY STAT CARDS ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Responses</span>
                </div>
                <p className="text-3xl font-bold text-slate-900">{overallStats?.total ?? 0}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Avg. Score</span>
                </div>
                <p className="text-3xl font-bold text-slate-900">{overallStats?.avgScore ?? 0}%</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Critical Gaps</span>
                </div>
                <p className="text-3xl font-bold text-red-600">{overallStats?.criticalCount ?? 0}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Active Groups</span>
                </div>
                <p className="text-3xl font-bold text-slate-900">{overallStats?.completedGroups ?? 0}</p>
              </div>
            </div>

            {/* ── TABS ── */}
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
              {(["overview", "groups", "gaps"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                    activeTab === tab
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {tab === "overview" ? "Overview" : tab === "groups" ? "By Group" : "Top Gaps"}
                </button>
              ))}
            </div>

            {/* ── OVERVIEW TAB ── */}
            {activeTab === "overview" && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-slate-800">Response Rate by Group</h2>
                {groupStats.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                    <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">No groups yet. Create a survey group to see analytics.</p>
                    <Button className="mt-4" onClick={() => navigate("/admin/survey-groups/create")}>Create Group</Button>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="divide-y divide-slate-100">
                      {groupStats.map((g) => {
                        const gapColor = GAP_COLORS[g.topGapLevel] || GAP_COLORS.none;
                        return (
                          <div
                            key={g.id}
                            className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
                            onClick={() => { setSelectedGroupId(g.id); setActiveTab("groups"); }}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-semibold text-slate-900 truncate">{g.name}</p>
                                <Badge variant="outline" className={`text-xs ${gapColor.text} border-current`}>
                                  {g.topGapLevel === "none" ? "No data" : g.topGapLevel}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3">
                                <Progress
                                  value={g.rate ?? (g.count > 0 ? 100 : 0)}
                                  className="h-2 flex-1"
                                />
                                <span className="text-xs text-slate-500 flex-shrink-0 w-20 text-right">
                                  {g.count} responded{g.expected > 0 ? ` / ${g.expected}` : ""}
                                </span>
                              </div>
                            </div>
                            <div className="flex-shrink-0 text-right">
                              <p className={`text-lg font-bold ${g.avgScore >= 80 ? "text-green-600" : g.avgScore >= 60 ? "text-yellow-600" : "text-red-600"}`}>
                                {g.count > 0 ? `${g.avgScore}%` : "—"}
                              </p>
                              <p className="text-xs text-slate-400">avg score</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── BY GROUP TAB ── */}
            {activeTab === "groups" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Select
                    value={selectedGroupId ? String(selectedGroupId) : ""}
                    onValueChange={(v) => setSelectedGroupId(parseInt(v))}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select a group…" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups?.map((g) => (
                        <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedGroupId && (
                    <Button variant="ghost" size="sm" onClick={() => setSelectedGroupId(null)}>
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>

                {!selectedGroupId ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                    <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">Select a group above to see detailed analytics.</p>
                  </div>
                ) : analysisLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : !groupAnalysis || groupAnalysis.reports.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">No completed surveys for this group yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Group summary */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                      <h3 className="font-semibold text-slate-900 mb-4">{groupAnalysis.group.name} — Summary</h3>
                      <div className="grid grid-cols-3 gap-4 mb-5">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-slate-900">{groupAnalysis.reports.length}</p>
                          <p className="text-xs text-slate-500 mt-0.5">Respondents</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-slate-900">
                            {Math.round(
                              groupAnalysis.reports.reduce((s: number, r: any) => s + parseFloat(String(r.report?.overallScore ?? 0)), 0) / groupAnalysis.reports.length
                            )}%
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">Avg Score</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-red-600">
                            {groupAnalysis.reports.filter((r: any) => r.report?.gapLevel === "critical").length}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">Critical Gaps</p>
                        </div>
                      </div>

                      {/* Category score breakdown */}
                      <h4 className="text-sm font-semibold text-slate-700 mb-3">Category Score Breakdown</h4>
                      <div className="space-y-3">
                        {Object.entries(
                          groupAnalysis.reports.reduce((acc: Record<string, number[]>, r: any) => {
                            const cs = r.report?.categoryScores as Record<string, number> | null;
                            if (cs) {
                              for (const [cat, score] of Object.entries(cs)) {
                                if (!acc[cat]) acc[cat] = [];
                                acc[cat].push(score as number);
                              }
                            }
                            return acc;
                          }, {})
                        ).map(([cat, scoresRaw]) => {
                          const scores = scoresRaw as number[];
                          const avg = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
                          const barColor = CATEGORY_COLORS[cat] || "bg-slate-400";
                          return (
                            <div key={cat}>
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${barColor}`} />
                                  <span className="text-xs font-medium text-slate-700">
                                    {CATEGORY_LABELS[cat as QuestionCategory] || cat}
                                  </span>
                                </div>
                                <span className={`text-xs font-bold ${avg >= 80 ? "text-green-600" : avg >= 60 ? "text-yellow-600" : "text-red-600"}`}>
                                  {avg}%
                                </span>
                              </div>
                              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${barColor}`}
                                  style={{ width: `${avg}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Individual respondents */}
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                      <div className="px-5 py-4 border-b border-slate-100">
                        <h3 className="font-semibold text-slate-900">Individual Results</h3>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {groupAnalysis.reports.map((r: any) => {
                          const score = Math.round(parseFloat(String(r.report?.overallScore ?? 0)));
                          const gapLevel = r.report?.gapLevel || "none";
                          const gapColor = GAP_COLORS[gapLevel] || GAP_COLORS.none;
                          return (
                            <div
                              key={r.survey?.id}
                              className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 cursor-pointer"
                              onClick={() => navigate(`/survey/${r.survey?.id}/report`)}
                            >
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${gapColor.bar}`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-800 truncate">
                                  {r.user?.name || "Anonymous"}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {r.report?.createdAt
                                    ? new Date(r.report.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                    : ""}
                                </p>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <Badge variant="outline" className={`text-xs ${gapColor.text} border-current`}>
                                  {gapLevel}
                                </Badge>
                                <span className={`text-sm font-bold ${score >= 80 ? "text-green-600" : score >= 60 ? "text-yellow-600" : "text-red-600"}`}>
                                  {score}%
                                </span>
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TOP GAPS TAB ── */}
            {activeTab === "gaps" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-slate-800">Top Skill Gaps Across All Groups</h2>
                  <span className="text-xs text-slate-400">Based on {overallStats?.total ?? 0} assessments</span>
                </div>

                {topGapsAll.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                    <TrendingDown className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">No gap data yet. Complete some assessments first.</p>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="divide-y divide-slate-100">
                      {topGapsAll.map((gap, i) => {
                        const barColor = CATEGORY_COLORS[gap.category] || "bg-slate-400";
                        return (
                          <div key={i} className="px-5 py-4">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center mt-0.5">
                                  {i + 1}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-800 leading-snug">{gap.text}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <div className={`w-1.5 h-1.5 rounded-full ${barColor}`} />
                                    <span className="text-xs text-slate-500">
                                      {CATEGORY_LABELS[gap.category as QuestionCategory] || gap.category}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex-shrink-0 text-right">
                                <p className="text-sm font-bold text-red-600">{gap.avgGap}% gap</p>
                                <p className="text-xs text-slate-400">{gap.frequency} affected</p>
                              </div>
                            </div>
                            <div className="ml-9">
                              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-red-400 rounded-full"
                                  style={{ width: `${Math.min(100, gap.avgGap)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Category gap summary */}
                {topGapsAll.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-slate-700 mb-4">Gap Distribution by Category</h3>
                    <div className="space-y-3">
                      {Object.entries(
                        topGapsAll.reduce((acc: Record<string, { count: number; totalGap: number }>, g) => {
                          if (!acc[g.category]) acc[g.category] = { count: 0, totalGap: 0 };
                          acc[g.category].count += g.frequency;
                          acc[g.category].totalGap += g.avgGap;
                          return acc;
                        }, {})
                      )
                        .sort((a, b) => b[1].totalGap - a[1].totalGap)
                        .map(([cat, data]) => {
                          const barColor = CATEGORY_COLORS[cat] || "bg-slate-400";
                          const avgGap = Math.round(data.totalGap / (topGapsAll.filter(g => g.category === cat).length || 1));
                          return (
                            <div key={cat}>
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${barColor}`} />
                                  <span className="text-xs font-medium text-slate-700">
                                    {CATEGORY_LABELS[cat as QuestionCategory] || cat}
                                  </span>
                                </div>
                                <span className="text-xs font-bold text-slate-600">{data.count} occurrences</span>
                              </div>
                              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${barColor}`}
                                  style={{ width: `${Math.min(100, avgGap)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
    </div>
  );
}
