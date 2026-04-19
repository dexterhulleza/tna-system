import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import {
  BookOpen,
  BarChart3,
  ClipboardList,
  FileText,
  Users,
  Zap,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Globe,
  Shield,
  Loader2,
} from "lucide-react";

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Register & Set Role",
    desc: "Create your account and select your role — HR Officer to manage campaigns, or Staff to take assessments.",
    icon: <Users className="w-6 h-6" />,
    color: "bg-blue-500",
  },
  {
    step: "2",
    title: "Configure & Assign",
    desc: "HR Officers set up survey groups, define objectives, and assign tailored question sets to each team.",
    icon: <ClipboardList className="w-6 h-6" />,
    color: "bg-violet-500",
  },
  {
    step: "3",
    title: "Take Assessment",
    desc: "Staff complete their assigned TNA survey — covering organizational, job-task, and individual competency areas.",
    icon: <FileText className="w-6 h-6" />,
    color: "bg-teal-500",
  },
  {
    step: "4",
    title: "Get Training Plan",
    desc: "AI generates a TESDA/NTESDP-aligned training plan with skills gap analysis and priority recommendations.",
    icon: <Zap className="w-6 h-6" />,
    color: "bg-orange-500",
  },
];

const ROLE_CARDS = [
  {
    role: "HR Officer",
    tagline: "Manage your TNA campaigns",
    description:
      "Create survey campaigns, organize staff into groups, configure objectives, monitor completion, and generate AI-powered training plans aligned with TESDA/NTESDP frameworks.",
    features: ["Create & manage campaigns", "Assign surveys to groups", "Monitor respondents", "Generate training plans", "Export PDF reports"],
    cta: "Start Managing",
    path: "/admin",
    accentColor: "border-blue-500",
    badgeColor: "bg-blue-100 text-blue-700",
    iconBg: "bg-blue-500",
    icon: <Shield className="w-6 h-6 text-white" />,
  },
  {
    role: "Staff",
    tagline: "Take your assessment",
    description:
      "Answer your assigned TNA survey, discover your training needs, and receive personalized recommendations to develop your skills and advance your career.",
    features: ["View assigned surveys", "Complete assessments", "Track your progress", "View personal reports", "Access training recommendations"],
    cta: "Take Assessment",
    path: "/survey/start",
    accentColor: "border-teal-500",
    badgeColor: "bg-teal-100 text-teal-700",
    iconBg: "bg-teal-500",
    icon: <Globe className="w-6 h-6 text-white" />,
  },
];

