import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, Shield, Activity, TrendingUp, Settings, LogOut, Plus,
  UserCheck, UserX, Mail, Lock, Unlock, Edit2, Trash2, RefreshCw,
  CheckCircle, XCircle, AlertTriangle, Clock, Zap, BarChart2,
  CreditCard, FileText, Receipt, LifeBuoy, ChevronRight, X, Save,
  Eye, EyeOff, Copy, ExternalLink, Wifi, WifiOff, Crown, Star,
  ArrowUp, ArrowDown, Minus, Package, Globe, Key, Monitor, Building2, Send
} from 'lucide-react';

const API = (window as any).__API_BASE__ || '';

interface TenantUser { id: string; email: string; name: string; role: string; status: string; last_active: string; invite_token?: string; }
interface Session { id: string; name: string; email: string; ip_address: string; user_agent: string; started_at: string; last_seen: string; }
interface UsageMetric { metric_date: string; peak_concurrent: number; total_api_calls: number; ai_tokens_used: number; test_runs: number; }
interface TenantInfo { id: string; name: string; status: string; plan_tier: string; max_users: number; max_concurrent: number; currency: string; billing_email: string; }
interface Subscription { pack_name: string; tier: string; max_users: number; max_concurrent: number; price_usd: number; billing_cycle: string; features: string[]; ends_at: string; }

const ROLES = ['tenant_admin', 'qa_engineer', 'manager', 'viewer'];
const ROLE_COLORS: Record<string, string> = { tenant_admin: 'text-purple-400 bg-purple-900/30', qa_engineer: 'text-teal-600 bg-teal-100', manager: 'text-green-400 bg-green-900/30', viewer: 'text-gray-600 bg-gray-100' };
const STATUS_COLORS: Record<string, string> = { active: 'text-green-400 bg-green-900/30', suspended: 'text-red-400 bg-red-900/30', invited: 'text-yellow-400 bg-yellow-900/30' };

const ROLE_PERMISSIONS: Record<string, string[]> = {
  tenant_admin: ['Manage users', 'Configure SSO', 'View billing', 'All QA modules', 'Manage integrations', 'View audit logs'],
  manager: ['View all projects', 'Assign test cases', 'View reports', 'Manage defects', 'View usage'],
  qa_engineer: ['Create & run tests', 'Generate test data', 'Manage defects', 'View reports', 'Use AI copilot'],
  viewer: ['View test results', 'View reports', 'Read-only access'],
};

