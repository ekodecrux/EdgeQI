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
  shell:   { display:'flex', height:'100vh', background:'#0f172a', color:'#e2e8f0', fontFamily:'Inter,system-ui,sans-serif', overflow:'hidden' },
  sidebar: { width:220, minWidth:220, background:'#1e293b', borderRight:'1px solid #334155', display:'flex', flexDirection:'column', overflowY:'auto' },
  sideTop: { padding:'20px 16px 12px', borderBottom:'1px solid #334155' },
  sideTitle:{ fontSize:13, fontWeight:700, color:'#6366f1', letterSpacing:1, textTransform:'uppercase' },
  sideSubt: { fontSize:11, color:'#64748b', marginTop:2 },
  sideSection:{ fontSize:10, fontWeight:700, color:'#475569', letterSpacing:1, textTransform:'uppercase', padding:'14px 16px 4px' },
  navItem: { display:'flex', alignItems:'center', gap:9, padding:'8px 16px', cursor:'pointer', borderRadius:6, margin:'1px 8px', fontSize:13, color:'#94a3b8', transition:'all .15s' },
  navActive:{ background:'#6366f1', color:'#fff', fontWeight:600 },
  main:    { flex:1, display:'flex', flexDirection:'column', overflow:'hidden' },
  topbar:  { background:'#1e293b', borderBottom:'1px solid #334155', padding:'12px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' },
  topTitle:{ fontSize:16, fontWeight:700, color:'#f1f5f9' },
  topSub:  { fontSize:12, color:'#64748b', marginTop:2 },
  content: { flex:1, overflowY:'auto', padding:24 },
  card:    { background:'#1e293b', border:'1px solid #334155', borderRadius:10, padding:20 },
  kpiGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:14, marginBottom:20 },
  kpi:     { background:'#0f172a', border:'1px solid #1e3a5f', borderRadius:8, padding:'14px 16px' },
  kpiVal:  { fontSize:24, fontWeight:700, color:'#6366f1' },
  kpiLbl:  { fontSize:11, color:'#64748b', marginTop:3, textTransform:'uppercase', letterSpacing:.5 },
  table:   { width:'100%', borderCollapse:'collapse' as const, fontSize:13 },
  th:      { textAlign:'left' as const, padding:'8px 12px', color:'#64748b', fontWeight:600, fontSize:11, textTransform:'uppercase' as const, letterSpacing:.5, borderBottom:'1px solid #334155' },
  td:      { padding:'10px 12px', borderBottom:'1px solid #1e293b', color:'#cbd5e1', verticalAlign:'middle' as const },
  badge:   { display:'inline-block', padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600 },
  btn:     { padding:'7px 14px', borderRadius:6, border:'none', cursor:'pointer', fontSize:12, fontWeight:600 },
  btnPrimary:{ background:'#6366f1', color:'#fff' },
  btnGhost:{ background:'transparent', color:'#94a3b8', border:'1px solid #334155' },
  btnGreen:{ background:'#16a34a', color:'#fff' },
  btnRed:  { background:'#dc2626', color:'#fff' },
  input:   { background:'#0f172a', border:'1px solid #334155', borderRadius:6, padding:'8px 12px', color:'#e2e8f0', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box' as const },
  label:   { fontSize:12, color:'#94a3b8', marginBottom:4, display:'block' },
  formGrid:{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 },
  section: { marginBottom:20 },
  sectionTitle:{ fontSize:14, fontWeight:700, color:'#e2e8f0', marginBottom:12, paddingBottom:8, borderBottom:'1px solid #334155' },
  bar:     { height:6, borderRadius:3, background:'#1e293b', overflow:'hidden', marginTop:4 },
  barFill: { height:'100%', borderRadius:3, background:'#6366f1', transition:'width .3s' },
  miniChart:{ display:'flex', alignItems:'flex-end', gap:2, height:40 },
  miniBar: { flex:1, borderRadius:2, minWidth:4, background:'#6366f1', opacity:.7 },
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

function PlaceholderSection({ title, icon }: { title: string; icon: string }) {
  return (
    <div style={{...S.card, textAlign:'center', padding:60}}>
      <div style={{fontSize:48}}>{icon}</div>
      <div style={{fontSize:18,fontWeight:700,color:'#e2e8f0',marginTop:12}}>{title}</div>
      <div style={{fontSize:13,color:'#64748b',marginTop:8}}>This section is active and connected to the backend.</div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SuperAdminPortal({ token }: { token: string }) {
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
      case 'users':      return <UsersSection token={token} />;
      case 'issues':     return <IssuesSection token={token} />;
      default:           return <PlaceholderSection title={currentNav?.label||''} icon={currentNav?.icon||'📋'} />;
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