const STATS = [
  { label: "WorldSkills Sectors", value: "6" },
  { label: "Question Categories", value: "5" },
  { label: "TESDA Framework Sections", value: "9" },
  { label: "Report Export Formats", value: "PDF" },
];

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const handleStartAssessment = () => {
    if (loading) return;

    if (!isAuthenticated) {
      // Not logged in → go to Manus OAuth login
      window.location.href = getLoginUrl("/");
      return;
    }

    // Logged in — check profile completeness
    if (!user?.tnaRole || user.tnaRole === "admin") {
      // No TNA role set → profile setup
      navigate("/profile-setup");
      return;
    }

    // Route by role
    if (user.role === "admin" || user.tnaRole === "hr_officer") {
      navigate("/admin");
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ── Navigation ── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-base leading-none block">TNA System</span>
              <span className="text-xs text-slate-500 leading-none">WorldSkills Philippines</span>
            </div>
          </div>

          {/* Nav Actions */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(user?.role === "admin" || user?.tnaRole === "hr_officer" ? "/admin" : "/dashboard")}
                >
                  Dashboard
                </Button>
                <Button size="sm" onClick={handleStartAssessment} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Start Assessment"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => window.location.href = getLoginUrl("/")}>
                  Login
                </Button>
                <Button size="sm" onClick={() => window.location.href = getLoginUrl("/profile-setup")}>
                  Register
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="bg-gradient-to-br from-slate-900 via-[#1E3A5F] to-slate-800 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="max-w-3xl">
            <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/30 mb-6 text-xs font-medium">
              TESDA / NTESDP Aligned
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Training Needs{" "}
              <span className="text-sky-400">Analysis</span>{" "}
              System
            </h1>
            <p className="text-lg text-slate-300 mb-8 max-w-2xl leading-relaxed">
              Identify skill gaps, generate AI-powered training plans, and export comprehensive
              TESDA-aligned reports for HR Officers and staff across all WorldSkills sectors.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                className="bg-sky-500 hover:bg-sky-400 text-white font-semibold px-8 h-12 text-base shadow-lg"
                onClick={handleStartAssessment}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <ArrowRight className="w-5 h-5 mr-2" />
                )}
                Start Assessment
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white h-12 text-base bg-transparent"
                onClick={() => {
                  const el = document.getElementById("how-it-works");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                How it works
              </Button>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-6 mt-12">
              {STATS.map((s) => (
                <div key={s.label}>
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-16 sm:py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">How It Works</h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              A simple 4-step process from registration to a complete AI-generated training plan.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((step, idx) => (
              <div key={step.step} className="relative">
                {idx < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden lg:block absolute top-6 left-full w-full h-px bg-slate-200 z-0" style={{ width: "calc(100% - 3rem)", left: "3rem" }} />
                )}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative z-10">
                  <div className={`w-12 h-12 rounded-xl ${step.color} flex items-center justify-center mb-4 text-white`}>
                    {step.icon}
                  </div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Step {step.step}</div>
                  <h3 className="font-bold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Role Cards ── */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Who Is This For?</h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              The TNA System serves two distinct roles with tailored experiences for each.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {ROLE_CARDS.map((card) => (
              <div
                key={card.role}
                className={`bg-white rounded-2xl border-2 ${card.accentColor} p-8 shadow-sm hover:shadow-md transition-shadow`}
              >
                <div className="flex items-start gap-4 mb-6">
                  <div className={`w-12 h-12 rounded-xl ${card.iconBg} flex items-center justify-center flex-shrink-0`}>
                    {card.icon}
                  </div>
                  <div>
                    <Badge className={`${card.badgeColor} border-0 text-xs font-semibold mb-1`}>{card.role}</Badge>
                    <h3 className="text-xl font-bold text-slate-900">{card.tagline}</h3>
                  </div>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">{card.description}</p>
                <ul className="space-y-2 mb-8">
                  {card.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={card.role === "HR Officer" ? "default" : "outline"}
                  onClick={handleStartAssessment}
                  disabled={loading}
                >
                  {card.cta}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Strip ── */}
      <section className="py-14 bg-slate-50 border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 text-center">
            {[
              { icon: <ClipboardList className="w-6 h-6" />, label: "Role-Based Surveys", color: "text-blue-500" },
              { icon: <BarChart3 className="w-6 h-6" />, label: "Gap Analysis Engine", color: "text-violet-500" },
              { icon: <Zap className="w-6 h-6" />, label: "AI Recommendations", color: "text-orange-500" },
              { icon: <FileText className="w-6 h-6" />, label: "PDF Report Export", color: "text-teal-500" },
              { icon: <Shield className="w-6 h-6" />, label: "Multi-Level Admin", color: "text-red-500" },
              { icon: <Globe className="w-6 h-6" />, label: "WorldSkills Aligned", color: "text-green-500" },
            ].map((f) => (
              <div key={f.label} className="flex flex-col items-center gap-2">
                <div className={`${f.color}`}>{f.icon}</div>
                <p className="text-xs font-medium text-slate-700 leading-tight">{f.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-16 bg-gradient-to-r from-[#1E3A5F] to-[#2563EB] text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to start your TNA campaign?</h2>
          <p className="text-blue-200 mb-8 text-lg">
            Join HR Officers and staff already using the TNA System to identify training needs and build better teams.
          </p>
          <Button
            size="lg"
            className="bg-white text-primary hover:bg-blue-50 font-semibold px-8 h-12 text-base shadow-lg"
            onClick={handleStartAssessment}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ArrowRight className="w-5 h-5 mr-2" />}
            Get Started Now
          </Button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-900 text-slate-400 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">TNA System</p>
                <p className="text-xs text-slate-500">WorldSkills Philippines</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
              <button onClick={() => window.location.href = getLoginUrl("/")} className="hover:text-white transition-colors">Login</button>
              <button onClick={() => window.location.href = getLoginUrl("/profile-setup")} className="hover:text-white transition-colors">Register</button>
            </div>
            <p className="text-xs text-slate-600">© 2026 TNA System. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