export default function TenantAdminPortal({ token, onClose }: { token: string; onClose?: () => void }) {
  const [tab, setTab] = useState<'overview'|'users'|'sessions'|'usage'|'sso'|'billing'|'support'>('overview');
  const [tenantData, setTenantData] = useState<{ tenant: TenantInfo; subscription: Subscription | null; users: TenantUser[]; concurrent: number; invoices: any[]; receipts: any[] } | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [usage, setUsage] = useState<UsageMetric[]>([]);
  const [ssoConfig, setSsoConfig] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' }>({ msg: '', type: 'success' });
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSsoModal, setShowSsoModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', name: '', role: 'qa_engineer' });
  const [ssoForm, setSsoForm] = useState({ protocol: 'oidc', provider: 'azure_ad', client_id: '', client_secret: '', issuer_url: '', saml_metadata_url: '', attribute_mapping: { email: 'email', name: 'displayName' } });
  const [supportForm, setSupportForm] = useState({ category: 'billing', priority: 'medium', subject: '', description: '' });
  const [showSecret, setShowSecret] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [liveRefresh, setLiveRefresh] = useState(true);
  const refreshTimer = useRef<any>(null);

  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => { setToast({ msg, type }); setTimeout(() => setToast({ msg: '', type: 'success' }), 3500); };

  const api = useCallback(async (path: string, opts: any = {}) => {
    const r = await fetch(`${API}${path}`, { headers: h, ...opts });
    return r.json();
  }, [token]);

  const loadTenantData = useCallback(async () => {
    const d = await api('/api/tenant/me');
    setTenantData(d);
  }, [api]);

  const loadSessions = useCallback(async () => {
    const d = await api('/api/tenant/sessions');
    setSessions(Array.isArray(d) ? d : []);
  }, [api]);

  const loadUsage = useCallback(async () => {
    const d = await api('/api/tenant/usage');
    setUsage(Array.isArray(d) ? d : []);
  }, [api]);

  const loadSso = useCallback(async () => {
    const d = await api('/api/tenant/sso');
    setSsoConfig(d);
    if (d) setSsoForm({ protocol: d.protocol, provider: d.provider, client_id: d.client_id, client_secret: d.client_secret, issuer_url: d.issuer_url, saml_metadata_url: d.saml_metadata_url || '', attribute_mapping: JSON.parse(d.attribute_mapping || '{}') });
  }, [api]);

  useEffect(() => {
    loadTenantData();
    loadSessions();
    loadUsage();
    loadSso();
  }, []);

  // Live refresh every 15s
  useEffect(() => {
    if (liveRefresh) {
      refreshTimer.current = setInterval(() => { loadTenantData(); loadSessions(); }, 15000);
    }
    return () => clearInterval(refreshTimer.current);
  }, [liveRefresh]);

  const inviteUser = async () => {
    if (!inviteForm.email || !inviteForm.name) return showToast('Email and name required', 'error');
    setLoading(true);
    const d = await api('/api/tenant/users/invite', { method: 'POST', body: JSON.stringify(inviteForm) });
    if (d.error) { showToast(d.error, 'error'); setLoading(false); return; }
    setInviteLink(d.invite_url || '');
    await loadTenantData();
    showToast(`Invitation created for ${inviteForm.email}`);
    setInviteForm({ email: '', name: '', role: 'qa_engineer' });
    setLoading(false);
  };

  const setUserStatus = async (id: string, status: string) => {
    await api(`/api/tenant/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    await loadTenantData();
    showToast(`User ${status}`);
  };

  const removeUser = async (id: string) => {
    await api(`/api/tenant/users/${id}`, { method: 'DELETE' });
    await loadTenantData();
    showToast('User removed');
  };

  const killSession = async (id: string) => {
    await api(`/api/tenant/sessions/${id}`, { method: 'DELETE' });
    await loadSessions();
    showToast('Session terminated');
  };

  const saveSso = async () => {
    setLoading(true);
    const d = await api('/api/tenant/sso', { method: 'POST', body: JSON.stringify(ssoForm) });
    if (d.error) { showToast(d.error, 'error'); setLoading(false); return; }
    await loadSso();
    setShowSsoModal(false);
    showToast('SSO configuration saved');
    setLoading(false);
  };

  const toggleSso = async (active: boolean) => {
    await api('/api/tenant/sso/toggle', { method: 'PATCH', body: JSON.stringify({ is_active: active }) });
    await loadSso();
    showToast(active ? 'SSO enabled' : 'SSO disabled');
  };

  const submitSupport = async () => {
    if (!supportForm.subject || !supportForm.description) return showToast('Subject and description required', 'error');
    setLoading(true);
    const d = await api('/api/saas/support', { method: 'POST', body: JSON.stringify({ ...supportForm, tenant_id: tenantData?.tenant?.id }) });
    if (d.error) { showToast(d.error, 'error'); setLoading(false); return; }
    setSupportForm({ category: 'billing', priority: 'medium', subject: '', description: '' });
    setShowSupportModal(false);
    showToast('Support ticket submitted — AI response generated');
    setLoading(false);
  };

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString() : '—';
  const fmtTime = (d: string) => d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
  const fmt = (n: number, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);

  const sub = tenantData?.subscription;
  const tenant = tenantData?.tenant;
  const users = tenantData?.users || [];
  const activeUsers = users.filter(u => u.status === 'active').length;
  const concurrentNow = tenantData?.concurrent || 0;
  const seatsUsed = activeUsers;
  const seatsMax = tenant?.max_users || 5;
  const concurrentMax = tenant?.max_concurrent || 2;
  const seatPct = seatsMax > 0 ? (seatsUsed / seatsMax) * 100 : 0;
  const concurrentPct = concurrentMax > 0 ? (concurrentNow / concurrentMax) * 100 : 0;

  // Usage chart data (last 14 days)
  const usageLast14 = usage.slice(0, 14).reverse();
  const maxCalls = Math.max(...usageLast14.map(u => u.total_api_calls), 1);
  const maxConcurrent = Math.max(...usageLast14.map(u => u.peak_concurrent), 1);

  const TABS = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'users', label: 'Users & Access', icon: Users },
    { id: 'sessions', label: 'Live Sessions', icon: Monitor },
    { id: 'usage', label: 'Usage & Trends', icon: TrendingUp },
    { id: 'sso', label: 'SSO', icon: Key },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'support', label: 'Support', icon: LifeBuoy },
  ];

  if (!tenantData) return (
    <div className="min-h-screen bg-gray-50 bg-white flex items-center justify-center">
      <div className="text-center"><RefreshCw size={24} className="animate-spin text-purple-400 mx-auto mb-2" /><p className="text-gray-600 text-sm">Loading organisation data…</p></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 bg-white text-gray-900">
      {/* Toast */}
      {toast.msg && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-sm flex items-center gap-2 ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast.type === 'error' ? <XCircle size={14} /> : <CheckCircle size={14} />}{toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
          <Building2 size={16} />
        </div>
        <div>
          <h1 className="text-base font-bold">{tenant?.name || 'Organisation Admin'}</h1>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${tenant?.status === 'active' ? 'text-green-400 bg-green-900/30' : 'text-yellow-400 bg-yellow-900/30'}`}>{tenant?.status}</span>
            {sub && <span className="text-xs text-gray-600">{sub.pack_name} · {sub.max_users} seats · {sub.max_concurrent} concurrent</span>}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {/* Live indicator */}
          <button onClick={() => setLiveRefresh(!liveRefresh)} className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border ${liveRefresh ? 'border-green-600 text-green-400 bg-green-900/20' : 'border-gray-200 text-gray-600'}`}>
            {liveRefresh ? <><span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />Live</> : <><WifiOff size={11} />Paused</>}
          </button>
          <button onClick={() => { loadTenantData(); loadSessions(); }} className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg"><RefreshCw size={14} /></button>
          {onClose && <button onClick={onClose} className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg"><X size={14} /></button>}
        </div>
      </div>

      {/* Tab nav */}
      <div className="bg-white border-b border-gray-200 px-6 flex gap-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t.id ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>
            <t.icon size={13} />{t.label}
            {t.id === 'sessions' && concurrentNow > 0 && <span className="bg-teal-600 text-gray-900 text-xs px-1.5 py-0.5 rounded-full">{concurrentNow}</span>}
          </button>
        ))}
      </div>

      <div className="p-6 max-w-6xl mx-auto">

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <div className="space-y-5">
            {/* KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Seats Used', value: `${seatsUsed}/${seatsMax}`, pct: seatPct, color: seatPct > 90 ? 'bg-red-500' : seatPct > 70 ? 'bg-yellow-500' : 'bg-green-500', icon: Users, sub: `${seatsMax - seatsUsed} remaining` },
                { label: 'Concurrent Now', value: `${concurrentNow}/${concurrentMax}`, pct: concurrentPct, color: concurrentPct > 90 ? 'bg-red-500' : concurrentPct > 70 ? 'bg-yellow-500' : 'bg-blue-500', icon: Activity, sub: 'active right now' },
                { label: 'API Calls Today', value: usage[0]?.total_api_calls || 0, pct: 0, color: 'bg-purple-500', icon: Zap, sub: `Peak: ${usage[0]?.peak_concurrent || 0} concurrent` },
                { label: 'Test Runs Today', value: usage[0]?.test_runs || 0, pct: 0, color: 'bg-orange-500', icon: CheckCircle, sub: `AI tokens: ${(usage[0]?.ai_tokens_used || 0).toLocaleString()}` },
              ].map(card => (
                <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-600">{card.label}</span>
                    <card.icon size={14} className="text-gray-600" />
                  </div>
                  <div className="text-xl font-bold mb-1">{card.value}</div>
                  {card.pct > 0 && <div className="h-1.5 bg-gray-100 rounded-full mb-1"><div className={`h-1.5 ${card.color} rounded-full transition-all`} style={{ width: `${Math.min(100, card.pct)}%` }} /></div>}
                  <div className="text-xs text-gray-600">{card.sub}</div>
                </div>
              ))}
            </div>

            {/* License info */}
            {sub && (
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2"><Package size={15} className="text-purple-400" />Current License</h3>
                  <span className="text-xs text-gray-600">Expires {fmtDate(sub.ends_at)}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {[
                    { label: 'Plan', value: sub.pack_name },
                    { label: 'Billing', value: `${fmt(sub.price_usd)}/${sub.billing_cycle === 'annual' ? 'yr' : 'mo'}` },
                    { label: 'Max Users', value: sub.max_users },
                    { label: 'Max Concurrent', value: sub.max_concurrent },
                  ].map(f => (
                    <div key={f.label} className="bg-gray-100 rounded-lg p-3">
                      <div className="text-xs text-gray-600 mb-1">{f.label}</div>
                      <div className="font-semibold text-sm">{f.value}</div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(sub.features || []).map(f => <span key={f} className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full flex items-center gap-1"><CheckCircle size={9} />{f}</span>)}
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Invite User', icon: Plus, action: () => setShowInviteModal(true), color: 'from-blue-600 to-blue-800' },
                { label: 'View Sessions', icon: Monitor, action: () => setTab('sessions'), color: 'from-green-600 to-green-800' },
                { label: 'Configure SSO', icon: Key, action: () => setTab('sso'), color: 'from-purple-600 to-purple-800' },
                { label: 'Raise Support', icon: LifeBuoy, action: () => setShowSupportModal(true), color: 'from-orange-600 to-orange-800' },
              ].map(a => (
                <button key={a.label} onClick={a.action} className={`bg-gradient-to-br ${a.color} rounded-xl p-4 text-left hover:opacity-90 transition-opacity`}>
                  <a.icon size={18} className="mb-2" />
                  <div className="text-sm font-medium">{a.label}</div>
                </button>
              ))}
            </div>

            {/* Mini usage sparkline */}
            {usageLast14.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2"><TrendingUp size={14} className="text-green-400" />API Calls — Last 14 Days</h3>
                  <button onClick={() => setTab('usage')} className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1">Full report <ChevronRight size={11} /></button>
                </div>
                <div className="flex items-end gap-1 h-16">
                  {usageLast14.map(u => {
                    const pct = maxCalls > 0 ? (u.total_api_calls / maxCalls) * 100 : 0;
                    return (
                      <div key={u.metric_date} className="flex-1 flex flex-col items-center gap-0.5" title={`${u.metric_date}: ${u.total_api_calls} calls`}>
                        <div className="w-full bg-blue-500 rounded-t opacity-80 hover:opacity-100 transition-opacity" style={{ height: `${Math.max(4, pct)}%` }} />
                        <div className="text-xs text-gray-600 hidden md:block" style={{ fontSize: 9 }}>{u.metric_date.slice(8)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── USERS & ACCESS ── */}
        {tab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Users & Access Control</h2>
                <p className="text-xs text-gray-600 mt-0.5">{seatsUsed} of {seatsMax} seats used</p>
              </div>
              <button onClick={() => setShowInviteModal(true)} disabled={seatsUsed >= seatsMax} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg text-sm">
                <Plus size={14} />Invite User
              </button>
            </div>

            {/* Seat usage bar */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex justify-between text-xs text-gray-600 mb-2">
                <span>Seat Usage</span><span>{seatsUsed}/{seatsMax} used</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full">
                <div className={`h-2 rounded-full transition-all ${seatPct > 90 ? 'bg-red-500' : seatPct > 70 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, seatPct)}%` }} />
              </div>
              {seatPct > 80 && <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1"><AlertTriangle size={10} />Approaching seat limit. Contact your admin to upgrade.</p>}
            </div>

            {/* Role permissions reference */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {ROLES.map(role => (
                <div key={role} className="bg-white border border-gray-200 rounded-xl p-3">
                  <div className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block mb-2 ${ROLE_COLORS[role]}`}>{role.replace('_', ' ')}</div>
                  <ul className="space-y-1">
                    {ROLE_PERMISSIONS[role].map(p => <li key={p} className="text-xs text-gray-600 flex items-start gap-1"><CheckCircle size={9} className="text-green-400 mt-0.5 shrink-0" />{p}</li>)}
                  </ul>
                </div>
              ))}
            </div>

            {/* User table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 text-gray-600 text-xs">
                  <tr>{['User','Role','Status','Last Active','Actions'].map(h => <th key={h} className="text-left px-4 py-3">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-t border-gray-200 hover:bg-gray-100/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-xs font-bold">{u.name.charAt(0).toUpperCase()}</div>
                          <div>
                            <div className="font-medium">{u.name}</div>
                            <div className="text-xs text-gray-600">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role] || 'text-gray-600 bg-gray-100'}`}>{u.role.replace('_', ' ')}</span></td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[u.status] || 'text-gray-600'}`}>{u.status}</span></td>
                      <td className="px-4 py-3 text-xs text-gray-600">{u.last_active ? fmtDate(u.last_active) : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {u.status === 'active' ? (
                            <button onClick={() => setUserStatus(u.id, 'suspended')} className="p-1.5 bg-yellow-900/30 hover:bg-yellow-900/50 text-yellow-400 rounded text-xs" title="Suspend"><Lock size={11} /></button>
                          ) : u.status === 'suspended' ? (
                            <button onClick={() => setUserStatus(u.id, 'active')} className="p-1.5 bg-green-900/30 hover:bg-green-900/50 text-green-400 rounded text-xs" title="Activate"><Unlock size={11} /></button>
                          ) : null}
                          {u.invite_token && (
                            <button onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/accept-invite?token=${u.invite_token}`); showToast('Invite link copied!'); }} className="p-1.5 bg-teal-100 hover:bg-blue-900/50 text-teal-600 rounded text-xs" title="Copy invite link"><Copy size={11} /></button>
                          )}
                          <button onClick={() => removeUser(u.id)} className="p-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded text-xs" title="Remove"><Trash2 size={11} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-600">No users yet. Invite your first team member.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── LIVE SESSIONS ── */}
        {tab === 'sessions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Live Sessions</h2>
                <p className="text-xs text-gray-600">{concurrentNow} of {concurrentMax} concurrent slots in use · Auto-refreshes every 15s</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg ${concurrentNow >= concurrentMax ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${concurrentNow >= concurrentMax ? 'bg-red-400' : 'bg-green-400 animate-pulse'}`} />
                  {concurrentNow >= concurrentMax ? 'At capacity' : 'Available'}
                </span>
              </div>
            </div>

            {/* Concurrent gauge */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex justify-between text-xs text-gray-600 mb-2">
                <span>Concurrent Usage</span><span>{concurrentNow}/{concurrentMax}</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full">
                <div className={`h-3 rounded-full transition-all ${concurrentPct >= 100 ? 'bg-red-500' : concurrentPct > 70 ? 'bg-yellow-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, concurrentPct)}%` }} />
              </div>
              {concurrentPct >= 100 && <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertTriangle size={10} />Concurrent limit reached. New users will be blocked until a session expires.</p>}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 text-gray-600 text-xs">
                  <tr>{['User','IP Address','Browser / Device','Started','Last Seen','Action'].map(h => <th key={h} className="text-left px-4 py-3">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {sessions.map(s => (
                    <tr key={s.id} className="border-t border-gray-200 hover:bg-gray-100/50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm">{s.name}</div>
                        <div className="text-xs text-gray-600">{s.email}</div>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-600">{s.ip_address || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate">{s.user_agent ? s.user_agent.split(' ').slice(-2).join(' ') : '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{fmtTime(s.started_at)}</td>
                      <td className="px-4 py-3 text-xs text-green-400 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />{fmtTime(s.last_seen)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => killSession(s.id)} className="flex items-center gap-1 bg-red-900/30 hover:bg-red-900/50 text-red-400 px-2 py-1 rounded text-xs"><LogOut size={10} />End</button>
                      </td>
                    </tr>
                  ))}
                  {sessions.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-600">No active sessions</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── USAGE & TRENDS ── */}
        {tab === 'usage' && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold">Usage & Trends</h2>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total API Calls (30d)', value: usage.slice(0,30).reduce((s,u) => s+u.total_api_calls, 0).toLocaleString(), icon: Zap, color: 'text-teal-600' },
                { label: 'Peak Concurrent (30d)', value: Math.max(...usage.slice(0,30).map(u => u.peak_concurrent), 0), icon: Activity, color: 'text-green-400' },
                { label: 'Test Runs (30d)', value: usage.slice(0,30).reduce((s,u) => s+u.test_runs, 0).toLocaleString(), icon: CheckCircle, color: 'text-purple-400' },
                { label: 'AI Tokens (30d)', value: usage.slice(0,30).reduce((s,u) => s+u.ai_tokens_used, 0).toLocaleString(), icon: Star, color: 'text-yellow-400' },
              ].map(c => (
                <div key={c.label} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2"><c.icon size={14} className={c.color} /><span className="text-xs text-gray-600">{c.label}</span></div>
                  <div className="text-xl font-bold">{c.value}</div>
                </div>
              ))}
            </div>

            {/* API Calls chart */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><BarChart2 size={14} className="text-teal-600" />Daily API Calls (Last 30 Days)</h3>
              <div className="flex items-end gap-1 h-32">
                {usage.slice(0,30).reverse().map(u => {
                  const max = Math.max(...usage.slice(0,30).map(x => x.total_api_calls), 1);
                  const pct = (u.total_api_calls / max) * 100;
                  return (
                    <div key={u.metric_date} className="flex-1 flex flex-col items-center gap-0.5 group relative" title={`${u.metric_date}: ${u.total_api_calls} calls`}>
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-700 text-xs px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">{u.total_api_calls}</div>
                      <div className="w-full bg-blue-500 rounded-t hover:bg-blue-400 transition-colors" style={{ height: `${Math.max(2, pct)}%` }} />
                      <div className="text-gray-600 hidden md:block" style={{ fontSize: 8 }}>{u.metric_date.slice(8)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Concurrent chart */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Activity size={14} className="text-green-400" />Peak Concurrent Users vs Limit</h3>
              <div className="flex items-end gap-1 h-24">
                {usage.slice(0,30).reverse().map(u => {
                  const pct = concurrentMax > 0 ? (u.peak_concurrent / concurrentMax) * 100 : 0;
                  return (
                    <div key={u.metric_date} className="flex-1 flex flex-col items-center gap-0.5 group relative" title={`${u.metric_date}: ${u.peak_concurrent} peak`}>
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-700 text-xs px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">{u.peak_concurrent}</div>
                      <div className={`w-full rounded-t transition-colors ${pct >= 100 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ height: `${Math.max(2, pct)}%` }} />
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs">
                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-green-500 rounded" />Normal (&lt;70%)</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-yellow-500 rounded" />High (70-99%)</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-red-500 rounded" />At limit (100%)</span>
              </div>
            </div>

            {/* Usage table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 text-gray-600 text-xs">
                  <tr>{['Date','API Calls','Peak Concurrent','Test Runs','AI Tokens'].map(h => <th key={h} className="text-left px-4 py-3">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {usage.slice(0, 30).map(u => (
                    <tr key={u.metric_date} className="border-t border-gray-200 hover:bg-gray-100/50 text-sm">
                      <td className="px-4 py-2 font-mono text-xs">{u.metric_date}</td>
                      <td className="px-4 py-2">{u.total_api_calls.toLocaleString()}</td>
                      <td className="px-4 py-2"><span className={u.peak_concurrent >= concurrentMax ? 'text-red-400' : 'text-gray-300'}>{u.peak_concurrent}</span></td>
                      <td className="px-4 py-2">{u.test_runs}</td>
                      <td className="px-4 py-2 text-gray-600">{u.ai_tokens_used.toLocaleString()}</td>
                    </tr>
                  ))}
                  {usage.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-600">No usage data yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── SSO ── */}
        {tab === 'sso' && (
          <div className="space-y-4 max-w-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Single Sign-On (SSO)</h2>
                <p className="text-xs text-gray-600 mt-0.5">Connect your organisation's identity provider for seamless login</p>
              </div>
              <button onClick={() => setShowSsoModal(true)} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm"><Settings size={14} />{ssoConfig ? 'Edit Config' : 'Configure SSO'}</button>
            </div>

            {ssoConfig ? (
              <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ssoConfig.is_active ? 'bg-green-900/30' : 'bg-gray-100'}`}>
                      <Key size={18} className={ssoConfig.is_active ? 'text-green-400' : 'text-gray-600'} />
                    </div>
                    <div>
                      <div className="font-semibold">{ssoConfig.provider?.replace('_', ' ').toUpperCase()}</div>
                      <div className="text-xs text-gray-600">{ssoConfig.protocol?.toUpperCase()} · {ssoConfig.is_active ? 'Active' : 'Inactive'}</div>
                    </div>
                  </div>
                  <button onClick={() => toggleSso(!ssoConfig.is_active)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${ssoConfig.is_active ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-green-900/30 text-green-400 hover:bg-green-900/50'}`}>
                    {ssoConfig.is_active ? <><Lock size={12} />Disable</> : <><Unlock size={12} />Enable</>}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-100 rounded-lg p-3"><div className="text-xs text-gray-600 mb-1">Client ID</div><div className="font-mono text-xs truncate">{ssoConfig.client_id || '—'}</div></div>
                  <div className="bg-gray-100 rounded-lg p-3"><div className="text-xs text-gray-600 mb-1">Issuer URL</div><div className="font-mono text-xs truncate">{ssoConfig.issuer_url || '—'}</div></div>
                </div>
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                  <div className="text-xs text-teal-600 font-medium mb-1">Callback URL (configure in your IdP)</div>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-gray-300 flex-1 truncate">{ssoConfig.callback_url}</code>
                    <button onClick={() => { navigator.clipboard?.writeText(ssoConfig.callback_url); showToast('Copied!'); }} className="p-1 hover:bg-teal-100 rounded"><Copy size={12} className="text-teal-600" /></button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-dashed border-gray-200 rounded-xl p-8 text-center">
                <Key size={32} className="mx-auto mb-3 text-gray-600" />
                <p className="text-gray-600 text-sm mb-1">No SSO configured</p>
                <p className="text-gray-600 text-xs">Connect Azure AD, Okta, Google Workspace, Ping Identity, or any SAML/OIDC provider</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              {[
                { name: 'Azure AD', logo: '🔷', protocol: 'OIDC' },
                { name: 'Okta', logo: '🔵', protocol: 'OIDC/SAML' },
                { name: 'Google Workspace', logo: '🔴', protocol: 'OIDC' },
                { name: 'Ping Identity', logo: '🟣', protocol: 'SAML' },
                { name: 'OneLogin', logo: '🟢', protocol: 'SAML' },
                { name: 'Custom SAML', logo: '⚙️', protocol: 'SAML' },
              ].map(p => (
                <div key={p.name} className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                  <div className="text-2xl mb-1">{p.logo}</div>
                  <div className="text-xs font-medium">{p.name}</div>
                  <div className="text-xs text-gray-600">{p.protocol}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── BILLING ── */}
        {tab === 'billing' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Billing & Receipts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><FileText size={14} className="text-teal-600" />Invoices</h3>
                <div className="space-y-2">
                  {(tenantData?.invoices || []).map((inv: any) => (
                    <div key={inv.id} className="bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <div className="font-mono text-xs text-gray-600">{inv.invoice_number}</div>
                        <div className="font-semibold text-sm">{new Intl.NumberFormat('en-US', { style: 'currency', currency: inv.currency }).format(inv.total)}</div>
                        <div className="text-xs text-gray-600">{fmtDate(inv.created_at)}</div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${inv.status === 'paid' ? 'text-green-400 bg-green-900/30' : inv.status === 'overdue' ? 'text-red-400 bg-red-900/30' : 'text-yellow-400 bg-yellow-900/30'}`}>{inv.status}</span>
                    </div>
                  ))}
                  {!(tenantData?.invoices?.length) && <p className="text-sm text-gray-600 text-center py-6">No invoices yet</p>}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Receipt size={14} className="text-green-400" />Receipts</h3>
                <div className="space-y-2">
                  {(tenantData?.receipts || []).map((r: any) => (
                    <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <div className="font-mono text-xs text-gray-600">{r.receipt_number}</div>
                        <div className="font-semibold text-sm">{new Intl.NumberFormat('en-US', { style: 'currency', currency: r.currency }).format(r.amount)}</div>
                        <div className="text-xs text-gray-600">{fmtDate(r.paid_at)} · {r.payment_method}</div>
                      </div>
                      <CheckCircle size={16} className="text-green-400" />
                    </div>
                  ))}
                  {!(tenantData?.receipts?.length) && <p className="text-sm text-gray-600 text-center py-6">No receipts yet</p>}
                </div>
              </div>
            </div>
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-start gap-3">
              <LifeBuoy size={18} className="text-teal-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-teal-700">Billing questions?</div>
                <p className="text-xs text-gray-600 mt-0.5">For invoice disputes, payment issues, or upgrade requests, raise a support ticket and our team will respond within 24 hours.</p>
                <button onClick={() => setShowSupportModal(true)} className="mt-2 text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1">Raise a ticket <ChevronRight size={10} /></button>
              </div>
            </div>
          </div>
        )}

        {/* ── SUPPORT ── */}
        {tab === 'support' && (
          <div className="space-y-4 max-w-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Support</h2>
              <button onClick={() => setShowSupportModal(true)} className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg text-sm"><Plus size={14} />New Ticket</button>
            </div>
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center shrink-0">🤖</div>
              <div>
                <div className="text-sm font-medium">AI Copilot Support</div>
                <p className="text-xs text-gray-600 mt-0.5">When you raise a ticket, our AI copilot instantly analyses your issue and provides a suggested resolution. A human agent reviews and follows up within 24 hours.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {[
                { category: 'billing', icon: CreditCard, title: 'Billing & Invoices', desc: 'Payment issues, invoice queries, refund requests' },
                { category: 'license', icon: Package, title: 'License Management', desc: 'Seat upgrades, concurrent limit increases, renewals' },
                { category: 'technical', icon: Settings, title: 'Technical Support', desc: 'Integration issues, SSO problems, API errors' },
                { category: 'general', icon: LifeBuoy, title: 'General Enquiry', desc: 'Feature requests, onboarding help, feedback' },
              ].map(c => (
                <button key={c.category} onClick={() => { setSupportForm(f => ({ ...f, category: c.category })); setShowSupportModal(true); }} className="bg-white border border-gray-200 hover:border-orange-500 rounded-xl p-4 text-left flex items-center gap-4 transition-colors">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center shrink-0"><c.icon size={18} className="text-orange-400" /></div>
                  <div><div className="font-medium text-sm">{c.title}</div><div className="text-xs text-gray-600">{c.desc}</div></div>
                  <ChevronRight size={14} className="ml-auto text-gray-600" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── INVITE MODAL ── */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Invite Team Member</h2>
              <button onClick={() => { setShowInviteModal(false); setInviteLink(''); }}><X size={18} /></button>
            </div>
            {inviteLink ? (
              <div className="p-5 space-y-4">
                <div className="bg-green-900/20 border border-green-800 rounded-xl p-4 text-center">
                  <CheckCircle size={24} className="text-green-400 mx-auto mb-2" />
                  <p className="text-sm font-medium">Invitation created!</p>
                  <p className="text-xs text-gray-600 mt-1">Share this link with the user to complete their registration:</p>
                </div>
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-3">
                  <code className="text-xs font-mono text-gray-300 flex-1 truncate">{window.location.origin}{inviteLink}</code>
                  <button onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}${inviteLink}`); showToast('Copied!'); }} className="p-1 hover:bg-gray-200 rounded"><Copy size={12} /></button>
                </div>
                <button onClick={() => { setShowInviteModal(false); setInviteLink(''); }} className="w-full bg-teal-600 hover:bg-teal-700 py-2 rounded-lg text-sm">Done</button>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                <div><label className="text-xs text-gray-600 mb-1 block">Full Name</label><input value={inviteForm.name} onChange={e => setInviteForm({...inviteForm, name: e.target.value})} placeholder="Jane Smith" className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500" /></div>
                <div><label className="text-xs text-gray-600 mb-1 block">Email Address</label><input type="email" value={inviteForm.email} onChange={e => setInviteForm({...inviteForm, email: e.target.value})} placeholder="jane@company.com" className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500" /></div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Role</label>
                  <select value={inviteForm.role} onChange={e => setInviteForm({...inviteForm, role: e.target.value})} className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500">
                    {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                  </select>
                  <div className="mt-2 space-y-1">
                    {ROLE_PERMISSIONS[inviteForm.role]?.map(p => <div key={p} className="flex items-center gap-1 text-xs text-gray-600"><CheckCircle size={9} className="text-green-400" />{p}</div>)}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={inviteUser} disabled={loading} className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 py-2 rounded-lg text-sm"><Mail size={14} />{loading ? 'Creating…' : 'Create Invitation'}</button>
                  <button onClick={() => setShowInviteModal(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SSO MODAL ── */}
      {showSsoModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Configure SSO</h2>
              <button onClick={() => setShowSsoModal(false)}><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-600 mb-1 block">Protocol</label>
                  <select value={ssoForm.protocol} onChange={e => setSsoForm({...ssoForm, protocol: e.target.value})} className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500">
                    <option value="oidc">OIDC / OAuth2</option><option value="saml">SAML 2.0</option>
                  </select>
                </div>
                <div><label className="text-xs text-gray-600 mb-1 block">Provider</label>
                  <select value={ssoForm.provider} onChange={e => setSsoForm({...ssoForm, provider: e.target.value})} className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500">
                    <option value="azure_ad">Azure AD</option><option value="okta">Okta</option><option value="google">Google Workspace</option><option value="ping">Ping Identity</option><option value="onelogin">OneLogin</option><option value="custom">Custom</option>
                  </select>
                </div>
              </div>
              <div><label className="text-xs text-gray-600 mb-1 block">Client ID / App ID</label><input value={ssoForm.client_id} onChange={e => setSsoForm({...ssoForm, client_id: e.target.value})} className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500" /></div>
              <div><label className="text-xs text-gray-600 mb-1 block">Client Secret</label>
                <div className="relative">
                  <input type={showSecret ? 'text' : 'password'} value={ssoForm.client_secret} onChange={e => setSsoForm({...ssoForm, client_secret: e.target.value})} className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:border-purple-500" />
                  <button onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600">{showSecret ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                </div>
              </div>
              {ssoForm.protocol === 'oidc' && <div><label className="text-xs text-gray-600 mb-1 block">Issuer URL / Discovery URL</label><input value={ssoForm.issuer_url} onChange={e => setSsoForm({...ssoForm, issuer_url: e.target.value})} placeholder="https://login.microsoftonline.com/{tenant-id}/v2.0" className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500" /></div>}
              {ssoForm.protocol === 'saml' && <div><label className="text-xs text-gray-600 mb-1 block">SAML Metadata URL</label><input value={ssoForm.saml_metadata_url} onChange={e => setSsoForm({...ssoForm, saml_metadata_url: e.target.value})} placeholder="https://your-idp.com/metadata.xml" className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500" /></div>}
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-xs text-teal-700">
                After saving, copy the <strong>Callback URL</strong> and register it as a redirect URI in your identity provider.
              </div>
              <div className="flex gap-3">
                <button onClick={saveSso} disabled={loading} className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 py-2 rounded-lg text-sm"><Save size={14} />{loading ? 'Saving…' : 'Save SSO Config'}</button>
                <button onClick={() => setShowSsoModal(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SUPPORT MODAL ── */}
      {showSupportModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Raise Support Ticket</h2>
              <button onClick={() => setShowSupportModal(false)}><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-600 mb-1 block">Category</label>
                  <select value={supportForm.category} onChange={e => setSupportForm({...supportForm, category: e.target.value})} className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500">
                    <option value="billing">Billing</option><option value="license">License</option><option value="technical">Technical</option><option value="general">General</option>
                  </select>
                </div>
                <div><label className="text-xs text-gray-600 mb-1 block">Priority</label>
                  <select value={supportForm.priority} onChange={e => setSupportForm({...supportForm, priority: e.target.value})} className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500">
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div><label className="text-xs text-gray-600 mb-1 block">Subject</label><input value={supportForm.subject} onChange={e => setSupportForm({...supportForm, subject: e.target.value})} placeholder="Brief summary of your issue" className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500" /></div>
              <div><label className="text-xs text-gray-600 mb-1 block">Description</label><textarea value={supportForm.description} onChange={e => setSupportForm({...supportForm, description: e.target.value})} rows={4} placeholder="Describe your issue in detail…" className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500" /></div>
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 flex items-center gap-2 text-xs text-teal-700">
                🤖 <span>AI Copilot will instantly analyse your ticket and suggest a resolution when you submit.</span>
              </div>
              <div className="flex gap-3">
                <button onClick={submitSupport} disabled={loading} className="flex-1 flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 py-2 rounded-lg text-sm"><Send size={14} />{loading ? 'Submitting…' : 'Submit Ticket'}</button>
                <button onClick={() => setShowSupportModal(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


