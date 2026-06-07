import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, Users, Building2, CreditCard, FileText, Receipt, LifeBuoy,
  TrendingUp, Plus, Edit2, Trash2, CheckCircle, XCircle, AlertTriangle,
  ChevronRight, Search, RefreshCw, DollarSign, Globe, Activity,
  Settings, Lock, Unlock, Eye, Send, BarChart2, Package, Clock,
  ArrowUpRight, ArrowDownRight, Zap, Star, Crown, X, Save, ChevronDown
} from 'lucide-react';

const API = (window as any).__API_BASE__ || '';

interface LicensePack { id: string; name: string; tier: string; description: string; max_users: number; max_concurrent: number; price_usd: number; billing_cycle: string; currency_prices: Record<string, number>; features: string[]; is_active: number; is_popular: number; sort_order: number; }
interface Tenant { id: string; name: string; slug: string; domain: string; status: string; plan_tier: string; max_users: number; max_concurrent: number; currency: string; billing_email: string; billing_address: string; tax_id: string; active_users: number; concurrent_now: number; pack_name: string; sub_status: string; ends_at: string; created_at: string; }
interface Invoice { id: string; invoice_number: string; tenant_id: string; tenant_name: string; status: string; currency: string; total: number; due_date: string; created_at: string; }
interface SupportTicket { id: string; tenant_name: string; category: string; priority: string; status: string; subject: string; description: string; created_at: string; }
interface Stats { totalTenants: number; activeTenants: number; trialTenants: number; totalUsers: number; concurrentNow: number; totalRevenue: number; mrr: number; openTickets: number; recentTenants: any[]; packDist: any[]; revenueByMonth: any[]; }

const CURRENCIES = ['USD','EUR','GBP','INR','AUD','CAD','SGD','AED','JPY','BRL','MXN','ZAR'];
const TIERS = ['starter','professional','enterprise','custom'];
const STATUS_COLORS: Record<string, string> = { active: 'text-green-400 bg-green-900/30', trial: 'text-yellow-400 bg-yellow-900/30', suspended: 'text-red-400 bg-red-900/30', cancelled: 'text-gray-400 bg-gray-800', paid: 'text-green-400 bg-green-900/30', draft: 'text-gray-400 bg-gray-800', sent: 'text-blue-400 bg-blue-900/30', overdue: 'text-red-400 bg-red-900/30', open: 'text-yellow-400 bg-yellow-900/30', in_progress: 'text-blue-400 bg-blue-900/30', resolved: 'text-green-400 bg-green-900/30', critical: 'text-red-400', high: 'text-orange-400', medium: 'text-yellow-400', low: 'text-gray-400' };

