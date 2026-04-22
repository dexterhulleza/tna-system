import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AdminLayout from "./components/AdminLayout";
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
import AdminAISettings from "./pages/admin/AdminAISettings";
import ManageGroups from "./pages/admin/ManageGroups";
import CreateSurveyGroup from "./pages/admin/CreateSurveyGroup";
import EditSurveyGroup from "./pages/admin/EditSurveyGroup";
import AdminTrainingPlans from "./pages/admin/AdminTrainingPlans";
import CompanyInfo from "@/pages/admin/CompanyInfo";
import AdminResults from "@/pages/admin/AdminResults";
import SurveyConfiguration from "./pages/admin/SurveyConfiguration";
import ProfileSetup from "./pages/ProfileSetup";
import AdminAuditLogs from "./pages/admin/AdminAuditLogs";
import AdminTesdaLibrary from "./pages/admin/AdminTesdaLibrary";
import AdminTaskMapping from "./pages/admin/AdminTaskMapping";
import AdminScoringWeights from "./pages/admin/AdminScoringWeights";
import AdminTargetProficiency from "./pages/admin/AdminTargetProficiency";
import AdminGapRecords from "./pages/admin/AdminGapRecords";
import AdminPrioritizationMatrix from "./pages/admin/AdminPrioritizationMatrix";
import AdminSupervisorValidation from "./pages/admin/AdminSupervisorValidation";
import AdminCurriculumBlueprints from "./pages/admin/AdminCurriculumBlueprints";
import AdminCurriculumDetail from "./pages/admin/AdminCurriculumDetail";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import Dashboard from "./pages/Dashboard";

/** Wrap a page component in AdminLayout */
function withAdminLayout(Component: React.ComponentType) {
  return function AdminPage() {
    return (
      <AdminLayout>
        <Component />
      </AdminLayout>
    );
  };
}

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={Home} />
      <Route path="/profile-setup" component={ProfileSetup} />

      {/* Staff portal */}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/survey/start" component={SurveyStart} />
      <Route path="/survey/:surveyId/questions" component={SurveyQuestions} />
      <Route path="/survey/:surveyId/report" component={SurveyReport} />
      <Route path="/survey/history" component={SurveyHistory} />

      {/* HR Officer / Admin panel — all wrapped in AdminLayout */}
      <Route path="/admin" component={withAdminLayout(AdminDashboard)} />
      <Route path="/admin/users" component={withAdminLayout(AdminUsers)} />
      <Route path="/admin/questions" component={withAdminLayout(AdminQuestions)} />
      <Route path="/admin/sectors" component={withAdminLayout(AdminSectors)} />
      <Route path="/admin/reports" component={withAdminLayout(AdminReports)} />
      <Route path="/admin/groups" component={withAdminLayout(ManageGroups)} />
      <Route path="/admin/survey-groups/create" component={withAdminLayout(CreateSurveyGroup)} />
      <Route path="/admin/survey-groups/:id/edit" component={withAdminLayout(EditSurveyGroup)} />
      <Route path="/admin/training-plans" component={withAdminLayout(AdminTrainingPlans)} />
      <Route path="/admin/survey-config" component={withAdminLayout(SurveyConfiguration)} />
      <Route path="/admin/ai-settings" component={withAdminLayout(AdminAISettings)} />
        <Route path="/admin/company-info" component={withAdminLayout(CompanyInfo)} />
        <Route path="/admin/results" component={withAdminLayout(AdminResults)} />

      {/* Auth routes */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      {/* Admin audit logs */}
      <Route path="/admin/audit-logs" component={withAdminLayout(AdminAuditLogs)} />
      {/* TNA Engine pages (T1-4, T1-5, T1-6) */}
      <Route path="/admin/tesda-library" component={withAdminLayout(AdminTesdaLibrary)} />
      <Route path="/admin/task-mapping" component={withAdminLayout(AdminTaskMapping)} />
      <Route path="/admin/scoring-weights" component={withAdminLayout(AdminScoringWeights)} />
      {/* TNA Engine pages (T2-1 to T2-4) */}
      <Route path="/admin/target-proficiency" component={withAdminLayout(AdminTargetProficiency)} />
      <Route path="/admin/gap-records" component={withAdminLayout(AdminGapRecords)} />
      <Route path="/admin/prioritization" component={withAdminLayout(AdminPrioritizationMatrix)} />
      <Route path="/admin/supervisor-validation" component={withAdminLayout(AdminSupervisorValidation)} />
      {/* Curriculum Engine pages (T3-1 to T3-4) */}
      <Route path="/admin/curriculum" component={withAdminLayout(AdminCurriculumBlueprints)} />
      <Route path="/admin/curriculum/:id" component={withAdminLayout(AdminCurriculumDetail)} />
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
