import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Search, FileText, Loader2, BarChart3, User, Filter, Tag, Brain,
  ChevronDown, ChevronUp, Users, TrendingDown, AlertTriangle, Home,
  LayoutDashboard, ChevronRight, Target, Building2, ListChecks,
  RefreshCw, Download, CheckCircle2, Sparkles, Lock, Zap,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

const GAP_LEVEL_CONFIG: Record<string, { color: string; label: string }> = {
  critical: { color: "bg-red-100 text-red-700 border-red-200", label: "Critical" },
  high: { color: "bg-orange-100 text-orange-700 border-orange-200", label: "High" },
  moderate: { color: "bg-yellow-100 text-yellow-700 border-yellow-200", label: "Moderate" },
  low: { color: "bg-green-100 text-green-700 border-green-200", label: "Low" },
  none: { color: "bg-gray-100 text-gray-700 border-gray-200", label: "None" },
};

const SECTIONS = [
  { key: "industry_profile",       title: "Industry Profile & Context",          icon: "🏭", description: "Industry direction, future skills demand, regulatory context" },
  { key: "occupational_mapping",   title: "Occupational Mapping",                icon: "🗺️", description: "Priority job roles, competency requirements, TESDA qualifications" },
  { key: "competency_gap",         title: "Competency Gap Analysis",             icon: "📊", description: "Current vs. required competencies, gap severity, root causes" },
  { key: "skills_categorization",  title: "Skills Categorization",               icon: "🏷️", description: "Basic, Common, Core & Cross-Cutting competencies per TESDA framework" },
  { key: "technology_equipment",   title: "Technology & Equipment Requirements", icon: "⚙️", description: "Equipment needed for training delivery, digital infrastructure" },
  { key: "priority_matrix",        title: "Training Priority Matrix",            icon: "🎯", description: "Urgency × workers affected × economic impact × NTESDP alignment" },
  { key: "training_beneficiaries", title: "Training Beneficiaries",              icon: "👥", description: "New entrants, upskilling, reskilling, supervisors, trainers, partners" },
  { key: "delivery_mode",          title: "Training Delivery Mode Analysis",     icon: "📚", description: "Face-to-face, online, blended, OJT, CBT per TESDA standards" },
  { key: "training_plan",          title: "Training Plan Output",                icon: "📋", description: "Final plan table: program, target group, duration, mode, partner, outcome" },
] as const;

type SectionKey = typeof SECTIONS[number]["key"];

// ─── Markdown Prose Styles ─────────────────────────────────────────────────────
const PROSE_CLASSES = `
  prose prose-sm max-w-none text-foreground
  [&_h2]:font-bold [&_h2]:text-[0.95rem] [&_h2]:mt-7 [&_h2]:mb-3
  [&_h2]:pb-2 [&_h2]:border-b [&_h2]:border-border
  [&_h2]:text-foreground [&_h2:first-child]:mt-0
  [&_h3]:font-semibold [&_h3]:text-sm [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-foreground
  [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-foreground/90 [&_p]:mb-3
  [&_ul]:text-sm [&_ul]:space-y-1.5 [&_ul]:my-2 [&_ul]:pl-5 [&_ul]:list-disc
  [&_ol]:text-sm [&_ol]:space-y-1.5 [&_ol]:my-2 [&_ol]:pl-5 [&_ol]:list-decimal
  [&_li]:text-foreground/90 [&_li]:leading-relaxed
  [&_strong]:font-semibold [&_strong]:text-foreground
  [&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:py-1
  [&_blockquote]:text-muted-foreground [&_blockquote]:italic [&_blockquote]:my-3
  [&_table]:text-xs [&_table]:w-full [&_table]:my-3 [&_table]:border-collapse
  [&_th]:text-left [&_th]:font-semibold [&_th]:pb-2 [&_th]:border-b [&_th]:border-border [&_th]:pr-4 [&_th]:py-2
  [&_td]:py-1.5 [&_td]:border-b [&_td]:border-border/50 [&_td]:pr-4
  [&_hr]:border-border [&_hr]:my-4
`.trim();

