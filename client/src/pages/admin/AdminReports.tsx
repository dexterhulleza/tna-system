import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Search, FileText, Loader2, BarChart3, User, Filter, Tag, Brain, ChevronDown, ChevronUp, Users, TrendingDown, AlertTriangle, Home, LayoutDashboard, ChevronRight, Target, Building2, ListChecks, RefreshCw, Download, Clock } from "lucide-react";
import ReactMarkdown from "react-markdown";

const GAP_LEVEL_CONFIG: Record<string, { color: string; label: string }> = {
  critical: { color: "bg-red-100 text-red-700 border-red-200", label: "Critical" },
  high: { color: "bg-orange-100 text-orange-700 border-orange-200", label: "High" },
  moderate: { color: "bg-yellow-100 text-yellow-700 border-yellow-200", label: "Moderate" },
  low: { color: "bg-green-100 text-green-700 border-green-200", label: "Low" },
  none: { color: "bg-gray-100 text-gray-700 border-gray-200", label: "None" },
};

// ─── Group Analysis Card ───────────────────────────────────────────────────────
function GroupAnalysisCard({ group }: { group: { id: number; name: string; code: string; description: string | null } }) {
  const [expanded, setExpanded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);
  const [, navigate] = useLocation();
  const prevDataRef = useRef<any>(undefined);

  const { data, isLoading, error } = trpc.groups.groupAnalysis.useQuery(
    { groupId: group.id },
    {
      enabled: expanded,
      staleTime: refreshKey === 0 ? 5 * 60 * 1000 : 0,
    }
  );

  useEffect(() => {
    if (data && data !== prevDataRef.current && data.analysis) {
      setLastGenerated(new Date());
      prevDataRef.current = data;
    }
  }, [data]);

  const handleRegenerate = () => {
    setRefreshKey((k) => k + 1);
    prevDataRef.current = undefined;
  };

  const handleExport = () => {
    if (!data?.analysis) return;
    const header = `# TESDA Training Needs Analysis Report\n## Group: ${group.name} (${group.code})\n### Generated: ${new Date().toLocaleString()}\n\n---\n\n`;
    const content = header + data.analysis;
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `TNA_Report_${group.code}_${new Date().toISOString().split("T")[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Tag className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="font-display text-base">{group.name}</CardTitle>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-xs">{group.code}</Badge>
                {group.description && (
                  <span className="text-xs text-muted-foreground">{group.description}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {expanded && data?.analysis && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={handleExport}
                  title="Export as Markdown"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={handleRegenerate}
                  disabled={isLoading}
                  title="Regenerate analysis"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Regenerate</span>
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={() => setExpanded((e) => !e)}
            >
              <Brain className="w-3.5 h-3.5 text-primary" />
              {expanded ? "Hide Analysis" : "View Analysis"}
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3 py-10 justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Generating TESDA-aligned analysis...</p>
                <p className="text-xs text-muted-foreground mt-1">This may take 30–60 seconds. The AI is analyzing all 9 framework dimensions.</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-sm text-destructive py-4 px-3 bg-destructive/5 rounded-lg">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Failed to load analysis. Please try again.</span>
            </div>
          ) : !data ? null : data.reports.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">No completed surveys in this group yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Respondents must complete the survey and be tagged to this group before analysis can be generated.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Survey Configuration Context */}
              {((data.stats as any)?.surveyTitle || (data.stats as any)?.surveyPurpose || ((data.stats as any)?.surveyObjectives?.length > 0) || (data.stats as any)?.organizationName) && (
                <div className="border rounded-xl p-4 bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                  <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Survey Configuration &amp; Objectives
                  </h4>
                  <div className="space-y-2 text-sm">
                    {(data.stats as any)?.surveyTitle && (
                      <div><span className="font-medium text-foreground">Survey Title:</span> <span className="text-muted-foreground ml-1">{(data.stats as any).surveyTitle}</span></div>
                    )}
                    {(data.stats as any)?.organizationName && (
                      <div className="flex items-start gap-1.5"><Building2 className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" /><span className="font-medium text-foreground">Organization:</span> <span className="text-muted-foreground ml-1">{(data.stats as any).organizationName}</span></div>
                    )}
                    {(data.stats as any)?.industryContext && (
                      <div><span className="font-medium text-foreground">Industry:</span> <span className="text-muted-foreground ml-1">{(data.stats as any).industryContext}</span></div>
                    )}
                    {(data.stats as any)?.surveyPurpose && (
                      <div><span className="font-medium text-foreground">Purpose:</span> <span className="text-muted-foreground ml-1">{(data.stats as any).surveyPurpose}</span></div>
                    )}
                    {((data.stats as any)?.surveyObjectives?.length > 0) && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1"><ListChecks className="w-3.5 h-3.5 text-muted-foreground" /><span className="font-medium text-foreground">Survey Objectives:</span></div>
                        <ul className="ml-5 list-disc space-y-0.5">
                          {((data.stats as any).surveyObjectives as string[]).map((obj: string, i: number) => (
                            <li key={i} className="text-muted-foreground">{obj}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {((data.stats as any)?.businessGoals?.length > 0) && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1"><Target className="w-3.5 h-3.5 text-muted-foreground" /><span className="font-medium text-foreground">Business Goals:</span></div>
                        <ul className="ml-5 list-disc space-y-0.5">
                          {((data.stats as any).businessGoals as string[]).map((goal: string, i: number) => (
                            <li key={i} className="text-muted-foreground">{goal}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {((data.stats as any)?.priorityAreas?.length > 0) && (
                      <div><span className="font-medium text-foreground">Priority Areas:</span> <span className="text-muted-foreground ml-1">{((data.stats as any).priorityAreas as string[]).join(", ")}</span></div>
                    )}
                    {(data.stats as any)?.targetParticipants && (
                      <div><span className="font-medium text-foreground">Target Participants:</span> <span className="text-muted-foreground ml-1">{(data.stats as any).targetParticipants}</span></div>
                    )}
                    {(data.stats as any)?.knownSkillGaps && (
                      <div><span className="font-medium text-foreground">Known Skill Gaps:</span> <span className="text-muted-foreground ml-1">{(data.stats as any).knownSkillGaps}</span></div>
                    )}
                    {(data.stats as any)?.regulatoryRequirements && (
                      <div><span className="font-medium text-foreground">Regulatory Requirements:</span> <span className="text-muted-foreground ml-1">{(data.stats as any).regulatoryRequirements}</span></div>
                    )}
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-muted/40 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Respondents</p>
                  <p className="text-xl font-bold font-display text-foreground mt-1">{data.stats?.totalRespondents ?? 0}</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg. Score</p>
                  <p className="text-xl font-bold font-display text-foreground mt-1">{data.stats?.averageScore ?? 0}%</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Critical Gap</p>
                  <p className="text-xl font-bold font-display text-red-600 mt-1">{(data.stats?.gapDistribution as any)?.["critical"] ?? 0}</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">High Gap</p>
                  <p className="text-xl font-bold font-display text-orange-600 mt-1">{(data.stats?.gapDistribution as any)?.["high"] ?? 0}</p>
                </div>
              </div>

              {/* Top Gaps */}
              {(data.stats?.topGaps?.length ?? 0) > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4 text-red-500" />
                    Most Common Training Gaps
                  </h4>
                  <div className="space-y-2">
                    {(data.stats?.topGaps ?? []).map((gap: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold shrink-0">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground truncate">{gap.questionText}</p>
                          <p className="text-xs text-muted-foreground capitalize">{gap.category.replace(/_/g, " ")}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-semibold text-red-600">{gap.avgGapPercentage}% gap</p>
                          <p className="text-xs text-muted-foreground">{gap.frequency} respondents</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Category Scores */}
              {Object.keys(data.stats?.avgCategoryScores ?? {}).length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    Average Category Scores
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(data.stats?.avgCategoryScores ?? {}).map(([cat, score]) => (
                      <div key={cat} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-40 shrink-0 capitalize">{cat.replace(/_/g, " ")}</span>
                        <div className="flex-1 bg-muted rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-primary transition-all"
                            style={{ width: `${Math.min(score as number, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-foreground w-10 text-right">{score as number}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TESDA-Aligned Training Action Plan */}
              {data.analysis ? (
                <div className="border rounded-xl overflow-hidden">
                  <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-5 py-3 border-b flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Brain className="w-4 h-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-foreground">TESDA-Aligned Training Action Plan</h4>
                        <p className="text-xs text-muted-foreground hidden sm:block">AI-generated · TESDA/NTESDP framework · 9-section structured analysis</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {lastGenerated && (
                        <span className="text-xs text-muted-foreground items-center gap-1 hidden sm:flex">
                          <Clock className="w-3 h-3" />
                          {lastGenerated.toLocaleTimeString()}
                        </span>
                      )}
                      <Badge variant="secondary" className="text-xs">AI-Generated</Badge>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="
                      prose prose-sm max-w-none
                      text-foreground
                      [&_h2]:font-bold [&_h2]:text-[0.95rem] [&_h2]:mt-7 [&_h2]:mb-3
                      [&_h2]:pb-2 [&_h2]:border-b [&_h2]:border-border
                      [&_h2]:text-foreground [&_h2:first-child]:mt-0
                      [&_h3]:font-semibold [&_h3]:text-sm [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-foreground
                      [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-foreground/90 [&_p]:mb-3
                      [&_ul]:text-sm [&_ul]:space-y-1.5 [&_ul]:my-2 [&_ul]:pl-5 [&_ul]:list-disc
                      [&_ol]:text-sm [&_ol]:space-y-1.5 [&_ol]:my-2 [&_ol]:pl-5 [&_ol]:list-decimal
                      [&_li]:text-foreground/90 [&_li]:leading-relaxed
                      [&_strong]:font-semibold [&_strong]:text-foreground
                      [&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:py-1 [&_blockquote]:text-muted-foreground [&_blockquote]:italic [&_blockquote]:my-3
                      [&_table]:text-xs [&_table]:w-full [&_table]:my-3 [&_table]:border-collapse
                      [&_th]:text-left [&_th]:font-semibold [&_th]:pb-2 [&_th]:border-b [&_th]:border-border [&_th]:pr-4 [&_th]:py-2
                      [&_td]:py-1.5 [&_td]:border-b [&_td]:border-border/50 [&_td]:pr-4
                      [&_hr]:border-border [&_hr]:my-4
                    ">
                      <ReactMarkdown>{data.analysis}</ReactMarkdown>
                    </div>
                  </div>
                  <div className="px-5 pb-4 flex items-center justify-between border-t pt-3 bg-muted/20">
                    <p className="text-xs text-muted-foreground">
                      This report follows the TESDA/NTESDP framework and covers all 9 TNA dimensions.
                    </p>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
                      <Download className="w-3.5 h-3.5" />
                      Export Report
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border rounded-xl p-4 bg-muted/30 text-center">
                  <AlertTriangle className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">AI analysis could not be generated at this time.</p>
                </div>
              )}

              {/* Individual Reports */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  Individual Reports ({data.reports.length})
                </h4>
                <div className="space-y-2">
                  {data.reports.map((item: any) => {
                    const gapConfig = item.report.gapLevel ? GAP_LEVEL_CONFIG[item.report.gapLevel] : null;
                    return (
                      <div key={item.report.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card">
                        <div className="flex items-center gap-2 min-w-0">
                          <User className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{item.user?.name || "Anonymous"}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {item.sector && <span className="text-xs text-muted-foreground">{item.sector.name}</span>}
                              {gapConfig && (
                                <Badge variant="outline" className={`text-xs ${gapConfig.color}`}>
                                  {gapConfig.label}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                Score: {Math.round(parseFloat(String(item.report.overallScore || 0)))}%
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="shrink-0"
                          onClick={() => navigate(`/survey/${item.report.surveyId}/report`)}
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function AdminReports() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [filterGap, setFilterGap] = useState("all");

  const { data: reports, isLoading } = trpc.reports.allReports.useQuery();
  const { data: groups } = trpc.groups.list.useQuery({ activeOnly: true });

  const filtered = reports?.filter((item: any) => {
    const matchSearch = !search ||
      item.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.sector?.name?.toLowerCase().includes(search.toLowerCase());
    const matchGap = filterGap === "all" || item.report.gapLevel === filterGap;
    return matchSearch && matchGap;
  }) || [];

  const totalReports = reports?.length || 0;
  const criticalCount = reports?.filter((r: any) => r.report.gapLevel === "critical").length || 0;
  const highCount = reports?.filter((r: any) => r.report.gapLevel === "high").length || 0;
  const avgScore = reports && reports.length > 0
    ? Math.round(reports.reduce((acc: number, r: any) => acc + parseFloat(String(r.report.overallScore || 0)), 0) / reports.length)
    : 0;

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <button onClick={() => navigate("/")} className="flex items-center gap-1 hover:text-foreground transition-colors">
          <Home className="w-3.5 h-3.5" /><span>Home</span>
        </button>
        <ChevronRight className="w-3.5 h-3.5" />
        <button onClick={() => navigate("/admin")} className="flex items-center gap-1 hover:text-foreground transition-colors">
          <LayoutDashboard className="w-3.5 h-3.5" /><span>Admin Dashboard</span>
        </button>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">All Reports</span>
      </nav>
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">All Reports</h1>
        <p className="text-muted-foreground text-sm mt-1">View all TNA reports and AI-generated TESDA-aligned group analysis</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Reports</p>
            <p className="text-2xl font-bold font-display text-foreground mt-1">{totalReports}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Critical Gap</p>
            <p className="text-2xl font-bold font-display text-red-600 mt-1">{criticalCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">High Gap</p>
            <p className="text-2xl font-bold font-display text-orange-600 mt-1">{highCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg. Score</p>
            <p className="text-2xl font-bold font-display text-foreground mt-1">{avgScore}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all" className="gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            All Reports
          </TabsTrigger>
          <TabsTrigger value="groups" className="gap-1.5">
            <Tag className="w-3.5 h-3.5" />
            Group Analysis
            {groups && groups.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">{groups.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* All Reports Tab */}
        <TabsContent value="all" className="mt-4">
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search by user or sector..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={filterGap} onValueChange={setFilterGap}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="All Gap Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Gap Levels</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="secondary">{filtered.length} reports</Badge>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.length === 0 && (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <BarChart3 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">No reports found.</p>
                    </CardContent>
                  </Card>
                )}
                {filtered.map((item: any) => {
                  const report = item.report;
                  const user = item.user;
                  const sector = item.sector;
                  const groupName = item.group?.name;
                  const gapConfig = report.gapLevel ? GAP_LEVEL_CONFIG[report.gapLevel] : null;

                  return (
                    <Card key={report.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-foreground">{user?.name || "Anonymous"}</span>
                                {sector && <Badge variant="secondary" className="text-xs">{sector.name}</Badge>}
                                {gapConfig && (
                                  <Badge variant="outline" className={`text-xs ${gapConfig.color}`}>
                                    {gapConfig.label} Gap
                                  </Badge>
                                )}
                                {groupName && (
                                  <Badge className="text-xs bg-teal-50 text-teal-700 border border-teal-200 gap-1">
                                    <Tag className="w-3 h-3" />
                                    {groupName}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span>{user?.email || "No email"}</span>
                                <span>Score: {Math.round(parseFloat(String(report.overallScore || 0)))}%</span>
                                <span>{new Date(report.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
                              </div>
                            </div>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => navigate(`/survey/${report.surveyId}/report`)}>
                            <FileText className="mr-1 w-3 h-3" />
                            View
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Group Analysis Tab */}
        <TabsContent value="groups" className="mt-4">
          <div className="space-y-4">
            {/* Explanation Banner */}
            <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
              <CardContent className="pt-4 pb-3">
                <div className="flex gap-3">
                  <Brain className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-foreground mb-1">AI-Powered TESDA/NTESDP Group Analysis</p>
                    <p className="text-muted-foreground leading-relaxed">
                      Click <strong>"View Analysis"</strong> on any group to generate a comprehensive Training Action Plan
                      aligned with the <strong>TESDA/NTESDP framework</strong>. The report covers all 9 dimensions:
                      Industry Profile &amp; Context, Occupational Mapping, Competency Gap Analysis, Skills Categorization (Basic/Common/Core),
                      Technology &amp; Equipment Requirements, Training Priority Matrix, Training Beneficiaries,
                      Training Delivery Mode Analysis, and a <strong>Training Plan Output table</strong> with implementation timeline and success metrics.
                      Use the <strong>Export</strong> button to download the report as a Markdown file, or <strong>Regenerate</strong> to refresh the analysis with the latest data.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {!groups || groups.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Tag className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-foreground">No groups created yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Create group tags in <strong>Manage Groups</strong> to start organizing respondents into cohorts.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {groups.map((group) => (
                  <GroupAnalysisCard key={group.id} group={group} />
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
