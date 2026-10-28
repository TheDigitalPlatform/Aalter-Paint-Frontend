import { getApiBaseUrl, getAuthHeaders } from './auth';

export interface RoleObject {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserActions {
  view_as?: boolean;
  edit?: boolean;
  delete?: boolean;
}

export interface SettingsInfo {
  module_key: string;
  module_name: string;
  has_access: boolean;
  label: string;
}

export interface UserRow {
  id: number | string;
  name: string;
  email: string;
  role: RoleObject | string | null;
  role_id?: number;
  created_at?: string;
  updated_at?: string;
  status?: string;
  is_active?: boolean;
  actions?: UserActions;
  modules?: Array<{ id?: number; key: string; name?: string }>;
  settings?: SettingsInfo;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role_id: number;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  role_id?: number;
  password?: string;
}

export interface ProfileUpdatePayload {
  name: string;
  email: string;
}

export interface FetchUsersResponse {
  items: UserRow[];
  total: number;
}

function parseApiError(data: any, defaultMsg: string): string {
  if (data?.detail) {
    if (typeof data.detail === 'string') return data.detail;
    if (Array.isArray(data.detail) && data.detail.length > 0) {
      return data.detail.map((d: any) => d.msg || d.message || JSON.stringify(d)).join(', ');
    }
    return JSON.stringify(data.detail);
  }
  if (data?.message) return data.message;
  return defaultMsg;
}

// GET /api/users/profile
export async function fetchMyProfile(): Promise<UserRow> {
  const res = await fetch(`${getApiBaseUrl()}/users/profile`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(parseApiError(data, 'Failed to fetch profile'));
  }
  if (data.success === false) {
    throw new Error(data.message || data.detail || 'Failed to fetch profile');
  }
  return data.data !== undefined ? data.data : data;
}

// PUT /api/users/profile
export async function updateMyProfile(payload: ProfileUpdatePayload): Promise<UserRow> {
  const res = await fetch(`${getApiBaseUrl()}/users/profile`, {
    method: 'PUT',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(parseApiError(data, 'Failed to update profile'));
  }
  if (data.success === false) {
    throw new Error(data.message || data.detail || 'Failed to update profile');
  }
  return data.data !== undefined ? data.data : data;
}

// GET /api/users
export async function fetchUsers(skip = 0, limit = 100): Promise<UserRow[]> {
  const res = await fetch(`${getApiBaseUrl()}/users?skip=${skip}&limit=${limit}`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(parseApiError(data, 'Failed to fetch users'));
  }
  if (data.success === false) {
    throw new Error(data.message || data.detail || 'Failed to fetch users');
  }
  const result = data.data !== undefined ? data.data : data;
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.items)) return result.items;
  return [];
}

// GET /api/roles
export async function fetchRoles(skip = 0, limit = 100): Promise<RoleObject[]> {
  const res = await fetch(`${getApiBaseUrl()}/roles?skip=${skip}&limit=${limit}`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(parseApiError(data, 'Failed to fetch roles'));
  }
  if (data.success === false) {
    throw new Error(data.message || data.detail || 'Failed to fetch roles');
  }
  return data.data !== undefined ? data.data : data;
}

// POST /api/users
export async function createUser(payload: CreateUserPayload): Promise<UserRow> {
  const res = await fetch(`${getApiBaseUrl()}/users`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(parseApiError(data, 'Failed to create user'));
  }
  if (data.success === false) {
    throw new Error(data.message || data.detail || 'Failed to create user');
  }
  return data.data !== undefined ? data.data : data;
}

// DELETE /api/users/{id}
export async function deleteUser(userId: string | number): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/users/${userId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(parseApiError(data, 'Failed to delete user'));
  }
  if (data.success === false) {
    throw new Error(data.message || data.detail || 'Failed to delete user');
  }
}

// GET /api/users/{id}
export async function fetchUserById(userId: string | number): Promise<UserRow> {
  const res = await fetch(`${getApiBaseUrl()}/users/${userId}`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(parseApiError(data, 'Failed to fetch user'));
  }
  if (data.success === false) {
    throw new Error(data.message || data.detail || 'Failed to fetch user');
  }
  return data.data !== undefined ? data.data : data;
}

// PUT /api/users/{id}
export async function updateUser(userId: string | number, payload: UpdateUserPayload): Promise<UserRow> {
  const res = await fetch(`${getApiBaseUrl()}/users/${userId}`, {
    method: 'PUT',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(parseApiError(data, 'Failed to update user'));
  }
  if (data.success === false) {
    throw new Error(data.message || data.detail || 'Failed to update user');
  }
  return data.data !== undefined ? data.data : data;
}

/**
 * Safely extract string role name from UserRow or RoleObject
 */
export function getRoleName(role: RoleObject | string | null | undefined): string {
  if (!role) return '';
  if (typeof role === 'object' && role !== null && 'name' in role) {
    return role.name || '';
  }
  return typeof role === 'string' ? role : '';
}

/**
 * Generate accurate two-character uppercase initials from full name or email.
 * e.g., "Admin User" -> "AU", "Bart Van Damme" -> "BD", "John" -> "JO", "user@aalterpaint.be" -> "UA"
 */
export function getInitials(name?: string): string {
  if (!name || !name.trim()) return '--';
  const clean = name.trim().replace(/[@._-]/g, ' ');
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '--';
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Compatibility aliases
export const fetchUserProfileApi = fetchMyProfile;
export const updateUserProfileApi = updateMyProfile;
export const getProfileApi = fetchMyProfile;
export const updateProfileApi = updateMyProfile;
export const getRolesApi = fetchRoles;
export type UserProfileResponse = UserRow;
export type UpdateProfilePayload = ProfileUpdatePayload;
