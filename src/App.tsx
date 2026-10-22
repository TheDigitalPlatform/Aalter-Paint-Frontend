import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
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
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/overview" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

const RootRedirect: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to="/overview" replace />;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Root redirect */}
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

      {/* Protected Dashboard Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/overview" element={<HomePage initialModule="overview" />} />
        <Route path="/overzicht" element={<HomePage initialModule="overview" />} />
        <Route path="/insights" element={<HomePage initialModule="insights" />} />
        <Route path="/orders" element={<HomePage initialModule="orders" />} />
        <Route path="/validation" element={<HomePage initialModule="validation" />} />
        <Route path="/validatie" element={<HomePage initialModule="validation" />} />
        <Route path="/exceptions" element={<HomePage initialModule="exceptions" />} />
        <Route path="/uitzonderingen" element={<HomePage initialModule="exceptions" />} />
        <Route path="/institutions" element={<HomePage initialModule="institutions" />} />
        <Route path="/instellingen" element={<HomePage initialModule="institutions" />} />
        <Route path="/settings" element={<HomePage initialModule="institutions" />} />
        <Route path="/roles" element={<HomePage initialModule="roles" />} />
        <Route path="/rollen" element={<HomePage initialModule="roles" />} />
        <Route path="/audit" element={<HomePage initialModule="audit" />} />
        <Route path="/audittrail" element={<HomePage initialModule="audit" />} />
        <Route path="/learning" element={<HomePage initialModule="learning" />} />
        <Route path="/learning-loop" element={<HomePage initialModule="learning" />} />
        <Route path="/learningloop" element={<HomePage initialModule="learning" />} />
        <Route path="/home" element={<Navigate to="/overview" replace />} />
      </Route>

      {/* Wildcard fallback: Redirect unknown paths to / */}
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
