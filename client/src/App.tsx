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
