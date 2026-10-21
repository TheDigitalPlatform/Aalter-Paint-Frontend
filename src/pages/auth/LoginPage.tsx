import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button, TextInput, Logo } from '../../components/common';
import { emailRegex } from '../../components/validation/constant';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await login({
        email: form.email,
        password: form.password,
      });

      if (res.success && res.token) {
        toast.success(res.message || 'Login successful');
        navigate('/home');
      } else {
        toast.error(res.message || 'Login failed');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Login failed');
    }
  };

  const emailErr = touched.email && !form.email ? 'Email is required' : touched.email && !emailRegex.test(form.email) ? 'Please enter a valid email address' : '';
  const passwordErr = touched.password && !form.password ? 'Password is required' : '';

  return (
    <div className="ea-auth-wrap">
      <div className="ea-auth-brand">
        <div style={{ position: 'relative', textAlign: 'center', maxWidth: 400, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Logo size="lg" light={true} />

          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, lineHeight: 1.7, margin: '24px 0 0' }}>
            Slimme AI-assistent voor geautomatiseerde orderverwerking, artikelverificatie en foutloze ERP-integratie.
          </p>
        </div>
      </div>

      <div className="ea-auth-panel">
        <div className="ea-auth-card">
          <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 700, color: 'var(--color-navy)', margin: '0 0 8px' }}>
                Welcome back
              </h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 14, margin: 0 }}>
                Sign in to your Aalterpaint account
              </p>
            </div>
            <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--color-text-muted)', margin: 0 }}>
              Don't have an account?{' '}
              <Link to="/signup" style={{ color: 'var(--color-navy)', fontWeight: 600 }}>
                Create account
              </Link>
            </p>
          </div>

          <form id="login-form" onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <TextInput
              id="login-email"
              label="Email address"
              type="email"
              placeholder="you@aalterpaint.be"
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
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={set('password')}
              onBlur={() => setTouched(t => ({ ...t, password: true }))}
              error={!!passwordErr}
              errorMsg={passwordErr}
              required
              autoComplete="current-password"
              iconLeft={<Lock size={15} />}
            />

            <Button
              id="login-submit"
              type="submit"
              variant="solid"
              fullWidth
              loading={loading}
              disabled={loading || !form.email || !form.password}
              size="lg"
            >
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
