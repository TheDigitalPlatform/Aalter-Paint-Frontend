import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, ArrowLeft } from 'lucide-react';
import { Button, TextInput, Logo } from '../../components/common';
import { useTranslation } from '../../context/LanguageContext';
import { toast } from 'sonner';
import { resetPasswordApi } from '../../lib/auth';

const rules = [
  {
    key: 'length',
    label: 'At least 8 characters',
    labelNl: 'Minimaal 8 tekens',
    test: (v: string) => v.length >= 8,
  },
  {
    key: 'upper',
    label: 'One uppercase letter',
    labelNl: 'Minstens één hoofdletter',
    test: (v: string) => /[A-Z]/.test(v),
  },
  {
    key: 'number',
    label: 'One number',
    labelNl: 'Minstens één cijfer',
    test: (v: string) => /\d/.test(v),
  },
];

export const ResetPasswordPage: React.FC = () => {
  const { language, t } = useTranslation();
  const isNl = language === 'NL';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || searchParams.get('t') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [touched, setTouched] = useState({ password: false, confirmPassword: false });
  const [loading, setLoading] = useState(false);

  const passwordErr =
    touched.password && !password
      ? t('auth.errPwdReq', isNl ? 'Wachtwoord is verplicht' : 'Password is required')
      : touched.password && password.length < 8
      ? t('auth.errPwdMin', isNl ? 'Wachtwoord moet minimaal 8 tekens bevatten' : 'Password must be at least 8 characters')
      : '';

  const confirmErr =
    touched.confirmPassword && !confirmPassword
      ? t('auth.errConfirmReq', isNl ? 'Bevestig wachtwoord is verplicht' : 'Confirm password is required')
      : touched.confirmPassword && password !== confirmPassword
      ? t('auth.errPwdMatch', isNl ? 'Wachtwoorden komen niet overeen' : 'Passwords do not match')
      : '';

  const strength = rules.filter(r => r.test(password)).length;
  const strengthColor =
    strength === 1 ? '#E20714' : strength === 2 ? '#D97706' : strength === 3 ? '#1F9D55' : 'var(--color-border)';
  const strengthLabel =
    strength === 1
      ? t('auth.strengthWeak', isNl ? 'Zwak' : 'Weak')
      : strength === 2
      ? t('auth.strengthFair', isNl ? 'Gemiddeld' : 'Fair')
      : strength === 3
      ? t('auth.strengthStrong', isNl ? 'Sterk' : 'Strong')
      : t('auth.strengthTooWeak', isNl ? 'Te zwak' : 'Too weak');

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    setTouched({ password: true, confirmPassword: true });

    if (!password || password.length < 8 || password !== confirmPassword) {
      return;
    }

    if (!token) {
      toast.error(
        t(
          'auth.errTokenReq',
          isNl
            ? 'Ongeldige of ontbrekende hersteltoken. Gebruik de link in uw e-mail.'
            : 'Invalid or missing reset token. Please use the link sent to your email.'
        )
      );
      return;
    }

    setLoading(true);
    try {
      const res = await resetPasswordApi({ token, password, new_password: password });
      toast.success(
        res.message ||
          t(
            'auth.resetSuccessMsg',
            isNl
              ? 'Wachtwoord herstel voltooid! U wordt doorgestuurd naar inloggen...'
              : 'Password reset complete! Redirecting to login...'
          )
      );
      setTimeout(() => {
        navigate('/login');
      }, 1000);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : t('auth.resetError', isNl ? 'Wachtwoord herstellen mislukt' : 'Failed to reset password');
      toast.error(message);
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="ea-auth-wrap">
      {/* Left Column - Aalterpaint Theme Brand Banner */}
      <div
        className="ea-auth-brand"
        style={{
          position: 'sticky',
          top: 0,
          overflow: 'hidden',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            position: 'relative',
            textAlign: 'center',
            maxWidth: 380,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Logo size="lg" light={true} />

          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15, lineHeight: 1.7, margin: '24px 0 0' }}>
            {t(
              'auth.loginBrandSubtitle',
              isNl
                ? 'Slimme AI-assistent voor geautomatiseerde orderverwerking, artikelverificatie en foutloze ERP-integratie.'
                : 'Smart AI assistant for automated order processing, article verification, and ERP integration.'
            )}
          </p>

        </div>
      </div>

      {/* Right Column - Existing Theme UI Form Panel */}
      <div className="ea-auth-panel">
        <div className="ea-auth-card">
          {/* Header Row */}
          <div
            style={{
              marginBottom: 32,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 20,
            }}
          >
            <div>
              <h2
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 28,
                  fontWeight: 700,
                  color: 'var(--color-navy)',
                  margin: '0 0 8px',
                }}
              >
                {t('auth.resetTitle', isNl ? 'Wachtwoord herstellen' : 'Reset password')}
              </h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 14, margin: 0 }}>
                {t(
                  'auth.resetSub',
                  isNl
                    ? 'Maak een nieuw wachtwoord aan voor uw Aalterpaint-account'
                    : 'Create a new password for your Aalterpaint account'
                )}
              </p>
            </div>

            <Link
              to="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 14,
                color: 'var(--color-navy)',
                fontWeight: 600,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                paddingTop: 4,
              }}
            >
              <ArrowLeft size={16} />
              {t('auth.backToLogin', isNl ? 'Terug naar inloggen' : 'Back to login')}
            </Link>
          </div>

          <form id="reset-form" onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <TextInput
              id="reset-new-password"
              label={t('auth.newPasswordLabel', isNl ? 'Nieuw wachtwoord' : 'New password')}
              type="password"
              placeholder={t('auth.newPasswordPh', isNl ? 'Voer nieuw wachtwoord in' : 'Enter new password')}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onBlur={() => setTouched(p => ({ ...p, password: true }))}
              onKeyDown={handleKeyDown}
              error={!!passwordErr}
              errorMsg={passwordErr}
              required
              autoComplete="new-password"
              iconLeft={<Lock size={15} />}
            />

            {/* Theme-based Password Strength meter */}
            {password && (
              <div style={{ marginTop: -8 }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: 4,
                        borderRadius: 99,
                        background: i < strength ? strengthColor : '#E2E8F0',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      color: strengthColor,
                      fontFamily: "'Archivo', system-ui, sans-serif",
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: strengthColor,
                        flexShrink: 0,
                      }}
                    />
                    {strengthLabel}
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 8 }}>
                  {rules.map(r => {
                    const passed = r.test(password);
                    return (
                      <span
                        key={r.key}
                        style={{
                          fontSize: 11.5,
                          fontWeight: 500,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          color: passed ? 'var(--color-success)' : 'var(--color-text-muted)',
                        }}
                      >
                        <span style={{ fontSize: 13 }}>{passed ? '✓' : '•'}</span>
                        {isNl ? r.labelNl : r.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <TextInput
              id="reset-confirm-password"
              label={t('auth.confirmPasswordLabel', isNl ? 'Bevestig wachtwoord' : 'Confirm password')}
              type="password"
              placeholder={t('auth.confirmPasswordPlaceholder', isNl ? 'Herhaal uw nieuwe wachtwoord' : 'Repeat your new password')}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              onBlur={() => setTouched(p => ({ ...p, confirmPassword: true }))}
              onKeyDown={handleKeyDown}
              error={!!confirmErr}
              errorMsg={confirmErr}
              required
              autoComplete="new-password"
              iconLeft={<Lock size={15} />}
            />

            <Button
              id="reset-submit"
              type="submit"
              variant="solid"
              fullWidth
              loading={loading}
              disabled={loading || !password || !confirmPassword}
              size="lg"
            >
              {t('auth.resetPasswordBtn', isNl ? 'Wachtwoord herstellen' : 'Reset password')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
