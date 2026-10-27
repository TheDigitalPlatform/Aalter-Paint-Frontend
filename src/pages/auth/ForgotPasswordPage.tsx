import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { Button, TextInput, Logo } from '../../components/common';
import { emailRegex } from '../../components/validation/constant';
import { useTranslation } from '../../context/LanguageContext';
import { toast } from 'sonner';
import { forgotPasswordApi } from '../../lib/auth';

export const ForgotPasswordPage: React.FC = () => {
  const { language, t } = useTranslation();
  const isNl = language === 'NL';

  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const emailErr =
    touched && !email
      ? t('auth.errEmailReq', isNl ? 'E-mailadres is verplicht' : 'Email is required')
      : touched && !emailRegex.test(email)
      ? t('auth.errEmailInvalid', isNl ? 'Voer een geldig e-mailadres in' : 'Please enter a valid email address')
      : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);

    if (!email || !emailRegex.test(email)) return;

    setLoading(true);
    try {
      const res = await forgotPasswordApi(email);
      setSubmitted(true);
      toast.success(
        res.message || t('auth.msgResetLinkSent', isNl ? 'Instructies voor wachtwoordherstel zijn naar uw e-mail verzonden' : 'Password reset instructions sent to your email')
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t('auth.errSendReset', isNl ? 'Kan herstellink niet verzenden' : 'Failed to send reset link');
      toast.error(message);
    } finally {
      setLoading(false);
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
                {submitted
                  ? t('auth.checkEmailTitle', isNl ? 'Controleer uw e-mail' : 'Check your email')
                  : t('auth.forgotTitle', isNl ? 'Wachtwoord vergeten?' : 'Forgot password?')}
              </h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 14, margin: 0 }}>
                {submitted
                  ? t(
                      'auth.checkEmailSub',
                      isNl
                        ? 'We hebben een link voor wachtwoordherstel naar uw e-mailadres gestuurd.'
                        : "We've sent a password reset link to your email address."
                    )
                  : t(
                      'auth.forgotSub',
                      isNl
                        ? 'Voer uw e-mailadres in om instructies voor wachtwoordherstel te ontvangen.'
                        : 'Enter your email address to receive password reset instructions.'
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

          {!submitted ? (
            <form id="forgot-form" onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <TextInput
                id="forgot-email"
                label={t('auth.emailLabel', isNl ? 'E-mailadres' : 'Email address')}
                type="email"
                placeholder={t('auth.emailPlaceholder', 'you@aalterpaint.be')}
                value={email}
                onChange={e => setEmail(e.target.value)}
                onBlur={() => setTouched(true)}
                error={!!emailErr}
                errorMsg={emailErr}
                required
                autoComplete="email"
                iconLeft={<Mail size={15} />}
              />

              <Button
                id="forgot-submit"
                type="submit"
                variant="solid"
                fullWidth
                loading={loading}
                disabled={loading || !email}
                size="lg"
              >
                {t('auth.sendResetLink', isNl ? 'Herstellink verzenden' : 'Send reset link')}
              </Button>

              <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                {t('auth.rememberPassword', isNl ? 'Kent u uw wachtwoord nog?' : 'Remember your password?')}{' '}
                <Link
                  to="/login"
                  style={{
                    color: 'var(--color-accent)',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  {t('auth.signIn', isNl ? 'Inloggen' : 'Sign in')}
                </Link>
              </p>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div
                style={{
                  padding: '20px 24px',
                  borderRadius: 8,
                  background: 'var(--color-warm-white)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'var(--color-accent-soft)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: 'var(--color-accent)',
                  }}
                >
                  <Mail size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--color-navy)', fontSize: 15, marginBottom: 4 }}>
                    {email}
                  </div>
                  <p style={{ margin: 0, fontSize: 13.5, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                    {t(
                      'auth.checkEmailInstructions',
                      isNl
                        ? 'Instructies voor wachtwoordherstel zijn naar dit adres verzonden.'
                        : 'Password reset instructions have been sent to this address.'
                    )}
                  </p>
                </div>
              </div>

              <Link to="/reset-password" style={{ textDecoration: 'none' }}>
                <Button variant="solid" fullWidth size="lg">
                  {t('auth.openResetLink', isNl ? 'Doorgaan naar wachtwoord herstellen' : 'Proceed to reset password')}
                </Button>
              </Link>

              <Link to="/login" style={{ textDecoration: 'none' }}>
                <Button
                  variant="ghost"
                  fullWidth
                  size="lg"
                  style={{ border: '1px solid var(--color-border)' }}
                >
                  {t('auth.backToLogin', isNl ? 'Terug naar inloggen' : 'Back to login')}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
