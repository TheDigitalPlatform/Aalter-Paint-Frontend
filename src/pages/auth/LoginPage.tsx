import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button, TextInput, Logo } from '../../components/common';
import { emailRegex } from '../../components/validation/constant';
import { useTranslation } from '../../context/LanguageContext';
import { toast } from 'sonner';

export const LoginPage: React.FC = () => {
  const { login, loading, token } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (token) {
      navigate('/home', { replace: true });
    }
  }, [token, navigate]);

  const [form, setForm] = useState({ email: '', password: '' });
  const [touched, setTouched] = useState({ email: false, password: false });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(p => ({ ...p, [k]: e.target.value }));
  };

  const { language, t } = useTranslation();
  const isNl = language === 'NL';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await login({
        email: form.email,
        password: form.password,
      });

      if (res.success && res.token) {
        toast.success(res.message || t('auth.loginSuccess', isNl ? 'Succesvol ingelogd' : 'Login successful'));
        navigate('/home');
      } else {
        toast.error(res.message || t('auth.loginFailed', isNl ? 'Inloggen mislukt' : 'Login failed'));
      }
    } catch (err: any) {
      toast.error(err?.message || t('auth.loginFailed', isNl ? 'Inloggen mislukt' : 'Login failed'));
    }
  };

  const emailErr = touched.email && !form.email
    ? t('auth.errEmailReq', isNl ? 'E-mailadres is verplicht' : 'Email is required')
    : touched.email && !emailRegex.test(form.email)
    ? t('auth.errEmailInvalid', isNl ? 'Voer een geldig e-mailadres in' : 'Please enter a valid email address')
    : '';
  const passwordErr = touched.password && !form.password
    ? t('auth.errPwdReq', isNl ? 'Wachtwoord is verplicht' : 'Password is required')
    : '';

  return (
    <div className="ea-auth-wrap">
      <div className="ea-auth-brand" style={{ position: 'sticky', top: 0, overflow: 'hidden', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'relative', textAlign: 'center', maxWidth: 380, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Logo size="lg" light={true} />

          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15, lineHeight: 1.7, margin: '24px 0 0' }}>
            {t('auth.loginBrandSubtitle', isNl ? 'Slimme AI-assistent voor geautomatiseerde orderverwerking, artikelverificatie en foutloze ERP-integratie.' : 'Smart AI assistant for automated order processing, article verification, and ERP integration.')}
          </p>

        </div>
      </div>

      <div className="ea-auth-panel">
        <div className="ea-auth-card">
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 700, color: 'var(--color-navy)', margin: '0 0 8px' }}>
              {t('auth.loginTitle', isNl ? 'Welkom terug' : 'Welcome back')}
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14, margin: 0 }}>
              {t('auth.loginSubtitle', isNl ? 'Meld u aan bij uw Aalterpaint-account' : 'Sign in to your Aalterpaint account')}
            </p>
          </div>

          <form id="login-form" onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <TextInput
              id="login-email"
              label={t('auth.emailLabel', isNl ? 'E-mailadres' : 'Email address')}
              type="email"
              placeholder={t('auth.emailPlaceholder', 'you@aalterpaint.be')}
              value={form.email}
              onChange={set('email')}
              onBlur={() => setTouched(t => ({ ...t, email: true }))}
              error={!!emailErr}
              errorMsg={emailErr}
              required
              autoComplete="email"
              iconLeft={<Mail size={15} />}
            />

            <TextInput
              id="login-password"
              label={t('auth.passwordLabel', isNl ? 'Wachtwoord' : 'Password')}
              type="password"
              placeholder={t('auth.passwordPlaceholder', isNl ? 'Voer uw wachtwoord in' : 'Enter your password')}
              value={form.password}
              onChange={set('password')}
              onBlur={() => setTouched(t => ({ ...t, password: true }))}
              error={!!passwordErr}
              errorMsg={passwordErr}
              required
              autoComplete="current-password"
              iconLeft={<Lock size={15} />}
            />

            {/* Forgot password link */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -8 }}>
              <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                {t('auth.forgotPrompt', isNl ? 'Wachtwoord vergeten?' : 'Forgot your password?')}{' '}
                <Link
                  to="/forgot-password"
                  style={{
                    color: 'var(--color-accent)',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  {t('auth.resetAction', isNl ? 'Herstellen' : 'Reset')}
                </Link>
              </span>
            </div>

            <Button
              id="login-submit"
              type="submit"
              variant="solid"
              fullWidth
              loading={loading}
              disabled={loading || !form.email || !form.password}
              size="lg"
            >
              {t('auth.signIn', isNl ? 'Inloggen' : 'Sign in')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
