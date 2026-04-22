/**
 * AdminWorkforceAnalytics — T5-3
 * Enterprise-level workforce analytics: gap distribution, category heatmap,
 * department breakdown, role breakdown, and summary KPIs.
 */
import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2, BarChart3, TrendingDown, AlertTriangle, Users, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend,
} from "recharts";
import AdminLayout from "@/components/AdminLayout";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high:     "#f97316",
  moderate: "#eab308",
  low:      "#22c55e",
};

const CATEGORY_LABELS: Record<string, string> = {
  technical_skills:    "Technical Skills",
  core_competencies:   "Core Competencies",
  safety_compliance:   "Safety & Compliance",
  leadership:          "Leadership",
  communication:       "Communication",
  digital_literacy:    "Digital Literacy",
  customer_service:    "Customer Service",
  process_improvement: "Process Improvement",
  other:               "Other",
};

const CHART_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe", "#ede9fe", "#f5f3ff", "#faf5ff", "#f0fdf4", "#dcfce7"];

export default function AdminWorkforceAnalytics() {
  const { data, isLoading, refetch } = trpc.workforceAnalytics.get.useQuery();

  const gapDistributionData = useMemo(() => data?.distribution ?? [], [data]);

  const categoryData = useMemo(() =>
    (data?.byCategory ?? []).map((c) => ({
      name: CATEGORY_LABELS[c.category] ?? c.category,
      avgGap: c.avgGap,
      critical: c.criticalCount,
      high: c.highCount,
    })),
    [data]
  );

  const departmentData = useMemo(() =>
    (data?.byDepartment ?? []).slice(0, 10).map((d) => ({
      name: d.department.length > 18 ? d.department.slice(0, 16) + "…" : d.department,
      avgGap: d.avgGap,
      critical: d.criticalCount,
      respondents: d.respondentCount,
    })),
    [data]
  );

  const roleData = useMemo(() =>
    (data?.byRole ?? []).map((r) => ({
      name: r.role.replace(/_/g, " "),
      avgGap: r.avgGap,
      critical: r.criticalCount,
      respondents: r.respondentCount,
    })),
    [data]
  );

  const severityPieData = useMemo(() => {
    if (!data?.summary) return [];
    return [
      { name: "Critical", value: data.summary.criticalCount, color: SEVERITY_COLORS.critical },
      { name: "High",     value: data.summary.highCount,     color: SEVERITY_COLORS.high },
      { name: "Moderate", value: data.summary.moderateCount, color: SEVERITY_COLORS.moderate },
      { name: "Low",      value: data.summary.lowCount,      color: SEVERITY_COLORS.low },
    ].filter((d) => d.value > 0);
  }, [data]);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      </AdminLayout>
    );
  }

  const summary = data?.summary;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-indigo-500" />
              Workforce Analytics
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              T5-3 Enterprise-level competency gap analysis across departments and roles
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* KPI Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-3xl font-bold text-slate-900">{summary.totalRespondents}</div>
              <div className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                <Users className="w-3 h-3" /> Total Respondents
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-3xl font-bold text-slate-900">{summary.avgGapScore}</div>
              <div className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                <TrendingDown className="w-3 h-3" /> Avg Gap Score
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="text-3xl font-bold text-red-600">{summary.criticalCount}</div>
              <div className="text-sm text-red-500 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Critical Gaps
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-3xl font-bold text-slate-900">{summary.totalGapRecords}</div>
              <div className="text-sm text-slate-500 mt-1">Total Gap Records</div>
            </div>
          </div>
        )}

        {!summary || summary.totalGapRecords === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No gap records yet</p>
            <p className="text-sm mt-1">Complete surveys to generate competency gap data</p>
          </div>
        ) : (
          <>
            {/* Row 1: Gap Distribution + Severity Pie */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-5">
                <h2 className="font-semibold text-slate-800 mb-4">Gap Score Distribution</h2>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={gapDistributionData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" name="Records" radius={[4, 4, 0, 0]}>
                        {gapDistributionData.map((_: any, i: number) => (
                          <Cell key={i} fill={i < 3 ? "#22c55e" : i < 6 ? "#eab308" : i < 8 ? "#f97316" : "#ef4444"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-slate-400 mt-2 text-center">Gap score buckets (0 = no gap, 100 = maximum gap)</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h2 className="font-semibold text-slate-800 mb-4">Gap Severity Breakdown</h2>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={severityPieData}
                        cx="50%"
                        cy="45%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {severityPieData.map((entry: any, i: number) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => [`${v} records`]} />
                      <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Row 2: Category Heatmap */}
            {categoryData.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h2 className="font-semibold text-slate-800 mb-4">Average Gap by Competency Category</h2>
                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 30, left: 120, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={115} />
                      <Tooltip formatter={(v: any) => [`${v}`, "Avg Gap"]} />
                      <Bar dataKey="avgGap" name="Avg Gap" radius={[0, 4, 4, 0]}>
                        {categoryData.map((entry: any, i: number) => (
                          <Cell
                            key={i}
                            fill={entry.avgGap >= 70 ? "#ef4444" : entry.avgGap >= 50 ? "#f97316" : entry.avgGap >= 30 ? "#eab308" : "#22c55e"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Row 3: Department + Role */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {departmentData.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <h2 className="font-semibold text-slate-800 mb-4">Gap by Department (Top 10)</h2>
                  <div style={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={departmentData} layout="vertical" margin={{ top: 0, right: 30, left: 100, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={95} />
                        <Tooltip formatter={(v: any, n: string) => [n === "avgGap" ? `${v}` : v, n === "avgGap" ? "Avg Gap" : "Critical"]} />
                        <Bar dataKey="avgGap" name="Avg Gap" fill="#6366f1" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {roleData.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <h2 className="font-semibold text-slate-800 mb-4">Gap by TNA Role</h2>
                  <div style={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={roleData} layout="vertical" margin={{ top: 0, right: 30, left: 110, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={105} />
                        <Tooltip formatter={(v: any) => [`${v}`, "Avg Gap"]} />
                        <Bar dataKey="avgGap" name="Avg Gap" radius={[0, 4, 4, 0]}>
                          {roleData.map((_: any, i: number) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

            {/* Department Table */}
            {departmentData.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h2 className="font-semibold text-slate-800">Department Summary Table</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                        <th className="px-5 py-3 text-left">Department</th>
                        <th className="px-5 py-3 text-right">Respondents</th>
                        <th className="px-5 py-3 text-right">Avg Gap</th>
                        <th className="px-5 py-3 text-right">Critical Gaps</th>
                        <th className="px-5 py-3 text-right">Gap Records</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(data?.byDepartment ?? []).map((d: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-5 py-3 font-medium text-slate-800">{d.department}</td>
                          <td className="px-5 py-3 text-right text-slate-600">{d.respondentCount}</td>
                          <td className="px-5 py-3 text-right">
                            <span className={`font-semibold ${d.avgGap >= 70 ? "text-red-600" : d.avgGap >= 50 ? "text-orange-500" : d.avgGap >= 30 ? "text-yellow-600" : "text-green-600"}`}>
                              {d.avgGap}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right text-red-600 font-medium">{d.criticalCount}</td>
                          <td className="px-5 py-3 text-right text-slate-500">{d.recordCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
