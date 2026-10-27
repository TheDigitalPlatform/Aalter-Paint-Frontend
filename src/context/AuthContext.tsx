import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import {
  getToken,
  getUser,
  setToken,
  logout as authLogout,
  loginApi,
  signupApi,
  forgotPasswordApi,
  resetPasswordApi,
  type AuthUser,
  type LoginCredentials,
  type SignupCredentials,
} from "../lib/auth";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (creds: LoginCredentials) => Promise<{ success: boolean; message: string; token?: string }>;
  signup: (creds: SignupCredentials) => Promise<{ success: boolean; message: string; token?: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  resetPassword: (payload: { token: string; password: string }) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  updateUser: (updated: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(getUser);
  const [token, setTokenState] = useState<string | null>(getToken);
  const [loading, setLoading] = useState(false);

  const updateUser = useCallback((updated: Partial<AuthUser>) => {
    setUserState(prev => {
      if (!prev) return getUser();
      return { ...prev, ...updated };
    });
  }, []);

  const login = useCallback(async (creds: LoginCredentials) => {
    setLoading(true);
    try {
      const res = await loginApi(creds);
      setToken(res.token);
      setTokenState(res.token);
      setUserState(getUser());
      return {
        success: true,
        message: res.message,
        token: res.token,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || "Login failed",
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const signup = useCallback(async (creds: SignupCredentials) => {
    setLoading(true);
    try {
      const res = await signupApi(creds);
      if (res.token) {
        setToken(res.token);
        setTokenState(res.token);
        setUserState(getUser());
      }
      return {
        success: true,
        message: res.message,
        token: res.token,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || "Signup failed",
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    setLoading(true);
    try {
      const res = await forgotPasswordApi(email);
      return res;
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (payload: { token: string; password: string }) => {
    setLoading(true);
    try {
      const res = await resetPasswordApi(payload);
      return res;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authLogout();
    setTokenState(null);
    setUserState(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        loading,
        login,
        signup,
        forgotPassword,
        resetPassword,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
