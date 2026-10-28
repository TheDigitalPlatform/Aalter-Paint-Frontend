import { getApiBaseUrl, getAuthHeaders } from './auth';

export type FrontendModuleId =
  | 'overview'
  | 'insights'
  | 'orders'
  | 'validation'
  | 'exceptions'
  | 'institutions'
  | 'roles'
  | 'audit'
  | 'learning'
  | 'profile';

export interface GrantedModule {
  id?: number;
  key: string;
  name?: string;
}

export interface UserActions {
  view_as?: boolean;
  edit?: boolean;
  delete?: boolean;
  [actionName: string]: boolean | undefined;
}

export interface SettingsAccess {
  module_key: string;
  module_name: string;
  has_access: boolean;
  label: string;
}

export interface DynamicRBACPayload {
  userId: string | number;
  role: string;
  roleId?: number;
  modules: GrantedModule[];
  settings?: SettingsAccess;
  actions: UserActions;
}

export interface DynamicRBACState extends DynamicRBACPayload {
  isLoading: boolean;
  error: string | null;
  lastSyncedAt: number | null;
}

/**
 * Normalizes any module key or route name into a standardized key format.
 */
export function normalizeModuleKey(keyOrRoute: string): string {
  const clean = (keyOrRoute || '').trim().toLowerCase().replace(/^\/+/, '');
  if (clean === 'exceptions') return 'exceptions_bc_sync';
  if (clean === 'roles') return 'roles_and_access';
  if (clean === 'audit') return 'audit_trail';
  if (clean === 'learning') return 'learning_loop';
  if (clean === 'settings') return 'institutions';
  return clean;
}

/**
 * Maps a backend module key to its corresponding frontend route path.
 */
export function backendKeyToRoute(backendKey: string): FrontendModuleId {
  const clean = (backendKey || '').trim().toLowerCase();
  if (clean === 'exceptions_bc_sync') return 'exceptions';
  if (clean === 'roles_and_access') return 'roles';
  if (clean === 'audit_trail') return 'audit';
  if (clean === 'learning_loop') return 'learning';
  if (clean === 'institutions') return 'institutions';
  if (clean === 'orders') return 'orders';
  if (clean === 'validation') return 'validation';
  if (clean === 'insights') return 'insights';
  if (clean === 'overview') return 'overview';
  return 'profile';
}

/**
 * Returns a human-readable display name for any module.
 */
export function getModuleDisplayName(moduleId: string, lang: 'NL' | 'EN' = 'NL'): string {
  const norm = normalizeModuleKey(moduleId);
  const titles: Record<string, { nl: string; en: string }> = {
    overview: { nl: 'Overzicht', en: 'Overview' },
    insights: { nl: 'Inzichten', en: 'Insights' },
    orders: { nl: 'Orders', en: 'Orders' },
    validation: { nl: 'Validatie', en: 'Validation' },
    exceptions_bc_sync: { nl: 'Uitzonderingen en BC-sync', en: 'Exceptions and BC-sync' },
    institutions: { nl: 'Instellingen', en: 'Settings' },
    roles_and_access: { nl: 'Rollen en toegang', en: 'Roles and access' },
    audit_trail: { nl: 'Audittrail', en: 'Audit trail' },
    learning_loop: { nl: 'Learning loop', en: 'Learning loop' },
    profile: { nl: 'Mijn profiel', en: 'My Profile' },
  };

  if (titles[norm]) {
    return lang === 'NL' ? titles[norm].nl : titles[norm].en;
  }
  return moduleId.charAt(0).toUpperCase() + moduleId.slice(1);
}

/**
 * Checks whether the user has access to a given module based strictly on the
 * backend-granted modules array. Fail-closed: returns false if not permitted.
 */
export function isModuleAllowed(
  moduleIdOrKey: string,
  grantedModules: GrantedModule[] | null | undefined
): boolean {
  const clean = (moduleIdOrKey || '').trim().toLowerCase().replace(/^\/+/, '');

  // User profile is universally permitted for any authenticated user
  if (clean === 'profile') {
    return true;
  }

  if (!grantedModules || !Array.isArray(grantedModules) || grantedModules.length === 0) {
    return false;
  }

  const targetKey = normalizeModuleKey(clean);
  return grantedModules.some(
    (m) => (m.key || '').trim().toLowerCase() === targetKey
  );
}

/**
 * Checks whether an action (view_as, edit, delete, etc.) is permitted by the backend.
 */
