import React, { useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface OrgAdmin {
  id: string; name: string; email: string; phone?: string; company: string;
  country?: string; timezone?: string; status: string;
  pack_name?: string; pack_tier?: string; pack_price?: number;
  max_users?: number; active_users?: number; total_users?: number;
  license_fee_usd?: number; billing_cycle?: string;
  next_billing_date?: string; activation_date?: string;
  pending_requests?: number; tenant_status?: string; created_at?: string;
}
interface OrgAdminDetail extends OrgAdmin {
  features?: string;
  trend: { metric_date: string; peak_concurrent: number; total_api_calls: number; ai_tokens_used: number; test_runs: number; }[];
  licenseRequests: LicenseRequest[];
  invoices: { id: string; invoice_number: string; status: string; total: number; currency: string; created_at: string; }[];
  users: { id: string; name: string; email: string; role: string; status: string; last_active?: string; created_at: string; }[];
}
interface LicenseRequest {
  id: string; tenant_id: string; tenant_name: string; requested_by: string;
  request_type: string; current_seats: number; requested_seats: number;
  reason?: string; status: string; created_at: string;
}
interface LicensePack { id: string; name: string; tier: string; price_usd: number; max_users: number; billing_cycle: string; }
interface OverviewStats { totalTenants: number; totalUsers: number; mrr: number; allTimeRevenue: number; apiCallsToday: number; openIssues: number; }
interface User { id: string; name: string; email: string; role: string; created_at: string; }
interface Issue { id: string; ticket_ref: string; tenant_name: string; title: string; priority: string; status: string; created_at: string; }
interface EmailTrigger { id: string; trigger_name: string; description: string; event_type: string; is_active: number; fire_count: number; last_fired_at?: string; }
interface AnalyticsTrend { date: string; api_calls: number; active_users: number; revenue: number; }

// ─── Nav items ────────────────────────────────────────────────────────────────
const NAV = [
  { id: 'overview',  label: 'Dashboard',          icon: '📊', section: 'OVERVIEW' },
  { id: 'org-admins',label: 'Org Admin Management',icon: '🏢', section: 'ORGANISATIONS' },
  { id: 'analytics', label: 'Analytics & Trends',  icon: '📈', section: 'ANALYTICS' },
  { id: 'users',     label: 'User Management',     icon: '👥', section: 'ANALYTICS' },
  { id: 'rbac',      label: 'RBAC & Permissions',  icon: '🔐', section: 'SECURITY' },
  { id: 'payments',  label: 'Payments & Invoices', icon: '💳', section: 'BILLING' },
  { id: 'licenses',  label: 'Licenses & Expiry',   icon: '🪪', section: 'BILLING' },
  { id: 'triggers',  label: 'Auto-Triggers',       icon: '🔔', section: 'AUTOMATION' },
  { id: 'wizard',    label: 'Customer Config',     icon: '⚙️', section: 'AUTOMATION' },
  { id: 'issues',    label: 'Issue Tracker',       icon: '🎫', section: 'SUPPORT' },
];

const S: Record<string, React.CSSProperties> = {
  shell:   { display:'flex', height:'100vh', background:'#f5f7fa', color:'#1a202c', fontFamily:'Inter,system-ui,sans-serif', overflow:'hidden' },
  sidebar: { width:220, minWidth:220, background:'#1a1f2e', borderRight:'1px solid #e5e7eb', display:'flex', flexDirection:'column', overflowY:'auto' },
  sideTop: { padding:'20px 16px 12px', borderBottom:'1px solid #334155' },
  sideTitle:{ fontSize:13, fontWeight:700, color:'#fff', letterSpacing:1, textTransform:'uppercase' },
  sideSubt: { fontSize:11, color:'#9ca3af', marginTop:2 },
  sideSection:{ fontSize:10, fontWeight:700, color:'#6b7280', letterSpacing:1, textTransform:'uppercase', padding:'14px 16px 4px' },
  navItem: { display:'flex', alignItems:'center', gap:9, padding:'8px 16px', cursor:'pointer', borderRadius:6, margin:'1px 8px', fontSize:13, color:'#9ca3af', transition:'all .15s' },
  navActive:{ background:'#0d9488', color:'#fff', fontWeight:600 },
  main:    { flex:1, display:'flex', flexDirection:'column', overflow:'hidden' },
  topbar:  { background:'#fff', borderBottom:'1px solid #e5e7eb', padding:'12px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' },
  topTitle:{ fontSize:16, fontWeight:700, color:'#1a202c' },
  topSub:  { fontSize:12, color:'#6b7280', marginTop:2 },
  content: { flex:1, overflowY:'auto', padding:24, background:'#f9fafb' },
  card:    { background:'#fff', border:'1px solid #e5e7eb', borderRadius:10, padding:20 },
  kpiGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:14, marginBottom:20 },
  kpi:     { background:'#fff', border:'1px solid #e5e7eb', borderRadius:8, padding:'14px 16px' },
  kpiVal:  { fontSize:24, fontWeight:700, color:'#0d9488' },
  kpiLbl:  { fontSize:11, color:'#6b7280', marginTop:3, textTransform:'uppercase', letterSpacing:.5 },
  table:   { width:'100%', borderCollapse:'collapse' as const, fontSize:13 },
  th:      { textAlign:'left' as const, padding:'8px 12px', color:'#6b7280', fontWeight:600, fontSize:11, textTransform:'uppercase' as const, letterSpacing:.5, borderBottom:'1px solid #e5e7eb' },
  td:      { padding:'10px 12px', borderBottom:'1px solid #f3f4f6', color:'#374151', verticalAlign:'middle' as const },
  badge:   { display:'inline-block', padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600 },
  btn:     { padding:'7px 14px', borderRadius:6, border:'none', cursor:'pointer', fontSize:12, fontWeight:600 },
  btnPrimary:{ background:'#0d9488', color:'#fff' },
  btnGhost:{ background:'transparent', color:'#6b7280', border:'1px solid #e5e7eb' },
  btnGreen:{ background:'#16a34a', color:'#fff' },
  btnRed:  { background:'#dc2626', color:'#fff' },
  input:   { background:'#fff', border:'1px solid #e5e7eb', borderRadius:6, padding:'8px 12px', color:'#1a202c', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box' as const },
  label:   { fontSize:12, color:'#6b7280', marginBottom:4, display:'block' },
  formGrid:{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 },
  section: { marginBottom:20 },
  sectionTitle:{ fontSize:14, fontWeight:700, color:'#1a202c', marginBottom:12, paddingBottom:8, borderBottom:'1px solid #e5e7eb' },
  bar:     { height:6, borderRadius:3, background:'#e5e7eb', overflow:'hidden', marginTop:4 },
  barFill: { height:'100%', borderRadius:3, background:'#0d9488', transition:'width .3s' },
  miniChart:{ display:'flex', alignItems:'flex-end', gap:2, height:40 },
  miniBar: { flex:1, borderRadius:2, minWidth:4, background:'#0d9488', opacity:.7 },
};

function statusBadge(status: string) {
  const map: Record<string,string> = { active:'#16a34a', suspended:'#dc2626', trial:'#d97706', cancelled:'#6b7280', pending:'#d97706', approved:'#16a34a', rejected:'#dc2626', paid:'#16a34a', overdue:'#dc2626', draft:'#6b7280', sent:'#3b82f6' };
  return <span style={{...S.badge, background:(map[status]||'#6b7280')+'22', color:map[status]||'#6b7280', border:`1px solid ${(map[status]||'#6b7280')}44`}}>{status}</span>;
}
function tierBadge(tier: string) {
  const map: Record<string,string> = { starter:'#22c55e', professional:'#3b82f6', enterprise:'#8b5cf6', custom:'#f97316' };
  return <span style={{...S.badge, background:(map[tier]||'#6b7280')+'22', color:map[tier]||'#6b7280', border:`1px solid ${(map[tier]||'#6b7280')}44`}}>{tier||'—'}</span>;
}
function fmt(n: number, prefix='$') { return `${prefix}${n?.toLocaleString()||0}`; }
function fmtDate(d?: string) { return d ? new Date(d).toLocaleDateString() : '—'; }

// ─── Mini sparkline ───────────────────────────────────────────────────────────
function Sparkline({ data, color='#6366f1' }: { data: number[]; color?: string }) {
  if (!data.length) return <span style={{color:'#475569',fontSize:11}}>No data</span>;
  const max = Math.max(...data, 1);
  return (
    <div style={S.miniChart}>
      {data.map((v,i) => (
        <div key={i} style={{...S.miniBar, height:`${Math.max(4,(v/max)*40)}px`, background:color, opacity:.8}} />
      ))}
    </div>
  );
}

// ─── Create Org Admin Wizard ──────────────────────────────────────────────────
function CreateOrgAdminWizard({ token, packs, onCreated, onCancel }: {
  token: string; packs: LicensePack[]; onCreated: () => void; onCancel: () => void;
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name:'', email:'', password:'', phone:'', company:'', country:'US', timezone:'UTC', license_pack_id:'', billing_cycle:'monthly', notes:'' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm(f => ({...f, [k]:v}));
  const selectedPack = packs.find(p => p.id === form.license_pack_id);

  const submit = async () => {
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/saas/org-admins', {
        method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
        body: JSON.stringify(form)
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      onCreated();
    } catch(e: any) { setError(e.message); }
    setLoading(false);
  };

  const COUNTRIES = ['US','GB','IN','AU','CA','SG','AE','DE','FR','JP','BR','MX','ZA'];
  const TIMEZONES = ['UTC','America/New_York','America/Los_Angeles','Europe/London','Europe/Berlin','Asia/Kolkata','Asia/Singapore','Asia/Tokyo','Australia/Sydney'];

  return (
    <div style={{...S.card, maxWidth:640, margin:'0 auto'}}>
      {/* Steps */}
      <div style={{display:'flex', gap:8, marginBottom:24}}>
        {['Admin Details','Organisation','License & Billing','Review'].map((s,i) => (
          <div key={i} style={{flex:1, textAlign:'center', padding:'8px 4px', borderRadius:6, fontSize:12, fontWeight:600,
            background: step===i+1 ? '#6366f1' : step>i+1 ? '#16a34a22' : '#0f172a',
            color: step===i+1 ? '#fff' : step>i+1 ? '#16a34a' : '#475569',
            border: `1px solid ${step===i+1 ? '#6366f1' : step>i+1 ? '#16a34a44' : '#334155'}`
          }}>
            <div style={{fontSize:16}}>{step>i+1?'✓':i+1}</div>
            <div>{s}</div>
          </div>
        ))}
      </div>

      {error && <div style={{background:'#dc262622',border:'1px solid #dc262644',borderRadius:6,padding:'8px 12px',color:'#f87171',marginBottom:16,fontSize:13}}>{error}</div>}

      {step===1 && (
        <div>
          <div style={S.sectionTitle}>Admin Contact Details</div>
          <div style={S.formGrid}>
            <div><label style={S.label}>Full Name *</label><input style={S.input} value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Jane Smith" /></div>
            <div><label style={S.label}>Email Address *</label><input style={S.input} type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="jane@company.com" /></div>
            <div><label style={S.label}>Password (leave blank for default)</label><input style={S.input} type="password" value={form.password} onChange={e=>set('password',e.target.value)} placeholder="EdgeQI2026!" /></div>
            <div><label style={S.label}>Phone</label><input style={S.input} value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="+1 555 000 0000" /></div>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',marginTop:20}}>
            <button style={{...S.btn,...S.btnPrimary}} onClick={()=>{ if(!form.name||!form.email){setError('Name and email required');return;} setError(''); setStep(2); }}>Next →</button>
          </div>
        </div>
      )}

      {step===2 && (
        <div>
          <div style={S.sectionTitle}>Organisation Details</div>
          <div style={S.formGrid}>
            <div><label style={S.label}>Company Name *</label><input style={S.input} value={form.company} onChange={e=>set('company',e.target.value)} placeholder="Acme Corp" /></div>
            <div><label style={S.label}>Country</label>
              <select style={{...S.input}} value={form.country} onChange={e=>set('country',e.target.value)}>
                {COUNTRIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><label style={S.label}>Timezone</label>
              <select style={{...S.input}} value={form.timezone} onChange={e=>set('timezone',e.target.value)}>
                {TIMEZONES.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:20}}>
            <button style={{...S.btn,...S.btnGhost}} onClick={()=>setStep(1)}>← Back</button>
            <button style={{...S.btn,...S.btnPrimary}} onClick={()=>{ if(!form.company){setError('Company required');return;} setError(''); setStep(3); }}>Next →</button>
          </div>
        </div>
      )}

      {step===3 && (
        <div>
          <div style={S.sectionTitle}>License & Billing</div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginBottom:16}}>
            {packs.map(p => (
              <div key={p.id} onClick={()=>set('license_pack_id',p.id)} style={{
                border:`2px solid ${form.license_pack_id===p.id?'#6366f1':'#334155'}`,
                borderRadius:8, padding:14, cursor:'pointer',
                background: form.license_pack_id===p.id ? '#6366f122' : '#0f172a'
              }}>
                <div style={{fontWeight:700,color:'#e2e8f0',fontSize:13}}>{p.name}</div>
                <div style={{color:'#6366f1',fontSize:18,fontWeight:700,marginTop:4}}>${p.price_usd}<span style={{fontSize:11,color:'#64748b'}}>/{p.billing_cycle}</span></div>
                <div style={{fontSize:11,color:'#64748b',marginTop:4}}>Up to {p.max_users} users</div>
              </div>
            ))}
          </div>
          <div><label style={S.label}>Billing Cycle</label>
            <select style={{...S.input, width:'auto'}} value={form.billing_cycle} onChange={e=>set('billing_cycle',e.target.value)}>
              <option value="monthly">Monthly</option>
              <option value="annual">Annual (2 months free)</option>
            </select>
          </div>
          <div style={{marginTop:12}}><label style={S.label}>Notes (internal)</label>
            <textarea style={{...S.input, height:60, resize:'none' as const}} value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Optional notes..." />
          </div>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:20}}>
            <button style={{...S.btn,...S.btnGhost}} onClick={()=>setStep(2)}>← Back</button>
            <button style={{...S.btn,...S.btnPrimary}} onClick={()=>setStep(4)}>Next →</button>
          </div>
        </div>
      )}

      {step===4 && (
        <div>
          <div style={S.sectionTitle}>Review & Confirm</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
            {[
              ['Name', form.name], ['Email', form.email], ['Phone', form.phone||'—'],
              ['Company', form.company], ['Country', form.country], ['Timezone', form.timezone],
              ['License', selectedPack?.name||'Default (Starter)'], ['Billing', form.billing_cycle],
              ['Monthly Fee', selectedPack ? `$${selectedPack.price_usd}` : '—'],
              ['Max Users', selectedPack?.max_users?.toString()||'5'],
            ].map(([k,v]) => (
              <div key={k} style={{background:'#0f172a',borderRadius:6,padding:'10px 12px'}}>
                <div style={{fontSize:11,color:'#64748b',marginBottom:2}}>{k}</div>
                <div style={{fontSize:13,color:'#e2e8f0',fontWeight:600}}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:20}}>
            <button style={{...S.btn,...S.btnGhost}} onClick={()=>setStep(3)}>← Back</button>
            <button style={{...S.btn,...S.btnGreen}} disabled={loading} onClick={submit}>
              {loading ? 'Creating…' : '✓ Create Org Admin'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Org Admin Detail Page ────────────────────────────────────────────────────
function OrgAdminDetail({ oa, token, packs, onBack, onRefresh }: {
  oa: OrgAdminDetail; token: string; packs: LicensePack[]; onBack: () => void; onRefresh: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'overview'|'users'|'licenses'|'invoices'|'usage'>('overview');
  const [loading, setLoading] = useState(false);

  const toggle = async (action: 'activate'|'suspend') => {
    setLoading(true);
    await fetch(`/api/saas/org-admins/${oa.id}/activate`, {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
      body: JSON.stringify({ action })
    });
    onRefresh(); setLoading(false);
  };

  const handleLR = async (id: string, status: 'approved'|'rejected') => {
    await fetch(`/api/saas/license-requests/${id}`, {
      method:'PATCH', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
      body: JSON.stringify({ status })
    });
    onRefresh();
  };

  const trendApiCalls = oa.trend.map(t => t.total_api_calls);
  const trendTests = oa.trend.map(t => t.test_runs);
  const trendConcurrent = oa.trend.map(t => t.peak_concurrent);
  const maxUsers = oa.max_users || 5;
  const usedPct = Math.min(100, Math.round(((oa.active_users||0)/maxUsers)*100));

  const DETAIL_TABS = ['overview','users','licenses','invoices','usage'];

  return (
    <div>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
        <button style={{...S.btn,...S.btnGhost,padding:'6px 12px'}} onClick={onBack}>← Back</button>
        <div style={{flex:1}}>
          <div style={{fontSize:18,fontWeight:700,color:'#f1f5f9'}}>{oa.company}</div>
          <div style={{fontSize:12,color:'#64748b'}}>{oa.name} · {oa.email} · {oa.country}</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          {statusBadge(oa.status)}
          {oa.status === 'active'
            ? <button style={{...S.btn,...S.btnRed}} disabled={loading} onClick={()=>toggle('suspend')}>Suspend</button>
            : <button style={{...S.btn,...S.btnGreen}} disabled={loading} onClick={()=>toggle('activate')}>Activate</button>
          }
        </div>
      </div>

      {/* KPI strip */}
      <div style={S.kpiGrid}>
        {[
          { label:'License Plan', val: oa.pack_name||'—', color:'#6366f1' },
          { label:'Monthly Fee', val: `$${oa.license_fee_usd||0}`, color:'#22c55e' },
          { label:'Users', val: `${oa.active_users||0} / ${maxUsers}`, color:'#f97316' },
          { label:'Next Billing', val: fmtDate(oa.next_billing_date), color:'#eab308' },
          { label:'Activated', val: fmtDate(oa.activation_date), color:'#3b82f6' },
          { label:'Pending Requests', val: String(oa.pending_requests||0), color: (oa.pending_requests||0)>0?'#f97316':'#22c55e' },
        ].map(k => (
          <div key={k.label} style={S.kpi}>
            <div style={{...S.kpiVal, color:k.color, fontSize:18}}>{k.val}</div>
            <div style={S.kpiLbl}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Seat usage bar */}
      <div style={{...S.card, marginBottom:16, padding:'12px 16px'}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
          <span style={{fontSize:12,color:'#94a3b8',fontWeight:600}}>License Seat Usage</span>
          <span style={{fontSize:12,color: usedPct>80?'#f97316':'#22c55e',fontWeight:700}}>{oa.active_users||0} / {maxUsers} seats ({usedPct}%)</span>
        </div>
        <div style={S.bar}><div style={{...S.barFill, width:`${usedPct}%`, background: usedPct>80?'#f97316':'#6366f1'}} /></div>
      </div>

      {/* Inner tabs */}
      <div style={{display:'flex',gap:4,marginBottom:16,borderBottom:'1px solid #334155',paddingBottom:0}}>
        {DETAIL_TABS.map(t => (
          <button key={t} onClick={()=>setActiveTab(t as any)} style={{
            ...S.btn, background:'transparent', color: activeTab===t?'#6366f1':'#64748b',
            borderBottom: activeTab===t?'2px solid #6366f1':'2px solid transparent',
            borderRadius:0, padding:'8px 16px', textTransform:'capitalize' as const
          }}>{t}</button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab==='overview' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div style={S.card}>
            <div style={S.sectionTitle}>API Calls (30d)</div>
            <Sparkline data={trendApiCalls} color="#6366f1" />
            <div style={{fontSize:22,fontWeight:700,color:'#6366f1',marginTop:8}}>{trendApiCalls.reduce((a,b)=>a+b,0).toLocaleString()}</div>
          </div>
          <div style={S.card}>
            <div style={S.sectionTitle}>Test Runs (30d)</div>
            <Sparkline data={trendTests} color="#22c55e" />
            <div style={{fontSize:22,fontWeight:700,color:'#22c55e',marginTop:8}}>{trendTests.reduce((a,b)=>a+b,0).toLocaleString()}</div>
          </div>
          <div style={S.card}>
            <div style={S.sectionTitle}>Peak Concurrent (30d)</div>
            <Sparkline data={trendConcurrent} color="#f97316" />
            <div style={{fontSize:22,fontWeight:700,color:'#f97316',marginTop:8}}>{Math.max(...trendConcurrent,0)}</div>
          </div>
          <div style={S.card}>
            <div style={S.sectionTitle}>Admin Details</div>
            {[['Email',oa.email],['Phone',oa.phone||'—'],['Country',oa.country||'—'],['Timezone',oa.timezone||'—'],['Billing Cycle',oa.billing_cycle||'—']].map(([k,v])=>(
              <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid #1e293b',fontSize:12}}>
                <span style={{color:'#64748b'}}>{k}</span><span style={{color:'#e2e8f0'}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users tab */}
      {activeTab==='users' && (
        <div style={S.card}>
          <div style={S.sectionTitle}>Org Users ({oa.users.length})</div>
          {oa.users.length === 0 ? <div style={{color:'#475569',fontSize:13,textAlign:'center',padding:20}}>No users yet</div> : (
            <table style={S.table}>
              <thead><tr>{['Name','Email','Role','Status','Joined','Last Active'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>{oa.users.map(u=>(
                <tr key={u.id}>
                  <td style={S.td}>{u.name}</td>
                  <td style={S.td}>{u.email}</td>
                  <td style={S.td}><span style={{...S.badge,background:'#6366f122',color:'#818cf8',border:'1px solid #6366f144'}}>{u.role}</span></td>
                  <td style={S.td}>{statusBadge(u.status)}</td>
                  <td style={S.td}>{fmtDate(u.created_at)}</td>
                  <td style={S.td}>{u.last_active ? fmtDate(u.last_active) : '—'}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      )}

      {/* Licenses tab */}
      {activeTab==='licenses' && (
        <div>
          <div style={{...S.card, marginBottom:16}}>
            <div style={S.sectionTitle}>Current License</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
              {[['Plan',oa.pack_name||'—'],['Tier',oa.pack_tier||'—'],['Monthly Fee',`$${oa.license_fee_usd||0}`],['Max Users',String(oa.max_users||0)],['Active Users',String(oa.active_users||0)],['Billing Cycle',oa.billing_cycle||'—']].map(([k,v])=>(
                <div key={k} style={{background:'#0f172a',borderRadius:6,padding:'10px 12px'}}>
                  <div style={{fontSize:11,color:'#64748b'}}>{k}</div>
                  <div style={{fontSize:14,fontWeight:700,color:'#e2e8f0',marginTop:2}}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={S.card}>
            <div style={S.sectionTitle}>License Requests ({oa.licenseRequests.length})</div>
            {oa.licenseRequests.length === 0 ? <div style={{color:'#475569',fontSize:13,textAlign:'center',padding:20}}>No requests</div> : (
              <table style={S.table}>
                <thead><tr>{['Type','Current','Requested','Reason','Status','Date','Actions'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>{oa.licenseRequests.map(lr=>(
                  <tr key={lr.id}>
                    <td style={S.td}>{lr.request_type}</td>
                    <td style={S.td}>{lr.current_seats}</td>
                    <td style={S.td}><strong style={{color:'#6366f1'}}>{lr.requested_seats}</strong></td>
                    <td style={S.td}>{lr.reason||'—'}</td>
                    <td style={S.td}>{statusBadge(lr.status)}</td>
                    <td style={S.td}>{fmtDate(lr.created_at)}</td>
                    <td style={S.td}>
                      {lr.status==='pending' && (
                        <div style={{display:'flex',gap:6}}>
                          <button style={{...S.btn,...S.btnGreen,padding:'4px 10px',fontSize:11}} onClick={()=>handleLR(lr.id,'approved')}>Approve</button>
                          <button style={{...S.btn,...S.btnRed,padding:'4px 10px',fontSize:11}} onClick={()=>handleLR(lr.id,'rejected')}>Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Invoices tab */}
      {activeTab==='invoices' && (
        <div style={S.card}>
          <div style={S.sectionTitle}>Invoice History</div>
          {oa.invoices.length === 0 ? <div style={{color:'#475569',fontSize:13,textAlign:'center',padding:20}}>No invoices</div> : (
            <table style={S.table}>
              <thead><tr>{['Invoice #','Status','Amount','Currency','Date'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>{oa.invoices.map(inv=>(
                <tr key={inv.id}>
                  <td style={S.td}><span style={{color:'#6366f1',fontWeight:600}}>{inv.invoice_number}</span></td>
                  <td style={S.td}>{statusBadge(inv.status)}</td>
                  <td style={S.td}><strong>${inv.total?.toLocaleString()}</strong></td>
                  <td style={S.td}>{inv.currency}</td>
                  <td style={S.td}>{fmtDate(inv.created_at)}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      )}

      {/* Usage tab */}
      {activeTab==='usage' && (
        <div style={S.card}>
          <div style={S.sectionTitle}>Usage Trend (Last 30 Days)</div>
          {oa.trend.length === 0 ? (
            <div style={{color:'#475569',fontSize:13,textAlign:'center',padding:20}}>No usage data yet — data appears once the org starts using the platform</div>
          ) : (
            <table style={S.table}>
              <thead><tr>{['Date','API Calls','Test Runs','Peak Concurrent','AI Tokens'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>{oa.trend.map(t=>(
                <tr key={t.metric_date}>
                  <td style={S.td}>{t.metric_date}</td>
                  <td style={S.td}>{t.total_api_calls.toLocaleString()}</td>
                  <td style={S.td}>{t.test_runs.toLocaleString()}</td>
                  <td style={S.td}>{t.peak_concurrent}</td>
                  <td style={S.td}>{t.ai_tokens_used.toLocaleString()}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Org Admin Management List ────────────────────────────────────────────────
function OrgAdminManagement({ token, packs }: { token: string; packs: LicensePack[] }) {
  const [view, setView] = useState<'list'|'create'|'detail'>('list');
  const [orgAdmins, setOrgAdmins] = useState<OrgAdmin[]>([]);
  const [selected, setSelected] = useState<OrgAdminDetail|null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/saas/org-admins', { headers:{'Authorization':`Bearer ${token}`} });
      setOrgAdmins(await r.json());
    } catch {}
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (id: string) => {
    const r = await fetch(`/api/saas/org-admins/${id}`, { headers:{'Authorization':`Bearer ${token}`} });
    const d = await r.json();
    setSelected(d); setView('detail');
  };

  const filtered = orgAdmins.filter(o => {
    const q = search.toLowerCase();
    const matchQ = !q || o.name.toLowerCase().includes(q) || o.email.toLowerCase().includes(q) || o.company.toLowerCase().includes(q);
    const matchS = filterStatus==='all' || o.status===filterStatus;
    return matchQ && matchS;
  });

  if (view==='create') return <CreateOrgAdminWizard token={token} packs={packs} onCreated={()=>{ load(); setView('list'); }} onCancel={()=>setView('list')} />;
  if (view==='detail' && selected) return <OrgAdminDetail oa={selected} token={token} packs={packs} onBack={()=>setView('list')} onRefresh={()=>openDetail(selected.id)} />;

  const totalFee = orgAdmins.reduce((a,o)=>a+(o.license_fee_usd||0),0);
  const activeCount = orgAdmins.filter(o=>o.status==='active').length;
  const pendingReqs = orgAdmins.reduce((a,o)=>a+(o.pending_requests||0),0);

  return (
    <div>
      {/* KPIs */}
      <div style={S.kpiGrid}>
        {[
          { label:'Total Org Admins', val: String(orgAdmins.length), color:'#6366f1' },
          { label:'Active', val: String(activeCount), color:'#22c55e' },
          { label:'Monthly Revenue', val: `$${totalFee.toLocaleString()}`, color:'#f97316' },
          { label:'Pending License Requests', val: String(pendingReqs), color: pendingReqs>0?'#eab308':'#22c55e' },
        ].map(k=>(
          <div key={k.label} style={S.kpi}>
            <div style={{...S.kpiVal,color:k.color}}>{k.val}</div>
            <div style={S.kpiLbl}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{display:'flex',gap:10,marginBottom:16,alignItems:'center'}}>
        <input style={{...S.input,flex:1,maxWidth:280}} placeholder="Search by name, email, company…" value={search} onChange={e=>setSearch(e.target.value)} />
        <select style={{...S.input,width:'auto'}} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="trial">Trial</option>
        </select>
        <button style={{...S.btn,...S.btnGhost}} onClick={load}>⟳ Refresh</button>
        <button style={{...S.btn,...S.btnPrimary}} onClick={()=>setView('create')}>+ New Org Admin</button>
      </div>

      {/* Table */}
      <div style={S.card}>
        {loading ? <div style={{textAlign:'center',padding:30,color:'#64748b'}}>Loading…</div> : (
          <table style={S.table}>
            <thead>
              <tr>{['Organisation','Admin','Email','License Plan','Users','Monthly Fee','Status','Requests','Activated','Actions'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.length===0 ? (
                <tr><td colSpan={10} style={{...S.td,textAlign:'center',color:'#475569',padding:30}}>
                  {orgAdmins.length===0 ? 'No org admins yet. Click "+ New Org Admin" to create the first one.' : 'No results match your search.'}
                </td></tr>
              ) : filtered.map(o => (
                <tr key={o.id} style={{cursor:'pointer'}} onMouseEnter={e=>(e.currentTarget.style.background='#0f172a')} onMouseLeave={e=>(e.currentTarget.style.background='')}>
                  <td style={S.td}><strong style={{color:'#e2e8f0'}}>{o.company}</strong><div style={{fontSize:11,color:'#64748b'}}>{o.country}</div></td>
                  <td style={S.td}>{o.name}</td>
                  <td style={S.td}>{o.email}</td>
                  <td style={S.td}>
                    {tierBadge(o.pack_tier||'')}
                    <div style={{fontSize:11,color:'#64748b',marginTop:2}}>{o.pack_name||'—'}</div>
                  </td>
                  <td style={S.td}>
                    <div style={{fontSize:13,fontWeight:600,color: (o.active_users||0)>=(o.max_users||5)*0.8?'#f97316':'#e2e8f0'}}>{o.active_users||0}/{o.max_users||5}</div>
                    <div style={S.bar}><div style={{...S.barFill,width:`${Math.min(100,((o.active_users||0)/(o.max_users||5))*100)}%`}} /></div>
                  </td>
                  <td style={S.td}><strong style={{color:'#22c55e'}}>${o.license_fee_usd||0}</strong><div style={{fontSize:11,color:'#64748b'}}>{o.billing_cycle}</div></td>
                  <td style={S.td}>{statusBadge(o.status)}</td>
                  <td style={S.td}>
                    {(o.pending_requests||0)>0
                      ? <span style={{...S.badge,background:'#f9731622',color:'#f97316',border:'1px solid #f9731644'}}>{o.pending_requests} pending</span>
                      : <span style={{color:'#475569',fontSize:11}}>—</span>
                    }
                  </td>
                  <td style={S.td}>{fmtDate(o.activation_date)}</td>
                  <td style={S.td}>
                    <button style={{...S.btn,...S.btnPrimary,padding:'5px 12px',fontSize:11}} onClick={()=>openDetail(o.id)}>View →</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Simple stub sections ─────────────────────────────────────────────────────
function OverviewSection({ token }: { token: string }) {
  const [stats, setStats] = useState<OverviewStats|null>(null);
  useEffect(() => {
    fetch('/api/saas/analytics/overview', { headers:{'Authorization':`Bearer ${token}`} })
      .then(r=>r.json()).then(setStats).catch(()=>{});
  }, [token]);
  if (!stats) return <div style={{color:'#64748b',textAlign:'center',padding:40}}>Loading…</div>;
  return (
    <div>
      <div style={S.kpiGrid}>
        {[
          { label:'Total Tenants', val: String(stats.totalTenants||0), color:'#6366f1' },
          { label:'Total Users', val: String(stats.totalUsers||0), color:'#22c55e' },
          { label:'MRR', val: `$${(stats.mrr||0).toLocaleString()}`, color:'#f97316' },
          { label:'All-Time Revenue', val: `$${(stats.allTimeRevenue||0).toLocaleString()}`, color:'#eab308' },
          { label:'API Calls Today', val: (stats.apiCallsToday||0).toLocaleString(), color:'#3b82f6' },
          { label:'Open Issues', val: String(stats.openIssues||0), color: (stats.openIssues||0)>0?'#ef4444':'#22c55e' },
        ].map(k=>(
          <div key={k.label} style={S.kpi}>
            <div style={{...S.kpiVal,color:k.color}}>{k.val}</div>
            <div style={S.kpiLbl}>{k.label}</div>
          </div>
        ))}
      </div>
      <div style={{...S.card,marginTop:16}}>
        <div style={S.sectionTitle}>License Distribution</div>
        {(stats.licensesByTier||[]).map((t:any) => (
          <div key={t.license_tier} style={{marginBottom:10}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}>
              <span style={{color:'#94a3b8'}}>{t.license_tier||'unknown'}</span>
              <span style={{color:'#e2e8f0',fontWeight:600}}>{t.count}</span>
            </div>
            <div style={S.bar}><div style={{...S.barFill,width:`${Math.min(100,(t.count/Math.max(stats.totalTenants,1))*100)}%`}} /></div>
          </div>
        ))}
        {!(stats.licensesByTier||[]).length && <div style={{color:'#475569',fontSize:13}}>No tenants yet</div>}
      </div>
    </div>
  );
}

function UsersSection({ token }: { token: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setLoading(true);
    fetch('/api/saas/users', { headers:{'Authorization':`Bearer ${token}`} })
      .then(r=>r.json()).then(d=>setUsers(Array.isArray(d)?d:d.users||[])).catch(()=>{})
      .finally(()=>setLoading(false));
  }, [token]);
  const promote = async (id: string, role: string) => {
    await fetch(`/api/saas/users/${id}/promote`, { method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`}, body:JSON.stringify({role}) });
    const r = await fetch('/api/saas/users', { headers:{'Authorization':`Bearer ${token}`} });
    const d = await r.json(); setUsers(Array.isArray(d)?d:d.users||[]);
  };
  return (
    <div style={S.card}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div style={S.sectionTitle}>Platform Users ({users.length})</div>
      </div>
      {loading ? <div style={{color:'#64748b',textAlign:'center',padding:20}}>Loading…</div> : (
        <table style={S.table}>
          <thead><tr>{['Name','Email','Role','Joined','Actions'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>{users.map(u=>(
            <tr key={u.id}>
              <td style={S.td}>{u.name}</td>
              <td style={S.td}>{u.email}</td>
              <td style={S.td}><span style={{...S.badge,background:'#6366f122',color:'#818cf8',border:'1px solid #6366f144'}}>{u.role}</span></td>
              <td style={S.td}>{fmtDate(u.created_at)}</td>
              <td style={S.td}>
                <div style={{display:'flex',gap:6}}>
                  {u.role!=='super_admin' && <button style={{...S.btn,background:'#6366f122',color:'#818cf8',border:'1px solid #6366f144',padding:'4px 10px',fontSize:11}} onClick={()=>promote(u.id,'super_admin')}>→ Super Admin</button>}
                  {u.role!=='org_admin' && <button style={{...S.btn,background:'#22c55e22',color:'#22c55e',border:'1px solid #22c55e44',padding:'4px 10px',fontSize:11}} onClick={()=>promote(u.id,'org_admin')}>→ Org Admin</button>}
                  {u.role!=='qa_engineer' && <button style={{...S.btn,background:'#64748b22',color:'#94a3b8',border:'1px solid #64748b44',padding:'4px 10px',fontSize:11}} onClick={()=>promote(u.id,'qa_engineer')}>→ QA Eng</button>}
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </div>
  );
}

function IssuesSection({ token }: { token: string }) {
  const [issues, setIssues] = useState<Issue[]>([]);
  useEffect(() => {
    fetch('/api/saas/issues', { headers:{'Authorization':`Bearer ${token}`} })
      .then(r=>r.json()).then(d=>setIssues(Array.isArray(d)?d:[])).catch(()=>{});
  }, [token]);
  const PRIORITY_COLORS: Record<string,string> = { critical:'#ef4444', high:'#f97316', medium:'#eab308', low:'#22c55e' };
  return (
    <div style={S.card}>
      <div style={S.sectionTitle}>Issue Tracker ({issues.length})</div>
      {issues.length===0 ? <div style={{color:'#475569',textAlign:'center',padding:20}}>No issues</div> : (
        <table style={S.table}>
          <thead><tr>{['Ref','Org','Title','Priority','Status','Date'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>{issues.map(i=>(
            <tr key={i.id}>
              <td style={S.td}><span style={{color:'#6366f1',fontWeight:600}}>{i.ticket_ref}</span></td>
              <td style={S.td}>{i.tenant_name}</td>
              <td style={S.td}>{i.title}</td>
              <td style={S.td}><span style={{...S.badge,background:(PRIORITY_COLORS[i.priority]||'#6b7280')+'22',color:PRIORITY_COLORS[i.priority]||'#6b7280',border:`1px solid ${(PRIORITY_COLORS[i.priority]||'#6b7280')}44`}}>{i.priority}</span></td>
              <td style={S.td}>{statusBadge(i.status)}</td>
              <td style={S.td}>{fmtDate(i.created_at)}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </div>
  );
}

// ─── Analytics & Trends ──────────────────────────────────────────────────────
function AnalyticsSection({ token }: { token: string }) {
  const [trends, setTrends] = useState<AnalyticsTrend[]>([]);
  const [geo, setGeo] = useState<any[]>([]);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([
      fetch('/api/saas/analytics/trends', { headers:{'Authorization':`Bearer ${token}`} }).then(r=>r.json()),
      fetch('/api/saas/analytics/geo', { headers:{'Authorization':`Bearer ${token}`} }).then(r=>r.json()),
      fetch('/api/saas/analytics/licenses', { headers:{'Authorization':`Bearer ${token}`} }).then(r=>r.json()),
    ]).then(([t,g,l]) => { setTrends(Array.isArray(t)?t:[]); setGeo(Array.isArray(g)?g:[]); setLicenses(Array.isArray(l)?l:[]); })
    .catch(()=>{})
    .finally(()=>setLoading(false));
  }, [token]);
  if (loading) return <div style={{color:'#64748b',textAlign:'center',padding:40}}>Loading…</div>;
  const maxRev = Math.max(...trends.map(t=>t.revenue||0), 1);
  const maxApi = Math.max(...trends.map(t=>t.api_calls||0), 1);
  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
        {/* Revenue Trend */}
        <div style={S.card}>
          <div style={S.sectionTitle}>Revenue Trend (30 days)</div>
          {trends.length===0 ? <div style={{color:'#475569',fontSize:13}}>No data yet</div> : (
            <div style={{display:'flex',alignItems:'flex-end',gap:3,height:80}}>
              {trends.slice(-30).map((t,i)=>(
                <div key={i} title={`${t.date}: $${t.revenue}`} style={{flex:1,borderRadius:2,background:'#6366f1',opacity:.8,minWidth:4,height:`${Math.max(4,(t.revenue/maxRev)*80)}px`}} />
              ))}
            </div>
          )}
          <div style={{fontSize:11,color:'#64748b',marginTop:6}}>Total: ${trends.reduce((a,t)=>a+(t.revenue||0),0).toLocaleString()}</div>
        </div>
        {/* API Calls Trend */}
        <div style={S.card}>
          <div style={S.sectionTitle}>API Calls Trend (30 days)</div>
          {trends.length===0 ? <div style={{color:'#475569',fontSize:13}}>No data yet</div> : (
            <div style={{display:'flex',alignItems:'flex-end',gap:3,height:80}}>
              {trends.slice(-30).map((t,i)=>(
                <div key={i} title={`${t.date}: ${t.api_calls}`} style={{flex:1,borderRadius:2,background:'#22c55e',opacity:.8,minWidth:4,height:`${Math.max(4,(t.api_calls/maxApi)*80)}px`}} />
              ))}
            </div>
          )}
          <div style={{fontSize:11,color:'#64748b',marginTop:6}}>Total: {trends.reduce((a,t)=>a+(t.api_calls||0),0).toLocaleString()} calls</div>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        {/* Geo Distribution */}
        <div style={S.card}>
          <div style={S.sectionTitle}>Customers by Country</div>
          {geo.length===0 ? <div style={{color:'#475569',fontSize:13}}>No data yet</div> : (
            <table style={S.table}><thead><tr><th style={S.th}>Country</th><th style={S.th}>Orgs</th></tr></thead>
            <tbody>{geo.map((g:any)=>(
              <tr key={g.country}><td style={S.td}>{g.country||'Unknown'}</td><td style={S.td}><strong style={{color:'#6366f1'}}>{g.count}</strong></td></tr>
            ))}</tbody></table>
          )}
        </div>
        {/* License Distribution */}
        <div style={S.card}>
          <div style={S.sectionTitle}>License Plan Distribution</div>
          {licenses.length===0 ? <div style={{color:'#475569',fontSize:13}}>No data yet</div> : (
            licenses.map((l:any)=>(
              <div key={l.tier||l.pack_name} style={{marginBottom:10}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}>
                  <span style={{color:'#94a3b8'}}>{l.tier||l.pack_name||'Unknown'}</span>
                  <span style={{color:'#e2e8f0',fontWeight:600}}>{l.count} orgs</span>
                </div>
                <div style={S.bar}><div style={{...S.barFill,width:`${Math.min(100,(l.count/Math.max(...licenses.map((x:any)=>x.count),1))*100)}%`}} /></div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── RBAC & Permissions ───────────────────────────────────────────────────────
function RBACSection({ token }: { token: string }) {
  const [roles, setRoles] = useState<any[]>([]);
  const [rbacUsers, setRbacUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRole, setNewRole] = useState({ name:'', description:'', permissions:'' });
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/saas/rbac/roles', { headers:{'Authorization':`Bearer ${token}`} }).then(r=>r.json()),
      fetch('/api/saas/rbac/users', { headers:{'Authorization':`Bearer ${token}`} }).then(r=>r.json()),
    ]).then(([r,u]) => { setRoles(Array.isArray(r)?r:[]); setRbacUsers(Array.isArray(u)?u:[]); })
    .catch(()=>{})
    .finally(()=>setLoading(false));
  }, [token]);
  useEffect(()=>{ load(); }, [load]);

  const createRole = async () => {
    if (!newRole.name) return;
    await fetch('/api/saas/rbac/roles', { method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`}, body:JSON.stringify(newRole) });
    setMsg('Role created'); setShowForm(false); setNewRole({name:'',description:'',permissions:''}); load();
    setTimeout(()=>setMsg(''),3000);
  };
  const deleteRole = async (id: string) => {
    await fetch(`/api/saas/rbac/roles/${id}`, { method:'DELETE', headers:{'Authorization':`Bearer ${token}`} });
    load();
  };

  const BUILT_IN_ROLES = [
    { name:'super_admin', color:'#8b5cf6', perms:['All platform access','Billing & invoices','User management','Org management','System config'] },
    { name:'org_admin', color:'#3b82f6', perms:['Org dashboard','User invite & manage','License requests','Usage reports','QA platform access'] },
    { name:'qa_lead', color:'#22c55e', perms:['Test case management','Defect tracking','Reports','Team oversight','CI/CD config'] },
    { name:'qa_engineer', color:'#f97316', perms:['Run test cases','Log defects','View reports','Script execution'] },
    { name:'viewer', color:'#64748b', perms:['Read-only dashboard','View reports','No edit access'] },
  ];

  if (loading) return <div style={{color:'#64748b',textAlign:'center',padding:40}}>Loading…</div>;
  return (
    <div>
      {msg && <div style={{background:'#16a34a22',border:'1px solid #16a34a44',borderRadius:6,padding:'8px 12px',color:'#4ade80',marginBottom:12,fontSize:13}}>{msg}</div>}
      {/* Built-in roles */}
      <div style={{...S.card,marginBottom:16}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div style={S.sectionTitle}>Platform Roles & Permissions</div>
          <button style={{...S.btn,...S.btnPrimary,fontSize:11}} onClick={()=>setShowForm(v=>!v)}>+ Custom Role</button>
        </div>
        {showForm && (
          <div style={{background:'#0f172a',border:'1px solid #334155',borderRadius:8,padding:14,marginBottom:14}}>
            <div style={S.formGrid}>
              <div><label style={S.label}>Role Name</label><input style={S.input} value={newRole.name} onChange={e=>setNewRole(r=>({...r,name:e.target.value}))} placeholder="custom_reviewer" /></div>
              <div><label style={S.label}>Description</label><input style={S.input} value={newRole.description} onChange={e=>setNewRole(r=>({...r,description:e.target.value}))} placeholder="Read-only reviewer" /></div>
            </div>
            <div style={{marginTop:10}}><label style={S.label}>Permissions (comma-separated)</label><input style={S.input} value={newRole.permissions} onChange={e=>setNewRole(r=>({...r,permissions:e.target.value}))} placeholder="view_reports,view_tests" /></div>
            <div style={{display:'flex',gap:8,marginTop:10,justifyContent:'flex-end'}}>
              <button style={{...S.btn,...S.btnGhost}} onClick={()=>setShowForm(false)}>Cancel</button>
              <button style={{...S.btn,...S.btnPrimary}} onClick={createRole}>Create Role</button>
            </div>
          </div>
        )}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:10}}>
          {BUILT_IN_ROLES.map(r=>(
            <div key={r.name} style={{background:'#0f172a',border:`1px solid ${r.color}33`,borderRadius:8,padding:12}}>
              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
                <span style={{...S.badge,background:r.color+'22',color:r.color,border:`1px solid ${r.color}44`}}>{r.name}</span>
                <span style={{fontSize:10,color:'#475569'}}>built-in</span>
              </div>
              {r.perms.map(p=>(
                <div key={p} style={{fontSize:11,color:'#64748b',padding:'2px 0',display:'flex',alignItems:'center',gap:4}}>
                  <span style={{color:'#22c55e',fontSize:9}}>✓</span> {p}
                </div>
              ))}
            </div>
          ))}
          {roles.map(r=>(
            <div key={r.id} style={{background:'#0f172a',border:'1px solid #6366f133',borderRadius:8,padding:12}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                <span style={{...S.badge,background:'#6366f122',color:'#818cf8',border:'1px solid #6366f144'}}>{r.name}</span>
                <button style={{...S.btn,...S.btnRed,padding:'2px 8px',fontSize:10}} onClick={()=>deleteRole(r.id)}>✕</button>
              </div>
              <div style={{fontSize:11,color:'#64748b'}}>{r.description||'Custom role'}</div>
            </div>
          ))}
        </div>
      </div>
      {/* Users with roles */}
      <div style={S.card}>
        <div style={S.sectionTitle}>Users & Role Assignments ({rbacUsers.length})</div>
        <table style={S.table}>
          <thead><tr>{['User','Email','Current Role','Tenant'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>{rbacUsers.slice(0,20).map((u:any)=>(
            <tr key={u.id}>
              <td style={S.td}>{u.name}</td>
              <td style={S.td}>{u.email}</td>
              <td style={S.td}><span style={{...S.badge,background:'#6366f122',color:'#818cf8',border:'1px solid #6366f144'}}>{u.role}</span></td>
              <td style={S.td}>{u.tenant_name||<span style={{color:'#475569'}}>—</span>}</td>
            </tr>
          ))}
          {rbacUsers.length===0&&<tr><td colSpan={4} style={{...S.td,textAlign:'center',color:'#475569'}}>No users found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Payments & Invoices ──────────────────────────────────────────────────────
function PaymentsSection({ token }: { token: string }) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ tenant_id:'', amount:'', currency:'USD', description:'' });
  const [tenants, setTenants] = useState<any[]>([]);
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/saas/invoices', { headers:{'Authorization':`Bearer ${token}`} }).then(r=>r.json()),
      fetch('/api/saas/payments/summary', { headers:{'Authorization':`Bearer ${token}`} }).then(r=>r.json()),
      fetch('/api/saas/tenants', { headers:{'Authorization':`Bearer ${token}`} }).then(r=>r.json()),
    ]).then(([inv,sum,ten]) => {
      setInvoices(Array.isArray(inv)?inv:inv.invoices||[]);
      setSummary(sum);
      setTenants(Array.isArray(ten)?ten:ten.tenants||[]);
    }).catch(()=>{})
    .finally(()=>setLoading(false));
  }, [token]);
  useEffect(()=>{ load(); }, [load]);

  const createInvoice = async () => {
    if (!form.tenant_id||!form.amount) return;
    await fetch('/api/saas/invoices', { method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`}, body:JSON.stringify({...form,amount:parseFloat(form.amount)}) });
    setMsg('Invoice created'); setShowCreate(false); setForm({tenant_id:'',amount:'',currency:'USD',description:''}); load();
    setTimeout(()=>setMsg(''),3000);
  };
  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/saas/invoices/${id}/status`, { method:'PATCH', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`}, body:JSON.stringify({status}) });
    load();
  };

  if (loading) return <div style={{color:'#64748b',textAlign:'center',padding:40}}>Loading…</div>;
  return (
    <div>
      {msg && <div style={{background:'#16a34a22',border:'1px solid #16a34a44',borderRadius:6,padding:'8px 12px',color:'#4ade80',marginBottom:12,fontSize:13}}>{msg}</div>}
      {/* Summary KPIs */}
      {summary && (
        <div style={{...S.kpiGrid,marginBottom:16}}>
          {[
            {label:'Total Invoiced',val:`$${(summary.total_invoiced||0).toLocaleString()}`,color:'#6366f1'},
            {label:'Paid',val:`$${(summary.total_paid||0).toLocaleString()}`,color:'#22c55e'},
            {label:'Overdue',val:`$${(summary.total_overdue||0).toLocaleString()}`,color:'#ef4444'},
            {label:'Pending',val:String(summary.pending_count||0),color:'#eab308'},
          ].map(k=>(
            <div key={k.label} style={S.kpi}>
              <div style={{...S.kpiVal,color:k.color}}>{k.val}</div>
              <div style={S.kpiLbl}>{k.label}</div>
            </div>
          ))}
        </div>
      )}
      {/* Invoice table */}
      <div style={S.card}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div style={S.sectionTitle}>Invoices ({invoices.length})</div>
          <button style={{...S.btn,...S.btnPrimary,fontSize:11}} onClick={()=>setShowCreate(v=>!v)}>+ New Invoice</button>
        </div>
        {showCreate && (
          <div style={{background:'#0f172a',border:'1px solid #334155',borderRadius:8,padding:14,marginBottom:14}}>
            <div style={S.formGrid}>
              <div><label style={S.label}>Organisation</label>
                <select style={S.input} value={form.tenant_id} onChange={e=>setForm(f=>({...f,tenant_id:e.target.value}))}>
                  <option value="">Select org…</option>
                  {tenants.map((t:any)=><option key={t.id} value={t.id}>{t.company_name||t.name}</option>)}
                </select>
              </div>
              <div><label style={S.label}>Amount (USD)</label><input style={S.input} type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} placeholder="999" /></div>
              <div><label style={S.label}>Description</label><input style={S.input} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Monthly license fee" /></div>
            </div>
            <div style={{display:'flex',gap:8,marginTop:10,justifyContent:'flex-end'}}>
              <button style={{...S.btn,...S.btnGhost}} onClick={()=>setShowCreate(false)}>Cancel</button>
              <button style={{...S.btn,...S.btnPrimary}} onClick={createInvoice}>Create Invoice</button>
            </div>
          </div>
        )}
        {invoices.length===0 ? <div style={{color:'#475569',textAlign:'center',padding:20}}>No invoices yet</div> : (
          <table style={S.table}>
            <thead><tr>{['Invoice #','Org','Amount','Status','Date','Actions'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>{invoices.map((inv:any)=>(
              <tr key={inv.id}>
                <td style={S.td}><span style={{color:'#6366f1',fontWeight:600}}>{inv.invoice_number}</span></td>
                <td style={S.td}>{inv.tenant_name||inv.company_name||'—'}</td>
                <td style={S.td}><strong style={{color:'#22c55e'}}>${(inv.total||inv.amount||0).toLocaleString()}</strong> <span style={{fontSize:11,color:'#64748b'}}>{inv.currency||'USD'}</span></td>
                <td style={S.td}>{statusBadge(inv.status)}</td>
                <td style={S.td}>{fmtDate(inv.created_at)}</td>
                <td style={S.td}>
                  <div style={{display:'flex',gap:4}}>
                    {inv.status!=='paid'&&<button style={{...S.btn,...S.btnGreen,padding:'4px 10px',fontSize:11}} onClick={()=>updateStatus(inv.id,'paid')}>Mark Paid</button>}
                    {inv.status==='draft'&&<button style={{...S.btn,background:'#3b82f622',color:'#60a5fa',border:'1px solid #3b82f644',padding:'4px 10px',fontSize:11}} onClick={()=>updateStatus(inv.id,'sent')}>Send</button>}
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Licenses & Expiry ────────────────────────────────────────────────────────
function LicensesSection({ token }: { token: string }) {
  const [tenants, setTenants] = useState<any[]>([]);
  const [packs, setPacks] = useState<LicensePack[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/saas/tenants', { headers:{'Authorization':`Bearer ${token}`} }).then(r=>r.json()),
      fetch('/api/saas/license-packs', { headers:{'Authorization':`Bearer ${token}`} }).then(r=>r.json()),
    ]).then(([t,p]) => { setTenants(Array.isArray(t)?t:t.tenants||[]); setPacks(Array.isArray(p)?p:[]); })
    .catch(()=>{})
    .finally(()=>setLoading(false));
  }, [token]);
  useEffect(()=>{ load(); }, [load]);

  const today = new Date();
  const daysUntil = (d?: string) => d ? Math.ceil((new Date(d).getTime()-today.getTime())/(86400000)) : null;
  const expiryStatus = (d?: string) => { const n=daysUntil(d); if(n===null)return 'unknown'; if(n<0)return 'expired'; if(n<=30)return 'expiring'; return 'ok'; };

  const filtered = tenants.filter(t => {
    if (filter==='all') return true;
    if (filter==='expiring') return ['expiring','expired'].includes(expiryStatus(t.next_billing_date));
    if (filter==='active') return t.status==='active';
    return t.status===filter;
  });

  if (loading) return <div style={{color:'#64748b',textAlign:'center',padding:40}}>Loading…</div>;
  const expiring = tenants.filter(t=>expiryStatus(t.next_billing_date)==='expiring').length;
  const expired = tenants.filter(t=>expiryStatus(t.next_billing_date)==='expired').length;
  return (
    <div>
      <div style={{...S.kpiGrid,marginBottom:16}}>
        {[
          {label:'Total Licenses',val:String(tenants.length),color:'#6366f1'},
          {label:'Active',val:String(tenants.filter(t=>t.status==='active').length),color:'#22c55e'},
          {label:'Expiring (30d)',val:String(expiring),color:expiring>0?'#eab308':'#22c55e'},
          {label:'Expired',val:String(expired),color:expired>0?'#ef4444':'#22c55e'},
        ].map(k=>(
          <div key={k.label} style={S.kpi}>
            <div style={{...S.kpiVal,color:k.color}}>{k.val}</div>
            <div style={S.kpiLbl}>{k.label}</div>
          </div>
        ))}
      </div>
      <div style={S.card}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div style={S.sectionTitle}>License Status ({filtered.length})</div>
          <select style={{...S.input,width:'auto'}} value={filter} onChange={e=>setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="expiring">Expiring / Expired</option>
            <option value="trial">Trial</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
        {filtered.length===0 ? <div style={{color:'#475569',textAlign:'center',padding:20}}>No tenants yet</div> : (
          <table style={S.table}>
            <thead><tr>{['Organisation','Plan','Users','Status','Next Billing','Days Left','Action'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>{filtered.map((t:any)=>{
              const days = daysUntil(t.next_billing_date);
              const es = expiryStatus(t.next_billing_date);
              const dayColor = es==='expired'?'#ef4444':es==='expiring'?'#eab308':'#22c55e';
              return (
                <tr key={t.id}>
                  <td style={S.td}><strong style={{color:'#e2e8f0'}}>{t.company_name||t.name}</strong></td>
                  <td style={S.td}>{tierBadge(t.pack_tier||t.license_tier||'')}<div style={{fontSize:11,color:'#64748b'}}>{t.pack_name||'—'}</div></td>
                  <td style={S.td}>{t.active_users||0}/{t.max_users||5}</td>
                  <td style={S.td}>{statusBadge(t.status)}</td>
                  <td style={S.td}>{fmtDate(t.next_billing_date)}</td>
                  <td style={S.td}><span style={{color:dayColor,fontWeight:600}}>{days===null?'—':days<0?`${Math.abs(days)}d overdue`:`${days}d`}</span></td>
                  <td style={S.td}>
                    {es==='expired'&&<button style={{...S.btn,...S.btnPrimary,padding:'4px 10px',fontSize:11}}>Renew</button>}
                    {es==='expiring'&&<button style={{...S.btn,background:'#eab30822',color:'#eab308',border:'1px solid #eab30844',padding:'4px 10px',fontSize:11}}>Notify</button>}
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>
        )}
      </div>
      {/* License packs */}
      <div style={{...S.card,marginTop:16}}>
        <div style={S.sectionTitle}>Available License Packs</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:10}}>
          {packs.map(p=>(
            <div key={p.id} style={{background:'#0f172a',border:'1px solid #334155',borderRadius:8,padding:12}}>
              <div style={{marginBottom:6}}>{tierBadge(p.tier)}</div>
              <div style={{fontSize:13,fontWeight:700,color:'#e2e8f0'}}>{p.name}</div>
              <div style={{fontSize:20,fontWeight:700,color:'#6366f1',margin:'6px 0'}}>${p.price_usd}<span style={{fontSize:11,color:'#64748b'}}>/{p.billing_cycle}</span></div>
              <div style={{fontSize:11,color:'#64748b'}}>Up to {p.max_users} users</div>
            </div>
          ))}
          {packs.length===0&&<div style={{color:'#475569',fontSize:13}}>No license packs configured</div>}
        </div>
      </div>
    </div>
  );
}

// ─── Auto-Triggers ────────────────────────────────────────────────────────────
function TriggersSection({ token }: { token: string }) {
  const [triggers, setTriggers] = useState<EmailTrigger[]>([]);
  const [log, setLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ trigger_name:'', description:'', event_type:'license_expiry', template_subject:'', template_body:'' });
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/saas/email-triggers', { headers:{'Authorization':`Bearer ${token}`} }).then(r=>r.json()),
      fetch('/api/saas/email-log', { headers:{'Authorization':`Bearer ${token}`} }).then(r=>r.json()),
    ]).then(([t,l]) => { setTriggers(Array.isArray(t)?t:[]); setLog(Array.isArray(l)?l:[]); })
    .catch(()=>{})
    .finally(()=>setLoading(false));
  }, [token]);
  useEffect(()=>{ load(); }, [load]);

  const toggle = async (id: string, is_active: number) => {
    await fetch(`/api/saas/email-triggers/${id}`, { method:'PUT', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`}, body:JSON.stringify({is_active:is_active?0:1}) });
    load();
  };
  const testFire = async (id: string) => {
    await fetch(`/api/saas/email-triggers/${id}/test-fire`, { method:'POST', headers:{'Authorization':`Bearer ${token}`} });
    setMsg('Test trigger fired!'); setTimeout(()=>setMsg(''),3000); load();
  };
  const createTrigger = async () => {
    if (!form.trigger_name) return;
    await fetch('/api/saas/email-triggers', { method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`}, body:JSON.stringify(form) });
    setMsg('Trigger created'); setShowCreate(false); setForm({trigger_name:'',description:'',event_type:'license_expiry',template_subject:'',template_body:''}); load();
    setTimeout(()=>setMsg(''),3000);
  };

  const EVENT_TYPES = ['license_expiry','payment_failed','usage_spike','new_signup','trial_ending','custom'];
  if (loading) return <div style={{color:'#64748b',textAlign:'center',padding:40}}>Loading…</div>;
  return (
    <div>
      {msg && <div style={{background:'#16a34a22',border:'1px solid #16a34a44',borderRadius:6,padding:'8px 12px',color:'#4ade80',marginBottom:12,fontSize:13}}>{msg}</div>}
      <div style={S.card}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div style={S.sectionTitle}>Email Triggers ({triggers.length})</div>
          <button style={{...S.btn,...S.btnPrimary,fontSize:11}} onClick={()=>setShowCreate(v=>!v)}>+ New Trigger</button>
        </div>
        {showCreate && (
          <div style={{background:'#0f172a',border:'1px solid #334155',borderRadius:8,padding:14,marginBottom:14}}>
            <div style={S.formGrid}>
              <div><label style={S.label}>Trigger Name</label><input style={S.input} value={form.trigger_name} onChange={e=>setForm(f=>({...f,trigger_name:e.target.value}))} placeholder="License Expiry Warning" /></div>
              <div><label style={S.label}>Event Type</label>
                <select style={S.input} value={form.event_type} onChange={e=>setForm(f=>({...f,event_type:e.target.value}))}>
                  {EVENT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div><label style={S.label}>Email Subject</label><input style={S.input} value={form.template_subject} onChange={e=>setForm(f=>({...f,template_subject:e.target.value}))} placeholder="Your license expires soon" /></div>
              <div><label style={S.label}>Description</label><input style={S.input} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Sent 7 days before expiry" /></div>
            </div>
            <div style={{marginTop:10}}><label style={S.label}>Email Body</label><textarea style={{...S.input,height:80,resize:'vertical'}} value={form.template_body} onChange={e=>setForm(f=>({...f,template_body:e.target.value}))} placeholder="Dear {{name}}, your license expires on {{date}}…" /></div>
            <div style={{display:'flex',gap:8,marginTop:10,justifyContent:'flex-end'}}>
              <button style={{...S.btn,...S.btnGhost}} onClick={()=>setShowCreate(false)}>Cancel</button>
              <button style={{...S.btn,...S.btnPrimary}} onClick={createTrigger}>Create Trigger</button>
            </div>
          </div>
        )}
        {triggers.length===0 ? <div style={{color:'#475569',textAlign:'center',padding:20}}>No triggers configured yet</div> : (
          <table style={S.table}>
            <thead><tr>{['Trigger','Event','Status','Fired','Last Fired','Actions'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>{triggers.map(t=>(
              <tr key={t.id}>
                <td style={S.td}><strong style={{color:'#e2e8f0'}}>{t.trigger_name}</strong><div style={{fontSize:11,color:'#64748b'}}>{t.description}</div></td>
                <td style={S.td}><span style={{...S.badge,background:'#3b82f622',color:'#60a5fa',border:'1px solid #3b82f644'}}>{t.event_type}</span></td>
                <td style={S.td}>{t.is_active ? <span style={{...S.badge,background:'#16a34a22',color:'#4ade80',border:'1px solid #16a34a44'}}>Active</span> : <span style={{...S.badge,background:'#64748b22',color:'#94a3b8',border:'1px solid #64748b44'}}>Paused</span>}</td>
                <td style={S.td}>{t.fire_count||0}</td>
                <td style={S.td}>{fmtDate(t.last_fired_at)}</td>
                <td style={S.td}>
                  <div style={{display:'flex',gap:4}}>
                    <button style={{...S.btn,background:t.is_active?'#64748b22':'#16a34a22',color:t.is_active?'#94a3b8':'#4ade80',border:`1px solid ${t.is_active?'#64748b44':'#16a34a44'}`,padding:'4px 10px',fontSize:11}} onClick={()=>toggle(t.id,t.is_active)}>{t.is_active?'Pause':'Enable'}</button>
                    <button style={{...S.btn,background:'#6366f122',color:'#818cf8',border:'1px solid #6366f144',padding:'4px 10px',fontSize:11}} onClick={()=>testFire(t.id)}>Test</button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
      {/* Email log */}
      {log.length>0 && (
        <div style={{...S.card,marginTop:16}}>
          <div style={S.sectionTitle}>Recent Email Log</div>
          <table style={S.table}>
            <thead><tr>{['Trigger','Recipient','Sent At','Status'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>{log.slice(0,10).map((l:any,i:number)=>(
              <tr key={i}>
                <td style={S.td}>{l.trigger_name}</td>
                <td style={S.td}>{l.recipient_email}</td>
                <td style={S.td}>{fmtDate(l.sent_at)}</td>
                <td style={S.td}>{statusBadge(l.status||'sent')}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Customer Config ──────────────────────────────────────────────────────────
function CustomerConfigSection({ token }: { token: string }) {
  const [tenants, setTenants] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch('/api/saas/tenants', { headers:{'Authorization':`Bearer ${token}`} })
      .then(r=>r.json()).then(d=>setTenants(Array.isArray(d)?d:d.tenants||[]))
      .catch(()=>{})
      .finally(()=>setLoading(false));
  }, [token]);

  const loadConfig = async (tenantId: string) => {
    const r = await fetch(`/api/saas/tenant-configs/${tenantId}`, { headers:{'Authorization':`Bearer ${token}`} });
    const d = await r.json();
    setConfig(d.config||{});
  };

  const selectTenant = (t: any) => { setSelected(t); loadConfig(t.id); };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    await fetch(`/api/saas/tenant-configs/${selected.id}`, { method:'PUT', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`}, body:JSON.stringify({config}) });
    setMsg('Configuration saved'); setSaving(false);
    setTimeout(()=>setMsg(''),3000);
  };

  const CONFIG_FIELDS = [
    { key:'max_test_cases', label:'Max Test Cases', type:'number', placeholder:'1000' },
    { key:'max_api_calls_per_day', label:'Max API Calls/Day', type:'number', placeholder:'10000' },
    { key:'allowed_integrations', label:'Allowed Integrations', type:'text', placeholder:'jira,github,slack' },
    { key:'sso_enabled', label:'SSO Enabled', type:'select', options:['true','false'] },
    { key:'ai_features_enabled', label:'AI Features', type:'select', options:['true','false'] },
    { key:'custom_domain', label:'Custom Domain', type:'text', placeholder:'qa.company.com' },
    { key:'support_tier', label:'Support Tier', type:'select', options:['basic','standard','premium','enterprise'] },
    { key:'data_retention_days', label:'Data Retention (days)', type:'number', placeholder:'90' },
  ];

  if (loading) return <div style={{color:'#64748b',textAlign:'center',padding:40}}>Loading…</div>;
  return (
    <div style={{display:'grid',gridTemplateColumns:'260px 1fr',gap:16}}>
      {/* Tenant list */}
      <div style={S.card}>
        <div style={S.sectionTitle}>Select Organisation</div>
        {tenants.length===0 ? <div style={{color:'#475569',fontSize:13}}>No tenants yet</div> : (
          tenants.map((t:any)=>(
            <div key={t.id} onClick={()=>selectTenant(t)} style={{padding:'8px 10px',borderRadius:6,cursor:'pointer',marginBottom:4,
              background:selected?.id===t.id?'#6366f1':'transparent',
              color:selected?.id===t.id?'#fff':'#94a3b8',
              border:`1px solid ${selected?.id===t.id?'#6366f1':'#334155'}`
            }}>
              <div style={{fontSize:13,fontWeight:600}}>{t.company_name||t.name}</div>
              <div style={{fontSize:11,opacity:.7}}>{statusBadge(t.status)}</div>
            </div>
          ))
        )}
      </div>
      {/* Config form */}
      <div style={S.card}>
        {!selected ? (
          <div style={{textAlign:'center',padding:40,color:'#475569'}}>
            <div style={{fontSize:32,marginBottom:8}}>⚙️</div>
            <div>Select an organisation to configure</div>
          </div>
        ) : (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div style={S.sectionTitle}>Config: {selected.company_name||selected.name}</div>
              {msg && <span style={{fontSize:12,color:'#4ade80'}}>{msg}</span>}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              {CONFIG_FIELDS.map(f=>(
                <div key={f.key}>
                  <label style={S.label}>{f.label}</label>
                  {f.type==='select' ? (
                    <select style={S.input} value={config[f.key]||''} onChange={e=>setConfig((c:any)=>({...c,[f.key]:e.target.value}))}>
                      <option value="">—</option>
                      {f.options?.map(o=><option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input style={S.input} type={f.type} value={config[f.key]||''} onChange={e=>setConfig((c:any)=>({...c,[f.key]:e.target.value}))} placeholder={f.placeholder} />
                  )}
                </div>
              ))}
            </div>
            <div style={{marginTop:16,display:'flex',justifyContent:'flex-end'}}>
              <button style={{...S.btn,...S.btnPrimary}} onClick={save} disabled={saving}>{saving?'Saving…':'Save Configuration'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SuperAdminPortal({ token, onLogout, authUser }: { token: string; onLogout?: () => void; authUser?: { name?: string; email?: string } | null }) {
  const [activeNav, setActiveNav] = useState('overview');
  const [packs, setPacks] = useState<LicensePack[]>([]);

  useEffect(() => {
    fetch('/api/saas/license-packs', { headers:{'Authorization':`Bearer ${token}`} })
      .then(r=>r.json()).then(d=>setPacks(Array.isArray(d)?d:[])).catch(()=>{});
  }, [token]);

  const sections = Array.from(new Set(NAV.map(n=>n.section)));
  const currentNav = NAV.find(n=>n.id===activeNav);

  const renderContent = () => {
    switch(activeNav) {
      case 'overview':   return <OverviewSection token={token} />;
      case 'org-admins': return <OrgAdminManagement token={token} packs={packs} />;
      case 'analytics':  return <AnalyticsSection token={token} />;
      case 'users':      return <UsersSection token={token} />;
      case 'rbac':       return <RBACSection token={token} />;
      case 'payments':   return <PaymentsSection token={token} />;
      case 'licenses':   return <LicensesSection token={token} />;
      case 'triggers':   return <TriggersSection token={token} />;
      case 'wizard':     return <CustomerConfigSection token={token} />;
      case 'issues':     return <IssuesSection token={token} />;
      default:           return <OverviewSection token={token} />;
    }
  };

  return (
    <div style={S.shell}>
      {/* Left Navigation */}
      <div style={S.sidebar}>
        <div style={S.sideTop}>
          <div style={S.sideTitle}>Super Admin</div>
          <div style={S.sideSubt}>Business Control Plane</div>
        </div>
        <div style={{flex:1, overflowY:'auto'}}>
          {sections.map(sec => (
            <div key={sec}>
              <div style={S.sideSection}>{sec}</div>
              {NAV.filter(n=>n.section===sec).map(n => (
                <div key={n.id} style={{...S.navItem, ...(activeNav===n.id ? S.navActive : {})}}
                  onClick={()=>setActiveNav(n.id)}
                  onMouseEnter={e=>{ if(activeNav!==n.id)(e.currentTarget as HTMLElement).style.background='#334155'; }}
                  onMouseLeave={e=>{ if(activeNav!==n.id)(e.currentTarget as HTMLElement).style.background=''; }}
                >
                  <span style={{fontSize:15}}>{n.icon}</span>
                  <span>{n.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        {/* User footer with logout */}
        <div style={{padding:'12px', borderTop:'1px solid #334155', background:'rgba(15,23,42,0.6)'}}>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <div style={{width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#5B6CFF,#7C3AED)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'#fff', flexShrink:0}}>
              {authUser?.name?.charAt(0) || 'S'}
            </div>
            <div style={{flex:1, minWidth:0}}>
              <p style={{fontSize:11, color:'#E2E8F0', fontWeight:600, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{authUser?.name || 'Super Admin'}</p>
              <p style={{fontSize:9, color:'#94A3B8', margin:0}}>super admin</p>
            </div>
            {onLogout && (
              <button onClick={onLogout} title="Sign out" style={{padding:4, background:'none', border:'none', cursor:'pointer', color:'#64748B'}}
                onMouseEnter={e=>(e.currentTarget.style.color='#EF4444')}
                onMouseLeave={e=>(e.currentTarget.style.color='#64748B')}>
                &#x2192;
              </button>
            )}
          </div>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:6, fontSize:9, color:'#64748B'}}>
            <span>EDGE QI · v3.0</span>
            <span style={{display:'flex', alignItems:'center', gap:4}}><span style={{width:6, height:6, borderRadius:'50%', background:'#10B981', display:'inline-block'}} />LIVE</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={S.main}>
        <div style={S.topbar}>
          <div>
            <div style={S.topTitle}>{currentNav?.icon} {currentNav?.label}</div>
            <div style={S.topSub}>EdgeQI · Super Admin · Business Control Plane</div>
          </div>
          <div style={{fontSize:12,color:'#475569'}}>LIVE</div>
        </div>
        <div style={S.content}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
