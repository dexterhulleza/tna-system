import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileText,
  Globe,
  Shield,
  Users,
  Zap,
} from "lucide-react";

const SECTORS = [
  { code: "ICT", name: "Information & Communication Technology", icon: "💻", color: "bg-blue-500" },
  { code: "MET", name: "Manufacturing, Engineering & Technology", icon: "⚙️", color: "bg-slate-600" },
  { code: "CAF", name: "Creative Arts & Fashion", icon: "🎨", color: "bg-purple-500" },
  { code: "HW", name: "Health & Wellness", icon: "🏥", color: "bg-green-500" },
  { code: "BPS", name: "Building & Property Services", icon: "🏗️", color: "bg-orange-500" },
  { code: "TL", name: "Transportation & Logistics", icon: "🚗", color: "bg-red-500" },
];

const FEATURES = [
  {
    icon: <ClipboardList className="w-6 h-6" />,
    title: "Role-Based Surveys",
    desc: "Tailored surveys for Industry Workers, Trainers, Assessors, and HR Officers across all 6 WorldSkills sectors.",
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: "Gap Analysis Engine",
    desc: "Automated identification of training gaps across organizational, job-task, and individual competency levels.",
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: "Smart Recommendations",
    desc: "Priority-based training recommendations with type, duration, and cost estimates tailored to your role.",
  },
  {
    icon: <FileText className="w-6 h-6" />,
    title: "PDF Report Export",
    desc: "Generate comprehensive training needs analysis reports in PDF format for sharing and documentation.",
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "Multi-Level Admin",
    desc: "Customizable admin access levels: Super Admin, Admin, Sector Manager, and Question Manager.",
  },
  {
    icon: <Globe className="w-6 h-6" />,
    title: "WorldSkills Aligned",
    desc: "Built on the 6 primary WorldSkills International sectors with skill area-specific question banks.",
  },
];

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      if (!user?.tnaRole || user.tnaRole === "admin") {
        navigate("/profile-setup");
      } else {
        navigate("/survey/start");
      }
    } else {
      window.location.href = getLoginUrl("/survey/start");
    }
  };

  const handleAdminAccess = () => {
    if (isAuthenticated && user?.role === "admin") {
      navigate("/admin");
    } else if (!isAuthenticated) {
      window.location.href = getLoginUrl("/admin");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-display font-bold text-foreground text-lg leading-none">TNA System</span>
              <p className="text-xs text-muted-foreground leading-none mt-0.5">WorldSkills Philippines</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {loading ? null : isAuthenticated ? (
              <>
                <span className="text-sm text-muted-foreground hidden sm:block">
                  Welcome, {user?.name?.split(" ")[0]}
                </span>
                {user?.role === "admin" && (
                  <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
                    Admin Panel
                  </Button>
                )}
                <Button size="sm" onClick={() => navigate("/survey/start")}>
                  Take Survey
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => (window.location.href = getLoginUrl())}>
                Sign In
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djZoNnYtNmgtNnptMCAwdi02aC02djZoNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-40" />
        <div className="container relative py-24 md:py-32">
          <div className="max-w-3xl">
            <Badge className="mb-4 bg-blue-500/20 text-blue-200 border-blue-500/30 hover:bg-blue-500/20">
              WorldSkills International — 6 Primary Sectors
            </Badge>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Training Needs
              <span className="text-blue-400"> Analysis </span>
              System
            </h1>
            <p className="text-lg md:text-xl text-slate-300 mb-8 leading-relaxed max-w-2xl">
              Identify skill gaps, generate actionable training recommendations, and export comprehensive reports
              for industry workers, trainers, and assessors across all WorldSkills sectors.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button
                size="lg"
                className="bg-blue-500 hover:bg-blue-400 text-white font-semibold px-8"
                onClick={handleGetStarted}
              >
                Start Your Assessment
                <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
              {isAuthenticated && user?.role === "admin" && (
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 bg-transparent"
                  onClick={handleAdminAccess}
                >
                  Admin Dashboard
                </Button>
              )}
            </div>
            <div className="mt-10 flex flex-wrap gap-6 text-sm text-slate-400">
              {[
                { icon: <CheckCircle2 className="w-4 h-4 text-green-400" />, text: "5 Question Categories" },
                { icon: <CheckCircle2 className="w-4 h-4 text-green-400" />, text: "6 WorldSkills Sectors" },
                { icon: <CheckCircle2 className="w-4 h-4 text-green-400" />, text: "PDF Report Export" },
                { icon: <CheckCircle2 className="w-4 h-4 text-green-400" />, text: "Automated Gap Analysis" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-2">
                  {item.icon}
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Sectors */}
      <section className="py-16 bg-white">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl font-bold text-foreground mb-3">
              6 WorldSkills Primary Sectors
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Comprehensive training needs analysis tailored to each sector's unique skill requirements and industry standards.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {SECTORS.map((sector) => (
              <Card
                key={sector.code}
                className="text-center hover:shadow-md transition-shadow cursor-default border-border"
              >
                <CardContent className="pt-6 pb-5">
                  <div
                    className={`w-12 h-12 rounded-xl ${sector.color} flex items-center justify-center text-2xl mx-auto mb-3`}
                  >
                    {sector.icon}
                  </div>
                  <p className="font-semibold text-xs text-foreground leading-tight">{sector.name}</p>
                  <Badge variant="secondary" className="mt-2 text-xs">
                    {sector.code}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl font-bold text-foreground mb-3">
              Comprehensive TNA Capabilities
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Everything you need to conduct thorough training needs analysis at organizational, job-task, and individual levels.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <Card key={f.title} className="border-border hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                    {f.icon}
                  </div>
                  <h3 className="font-display font-semibold text-foreground mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Question Categories */}
      <section className="py-16 bg-white">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl font-bold text-foreground mb-3">
              Five Assessment Dimensions
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Our structured approach covers all critical dimensions of training needs analysis.
            </p>
          </div>
          <div className="grid md:grid-cols-5 gap-4">
            {[
              { num: "01", label: "Organizational-Level", color: "border-blue-500 bg-blue-50", textColor: "text-blue-700" },
              { num: "02", label: "Job / Task-Level", color: "border-purple-500 bg-purple-50", textColor: "text-purple-700" },
              { num: "03", label: "Individual-Level", color: "border-green-500 bg-green-50", textColor: "text-green-700" },
              { num: "04", label: "Training Feasibility", color: "border-orange-500 bg-orange-50", textColor: "text-orange-700" },
              { num: "05", label: "Evaluation & Success Criteria", color: "border-red-500 bg-red-50", textColor: "text-red-700" },
            ].map((cat) => (
              <div key={cat.num} className={`rounded-xl border-2 ${cat.color} p-5 text-center`}>
                <div className={`text-3xl font-bold font-display ${cat.textColor} mb-2`}>{cat.num}</div>
                <p className={`text-sm font-semibold ${cat.textColor}`}>{cat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-blue-900 to-slate-900 text-white">
        <div className="container text-center">
          <h2 className="font-display text-3xl font-bold mb-4">Ready to Identify Your Training Needs?</h2>
          <p className="text-slate-300 mb-8 max-w-lg mx-auto">
            Join industry professionals, trainers, and assessors in building a stronger, more capable workforce through data-driven training analysis.
          </p>
          <Button
            size="lg"
            className="bg-blue-500 hover:bg-blue-400 text-white font-semibold px-10"
            onClick={handleGetStarted}
          >
            Begin Assessment Now
            <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 bg-white">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-primary flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-semibold text-foreground">TNA System</span>
            <span className="text-muted-foreground text-sm">— WorldSkills Philippines</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span>Training Needs Analysis Platform</span>
            <span>·</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
