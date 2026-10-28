import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from "react";
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

import {
  isModuleAllowed,
  isActionAllowed,
  getFirstAllowedModule,
  fetchDynamicRBACPermissions,
  subscribeToPermissionsChanges,
  type FrontendModuleId,
  type UserActions,
} from "../lib/rbac";

export interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  isPermissionsLoading: boolean;
  permissionsError: string | null;
  login: (creds: LoginCredentials) => Promise<{ success: boolean; message: string; token?: string }>;
  signup: (creds: SignupCredentials) => Promise<{ success: boolean; message: string; token?: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  resetPassword: (payload: { token: string; password: string }) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  updateUser: (updated: Partial<AuthUser>) => void;
  // RBAC Access Control
  hasPermission: (moduleKeyOrRoute: string) => boolean;
  canPerformAction: (
    actionKey: string,
    target?: { actions?: UserActions; [key: string]: any } | UserActions | null
  ) => boolean;
  allowedModules: string[];
  firstAllowedModule: FrontendModuleId;
  refreshPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(getUser);
  const [token, setTokenState] = useState<string | null>(getToken);
  const [loading, setLoading] = useState(false);
  const [isPermissionsLoading, setIsPermissionsLoading] = useState(false);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);

  const updateUser = useCallback((updated: Partial<AuthUser>) => {
    setUserState((prev) => {
      if (!prev) return getUser();
      return { ...prev, ...updated };
    });
  }, []);

  // Synchronize dynamic permissions directly from the backend API into in-memory state
  const refreshPermissions = useCallback(async () => {
    const currentTok = getToken();
    if (!currentTok) return;

    try {
      setIsPermissionsLoading(true);
      setPermissionsError(null);
      const data = await fetchDynamicRBACPermissions(true);
      if (!data) return;

      setUserState((prev) => ({
        ...(prev || { id: '', name: '', email: '', role: '' }),
        id: String(data.userId || prev?.id || ''),
        role: data.role || prev?.role || '',
        role_id: data.roleId,
        modules: data.modules,
        settings: data.settings,
        actions: data.actions,
      }));
    } catch (err: any) {
      console.warn('Failed to refresh dynamic permissions from backend:', err);
      setPermissionsError(err?.message || 'Failed to refresh permissions');
    } finally {
      setIsPermissionsLoading(false);
    }
  }, []);

  // Fetch permissions immediately when token exists
  useEffect(() => {
    if (!token) return;
    refreshPermissions();
  }, [token, refreshPermissions]);

  // Real-time synchronization: subscribe to BroadcastChannel and live window events (no localStorage)
  useEffect(() => {
    if (!token) return;

    // 1. Subscribe to BroadcastChannel & live CustomEvent
    const unsubscribe = subscribeToPermissionsChanges(() => {
      refreshPermissions();
    });

    // 2. Re-validate on window focus when user returns to tab
    const handleFocus = () => {
      refreshPermissions();
    };
    window.addEventListener('focus', handleFocus);

    // 3. Heartbeat sync interval every 25 seconds for real-time drift prevention
    const interval = setInterval(() => {
      refreshPermissions();
    }, 25000);

    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [token, refreshPermissions]);

  // Check if current user has permission for a specific module or route dynamically
  const hasPermission = useCallback(
    (moduleKeyOrRoute: string): boolean => {
      return isModuleAllowed(moduleKeyOrRoute, user?.modules);
    },
    [user?.modules]
  );

  // Dynamically evaluate whether an action is permitted by the backend API
  const canPerformAction = useCallback(
    (
      actionKey: string,
      target?: { actions?: UserActions; [key: string]: any } | UserActions | null
    ): boolean => {
      let actionsObj: UserActions | undefined;
      if (target && typeof target === 'object') {
        if ('actions' in target && target.actions && typeof target.actions === 'object') {
          actionsObj = target.actions;
        } else {
          actionsObj = target as UserActions;
        }
      } else {
        actionsObj = user?.actions;
      }

      return isActionAllowed(actionKey, actionsObj);
    },
    [user?.actions]
  );

  // List of allowed backend module keys
  const allowedModules = useMemo(() => {
    return (user?.modules || []).map((m) => m.key);
  }, [user?.modules]);

  // Dynamic first allowed module derived directly from backend-granted modules
  const firstAllowedModule = useMemo(() => {
    return getFirstAllowedModule(user?.modules);
  }, [user?.modules]);

  const login = useCallback(
    async (creds: LoginCredentials) => {
      setLoading(true);
      try {
        const res = await loginApi(creds);
        setToken(res.token);
        setTokenState(res.token);
        setUserState(getUser());

        // Dynamically synchronize live user permissions from backend API
        await refreshPermissions();

        return {
          success: true,
          message: res.message,
          token: res.token,
        };
      } catch (err: any) {
        return {
          success: false,
          message: err?.message || 'Login failed',
        };
      } finally {
        setLoading(false);
      }
    },
    [refreshPermissions]
  );

  const signup = useCallback(
    async (creds: SignupCredentials) => {
      setLoading(true);
      try {
        const res = await signupApi(creds);
        if (res.token) {
          setToken(res.token);
          setTokenState(res.token);
          setUserState(getUser());
          await refreshPermissions();
        }
        return {
          success: true,
          message: res.message,
          token: res.token,
        };
      } catch (err: any) {
        return {
          success: false,
          message: err?.message || 'Signup failed',
        };
      } finally {
        setLoading(false);
      }
    },
    [refreshPermissions]
  );

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
    setPermissionsError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        loading,
        isPermissionsLoading,
        permissionsError,
        login,
        signup,
        forgotPassword,
        resetPassword,
        logout,
        updateUser,
        hasPermission,
        canPerformAction,
        allowedModules,
        firstAllowedModule,
        refreshPermissions,
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
