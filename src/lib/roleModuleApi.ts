import { getApiBaseUrl, getAuthHeaders } from './auth';

export interface ModuleItem {
  id: number;
  key: string;
  name: string;
}

export interface RoleModuleAccess {
  module_id: number;
  key: string;
  name: string;
  has_access: boolean;
}

export interface RoleWithModules {
  id: number;
  name: string;
  description: string;
  modules: RoleModuleAccess[];
}

export interface RoleModuleMatrixData {
  modules: ModuleItem[];
  roles: RoleWithModules[];
}

export interface PermissionUpdateItem {
  role_id: number;
  module_id: number;
  has_access: boolean;
}

export interface RoleModulePermissionUpdateRequest {
  permissions: PermissionUpdateItem[];
}

export interface RoleModuleApiResponse {
  success: boolean;
  message: string;
  data: RoleModuleMatrixData;
}

/**
 * Deterministic badge color styling for roles dynamically returned from backend
 * Returns [backgroundColor, textColor, borderColor]
 */
export function getRoleBadgeStyle(roleName: string): [string, string, string] {
  const norm = (roleName || '').toLowerCase().trim();
  // Managing board / Executive
  if (norm.includes('board') || norm.includes('directie') || norm.includes('manage')) {
    return ['#F1F5F9', '#1E293B', '#CBD5E1'];
  }
  // Administrator
  if (norm.includes('admin') || norm.includes('beheerder')) {
    return ['#FEF3C7', '#92400E', '#FDE68A'];
  }
  // Reviewer
  if (norm.includes('review') || norm.includes('beoordeel')) {
    return ['#EFF6FF', '#1D4ED8', '#BFDBFE'];
  }
  // Sales
  if (norm.includes('sale') || norm.includes('verkoop')) {
    return ['#F8FAFC', '#475569', '#E2E8F0'];
  }
  // Viewer / Guest
  if (norm.includes('view') || norm.includes('kijk')) {
    return ['#EFF6FF', '#2563EB', '#BFDBFE'];
  }
  // Default fallback
  return ['#F1F5F9', '#334155', '#E2E8F0'];
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

// ── GET /api/role-modules ───────────────────────────────────────────────────
// In-flight promise tracker to deduplicate concurrent requests and guarantee only 1 network call
let activeMatrixPromise: Promise<RoleModuleMatrixData> | null = null;

// Fetches live role-module permissions matrix directly from the backend
export async function fetchRoleModuleMatrix(forceRefresh = false): Promise<RoleModuleMatrixData> {
  if (activeMatrixPromise && !forceRefresh) {
    return activeMatrixPromise;
  }

  const promise = (async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/role-modules`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(parseApiError(data, 'Failed to fetch role module access matrix'));
      }
      if (data.success === false) {
        throw new Error(data.message || data.detail || 'Failed to fetch role module matrix');
      }

      const result = data.data !== undefined ? data.data : data;

      if (!result || !Array.isArray(result.modules) || !Array.isArray(result.roles)) {
        throw new Error('Invalid matrix payload received from backend API');
      }

      return result as RoleModuleMatrixData;
    } finally {
      activeMatrixPromise = null;
    }
  })();

  activeMatrixPromise = promise;
  return promise;
}

import { broadcastPermissionsChanged } from './rbac';

// ── PUT /api/role-modules ───────────────────────────────────────────────────
// Updates role-module permissions dynamically on the backend
export async function updateRoleModulePermissions(
  permissions: PermissionUpdateItem[]
): Promise<RoleModuleMatrixData> {
  if (!permissions || permissions.length === 0) {
    throw new Error('Permissions list must not be empty');
  }

  const payload: RoleModulePermissionUpdateRequest = {
    permissions,
  };

  const res = await fetch(`${getApiBaseUrl()}/role-modules`, {
    method: 'PUT',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(parseApiError(data, 'Failed to update role module permissions'));
  }
  if (data.success === false) {
    throw new Error(data.message || data.detail || 'Failed to update role module permissions');
  }

  const result = data.data !== undefined ? data.data : data;

  // Broadcast permission update in real-time across tabs and components
  broadcastPermissionsChanged();

  return result as RoleModuleMatrixData;
}
