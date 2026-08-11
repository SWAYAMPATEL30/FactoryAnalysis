import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

// Marketing pages
import { HomePage } from "./pages/marketing/HomePage";
import { HowItWorksPage } from "./pages/marketing/HowItWorksPage";
import { MostMethodologyPage } from "./pages/marketing/MostMethodologyPage";
import { IndustriesPage } from "./pages/marketing/IndustriesPage";
import { AboutPage } from "./pages/marketing/AboutPage";

// Auth
import { LoginPage } from "./pages/auth/LoginPage";

// App pages
import { AppLayout } from "./components/layout/AppLayout";
import { DashboardPage } from "./pages/app/DashboardPage";
import { WorkstationsListPage } from "./pages/app/WorkstationsListPage";
import { WorkstationDetailPage } from "./pages/app/WorkstationDetailPage";
import { ReviewConsole } from "./pages/ReviewConsole";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      {/* Public marketing routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/how-it-works" element={<HowItWorksPage />} />
      <Route path="/most-methodology" element={<MostMethodologyPage />} />
      <Route path="/industries" element={<IndustriesPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Authenticated app routes */}
      <Route
        path="/app"
        element={
          <AuthGuard>
            <AppLayout />
          </AuthGuard>
        }
      >
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="workstations" element={<WorkstationsListPage />} />
        <Route path="workstations/:stationId" element={<WorkstationDetailPage />} />
        <Route path="jobs/:jobId" element={<ReviewConsole />} />
      </Route>

      {/* Legacy direct job route (backwards compat) */}
      <Route path="/jobs/:jobId" element={<ReviewConsole />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
