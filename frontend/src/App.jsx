import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Landing from "./pages/Landing";
import UploadPage from "./pages/Upload";
import VerifyPage from "./pages/Verify";
import DashboardPage from "./pages/Dashboard";
import LoginPage from "./pages/Login";
import ProtectedRoute from "./auth/ProtectedRoute";
import { useAuth } from "./auth/AuthContext";

function ShellBackdrop() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <div className="absolute inset-0 bg-hero-glow" />
      <div className="absolute -left-32 top-24 h-[28rem] w-[28rem] rounded-full bg-brand-500/16 blur-3xl" />
      <div className="absolute left-1/3 -top-24 h-96 w-96 rounded-full bg-brand-700/13 blur-3xl" />
      <div className="absolute -right-32 bottom-0 h-[26rem] w-[26rem] rounded-full bg-brand-500/10 blur-3xl" />
      <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-emerald-500/5 blur-3xl" />
    </div>
  );
}

function ShellLayout({ children }) {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      <ShellBackdrop />
      <div className="relative z-10">
        <Navbar />
        <main className="mx-auto max-w-[1400px] px-4 pb-16 pt-6 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to={location.state?.from || "/"} replace />
          ) : (
            <LoginPage />
          )
        }
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <ShellLayout>
              <Landing />
            </ShellLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/upload"
        element={
          <ProtectedRoute>
            <ShellLayout>
              <UploadPage />
            </ShellLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/verify"
        element={
          <ProtectedRoute>
            <ShellLayout>
              <VerifyPage />
            </ShellLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/verify/:caseId"
        element={
          <ProtectedRoute>
            <ShellLayout>
              <VerifyPage />
            </ShellLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <ShellLayout>
              <DashboardPage />
            </ShellLayout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
