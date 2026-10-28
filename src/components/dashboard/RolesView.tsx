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

export const RolesView: React.FC<RolesViewProps> = ({
  language: propLang,
  currentUserId: propUserId,
}) => {
  const { language: ctxLang } = useTranslation();
  const { user: currentAuthUser, canPerformAction } = useAuth();
  const lang = propLang || ctxLang || 'NL';
  const isNl = lang === 'NL';

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
        role: u.role?.name || (typeof u.role === 'string' ? u.role : '') || (rolesList.find(r => r.id === u.role_id)?.name || 'Geen rol'),
        role_id: u.role_id ?? u.role?.id,
        created_at: u.created_at,
        updated_at: u.updated_at,
        actions: u.actions,
      }));
      setUsers(mapped);
      if (showFeedback) {
        toast.success(isNl ? 'Gebruikers succesvol geladen' : 'Users loaded successfully');
      }
    } catch (err: any) {
      console.error('GET /api/users error:', err);
      const errMsg = err?.message || (isNl ? 'Fout bij ophalen gebruikers' : 'Failed to fetch users');
      setUsersError(errMsg);
      if (showFeedback) {
        toast.error(errMsg);
      }
    } finally {
      setIsUsersLoading(false);
    }
  }, [isNl, rolesList]);

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
          toast.success(isNl ? 'Rechtenmatrix succesvol gesynchroniseerd met server' : 'Permissions matrix synchronized with server');
        }
      }
    } catch (err: any) {
      console.warn('GET /api/role-modules error:', err);
      const errMsg = err?.message || (isNl ? 'Fout bij ophalen rechten' : 'Failed to fetch permissions');
      setMatrixError(errMsg);
      if (showFeedback) {
        toast.error(errMsg);
      }
    } finally {
      setIsMatrixLoading(false);
    }
  }, [isNl]);

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
      toast.success(
        isNl ? 'Recht succesvol bijgewerkt' : 'Permission updated successfully'
      );
    } catch (err: any) {
      console.error('Failed to update permission via PUT /api/role-modules:', err);
      try {
        const refreshed = await fetchRoleModuleMatrix(true);
        setMatrixData(refreshed);
      } catch {}
      toast.error(
        err?.message || (isNl ? 'Fout bij bijwerken recht' : 'Failed to update permission')
      );
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
      setDErr(isNl ? 'Naam is verplicht' : 'Name is required');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!dEmail.trim() || !emailRegex.test(dEmail.trim())) {
      setDErr(isNl ? 'Geldig e-mailadres is verplicht' : 'Valid email address is required');
      return;
    }
    if (!dRoleId || dRoleId <= 0) {
      setDErr(isNl ? 'Selecteer een geldige rol' : 'Please select a valid role');
      return;
    }
    if (dialog?.kind === 'add' && !dPassword.trim()) {
      setDErr(isNl ? 'Wachtwoord is verplicht' : 'Password is required');
      return;
    }
    if (dPassword.trim() && dPassword.trim().length < 6) {
      setDErr(isNl ? 'Wachtwoord moet minimaal 6 tekens bevatten' : 'Password must be at least 6 characters');
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
        toast.success(
          isNl
            ? `Gebruiker ${created.name} succesvol aangemaakt`
            : `User ${created.name} created successfully`
        );
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
        toast.success(
          isNl
            ? `Gegevens van ${updated.name} succesvol opgeslagen`
            : `Details for ${updated.name} saved successfully`
        );
        closeDialog();
        await loadUsers(false);
      }
    } catch (err: any) {
      console.error('Save user error:', err);
      const errMsg = err?.message || (isNl ? 'Fout bij opslaan gebruiker' : 'Failed to save user');
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
      toast.success(
        isNl
          ? `Gebruiker ${target.name} succesvol verwijderd`
          : `User ${target.name} deleted successfully`
      );
      closeDialog();
      await loadUsers(false);
    } catch (err: any) {
      console.error('Delete user error:', err);
      const errMsg = err?.message || (isNl ? 'Fout bij verwijderen gebruiker' : 'Failed to delete user');
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
            {isNl ? 'Rollen en toegang' : 'Roles and access'}
          </h1>
          <p style={{ margin: 0, color: '#4D4D4D', lineHeight: 1.5, maxWidth: '780px' }}>
            {isNl
              ? 'Een rol bepaalt welke modules iemand ziet. Wijzig een rol en de modules passen meteen aan; met Bekijk als zie je het menu van die gebruiker.'
              : "A role determines which modules someone sees. Changing a role updates modules immediately; with 'View as' you see that user's menu."}
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
          {isNl ? 'GEBRUIKER TOEVOEGEN' : 'ADD USER'}
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
            <span>{isNl ? 'Gebruiker' : 'User'}</span>
            <span>{isNl ? 'Rol' : 'Role'}</span>
            <span>Modules</span>
            <span>{isNl ? 'Instellingen' : 'Settings'}</span>
            <span>{isNl ? 'Acties' : 'Actions'}</span>
          </div>

          {/* Loading State */}
          {isUsersLoading && (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <Loader2 size={16} className="animate-spin" />
                <span>{isNl ? 'Gebruikers laden...' : 'Loading users...'}</span>
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
                {isNl ? 'Opnieuw proberen' : 'Retry'}
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isUsersLoading && !usersError && users.length === 0 && (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>
              <p style={{ margin: '0 0 12px 0' }}>{isNl ? 'Geen gebruikers gevonden.' : 'No users found.'}</p>
              <button
                type="button"
                className="ap-add-user-btn"
                onClick={openAdd}
                style={{ minHeight: '36px', padding: '0 16px', fontSize: '12px' }}
              >
                {isNl ? 'GEBRUIKER TOEVOEGEN' : 'ADD USER'}
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
            const roleLabel = u.role || (isNl ? 'Geen rol' : 'No role');

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
                        {mod.name}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '12px', color: '#94A3B8', fontStyle: 'italic' }}>
                      {isNl ? 'Geen modules' : 'No modules'}
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
                      {isNl ? 'Instellingen' : 'Settings'}
                    </span>
                  ) : (
                    <span style={{ fontSize: '13px', color: '#64748B', whiteSpace: 'nowrap' }}>
                      {isNl ? 'Geen toegang' : 'No access'}
                    </span>
                  )}
                </span>

                {/* Action Buttons: side by side, never wrap */}
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>

                  <button
                    type="button"
                    className="bg"
                    onClick={() => openEdit(u)}
                    title={isNl ? 'Gebruiker bewerken' : 'Edit user'}
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
                    <span>{isNl ? 'Bewerken' : 'Edit'}</span>
                  </button>

                  {(() => {
                    const canDelete = canPerformAction('delete', u);
                    const isDeleteDisabled = !canDelete;
                    const deleteTitle = isMe
                      ? (isNl ? 'Je kunt je eigen account niet verwijderen' : 'You cannot delete your own account')
                      : !canDelete
                      ? (isNl ? 'Deze gebruiker kan niet worden verwijderd (beveiligde rol)' : 'This user cannot be deleted (protected role)')
                      : (isNl ? 'Gebruiker verwijderen' : 'Delete user');

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
                        <span>{isNl ? 'Verwijderen' : 'Delete'}</span>
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
              {isNl ? 'Rol naar module' : 'Role to module'}
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
                {isNl ? 'Laden...' : 'Loading...'}
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
            <span>{isNl ? 'RECHTEN BEWERKEN' : 'EDIT PERMISSIONS'}</span>
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
                {isNl ? 'Rol' : 'Role'}
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
                  {m.name}
                </span>
              ))}
            </div>

            {/* Dynamic Table Rows */}
            {matrixData.roles.map((r, idx) => {
              const roleLabel = r.name;
              const roleDesc = r.description;
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
                  <span>{isNl ? 'Geen rollen en modules geladen' : 'No roles and modules loaded'}</span>
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
              aria-label={isNl ? 'Sluiten' : 'Close'}
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
                ? isNl
                  ? 'Gebruiker toevoegen'
                  : 'Add user'
                : dialog.kind === 'edit'
                ? isNl
                  ? 'Gebruiker bewerken'
                  : 'Edit user'
                : isNl
                ? 'Gebruiker verwijderen'
                : 'Delete user'}
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
                    {isNl ? 'Naam' : 'Name'} <span style={{ color: '#E20714' }}>*</span>
                  </span>
                  <input
                    type="text"
                    value={dName}
                    onChange={(e) => setDName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveUser();
                    }}
                    placeholder={isNl ? 'bv. Lien Desmet' : 'e.g. Lien Desmet'}
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
                    {isNl ? 'E-mailadres' : 'Email address'} <span style={{ color: '#E20714' }}>*</span>
                  </span>
                  <input
                    type="email"
                    value={dEmail}
                    onChange={(e) => setDEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveUser();
                    }}
                    placeholder={isNl ? 'voornaam.naam@aalterpaint.be' : 'firstname.lastname@aalterpaint.be'}
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
                    {isNl ? 'Rol' : 'Role'} <span style={{ color: '#E20714' }}>*</span>
                  </span>
                  <select
                    value={dRoleId}
                    onChange={(e) => setDRoleId(Number(e.target.value))}
                    className="ap-modal-select"
                    style={{ height: '34px', fontSize: '13px', padding: '0 10px', borderRadius: '6px' }}
                  >
                    {rolesList.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
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
                    {isNl ? 'MODULES VOOR DEZE ROL' : 'MODULES FOR THIS ROLE'}
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {dialogMods.length > 0 ? (
                      dialogMods.map((dm) => (
                        <span
                          key={dm.module_id || dm.key}
                          className="ap-modal-badge"
                          style={{ fontSize: '10.5px', padding: '2px 6px', borderRadius: '4px' }}
                        >
                          {dm.name}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '11px', color: '#6B7280', fontStyle: 'italic' }}>
                        {isNl ? 'Geen modules toegewezen' : 'No modules assigned'}
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
                      {isNl ? 'Wachtwoord' : 'Password'}{' '}
                      {dialog.kind === 'add' ? (
                        <span style={{ color: '#E20714' }}>*</span>
                      ) : (
                        <span style={{ fontSize: '10.5px', fontWeight: 500, color: '#9CA3AF', textTransform: 'none' }}>
                          ({isNl ? 'laat leeg om te behouden' : 'leave blank to keep current'})
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
                          ? (isNl ? 'Voer veilig wachtwoord in...' : 'Enter secure password...')
                          : (isNl ? 'Nieuw wachtwoord invoeren (optioneel)...' : 'Enter secure password...')
                      }
                      className="ap-password-pill-input"
                    />
                    <button
                      type="button"
                      className="ap-password-pill-btn"
                      onClick={() => setShowPasswordText(!showPasswordText)}
                      aria-label={showPasswordText ? 'Hide password' : 'Show password'}
                      title={showPasswordText ? (isNl ? 'Verberg wachtwoord' : 'Hide password') : (isNl ? 'Toon wachtwoord' : 'Show password')}
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
                {isNl
                  ? `Ben je zeker dat je ${dialog.user.name} wil verwijderen?`
                  : `Are you sure you want to delete ${dialog.user.name}?`}
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
                {isNl ? 'ANNULEREN' : 'CANCEL'}
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
                    ? (isNl ? 'BEZIG...' : 'SAVING...')
                    : (dialog.kind === 'del'
                        ? (isNl ? 'VERWIJDEREN' : 'DELETE')
                        : (isNl ? 'OPSLAAN' : 'SAVE'))}
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
              aria-label={isNl ? 'Sluiten' : 'Close'}
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
                {isNl ? 'Rechten matrix bewerken' : 'Edit permissions matrix'}
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#6B7280' }}>
                {isNl
                  ? 'Schakel modules per rol in of uit. Wijzigingen worden direct automatisch opgeslagen.'
                  : 'Toggle modules on or off per role. Changes are automatically saved in real time.'}
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
                    {isNl ? 'Rol' : 'Role'}
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
                      {m.name}
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
                          {r.name}
                        </span>
                        <span style={{ fontSize: '12px', color: '#6B7280' }}>
                          {r.description}
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
                              title={`${r.name} - ${m.name}: ${isOn ? (isNl ? 'Ingeschakeld' : 'Enabled') : (isNl ? 'Uitgeschakeld' : 'Disabled')}`}
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
