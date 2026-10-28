import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { HomePage } from './pages/HomePage';

const ProtectedRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

const PublicRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading, firstAllowedModule } = useAuth();

  if (loading) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to={`/${firstAllowedModule}`} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

const RootRedirect: React.FC = () => {
  const { isAuthenticated, loading, firstAllowedModule } = useAuth();

  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={`/${firstAllowedModule}`} replace />;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Dynamic Root redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* Public Auth Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <SignupPage />
          </PublicRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <ForgotPasswordPage />
          </PublicRoute>
        }
      />
      <Route
        path="/reset-password"
        element={
          <PublicRoute>
            <ResetPasswordPage />
          </PublicRoute>
        }
      />

      {/* Protected Dashboard Routes (Route & UI access guarded dynamically) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/overview" element={<HomePage initialModule="overview" />} />
        <Route path="/insights" element={<HomePage initialModule="insights" />} />
        <Route path="/orders" element={<HomePage initialModule="orders" />} />
        <Route path="/validation" element={<HomePage initialModule="validation" />} />
        <Route path="/exceptions" element={<HomePage initialModule="exceptions" />} />
        <Route path="/institutions" element={<HomePage initialModule="institutions" />} />
        <Route path="/roles" element={<HomePage initialModule="roles" />} />
        <Route path="/audit" element={<HomePage initialModule="audit" />} />
        <Route path="/learning" element={<HomePage initialModule="learning" />} />
        <Route path="/profile" element={<HomePage initialModule="profile" />} />
        <Route path="/home" element={<RootRedirect />} />
      </Route>

      {/* Wildcard fallback: Redirect unknown paths to dynamic root */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
