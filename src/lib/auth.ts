import { jwtDecode } from "jwt-decode";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const TOKEN_KEY = "aalterpaint_token";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "viewer";
  avatar?: string;
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
export function setToken(token: string, _rememberMe = false): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY) || sessionStorage.getItem("eichair_token");
}

export function removeToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem("eichair_token");
}

// ── User helpers ───────────────────────────────────────────

export function getUser(): AuthUser | null {
  try {
    const token = getToken();
    if (!token) return null;
    const decoded: any = jwtDecode(token);

    return {
      id: String(decoded.sub || decoded.id || ""),
      name: decoded.name || "",
      email: decoded.email || "",
      role: decoded.role || mapRole(decoded.role_id),
      avatar: decoded.avatar,
    };
  } catch {
    return null;
  }
}

// ── Session ────────────────────────────────────────────────
export function isAuthenticated(): boolean {
  return !!getToken();
}

export function logout(): void {
  removeToken();
}

// Helper to map backend role_id to frontend role
function mapRole(roleId: number): AuthUser["role"] {
  switch (roleId) {
    case 1:
      return "admin";
    case 2:
      return "manager";
    default:
      return "viewer";
  }
}

// ── Login API ──────────────────────────────────────────────
export async function loginApi(creds: LoginCredentials): Promise<{ success: boolean; message: string; token: string }> {
  const response = await fetch(`${API_BASE_URL}auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: creds.email,
      password: creds.password,
    }),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    let msg = result.message || "Login failed";
    if (result && result.detail) {
      msg = result.detail;
    }
    throw new Error(msg);
  }

  return {
    success: result.success,
    message: result.message,
    token: result.data.access_token
  };
}

// ── Register API ───────────────────────────────────────────
export async function signupApi(creds: SignupCredentials): Promise<{ success: boolean; message: string; user: AuthUser; token?: string }> {
  const response = await fetch(`${API_BASE_URL}auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: creds.name,
      email: creds.email,
      password: creds.password,
    }),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Registration failed");
  }

  const data = result.data;

  return {
    success: result.success,
    message: result.message,
    user: {
      id: String(data.id),
      name: data.name,
      email: data.email,
      role: mapRole(data.role_id),
    },
  };
}
