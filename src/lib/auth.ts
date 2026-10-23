import { jwtDecode } from "jwt-decode";

export const SESSION_TOKEN_KEY = "aalterpaint_session_token";
const TOKEN_KEYS = [SESSION_TOKEN_KEY, "token", "access_token"];

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "viewer" | "user";
  avatar?: string;
  status?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignupCredentials {
  name: string;
  email: string;
  password: string;
}

// ── Token helpers ──────────────────────────────────────────
export function setToken(token: string): void {
  try {
    sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  } catch { }
}

export function getToken(): string | null {
  try {
    for (const key of TOKEN_KEYS) {
      const s = sessionStorage.getItem(key);
      if (s) return s;
      const l = localStorage.getItem(key);
      if (l) return l;
    }
  } catch { }
  return null;
}

export function removeToken(): void {
  try {
    const keysToPurge = [...TOKEN_KEYS, "eichair_token"];
    for (const key of keysToPurge) {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    }
  } catch { }
}

// ── API URL & Headers resolution ───────────────────────────
export function getApiBaseUrl(): string {
  const rawBase = (import.meta.env.VITE_API_BASE_URL || "/api").trim().replace(/\/+$/, "");
  return rawBase.endsWith("/api") ? rawBase : `${rawBase}/api`;
}

export function getAuthHeaders(token?: string): Record<string, string> {
  const t = token || getToken();
  return {
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
    Accept: "application/json",
  };
}

// ── User helpers ───────────────────────────────────────────
export function mapRole(roleIdOrName: any): AuthUser["role"] {
  if (typeof roleIdOrName === "string") {
    const r = roleIdOrName.toLowerCase();
    if (r === "admin" || r === "directie") return "admin";
    if (r === "manager" || r === "beheerder" || r === "beoordelaar") return "manager";
    return "viewer";
  }
  switch (Number(roleIdOrName)) {
    case 1:
      return "admin";
    case 2:
      return "manager";
    default:
      return "viewer";
  }
}

export function getUser(): AuthUser | null {
  try {
    const token = getToken();
    if (!token) return null;
    const decoded: any = jwtDecode(token);

    // If token has expiry claim and is expired, clear token and return null
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      removeToken();
      return null;
    }

    return {
      id: String(decoded.sub || decoded.id || decoded.user_id || ""),
      name: decoded.name || decoded.full_name || (decoded.email ? decoded.email.split("@")[0] : ""),
      email: decoded.email || decoded.sub || "",
      role: mapRole(decoded.role || decoded.role_id),
      avatar: decoded.avatar,
      status: decoded.status || (decoded.is_active === false ? "Inactive" : "Active"),
    };
  } catch {
    return null;
  }
}

// ── Session ────────────────────────────────────────────────
export function isAuthenticated(): boolean {
  const user = getUser();
  return !!user && !!getToken();
}

export function logout(): void {
  removeToken();
}

function parseErrorMessage(result: any, defaultMsg: string): string {
  if (result?.detail) {
    if (typeof result.detail === "string") return result.detail;
    if (Array.isArray(result.detail) && result.detail.length > 0) {
      return result.detail.map((d: any) => d.msg || d.message || JSON.stringify(d)).join(", ");
    }
    return JSON.stringify(result.detail);
  }
  if (result?.message) return result.message;
  return defaultMsg;
}

// ── Login API: POST /api/auth/login ────────────────────────
export async function loginApi(creds: LoginCredentials): Promise<{ success: boolean; message: string; token: string }> {
  const url = `${getApiBaseUrl()}/auth/login`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      email: creds.email.trim(),
      password: creds.password,
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const defaultMsg = response.status === 401 ? "Invalid email or password" : "Login failed";
    throw new Error(parseErrorMessage(result, defaultMsg));
  }

  const token =
    result.access_token ||
    result.data?.access_token ||
    result.token ||
    result.data?.token ||
    result.jwt;

  if (!token) {
    throw new Error(result.message || "No access token received from authentication server");
  }

  return {
    success: true,
    message: result.message || "Login successful",
    token,
  };
}

// ── Register API: POST /api/auth/register ───────────────────
export async function signupApi(creds: SignupCredentials): Promise<{ success: boolean; message: string; user?: AuthUser; token?: string }> {
  const url = `${getApiBaseUrl()}/auth/register`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      name: creds.name.trim(),
      email: creds.email.trim(),
      password: creds.password,
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(parseErrorMessage(result, "Registration failed"));
  }

  const token =
    result.access_token ||
    result.data?.access_token ||
    result.token ||
    result.data?.token;

  return {
    success: true,
    message: result.message || "Account created successfully",
    token,
    user: result.data
      ? {
          id: String(result.data.id || ""),
          name: result.data.name || creds.name,
          email: result.data.email || creds.email,
          role: mapRole(result.data.role || result.data.role_id),
        }
      : undefined,
  };
}