// ─── Single Section Card ───────────────────────────────────────────────────────
function SectionCard({
  sectionDef,
  groupId,
  cachedContent,
  cachedModel,
  cachedAt,
  onGenerated,
}: {
  sectionDef: typeof SECTIONS[number];
  groupId: number;
  cachedContent?: string;
  cachedModel?: string | null;
  cachedAt?: Date | string | null;
  onGenerated: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const utils = trpc.useUtils();

  const generateMutation = trpc.groups.generateSection.useMutation({
    onSuccess: (data) => {
      if (data.fromCache) {
        toast.info(`Section loaded from cache (${data.section.modelUsed ?? "built-in"})`);
      } else {
        toast.success(`Section generated successfully`);
      }
      onGenerated();
      setExpanded(true);
    },
    onError: (err) => {
      toast.error(`Generation failed: ${err.message}`);
    },
  });

  const handleGenerate = (forceRegenerate = false) => {
    generateMutation.mutate({ groupId, sectionKey: sectionDef.key, forceRegenerate });
  };

  const handleExportSection = () => {
    if (!cachedContent) return;
    const content = `# ${sectionDef.title}\n\n${cachedContent}`;
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `TNA_${sectionDef.key}_${new Date().toISOString().split("T")[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isGenerating = generateMutation.isPending;
  const hasContent = !!cachedContent;

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${hasContent ? "border-primary/20 bg-primary/2" : "border-border"}`}>
      {/* Section Header */}
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl shrink-0">{sectionDef.icon}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground">{sectionDef.title}</p>
              {hasContent && (
                <Badge className="text-xs bg-green-50 text-green-700 border-green-200 gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Generated
                </Badge>
              )}
              {!hasContent && (
                <Badge variant="outline" className="text-xs text-muted-foreground gap-1">
                  <Lock className="w-3 h-3" />
                  Not generated
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">{sectionDef.description}</p>
            {hasContent && cachedAt && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Last generated: {new Date(cachedAt).toLocaleString()}
                {cachedModel && <span className="ml-1 text-primary/70">· {cachedModel}</span>}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasContent && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={handleExportSection}
                title="Export section as Markdown"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-xs">Export</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => handleGenerate(true)}
                disabled={isGenerating}
                title="Regenerate this section (uses AI credits)"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline text-xs">Regenerate</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded((e) => !e)}
                className="gap-1"
              >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </>
          )}
          {!hasContent && (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => handleGenerate(false)}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {isGenerating ? "Generating…" : "Generate"}
            </Button>
          )}
        </div>
      </div>

      {/* Generating indicator */}
      {isGenerating && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
            <span>AI is generating this section… this may take 20–40 seconds.</span>
          </div>
        </div>
      )}

      {/* Expanded content */}
      {expanded && hasContent && (
        <div className="border-t px-5 py-4">
          <div className={PROSE_CLASSES}>
            <ReactMarkdown>{cachedContent!}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Group Analysis Card ───────────────────────────────────────────────────────
function GroupAnalysisCard({ group }: { group: { id: number; name: string; code: string; description: string | null } }) {
  const [expanded, setExpanded] = useState(false);
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const { data, isLoading, error, refetch } = trpc.groups.groupSummary.useQuery(
    { groupId: group.id },
    { enabled: expanded, staleTime: 60 * 1000 }
  );

  const handleSectionGenerated = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleExportAll = () => {
    if (!data?.sections || data.sections.length === 0) {
      toast.info("No sections generated yet. Generate at least one section first.");
      return;
    }
    const header = `# TESDA Training Needs Analysis Report\n## Group: ${group.name} (${group.code})\n### Generated: ${new Date().toLocaleString()}\n\n---\n\n`;
    const body = data.sections
      .sort((a, b) => a.sectionKey.localeCompare(b.sectionKey))
      .map((s) => `## ${s.sectionTitle}\n\n${s.content}`)
      .join("\n\n---\n\n");
    const blob = new Blob([header + body], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `TNA_Report_${group.code}_${new Date().toISOString().split("T")[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generatedCount = data?.sections?.length ?? 0;
  const totalSections = SECTIONS.length;

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
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <Badge variant="outline" className="text-xs">{group.code}</Badge>
                {group.description && (
                  <span className="text-xs text-muted-foreground">{group.description}</span>
                )}
                {expanded && generatedCount > 0 && (
                  <Badge className="text-xs bg-green-50 text-green-700 border-green-200">
                    {generatedCount}/{totalSections} sections generated
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {expanded && generatedCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={handleExportAll}
                title="Export all generated sections as Markdown"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export All</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={() => setExpanded((e) => !e)}
            >
              <Brain className="w-3.5 h-3.5 text-primary" />
              {expanded ? "Hide" : "View Analysis"}
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
              <p className="text-sm text-muted-foreground">Loading group summary…</p>
            </div>
          ) : error ? (
            <div className="py-4 px-4 bg-destructive/5 rounded-lg border border-destructive/20 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Failed to load group data</span>
              </div>
              <p className="text-xs text-muted-foreground">{error.message}</p>
            </div>
          ) : !data || !data.summary ? (
            <div className="py-8 text-center">
              <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">No completed surveys in this group yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Respondents must complete the survey and be tagged to this group before analysis can be generated.</p>
            </div>
          ) : (
            <div className="space-y-6">

              {/* ── Free Summary Dashboard ──────────────────────────────────── */}
              <div className="rounded-xl border bg-muted/20 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <h4 className="text-sm font-semibold text-foreground">Group Summary Dashboard</h4>
                  <Badge variant="secondary" className="text-xs ml-auto">Free · No AI credits</Badge>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-background rounded-lg p-3 text-center border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Respondents</p>
                    <p className="text-xl font-bold font-display text-foreground mt-1">{data.summary.totalRespondents}</p>
                  </div>
                  <div className="bg-background rounded-lg p-3 text-center border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg. Score</p>
                    <p className="text-xl font-bold font-display text-foreground mt-1">{data.summary.avgScore}%</p>
                  </div>
                  <div className="bg-background rounded-lg p-3 text-center border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Critical Gap</p>
                    <p className="text-xl font-bold font-display text-red-600 mt-1">{data.summary.gapDistribution?.["critical"] ?? 0}</p>
                  </div>
                  <div className="bg-background rounded-lg p-3 text-center border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">High Gap</p>
                    <p className="text-xl font-bold font-display text-orange-600 mt-1">{data.summary.gapDistribution?.["high"] ?? 0}</p>
                  </div>
                </div>

                {/* Score Distribution */}
                {data.summary.scoreDistribution && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Score Distribution</p>
                    <div className="flex gap-1 h-8 rounded overflow-hidden">
                      {Object.entries(data.summary.scoreDistribution).map(([range, count]) => {
                        const pct = data.summary!.totalRespondents > 0
                          ? Math.round((count as number / data.summary!.totalRespondents) * 100)
                          : 0;
                        if (pct === 0) return null;
                        const colors: Record<string, string> = {
                          "0-20": "bg-red-400", "21-40": "bg-orange-400",
                          "41-60": "bg-yellow-400", "61-80": "bg-blue-400", "81-100": "bg-green-400",
                        };
                        return (
                          <div
                            key={range}
                            className={`${colors[range] ?? "bg-muted"} flex items-center justify-center text-white text-xs font-semibold transition-all`}
                            style={{ width: `${pct}%` }}
                            title={`${range}%: ${count} respondents`}
                          >
                            {pct >= 10 ? `${range}` : ""}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-3 mt-1 flex-wrap">
                      {Object.entries(data.summary.scoreDistribution).map(([range, count]) => (
                        <span key={range} className="text-xs text-muted-foreground">{range}%: <strong>{count as number}</strong></span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Category Scores */}
                {Object.keys(data.summary.avgCategoryScores ?? {}).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Average Category Scores</p>
                    <div className="space-y-1.5">
                      {Object.entries(data.summary.avgCategoryScores).map(([cat, score]) => (
                        <div key={cat} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-40 shrink-0 capitalize">{cat.replace(/_/g, " ")}</span>
                          <div className="flex-1 bg-muted rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${(score as number) < 40 ? "bg-red-500" : (score as number) < 60 ? "bg-orange-400" : (score as number) < 80 ? "bg-blue-500" : "bg-green-500"}`}
                              style={{ width: `${Math.min(score as number, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-foreground w-10 text-right">{score as number}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top Gaps */}
                {(data.summary.topGaps?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                      <TrendingDown className="w-3.5 h-3.5 inline mr-1 text-red-500" />
                      Most Common Training Gaps
                    </p>
                    <div className="space-y-1.5">
                      {data.summary.topGaps.slice(0, 5).map((gap, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-foreground text-xs truncate">{gap.questionText}</p>
                            <p className="text-xs text-muted-foreground capitalize">{gap.category?.replace(/_/g, " ")}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-semibold text-red-600">{gap.avgGapPct}% gap</p>
                            <p className="text-xs text-muted-foreground">{gap.affectedCount} ({gap.affectedPct}%)</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Individual Respondents */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                    <FileText className="w-3.5 h-3.5 inline mr-1" />
                    Individual Reports ({data.summary.respondentSummaries.length})
                  </p>
                  <div className="space-y-1.5">
                    {data.summary.respondentSummaries.map((r, i) => {
                      const gapConfig = r.gapLevel ? GAP_LEVEL_CONFIG[r.gapLevel] : null;
                      // Find the report surveyId from the original reports list
                      return (
                        <div key={i} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border bg-background text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium text-foreground text-xs truncate">{r.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-muted-foreground">{r.sector}</span>
                                {gapConfig && (
                                  <Badge variant="outline" className={`text-xs py-0 ${gapConfig.color}`}>{gapConfig.label}</Badge>
                                )}
                                <span className="text-xs text-muted-foreground">Score: {r.overallScore}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ── AI Sections ─────────────────────────────────────────────── */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" />
                  <h4 className="text-sm font-semibold text-foreground">TESDA/NTESDP Training Action Plan</h4>
                  <Badge variant="secondary" className="text-xs ml-auto">
                    {generatedCount}/{totalSections} sections · Uses AI credits
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Generate only the sections you need. Each section is cached after generation — clicking <strong>Generate</strong> again uses AI credits only if you choose <strong>Regenerate</strong>. Start with <strong>Section 3 (Competency Gap)</strong> and <strong>Section 6 (Priority Matrix)</strong> for the highest-impact insights.
                </p>

                {SECTIONS.map((sectionDef) => {
                  const cached = data.sections?.find((s) => s.sectionKey === sectionDef.key);
                  return (
                    <SectionCard
                      key={sectionDef.key}
                      sectionDef={sectionDef}
                      groupId={group.id}
                      cachedContent={cached?.content}
                      cachedModel={cached?.modelUsed}
                      cachedAt={cached?.updatedAt}
                      onGenerated={handleSectionGenerated}
                    />
                  );
                })}
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
    <div className="space-y-5 max-w-5xl">
      {/* Page header — one sentence */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {totalReports} total · {criticalCount > 0 ? <span className="text-red-600 font-medium">{criticalCount} critical</span> : "no critical gaps"} · avg {avgScore}%
          </p>
        </div>
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
                  <div className="text-sm space-y-1">
                    <p className="font-semibold text-foreground">Efficient AI-Powered TESDA/NTESDP Group Analysis</p>
                    <p className="text-muted-foreground leading-relaxed">
                      Each group shows a <strong>free summary dashboard</strong> (score distribution, category scores, top gaps, individual reports) computed instantly from survey data — no AI credits needed.
                      Below the dashboard are <strong>9 TESDA framework sections</strong> you can generate individually on demand.
                      Sections are <strong>cached after generation</strong> — AI credits are only spent when you click <strong>Generate</strong> for the first time or <strong>Regenerate</strong> to refresh.
                      Start with <strong>Section 3 (Competency Gap)</strong> and <strong>Section 6 (Priority Matrix)</strong> for the most actionable insights.
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
