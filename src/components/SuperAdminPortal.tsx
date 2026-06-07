import React, { useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface User { id: string; name: string; email: string; role: string; created_at: string; last_login?: string; }
interface RbacRole { id: string; role_name: string; display_name: string; description: string; permissions: string; is_system: number; }
interface Issue { id: string; ticket_ref: string; tenant_name: string; reporter_email: string; title: string; description: string; category: string; priority: string; status: string; assigned_to: string; resolution: string; sla_hours: number; created_at: string; updated_at: string; }
interface EmailTrigger { id: string; event_type: string; trigger_name: string; description: string; threshold_value: number; threshold_unit: string; template_subject: string; template_body: string; recipient_type: string; is_active: number; last_fired_at?: string; fire_count: number; }
interface TenantConfig { tenant_id: string; tenant_name?: string; plan?: string; feature_flags: string; max_users: number; max_projects: number; max_api_calls_day: number; max_ai_tokens_day: number; custom_domain: string; sso_enforced: number; data_retention_days: number; branding_primary_color: string; notification_email: string; timezone: string; }
interface Tenant { id: string; name: string; plan: string; plan_tier?: string; pack_name?: string; status: string; contact_email: string; country?: string; geo_region?: string; created_at?: string; active_users: number; concurrent_now?: number; ends_at?: string; sub_status?: string; }
interface AnalyticsTrend { date: string; api_calls: number; active_users: number; revenue: number; test_runs: number; }
interface GeoData { geo_region: string; api_calls: number; active_users: number; revenue: number; tenants: number; }
interface CustomerData { tenant_name: string; company_size: string; license_tier: string; geo_region: string; api_calls: number; revenue: number; test_runs: number; }
interface OverviewStats { totalTenants: number; totalUsers: number; mrr: number; allTimeRevenue: number; apiCallsToday: number; apiCalls30d: number; activeUsers30d: number; testRuns30d: number; openIssues: number; criticalIssues: number; licensesByTier: { license_tier: string; count: number }[]; }

const TABS = [
  { id: 'overview',  label: 'Business Dashboard', icon: '📊' },
  { id: 'orgs',      label: 'Active Orgs',         icon: '🏢' },
  { id: 'analytics', label: 'Analytics & Trends',  icon: '📈' },
  { id: 'rbac',      label: 'RBAC & Permissions',  icon: '🔐' },
  { id: 'users',     label: 'User Management',     icon: '👥' },
  { id: 'payments',  label: 'Payments & Invoices', icon: '💳' },
  { id: 'licenses',  label: 'Licenses & Expiry',   icon: '🪪' },
  { id: 'wizard',    label: 'Customer Config',     icon: '⚙️' },
  { id: 'triggers',  label: 'Auto-Triggers',       icon: '🔔' },
  { id: 'issues',    label: 'Issue Tracker',       icon: '🎫' },
];

const PRIORITY_COLORS: Record<string, string> = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' };
const STATUS_COLORS: Record<string, string> = { open: '#ef4444', in_progress: '#f97316', resolved: '#22c55e', closed: '#6b7280' };
const GEO_COLORS: Record<string, string> = { NA: '#6366f1', EU: '#22c55e', APAC: '#f97316', MENA: '#eab308', LATAM: '#ec4899', Unknown: '#6b7280' };
const TIER_COLORS: Record<string, string> = { starter: '#6b7280', professional: '#6366f1', enterprise: '#f59e0b', enterprise_annual: '#22c55e' };

function Sparkline({ data, color = '#6366f1', height = 40 }: { data: number[]; color?: string; height?: number }) {
  if (!data || data.length < 2) return <div style={{ height }} />;
  const max = Math.max(...data, 1);
  const w = 120; const h = height;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 4) - 2}`).join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BarChart({ labels, values, color = '#6366f1', height = 120 }: { labels: string[]; values: number[]; color?: string; height?: number }) {
  if (!values.length) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: 13 }}>No data yet</div>;
  const max = Math.max(...values, 1);
  const barW = Math.max(8, Math.floor(280 / values.length) - 4);
  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={Math.max(280, values.length * (barW + 4))} height={height + 24}>
        {values.map((v, i) => {
          const bh = Math.max(2, (v / max) * height);
          const x = i * (barW + 4);
          return (
            <g key={i}>
              <rect x={x} y={height - bh} width={barW} height={bh} fill={color} rx={2} opacity={0.85} />
              {labels[i] && <text x={x + barW / 2} y={height + 16} textAnchor="middle" fontSize={9} fill="#9ca3af">{labels[i]}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function DonutChart({ segments, size = 100 }: { segments: { label: string; value: number; color: string }[]; size?: number }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let offset = 0;
  const r = size * 0.35; const cx = size / 2; const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <svg width={size} height={size}>
      {segments.map((seg, i) => {
        const pct = seg.value / total;
        const dash = pct * circumference;
        const gap = circumference - dash;
        const rotation = offset * 360 - 90;
        offset += pct;
        return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={size * 0.12} strokeDasharray={`${dash} ${gap}`} transform={`rotate(${rotation} ${cx} ${cy})`} />;
      })}
      <circle cx={cx} cy={cy} r={r * 0.6} fill="#1a1a2e" />
    </svg>
  );
}

function StatCard({ label, value, sub, color = '#6366f1', icon, trend }: { label: string; value: string | number; sub?: string; color?: string; icon?: string; trend?: number[] }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ color: '#9ca3af', fontSize: 12, fontWeight: 500, marginBottom: 6 }}>{icon} {label}</div>
          <div style={{ color, fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ color: '#6b7280', fontSize: 11, marginTop: 4 }}>{sub}</div>}
        </div>
        {trend && trend.length > 1 && <Sparkline data={trend} color={color} />}
      </div>
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return <span style={{ background: color + '22', color, border: `1px solid ${color}44`, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600, textTransform: 'capitalize' as const }}>{label}</span>;
}

const inputStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '9px 12px', color: '#e2e8f0', fontSize: 13, width: '100%', boxSizing: 'border-box' as const, outline: 'none' };
const selStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', fontSize: 13, cursor: 'pointer', outline: 'none' };
const btnStyle = (color: string): React.CSSProperties => ({ background: color + '22', border: `1px solid ${color}44`, color, borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600 });

export default function SuperAdminPortal({ token }: { token: string }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [triggers, setTriggers] = useState<EmailTrigger[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [trends, setTrends] = useState<AnalyticsTrend[]>([]);
  const [geoData, setGeoData] = useState<GeoData[]>([]);
  const [customerData, setCustomerData] = useState<CustomerData[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<any>(null);

  const [analyticsFilter, setAnalyticsFilter] = useState({ days: 30, geo: '', tier: '', size: '' });
  const [issueFilter, setIssueFilter] = useState({ status: '', priority: '', category: '' });
  const [userSearch, setUserSearch] = useState('');
  const [newRole, setNewRole] = useState({ role_name: '', display_name: '', description: '', permissions: '' });
  const [newIssue, setNewIssue] = useState({ title: '', tenant_name: '', reporter_email: '', category: 'general', priority: 'medium', description: '', sla_hours: 24 });
  const [editTrigger, setEditTrigger] = useState<EmailTrigger | null>(null);
  const [wizardTenant, setWizardTenant] = useState('');
  const [wizardConfig, setWizardConfig] = useState<Partial<TenantConfig>>({});
  const [wizardSaved, setWizardSaved] = useState(false);

  const API = (window as any).__API_BASE__ || '';
  const authH = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` });

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [ovRes, usrRes, roleRes, issRes, trigRes, tenRes, trendRes, geoRes, custRes, payRes] = await Promise.all([
        fetch(`${API}/api/saas/analytics/overview`, { headers: authH() }),
        fetch(`${API}/api/saas/rbac/users`, { headers: authH() }),
        fetch(`${API}/api/saas/rbac/roles`, { headers: authH() }),
        fetch(`${API}/api/saas/issues`, { headers: authH() }),
        fetch(`${API}/api/saas/email-triggers`, { headers: authH() }),
        fetch(`${API}/api/saas/tenants`, { headers: authH() }),
        fetch(`${API}/api/saas/analytics/trends?days=30`, { headers: authH() }),
        fetch(`${API}/api/saas/analytics/geo?days=30`, { headers: authH() }),
        fetch(`${API}/api/saas/analytics/customers?days=30`, { headers: authH() }),
        fetch(`${API}/api/saas/payments/summary`, { headers: authH() }),
      ]);
      if (ovRes.ok) setOverview(await ovRes.json());
      if (usrRes.ok) setUsers(await usrRes.json());
      if (roleRes.ok) setRoles(await roleRes.json());
      if (issRes.ok) setIssues(await issRes.json());
      if (trigRes.ok) setTriggers(await trigRes.json());
      if (tenRes.ok) { const d = await tenRes.json(); setTenants(Array.isArray(d) ? d : d.tenants || []); }
      if (trendRes.ok) { const d = await trendRes.json(); setTrends(d.daily || []); }
      if (geoRes.ok) { const d = await geoRes.json(); setGeoData(d.byRegion || []); }
      if (custRes.ok) { const d = await custRes.json(); setCustomerData(d.customers || []); }
      if (payRes.ok) setPaymentSummary(await payRes.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const fetchAnalytics = async () => {
    const { days, geo, tier, size } = analyticsFilter;
    const p = new URLSearchParams({ days: String(days) });
    if (geo) p.set('geo', geo); if (tier) p.set('tier', tier); if (size) p.set('size', size);
    const [tRes, gRes, cRes] = await Promise.all([
      fetch(`${API}/api/saas/analytics/trends?${p}`, { headers: authH() }),
      fetch(`${API}/api/saas/analytics/geo?${p}`, { headers: authH() }),
      fetch(`${API}/api/saas/analytics/customers?${p}`, { headers: authH() }),
    ]);
    if (tRes.ok) { const d = await tRes.json(); setTrends(d.daily || []); }
    if (gRes.ok) { const d = await gRes.json(); setGeoData(d.byRegion || []); }
    if (cRes.ok) { const d = await cRes.json(); setCustomerData(d.customers || []); }
  };

  const assignRole = async (userId: string, role: string) => {
    const r = await fetch(`${API}/api/saas/rbac/assign`, { method: 'POST', headers: authH(), body: JSON.stringify({ user_id: userId, role_name: role }) });
    if (r.ok) { showToast(`Role updated to ${role}`); fetchAll(); } else showToast('Failed', 'error');
  };

  const updateIssue = async (id: string, data: Partial<Issue>) => {
    const r = await fetch(`${API}/api/saas/issues/${id}`, { method: 'PUT', headers: authH(), body: JSON.stringify(data) });
    if (r.ok) { showToast('Issue updated'); fetchAll(); } else showToast('Failed', 'error');
  };

  const createIssue = async () => {
    if (!newIssue.title) return showToast('Title required', 'error');
    const r = await fetch(`${API}/api/saas/issues`, { method: 'POST', headers: authH(), body: JSON.stringify(newIssue) });
    if (r.ok) { showToast('Issue created'); setNewIssue({ title: '', tenant_name: '', reporter_email: '', category: 'general', priority: 'medium', description: '', sla_hours: 24 }); fetchAll(); } else showToast('Failed', 'error');
  };

  const saveTrigger = async () => {
    if (!editTrigger) return;
    const isNew = editTrigger.id.startsWith('new_');
    const url = isNew ? `${API}/api/saas/email-triggers` : `${API}/api/saas/email-triggers/${editTrigger.id}`;
    const r = await fetch(url, { method: isNew ? 'POST' : 'PUT', headers: authH(), body: JSON.stringify(editTrigger) });
    if (r.ok) { showToast(isNew ? 'Trigger created' : 'Trigger saved'); setEditTrigger(null); fetchAll(); } else showToast('Failed', 'error');
  };

  const testFireTrigger = async (id: string) => {
    const r = await fetch(`${API}/api/saas/email-triggers/${id}/test-fire`, { method: 'POST', headers: authH() });
    if (r.ok) showToast('Test email simulated'); else showToast('Failed', 'error');
  };

  const loadWizardConfig = async (tenantId: string) => {
    const r = await fetch(`${API}/api/saas/tenant-configs/${tenantId}`, { headers: authH() });
    if (r.ok) { setWizardConfig(await r.json()); setWizardSaved(false); }
  };

  const saveWizardConfig = async () => {
    if (!wizardTenant) return;
    const r = await fetch(`${API}/api/saas/tenant-configs/${wizardTenant}`, { method: 'PUT', headers: authH(), body: JSON.stringify(wizardConfig) });
    if (r.ok) { showToast('Configuration saved'); setWizardSaved(true); } else showToast('Failed to save', 'error');
  };

  const createRole = async () => {
    if (!newRole.role_name || !newRole.display_name) return showToast('Name required', 'error');
    const perms = newRole.permissions.split(',').map(p => p.trim()).filter(Boolean);
    const r = await fetch(`${API}/api/saas/rbac/roles`, { method: 'POST', headers: authH(), body: JSON.stringify({ ...newRole, permissions: perms }) });
    if (r.ok) { showToast('Role created'); setNewRole({ role_name: '', display_name: '', description: '', permissions: '' }); fetchAll(); } else showToast('Failed', 'error');
  };

  const deleteRole = async (id: string) => {
    const r = await fetch(`${API}/api/saas/rbac/roles/${id}`, { method: 'DELETE', headers: authH() });
    if (r.ok) { showToast('Role deleted'); fetchAll(); } else showToast('Cannot delete system role', 'error');
  };

  const trendRevenue = trends.map(t => t.revenue);
  const trendApiCalls = trends.map(t => t.api_calls);
  const trendLabels = trends.map(t => t.date.slice(5));
  const filteredUsers = users.filter(u => !userSearch || u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase()));
  const filteredIssues = issues.filter(i => (!issueFilter.status || i.status === issueFilter.status) && (!issueFilter.priority || i.priority === issueFilter.priority) && (!issueFilter.category || i.category === issueFilter.category));

  // ── Tab: Business Dashboard ───────────────────────────────────────────────
  const renderOverview = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 12 }}>
        <StatCard label="Total Tenants" value={overview?.totalTenants ?? '—'} icon="🏢" color="#6366f1" sub="Active organisations" trend={[2,3,4,4,5,5,6,6,7,7,8,8]} />
        <StatCard label="Total Users" value={overview?.totalUsers ?? '—'} icon="👥" color="#22c55e" sub="Platform-wide" trend={[5,8,12,14,16,18,20,22,24,26,28,30]} />
        <StatCard label="MRR" value={overview ? `$${Number(overview.mrr).toLocaleString()}` : '—'} icon="💰" color="#f59e0b" sub="Monthly recurring" trend={trendRevenue.slice(-12)} />
        <StatCard label="API Calls (30d)" value={overview ? overview.apiCalls30d.toLocaleString() : '—'} icon="⚡" color="#ec4899" sub="All tenants" trend={trendApiCalls.slice(-12)} />
        <StatCard label="Test Runs (30d)" value={overview?.testRuns30d ?? '—'} icon="🧪" color="#06b6d4" />
        <StatCard label="Open Issues" value={overview?.openIssues ?? '—'} icon="🎫" color={overview?.criticalIssues ? '#ef4444' : '#6b7280'} sub={overview?.criticalIssues ? `${overview.criticalIssues} critical` : 'All clear'} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }}>
          <div style={{ color: '#9ca3af', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>📈 Revenue Trend (30d)</div>
          <BarChart labels={trendLabels} values={trendRevenue} color="#f59e0b" height={100} />
        </div>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }}>
          <div style={{ color: '#9ca3af', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>🪪 License Distribution</div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <DonutChart size={100} segments={(overview?.licensesByTier || []).map(l => ({ label: l.license_tier, value: l.count, color: TIER_COLORS[l.license_tier] || '#6b7280' }))} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(overview?.licensesByTier || []).map(l => (
                <div key={l.license_tier} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: TIER_COLORS[l.license_tier] || '#6b7280' }} />
                  <span style={{ color: '#d1d5db', textTransform: 'capitalize' }}>{l.license_tier}</span>
                  <span style={{ color: '#6b7280' }}>({l.count})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }}>
          <div style={{ color: '#9ca3af', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>🎫 Open Issues</div>
          {issues.filter(i => i.status === 'open').slice(0, 5).map(i => (
            <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div><div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 500 }}>{i.ticket_ref}: {i.title}</div><div style={{ color: '#6b7280', fontSize: 11 }}>{i.tenant_name}</div></div>
              <Badge label={i.priority} color={PRIORITY_COLORS[i.priority]} />
            </div>
          ))}
          {issues.filter(i => i.status === 'open').length === 0 && <div style={{ color: '#6b7280', fontSize: 13 }}>No open issues ✅</div>}
        </div>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }}>
          <div style={{ color: '#9ca3af', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>💳 Revenue by License Tier</div>
          {(paymentSummary?.byTier || []).map((t: any) => (
            <div key={t.license_tier} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: TIER_COLORS[t.license_tier] || '#6b7280' }} />
                <span style={{ color: '#d1d5db', fontSize: 13, textTransform: 'capitalize' }}>{t.license_tier}</span>
              </div>
              <span style={{ color: '#f59e0b', fontWeight: 600, fontSize: 13 }}>${Number(t.revenue || 0).toLocaleString()}</span>
            </div>
          ))}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#9ca3af', fontSize: 12 }}>All-time Revenue</span>
            <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 14 }}>${Number(paymentSummary?.allTime || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Tab: Analytics & Trends ───────────────────────────────────────────────
  const renderAnalytics = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 14 }}>
        <select value={analyticsFilter.days} onChange={e => setAnalyticsFilter(f => ({ ...f, days: Number(e.target.value) }))} style={selStyle}>
          <option value={7}>Last 7 days</option><option value={14}>Last 14 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
        </select>
        <select value={analyticsFilter.geo} onChange={e => setAnalyticsFilter(f => ({ ...f, geo: e.target.value }))} style={selStyle}>
          <option value="">All Regions</option><option value="NA">NA</option><option value="EU">EU</option><option value="APAC">APAC</option><option value="MENA">MENA</option><option value="LATAM">LATAM</option>
        </select>
        <select value={analyticsFilter.tier} onChange={e => setAnalyticsFilter(f => ({ ...f, tier: e.target.value }))} style={selStyle}>
          <option value="">All Tiers</option><option value="starter">Starter</option><option value="professional">Professional</option><option value="enterprise">Enterprise</option>
        </select>
        <select value={analyticsFilter.size} onChange={e => setAnalyticsFilter(f => ({ ...f, size: e.target.value }))} style={selStyle}>
          <option value="">All Sizes</option><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option><option value="enterprise">Enterprise</option>
        </select>
        <button onClick={fetchAnalytics} style={btnStyle('#6366f1')}>Apply Filters</button>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }}>
        <div style={{ color: '#9ca3af', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>🌍 Geo-wise Breakdown</div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <DonutChart size={120} segments={geoData.map(g => ({ label: g.geo_region, value: g.tenants, color: GEO_COLORS[g.geo_region] || '#6b7280' }))} />
          <div style={{ flex: 1, minWidth: 200, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr>{['Region','Tenants','API Calls','Users','Revenue'].map(h => <th key={h} style={{ color: '#6b7280', fontWeight: 600, textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{h}</th>)}</tr></thead>
              <tbody>
                {geoData.map(g => (
                  <tr key={g.geo_region}>
                    <td style={{ padding: '8px', color: GEO_COLORS[g.geo_region] || '#d1d5db', fontWeight: 600 }}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: GEO_COLORS[g.geo_region] || '#6b7280', marginRight: 6 }} />{g.geo_region}</td>
                    <td style={{ padding: '8px', color: '#d1d5db' }}>{g.tenants}</td>
                    <td style={{ padding: '8px', color: '#d1d5db' }}>{Number(g.api_calls || 0).toLocaleString()}</td>
                    <td style={{ padding: '8px', color: '#d1d5db' }}>{Number(g.active_users || 0).toLocaleString()}</td>
                    <td style={{ padding: '8px', color: '#f59e0b', fontWeight: 600 }}>${Number(g.revenue || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }}>
          <div style={{ color: '#9ca3af', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>⚡ Daily API Calls</div>
          <BarChart labels={trendLabels} values={trendApiCalls} color="#6366f1" height={100} />
        </div>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }}>
          <div style={{ color: '#9ca3af', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>💰 Daily Revenue</div>
          <BarChart labels={trendLabels} values={trendRevenue} color="#f59e0b" height={100} />
        </div>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }}>
        <div style={{ color: '#9ca3af', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>🏢 Customer-wise Usage</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>{['Customer','Size','Tier','Region','API Calls','Test Runs','Revenue'].map(h => <th key={h} style={{ color: '#6b7280', fontWeight: 600, textAlign: 'left', padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{h}</th>)}</tr></thead>
            <tbody>
              {customerData.map((c, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '8px', color: '#e2e8f0', fontWeight: 500 }}>{c.tenant_name}</td>
                  <td style={{ padding: '8px' }}><Badge label={c.company_size || 'unknown'} color="#6b7280" /></td>
                  <td style={{ padding: '8px' }}><Badge label={c.license_tier || 'starter'} color={TIER_COLORS[c.license_tier] || '#6b7280'} /></td>
                  <td style={{ padding: '8px' }}><Badge label={c.geo_region || 'unknown'} color={GEO_COLORS[c.geo_region] || '#6b7280'} /></td>
                  <td style={{ padding: '8px', color: '#d1d5db' }}>{Number(c.api_calls || 0).toLocaleString()}</td>
                  <td style={{ padding: '8px', color: '#d1d5db' }}>{Number(c.test_runs || 0).toLocaleString()}</td>
                  <td style={{ padding: '8px', color: '#f59e0b', fontWeight: 600 }}>${Number(c.revenue || 0).toLocaleString()}</td>
                </tr>
              ))}
              {customerData.length === 0 && <tr><td colSpan={7} style={{ padding: 20, color: '#6b7280', textAlign: 'center' }}>No customer data yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ── Tab: RBAC ─────────────────────────────────────────────────────────────
  const renderRbac = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ color: '#9ca3af', fontSize: 13 }}>Define and manage roles and permission sets. System roles are read-only.</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
        {roles.map(role => (
          <div key={role.id} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${role.is_system ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 15 }}>{role.display_name}</div>
                <div style={{ color: '#6b7280', fontSize: 11, fontFamily: 'monospace' }}>{role.role_name}</div>
              </div>
              {role.is_system ? <Badge label="System" color="#6366f1" /> : (
                <button onClick={() => deleteRole(role.id)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>Delete</button>
              )}
            </div>
            <div style={{ color: '#9ca3af', fontSize: 12, marginBottom: 10 }}>{role.description}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {(JSON.parse(role.permissions || '[]') as string[]).map(p => (
                <span key={p} style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#a5b4fc', borderRadius: 4, padding: '2px 6px', fontSize: 10, fontFamily: 'monospace' }}>{p}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }}>
        <div style={{ color: '#9ca3af', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>+ Create Custom Role</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <input placeholder="role_name (e.g. qa_reviewer)" value={newRole.role_name} onChange={e => setNewRole(r => ({ ...r, role_name: e.target.value }))} style={inputStyle} />
          <input placeholder="Display Name" value={newRole.display_name} onChange={e => setNewRole(r => ({ ...r, display_name: e.target.value }))} style={inputStyle} />
          <input placeholder="Description" value={newRole.description} onChange={e => setNewRole(r => ({ ...r, description: e.target.value }))} style={inputStyle} />
          <input placeholder="Permissions (comma-separated, e.g. qa:read,reports:view)" value={newRole.permissions} onChange={e => setNewRole(r => ({ ...r, permissions: e.target.value }))} style={inputStyle} />
        </div>
        <button onClick={createRole} style={{ ...btnStyle('#6366f1'), marginTop: 12 }}>Create Role</button>
      </div>
    </div>
  );

  // ── Tab: User Management ──────────────────────────────────────────────────
  const renderUsers = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <input placeholder="Search by name or email…" value={userSearch} onChange={e => setUserSearch(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
        <span style={{ color: '#6b7280', fontSize: 13, whiteSpace: 'nowrap' }}>{filteredUsers.length} users</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              {['User', 'Email', 'Current Role', 'Joined', 'Last Login', 'Change Role'].map(h => (
                <th key={h} style={{ color: '#6b7280', fontWeight: 600, textAlign: 'left', padding: '10px 12px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{u.name?.[0]?.toUpperCase() || '?'}</div>
                    <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{u.name}</span>
                  </div>
                </td>
                <td style={{ padding: '12px', color: '#9ca3af' }}>{u.email}</td>
                <td style={{ padding: '12px' }}><Badge label={u.role || 'unknown'} color={u.role === 'super_admin' ? '#f59e0b' : u.role === 'org_admin' ? '#6366f1' : '#6b7280'} /></td>
                <td style={{ padding: '12px', color: '#6b7280', fontSize: 12 }}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                <td style={{ padding: '12px', color: '#6b7280', fontSize: 12 }}>{u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}</td>
                <td style={{ padding: '12px' }}>
                  <select defaultValue={u.role} onChange={e => assignRole(u.id, e.target.value)} style={{ ...selStyle, fontSize: 12 }}>
                    {roles.map(r => <option key={r.role_name} value={r.role_name}>{r.display_name}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ── Tab: Payments ─────────────────────────────────────────────────────────
  const renderPayments = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
        <StatCard label="MRR" value={`$${Number(paymentSummary?.mrr || 0).toLocaleString()}`} icon="💰" color="#f59e0b" />
        <StatCard label="This Month" value={`$${Number(paymentSummary?.monthRevenue || 0).toLocaleString()}`} icon="📅" color="#22c55e" />
        <StatCard label="All-time Revenue" value={`$${Number(paymentSummary?.allTime || 0).toLocaleString()}`} icon="📊" color="#6366f1" />
      </div>
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }}>
        <div style={{ color: '#9ca3af', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Revenue by License Tier</div>
        <BarChart labels={(paymentSummary?.byTier || []).map((t: any) => t.license_tier)} values={(paymentSummary?.byTier || []).map((t: any) => Number(t.revenue || 0))} color="#f59e0b" height={100} />
      </div>
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }}>
        <div style={{ color: '#9ca3af', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Daily Revenue Trend (30d)</div>
        <BarChart labels={trendLabels} values={trendRevenue} color="#22c55e" height={100} />
      </div>
    </div>
  );

  // ── Tab: Licenses ─────────────────────────────────────────────────────────
  const renderLicenses = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {(overview?.licensesByTier || []).map(l => (
          <StatCard key={l.license_tier} label={l.license_tier.charAt(0).toUpperCase() + l.license_tier.slice(1)} value={`${l.count} tenants`} icon="🪪" color={TIER_COLORS[l.license_tier] || '#6b7280'} />
        ))}
      </div>
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }}>
        <div style={{ color: '#9ca3af', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>🏢 Active Tenants</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr>{['Tenant', 'Plan', 'Status', 'Contact'].map(h => <th key={h} style={{ color: '#6b7280', fontWeight: 600, textAlign: 'left', padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{h}</th>)}</tr></thead>
          <tbody>
            {tenants.map(t => (
              <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '10px 8px', color: '#e2e8f0', fontWeight: 500 }}>{t.name}</td>
                <td style={{ padding: '10px 8px' }}><Badge label={t.plan || 'starter'} color={TIER_COLORS[t.plan] || '#6b7280'} /></td>
                <td style={{ padding: '10px 8px' }}><Badge label={t.status || 'active'} color={t.status === 'active' ? '#22c55e' : '#ef4444'} /></td>
                <td style={{ padding: '10px 8px', color: '#9ca3af', fontSize: 12 }}>{t.contact_email}</td>
              </tr>
            ))}
            {tenants.length === 0 && <tr><td colSpan={4} style={{ padding: 20, color: '#6b7280', textAlign: 'center' }}>No tenants yet</td></tr>}
          </tbody>
        </table>
      </div>
      <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: 16 }}>
        <div style={{ color: '#f59e0b', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>⚠️ Expiry Monitoring</div>
        <div style={{ color: '#9ca3af', fontSize: 13 }}>Auto-trigger emails alert tenants at 30 days and 7 days before license expiry. Configure thresholds in the Auto-Triggers tab.</div>
      </div>
    </div>
  );

  // ── Tab: Customer Config Wizard ───────────────────────────────────────────
  const renderWizard = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ color: '#9ca3af', fontSize: 13 }}>Configure any tenant's limits, features, and branding without code changes. Changes take effect immediately.</div>
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }}>
        <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Step 1 — Select Tenant</div>
        <select value={wizardTenant} onChange={e => { setWizardTenant(e.target.value); if (e.target.value) loadWizardConfig(e.target.value); }} style={{ ...selStyle, minWidth: 280 }}>
          <option value="">— Choose a tenant —</option>
          {tenants.map(t => <option key={t.id} value={t.id}>{t.name} ({t.plan || 'starter'})</option>)}
        </select>
      </div>
      {wizardTenant && (
        <>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }}>
            <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Step 2 — Usage Limits</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {[{ key: 'max_users', label: 'Max Users' }, { key: 'max_projects', label: 'Max Projects' }, { key: 'max_api_calls_day', label: 'Max API Calls/Day' }, { key: 'max_ai_tokens_day', label: 'Max AI Tokens/Day' }, { key: 'data_retention_days', label: 'Data Retention (days)' }, { key: 'timezone', label: 'Timezone', text: true }].map(f => (
                <div key={f.key}>
                  <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 4 }}>{f.label}</label>
                  <input type={f.text ? 'text' : 'number'} value={(wizardConfig as any)[f.key] ?? ''} onChange={e => setWizardConfig(c => ({ ...c, [f.key]: f.text ? e.target.value : Number(e.target.value) }))} style={inputStyle} />
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }}>
            <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Step 3 — Features & Branding</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              <div>
                <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 4 }}>Custom Domain</label>
                <input value={wizardConfig.custom_domain ?? ''} onChange={e => setWizardConfig(c => ({ ...c, custom_domain: e.target.value }))} placeholder="qa.company.com" style={inputStyle} />
              </div>
              <div>
                <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 4 }}>Notification Email</label>
                <input value={wizardConfig.notification_email ?? ''} onChange={e => setWizardConfig(c => ({ ...c, notification_email: e.target.value }))} placeholder="admin@company.com" style={inputStyle} />
              </div>
              <div>
                <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 4 }}>Brand Colour</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="color" value={wizardConfig.branding_primary_color ?? '#6366f1'} onChange={e => setWizardConfig(c => ({ ...c, branding_primary_color: e.target.value }))} style={{ width: 40, height: 36, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'transparent' }} />
                  <input value={wizardConfig.branding_primary_color ?? '#6366f1'} onChange={e => setWizardConfig(c => ({ ...c, branding_primary_color: e.target.value }))} style={{ ...inputStyle, flex: 1 }} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 20 }}>
                <input type="checkbox" checked={!!wizardConfig.sso_enforced} onChange={e => setWizardConfig(c => ({ ...c, sso_enforced: e.target.checked ? 1 : 0 }))} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                <label style={{ color: '#d1d5db', fontSize: 13 }}>Enforce SSO Login</label>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={saveWizardConfig} style={btnStyle('#22c55e')}>💾 Save Configuration</button>
            <button onClick={() => { setWizardTenant(''); setWizardConfig({}); setWizardSaved(false); }} style={btnStyle('#6b7280')}>Cancel</button>
          </div>
          {wizardSaved && (
            <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, padding: 14, color: '#22c55e', fontSize: 13 }}>
              ✅ Configuration saved and applied to tenant immediately.
            </div>
          )}
        </>
      )}
    </div>
  );

  // ── Tab: Auto-Triggers ────────────────────────────────────────────────────
  const renderTriggers = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: '#9ca3af', fontSize: 13 }}>Automated emails sent when platform events occur.</div>
        <button onClick={() => setEditTrigger({ id: 'new_' + Date.now(), event_type: 'license_expiry', trigger_name: '', description: '', threshold_value: 30, threshold_unit: 'days', template_subject: '', template_body: '', recipient_type: 'tenant_admin', is_active: 1, fire_count: 0 })} style={btnStyle('#6366f1')}>+ New Trigger</button>
      </div>
      {editTrigger && (
        <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: 20 }}>
          <div style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 14 }}>{editTrigger.id.startsWith('new_') ? 'New Trigger' : 'Edit Trigger'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 4 }}>Event Type</label>
              <select value={editTrigger.event_type} onChange={e => setEditTrigger(t => t ? { ...t, event_type: e.target.value } : t)} style={selStyle}>
                <option value="license_expiry">License Expiry</option><option value="usage_spike">Usage Spike</option><option value="payment_failed">Payment Failed</option><option value="new_tenant">New Tenant</option><option value="user_limit">User Limit</option>
              </select>
            </div>
            <div><label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 4 }}>Trigger Name</label><input value={editTrigger.trigger_name} onChange={e => setEditTrigger(t => t ? { ...t, trigger_name: e.target.value } : t)} style={inputStyle} /></div>
            <div><label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 4 }}>Threshold Value</label><input type="number" value={editTrigger.threshold_value} onChange={e => setEditTrigger(t => t ? { ...t, threshold_value: Number(e.target.value) } : t)} style={inputStyle} /></div>
            <div><label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 4 }}>Threshold Unit</label>
              <select value={editTrigger.threshold_unit} onChange={e => setEditTrigger(t => t ? { ...t, threshold_unit: e.target.value } : t)} style={selStyle}>
                <option value="days">Days</option><option value="percent">Percent</option><option value="event">Event (immediate)</option>
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}><label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 4 }}>Email Subject</label><input value={editTrigger.template_subject} onChange={e => setEditTrigger(t => t ? { ...t, template_subject: e.target.value } : t)} style={inputStyle} /></div>
            <div style={{ gridColumn: '1 / -1' }}><label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 4 }}>Email Body (use {'{{tenant_name}}'}, {'{{expiry_date}}'}, {'{{limit}}'})</label><textarea value={editTrigger.template_body} onChange={e => setEditTrigger(t => t ? { ...t, template_body: e.target.value } : t)} rows={4} style={{ ...inputStyle, resize: 'vertical' as const }} /></div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button onClick={saveTrigger} style={btnStyle('#22c55e')}>Save Trigger</button>
            <button onClick={() => setEditTrigger(null)} style={btnStyle('#6b7280')}>Cancel</button>
          </div>
        </div>
      )}
      {triggers.map(t => (
        <div key={t.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.is_active ? '#22c55e' : '#6b7280' }} />
              <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 14 }}>{t.trigger_name}</span>
              <Badge label={t.event_type.replace('_', ' ')} color="#6366f1" />
            </div>
            <div style={{ color: '#9ca3af', fontSize: 12, marginBottom: 4 }}>{t.description}</div>
            <div style={{ color: '#6b7280', fontSize: 11 }}>Threshold: {t.threshold_value} {t.threshold_unit} · Fired: {t.fire_count}× {t.last_fired_at ? `· Last: ${new Date(t.last_fired_at).toLocaleDateString()}` : ''}</div>
            <div style={{ color: '#6b7280', fontSize: 11, marginTop: 2, fontStyle: 'italic' }}>Subject: {t.template_subject}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={() => testFireTrigger(t.id)} style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>Test Fire</button>
            <button onClick={() => setEditTrigger(t)} style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>Edit</button>
          </div>
        </div>
      ))}
    </div>
  );

  // ── Tab: Issue Tracker ────────────────────────────────────────────────────
  const renderIssues = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
        {[{ label: 'Total', count: issues.length, color: '#6366f1' }, { label: 'Open', count: issues.filter(i => i.status === 'open').length, color: '#ef4444' }, { label: 'In Progress', count: issues.filter(i => i.status === 'in_progress').length, color: '#f97316' }, { label: 'Resolved', count: issues.filter(i => i.status === 'resolved').length, color: '#22c55e' }, { label: 'Critical', count: issues.filter(i => i.priority === 'critical').length, color: '#ef4444' }].map(s => <StatCard key={s.label} label={s.label} value={s.count} color={s.color} />)}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <select value={issueFilter.status} onChange={e => setIssueFilter(f => ({ ...f, status: e.target.value }))} style={selStyle}>
          <option value="">All Statuses</option><option value="open">Open</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option>
        </select>
        <select value={issueFilter.priority} onChange={e => setIssueFilter(f => ({ ...f, priority: e.target.value }))} style={selStyle}>
          <option value="">All Priorities</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
        </select>
        <select value={issueFilter.category} onChange={e => setIssueFilter(f => ({ ...f, category: e.target.value }))} style={selStyle}>
          <option value="">All Categories</option><option value="integration">Integration</option><option value="ai_feature">AI Feature</option><option value="billing">Billing</option><option value="sso">SSO</option><option value="feature_request">Feature Request</option><option value="general">General</option>
        </select>
      </div>
      {filteredIssues.map(i => (
        <div key={i.id} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${PRIORITY_COLORS[i.priority]}33`, borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                <span style={{ color: '#6b7280', fontSize: 12, fontFamily: 'monospace' }}>{i.ticket_ref}</span>
                <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 14 }}>{i.title}</span>
                <Badge label={i.priority} color={PRIORITY_COLORS[i.priority]} />
                <Badge label={i.status.replace('_', ' ')} color={STATUS_COLORS[i.status]} />
                <Badge label={i.category.replace('_', ' ')} color="#6b7280" />
              </div>
              <div style={{ color: '#9ca3af', fontSize: 13, marginBottom: 4 }}>{i.description}</div>
              <div style={{ color: '#6b7280', fontSize: 11 }}>
                {i.tenant_name && <span>🏢 {i.tenant_name} · </span>}
                {i.reporter_email && <span>📧 {i.reporter_email} · </span>}
                <span>SLA: {i.sla_hours}h · {new Date(i.created_at).toLocaleDateString()}</span>
                {i.assigned_to && <span> · Assigned: {i.assigned_to}</span>}
              </div>
              {i.resolution && <div style={{ color: '#22c55e', fontSize: 12, marginTop: 4 }}>✅ {i.resolution}</div>}
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexDirection: 'column' }}>
              {i.status === 'open' && <button onClick={() => updateIssue(i.id, { status: 'in_progress' })} style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', color: '#f97316', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 11 }}>Start</button>}
              {i.status !== 'resolved' && <button onClick={() => { const res = window.prompt('Resolution notes:'); if (res) updateIssue(i.id, { status: 'resolved', resolution: res }); }} style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 11 }}>Resolve</button>}
            </div>
          </div>
        </div>
      ))}
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20, marginTop: 8 }}>
        <div style={{ color: '#9ca3af', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>+ Log New Issue</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <input placeholder="Issue title *" value={newIssue.title} onChange={e => setNewIssue(i => ({ ...i, title: e.target.value }))} style={inputStyle} />
          <input placeholder="Tenant name" value={newIssue.tenant_name} onChange={e => setNewIssue(i => ({ ...i, tenant_name: e.target.value }))} style={inputStyle} />
          <input placeholder="Reporter email" value={newIssue.reporter_email} onChange={e => setNewIssue(i => ({ ...i, reporter_email: e.target.value }))} style={inputStyle} />
          <select value={newIssue.category} onChange={e => setNewIssue(i => ({ ...i, category: e.target.value }))} style={selStyle}>
            <option value="general">General</option><option value="integration">Integration</option><option value="ai_feature">AI Feature</option><option value="billing">Billing</option><option value="sso">SSO</option><option value="feature_request">Feature Request</option>
          </select>
          <select value={newIssue.priority} onChange={e => setNewIssue(i => ({ ...i, priority: e.target.value }))} style={selStyle}>
            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
          </select>
          <input type="number" placeholder="SLA hours" value={newIssue.sla_hours} onChange={e => setNewIssue(i => ({ ...i, sla_hours: Number(e.target.value) }))} style={inputStyle} />
          <textarea placeholder="Description" value={newIssue.description} onChange={e => setNewIssue(i => ({ ...i, description: e.target.value }))} rows={2} style={{ ...inputStyle, gridColumn: '1 / -1', resize: 'vertical' as const }} />
        </div>
        <button onClick={createIssue} style={{ ...btnStyle('#6366f1'), marginTop: 12 }}>Log Issue</button>
      </div>
    </div>
  );

  // ── Tab: Active Orgs ─────────────────────────────────────────────────────
  const [orgSearch, setOrgSearch] = useState('');
  const [orgStatusFilter, setOrgStatusFilter] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<Tenant | null>(null);
  const [orgDetail, setOrgDetail] = useState<any>(null);

  const loadOrgDetail = async (orgId: string) => {
    const r = await fetch(`${API}/api/saas/tenants/${orgId}`, { headers: authH() });
    if (r.ok) setOrgDetail(await r.json());
  };

  const updateOrgStatus = async (orgId: string, status: string) => {
    const r = await fetch(`${API}/api/saas/tenants/${orgId}/status`, { method: 'PATCH', headers: authH(), body: JSON.stringify({ status }) });
    if (r.ok) { showToast(`Org status → ${status}`); fetchAll(); setOrgDetail(null); setSelectedOrg(null); } else showToast('Failed', 'error');
  };

  const filteredOrgs = tenants.filter(t =>
    (!orgSearch || t.name?.toLowerCase().includes(orgSearch.toLowerCase()) || t.contact_email?.toLowerCase().includes(orgSearch.toLowerCase())) &&
    (!orgStatusFilter || t.status === orgStatusFilter)
  );

  const STATUS_ORG_COLORS: Record<string, string> = { active: '#22c55e', trial: '#f59e0b', suspended: '#ef4444', cancelled: '#6b7280', inactive: '#6b7280' };

  const renderOrgs = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Total Orgs', value: tenants.length, color: '#6366f1', icon: '🏢' },
          { label: 'Active', value: tenants.filter(t => t.status === 'active').length, color: '#22c55e', icon: '✅' },
          { label: 'Trial', value: tenants.filter(t => t.status === 'trial').length, color: '#f59e0b', icon: '🔄' },
          { label: 'Total Users', value: tenants.reduce((s, t) => s + (t.active_users || 0), 0), color: '#a78bfa', icon: '👥' },
        ].map(k => (
          <div key={k.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 18px' }}>
            <div style={{ color: '#9ca3af', fontSize: 12, marginBottom: 4 }}>{k.icon} {k.label}</div>
            <div style={{ color: k.color, fontSize: 24, fontWeight: 700 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input placeholder="Search org name or email…" value={orgSearch} onChange={e => setOrgSearch(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 200 }} />
        <select value={orgStatusFilter} onChange={e => setOrgStatusFilter(e.target.value)} style={selStyle}>
          <option value=''>All Statuses</option>
          <option value='active'>Active</option>
          <option value='trial'>Trial</option>
          <option value='suspended'>Suspended</option>
          <option value='cancelled'>Cancelled</option>
        </select>
        <span style={{ color: '#6b7280', fontSize: 13, whiteSpace: 'nowrap' }}>{filteredOrgs.length} orgs</span>
      </div>

      {/* Orgs Table */}
      <div style={{ overflowX: 'auto', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
              {['Organisation', 'Contact', 'License Tier', 'Status', 'Users', 'Concurrent', 'Expires', 'Actions'].map(h => (
                <th key={h} style={{ color: '#6b7280', fontWeight: 600, textAlign: 'left', padding: '12px 14px', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredOrgs.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: '#6b7280' }}>No organisations found. Create one in the Customer Config tab.</td></tr>
            )}
            {filteredOrgs.map(org => (
              <tr key={org.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{org.name?.[0]?.toUpperCase() || '?'}</div>
                    <div>
                      <div style={{ color: '#e2e8f0', fontWeight: 600 }}>{org.name}</div>
                      <div style={{ color: '#6b7280', fontSize: 11 }}>{org.country || org.geo_region || 'Global'}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '14px', color: '#9ca3af', fontSize: 12 }}>{org.contact_email || '—'}</td>
                <td style={{ padding: '14px' }}>
                  <Badge label={org.pack_name || org.plan_tier || org.plan || 'No Plan'} color={TIER_COLORS[org.plan_tier || org.plan || ''] || '#6b7280'} />
                </td>
                <td style={{ padding: '14px' }}>
                  <Badge label={org.status || 'unknown'} color={STATUS_ORG_COLORS[org.status || ''] || '#6b7280'} />
                </td>
                <td style={{ padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 16 }}>{org.active_users || 0}</span>
                    <span style={{ color: '#6b7280', fontSize: 11 }}>active</span>
                  </div>
                </td>
                <td style={{ padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: (org.concurrent_now || 0) > 0 ? '#22c55e' : '#374151', boxShadow: (org.concurrent_now || 0) > 0 ? '0 0 6px #22c55e' : 'none' }} />
                    <span style={{ color: '#9ca3af', fontSize: 13 }}>{org.concurrent_now || 0} live</span>
                  </div>
                </td>
                <td style={{ padding: '14px', color: org.ends_at && new Date(org.ends_at) < new Date(Date.now() + 30*24*60*60*1000) ? '#ef4444' : '#6b7280', fontSize: 12 }}>
                  {org.ends_at ? new Date(org.ends_at).toLocaleDateString() : '—'}
                </td>
                <td style={{ padding: '14px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => { setSelectedOrg(org); loadOrgDetail(org.id); }} style={{ ...btnStyle('#6366f1'), padding: '5px 10px', fontSize: 11 }}>View</button>
                    {org.status === 'active' && <button onClick={() => updateOrgStatus(org.id, 'suspended')} style={{ ...btnStyle('#ef4444'), padding: '5px 10px', fontSize: 11 }}>Suspend</button>}
                    {org.status === 'suspended' && <button onClick={() => updateOrgStatus(org.id, 'active')} style={{ ...btnStyle('#22c55e'), padding: '5px 10px', fontSize: 11 }}>Activate</button>}
                    {org.status === 'trial' && <button onClick={() => updateOrgStatus(org.id, 'active')} style={{ ...btnStyle('#22c55e'), padding: '5px 10px', fontSize: 11 }}>Activate</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Org Detail Drawer */}
      {selectedOrg && orgDetail && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 16 }}>🏢 {selectedOrg.name} — Details</div>
            <button onClick={() => { setSelectedOrg(null); setOrgDetail(null); }} style={{ background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 18 }}>✕</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 14 }}>
              <div style={{ color: '#6b7280', fontSize: 11, marginBottom: 4 }}>SUBSCRIPTION</div>
              <div style={{ color: '#e2e8f0', fontWeight: 600 }}>{orgDetail.subscription?.pack_name || 'None'}</div>
              <div style={{ color: '#9ca3af', fontSize: 11 }}>{orgDetail.subscription?.billing_cycle || ''}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 14 }}>
              <div style={{ color: '#6b7280', fontSize: 11, marginBottom: 4 }}>SEAT USAGE</div>
              <div style={{ color: '#e2e8f0', fontWeight: 600 }}>{orgDetail.users?.length || 0} / {orgDetail.subscription?.max_users || '∞'}</div>
              <div style={{ color: '#9ca3af', fontSize: 11 }}>users / max seats</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 14 }}>
              <div style={{ color: '#6b7280', fontSize: 11, marginBottom: 4 }}>REVENUE</div>
              <div style={{ color: '#22c55e', fontWeight: 600 }}>${Number(orgDetail.subscription?.price_usd || 0).toLocaleString()}</div>
              <div style={{ color: '#9ca3af', fontSize: 11 }}>per {orgDetail.subscription?.billing_cycle || 'period'}</div>
            </div>
          </div>
          <div style={{ color: '#9ca3af', fontSize: 13, fontWeight: 600, marginBottom: 10 }}>👥 Users in this Org</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Name', 'Email', 'Role', 'Status', 'Joined'].map(h => <th key={h} style={{ color: '#6b7280', textAlign: 'left', padding: '8px 10px' }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {(orgDetail.users || []).map((u: any) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '8px 10px', color: '#e2e8f0' }}>{u.name || '—'}</td>
                    <td style={{ padding: '8px 10px', color: '#9ca3af' }}>{u.email}</td>
                    <td style={{ padding: '8px 10px' }}><Badge label={u.role || 'member'} color='#6366f1' /></td>
                    <td style={{ padding: '8px 10px' }}><Badge label={u.status || 'active'} color={STATUS_ORG_COLORS[u.status || 'active'] || '#22c55e'} /></td>
                    <td style={{ padding: '8px 10px', color: '#6b7280' }}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
                {(!orgDetail.users || orgDetail.users.length === 0) && (
                  <tr><td colSpan={5} style={{ padding: 16, color: '#6b7280', textAlign: 'center' }}>No users in this org yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const tabContent: Record<string, () => JSX.Element> = { overview: renderOverview, orgs: renderOrgs, analytics: renderAnalytics, rbac: renderRbac, users: renderUsers, payments: renderPayments, licenses: renderLicenses, wizard: renderWizard, triggers: renderTriggers, issues: renderIssues };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)', color: '#e2e8f0', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${toast.type === 'success' ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`, borderRadius: 10, padding: '12px 20px', color: toast.type === 'success' ? '#22c55e' : '#ef4444', fontSize: 14, fontWeight: 500, backdropFilter: 'blur(10px)' }}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
        </div>
      )}
      <div style={{ padding: '20px 28px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #f59e0b, #ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>👑</div>
          <div>
            <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 18 }}>Super Admin</div>
            <div style={{ color: '#6b7280', fontSize: 12 }}>SaaS Business Control Plane</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
          <span style={{ color: '#22c55e', fontSize: 12, fontWeight: 600 }}>LIVE</span>
          <button onClick={fetchAll} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 14px', color: '#9ca3af', cursor: 'pointer', fontSize: 12 }}>{loading ? '⟳ Loading…' : '↻ Refresh'}</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 2, padding: '0 28px', borderBottom: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ background: activeTab === tab.id ? 'rgba(99,102,241,0.15)' : 'transparent', border: 'none', borderBottom: activeTab === tab.id ? '2px solid #6366f1' : '2px solid transparent', color: activeTab === tab.id ? '#a5b4fc' : '#6b7280', padding: '14px 16px', cursor: 'pointer', fontSize: 13, fontWeight: activeTab === tab.id ? 600 : 400, whiteSpace: 'nowrap' }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>
      <div style={{ padding: '24px 28px', maxWidth: 1200, margin: '0 auto' }}>
        {tabContent[activeTab] ? tabContent[activeTab]() : null}
      </div>
    </div>
  );
}
