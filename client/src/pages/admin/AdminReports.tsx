import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Search, FileText, Loader2, BarChart3, User, Filter } from "lucide-react";

const GAP_LEVEL_CONFIG: Record<string, { color: string; label: string }> = {
  critical: { color: "bg-red-100 text-red-700 border-red-200", label: "Critical" },
  high: { color: "bg-orange-100 text-orange-700 border-orange-200", label: "High" },
  moderate: { color: "bg-yellow-100 text-yellow-700 border-yellow-200", label: "Moderate" },
  low: { color: "bg-green-100 text-green-700 border-green-200", label: "Low" },
  none: { color: "bg-gray-100 text-gray-700 border-gray-200", label: "None" },
};

export default function AdminReports() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [filterGap, setFilterGap] = useState("all");

  const { data: reports, isLoading } = trpc.reports.allReports.useQuery();

  const filtered = reports?.filter((item: any) => {
    const matchSearch = !search ||
      item.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.sector?.name?.toLowerCase().includes(search.toLowerCase());
    const matchGap = filterGap === "all" || item.report.gapLevel === filterGap;
    return matchSearch && matchGap;
  }) || [];

  // Stats
  const totalReports = reports?.length || 0;
  const criticalCount = reports?.filter((r: any) => r.report.gapLevel === "critical").length || 0;
  const highCount = reports?.filter((r: any) => r.report.gapLevel === "high").length || 0;
  const avgScore = reports && reports.length > 0
    ? Math.round(reports.reduce((acc: number, r: any) => acc + parseFloat(String(r.report.overallScore || 0)), 0) / reports.length)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">All Reports</h1>
        <p className="text-muted-foreground text-sm mt-1">View and manage all TNA reports across all users</p>
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
  );
}
