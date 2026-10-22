import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button, TextInput, Logo } from '../../components/common';
import { emailRegex } from '../../components/validation/constant';
import { useTranslation } from '../../context/LanguageContext';
import { toast } from 'sonner';

const rules = [
  { label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { label: 'One uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'One number', test: (v: string) => /\d/.test(v) },
];

export const SignupPage: React.FC = () => {
  const { language } = useTranslation();
  const isNl = language === 'NL';
  const { signup, loading, token } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (token) {
      navigate('/home', { replace: true });
    }
  }, [token, navigate]);

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [touched, setTouched] = useState({ name: false, email: false, password: false, confirmPassword: false });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const blur = (k: keyof typeof touched) => () =>
    setTouched(p => ({ ...p, [k]: true }));

  const errors = {
    name: touched.name && !form.name ? 'Full name is required' : '',
    email: touched.email && !form.email ? 'Email is required' : touched.email && !emailRegex.test(form.email) ? 'Please enter a valid email address' : '',
    password: touched.password && form.password.length < 8 ? 'Password must be at least 8 characters' : '',
    confirmPassword: touched.confirmPassword && form.password !== form.confirmPassword ? 'Passwords do not match' : '',
  };

  const isFormValid =
    form.name &&
    emailRegex.test(form.email) &&
    form.password.length >= 8 &&
    form.password === form.confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // mark all touched so errors show immediately
    setTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    if (!isFormValid) return;

    try {
      const res = await signup({
        name: form.name,
        email: form.email,
        password: form.password,
      });

      if (res.success) {
        toast.success(res.message || (isNl ? 'Account succesvol aangemaakt' : 'Account created successfully'));
        navigate('/login');
      } else {
        toast.error(res.message || (isNl ? 'Registratie mislukt' : 'Signup failed'));
      }
    } catch (err: any) {
      toast.error(err?.message || (isNl ? 'Registratie mislukt' : 'Signup failed'));
    }
  };

  const strength = rules.filter(r => r.test(form.password)).length;
  const strengthColors = ['var(--color-error)', 'var(--color-warning)', 'var(--color-success)'];
  const strengthLabels = ['Weak', 'Fair', 'Strong'];

  return (
    <div className="ea-auth-wrap">
      <div className="ea-auth-brand" style={{ position: 'sticky', top: 0, overflow: 'hidden', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'relative', textAlign: 'center', maxWidth: 380, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Logo size="lg" light={true} />

          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15, lineHeight: 1.7, margin: '24px 0 0' }}>
            Slimme AI-assistent voor foutloze orderinvoer, artikelverificatie en uitzonderingsbeheer.
          </p>

          <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'left', width: '100%' }}>
            {[
              'Automatische orderverwerking voor industriële en bouwcoatings',
              'AI-validatie van RAL-kleuren, glansgraden en verpakkingen',
              'Realtime ERP-koppeling, voorraadsynchronisatie en werfleveringen',
            ].map(f => (
              <div key={f} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <CheckCircle2 size={14} style={{ color: 'var(--color-accent-soft)' }} />
                </div>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="ea-auth-panel">
        <div className="ea-auth-card">
          <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 700, color: 'var(--color-navy)', margin: '0 0 8px' }}>
                Create your account
              </h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 14, margin: 0 }}>
                Create access for the Aalterpaint portal
              </p>
            </div>
            <p
              style={{
                fontSize: 14,
                color: 'var(--color-text-muted)',
                margin: 20,
                whiteSpace: 'nowrap',
                textAlign: 'right',
              }}
            >
              Already have an account?{' '}
              <Link
                to="/login"
                style={{
                  color: 'var(--color-navy)',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Sign in
              </Link>
            </p>
          </div>

          <form id="signup-form" onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <TextInput
              id="signup-name"
              label="Full name"
              type="text"
              placeholder="Jan De Smet"
              value={form.name}
              onChange={set('name')}
              onBlur={blur('name')}
              error={!!errors.name}
              errorMsg={errors.name}
              required
              autoComplete="name"
              iconLeft={<User size={15} />}
            />

            <TextInput
              id="signup-email"
              label="Email address"
              type="email"
              placeholder="you@aalterpaint.be"
              value={form.email}
              onChange={set('email')}
              onBlur={blur('email')}
              error={!!errors.email}
              errorMsg={errors.email}
              required
              autoComplete="email"
              iconLeft={<Mail size={15} />}
            />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16,
                alignItems: 'start',
              }}
            >
              <div>
                <TextInput
                  id="signup-password"
                  label="Password"
                  type="password"
                  placeholder="Create a strong password"
                  value={form.password}
                  onChange={set('password')}
                  onBlur={blur('password')}
                  error={!!errors.password}
                  errorMsg={errors.password}
                  required
                  autoComplete="new-password"
                  iconLeft={<Lock size={15} />}
                />
                {/* Strength meter */}
                {form.password && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{
                          flex: 1, height: 3, borderRadius: 99,
                          background: i < strength ? strengthColors[strength - 1] : 'var(--color-border)',
                          transition: 'background 0.3s',
                        }} />
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: strengthColors[strength - 1] ?? 'var(--color-text-muted)' }}>
                      {form.password ? (strengthLabels[strength - 1] ?? 'Too weak') : ''}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginTop: 6 }}>
                      {rules.map(r => (
                        <span key={r.label} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, color: r.test(form.password) ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                          <CheckCircle2 size={11} /> {r.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <TextInput
                id="signup-confirm-password"
                label="Confirm password"
                type="password"
                placeholder="Repeat your password"
                value={form.confirmPassword}
                onChange={set('confirmPassword')}
                onBlur={blur('confirmPassword')}
                error={!!errors.confirmPassword}
                errorMsg={errors.confirmPassword}
                required
                autoComplete="new-password"
                iconLeft={<Lock size={15} />}
              />
            </div>

            <div style={{ gridColumn: '1 / -1', marginTop: 20 }}>
              <Button
                id="signup-submit"
                type="submit"
                variant="solid"
                fullWidth
                loading={loading}
                disabled={!isFormValid || loading}
                size="lg"
              >
                Create account
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
