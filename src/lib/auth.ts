import { jwtDecode } from "jwt-decode";

const TOKEN_KEY = "aalterpaint_session_token";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "viewer" | "user";
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

// ── Token helpers (Strictly using sessionStorage, no localStorage) ───
export function setToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function removeToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

// ── User helpers ───────────────────────────────────────────
function mapRole(roleIdOrName: any): AuthUser["role"] {
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
      name: decoded.name || decoded.full_name || (decoded.email ? decoded.email.split("@")[0] : "User"),
      email: decoded.email || decoded.sub || "",
      role: mapRole(decoded.role || decoded.role_id),
      avatar: decoded.avatar,
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

// ── API URL resolution ───────────────────────────────────────
function getAuthUrl(endpoint: "login" | "register"): string {
  const rawBase = (import.meta.env.VITE_API_BASE_URL || "/api").trim().replace(/\/+$/, "");
  if (rawBase.endsWith("/api")) {
    return `${rawBase}/auth/${endpoint}`;
  }
  return `${rawBase}/api/auth/${endpoint}`;
}

// ── Login API: POST /api/auth/login ────────────────────────
export async function loginApi(creds: LoginCredentials): Promise<{ success: boolean; message: string; token: string }> {
  const url = getAuthUrl("login");

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
    let msg = "Login failed";
    if (result.detail) {
      if (typeof result.detail === "string") {
        msg = result.detail;
      } else if (Array.isArray(result.detail) && result.detail.length > 0) {
        msg = result.detail.map((d: any) => d.msg || d.message || JSON.stringify(d)).join(", ");
      }
    } else if (result.message) {
      msg = result.message;
    } else if (response.status === 401) {
      msg = "Invalid email or password";
    }
    throw new Error(msg);
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
  const url = getAuthUrl("register");

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
    let msg = "Registration failed";
    if (result.detail) {
      if (typeof result.detail === "string") {
        msg = result.detail;
      } else if (Array.isArray(result.detail) && result.detail.length > 0) {
        msg = result.detail.map((d: any) => d.msg || d.message || JSON.stringify(d)).join(", ");
      }
    } else if (result.message) {
      msg = result.message;
    }
    throw new Error(msg);
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
