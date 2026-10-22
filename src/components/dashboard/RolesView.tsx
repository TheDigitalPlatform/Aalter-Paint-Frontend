import React, { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '../../context/LanguageContext';
import type { Language } from '../../locales/loadLocale';

interface RolesViewProps {
  language?: Language;
  currentUserId?: string;
  onViewAsUser?: (user: UserRow) => void;
}

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: 'Directie' | 'Beheerder' | 'Beoordelaar' | 'Verkoop';
}

const INITIAL_USERS: UserRow[] = [
  { id: 'u1', name: 'Bart Van Damme', email: 'bart.vandamme@aalterpaint.be', role: 'Directie' },
  { id: 'u2', name: 'Katrien Vermeulen', email: 'katrien.vermeulen@aalterpaint.be', role: 'Beoordelaar' },
  { id: 'u3', name: 'Pieter De Smet', email: 'pieter.desmet@aalterpaint.be', role: 'Beoordelaar' },
  { id: 'u4', name: 'Jens Goossens', email: 'jens.goossens@aalterpaint.be', role: 'Beheerder' },
  { id: 'u5', name: 'Sofie Maes', email: 'sofie.maes@aalterpaint.be', role: 'Verkoop' },
  { id: 'u6', name: 'Wim Claeys', email: 'wim.claeys@aalterpaint.be', role: 'Verkoop' },
];

const MODULE_KEYS = [
  { k: 'overzicht', lNl: 'Overzicht', lEn: 'Overview' },
  { k: 'insights', lNl: 'Insights', lEn: 'Insights' },
  { k: 'orders', lNl: 'Orders', lEn: 'Orders' },
  { k: 'validatie', lNl: 'Validatie', lEn: 'Validation' },
  { k: 'uitzonderingen', lNl: 'Uitzonderingen en BC-sync', lEn: 'Exceptions and BC-sync' },
  { k: 'instellingen', lNl: 'Instellingen', lEn: 'Settings' },
  { k: 'rollen', lNl: 'Rollen en toegang', lEn: 'Roles and access' },
  { k: 'audit', lNl: 'Audittrail', lEn: 'Audit trail' },
  { k: 'learning', lNl: 'Learning loop', lEn: 'Learning loop' },
];

const ROLE_MODULES: Record<UserRow['role'], string[]> = {
  Directie: ['overzicht', 'insights', 'orders', 'validatie', 'uitzonderingen', 'instellingen', 'rollen', 'audit', 'learning'],
  Beheerder: ['overzicht', 'insights', 'orders', 'uitzonderingen', 'instellingen', 'rollen', 'audit', 'learning'],
  Beoordelaar: ['overzicht', 'insights', 'orders', 'validatie', 'uitzonderingen', 'audit', 'learning'],
  Verkoop: ['overzicht', 'insights', 'orders'],
};

const ROLE_SETTINGS: Record<UserRow['role'], boolean> = {
  Directie: true,
  Beheerder: true,
  Beoordelaar: false,
  Verkoop: false,
};

const ROLE_DESC: Record<UserRow['role'], { nl: string; en: string }> = {
  Directie: { nl: 'alle modules', en: 'all modules' },
  Beheerder: { nl: 'configuratie en gebruikers', en: 'configuration and users' },
  Beoordelaar: { nl: 'orderadministratie', en: 'order administration' },
  Verkoop: { nl: 'enkel lezen', en: 'read-only' },
};

