import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '../../context/LanguageContext';
import type { Language } from '../../locales/loadLocale';
import {
  fetchRoleModuleMatrix,
  updateRoleModulePermissions,
  getRoleBadgeStyle,
  type RoleModuleMatrixData,
} from '../../lib/roleModuleApi';

interface RolesViewProps {
  language?: Language;
  currentUserId?: string;
  onViewAsUser?: (user: UserRow) => void;
}

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
}

const INITIAL_USERS: UserRow[] = [
  { id: 'u1', name: 'Bart Van Damme', email: 'bart.vandamme@aalterpaint.be', role: 'Managing board' },
  { id: 'u2', name: 'Katrien Vermeulen', email: 'katrien.vermeulen@aalterpaint.be', role: 'Reviewer' },
  { id: 'u3', name: 'Pieter De Smet', email: 'pieter.desmet@aalterpaint.be', role: 'Reviewer' },
  { id: 'u4', name: 'Jens Goossens', email: 'jens.goossens@aalterpaint.be', role: 'Administrator' },
  { id: 'u5', name: 'Sofie Maes', email: 'sofie.maes@aalterpaint.be', role: 'Sale' },
  { id: 'u6', name: 'Wim Claeys', email: 'wim.claeys@aalterpaint.be', role: 'Sale' },
];

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
  const lang = propLang || ctxLang || 'NL';
  const isNl = lang === 'NL';

  const [users, setUsers] = useState<UserRow[]>(INITIAL_USERS);
  const [currentUserId] = useState<string>(propUserId || 'u1');

  // Dynamic Role-Module Matrix state (strictly from backend API)
  const [matrixData, setMatrixData] = useState<RoleModuleMatrixData>({ modules: [], roles: [] });
  const [isMatrixLoading, setIsMatrixLoading] = useState<boolean>(true);
  const [matrixError, setMatrixError] = useState<string | null>(null);
  const hasFetchedRef = React.useRef<boolean>(false);

  // Edit Permissions Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [savingCell, setSavingCell] = useState<string | null>(null);

  // Load matrix from GET /api/role-modules (deduplicated, strictly 1 network call on load)
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
    loadMatrix(false, false);
  }, [loadMatrix]);

  // Dialog state
  const [dialog, setDialog] = useState<
    | { kind: 'add' }
    | { kind: 'edit'; user: UserRow }
    | { kind: 'del'; user: UserRow }
    | null
  >(null);

  const [dName, setDName] = useState('');
  const [dEmail, setDEmail] = useState('');
  const [dRole, setDRole] = useState<string>('Managing board');
  const [dErr, setDErr] = useState('');

  const openAdd = () => {
    setDName('');
    setDEmail('');
    setDRole(matrixData.roles[0]?.name || 'Managing board');
    setDErr('');
    setDialog({ kind: 'add' });
  };

  const openEdit = (u: UserRow) => {
    setDName(u.name);
    setDEmail(u.email);
    setDRole(u.role);
    setDErr('');
    setDialog({ kind: 'edit', user: u });
  };

  const openDel = (u: UserRow) => {
    setDialog({ kind: 'del', user: u });
  };

  const closeDialog = () => {
    setDialog(null);
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
      // Revert optimistic update by re-fetching live matrix from server
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
        if (dialog) closeDialog();
        if (isEditModalOpen && !savingCell) setIsEditModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [dialog, isEditModalOpen, savingCell]);

  const handleSaveUser = () => {
    if (!dName.trim()) {
      setDErr(isNl ? 'Naam is verplicht' : 'Name is required');
      return;
    }
    if (!dEmail.trim() || !dEmail.includes('@')) {
      setDErr(isNl ? 'Geldig e-mailadres is verplicht' : 'Valid email is required');
      return;
    }

    if (dialog?.kind === 'add') {
      const newUser: UserRow = {
        id: `u${Date.now()}`,
        name: dName.trim(),
        email: dEmail.trim(),
        role: dRole,
      };
      setUsers((prev) => [...prev, newUser]);
      toast.success(
        isNl
          ? `Gebruiker ${newUser.name} toegevoegd als ${newUser.role}`
          : `User ${newUser.name} added as ${newUser.role}`
      );
      closeDialog();
    } else if (dialog?.kind === 'edit') {
      const updatedUser: UserRow = {
        ...dialog.user,
        name: dName.trim(),
        email: dEmail.trim(),
        role: dRole,
      };
      setUsers((prev) =>
        prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
      );
      toast.success(
        isNl
          ? `Gegevens van ${updatedUser.name} opgeslagen`
          : `Details for ${updatedUser.name} saved`
      );
      closeDialog();
    }
  };

  const handleDeleteUser = () => {
    if (dialog?.kind === 'del') {
      const target = dialog.user;
      setUsers((prev) => prev.filter((u) => u.id !== target.id));
      toast.success(
        isNl
          ? `Gebruiker ${target.name} verwijderd`
          : `User ${target.name} deleted`
      );
      closeDialog();
    }
  };

  /* const handleViewAs = (u: UserRow) => {
    setCurrentUserId(u.id);
    if (onViewAsUser) onViewAsUser(u);
    toast.info(
      isNl
        ? `Je bekijkt de interface nu als ${u.name} (${u.role})`
        : `You are now viewing the interface as ${u.name} (${u.role})`
    );
  }; */

  // Compute live dynamic modules for dialog role preview from backend data
  const matchedDialogRole = matrixData.roles.find(
    (r) => r.name.toLowerCase().trim() === dRole.toLowerCase().trim()
  );
  const dialogMods = matchedDialogRole
    ? matchedDialogRole.modules.filter((m) => m.has_access)
    : [];

  return (
    <div className="a-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
          <p style={{ margin: 0, color: '#4D4D4D' }}>
            {isNl
              ? 'Een rol bepaalt welke modules iemand ziet. Wijzig een rol en de modules passen meteen aan; met Bekijk als zie je het menu van die gebruiker.'
              : "A role determines which modules someone sees. Changing a role updates modules immediately; with 'View as' you see that user's menu."}
          </p>
        </div>

        <button
          className="ap-add-user-btn"
          onClick={openAdd}
        >
          {isNl ? 'Gebruiker toevoegen' : 'Add user'}
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
        <div style={{ minWidth: '880px' }}>
          {/* Table Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'minmax(200px, 1.3fr) 116px minmax(220px, 2fr) 104px minmax(190px, 1.2fr)',
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

          {/* User Rows */}
          {users.map((u) => {
            const isMe = u.id === currentUserId;
            const badgeStyle = getRoleBadgeStyle(u.role);
            const roleLabel = u.role;

            // Locate role permissions dynamically in live matrixData
            const matchedRole = matrixData.roles.find(
              (r) => r.name.toLowerCase().trim() === (u.role || '').toLowerCase().trim()
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
                    'minmax(200px, 1.3fr) 116px minmax(220px, 2fr) 104px minmax(190px, 1.2fr)',
                  gap: '12px',
                  padding: '12px 16px',
                  borderBottom: '1px solid #EBEBEB',
                  alignItems: 'center',
                  fontSize: '14px',
                  background: isMe ? '#FFFBEA' : '#FFFFFF',
                  transition: 'background 0.15s ease',
                }}
              >
                {/* User Avatar + Name & Email */}
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <span
                    aria-hidden="true"
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: '#242424',
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
                    <span style={{ fontWeight: 700, color: '#1A1A1A' }}>
                      {u.name} {isMe && (isNl ? '(jij)' : '(you)')}
                    </span>
                    <span style={{ fontSize: '12px', color: '#4D4D4D' }}>{u.email}</span>
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
                      borderRadius: '2px',
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
                          fontSize: '12px',
                          padding: '2px 7px',
                          border: '1px solid #C9C9C9',
                          background: '#FFFFFF',
                          borderRadius: '2px',
                          color: '#242424',
                        }}
                      >
                        {mod.name}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '12px', color: '#8C8C8C', fontStyle: 'italic' }}>
                      {isNl ? 'Geen modules' : 'No modules'}
                    </span>
                  )}
                </span>

                {/* Settings Access Badge */}
                <span>
                  {hasSettings ? (
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        padding: '3px 10px',
                        background: '#FFF3B8',
                        color: '#5C4A00',
                        borderRadius: '2px',
                      }}
                    >
                      {isNl ? 'Instellingen' : 'Settings'}
                    </span>
                  ) : (
                    <span style={{ fontSize: '13px', color: '#6B6B6B' }}>
                      {isNl ? 'Geen toegang' : 'No access'}
                    </span>
                  )}
                </span>

                {/* Action Buttons */}
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {/* <button
                    className="bg"
                    onClick={() => handleViewAs(u)}
                    disabled={isMe}
                    style={{
                      minHeight: '36px',
                      padding: '0 10px',
                      border: '1px solid #C9C9C9',
                      background: '#FFFFFF',
                      borderRadius: 0,
                      fontSize: '13px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      cursor: isMe ? 'not-allowed' : 'pointer',
                      opacity: isMe ? 0.45 : 1,
                    }}
                  >
                    {isNl ? 'Bekijk als' : 'View as'}
                  </button> */}
                  <button
                    type="button"
                    className="bg"
                    onClick={() => openEdit(u)}
                    title={isNl ? 'Gebruiker bewerken' : 'Edit user'}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      height: '34px',
                      padding: '0 12px',
                      border: '1px solid #D1D5DB',
                      background: '#FFFFFF',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#1F2937',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#111827';
                      e.currentTarget.style.background = '#F9FAFB';
                      e.currentTarget.style.color = '#111827';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#D1D5DB';
                      e.currentTarget.style.background = '#FFFFFF';
                      e.currentTarget.style.color = '#1F2937';
                      e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.04)';
                    }}
                  >
                    <Pencil size={13} style={{ strokeWidth: 2.2, color: 'currentColor' }} />
                    <span>{isNl ? 'Bewerken' : 'Edit'}</span>
                  </button>
                  <button
                    type="button"
                    className="bg"
                    onClick={() => openDel(u)}
                    disabled={isMe}
                    title={
                      isMe
                        ? (isNl ? 'Je kunt je eigen account niet verwijderen' : 'You cannot delete your own account')
                        : (isNl ? 'Gebruiker verwijderen' : 'Delete user')
                    }
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      height: '34px',
                      padding: '0 12px',
                      border: isMe ? '1px solid #E5E7EB' : '1px solid #FECACA',
                      background: isMe ? '#F9FAFB' : '#FEF2F2',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: isMe ? '#9CA3AF' : '#DC2626',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      cursor: isMe ? 'not-allowed' : 'pointer',
                      opacity: isMe ? 0.6 : 1,
                      boxShadow: isMe ? 'none' : '0 1px 2px rgba(220, 38, 38, 0.05)',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isMe) {
                        e.currentTarget.style.borderColor = '#F87171';
                        e.currentTarget.style.background = '#FEE2E2';
                        e.currentTarget.style.color = '#B91C1C';
                        e.currentTarget.style.boxShadow = '0 2px 5px rgba(220, 38, 38, 0.15)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isMe) {
                        e.currentTarget.style.borderColor = '#FECACA';
                        e.currentTarget.style.background = '#FEF2F2';
                        e.currentTarget.style.color = '#DC2626';
                        e.currentTarget.style.boxShadow = '0 1px 2px rgba(220, 38, 38, 0.05)';
                      }
                    }}
                  >
                    <Trash2 size={13} style={{ strokeWidth: 2.2, color: 'currentColor' }} />
                    <span>{isNl ? 'Verwijderen' : 'Delete'}</span>
                  </button>
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

          {/* Edit Permissions Button (Black by default, Vibrant Red on hover) */}
          <button
            type="button"
            className="ap-edit-permissions-btn"
            onClick={() => setIsEditModalOpen(true)}
          >
            <svg
              width="14"
              height="14"
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
            <span>{isNl ? 'Rechten bewerken' : 'Edit permissions'}</span>
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
          >
            {/* Top Close Button */}
            <button
              type="button"
              className="ap-modal-close-btn"
              onClick={closeDialog}
              aria-label={isNl ? 'Sluiten' : 'Close'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Modal Title */}
            <h2
              style={{
                margin: '0 0 16px 0',
                paddingRight: '32px',
                fontFamily: "'Archivo', system-ui, sans-serif",
                fontWeight: 700,
                fontSize: '18px',
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: '#374151',
                  }}
                >
                  {isNl ? 'Naam' : 'Name'}
                  <input
                    type="text"
                    value={dName}
                    onChange={(e) => setDName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveUser();
                    }}
                    placeholder={isNl ? 'bv. Lien Desmet' : 'e.g. Lien Desmet'}
                    className="ap-modal-input"
                    autoFocus
                  />
                </label>

                <label
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: '#374151',
                  }}
                >
                  {isNl ? 'E-mailadres' : 'Email address'}
                  <input
                    type="email"
                    value={dEmail}
                    onChange={(e) => setDEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveUser();
                    }}
                    placeholder={isNl ? 'voornaam.naam@aalterpaint.be' : 'firstname.lastname@aalterpaint.be'}
                    className="ap-modal-input"
                  />
                </label>

                <label
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: '#374151',
                  }}
                >
                  {isNl ? 'Rol' : 'Role'}
                  <select
                    value={dRole}
                    onChange={(e) => setDRole(e.target.value)}
                    className="ap-modal-select"
                  >
                    {matrixData.roles.map((r) => (
                      <option key={r.id || r.name} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Modules preview for selected role */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    padding: '9px 12px',
                    background: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderRadius: '6px',
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {isNl ? 'Modules voor deze rol' : 'Modules for this role'}
                  </span>
                  <span style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {dialogMods.length > 0 ? (
                      dialogMods.map((dm) => (
                        <span
                          key={dm.module_id || dm.key}
                          className="ap-modal-badge"
                        >
                          {dm.name}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '12px', color: '#6B7280', fontStyle: 'italic' }}>
                        {isNl ? 'Geen modules toegewezen' : 'No modules assigned'}
                      </span>
                    )}
                  </span>
                </div>

                {dErr && (
                  <div
                    style={{
                      padding: '6px 10px',
                      background: '#FEF2F2',
                      border: '1px solid #FCA5A5',
                      borderRadius: '4px',
                      fontSize: '12px',
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
              <div style={{ padding: '6px 0 10px 0', fontSize: '14px', color: '#1F2937', lineHeight: 1.5 }}>
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
                gap: '10px',
                marginTop: '18px',
              }}
            >
              <button
                type="button"
                className="ap-btn-cancel"
                onClick={closeDialog}
              >
                {isNl ? 'ANNULEREN' : 'CANCEL'}
              </button>
              <button
                type="button"
                className="ap-btn-save"
                onClick={dialog.kind === 'del' ? handleDeleteUser : handleSaveUser}
                style={{
                  background: dialog.kind === 'del' ? '#B91C1C' : '#E20714',
                }}
              >
                {dialog.kind === 'del'
                  ? isNl
                    ? 'VERWIJDEREN'
                    : 'DELETE'
                  : isNl
                  ? 'OPSLAAN'
                  : 'SAVE'}
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
