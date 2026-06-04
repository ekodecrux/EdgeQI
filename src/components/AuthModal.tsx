import React, { useState } from 'react';
import { Lock, Mail, User, Eye, EyeOff, Shield, CheckCircle, Zap } from 'lucide-react';
import { apiUrl } from '@/src/config/api';

interface AuthModalProps {
  onLogin: (user: { id: number; email: string; name: string; role: string }, token: string) => void;
}

export default function AuthModal({ onLogin }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('qa_engineer');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = mode === 'login'
        ? { email, password }
        : { email, password, name, role };
      const res = await fetch(apiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');
      localStorage.setItem('iq_token', data.token);
      localStorage.setItem('iq_user', JSON.stringify(data.user));
      onLogin(data.user, data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'demo@edgeqi.ai', password: 'demo123', name: 'Demo User', role: 'qa_lead' }),
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('iq_token', data.token);
        localStorage.setItem('iq_user', JSON.stringify(data.user));
        onLogin(data.user, data.token);
        return;
      }
    } catch {}
    try {
      const res = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'demo@edgeqi.ai', password: 'demo123' }),
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('iq_token', data.token);
        localStorage.setItem('iq_user', JSON.stringify(data.user));
        onLogin(data.user, data.token);
      }
    } catch (err: any) {
      setError('Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: 10,
    padding: '10px 12px 10px 38px',
    color: '#E2E8F0',
    fontSize: 14,
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    boxSizing: 'border-box' as const,
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(10,14,26,0.96)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
      fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* ── Logo / Header ──────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'linear-gradient(135deg, #5B6CFF 0%, #7C3AED 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(91,108,255,0.40)',
            }}>
              <Zap style={{ width: 24, height: 24, color: '#fff' }} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <h1 style={{
                fontSize: 22, fontWeight: 900, color: '#FFFFFF',
                letterSpacing: '0.16em', margin: 0, lineHeight: 1,
              }}>
                EDGE<span style={{ color: '#818CF8' }}> QI</span>
              </h1>
              <p style={{
                fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
                color: '#64748B', letterSpacing: '0.12em',
                textTransform: 'uppercase', marginTop: 3,
              }}>
                Edge Quality Intelligence
              </p>
            </div>
          </div>
          <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
            {mode === 'login' ? 'Sign in to your workspace' : 'Create your account'}
          </p>
        </div>

        {/* ── Card ───────────────────────────────────────────────────── */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20,
          padding: 28,
          boxShadow: '0 24px 64px rgba(0,0,0,0.50)',
          backdropFilter: 'blur(20px)',
        }}>

          {/* Mode toggle */}
          <div style={{
            display: 'flex',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 12, padding: 4, marginBottom: 24,
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            {(['login', 'register'] as const).map(m => (
              <button key={m}
                onClick={() => { setMode(m); setError(''); }}
                style={{
                  flex: 1, padding: '8px 0',
                  borderRadius: 9, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600,
                  fontFamily: 'Inter, sans-serif',
                  transition: 'all 0.18s ease',
                  background: mode === m
                    ? 'linear-gradient(135deg, #5B6CFF 0%, #7C3AED 100%)'
                    : 'transparent',
                  color: mode === m ? '#FFFFFF' : '#64748B',
                  boxShadow: mode === m ? '0 4px 12px rgba(91,108,255,0.30)' : 'none',
                }}>
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Full Name (register only) */}
            {mode === 'register' && (
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 6, letterSpacing: '0.04em' }}>
                  FULL NAME
                </label>
                <div style={{ position: 'relative' }}>
                  <User style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#475569' }} />
                  <input
                    value={name} onChange={e => setName(e.target.value)}
                    style={inputClass} placeholder="e.g. Jane Smith" required
                    onFocus={e => { e.currentTarget.style.borderColor = '#5B6CFF'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(91,108,255,0.14)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 6, letterSpacing: '0.04em' }}>
                EMAIL
              </label>
              <div style={{ position: 'relative' }}>
                <Mail style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#475569' }} />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  style={inputClass} placeholder="you@company.com" required
                  onFocus={e => { e.currentTarget.style.borderColor = '#5B6CFF'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(91,108,255,0.14)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 6, letterSpacing: '0.04em' }}>
                PASSWORD
              </label>
              <div style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#475569' }} />
                <input
                  type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  style={{ ...inputClass, paddingRight: 42 }} placeholder="••••••••" required minLength={6}
                  onFocus={e => { e.currentTarget.style.borderColor = '#5B6CFF'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(91,108,255,0.14)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 0 }}>
                  {showPw ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                </button>
              </div>
            </div>

            {/* Role (register only) */}
            {mode === 'register' && (
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 6, letterSpacing: '0.04em' }}>
                  ROLE
                </label>
                <select
                  value={role} onChange={e => setRole(e.target.value)}
                  style={{ ...inputClass, paddingLeft: 12, cursor: 'pointer' }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#5B6CFF'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(91,108,255,0.14)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <option value="qa_engineer">QA Engineer</option>
                  <option value="qa_lead">QA Lead / Test Manager</option>
                  <option value="sdet">SDET / Automation Engineer</option>
                  <option value="director">QA Director / VP</option>
                  <option value="devops">DevOps Engineer</option>
                  <option value="developer">Developer</option>
                </select>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 10, padding: '10px 14px', color: '#FCA5A5', fontSize: 13,
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit" disabled={loading}
              style={{
                width: '100%',
                background: loading ? 'rgba(91,108,255,0.5)' : 'linear-gradient(135deg, #5B6CFF 0%, #7C3AED 100%)',
                color: '#FFFFFF', border: 'none', borderRadius: 12,
                padding: '12px 0', fontSize: 14, fontWeight: 700,
                fontFamily: 'Inter, sans-serif',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 6px 20px rgba(91,108,255,0.38)',
                transition: 'all 0.18s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(91,108,255,0.48)'; } }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = loading ? 'none' : '0 6px 20px rgba(91,108,255,0.38)'; }}
            >
              {loading ? (
                <>
                  <span style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                  {mode === 'login' ? 'Signing in…' : 'Creating account…'}
                </>
              ) : (
                mode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
            <span style={{ fontSize: 11, color: '#475569' }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          </div>

          {/* Demo account */}
          <button
            onClick={handleDemo} disabled={loading}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12, padding: '11px 0',
              color: '#94A3B8', fontSize: 13, fontWeight: 500,
              fontFamily: 'Inter, sans-serif',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.18s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#CBD5E1'; } }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#94A3B8'; }}
          >
            <CheckCircle style={{ width: 15, height: 15, color: '#10B981' }} />
            Continue with Demo Account
          </button>
        </div>

        {/* Footer note */}
        <p style={{ textAlign: 'center', fontSize: 11, color: '#334155', marginTop: 16, fontFamily: 'JetBrains Mono, monospace' }}>
          JWT secured · SQLite · No external auth
        </p>
      </div>
    </div>
  );
}
