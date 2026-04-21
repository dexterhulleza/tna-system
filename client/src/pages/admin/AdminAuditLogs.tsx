import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Loader2, Search, RefreshCw, ShieldAlert, User, LogIn, LogOut, Settings, UserPlus, KeyRound } from "lucide-react";

const ACTION_ICONS: Record<string, React.ElementType> = {
  login: LogIn,
  logout: LogOut,
  register: UserPlus,
  password_reset: KeyRound,
  profile_update: Settings,
  role_change: ShieldAlert,
  user_created: UserPlus,
  user_deactivated: User,
  user_activated: User,
};

const ACTION_COLORS: Record<string, string> = {
  login: "text-green-600 bg-green-50",
  logout: "text-gray-600 bg-gray-50",
  register: "text-blue-600 bg-blue-50",
  password_reset: "text-amber-600 bg-amber-50",
  profile_update: "text-purple-600 bg-purple-50",
  role_change: "text-red-600 bg-red-50",
  user_created: "text-blue-600 bg-blue-50",
  user_deactivated: "text-red-600 bg-red-50",
  user_activated: "text-green-600 bg-green-50",
};

export default function AdminAuditLogs() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const { data, isLoading, refetch } = trpc.customAuth.getAuditLogs.useQuery({
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    action: actionFilter !== "all" ? actionFilter : undefined,
    search: search || undefined,
  });

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const formatTime = (ts: number | string | null) => {
    if (!ts) return "—";
    return new Date(ts).toLocaleString();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground text-sm">Track all user and admin activity in the system</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by user or email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="logout">Logout</SelectItem>
                <SelectItem value="register">Register</SelectItem>
                <SelectItem value="password_reset">Password Reset</SelectItem>
                <SelectItem value="profile_update">Profile Update</SelectItem>
                <SelectItem value="role_change">Role Change</SelectItem>
                <SelectItem value="user_created">User Created</SelectItem>
                <SelectItem value="user_deactivated">User Deactivated</SelectItem>
                <SelectItem value="user_activated">User Activated</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="secondary">{total} records</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              <ShieldAlert className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No audit logs found
            </div>
          ) : (
            <div className="divide-y">
              {logs.map((log: any) => {
                const Icon = ACTION_ICONS[log.action] ?? Settings;
                const colorClass = ACTION_COLORS[log.action] ?? "text-gray-600 bg-gray-50";
                return (
                  <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{log.userName ?? log.userEmail ?? "Unknown"}</span>
                        <Badge variant="outline" className={`text-xs ${colorClass}`}>
                          {log.action?.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      {log.details && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.details}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">{formatTime(log.createdAt)}</span>
                        {log.ipAddress && (
                          <span className="text-xs text-muted-foreground font-mono">IP: {log.ipAddress}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages} ({total} total)
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
