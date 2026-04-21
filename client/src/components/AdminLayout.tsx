import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  BarChart3,
  Settings,
  Bot,
  Menu,
  X,
  LogOut,
  ChevronDown,
  ChevronRight,
  Home,
  PlusCircle,
  ClipboardList,
  TrendingUp,
  GraduationCap,
  Lightbulb,
  Building2,
  FileBarChart,
  HelpCircle,
  Globe,
  Layers,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  adminOnly?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  collapsible?: boolean;
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Main",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
    ],
  },
  {
    label: "Survey Management",
    items: [
      { icon: ClipboardList, label: "Survey Groups", path: "/admin/groups" },
      { icon: PlusCircle, label: "Create Survey Group", path: "/admin/survey-groups/create" },
      { icon: HelpCircle, label: "Questionnaires", path: "/admin/survey-config" },
    ],
  },
  {
    label: "Outputs",
    items: [
      { icon: TrendingUp, label: "Results & Analytics", path: "/admin/results" },
      { icon: GraduationCap, label: "Training Plans", path: "/admin/training-plans" },
      { icon: Lightbulb, label: "Recommendations", path: "/admin/recommendations" },
      { icon: FileBarChart, label: "Reports", path: "/admin/reports" },
    ],
  },
  {
    label: "Organization",
    items: [
      { icon: Users, label: "Staff", path: "/admin/users" },
      { icon: Building2, label: "Company Info", path: "/admin/company-info" },
    ],
  },
  {
    label: "Settings",
    collapsible: true,
    items: [
      { icon: BookOpen, label: "Questions", path: "/admin/questions" },
      { icon: Globe, label: "Sectors", path: "/admin/sectors" },
      { icon: Bot, label: "AI Provider", path: "/admin/ai-settings", adminOnly: true },
      { icon: ShieldAlert, label: "Audit Logs", path: "/admin/audit-logs", adminOnly: true },
    ],
  },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [location, navigate] = useLocation();
  const { user, loading, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Auth guard: redirect to login if not authenticated
  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/login?returnPath=" + encodeURIComponent(location));
    }
  }, [loading, user, location, navigate]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Show access denied if user doesn't have admin/hr_officer role
  if (user && user.role !== "admin" && user.tnaRole !== "hr_officer" && user.tnaRole !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h1>
          <p className="text-slate-500 text-sm mb-4">You don't have permission to access this area.</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Auto-open settings if current path is under settings
  const isInSettings = ["/admin/questions", "/admin/sectors", "/admin/ai-settings"].some(p =>
    location.startsWith(p)
  );

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  function NavLinks({ onItemClick }: { onItemClick?: () => void }) {
    return (
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
        {NAV_GROUPS.map((group) => {
          const isSettings = group.collapsible;
          const expanded = isSettings ? (settingsOpen || isInSettings) : true;

          return (
            <div key={group.label}>
              {/* Group header */}
              {isSettings ? (
                <button
                  onClick={() => setSettingsOpen(v => !v)}
                  className="flex items-center justify-between w-full px-2 py-1 mb-1 group"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 group-hover:text-slate-600 transition-colors">
                    {group.label}
                  </span>
                  {expanded
                    ? <ChevronDown className="w-3 h-3 text-slate-400" />
                    : <ChevronRight className="w-3 h-3 text-slate-400" />
                  }
                </button>
              ) : (
                <p className="px-2 py-1 mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {group.label}
                </p>
              )}

              {/* Group items */}
              {expanded && (
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = location === item.path || (item.path !== "/admin" && location.startsWith(item.path));
                    return (
                      <button
                        key={item.path}
                        onClick={() => { navigate(item.path); onItemClick?.(); }}
                        className={cn(
                          "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left",
                          active
                            ? "bg-primary text-white shadow-sm"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        )}
                      >
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{item.label}</span>
                        {item.adminOnly && (
                          <span className={cn(
                            "ml-auto text-[9px] font-bold uppercase px-1.5 py-0.5 rounded",
                            active ? "bg-white/20 text-white" : "bg-amber-100 text-amber-700"
                          )}>
                            Admin
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    );
  }

  const SidebarContent = ({ onItemClick }: { onItemClick?: () => void }) => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 h-16 px-5 border-b border-slate-200 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
          <Layers className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-bold text-slate-900 text-sm leading-none">TNA System</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {user?.tnaRole === "admin" ? "Administrator" : "HR Officer Panel"}
          </p>
        </div>
      </div>

      {/* Nav */}
      <NavLinks onItemClick={onItemClick} />

      {/* User footer */}
      <div className="border-t border-slate-200 p-3 flex-shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 w-full px-2 py-2 rounded-lg hover:bg-slate-100 transition-colors text-left">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate leading-none">{user?.name ?? "User"}</p>
                <p className="text-xs text-slate-500 truncate mt-0.5">{user?.email ?? ""}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate("/")}>
              <Home className="mr-2 h-4 w-4" />
              Home
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/profile-setup")}>
              <Settings className="mr-2 h-4 w-4" />
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col fixed inset-y-0 left-0 w-60 bg-white border-r border-slate-200 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between h-16 px-5 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm leading-none">TNA System</p>
              <p className="text-xs text-slate-500 mt-0.5">HR Officer Panel</p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>
        <NavLinks onItemClick={() => setMobileOpen(false)} />
        <div className="border-t border-slate-200 p-3 flex-shrink-0">
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user?.name ?? "User"}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email ?? ""}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
            <LogOut className="mr-2 h-3.5 w-3.5" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        {/* Mobile Top Bar */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-slate-200 h-14 flex items-center justify-between px-4">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Menu className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Layers className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-sm">TNA System</span>
          </div>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
            </AvatarFallback>
          </Avatar>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