export function isActionAllowed(
  actionKey: keyof UserActions | string,
  actions: UserActions | null | undefined
): boolean {
  if (!actions) return false;
  return actions[actionKey] === true;
}

/**
 * Returns the first accessible module route strictly from the backend-granted modules list.
 * Fallbacks to 'profile' if no other modules are granted by the backend.
 */
export function getFirstAllowedModule(
  grantedModules: GrantedModule[] | null | undefined
): FrontendModuleId {
  if (grantedModules && Array.isArray(grantedModules) && grantedModules.length > 0) {
    const first = grantedModules[0];
    if (first && first.key) {
      return backendKeyToRoute(first.key);
    }
  }

  return 'profile';
}

// ── Backend API Direct Integration (In-Memory RBAC - No localStorage) ───────

let activeRBACPromise: Promise<DynamicRBACPayload> | null = null;

function parseApiError(data: any, fallback: string): string {
  if (data?.detail) {
    if (typeof data.detail === 'string') return data.detail;
    if (Array.isArray(data.detail) && data.detail.length > 0) {
      return data.detail.map((d: any) => d.msg || d.message || JSON.stringify(d)).join(', ');
    }
    return JSON.stringify(data.detail);
  }
  if (data?.message) return data.message;
  return fallback;
}

/**
 * Fetches dynamic RBAC permissions directly from the backend API (GET /api/users/profile).
 * Does NOT persist or read permissions from localStorage to ensure strictly server-authoritative RBAC.
 */
export async function fetchDynamicRBACPermissions(forceRefresh = false): Promise<DynamicRBACPayload> {
  if (activeRBACPromise && !forceRefresh) {
    return activeRBACPromise;
  }

  const promise = (async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/users/profile`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(parseApiError(json, `Failed to load dynamic permissions (HTTP ${res.status})`));
      }

      if (json.success === false) {
        throw new Error(json.message || json.detail || 'Failed to load permissions from backend');
      }

      const data = json.data !== undefined ? json.data : json;

      const roleStr = typeof data.role === 'object' && data.role !== null && 'name' in data.role
        ? data.role.name
        : (data.role ? String(data.role) : '');

      const payload: DynamicRBACPayload = {
        userId: data.id !== undefined ? data.id : '',
        role: roleStr,
        roleId: data.role_id ?? data.role?.id,
        modules: Array.isArray(data.modules) ? data.modules : [],
        settings: data.settings,
        actions: data.actions || {},
      };

      return payload;
    } finally {
      activeRBACPromise = null;
    }
  })();

  activeRBACPromise = promise;
  return promise;
}

// ── In-Memory Real-Time Event Synchronization (No localStorage) ─────────────

const RBAC_SYNC_CHANNEL_NAME = 'aalterpaint_rbac_sync_channel';
export const RBAC_PERMISSIONS_CHANGED_EVENT = 'aalterpaint_rbac_permissions_changed';

/**
 * Broadcasts permission updates in real time to all open windows/tabs and components
 * using BroadcastChannel and in-memory CustomEvent (strictly without localStorage).
 */
export function broadcastPermissionsChanged(): void {
  const payload = { type: 'RBAC_LIVE_SYNC', timestamp: Date.now() };

  // 1. Cross-tab real-time sync via BroadcastChannel
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel(RBAC_SYNC_CHANNEL_NAME);
      channel.postMessage(payload);
      channel.close();
    }
  } catch {}

  // 2. In-memory window event for active application components
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(RBAC_PERMISSIONS_CHANGED_EVENT, { detail: payload })
      );
    }
  } catch {}
}

/**
 * Subscribes to real-time permission sync events (BroadcastChannel and in-memory events).
 * Returns an unsubscription callback.
 */
export function subscribeToPermissionsChanges(callback: () => void): () => void {
  let channel: BroadcastChannel | null = null;

  const handleCustomEvent = () => {
    callback();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener(RBAC_PERMISSIONS_CHANGED_EVENT, handleCustomEvent);

    if ('BroadcastChannel' in window) {
      try {
        channel = new BroadcastChannel(RBAC_SYNC_CHANNEL_NAME);
        channel.onmessage = () => {
          callback();
        };
      } catch {}
    }
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener(RBAC_PERMISSIONS_CHANGED_EVENT, handleCustomEvent);
    }
    if (channel) {
      try {
        channel.close();
      } catch {}
    }
  };
}