export default function SuperAdminPortal({ token }: { token: string }) {
  const [tab, setTab] = useState<'dashboard'|'packs'|'tenants'|'users'|'invoices'|'support'|'currencies'|'audit'>('dashboard');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [packs, setPacks] = useState<LicensePack[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [showPackModal, setShowPackModal] = useState(false);
  const [editPack, setEditPack] = useState<Partial<LicensePack> | null>(null);
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [editTenant, setEditTenant] = useState<Partial<Tenant> | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceTenantId, setInvoiceTenantId] = useState('');
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [subscribeTenantId, setSubscribeTenantId] = useState('');
  const [toast, setToast] = useState('');

  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const api = useCallback(async (path: string, opts: any = {}) => {
    const r = await fetch(`${API}${path}`, { headers: h, ...opts });
    return r.json();
  }, [token]);

  const loadStats = useCallback(async () => { const d = await api('/api/saas/stats'); setStats(d); }, [api]);
  const loadPacks = useCallback(async () => { const d = await api('/api/saas/license-packs'); setPacks(Array.isArray(d) ? d : []); }, [api]);
  const loadTenants = useCallback(async () => { const d = await api('/api/saas/tenants'); setTenants(Array.isArray(d) ? d : []); }, [api]);
  const loadInvoices = useCallback(async () => { const d = await api('/api/saas/invoices'); setInvoices(Array.isArray(d) ? d : []); }, [api]);
  const loadTickets = useCallback(async () => { const d = await api('/api/saas/support'); setTickets(Array.isArray(d) ? d : []); }, [api]);
  const loadCurrencies = useCallback(async () => { const d = await api('/api/saas/currencies'); setCurrencies(Array.isArray(d) ? d : []); }, [api]);
  const loadAudit = useCallback(async () => { const d = await api('/api/saas/audit'); setAudit(Array.isArray(d) ? d : []); }, [api]);
  const loadAllUsers = useCallback(async () => { const d = await api('/api/saas/users'); setAllUsers(Array.isArray(d) ? d : []); }, [api]);

  const promoteUser = async (userId: number, role: string) => {
    await api(`/api/saas/users/${userId}/promote`, { method: 'PATCH', body: JSON.stringify({ role }) });
    await loadAllUsers(); showToast(`User role updated to ${role}`);
  };

  useEffect(() => { loadStats(); loadPacks(); }, []);
  useEffect(() => {
    if (tab === 'tenants') loadTenants();
    if (tab === 'users') loadAllUsers();
    if (tab === 'invoices') loadInvoices();
    if (tab === 'support') loadTickets();
    if (tab === 'currencies') loadCurrencies();
    if (tab === 'audit') loadAudit();
  }, [tab]);

  // ── Pack CRUD ──
  const savePack = async () => {
    if (!editPack) return;
    setLoading(true);
    const method = editPack.id ? 'PUT' : 'POST';
    const url = editPack.id ? `/api/saas/license-packs/${editPack.id}` : '/api/saas/license-packs';
    await api(url, { method, body: JSON.stringify(editPack) });
    await loadPacks();
    setShowPackModal(false); setEditPack(null);
    showToast('License pack saved!');
    setLoading(false);
  };

  const deletePack = async (id: string) => {
    await api(`/api/saas/license-packs/${id}`, { method: 'DELETE' });
    await loadPacks(); showToast('Pack deactivated');
  };

  // ── Tenant CRUD ──
  const saveTenant = async () => {
    if (!editTenant) return;
    setLoading(true);
    const method = editTenant.id ? 'PUT' : 'POST';
    const url = editTenant.id ? `/api/saas/tenants/${editTenant.id}` : '/api/saas/tenants';
    await api(url, { method, body: JSON.stringify(editTenant) });
    await loadTenants(); setShowTenantModal(false); setEditTenant(null);
    showToast('Tenant saved!'); setLoading(false);
  };

  const setTenantStatus = async (id: string, status: string) => {
    await api(`/api/saas/tenants/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    await loadTenants(); showToast(`Tenant ${status}`);
  };

  const loadTenantDetail = async (id: string) => {
    const d = await api(`/api/saas/tenants/${id}`);
    setSelectedTenant(d);
  };

  // ── Subscribe tenant to pack ──
  const subscribeTenant = async (tenantId: string, packId: string) => {
    setLoading(true);
    const starts_at = new Date().toISOString();
    const ends_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await api(`/api/saas/tenants/${tenantId}/subscribe`, { method: 'POST', body: JSON.stringify({ pack_id: packId, starts_at, ends_at }) });
    await loadTenants(); setShowSubscribeModal(false);
    showToast('License assigned!'); setLoading(false);
  };

  // ── Invoice ──
  const createInvoice = async (tenantId: string, packId: string) => {
    const pack = packs.find(p => p.id === packId);
    if (!pack) return;
    const tenant = tenants.find(t => t.id === tenantId);
    const currency = tenant?.currency || 'USD';
    const prices: Record<string, number> = pack.currency_prices || {};
    const amount = prices[currency] || pack.price_usd;
    const line_items = [{ description: `${pack.name} License — ${pack.billing_cycle}`, qty: 1, unit_price: amount, amount }];
    const due_date = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const d = await api('/api/saas/invoices', { method: 'POST', body: JSON.stringify({ tenant_id: tenantId, line_items, due_date }) });
    showToast(`Invoice ${d.invoice_number} created — ${d.currency} ${d.total}`);
    await loadInvoices();
  };

  const markInvoicePaid = async (id: string) => {
    await api(`/api/saas/invoices/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'paid', payment_method: 'bank_transfer' }) });
    await loadInvoices(); showToast('Invoice marked paid — receipt generated');
  };

  // ── Support ──
  const loadTicketDetail = async (id: string) => {
    const d = await api(`/api/saas/support/${id}`);
    setSelectedTicket(d);
  };

  const resolveTicket = async (id: string) => {
    await api(`/api/saas/support/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'resolved' }) });
    await loadTickets(); setSelectedTicket(null); showToast('Ticket resolved');
  };

  const filtered = <T extends { name?: string; tenant_name?: string; subject?: string }>(arr: T[]) =>
    arr.filter(x => JSON.stringify(x).toLowerCase().includes(search.toLowerCase()));

  const fmt = (n: number, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString() : '—';

  const tierIcon = (tier: string) => tier === 'enterprise' ? <Crown size={14} className="text-yellow-400" /> : tier === 'professional' ? <Star size={14} className="text-blue-400" /> : <Zap size={14} className="text-green-400" />;

  const TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
    { id: 'packs', label: 'License Packs', icon: Package },
    { id: 'tenants', label: 'Tenants', icon: Building2 },
    { id: 'users', label: 'Users & Access', icon: Users },
    { id: 'invoices', label: 'Invoices & Receipts', icon: FileText },
    { id: 'support', label: 'Support', icon: LifeBuoy },
    { id: 'currencies', label: 'Currencies', icon: Globe },
    { id: 'audit', label: 'Audit Log', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Toast */}
      {toast && <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm">{toast}</div>}

      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
          <Shield size={16} />
        </div>
        <div>
          <h1 className="text-lg font-bold">EdgeQI Super Admin</h1>
          <p className="text-xs text-gray-400">SaaS License Management Portal</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-sm w-48 focus:outline-none focus:border-purple-500" />
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 flex gap-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t.id ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-400 hover:text-white'}`}>
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      <div className="p-6">

        {/* ── DASHBOARD ── */}
        {tab === 'dashboard' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Tenants', value: stats.totalTenants, sub: `${stats.activeTenants} active · ${stats.trialTenants} trial`, icon: Building2, color: 'from-blue-600 to-blue-800' },
                { label: 'Total Users', value: stats.totalUsers, sub: `${stats.concurrentNow} concurrent now`, icon: Users, color: 'from-green-600 to-green-800' },
                { label: 'Monthly Revenue', value: fmt(stats.mrr), sub: `${fmt(stats.totalRevenue)} all-time`, icon: DollarSign, color: 'from-purple-600 to-purple-800' },
                { label: 'Open Tickets', value: stats.openTickets, sub: 'Awaiting response', icon: LifeBuoy, color: 'from-orange-600 to-orange-800' },
              ].map(card => (
                <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-400">{card.label}</span>
                    <div className={`w-8 h-8 bg-gradient-to-br ${card.color} rounded-lg flex items-center justify-center`}><card.icon size={14} /></div>
                  </div>
                  <div className="text-2xl font-bold">{card.value}</div>
                  <div className="text-xs text-gray-500 mt-1">{card.sub}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Recent tenants */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Building2 size={14} className="text-blue-400" />Recent Tenants</h3>
                <div className="space-y-2">
                  {stats.recentTenants.map((t: any) => (
                    <div key={t.name} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                      <div>
                        <div className="text-sm font-medium">{t.name}</div>
                        <div className="text-xs text-gray-500">{t.pack || 'No plan'} · {fmtDate(t.created_at)}</div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[t.status] || 'text-gray-400'}`}>{t.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pack distribution */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Package size={14} className="text-purple-400" />License Distribution</h3>
                <div className="space-y-3">
                  {stats.packDist.map((p: any) => (
                    <div key={p.name}>
                      <div className="flex justify-between text-xs mb-1"><span>{p.name}</span><span className="text-gray-400">{p.count} tenants</span></div>
                      <div className="h-2 bg-gray-800 rounded-full"><div className="h-2 bg-purple-500 rounded-full" style={{ width: `${Math.min(100, p.count * 20)}%` }} /></div>
                    </div>
                  ))}
                  {stats.packDist.length === 0 && <p className="text-xs text-gray-500">No active subscriptions yet</p>}
                </div>
              </div>
            </div>

            {/* Revenue by month */}
            {stats.revenueByMonth.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><TrendingUp size={14} className="text-green-400" />Revenue by Month (USD)</h3>
                <div className="flex items-end gap-2 h-24">
                  {stats.revenueByMonth.slice().reverse().map((m: any) => {
                    const max = Math.max(...stats.revenueByMonth.map((x: any) => x.revenue));
                    const pct = max > 0 ? (m.revenue / max) * 100 : 0;
                    return (
                      <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                        <div className="text-xs text-gray-500">{fmt(m.revenue, 'USD').replace('$', '')}</div>
                        <div className="w-full bg-green-500 rounded-t" style={{ height: `${pct}%`, minHeight: 4 }} />
                        <div className="text-xs text-gray-600">{m.month.slice(5)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── LICENSE PACKS ── */}
        {tab === 'packs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">License Packs</h2>
              <button onClick={() => { setEditPack({ tier: 'starter', billing_cycle: 'monthly', features: [], currency_prices: {}, is_active: 1, is_popular: 0 }); setShowPackModal(true); }} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm">
                <Plus size={14} />New Pack
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {packs.map(pack => (
                <div key={pack.id} className={`bg-gray-900 border rounded-xl p-5 relative ${pack.is_popular ? 'border-purple-500' : 'border-gray-800'}`}>
                  {pack.is_popular && <div className="absolute -top-2 left-4 bg-purple-600 text-xs px-2 py-0.5 rounded-full">Most Popular</div>}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">{tierIcon(pack.tier)}<span className="font-semibold">{pack.name}</span></div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${pack.is_active ? 'bg-green-900/30 text-green-400' : 'bg-gray-800 text-gray-400'}`}>{pack.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                  <div className="text-2xl font-bold mb-1">${pack.price_usd}<span className="text-sm text-gray-400">/{pack.billing_cycle === 'annual' ? 'yr' : 'mo'}</span></div>
                  <div className="text-xs text-gray-400 mb-3">{pack.description}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div className="bg-gray-800 rounded p-2"><div className="text-gray-400">Max Users</div><div className="font-semibold">{pack.max_users}</div></div>
                    <div className="bg-gray-800 rounded p-2"><div className="text-gray-400">Concurrent</div><div className="font-semibold">{pack.max_concurrent}</div></div>
                  </div>
                  <div className="space-y-1 mb-4">
                    {(pack.features || []).slice(0, 4).map(f => <div key={f} className="flex items-center gap-1 text-xs text-gray-300"><CheckCircle size={10} className="text-green-400 shrink-0" />{f}</div>)}
                    {(pack.features || []).length > 4 && <div className="text-xs text-gray-500">+{pack.features.length - 4} more features</div>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditPack({ ...pack }); setShowPackModal(true); }} className="flex-1 flex items-center justify-center gap-1 bg-gray-800 hover:bg-gray-700 py-1.5 rounded text-xs"><Edit2 size={11} />Edit</button>
                    <button onClick={() => deletePack(pack.id)} className="flex items-center justify-center gap-1 bg-red-900/30 hover:bg-red-900/50 text-red-400 px-3 py-1.5 rounded text-xs"><Trash2 size={11} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TENANTS ── */}
        {tab === 'tenants' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Tenants ({tenants.length})</h2>
              <button onClick={() => { setEditTenant({ country: 'US', currency: 'USD', status: 'trial' }); setShowTenantModal(true); }} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm"><Plus size={14} />New Tenant</button>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-800 text-gray-400 text-xs">
                  <tr>{['Organisation','Plan','Users','Concurrent','Status','Currency','Actions'].map(h => <th key={h} className="text-left px-4 py-3">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {filtered(tenants).map(t => (
                    <tr key={t.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{t.name}</div>
                        <div className="text-xs text-gray-500">{t.domain || t.billing_email || '—'}</div>
                      </td>
                      <td className="px-4 py-3"><div className="flex items-center gap-1">{t.pack_name ? <>{tierIcon(t.tier)}<span>{t.pack_name}</span></> : <span className="text-gray-500">No plan</span>}</div></td>
                      <td className="px-4 py-3"><span className={t.active_users >= t.max_users ? 'text-red-400' : 'text-green-400'}>{t.active_users}/{t.max_users}</span></td>
                      <td className="px-4 py-3"><span className={t.concurrent_now >= t.max_concurrent ? 'text-red-400' : 'text-gray-300'}>{t.concurrent_now}/{t.max_concurrent}</span></td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[t.status] || 'text-gray-400'}`}>{t.status}</span></td>
                      <td className="px-4 py-3 text-gray-400">{t.currency}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => loadTenantDetail(t.id)} className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs" title="View"><Eye size={12} /></button>
                          <button onClick={() => { setSubscribeTenantId(t.id); setShowSubscribeModal(true); }} className="p-1.5 bg-blue-900/30 hover:bg-blue-900/50 text-blue-400 rounded text-xs" title="Assign License"><Package size={12} /></button>
                          <button onClick={() => createInvoice(t.id, packs.find(p => p.tier === t.plan_tier)?.id || packs[0]?.id)} className="p-1.5 bg-green-900/30 hover:bg-green-900/50 text-green-400 rounded text-xs" title="Create Invoice"><FileText size={12} /></button>
                          <button onClick={() => setTenantStatus(t.id, t.status === 'active' ? 'suspended' : 'active')} className={`p-1.5 rounded text-xs ${t.status === 'active' ? 'bg-red-900/30 hover:bg-red-900/50 text-red-400' : 'bg-green-900/30 hover:bg-green-900/50 text-green-400'}`} title={t.status === 'active' ? 'Suspend' : 'Activate'}>{t.status === 'active' ? <Lock size={12} /> : <Unlock size={12} />}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {tenants.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No tenants yet. Create your first tenant above.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── INVOICES ── */}
        {tab === 'invoices' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Invoices & Receipts</h2>
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-800 text-gray-400 text-xs">
                  <tr>{['Invoice #','Tenant','Amount','Status','Due','Created','Actions'].map(h => <th key={h} className="text-left px-4 py-3">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {filtered(invoices).map(inv => (
                    <tr key={inv.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                      <td className="px-4 py-3 font-mono text-xs">{inv.invoice_number}</td>
                      <td className="px-4 py-3">{inv.tenant_name}</td>
                      <td className="px-4 py-3 font-semibold">{fmt(inv.total, inv.currency)}</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[inv.status] || 'text-gray-400'}`}>{inv.status}</span></td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(inv.due_date)}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(inv.created_at)}</td>
                      <td className="px-4 py-3">
                        {inv.status !== 'paid' && inv.status !== 'void' && (
                          <button onClick={() => markInvoicePaid(inv.id)} className="flex items-center gap-1 bg-green-900/30 hover:bg-green-900/50 text-green-400 px-2 py-1 rounded text-xs"><CheckCircle size={10} />Mark Paid</button>
                        )}
                        {inv.status === 'paid' && <span className="text-xs text-green-400 flex items-center gap-1"><Receipt size={10} />Receipt issued</span>}
                      </td>
                    </tr>
                  ))}
                  {invoices.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No invoices yet. Create invoices from the Tenants tab.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── SUPPORT ── */}
        {tab === 'support' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Support Tickets</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1 space-y-2">
                {filtered(tickets).map(t => (
                  <div key={t.id} onClick={() => loadTicketDetail(t.id)} className={`bg-gray-900 border rounded-lg p-3 cursor-pointer hover:border-purple-500 transition-colors ${selectedTicket?.ticket?.id === t.id ? 'border-purple-500' : 'border-gray-800'}`}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-sm font-medium line-clamp-1">{t.subject}</span>
                      <span className={`text-xs shrink-0 ${STATUS_COLORS[t.priority] || 'text-gray-400'}`}>{t.priority}</span>
                    </div>
                    <div className="text-xs text-gray-500">{t.tenant_name || 'Unknown'} · {t.category}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_COLORS[t.status] || 'text-gray-400'}`}>{t.status}</span>
                      <span className="text-xs text-gray-600">{fmtDate(t.created_at)}</span>
                    </div>
                  </div>
                ))}
                {tickets.length === 0 && <p className="text-sm text-gray-500 text-center py-8">No support tickets</p>}
              </div>
              <div className="md:col-span-2">
                {selectedTicket ? (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold">{selectedTicket.ticket.subject}</h3>
                        <div className="text-xs text-gray-400 mt-1">{selectedTicket.ticket.tenant_name} · {selectedTicket.ticket.category} · {selectedTicket.ticket.priority} priority</div>
                      </div>
                      <button onClick={() => resolveTicket(selectedTicket.ticket.id)} className="flex items-center gap-1 bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded text-xs"><CheckCircle size={11} />Resolve</button>
                    </div>
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {(selectedTicket.messages || []).map((m: any) => (
                        <div key={m.id} className={`rounded-lg p-3 text-sm ${m.sender_role === 'ai' ? 'bg-blue-900/20 border border-blue-800' : m.sender_role === 'support' ? 'bg-purple-900/20 border border-purple-800' : 'bg-gray-800'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium ${m.sender_role === 'ai' ? 'text-blue-400' : m.sender_role === 'support' ? 'text-purple-400' : 'text-gray-300'}`}>{m.sender_role === 'ai' ? '🤖 AI Copilot' : m.sender_role === 'support' ? '👤 Support' : '🏢 Customer'}</span>
                            <span className="text-xs text-gray-600">{fmtDate(m.created_at)}</span>
                          </div>
                          <p className="text-gray-300">{m.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500">
                    <LifeBuoy size={32} className="mx-auto mb-2 opacity-30" />
                    <p>Select a ticket to view the thread</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── CURRENCIES ── */}
        {tab === 'currencies' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Currency Exchange Rates</h2>
            <p className="text-sm text-gray-400">These rates are used to calculate invoice amounts in tenant currencies. Update regularly for accuracy.</p>
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-800 text-gray-400 text-xs">
                  <tr>{['Currency','Symbol','Name','Rate vs USD','Updated'].map(h => <th key={h} className="text-left px-4 py-3">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {currencies.map(c => (
                    <tr key={c.currency} className="border-t border-gray-800">
                      <td className="px-4 py-3 font-mono font-semibold">{c.currency}</td>
                      <td className="px-4 py-3">{c.symbol}</td>
                      <td className="px-4 py-3 text-gray-400">{c.name}</td>
                      <td className="px-4 py-3">{c.rate_vs_usd}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(c.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── USERS & ACCESS ── */}
        {tab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Users &amp; Access Management</h2>
                <p className="text-sm text-gray-400 mt-0.5">Manage all platform users, assign roles, and control access across organisations.</p>
              </div>
              <button onClick={loadAllUsers} className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-1.5 rounded-lg text-sm"><RefreshCw size={13} />Refresh</button>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search users by name, email or role…" className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-purple-500" />
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-800 text-gray-400 text-xs">
                  <tr>{['User','Email','Role','Joined','Actions'].map(h => <th key={h} className="text-left px-4 py-3">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {allUsers.filter(u => JSON.stringify(u).toLowerCase().includes(userSearch.toLowerCase())).map(u => (
                    <tr key={u.id} className="border-t border-gray-800 hover:bg-gray-800/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">{(u.name||'?').charAt(0).toUpperCase()}</div>
                          <span className="font-medium">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          u.role === 'super_admin' ? 'bg-purple-900/40 text-purple-300' :
                          u.role === 'org_admin' ? 'bg-blue-900/40 text-blue-300' :
                          'bg-gray-800 text-gray-300'
                        }`}>{u.role?.replace(/_/g,' ')}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(u.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {u.role !== 'super_admin' && (
                            <>
                              {u.role !== 'org_admin' ? (
                                <button onClick={() => promoteUser(u.id, 'org_admin')} className="text-xs bg-blue-900/30 hover:bg-blue-900/60 text-blue-300 border border-blue-800 px-2 py-1 rounded-lg transition-colors" title="Promote to Org Admin">→ Org Admin</button>
                              ) : (
                                <button onClick={() => promoteUser(u.id, 'qa_engineer')} className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 px-2 py-1 rounded-lg transition-colors" title="Demote to QA Engineer">→ QA Engineer</button>
                              )}
                              <button onClick={() => promoteUser(u.id, 'super_admin')} className="text-xs bg-purple-900/30 hover:bg-purple-900/60 text-purple-300 border border-purple-800 px-2 py-1 rounded-lg transition-colors" title="Promote to Super Admin">→ Super Admin</button>
                            </>
                          )}
                          {u.role === 'super_admin' && (
                            <button onClick={() => promoteUser(u.id, 'qa_engineer')} className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 px-2 py-1 rounded-lg transition-colors">→ Demote</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {allUsers.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No users found</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Shield size={14} className="text-purple-400" />Role Reference</h3>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="bg-gray-800 rounded-lg p-3"><div className="font-semibold text-purple-300 mb-1">super_admin</div><div className="text-gray-400">Full platform control — license packs, tenants, invoices, all users, currencies, audit log.</div></div>
                <div className="bg-gray-800 rounded-lg p-3"><div className="font-semibold text-blue-300 mb-1">org_admin</div><div className="text-gray-400">Manages users within their organisation, configures SSO, views billing, raises support tickets.</div></div>
                <div className="bg-gray-800 rounded-lg p-3"><div className="font-semibold text-gray-300 mb-1">qa_engineer</div><div className="text-gray-400">Standard QA access — all testing modules, test data, defects, performance, security scans.</div></div>
              </div>
            </div>
          </div>
        )}

        {/* ── AUDIT ── */}
        {tab === 'audit' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Super Admin Audit Log</h2>
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-800 text-gray-400 text-xs">
                  <tr>{['Time','Admin','Action','Entity','Details'].map(h => <th key={h} className="text-left px-4 py-3">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {audit.map(a => (
                    <tr key={a.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                      <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(a.created_at)}</td>
                      <td className="px-4 py-3 text-xs">{a.admin_name || 'System'}</td>
                      <td className="px-4 py-3"><span className="text-xs font-mono bg-gray-800 px-1.5 py-0.5 rounded">{a.action}</span></td>
                      <td className="px-4 py-3 text-xs text-gray-400">{a.entity_type}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{a.details}</td>
                    </tr>
                  ))}
                  {audit.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No audit entries yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── TENANT DETAIL MODAL ── */}
      {selectedTenant && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h2 className="text-lg font-semibold">{selectedTenant.tenant?.name}</h2>
              <button onClick={() => setSelectedTenant(null)}><X size={18} /></button>
            </div>
            <div className="p-5 space-y-5">
              {/* Subscription */}
              {selectedTenant.subscription && (
                <div className="bg-gray-800 rounded-xl p-4">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Package size={14} className="text-purple-400" />Active License</h3>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div><div className="text-xs text-gray-400">Pack</div><div className="font-medium">{selectedTenant.subscription.pack_name}</div></div>
                    <div><div className="text-xs text-gray-400">Max Users</div><div className="font-medium">{selectedTenant.subscription.max_users}</div></div>
                    <div><div className="text-xs text-gray-400">Concurrent</div><div className="font-medium">{selectedTenant.subscription.max_concurrent}</div></div>
                    <div><div className="text-xs text-gray-400">Price</div><div className="font-medium">${selectedTenant.subscription.price_usd}/{selectedTenant.subscription.billing_cycle === 'annual' ? 'yr' : 'mo'}</div></div>
                    <div><div className="text-xs text-gray-400">Ends</div><div className="font-medium">{fmtDate(selectedTenant.subscription.ends_at)}</div></div>
                    <div><div className="text-xs text-gray-400">Concurrent Now</div><div className={`font-medium ${selectedTenant.concurrent >= selectedTenant.subscription.max_concurrent ? 'text-red-400' : 'text-green-400'}`}>{selectedTenant.concurrent}</div></div>
                  </div>
                </div>
              )}
              {/* Users */}
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Users size={14} className="text-blue-400" />Users ({selectedTenant.users?.length || 0})</h3>
                <div className="space-y-1">
                  {(selectedTenant.users || []).map((u: any) => (
                    <div key={u.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2 text-sm">
                      <div><div>{u.name}</div><div className="text-xs text-gray-400">{u.email}</div></div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{u.role}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_COLORS[u.status] || 'text-gray-400'}`}>{u.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Recent invoices */}
              {selectedTenant.invoices?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><FileText size={14} className="text-green-400" />Recent Invoices</h3>
                  <div className="space-y-1">
                    {selectedTenant.invoices.slice(0, 5).map((inv: any) => (
                      <div key={inv.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2 text-sm">
                        <span className="font-mono text-xs">{inv.invoice_number}</span>
                        <span>{fmt(inv.total, inv.currency)}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_COLORS[inv.status] || 'text-gray-400'}`}>{inv.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── PACK MODAL ── */}
      {showPackModal && editPack && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h2 className="text-lg font-semibold">{editPack.id ? 'Edit' : 'New'} License Pack</h2>
              <button onClick={() => { setShowPackModal(false); setEditPack(null); }}><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-gray-400 mb-1 block">Pack Name</label><input value={editPack.name||''} onChange={e => setEditPack({...editPack, name: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500" /></div>
                <div><label className="text-xs text-gray-400 mb-1 block">Tier</label>
                  <select value={editPack.tier||'starter'} onChange={e => setEditPack({...editPack, tier: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500">
                    {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className="text-xs text-gray-400 mb-1 block">Max Users</label><input type="number" value={editPack.max_users||5} onChange={e => setEditPack({...editPack, max_users: +e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500" /></div>
                <div><label className="text-xs text-gray-400 mb-1 block">Max Concurrent</label><input type="number" value={editPack.max_concurrent||2} onChange={e => setEditPack({...editPack, max_concurrent: +e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500" /></div>
                <div><label className="text-xs text-gray-400 mb-1 block">Price (USD)</label><input type="number" value={editPack.price_usd||49} onChange={e => setEditPack({...editPack, price_usd: +e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500" /></div>
                <div><label className="text-xs text-gray-400 mb-1 block">Billing Cycle</label>
                  <select value={editPack.billing_cycle||'monthly'} onChange={e => setEditPack({...editPack, billing_cycle: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500">
                    <option value="monthly">Monthly</option><option value="annual">Annual</option><option value="perpetual">Perpetual</option>
                  </select>
                </div>
              </div>
              <div><label className="text-xs text-gray-400 mb-1 block">Description</label><textarea value={editPack.description||''} onChange={e => setEditPack({...editPack, description: e.target.value})} rows={2} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500" /></div>
              <div><label className="text-xs text-gray-400 mb-1 block">Features (one per line)</label>
                <textarea value={(editPack.features||[]).join('\n')} onChange={e => setEditPack({...editPack, features: e.target.value.split('\n').filter(Boolean)})} rows={5} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500" placeholder="Requirements AI&#10;Test Case Generator&#10;SSO Integration" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-2 block">Currency Prices (leave blank to auto-convert from USD)</label>
                <div className="grid grid-cols-3 gap-2">
                  {CURRENCIES.filter(c => c !== 'USD').map(c => (
                    <div key={c} className="flex items-center gap-1">
                      <span className="text-xs text-gray-400 w-8">{c}</span>
                      <input type="number" value={(editPack.currency_prices as any)?.[c]||''} onChange={e => setEditPack({...editPack, currency_prices: {...(editPack.currency_prices||{}), [c]: +e.target.value}})} placeholder="auto" className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-purple-500" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={!!editPack.is_popular} onChange={e => setEditPack({...editPack, is_popular: e.target.checked ? 1 : 0})} className="rounded" /><span>Mark as Popular</span></label>
                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={editPack.is_active !== 0} onChange={e => setEditPack({...editPack, is_active: e.target.checked ? 1 : 0})} className="rounded" /><span>Active</span></label>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={savePack} disabled={loading} className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 py-2 rounded-lg text-sm"><Save size={14} />{loading ? 'Saving…' : 'Save Pack'}</button>
                <button onClick={() => { setShowPackModal(false); setEditPack(null); }} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TENANT MODAL ── */}
      {showTenantModal && editTenant && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h2 className="text-lg font-semibold">{editTenant.id ? 'Edit' : 'New'} Tenant</h2>
              <button onClick={() => { setShowTenantModal(false); setEditTenant(null); }}><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3">
              {[
                { label: 'Organisation Name', key: 'name', type: 'text' },
                { label: 'Domain', key: 'domain', type: 'text' },
                { label: 'Billing Email', key: 'billing_email', type: 'email' },
                { label: 'Billing Address', key: 'billing_address', type: 'text' },
                { label: 'Tax ID / VAT', key: 'tax_id', type: 'text' },
              ].map(f => (
                <div key={f.key}><label className="text-xs text-gray-400 mb-1 block">{f.label}</label>
                  <input type={f.type} value={(editTenant as any)[f.key]||''} onChange={e => setEditTenant({...editTenant, [f.key]: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-400 mb-1 block">Country</label><input value={editTenant.country||'US'} onChange={e => setEditTenant({...editTenant, country: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500" /></div>
                <div><label className="text-xs text-gray-400 mb-1 block">Currency</label>
                  <select value={editTenant.currency||'USD'} onChange={e => setEditTenant({...editTenant, currency: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500">
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={saveTenant} disabled={loading} className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 py-2 rounded-lg text-sm"><Save size={14} />{loading ? 'Saving…' : 'Save Tenant'}</button>
                <button onClick={() => { setShowTenantModal(false); setEditTenant(null); }} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SUBSCRIBE MODAL ── */}
      {showSubscribeModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h2 className="text-lg font-semibold">Assign License Pack</h2>
              <button onClick={() => setShowSubscribeModal(false)}><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-gray-400">Select a license pack to assign to this tenant. Any existing subscription will be replaced.</p>
              <div className="space-y-2">
                {packs.filter(p => p.is_active).map(pack => (
                  <button key={pack.id} onClick={() => subscribeTenant(subscribeTenantId, pack.id)} disabled={loading} className="w-full flex items-center justify-between bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-purple-500 rounded-xl p-3 text-left transition-colors">
                    <div className="flex items-center gap-3">
                      {tierIcon(pack.tier)}
                      <div>
                        <div className="font-medium text-sm">{pack.name}</div>
                        <div className="text-xs text-gray-400">{pack.max_users} users · {pack.max_concurrent} concurrent</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm">${pack.price_usd}</div>
                      <div className="text-xs text-gray-400">/{pack.billing_cycle === 'annual' ? 'yr' : 'mo'}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
