import React, { useState, useEffect, useCallback } from 'react';
import { User, Mail, Shield, ShieldCheck, Pencil, X, Save, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LanguageContext';
import {
  fetchMyProfile,
  updateMyProfile,
  getRoleName,
  getInitials,
  type UserRow,
} from '../../lib/profileApi';
import { toast } from 'sonner';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ProfileView: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { t, language } = useTranslation();
  const isNl = language === 'NL';

  const [profile, setProfile] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  const userRoleRef = React.useRef(user?.role);
  userRoleRef.current = user?.role;

  // Fetch live user profile on mount
  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMyProfile();
      setProfile(data);
      setEditName(data.name || '');
      setEditEmail(data.email || '');

      const roleStr = getRoleName(data.role);
      updateUser({
        name: data.name,
        email: data.email,
        role: (roleStr ? roleStr.toLowerCase() : userRoleRef.current) as any,
        status: data.status || (data.is_active === false ? 'Inactive' : 'Active'),
      });
    } catch (err: any) {
      const msg = err?.message || (isNl ? 'Kan profiel niet laden' : 'Failed to load profile');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [isNl, updateUser]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const initials = getInitials(profile?.name || user?.name || user?.email || '');

  const handleStartEdit = () => {
    if (profile) {
      setEditName(profile.name || '');
      setEditEmail(profile.email || '');
    }
    setErrors({});
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (profile) {
      setEditName(profile.name || '');
      setEditEmail(profile.email || '');
    }
    setErrors({});
    setIsEditing(false);
  };

  const validate = (): boolean => {
    const errs: { name?: string; email?: string } = {};
    if (!editName.trim()) {
      errs.name = t('user_profile.validation_name_required', isNl ? 'Volledige naam is verplicht' : 'Full name is required');
    }
    if (!editEmail.trim()) {
      errs.email = t('user_profile.validation_email_invalid', isNl ? 'Voer een geldig e-mailadres in' : 'Please enter a valid email address');
    } else if (!emailRegex.test(editEmail.trim())) {
      errs.email = t('user_profile.validation_email_invalid', isNl ? 'Voer een geldig e-mailadres in' : 'Please enter a valid email address');
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const updated = await updateMyProfile({
        name: editName.trim(),
        email: editEmail.trim(),
      });

      // Update local state with actual backend response
      setProfile(updated);
      setEditName(updated.name || '');
      setEditEmail(updated.email || '');

      const roleStr = getRoleName(updated.role);
      updateUser({
        name: updated.name,
        email: updated.email,
        role: (roleStr ? roleStr.toLowerCase() : user?.role) as any,
        status: updated.status || (updated.is_active === false ? 'Inactive' : 'Active'),
      });

      setIsEditing(false);
      toast.success(
        t('user_profile.update_success', isNl ? 'Profiel succesvol bijgewerkt' : 'Profile updated successfully')
      );
    } catch (err: any) {
      toast.error(
        err?.message ||
          t('user_profile.update_error', isNl ? 'Bijwerken van profiel mislukt' : 'Failed to update profile')
      );
    } finally {
      setSaving(false);
    }
  };

  // Safely resolve role name from backend data
  const roleName = getRoleName(profile?.role || user?.role);
  const roleLower = roleName.toLowerCase();
  const roleDisplay = roleName
    ? roleLower === 'admin' || roleLower === 'directie'
      ? (isNl ? 'Beheerder' : 'Admin')
      : roleLower === 'manager' || roleLower === 'beoordelaar'
      ? 'Manager'
      : roleLower === 'viewer' || roleLower === 'verkoop'
      ? (isNl ? 'Kijker' : 'Viewer')
      : roleName.charAt(0).toUpperCase() + roleName.slice(1)
    : (isNl ? 'Gebruiker' : 'User');

  // Dynamic account active status
  const isAccountActive = profile
    ? profile.status
      ? profile.status.toLowerCase() === 'active'
      : profile.is_active !== false
    : user?.status ? user.status.toLowerCase() === 'active' : true;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        width: '100%',
        maxWidth: '1120px',
        margin: '0 auto',
        paddingBottom: '40px',
      }}
    >
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h1
          style={{
            fontFamily: "'Archivo', system-ui, -apple-system, sans-serif",
            fontSize: '28px',
            fontWeight: 700,
            color: '#1A1A1A',
            letterSpacing: '-0.01em',
            margin: 0,
            lineHeight: 1.25,
          }}
        >
          {t('user_profile.title', isNl ? 'Mijn profiel' : 'My Profile')}
        </h1>
        <p
          style={{
            fontSize: '13.5px',
            color: '#6B6B6B',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {t('user_profile.subtitle', isNl ? 'Configureer uw persoonlijke accountparameters en administratieve instellingen.' : 'Configure your personal account metrics and administrative parameters.')}
        </p>
      </div>

      {/* ── Main Profile Card ── */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #EBEBEB',
          borderRadius: '20px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          padding: '28px 32px',
          boxSizing: 'border-box',
          position: 'relative',
          minHeight: '220px',
        }}
      >
        {/* Loading State */}
        {loading && !profile && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 20px',
              gap: '14px',
            }}
          >
            <Loader2 size={36} className="animate-spin" style={{ color: '#E20714' }} />
            <span style={{ fontSize: '14px', color: '#6B6B6B', fontWeight: 500 }}>
              {t('user_profile.loading_profile', isNl ? 'Gebruikersprofiel laden...' : 'Loading user profile...')}
            </span>
          </div>
        )}

        {/* Error State */}
        {!loading && error && !profile && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '48px 20px',
              gap: '16px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#FEE2E2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertCircle size={24} style={{ color: '#DC2626' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1A1A1A', margin: '0 0 6px' }}>
                {isNl ? 'Fout bij het laden van het profiel' : 'Failed to load profile'}
              </h3>
              <p style={{ fontSize: '13.5px', color: '#6B6B6B', margin: 0, maxWidth: '420px' }}>
                {error}
              </p>
            </div>
            <button
              type="button"
              onClick={loadProfile}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#1A1A1A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '9px 18px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: '4px',
              }}
            >
              <RefreshCw size={14} />
              <span>{isNl ? 'Opnieuw proberen' : 'Retry'}</span>
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && !profile && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '48px 20px',
              gap: '14px',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '14px', color: '#6B6B6B', margin: 0 }}>
              {isNl ? 'Geen profielgegevens gevonden.' : 'No profile details found.'}
            </p>
            <button
              type="button"
              onClick={loadProfile}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#1A1A1A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} />
              <span>{isNl ? 'Vernieuwen' : 'Refresh'}</span>
            </button>
          </div>
        )}

        {/* Active Profile Display */}
        {profile && (
          <>
            {/* Top Row: Avatar + Name/Role + Action Buttons */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                paddingBottom: '24px',
                borderBottom: '1px solid #F1F5F9',
              }}
            >
              {/* Left: Squircle Avatar + Name + Role Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '14px',
                    background: '#1A1A1A',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '19px',
                    fontWeight: 700,
                    fontFamily: "'Archivo', system-ui, sans-serif",
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
                  }}
                >
                  {initials}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <h2
                    style={{
                      fontFamily: "'Archivo', system-ui, -apple-system, sans-serif",
                      fontSize: '22px',
                      fontWeight: 700,
                      color: '#1A1A1A',
                      margin: 0,
                      lineHeight: 1.2,
                    }}
                  >
                    {profile.name || user?.name || (isNl ? 'Gebruiker' : 'User')}
                  </h2>

                  {/* Role Badge in Brand Red Theme */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: '#FCE8E8',
                      border: '1px solid #F5C2C2',
                      borderRadius: '6px',
                      padding: '3px 9px',
                      color: '#E20714',
                      fontSize: '11px',
                      fontWeight: 700,
                      alignSelf: 'flex-start',
                    }}
                  >
                    <Shield size={12} strokeWidth={2.4} style={{ color: '#E20714' }} />
                    <span>{roleDisplay}</span>
                  </div>
                </div>
              </div>

              {/* Right Action Controls: Edit Profile OR Cancel / Save Changes */}
              <div>
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={handleStartEdit}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: '#E20714',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '9px 18px',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#FFFFFF',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(226, 7, 20, 0.25)',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#B80510')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#E20714')}
                  >
                    <Pencil size={14} style={{ color: '#FFFFFF' }} />
                    <span>{t('user_profile.edit_profile', isNl ? 'Profiel bewerken' : 'Edit Profile')}</span>
                  </button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={saving}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#FFFFFF',
                        border: '1px solid #DADADA',
                        borderRadius: '8px',
                        padding: '9px 16px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#242424',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!saving) e.currentTarget.style.background = '#F5F5F5';
                      }}
                      onMouseLeave={(e) => {
                        if (!saving) e.currentTarget.style.background = '#FFFFFF';
                      }}
                    >
                      <X size={14} style={{ color: '#4D4D4D' }} />
                      <span>{t('user_profile.cancel', isNl ? 'Annuleren' : 'Cancel')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#E20714',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '9px 20px',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#FFFFFF',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        boxShadow: '0 2px 6px rgba(226, 7, 20, 0.25)',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!saving) e.currentTarget.style.background = '#B80510';
                      }}
                      onMouseLeave={(e) => {
                        if (!saving) e.currentTarget.style.background = '#E20714';
                      }}
                    >
                      {saving ? (
                        <>
                          <Loader2 size={14} className="animate-spin" style={{ color: '#FFFFFF' }} />
                          <span>{t('user_profile.saving', isNl ? 'Opslaan...' : 'Saving...')}</span>
                        </>
                      ) : (
                        <>
                          <Save size={14} style={{ color: '#FFFFFF' }} />
                          <span>{t('user_profile.save_changes', isNl ? 'Wijzigingen opslaan' : 'Save Changes')}</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ── 2-Column Split (2x2 Grid) Info Cards ── */}
            <div
              className="profile-info-grid"
              style={{
                marginTop: '24px',
              }}
            >
              {/* Card 1: NAME */}
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '14px',
                  padding: '18px 22px',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'border-color 0.2s ease',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#64748B',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  <User size={15} style={{ color: '#64748B' }} />
                  <span>{t('user_profile.name_label', 'NAME')}</span>
                </div>

                {!isEditing ? (
                  <div
                    style={{
                      marginTop: '10px',
                      fontSize: '15.5px',
                      fontWeight: 700,
                      color: '#0F172A',
                    }}
                  >
                    {profile.name || '—'}
                  </div>
                ) : (
                  <div style={{ marginTop: '8px' }}>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => {
                        setEditName(e.target.value);
                        if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                      }}
                      placeholder={isNl ? 'Voer uw volledige naam in' : 'Enter full name'}
                      style={{
                        width: '100%',
                        padding: '9px 13px',
                        borderRadius: '10px',
                        border: errors.name ? '1px solid #E20714' : '1px solid #CBD5E1',
                        fontSize: '14.5px',
                        fontWeight: 600,
                        color: '#0F172A',
                        boxSizing: 'border-box',
                        outline: 'none',
                        background: '#FFFFFF',
                        fontFamily: 'inherit',
                      }}
                    />
                    {errors.name && (
                      <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: '#E20714', fontWeight: 500 }}>
                        {errors.name}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Card 2: ACCOUNT EMAIL */}
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '14px',
                  padding: '18px 22px',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'border-color 0.2s ease',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#64748B',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  <Mail size={15} style={{ color: '#64748B' }} />
                  <span>{t('user_profile.email_label', 'ACCOUNT EMAIL')}</span>
                </div>

                {!isEditing ? (
                  <div
                    style={{
                      marginTop: '10px',
                      fontSize: '15.5px',
                      fontWeight: 700,
                      color: '#0F172A',
                      wordBreak: 'break-all',
                    }}
                  >
                    {profile.email || '—'}
                  </div>
                ) : (
                  <div style={{ marginTop: '8px' }}>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => {
                        setEditEmail(e.target.value);
                        if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                      }}
                      placeholder={isNl ? 'Voer uw e-mailadres in' : 'Enter email address'}
                      style={{
                        width: '100%',
                        padding: '9px 13px',
                        borderRadius: '10px',
                        border: errors.email ? '1px solid #E20714' : '1px solid #CBD5E1',
                        fontSize: '14.5px',
                        fontWeight: 600,
                        color: '#0F172A',
                        boxSizing: 'border-box',
                        outline: 'none',
                        background: '#FFFFFF',
                        fontFamily: 'inherit',
                      }}
                    />
                    {errors.email && (
                      <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: '#E20714', fontWeight: 500 }}>
                        {errors.email}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Card 3: SYSTEM ROLE (Read-only) */}
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '14px',
                  padding: '18px 22px',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#64748B',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  <ShieldCheck size={15} style={{ color: '#64748B' }} />
                  <span>{t('user_profile.system_role', 'SYSTEM ROLE')}</span>
                </div>

                <div
                  style={{
                    marginTop: '10px',
                    fontSize: '15.5px',
                    fontWeight: 700,
                    color: '#0F172A',
                  }}
                >
                  {roleDisplay}
                </div>
              </div>

              {/* Card 4: ACCOUNT STATUS (Read-only) */}
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '14px',
                  padding: '18px 22px',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#64748B',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  <Shield size={15} style={{ color: '#64748B' }} />
                  <span>{t('user_profile.account_status', 'ACCOUNT STATUS')}</span>
                </div>

                <div
                  style={{
                    marginTop: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '15px',
                    fontWeight: 700,
                    color: isAccountActive ? '#1F9D55' : '#DC2626',
                  }}
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: isAccountActive ? '#1F9D55' : '#DC2626',
                      flexShrink: 0,
                    }}
                  />
                  <span>
                    {isAccountActive
                      ? t('user_profile.status_active', isNl ? 'Actief' : 'Active')
                      : t('user_profile.status_inactive', isNl ? 'Inactief' : 'Inactive')}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
