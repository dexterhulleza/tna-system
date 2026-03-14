import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import SurveyStart from "./pages/survey/SurveyStart";
import SurveyQuestions from "./pages/survey/SurveyQuestions";
import SurveyReport from "./pages/survey/SurveyReport";
import SurveyHistory from "./pages/survey/SurveyHistory";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminQuestions from "./pages/admin/AdminQuestions";
import AdminSectors from "./pages/admin/AdminSectors";
import AdminReports from "./pages/admin/AdminReports";
import ProfileSetup from "./pages/ProfileSetup";
import Dashboard from "./pages/Dashboard";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/profile-setup" component={ProfileSetup} />
      <Route path="/dashboard" component={Dashboard} />
      {/* Survey flow */}
      <Route path="/survey/start" component={SurveyStart} />
      <Route path="/survey/:surveyId/questions" component={SurveyQuestions} />
      <Route path="/survey/:surveyId/report" component={SurveyReport} />
      <Route path="/survey/history" component={SurveyHistory} />
      {/* Admin panel */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/questions" component={AdminQuestions} />
      <Route path="/admin/sectors" component={AdminSectors} />
      <Route path="/admin/reports" component={AdminReports} />
      {/* Fallback */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
