import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button, TextInput, Logo } from '../../components/common';
import { emailRegex } from '../../components/validation/constant';
import { useTranslation } from '../../context/LanguageContext';
import { toast } from 'sonner';

const rules = [
  { label: 'At least 8 characters', labelNl: 'Minimaal 8 tekens', test: (v: string) => v.length >= 8 },
  { label: 'One uppercase letter', labelNl: 'Minstens één hoofdletter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'One number', labelNl: 'Minstens één cijfer', test: (v: string) => /\d/.test(v) },
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
  const strengthColor =
    strength === 1 ? '#E20714' : strength === 2 ? '#D97706' : strength === 3 ? '#1F9D55' : 'var(--color-border)';
  const strengthLabel =
    strength === 1
      ? (isNl ? 'Zwak' : 'Weak')
      : strength === 2
      ? (isNl ? 'Gemiddeld' : 'Fair')
      : strength === 3
      ? (isNl ? 'Sterk' : 'Strong')
      : (isNl ? 'Te zwak' : 'Too weak');

  return (
    <div className="ea-auth-wrap">
      <div className="ea-auth-brand" style={{ position: 'sticky', top: 0, overflow: 'hidden', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'relative', textAlign: 'center', maxWidth: 380, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Logo size="lg" light={true} />

          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15, lineHeight: 1.7, margin: '24px 0 0' }}>
            Slimme AI-assistent voor foutloze orderinvoer, artikelverificatie en uitzonderingsbeheer.
          </p>

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
                {/* Theme-based Password Strength meter */}
                {form.password && (
                  <div style={{ marginTop: 8 }}>
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
                        const passed = r.test(form.password);
                        return (
                          <span
                            key={r.label}
                            style={{
                              fontSize: 11.5,
                              fontWeight: 500,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              color: passed ? '#1F9D55' : '#64748B',
                              transition: 'color 0.2s ease',
                            }}
                          >
                            <CheckCircle2
                              size={12}
                              style={{
                                color: passed ? '#1F9D55' : '#CBD5E1',
                                transition: 'color 0.2s ease',
                              }}
                            />
                            {isNl ? r.labelNl : r.label}
                          </span>
                        );
                      })}
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
