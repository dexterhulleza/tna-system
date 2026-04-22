import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingDown, AlertTriangle, CheckCircle, Search, ChevronDown, ChevronUp } from "lucide-react";

const GAP_LEVEL_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.JSX.Element }> = {
  critical: { label: "Critical", color: "text-red-700", bg: "bg-red-100", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  high:     { label: "High",     color: "text-orange-700", bg: "bg-orange-100", icon: <TrendingDown className="h-3.5 w-3.5" /> },
  moderate: { label: "Moderate", color: "text-yellow-700", bg: "bg-yellow-100", icon: <TrendingDown className="h-3.5 w-3.5" /> },
  low:      { label: "Low",      color: "text-blue-700", bg: "bg-blue-100", icon: <TrendingDown className="h-3.5 w-3.5" /> },
  none:     { label: "None",     color: "text-green-700", bg: "bg-green-100", icon: <CheckCircle className="h-3.5 w-3.5" /> },
};

function GapBar({ actual, target }: { actual: number; target: number }) {
  const gap = Math.max(0, target - actual);
  return (
    <div className="w-full h-3 bg-muted rounded-full overflow-hidden relative">
      <div
        className="h-full bg-primary rounded-full"
        style={{ width: `${actual}%` }}
      />
      <div
        className="absolute top-0 h-full border-r-2 border-dashed border-foreground/40"
        style={{ left: `${target}%` }}
        title={`Target: ${target}%`}
      />
    </div>
  );
}

export default function AdminGapRecords() {
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const { data: groups } = trpc.groups.list.useQuery({ activeOnly: true });
  const { data: aggregated, isLoading } = trpc.gapRecords.aggregateByGroup.useQuery(
    { groupId: Number(selectedGroup) },
    { enabled: !!selectedGroup }
  );

  const groupList = (groups as any[]) ?? [];
  const items = (aggregated ?? []) as any[];

  const filtered = items.filter((item) => {
    if (filterLevel !== "all") {
      // Derive gap level from avgGapScore
      const gapPct = item.avgGapScore;
      let level = "none";
      if (gapPct >= 50) level = "critical";
      else if (gapPct >= 35) level = "high";
      else if (gapPct >= 20) level = "moderate";
      else if (gapPct > 0) level = "low";
      if (level !== filterLevel) return false;
    }
    if (search && !item.questionText.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Group by category
  const byCategory: Record<string, any[]> = {};
  for (const item of filtered) {
    const cat = item.category ?? "other";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(item);
  }

  const totalGaps = items.filter(i => i.avgGapScore > 0).length;
  const criticalGaps = items.filter(i => i.avgGapScore >= 50).length;
  const avgGap = items.length > 0 ? Math.round(items.reduce((s, i) => s + i.avgGapScore, 0) / items.length) : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Competency Gap Records
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Structured gap analysis records aggregated across all respondents in a group. Each row shows the average gap vs. target proficiency.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
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

        <Select value={filterLevel} onValueChange={setFilterLevel}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="moderate">Moderate</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="none">No Gap</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search question..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {!selectedGroup ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Select a group to view gap records</p>
            <p className="text-sm mt-1">Gap records are generated each time a respondent completes a survey.</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading gap records...</div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{totalGaps}</div>
                <div className="text-sm text-muted-foreground">Questions with gaps</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-red-600">{criticalGaps}</div>
                <div className="text-sm text-muted-foreground">Critical gaps (≥50%)</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{avgGap}%</div>
                <div className="text-sm text-muted-foreground">Average gap score</div>
              </CardContent>
            </Card>
          </div>

          {/* Category groups */}
          {Object.entries(byCategory).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No gap records found for the selected filters.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {Object.entries(byCategory).map(([cat, catItems]) => {
                const isExpanded = expandedCategory === cat || expandedCategory === null;
                const catAvgGap = Math.round(catItems.reduce((s, i) => s + i.avgGapScore, 0) / catItems.length);
                return (
                  <Card key={cat}>
                    <CardHeader
                      className="cursor-pointer py-3 px-4"
                      onClick={() => setExpandedCategory(expandedCategory === cat ? null : cat)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-base capitalize">{cat.replace(/_/g, " ")}</CardTitle>
                          <Badge variant="outline">{catItems.length} questions</Badge>
                          <Badge className={catAvgGap >= 50 ? "bg-red-100 text-red-800" : catAvgGap >= 35 ? "bg-orange-100 text-orange-800" : catAvgGap >= 20 ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}>
                            Avg gap: {catAvgGap}%
                          </Badge>
                        </div>
                        {expandedCategory === cat ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </CardHeader>
                    {(expandedCategory === cat || expandedCategory === null) && (
                      <CardContent className="pt-0 pb-4 px-4">
                        <div className="space-y-3">
                          {catItems.map((item) => {
                            const gapPct = item.avgGapScore;
                            let level = "none";
                            if (gapPct >= 50) level = "critical";
                            else if (gapPct >= 35) level = "high";
                            else if (gapPct >= 20) level = "moderate";
                            else if (gapPct > 0) level = "low";
                            const cfg = GAP_LEVEL_CONFIG[level];
                            const defaultTarget = 80;
                            return (
                              <div key={item.questionId} className="border rounded-md p-3 space-y-2">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium leading-snug">{item.questionText}</p>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                                        {cfg.icon} {cfg.label}
                                      </span>
                                      <span className="text-xs text-muted-foreground">{item.affectedCount} respondent{item.affectedCount !== 1 ? "s" : ""}</span>
                                    </div>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <div className="text-lg font-bold">{item.avgActualScore}%</div>
                                    <div className="text-xs text-muted-foreground">vs {defaultTarget}% target</div>
                                  </div>
                                </div>
                                <GapBar actual={item.avgActualScore} target={defaultTarget} />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>Actual: {item.avgActualScore}%</span>
                                  <span className="text-red-600 font-medium">Gap: {item.avgGapScore}%</span>
                                  <span>Target: {defaultTarget}%</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
