/**
 * Landing Page — ONE OBJECTIVE: Get the user to start their assessment or log in.
 * Rules: 3-second clarity · always-visible primary CTA · no decorative content
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { ArrowRight, BookOpen, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect } from "react";
export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  // If already logged in, route to the right dashboard immediately
  // MUST be in useEffect — never call navigate() in render body
  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      if (user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    }
  }, [loading, isAuthenticated, user, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Minimal top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-sm tracking-tight">TNA System</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-400 hover:text-white"
          onClick={() => { window.location.href = getLoginUrl("/dashboard"); }}
        >
          Sign in
        </Button>
      </header>

      {/* Hero — full focus on the single CTA */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-lg w-full space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-xs text-blue-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            TESDA / NTESDP Aligned
          </div>

          {/* Headline — what it does in one line */}
          <div className="space-y-3">
            <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight tracking-tight">
              Find your training<br />
              <span className="text-blue-400">gaps in minutes.</span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed">
              Answer a short assessment. Get a personalized training plan aligned to TESDA competency standards.
            </p>
          </div>

          {/* PRIMARY CTA — always visible, impossible to miss */}
          {loading ? (
            <div className="flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                size="lg"
                className="w-full sm:w-auto px-10 py-6 text-base font-semibold bg-blue-500 hover:bg-blue-400 text-white rounded-xl shadow-lg shadow-blue-500/25"
                onClick={() => { window.location.href = getLoginUrl("/dashboard"); }}
              >
                Start Assessment
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <p className="text-xs text-slate-500">
                Free to use · No credit card required
              </p>
            </div>
          )}

          {/* 3 trust signals — minimal, no icons needed */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800">
            {[
              { label: "WorldSkills Sectors", value: "6" },
              { label: "Competency Areas", value: "5" },
              { label: "TESDA Sections", value: "9" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Minimal footer — HR Officer entry point */}
      <footer className="px-6 py-5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-xs text-slate-600">
          {[
            "WorldSkills Philippines",
            "TESDA Aligned",
            "AI-Powered",
          ].map((t, i) => (
            <span key={t} className="flex items-center gap-1.5">
              {i > 0 && <span className="w-1 h-1 rounded-full bg-slate-700" />}
              <CheckCircle2 className="w-3 h-3 text-slate-600" />
              {t}
            </span>
          ))}
        </div>
        <button
          className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
          onClick={() => { window.location.href = getLoginUrl("/admin"); }}
        >
          HR Officer / Admin login →
        </button>
      </footer>
    </div>
  );
}