const ROLE_STYLE: Record<UserRow['role'], [string, string]> = {
  Directie: ['#EBEBEB', '#242424'],
  Beheerder: ['#FFF3B8', '#5C4A00'],
  Beoordelaar: ['#E7EEFC', '#1D4FBF'],
  Verkoop: ['#F5F5F5', '#4D4D4D'],
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const RolesView: React.FC<RolesViewProps> = ({
  language: propLang,
  currentUserId: propUserId,
  onViewAsUser,
}) => {
  const { language: ctxLang } = useTranslation();
  const lang = propLang || ctxLang || 'NL';
  const isNl = lang === 'NL';

  const [users, setUsers] = useState<UserRow[]>(INITIAL_USERS);
  const [currentUserId, setCurrentUserId] = useState<string>(propUserId || 'u1');

  // Dialog state
  const [dialog, setDialog] = useState<
    | { kind: 'add' }
    | { kind: 'edit'; user: UserRow }
    | { kind: 'del'; user: UserRow }
    | null
  >(null);

  const [dName, setDName] = useState('');
  const [dEmail, setDEmail] = useState('');
  const [dRole, setDRole] = useState<UserRow['role']>('Beoordelaar');
  const [dErr, setDErr] = useState('');

  const openAdd = () => {
    setDName('');
    setDEmail('');
    setDRole('Beoordelaar');
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

  const handleViewAs = (u: UserRow) => {
    setCurrentUserId(u.id);
    if (onViewAsUser) onViewAsUser(u);
    toast.info(
      isNl
        ? `Je bekijkt de interface nu als ${u.name} (${u.role})`
        : `You are now viewing the interface as ${u.name} (${u.role})`
    );
  };

  const dialogMods = ROLE_MODULES[dRole] || [];

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
          className="bp"
          onClick={openAdd}
          style={{
            minHeight: '44px',
            padding: '0 16px',
            background: '#E20714',
            color: '#FFFFFF',
            border: 0,
            borderRadius: 0,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'background 0.15s ease',
          }}
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
            const style = ROLE_STYLE[u.role] || ['#F5F5F5', '#4D4D4D'];
            const allowedMods = ROLE_MODULES[u.role] || [];
            const hasSettings = ROLE_SETTINGS[u.role];

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
                      background: style[0],
                      color: style[1],
                      borderRadius: '2px',
                    }}
                  >
                    {u.role}
                  </span>
                </span>

                {/* Allowed Modules Chips */}
                <span style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {allowedMods.map((mk) => {
                    const mod = MODULE_KEYS.find((m) => m.k === mk);
                    const label = mod ? (isNl ? mod.lNl : mod.lEn) : mk;
                    return (
                      <span
                        key={mk}
                        style={{
                          fontSize: '12px',
                          padding: '2px 7px',
                          border: '1px solid #C9C9C9',
                          background: '#FFFFFF',
                          borderRadius: '2px',
                          color: '#242424',
                        }}
                      >
                        {label}
                      </span>
                    );
                  })}
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
                <span style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button
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
                  </button>
                  <button
                    className="bg"
                    onClick={() => openEdit(u)}
                    style={{
                      minHeight: '36px',
                      padding: '0 10px',
                      border: '1px solid #1A1A1A',
                      background: '#FFFFFF',
                      borderRadius: 0,
                      fontSize: '13px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      cursor: 'pointer',
                    }}
                  >
                    {isNl ? 'Bewerken' : 'Edit'}
                  </button>
                  <button
                    className="bg"
                    onClick={() => openDel(u)}
                    disabled={isMe}
                    style={{
                      minHeight: '36px',
                      padding: '0 10px',
                      border: '1px solid #C9C9C9',
                      background: '#FFFFFF',
                      borderRadius: 0,
                      fontSize: '13px',
                      fontWeight: 700,
                      color: isMe ? '#8C8C8C' : '#A61B1B',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      cursor: isMe ? 'not-allowed' : 'pointer',
                      opacity: isMe ? 0.45 : 1,
                    }}
                  >
                    {isNl ? 'Verwijderen' : 'Delete'}
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Role to Module Matrix */}
      <section aria-label="Rol naar module" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h2
          style={{
            margin: 0,
            fontFamily: "'Archivo', system-ui, sans-serif",
            fontWeight: 700,
            fontSize: '19px',
            letterSpacing: 0,
            color: '#1A1A1A',
          }}
        >
          {isNl ? 'Rol naar module' : 'Role to module'}
        </h2>
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #DADADA',
            overflowX: 'auto',
            borderRadius: 0,
          }}
        >
          <div style={{ minWidth: '880px' }}>
            {/* Matrix Header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '170px repeat(9, minmax(0, 1fr))',
                gap: '8px',
                padding: '10px 16px',
                borderBottom: '1px solid #DADADA',
                background: '#FAFAFA',
                fontSize: '12px',
                fontWeight: 700,
                alignItems: 'end',
                color: '#6B6B6B',
              }}
            >
              <span>{isNl ? 'Rol' : 'Role'}</span>
              {MODULE_KEYS.map((m) => (
                <span key={m.k} style={{ textAlign: 'center', lineHeight: 1.25 }}>
                  {isNl ? m.lNl : m.lEn}
                </span>
              ))}
            </div>

            {/* Matrix Rows for 4 Roles */}
            {(['Directie', 'Beheerder', 'Beoordelaar', 'Verkoop'] as UserRow['role'][]).map(
              (r) => {
                const allowed = ROLE_MODULES[r] || [];
                const desc = ROLE_DESC[r] ? (isNl ? ROLE_DESC[r].nl : ROLE_DESC[r].en) : '';

                return (
                  <div
                    key={r}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '170px repeat(9, minmax(0, 1fr))',
                      gap: '8px',
                      padding: '10px 16px',
                      borderBottom: '1px solid #EBEBEB',
                      alignItems: 'center',
                      fontSize: '14px',
                    }}
                  >
                    <span style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 700, color: '#1A1A1A' }}>{r}</span>
                      <span style={{ fontSize: '12px', color: '#4D4D4D' }}>{desc}</span>
                    </span>

                    {MODULE_KEYS.map((m) => {
                      const isOn = allowed.includes(m.k);
                      return (
                        <span
                          key={m.k}
                          style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            color: isOn ? '#1F9D55' : '#B0B0B0',
                          }}
                          title={
                            isOn
                              ? `${r} has access to ${isNl ? m.lNl : m.lEn}`
                              : `${r} has no access to ${isNl ? m.lNl : m.lEn}`
                          }
                        >
                          {isOn ? (
                            <svg className="i" viewBox="0 0 24 24" style={{ width: '18px', height: '18px' }}>
                              <path d="M20 6L9 17l-5-5" strokeWidth="2.5" />
                            </svg>
                          ) : (
                            <svg className="i" viewBox="0 0 24 24" style={{ width: '18px', height: '18px' }}>
                              <path d="M6 12h12" strokeWidth="2" />
                            </svg>
                          )}
                        </span>
                      );
                    })}
                  </div>
                );
              }
            )}
          </div>
        </div>
      </section>

      {/* ============ DIALOGS ============ */}
      {dialog && (
        <div
          className="a-fade"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(18,18,18,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 1000,
          }}
        >
          <div
            className="a-pop"
            role="dialog"
            aria-modal="true"
            style={{
              background: '#FFFFFF',
              width: '480px',
              maxWidth: '100%',
              border: '1px solid #DADADA',
              boxShadow: '0 6px 20px rgba(18,18,18,0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              padding: '24px',
              boxSizing: 'border-box',
              borderRadius: 0,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontFamily: "'Archivo', system-ui, sans-serif",
                fontWeight: 700,
                fontSize: '19px',
                letterSpacing: 0,
                color: '#1A1A1A',
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <label
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#1A1A1A',
                  }}
                >
                  {isNl ? 'Naam' : 'Name'}
                  <input
                    type="text"
                    value={dName}
                    onChange={(e) => setDName(e.target.value)}
                    placeholder={isNl ? 'bv. Lien Desmet' : 'e.g. Lien Desmet'}
                    style={{
                      height: '44px',
                      padding: '0 10px',
                      border: '1px solid #C9C9C9',
                      borderRadius: 0,
                      fontSize: '15px',
                      fontWeight: 400,
                      background: '#FFFFFF',
                      color: '#1A1A1A',
                    }}
                  />
                </label>

                <label
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#1A1A1A',
                  }}
                >
                  {isNl ? 'E-mailadres' : 'Email address'}
                  <input
                    type="email"
                    value={dEmail}
                    onChange={(e) => setDEmail(e.target.value)}
                    placeholder="voornaam.naam@aalterpaint.be"
                    style={{
                      height: '44px',
                      padding: '0 10px',
                      border: '1px solid #C9C9C9',
                      borderRadius: 0,
                      fontSize: '15px',
                      fontWeight: 400,
                      background: '#FFFFFF',
                      color: '#1A1A1A',
                    }}
                  />
                </label>

                <label
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#1A1A1A',
                  }}
                >
                  {isNl ? 'Rol' : 'Role'}
                  <select
                    value={dRole}
                    onChange={(e) => setDRole(e.target.value as UserRow['role'])}
                    style={{
                      height: '44px',
                      padding: '0 10px',
                      border: '1px solid #C9C9C9',
                      borderRadius: 0,
                      fontSize: '15px',
                      fontWeight: 400,
                      background: '#FFFFFF',
                      color: '#1A1A1A',
                    }}
                  >
                    <option value="Directie">Directie</option>
                    <option value="Beheerder">Beheerder</option>
                    <option value="Beoordelaar">Beoordelaar</option>
                    <option value="Verkoop">Verkoop</option>
                  </select>
                </label>

                {/* Modules preview for selected role */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    padding: '10px 12px',
                    background: '#F5F5F5',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#1A1A1A' }}>
                    {isNl ? 'Modules voor deze rol' : 'Modules for this role'}
                  </span>
                  <span style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {dialogMods.map((mk) => {
                      const mod = MODULE_KEYS.find((m) => m.k === mk);
                      return (
                        <span
                          key={mk}
                          style={{
                            fontSize: '12px',
                            padding: '2px 7px',
                            border: '1px solid #C9C9C9',
                            background: '#FFFFFF',
                            borderRadius: '2px',
                            color: '#242424',
                          }}
                        >
                          {mod ? (isNl ? mod.lNl : mod.lEn) : mk}
                        </span>
                      );
                    })}
                  </span>
                </div>

                {dErr && (
                  <span style={{ fontSize: '13px', color: '#A61B1B', fontWeight: 600 }}>
                    {dErr}
                  </span>
                )}
              </div>
            ) : (
              /* Delete confirmation */
              <p style={{ margin: 0, fontSize: '15px', color: '#242424' }}>
                {isNl
                  ? `Ben je zeker dat je ${dialog.user.name} wil verwijderen?`
                  : `Are you sure you want to delete ${dialog.user.name}?`}
              </p>
            )}

            {/* Dialog Footer Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
              <button
                className="bg"
                onClick={closeDialog}
                style={{
                  minHeight: '44px',
                  padding: '0 16px',
                  border: '1px solid #1A1A1A',
                  background: '#FFFFFF',
                  borderRadius: 0,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {isNl ? 'Annuleren' : 'Cancel'}
              </button>
              <button
                className="bp"
                onClick={dialog.kind === 'del' ? handleDeleteUser : handleSaveUser}
                style={{
                  minHeight: '44px',
                  padding: '0 16px',
                  border: 0,
                  background: '#E20714',
                  color: '#FFFFFF',
                  borderRadius: 0,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {dialog.kind === 'add'
                  ? isNl
                    ? 'Toevoegen'
                    : 'Add'
                  : dialog.kind === 'edit'
                  ? isNl
                    ? 'Opslaan'
                    : 'Save'
                  : isNl
                  ? 'Verwijderen'
                  : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
