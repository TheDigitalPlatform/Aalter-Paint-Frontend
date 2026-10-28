import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, Trash2, Loader2, Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import type { Language } from '../../locales/loadLocale';
import {
  fetchRoleModuleMatrix,
  updateRoleModulePermissions,
  getRoleBadgeStyle,
  type RoleModuleMatrixData,
} from '../../lib/roleModuleApi';
import {
  fetchUsers,
  fetchRoles,
  createUser,
  updateUser,
  deleteUser,
  type RoleObject,
  type CreateUserPayload,
  type UpdateUserPayload,
} from '../../lib/profileApi';
import { broadcastPermissionsChanged } from '../../lib/rbac';

interface RolesViewProps {
  language?: Language;
  currentUserId?: string;
}

export interface UserRow {
  id: string | number;
  name: string;
  email: string;
  role: string;
  role_id?: number;
  created_at?: string;
  updated_at?: string;
  actions?: {
    view_as?: boolean;
    edit?: boolean;
    delete?: boolean;
  };
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Declarative mapping to translate backend API / network exceptions into localized messages
const API_ERROR_RULES: Array<{ pattern: RegExp; key: string }> = [
  { pattern: /already exists|already in use|bestaat al/i, key: 'roles.error_user_exists' },
  { pattern: /name is required|naam is verplicht/i, key: 'roles.error_name_required' },
  { pattern: /email/i, key: 'roles.error_email_required' },
  { pattern: /select.*role|selecteer.*rol/i, key: 'roles.error_role_required' },
  { pattern: /role not found|rol niet gevonden/i, key: 'roles.error_role_not_found' },
  { pattern: /password.*(required|verplicht)/i, key: 'roles.error_password_required' },
  { pattern: /6 characters|6 tekens/i, key: 'roles.error_password_min' },
  { pattern: /own account|eigen account/i, key: 'roles.error_cannot_delete_self' },
  { pattern: /cannot be deleted|niet worden verwijderd/i, key: 'roles.error_cannot_delete_user' },
  { pattern: /user not found|gebruiker niet gevonden/i, key: 'roles.error_user_not_found' },
  { pattern: /permission|forbidden|toestemming/i, key: 'roles.error_not_permitted' },
  { pattern: /fetch users|ophalen gebruikers/i, key: 'roles.error_load_failed' },
  { pattern: /delete/i, key: 'roles.error_delete_failed' },
  { pattern: /update|matrix|bijwerken/i, key: 'roles.error_matrix_failed' },
  { pattern: /save|opslaan/i, key: 'roles.error_save_failed' },
];

function resolveApiErrorMessage(
  err: any,
  t: (k: string) => string,
  fallbackKey = 'roles.error_save_failed'
): string {
  const msg = typeof err === 'string' ? err : err?.message || '';
  const match = API_ERROR_RULES.find((r) => r.pattern.test(msg));
  return match ? t(match.key) : (msg.trim() || t(fallbackKey));
}

// Localize module names dynamically based on active language dictionary
export function getLocalizedModuleName(
  mod: { key?: string; name?: string } | string | undefined,
  t: (k: string, fb?: string) => string
): string {
  if (!mod) return '';
  const rawKey = typeof mod === 'string' ? mod : mod.key || mod.name || '';
  const norm = rawKey.toLowerCase().trim().replace(/[\s-]+/g, '_');

  if (norm.includes('overview') || norm.includes('overzicht')) return t('modules.overview', 'Overzicht');
  if (norm.includes('insight') || norm.includes('inzicht')) return t('modules.insights', 'Inzichten');
  if (norm === 'orders' || norm.includes('order')) return t('modules.orders', 'Orders');
  if (norm.includes('validat')) return t('modules.validation', 'Validatie');
  if (
    norm.includes('exception') ||
    norm.includes('uitzondering') ||
    norm.includes('bc_sync') ||
    norm.includes('sync')
  ) {
    return t('modules.exceptions_bc_sync', 'Uitzonderingen en BC-sync');
  }
  if (norm.includes('institution') || norm.includes('instelling') || norm.includes('setting')) {
    return t('modules.institutions', 'Instellingen');
  }
  if (norm.includes('role') || norm.includes('toegang') || norm.includes('access')) {
    return t('modules.roles_and_access', 'Rollen en toegang');
  }
  if (norm.includes('audit')) return t('modules.audit_trail', 'Audittrail');
  if (norm.includes('learn')) return t('modules.learning_loop', 'Learning loop');

  const fallback = typeof mod === 'string' ? mod : mod.name || mod.key || '';
  return t(`modules.${norm}`, fallback);
}

// Localize role names based on active language dictionary
export function getLocalizedRoleName(
  roleName: string | undefined,
  t: (k: string, fb?: string) => string
): string {
  if (!roleName) return '';
  const norm = roleName.toLowerCase().trim();
  if (norm.includes('board') || norm.includes('directie') || norm.includes('manage')) {
    return t('roles_data.managing_board', roleName);
  }
  if (norm.includes('admin') || norm.includes('beheer')) {
    return t('roles_data.administrator', roleName);
  }
  if (norm.includes('review') || norm.includes('beoordeel')) {
    return t('roles_data.reviewer', roleName);
  }
  if (norm.includes('sale') || norm.includes('verkoop')) {
    return t('roles_data.sale', roleName);
  }
  return roleName;
}

// Localize role descriptions based on active language dictionary
export function getLocalizedRoleDesc(
  desc: string | undefined,
  t: (k: string, fb?: string) => string
): string {
  if (!desc) return '';
  const norm = desc.toLowerCase().trim();
  if (norm.includes('all module') || norm.includes('alle module')) {
    return t('roles_data.all_modules', desc);
  }
  if (norm.includes('configuration') || norm.includes('configuratie')) {
    return t('roles_data.configuration_and_users', desc);
  }
  if (norm.includes('order admin') || norm.includes('orderadministratie')) {
    return t('roles_data.order_administration', desc);
  }
  if (norm.includes('read only') || norm.includes('alleen-lezen') || norm.includes('alleen')) {
    return t('roles_data.read_only', desc);
  }
  return desc;
}

export const RolesView: React.FC<RolesViewProps> = ({
  currentUserId: propUserId,
}) => {
  const { t } = useTranslation();
  const { user: currentAuthUser, canPerformAction } = useAuth();

  const formatApiError = useCallback(
    (err: any, fallbackKey = 'roles.error_save_failed') => resolveApiErrorMessage(err, t, fallbackKey),
    [t]
  );

  // Live Users state from GET /api/users
  const [users, setUsers] = useState<UserRow[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState<boolean>(true);
  const [usersError, setUsersError] = useState<string | null>(null);

  // Live Roles state from GET /api/roles
  const [rolesList, setRolesList] = useState<RoleObject[]>([]);
  const [, setIsRolesLoading] = useState<boolean>(true);

  // Dynamic Role-Module Matrix state from GET /api/role-modules
  const [matrixData, setMatrixData] = useState<RoleModuleMatrixData>({ modules: [], roles: [] });
  const [isMatrixLoading, setIsMatrixLoading] = useState<boolean>(true);
  const [matrixError, setMatrixError] = useState<string | null>(null);
  const hasFetchedRef = React.useRef<boolean>(false);

  // Edit Permissions Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [savingCell, setSavingCell] = useState<string | null>(null);

  // Load live users from GET /api/users
  const loadUsers = useCallback(async (showFeedback = false) => {
    try {
      setIsUsersLoading(true);
      setUsersError(null);
      const raw = await fetchUsers(0, 100);
      const mapped: UserRow[] = (raw || []).map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role?.name || (typeof u.role === 'string' ? u.role : '') || (rolesList.find(r => r.id === u.role_id)?.name || t('roles.no_role')),
        role_id: u.role_id ?? u.role?.id,
        created_at: u.created_at,
        updated_at: u.updated_at,
        actions: u.actions,
      }));
      setUsers(mapped);
      if (showFeedback) {
        toast.success(t('roles.success_users_loaded'));
      }
    } catch (err: any) {
      console.error('GET /api/users error:', err);
      const errMsg = formatApiError(err, 'roles.error_load_failed');
      setUsersError(errMsg);
      if (showFeedback) {
        toast.error(errMsg);
      }
    } finally {
      setIsUsersLoading(false);
    }
  }, [t, formatApiError, rolesList]);

  // Load roles from GET /api/roles
  const loadRoles = useCallback(async () => {
    try {
      setIsRolesLoading(true);
      const roles = await fetchRoles(0, 100);
      if (Array.isArray(roles)) {
        setRolesList(roles);
      }
    } catch (err: any) {
      console.warn('GET /api/roles warning:', err);
    } finally {
      setIsRolesLoading(false);
    }
  }, []);

  // Load matrix from GET /api/role-modules
  const loadMatrix = useCallback(async (showFeedback = false, forceRefresh = false) => {
    try {
      setIsMatrixLoading(true);
      setMatrixError(null);
      const data = await fetchRoleModuleMatrix(forceRefresh);
      if (data && Array.isArray(data.modules) && Array.isArray(data.roles)) {
        setMatrixData(data);
        if (showFeedback) {
          toast.success(t('roles.success_matrix_synced'));
        }
      }
    } catch (err: any) {
      console.warn('GET /api/role-modules error:', err);
      const errMsg = formatApiError(err, 'roles.error_matrix_failed');
      setMatrixError(errMsg);
      if (showFeedback) {
        toast.error(errMsg);
      }
    } finally {
      setIsMatrixLoading(false);
    }
  }, [t, formatApiError]);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    Promise.allSettled([
      loadUsers(false),
      loadRoles(),
      loadMatrix(false, false),
    ]);
  }, [loadUsers, loadRoles, loadMatrix]);

  // Dialog state
  const [dialog, setDialog] = useState<
    | { kind: 'add' }
    | { kind: 'edit'; user: UserRow }
    | { kind: 'del'; user: UserRow }
    | null
  >(null);

  const [dName, setDName] = useState('');
  const [dEmail, setDEmail] = useState('');
  const [dRoleId, setDRoleId] = useState<number>(0);
  const [dPassword, setDPassword] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [dErr, setDErr] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openAdd = () => {
    setDName('');
    setDEmail('');
    const defaultRoleId = rolesList[0]?.id || 0;
    setDRoleId(defaultRoleId);
    setDPassword('');
    setShowPasswordText(false);
    setDErr('');
    setDialog({ kind: 'add' });
  };

  const openEdit = (u: UserRow) => {
    setDName(u.name);
    setDEmail(u.email);
    let rId = u.role_id;
    if (!rId) {
      const match = rolesList.find((r) => r.name.toLowerCase().trim() === (u.role || '').toLowerCase().trim());
      rId = match?.id || rolesList[0]?.id || 0;
    }
    setDRoleId(rId || rolesList[0]?.id || 0);
    setDPassword('');
    setShowPasswordText(false);
    setDErr('');
    setDialog({ kind: 'edit', user: u });
  };

  const openDel = (u: UserRow) => {
    setDialog({ kind: 'del', user: u });
  };

  const closeDialog = () => {
    if (isSubmitting) return;
    setDialog(null);
    setDErr('');
  };

  // Toggle permission directly via PUT /api/role-modules
  const handleTogglePermission = async (roleId: number, moduleId: number, nextAccess: boolean) => {
    const cellKey = `${roleId}-${moduleId}`;
    setSavingCell(cellKey);

    // Optimistic UI update
    setMatrixData((prev) => ({
      ...prev,
      roles: prev.roles.map((r) => {
        if (r.id !== roleId) return r;
        return {
          ...r,
          modules: r.modules.map((m) => {
            if (m.module_id === moduleId || (m as any).id === moduleId) {
              return { ...m, has_access: nextAccess };
            }
            return m;
          }),
        };
      }),
    }));

    try {
      const updated = await updateRoleModulePermissions([
        { role_id: roleId, module_id: moduleId, has_access: nextAccess },
      ]);
      if (updated && Array.isArray(updated.modules) && Array.isArray(updated.roles)) {
        setMatrixData(updated);
      }
      toast.success(t('roles.success_permission_updated'));
    } catch (err: any) {
      console.error('Failed to update permission via PUT /api/role-modules:', err);
      try {
        const refreshed = await fetchRoleModuleMatrix(true);
        setMatrixData(refreshed);
      } catch {}
      toast.error(formatApiError(err, 'roles.error_matrix_failed'));
    } finally {
      setSavingCell(null);
    }
  };

  React.useEffect(() => {
    if (dialog || isEditModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (dialog && !isSubmitting) closeDialog();
        if (isEditModalOpen && !savingCell) setIsEditModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [dialog, isEditModalOpen, savingCell, isSubmitting]);

  // Form submission: POST /api/users or PUT /api/users/{id}
  const handleSaveUser = async () => {
    if (!dName.trim()) {
      setDErr(t('roles.error_name_required'));
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!dEmail.trim() || !emailRegex.test(dEmail.trim())) {
      setDErr(t('roles.error_email_required'));
      return;
    }
    if (!dRoleId || dRoleId <= 0) {
      setDErr(t('roles.error_role_required'));
      return;
    }
    if (dialog?.kind === 'add' && !dPassword.trim()) {
      setDErr(t('roles.error_password_required'));
      return;
    }
    if (dPassword.trim() && dPassword.trim().length < 6) {
      setDErr(t('roles.error_password_min'));
      return;
    }

    setIsSubmitting(true);
    setDErr('');

    try {
      if (dialog?.kind === 'add') {
        const payload: CreateUserPayload = {
          name: dName.trim(),
          email: dEmail.trim(),
          role_id: Number(dRoleId),
          password: dPassword.trim(),
        };

        const created = await createUser(payload);
        toast.success(t('roles.success_user_created', { name: created.name }));
        closeDialog();
        await loadUsers(false);
      } else if (dialog?.kind === 'edit') {
        const payload: UpdateUserPayload = {
          name: dName.trim(),
          email: dEmail.trim(),
          role_id: Number(dRoleId),
          ...(dPassword.trim() ? { password: dPassword.trim() } : {}),
        };

        const updated = await updateUser(dialog.user.id, payload);
        broadcastPermissionsChanged();
        toast.success(t('roles.success_user_updated', { name: updated.name }));
        closeDialog();
        await loadUsers(false);
      }
    } catch (err: any) {
      console.error('Save user error:', err);
      const errMsg = formatApiError(err, 'roles.error_save_failed');
      setDErr(errMsg);
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete user: DELETE /api/users/{id}
  const handleDeleteUser = async () => {
    if (dialog?.kind !== 'del') return;
    const target = dialog.user;
    setIsSubmitting(true);
    try {
      await deleteUser(target.id);
      broadcastPermissionsChanged();
      toast.success(t('roles.success_user_deleted', { name: target.name }));
      closeDialog();
      await loadUsers(false);
    } catch (err: any) {
      console.error('Delete user error:', err);
      const errMsg = formatApiError(err, 'roles.error_delete_failed');
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Compute live dynamic modules for dialog role preview from backend data
  const selectedRole = rolesList.find((r) => r.id === dRoleId);
  const selectedRoleInMatrix = matrixData.roles.find(
    (r) =>
      r.id === dRoleId ||
      (selectedRole && r.name.toLowerCase().trim() === selectedRole.name.toLowerCase().trim())
  );
  const dialogMods = selectedRoleInMatrix
    ? selectedRoleInMatrix.modules.filter((m) => m.has_access)
    : [];

  return (
    <div className="a-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
          <h1
            style={{
              margin: 0,
              fontFamily: "'Archivo', system-ui, sans-serif",
              fontWeight: 700,
              fontSize: '32px',
              lineHeight: 1.15,
              color: '#1A1A1A',
            }}
          >
            {t('roles.title')}
          </h1>
          <p style={{ margin: 0, color: '#4D4D4D', lineHeight: 1.5, maxWidth: '780px' }}>
            {t('roles.subtitle')}
          </p>
        </div>

        <button
          type="button"
          className="ap-add-user-btn"
          onClick={openAdd}
          style={{
            flexShrink: 0,
            whiteSpace: 'nowrap',
            marginTop: '2px',
            height: '32px',
            minHeight: '32px',
            padding: '0 14px',
            fontSize: '11.5px',
            fontWeight: 700,
            letterSpacing: '0.04em',
            borderRadius: '4px',
          }}
        >
          {t('roles.add_user').toUpperCase()}
        </button>
      </div>

      {/* Users Table */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #DADADA',
          overflowX: 'auto',
          borderRadius: 0,
        }}
      >
        <div style={{ minWidth: '950px' }}>
          {/* Table Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'minmax(180px, 1.1fr) 130px minmax(280px, 2.5fr) 110px 220px',
              gap: '12px',
              padding: '10px 16px',
              borderBottom: '1px solid #DADADA',
              background: '#FAFAFA',
              fontSize: '13px',
              fontWeight: 600,
              color: '#6B6B6B',
            }}
          >
            <span>{t('roles.user_col')}</span>
            <span>{t('roles.role_col')}</span>
            <span>{t('roles.modules_col')}</span>
            <span>{t('roles.settings_col')}</span>
            <span>{t('roles.actions_col')}</span>
          </div>

          {/* Loading State */}
          {isUsersLoading && (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <Loader2 size={16} className="animate-spin" />
                <span>{t('roles.loading_users')}</span>
              </div>
            </div>
          )}

          {/* Error State */}
          {!isUsersLoading && usersError && (
            <div style={{ padding: '24px 20px', textAlign: 'center', color: '#DC2626', fontSize: '14px', background: '#FEF2F2' }}>
              <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>{usersError}</p>
              <button
                type="button"
                onClick={() => loadUsers(true)}
                style={{
                  padding: '6px 14px',
                  background: '#FFFFFF',
                  border: '1px solid #FCA5A5',
                  borderRadius: '4px',
                  color: '#DC2626',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {t('roles.retry')}
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isUsersLoading && !usersError && users.length === 0 && (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>
              <p style={{ margin: '0 0 12px 0' }}>{t('roles.no_users_found')}</p>
              <button
                type="button"
                className="ap-add-user-btn"
                onClick={openAdd}
                style={{ minHeight: '36px', padding: '0 16px', fontSize: '12px' }}
              >
                {t('roles.add_user').toUpperCase()}
              </button>
            </div>
          )}

          {/* User Rows */}
          {!isUsersLoading && !usersError && users.map((u) => {
            const isMe =
              (currentAuthUser?.email && u.email && u.email.toLowerCase() === currentAuthUser.email.toLowerCase()) ||
              String(u.id) === String(currentAuthUser?.id) ||
              String(u.id) === String(propUserId);
            const badgeStyle = getRoleBadgeStyle(u.role);
            const roleLabel = getLocalizedRoleName(u.role, t) || t('roles.no_role');

            // Locate role permissions dynamically in live matrixData
            const matchedRole = matrixData.roles.find(
              (r) =>
                (u.role_id && r.id === u.role_id) ||
                r.name.toLowerCase().trim() === (u.role || '').toLowerCase().trim()
            );

            const allowedMods = matchedRole
              ? matchedRole.modules.filter((m) => m.has_access)
              : [];

            const hasSettings = allowedMods.some(
              (m) => m.key === 'institutions' || m.key === 'roles_and_access'
            );

            return (
              <div
                key={u.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'minmax(180px, 1.1fr) 130px minmax(280px, 2.5fr) 110px 220px',
                  gap: '12px',
                  padding: '12px 16px',
                  borderBottom: '1px solid #E2E8F0',
                  borderLeft: isMe ? '3px solid #E20714' : '3px solid transparent',
                  alignItems: 'center',
                  fontSize: '14px',
                  background: isMe ? '#FFFDFD' : '#FFFFFF',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isMe ? '#FFF5F5' : '#F8FAFC';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isMe ? '#FFFDFD' : '#FFFFFF';
                }}
              >
                {/* User Avatar + Name & Email */}
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <span
                    aria-hidden="true"
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: '#0F172A',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 700,
                      flex: 'none',
                    }}
                  >
                    {getInitials(u.name)}
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</span>
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</span>
                  </span>
                </span>

                {/* Role Pill */}
                <span>
                  <span
                    style={{
                      display: 'inline-block',
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '3px 10px',
                      background: badgeStyle[0],
                      color: badgeStyle[1],
                      border: `1px solid ${badgeStyle[2] || 'transparent'}`,
                      borderRadius: '4px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {roleLabel}
                  </span>
                </span>

                {/* Allowed Modules Chips directly from API */}
                <span style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {allowedMods.length > 0 ? (
                    allowedMods.map((mod) => (
                      <span
                        key={mod.module_id || mod.key}
                        style={{
                          fontSize: '11.5px',
                          padding: '2px 7px',
                          border: '1px solid #E2E8F0',
                          background: '#F8FAFC',
                          borderRadius: '4px',
                          color: '#334155',
                          fontWeight: 500,
                          lineHeight: 1.3,
                        }}
                      >
                        {getLocalizedModuleName(mod, t)}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '12px', color: '#94A3B8', fontStyle: 'italic' }}>
                      {t('roles.no_modules')}
                    </span>
                  )}
                </span>

                {/* Settings Access Badge */}
                <span>
                  {hasSettings ? (
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '12px',
                        fontWeight: 600,
                        padding: '3px 10px',
                        background: '#FEF3C7',
                        color: '#92400E',
                        border: '1px solid #FDE68A',
                        borderRadius: '4px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t('roles.settings_col')}
                    </span>
                  ) : (
                    <span style={{ fontSize: '13px', color: '#64748B', whiteSpace: 'nowrap' }}>
                      {t('roles.no_access')}
                    </span>
                  )}
                </span>

                {/* Action Buttons: side by side, never wrap */}
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>

                  <button
                    type="button"
                    className="bg"
                    onClick={() => openEdit(u)}
                    title={t('roles.edit_user')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      height: '30px',
                      padding: '0 8px',
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      borderRadius: '5px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#1E293B',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                      transition: 'all 0.15s ease',
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#0F172A';
                      e.currentTarget.style.background = '#F8FAFC';
                      e.currentTarget.style.color = '#0F172A';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#CBD5E1';
                      e.currentTarget.style.background = '#FFFFFF';
                      e.currentTarget.style.color = '#1E293B';
                    }}
                  >
                    <Pencil size={12} style={{ strokeWidth: 2.2, color: 'currentColor' }} />
                    <span>{t('roles.edit')}</span>
                  </button>

                  {(() => {
                    const canDelete = canPerformAction('delete', u);
                    const isDeleteDisabled = !canDelete;
                    const deleteTitle = isMe
                      ? t('roles.error_cannot_delete_self')
                      : !canDelete
                      ? t('roles.error_cannot_delete_user')
                      : t('roles.delete_user');

                    return (
                      <button
                        type="button"
                        className="bg"
                        onClick={() => openDel(u)}
                        disabled={isDeleteDisabled}
                        title={deleteTitle}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          height: '30px',
                          padding: '0 8px',
                          border: isDeleteDisabled ? '1px solid #E2E8F0' : '1px solid #FECACA',
                          background: isDeleteDisabled ? '#F8FAFC' : '#FEF2F2',
                          borderRadius: '5px',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: isDeleteDisabled ? '#94A3B8' : '#DC2626',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          cursor: isDeleteDisabled ? 'not-allowed' : 'pointer',
                          opacity: isDeleteDisabled ? 0.6 : 1,
                          whiteSpace: 'nowrap',
                          boxShadow: isDeleteDisabled ? 'none' : '0 1px 2px rgba(220, 38, 38, 0.05)',
                          transition: 'all 0.15s ease',
                          flexShrink: 0,
                        }}
                        onMouseEnter={(e) => {
                          if (!isDeleteDisabled) {
                            e.currentTarget.style.borderColor = '#F87171';
                            e.currentTarget.style.background = '#FEE2E2';
                            e.currentTarget.style.color = '#B91C1C';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isDeleteDisabled) {
                            e.currentTarget.style.borderColor = '#FECACA';
                            e.currentTarget.style.background = '#FEF2F2';
                            e.currentTarget.style.color = '#DC2626';
                          }
                        }}
                      >
                        <Trash2 size={12} style={{ strokeWidth: 2.2, color: 'currentColor' }} />
                        <span>{t('roles.delete')}</span>
                      </button>
                    );
                  })()}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Role to Module Matrix */}
      <section aria-label="Rol naar module" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2
              style={{
                margin: 0,
                fontFamily: "'Archivo', system-ui, sans-serif",
                fontWeight: 700,
                fontSize: '20px',
                letterSpacing: '-0.01em',
                color: '#111827',
              }}
            >
              {t('roles.role_matrix_title')}
            </h2>

            {/* Loading Indicator */}
            {isMatrixLoading && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  padding: '2px 9px',
                  borderRadius: '12px',
                  background: '#F3F4F6',
                  color: '#4B5563',
                  border: '1px solid #E5E7EB',
                }}
              >
                <span
                  className="ap-matrix-spinner"
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    border: '2px solid #9CA3AF',
                    borderTopColor: '#1F2937',
                    display: 'inline-block',
                  }}
                />
                {t('roles.loading_matrix')}
              </span>
            )}

            {matrixError && (
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 600,
                  padding: '2px 9px',
                  borderRadius: '12px',
                  background: '#FEF2F2',
                  color: '#B91C1C',
                  border: '1px solid #FCA5A5',
                }}
              >
                {matrixError}
              </span>
            )}
          </div>

          {/* Edit Permissions Button (Black by default, Vibrant Red on hover - matches Add User button) */}
          <button
            type="button"
            className="ap-edit-permissions-btn"
            onClick={() => setIsEditModalOpen(true)}
            style={{
              flexShrink: 0,
              whiteSpace: 'nowrap',
              height: '32px',
              minHeight: '32px',
              padding: '0 14px',
              fontSize: '11.5px',
              fontWeight: 700,
              letterSpacing: '0.04em',
              borderRadius: '4px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0 }}
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            <span>{t('roles.edit_permissions').toUpperCase()}</span>
          </button>
        </div>

        {/* Clean, Modern Boxed Table Matching User Reference */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '6px',
            overflowX: 'auto',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
          }}
        >
          <div style={{ minWidth: '960px' }}>
            {/* Dynamic Table Header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `210px repeat(${Math.max(matrixData.modules.length, 1)}, minmax(0, 1fr))`,
                gap: '8px',
                padding: '16px 20px',
                borderBottom: '1px solid #E5E7EB',
                background: '#FFFFFF',
                alignItems: 'end',
              }}
            >
              <span style={{ fontWeight: 700, fontSize: '13.5px', color: '#111827' }}>
                {t('roles.role_col')}
              </span>
              {matrixData.modules.map((m) => (
                <span
                  key={m.id || m.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: '#1F2937',
                    lineHeight: 1.25,
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    maxWidth: '100px',
                    margin: '0 auto',
                  }}
                >
                  {getLocalizedModuleName(m, t)}
                </span>
              ))}
            </div>

            {/* Dynamic Table Rows */}
            {matrixData.roles.map((r, idx) => {
              const roleLabel = getLocalizedRoleName(r.name, t);
              const roleDesc = getLocalizedRoleDesc(r.description, t);
              const isLast = idx === matrixData.roles.length - 1;

              return (
                <div
                  key={r.id || r.name}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `210px repeat(${Math.max(matrixData.modules.length, 1)}, minmax(0, 1fr))`,
                    gap: '8px',
                    padding: '18px 20px',
                    borderBottom: isLast ? 'none' : '1px solid #E5E7EB',
                    alignItems: 'center',
                    background: '#FFFFFF',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FAFAFA')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                >
                  {/* Role Title and Description directly from API */}
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ fontWeight: 700, fontSize: '14.5px', color: '#111827', letterSpacing: '-0.01em' }}>
                      {roleLabel}
                    </span>
                    <span style={{ fontSize: '12.5px', color: '#6B7280', fontWeight: 400 }}>
                      {roleDesc}
                    </span>
                  </span>

                  {/* Status Indicator for Each Module (Static / Non-clickable) */}
                  {matrixData.modules.map((m) => {
                    const acc = r.modules.find((rm) => rm.module_id === m.id || rm.key === m.key);
                    const isOn = !!acc?.has_access;

                    return (
                      <span
                        key={m.id || m.key}
                        style={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          height: '36px',
                          userSelect: 'none',
                          cursor: 'default',
                        }}
                      >
                        {isOn ? (
                          <svg
                            width="19"
                            height="19"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#1E7E34"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ display: 'block' }}
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#9CA3AF"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            style={{ display: 'block' }}
                          >
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                        )}
                      </span>
                    );
                  })}
                </div>
              );
            })}

            {matrixData.roles.length === 0 && !isMatrixLoading && (
              <div style={{ padding: '36px 20px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>
                {matrixError ? (
                  <span style={{ color: '#DC2626' }}>{matrixError}</span>
                ) : (
                  <span>{t('roles.no_roles_loaded')}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ============ DIALOGS ============ */}
      {dialog && createPortal(
        <div
          className="ap-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDialog();
          }}
        >
          <div
            className="ap-modal-card"
            role="dialog"
            aria-modal="true"
            style={{
              width: '380px',
              maxWidth: 'calc(100vw - 24px)',
              padding: '16px 18px',
              borderRadius: '8px',
            }}
          >
            {/* Top Close Button */}
            <button
              type="button"
              className="ap-modal-close-btn"
              onClick={closeDialog}
              aria-label={t('roles.close')}
              style={{ top: '12px', right: '12px', width: '26px', height: '26px' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Modal Title */}
            <h2
              style={{
                margin: '0 0 12px 0',
                paddingRight: '28px',
                fontFamily: "'Archivo', system-ui, sans-serif",
                fontWeight: 700,
                fontSize: '16px',
                lineHeight: 1.25,
                color: '#111827',
                letterSpacing: '-0.01em',
              }}
            >
              {dialog.kind === 'add'
                ? t('roles.add_user')
                : dialog.kind === 'edit'
                ? t('roles.edit_user')
                : t('roles.delete_user')}
            </h2>

            {/* Form for Add / Edit */}
            {dialog.kind !== 'del' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                <label
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    color: '#4B5563',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  <span>
                    {t('roles.name_label')} <span style={{ color: '#E20714' }}>*</span>
                  </span>
                  <input
                    type="text"
                    value={dName}
                    onChange={(e) => setDName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveUser();
                    }}
                    placeholder={t('roles.placeholder_name')}
                    className="ap-modal-input"
                    style={{ height: '34px', fontSize: '13px', padding: '0 10px', borderRadius: '6px' }}
                    autoFocus
                  />
                </label>

                <label
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    color: '#4B5563',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  <span>
                    {t('roles.email_label')} <span style={{ color: '#E20714' }}>*</span>
                  </span>
                  <input
                    type="email"
                    value={dEmail}
                    onChange={(e) => setDEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveUser();
                    }}
                    placeholder={t('roles.placeholder_email')}
                    className="ap-modal-input"
                    style={{ height: '34px', fontSize: '13px', padding: '0 10px', borderRadius: '6px' }}
                  />
                </label>

                <label
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    color: '#4B5563',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  <span>
                    {t('roles.role_label')} <span style={{ color: '#E20714' }}>*</span>
                  </span>
                  <select
                    value={dRoleId}
                    onChange={(e) => setDRoleId(Number(e.target.value))}
                    className="ap-modal-select"
                    style={{ height: '34px', fontSize: '13px', padding: '0 10px', borderRadius: '6px' }}
                  >
                    {rolesList.map((r) => (
                      <option key={r.id} value={r.id}>
                        {getLocalizedRoleName(r.name, t)}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Modules preview for selected role (matching Image 3 reference) */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    padding: '7px 10px',
                    background: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderRadius: '6px',
                  }}
                >
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {t('roles.modules_for_role')}
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {dialogMods.length > 0 ? (
                      dialogMods.map((dm) => (
                        <span
                          key={dm.module_id || dm.key}
                          className="ap-modal-badge"
                          style={{ fontSize: '10.5px', padding: '2px 6px', borderRadius: '4px' }}
                        >
                          {getLocalizedModuleName(dm, t)}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '11px', color: '#6B7280', fontStyle: 'italic' }}>
                        {t('roles.no_modules_assigned')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Password field with Lock icon & Eye toggle matching Image 2 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '10.5px',
                      fontWeight: 700,
                      color: '#4B5563',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    <span>
                      {t('roles.password_label')}{' '}
                      {dialog.kind === 'add' ? (
                        <span style={{ color: '#E20714' }}>*</span>
                      ) : (
                        <span style={{ fontSize: '10.5px', fontWeight: 500, color: '#9CA3AF', textTransform: 'none' }}>
                          ({t('roles.password_keep_hint')})
                        </span>
                      )}
                    </span>
                  </label>
                  <div className="ap-password-pill-container">
                    <Lock size={16} strokeWidth={1.75} style={{ color: '#94A3B8', flexShrink: 0, marginRight: '10px' }} />
                    <input
                      type={showPasswordText ? 'text' : 'password'}
                      value={dPassword}
                      onChange={(e) => setDPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveUser();
                      }}
                      placeholder={
                        dialog.kind === 'add'
                          ? t('roles.placeholder_password_add')
                          : t('roles.placeholder_password_edit')
                      }
                      className="ap-password-pill-input"
                    />
                    <button
                      type="button"
                      className="ap-password-pill-btn"
                      onClick={() => setShowPasswordText(!showPasswordText)}
                      aria-label={showPasswordText ? t('roles.hide_password') : t('roles.show_password')}
                      title={showPasswordText ? t('roles.hide_password') : t('roles.show_password')}
                    >
                      {showPasswordText ? <EyeOff size={17} strokeWidth={1.75} /> : <Eye size={17} strokeWidth={1.75} />}
                    </button>
                  </div>
                </div>

                {dErr && (
                  <div
                    style={{
                      padding: '5px 8px',
                      background: '#FEF2F2',
                      border: '1px solid #FCA5A5',
                      borderRadius: '4px',
                      fontSize: '11px',
                      color: '#B91C1C',
                      fontWeight: 600,
                    }}
                  >
                    {dErr}
                  </div>
                )}
              </div>
            ) : (
              /* Delete confirmation */
              <div style={{ padding: '4px 0 8px 0', fontSize: '13px', color: '#1F2937', lineHeight: 1.45 }}>
                {t('roles.delete_confirm', { name: dialog.user.name })}
              </div>
            )}

            {/* Dialog Footer Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '8px',
                marginTop: '14px',
              }}
            >
              <button
                type="button"
                className="ap-btn-cancel"
                onClick={closeDialog}
                disabled={isSubmitting}
                style={{
                  height: '32px',
                  minHeight: '32px',
                  padding: '0 14px',
                  fontSize: '11px',
                  borderRadius: '5px',
                }}
              >
                {t('roles.cancel').toUpperCase()}
              </button>
              <button
                type="button"
                className="ap-btn-save"
                onClick={dialog.kind === 'del' ? handleDeleteUser : handleSaveUser}
                disabled={isSubmitting}
                style={{
                  height: '32px',
                  minHeight: '32px',
                  padding: '0 16px',
                  fontSize: '11px',
                  borderRadius: '5px',
                  background: dialog.kind === 'del' ? '#B91C1C' : '#E20714',
                  opacity: isSubmitting ? 0.7 : 1,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                {isSubmitting && <Loader2 size={12} className="animate-spin" />}
                <span>
                  {isSubmitting
                    ? t('roles.saving').toUpperCase()
                    : dialog.kind === 'del'
                    ? t('roles.delete').toUpperCase()
                    : t('roles.save').toUpperCase()}
                </span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ============ EDIT PERMISSIONS MODAL WITH TOGGLE SWITCHES ============ */}
      {isEditModalOpen && createPortal(
        <div
          className="ap-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !savingCell) setIsEditModalOpen(false);
          }}
        >
          <div
            className="ap-modal-card"
            role="dialog"
            aria-modal="true"
            style={{
              maxWidth: '1060px',
              width: '95vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Top Close Button */}
            <button
              type="button"
              className="ap-modal-close-btn"
              onClick={() => !savingCell && setIsEditModalOpen(false)}
              aria-label={t('roles.close')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Modal Header */}
            <div style={{ marginBottom: '16px', paddingRight: '32px' }}>
              <h2
                style={{
                  margin: '0 0 4px 0',
                  fontFamily: "'Archivo', system-ui, sans-serif",
                  fontWeight: 700,
                  fontSize: '19px',
                  color: '#111827',
                  letterSpacing: '-0.01em',
                }}
              >
                {t('roles.edit_matrix_title')}
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#6B7280' }}>
                {t('roles.edit_matrix_subtitle')}
              </p>
            </div>

            {/* Scrollable Matrix Table with Toggles */}
            <div
              style={{
                overflowX: 'auto',
                border: '1px solid #E5E7EB',
                borderRadius: '6px',
                background: '#FFFFFF',
                flex: 1,
              }}
            >
              <div style={{ minWidth: '940px' }}>
                {/* Table Header */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `200px repeat(${Math.max(matrixData.modules.length, 1)}, minmax(0, 1fr))`,
                    gap: '8px',
                    padding: '14px 18px',
                    borderBottom: '1px solid #E5E7EB',
                    background: '#F9FAFB',
                    alignItems: 'end',
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: '13px', color: '#111827' }}>
                    {t('roles.role_col')}
                  </span>
                  {matrixData.modules.map((m) => (
                    <span
                      key={m.id || m.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#374151',
                        lineHeight: 1.25,
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                        maxWidth: '90px',
                        margin: '0 auto',
                      }}
                    >
                      {getLocalizedModuleName(m, t)}
                    </span>
                  ))}
                </div>

                {/* Table Rows with Toggles */}
                {matrixData.roles.map((r, idx) => {
                  const isLast = idx === matrixData.roles.length - 1;

                  return (
                    <div
                      key={r.id || r.name}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: `200px repeat(${Math.max(matrixData.modules.length, 1)}, minmax(0, 1fr))`,
                        gap: '8px',
                        padding: '14px 18px',
                        borderBottom: isLast ? 'none' : '1px solid #E5E7EB',
                        alignItems: 'center',
                        background: '#FFFFFF',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      {/* Role Details */}
                      <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>
                          {getLocalizedRoleName(r.name, t)}
                        </span>
                        <span style={{ fontSize: '12px', color: '#6B7280' }}>
                          {getLocalizedRoleDesc(r.description, t)}
                        </span>
                      </span>

                      {/* Toggle Switch for Each Module */}
                      {matrixData.modules.map((m) => {
                        const acc = r.modules.find((rm) => rm.module_id === m.id || rm.key === m.key);
                        const isOn = !!acc?.has_access;
                        const cellKey = `${r.id}-${m.id}`;
                        const isCellSaving = savingCell === cellKey;

                        return (
                          <div
                            key={m.id || m.key}
                            style={{
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              height: '36px',
                            }}
                          >
                            <button
                              type="button"
                              role="switch"
                              aria-checked={isOn}
                              disabled={isCellSaving}
                              onClick={() => handleTogglePermission(r.id, m.id, !isOn)}
                              title={`${getLocalizedRoleName(r.name, t)} - ${getLocalizedModuleName(m, t)}: ${isOn ? t('roles.enabled') : t('roles.disabled')}`}
                              style={{
                                position: 'relative',
                                display: 'inline-flex',
                                alignItems: 'center',
                                width: '40px',
                                height: '22px',
                                borderRadius: '9999px',
                                background: isOn ? '#1E7E34' : '#D1D5DB',
                                border: 'none',
                                cursor: isCellSaving ? 'wait' : 'pointer',
                                transition: 'background-color 0.2s ease',
                                padding: '2px',
                                opacity: isCellSaving ? 0.6 : 1,
                                outline: 'none',
                              }}
                            >
                              <span
                                style={{
                                  display: 'block',
                                  width: '18px',
                                  height: '18px',
                                  borderRadius: '50%',
                                  background: '#FFFFFF',
                                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.25)',
                                  transform: isOn ? 'translateX(18px)' : 'translateX(0)',
                                  transition: 'transform 0.2s ease',
                                }}
                              />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
