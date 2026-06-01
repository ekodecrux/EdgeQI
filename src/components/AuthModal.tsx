import React, { useState } from 'react';
import { Lock, Mail, User, Eye, EyeOff, Shield, CheckCircle } from 'lucide-react';

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
      const res = await fetch(endpoint, {
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
    // Auto-create demo account if not exists
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'demo@agenticstack.ai', password: 'Demo@2025', name: 'Demo User', role: 'qa_lead' }),
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('iq_token', data.token);
        localStorage.setItem('iq_user', JSON.stringify(data.user));
        onLogin(data.user, data.token);
        return;
      }
    } catch {}
    // If already exists, log in
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'demo@agenticstack.ai', password: 'Demo@2025' }),
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

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-black text-white tracking-tight">iQStudio</h1>
              <p className="text-xs text-indigo-400 font-medium">Agentic AI Quality Intelligence</p>
            </div>
          </div>
          <p className="text-slate-400 text-sm">
            {mode === 'login' ? 'Sign in to your workspace' : 'Create your account'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-8 shadow-2xl">
          {/* Mode tabs */}
          <div className="flex bg-slate-800 rounded-xl p-1 mb-6">
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === 'login' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === 'register' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    value={name} onChange={e => setName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-500"
                    placeholder="e.g. Jane Smith" required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-500"
                  placeholder="you@company.com" required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl py-2.5 pl-10 pr-10 text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-500"
                  placeholder="••••••••" required minLength={6}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Role</label>
                <select
                  value={role} onChange={e => setRole(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl py-2.5 px-3 text-white text-sm focus:outline-none focus:border-indigo-500"
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

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-60 shadow-lg shadow-indigo-500/20"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : (
                mode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-700" />
            <span className="text-xs text-slate-500">or</span>
            <div className="flex-1 h-px bg-slate-700" />
          </div>

          <button
            onClick={handleDemo}
            disabled={loading}
            className="mt-4 w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 font-medium py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            Continue with Demo Account
          </button>
        </div>

        <p className="text-center text-xs text-slate-600 mt-4">
          Secured with JWT · Data stored in SQLite · No external auth dependencies
        </p>
      </div>
    </div>
  );
}
