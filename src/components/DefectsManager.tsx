import React, { useState, useEffect, useCallback } from 'react';
import {
  Bug, AlertTriangle, CheckCircle2, Clock, Upload, Sparkles, RefreshCw,
  ExternalLink, Filter, Plus, Search, ChevronDown, ChevronRight, X,
  ArrowUpRight, Wand2, AlertOctagon, Zap, Eye, Edit3, Trash2,
  TrendingDown, TrendingUp, Target, Activity, Link2, FileText,
  BarChart2, Shield, Loader2, Circle, CheckCircle, XCircle
} from 'lucide-react';

interface Defect {
  id: string; project_id: string; sprint_id?: string;
  title: string; description: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed' | 'Deferred';
  defect_type: string; module: string; environment: string;
  test_case_id?: string; test_case_title?: string; execution_run_id?: string;
  failure_log?: string; root_cause?: string; ai_analysis?: string;
  fix_suggestion?: string; assigned_to?: string;
  tms_issue_key?: string; tms_url?: string;
  raised_by: string; raised_at: string; resolved_at?: string;
}

interface FailedTest {
  id: string; title: string; status: string;
  module?: string; logs?: string[]; failure_log?: string; error?: string;
}

interface Props {
  currentProjectId: string;
  currentSprintId?: string;
  onNavigateTo?: (tab: string) => void;
}

const SEV_COLOR: Record<string, { bg: string; text: string; dot: string }> = {
  Critical: { bg: '#fff0f0', text: '#c0392b', dot: '#e74c3c' },
  High:     { bg: '#fff5ec', text: '#b35900', dot: '#e67e22' },
  Medium:   { bg: '#fffbec', text: '#7d6608', dot: '#f1c40f' },
  Low:      { bg: '#f0fff4', text: '#1a6b35', dot: '#27ae60' },
};
const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  'Open':        { bg: '#fee2e2', text: '#dc2626' },
  'In Progress': { bg: '#fef3c7', text: '#d97706' },
  'Resolved':    { bg: '#d1fae5', text: '#059669' },
  'Closed':      { bg: '#e0e7ff', text: '#4338ca' },
  'Deferred':    { bg: '#f3f4f6', text: '#6b7280' },
};

function SevBadge({ s }: { s: string }) {
  const c = SEV_COLOR[s] || SEV_COLOR.Low;
  return <span style={{ background: c.bg, color: c.text, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
    <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, display: 'inline-block' }} />{s}
  </span>;
}
function StatusBadge({ s }: { s: string }) {
  const c = STATUS_COLOR[s] || STATUS_COLOR.Open;
  return <span style={{ background: c.bg, color: c.text, padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{s}</span>;
}

export default function DefectsManager({ currentProjectId, currentSprintId, onNavigateTo }: Props) {
  const tok = () => localStorage.getItem('iq_token') || '';

  // List state
  const [defects, setDefects] = useState<Defect[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSev, setFilterSev] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'list' | 'kanban' | 'analytics'>('list');

  // Drawer / detail
  const [selectedDefect, setSelectedDefect] = useState<Defect | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // AI Analysis
  const [analyzeMode, setAnalyzeMode] = useState(false);
  const [pastedLogs, setPastedLogs] = useState('');
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // Smart Regression
  const [showRegression, setShowRegression] = useState(false);
  const [changeDesc, setChangeDesc] = useState('');
  const [changedModules, setChangedModules] = useState('');
  const [regressionLoading, setRegressionLoading] = useState(false);
  const [regressionResult, setRegressionResult] = useState<any>(null);

  // TMS push
  const [pushingId, setPushingId] = useState<string | null>(null);

  // Create form
  const emptyForm = {
    title: '', description: '', severity: 'Medium', priority: 'P2', status: 'Open',
    defect_type: 'Functional', module: '', environment: 'Staging',
    test_case_title: '', failure_log: '', root_cause: '', fix_suggestion: '', assigned_to: ''
  };
  const [form, setForm] = useState<any>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const pid = currentProjectId && currentProjectId !== 'ALL' ? currentProjectId : '';
      const [dRes, sRes] = await Promise.all([
        fetch(`/api/quality/defects?project_id=${pid}`, { headers: { Authorization: `Bearer ${tok()}` } }),
        fetch(`/api/quality/defects/stats?project_id=${pid}`, { headers: { Authorization: `Bearer ${tok()}` } }),
      ]);
      const dData = await dRes.json(); setDefects(dData.defects || []);
      const sData = await sRes.json(); setStats(sData);
    } catch {}
    setLoading(false);
  }, [currentProjectId]);

  useEffect(() => { load(); }, [load]);

  const filtered = defects.filter(d => {
    if (filterStatus && d.status !== filterStatus) return false;
    if (filterSev && d.severity !== filterSev) return false;
    if (search && !d.title.toLowerCase().includes(search.toLowerCase()) && !d.module.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // ─── Create ───
  const createDefect = async () => {
    if (!form.title.trim()) return;
    setSaving(true); setSaveErr('');
    try {
      const res = await fetch('/api/quality/defects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({ ...form, project_id: currentProjectId !== 'ALL' ? currentProjectId : 'PROJ-DEFAULT', sprint_id: currentSprintId || null }),
      });
      const data = await res.json();
      if (data.success) { setShowCreateModal(false); setForm(emptyForm); load(); }
      else setSaveErr(data.error || 'Failed to create');
    } catch (e: any) { setSaveErr(e.message); }
    setSaving(false);
  };

  // ─── Update status/severity inline ───
  const quickUpdate = async (id: string, field: string, value: string) => {
    await fetch(`/api/quality/defects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
      body: JSON.stringify({ [field]: value, ...(field === 'status' && value === 'Resolved' ? { resolved_at: new Date().toISOString() } : {}) }),
    });
    setDefects(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  // ─── Push to TMS ───
  const pushToTMS = async (defect: Defect, tmsType = 'jira') => {
    setPushingId(defect.id);
    try {
      const res = await fetch(`/api/quality/defects/${defect.id}/push-tms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({ tms_type: tmsType }),
      });
      const data = await res.json();
      if (data.success) {
        setDefects(prev => prev.map(d => d.id === defect.id ? { ...d, tms_issue_key: data.issue_key, tms_url: data.url } : d));
        alert(`✅ Created ${data.issue_key} in ${tmsType.toUpperCase()}`);
      } else {
        alert(`⚠️ ${data.error}`);
      }
    } catch {}
    setPushingId(null);
  };

  // ─── AI Analyze from pasted logs ───
  const analyzeFromLogs = async () => {
    if (!pastedLogs.trim()) return;
    setAnalyzeLoading(true); setAnalysisResult(null);
    try {
      // Parse pasted logs as fake failed tests
      const fakeTests = [{ id: `PASTE-${Date.now()}`, title: 'Pasted failure log', status: 'failed', failure_log: pastedLogs, logs: [pastedLogs] }];
      const res = await fetch('/api/quality/defects/analyze-failures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({ project_id: currentProjectId, sprint_id: currentSprintId, failed_tests: fakeTests }),
      });
      const data = await res.json();
      setAnalysisResult(data);
      if (data.raised_count > 0) load();
    } catch (e: any) { setAnalysisResult({ error: e.message }); }
    setAnalyzeLoading(false);
  };

  // ─── Smart Regression ───
  const runSmartRegression = async () => {
    if (!changeDesc.trim()) return;
    setRegressionLoading(true); setRegressionResult(null);
    try {
      const res = await fetch('/api/quality/defects/smart-regression', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({
          project_id: currentProjectId, change_description: changeDesc,
          changed_modules: changedModules.split(',').map(s => s.trim()).filter(Boolean)
        }),
      });
      const data = await res.json();
      setRegressionResult(data);
    } catch (e: any) { setRegressionResult({ error: e.message }); }
    setRegressionLoading(false);
  };

  const del = async (id: string) => {
    if (!confirm('Delete this defect?')) return;
    await fetch(`/api/quality/defects/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tok()}` } });
    setDefects(p => p.filter(d => d.id !== id));
  };

  // ── Render helpers ──
  const StatCard = ({ label, value, sub, color, icon: Icon }: any) => (
    <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #dbe2ea', flex: 1, minWidth: 120 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#6b82ab', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        {Icon && <Icon style={{ width: 16, height: 16, color: color || '#6b82ab' }} />}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: color || '#1f3965', lineHeight: 1 }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 11, color: '#a6b4cd', marginTop: 4 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ padding: '0 0 40px', fontFamily: '"Lato", Arial, sans-serif' }}>

      {/* ─── Header ─── */}
      <div style={{ background: 'linear-gradient(135deg, #1f3965 0%, #2563eb 100%)', borderRadius: 16, padding: '24px 28px', marginBottom: 24, color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <Bug style={{ width: 22, height: 22 }} />
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Defect Management</h2>
              <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                {defects.length} total
              </span>
            </div>
            <p style={{ fontSize: 13, opacity: 0.8, margin: 0 }}>
              AI-powered failure analysis · Auto-raise defects · Push to Jira / TestRail · Smart regression selection
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setAnalyzeMode(true)} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Wand2 style={{ width: 14, height: 14 }} /> Analyze Failures
            </button>
            <button onClick={() => setShowRegression(true)} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Target style={{ width: 14, height: 14 }} /> Smart Regression
            </button>
            <button onClick={() => setShowCreateModal(true)} style={{ background: '#fff', color: '#1f3965', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus style={{ width: 14, height: 14 }} /> Raise Defect
            </button>
          </div>
        </div>
      </div>

      {/* ─── Stats Row ─── */}
      {stats && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <StatCard label="Open" value={stats.open} sub="Needs attention" color="#dc2626" icon={AlertOctagon} />
          <StatCard label="Critical" value={stats.critical} sub="Blocking release" color="#c0392b" icon={AlertTriangle} />
          <StatCard label="High" value={stats.high} sub="Priority fix" color="#e67e22" icon={TrendingUp} />
          <StatCard label="In Progress" value={stats.inprog} sub="Being fixed" color="#d97706" icon={Activity} />
          <StatCard label="Resolved" value={stats.resolved} sub="Fixed & verified" color="#059669" icon={CheckCircle2} />
          <StatCard label="Total" value={stats.total} sub="All time" color="#1f3965" icon={BarChart2} />
        </div>
      )}

      {/* ─── View Tabs + Filters ─── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {/* View switcher */}
        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 8, padding: 3, gap: 2 }}>
          {(['list', 'kanban', 'analytics'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{ padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, textTransform: 'capitalize',
                background: view === v ? '#fff' : 'transparent', color: view === v ? '#1f3965' : '#6b82ab',
                boxShadow: view === v ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
              {v}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#a6b4cd' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search defects…"
            style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7, border: '1px solid #dbe2ea', borderRadius: 8, fontSize: 12, color: '#1f3965', background: '#f8fafc', boxSizing: 'border-box' }} />
        </div>

        {/* Status filter */}
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '7px 12px', border: '1px solid #dbe2ea', borderRadius: 8, fontSize: 12, color: '#1f3965', background: '#fff' }}>
          <option value="">All Statuses</option>
          {['Open','In Progress','Resolved','Closed','Deferred'].map(s => <option key={s}>{s}</option>)}
        </select>

        {/* Severity filter */}
        <select value={filterSev} onChange={e => setFilterSev(e.target.value)}
          style={{ padding: '7px 12px', border: '1px solid #dbe2ea', borderRadius: 8, fontSize: 12, color: '#1f3965', background: '#fff' }}>
          <option value="">All Severities</option>
          {['Critical','High','Medium','Low'].map(s => <option key={s}>{s}</option>)}
        </select>

        <button onClick={load} style={{ padding: '7px 12px', border: '1px solid #dbe2ea', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>
          <RefreshCw style={{ width: 14, height: 14, color: '#6b82ab' }} />
        </button>
      </div>

      {/* ─── LIST VIEW ─── */}
      {view === 'list' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #dbe2ea', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <Loader2 style={{ width: 28, height: 28, color: '#1e96df', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
              <p style={{ color: '#6b82ab', fontSize: 13 }}>Loading defects…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <CheckCircle2 style={{ width: 40, height: 40, color: '#27ae60', margin: '0 auto 12px' }} />
              <p style={{ fontSize: 16, fontWeight: 700, color: '#1f3965', marginBottom: 6 }}>No Defects Found</p>
              <p style={{ fontSize: 13, color: '#6b82ab' }}>
                {filterStatus || filterSev || search ? 'No defects match the current filters.' : 'Great quality! No defects have been raised yet.'}
              </p>
              {!filterStatus && !filterSev && !search && (
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
                  <button onClick={() => setAnalyzeMode(true)} style={{ padding: '10px 20px', background: '#1e96df', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                    Analyze Test Failures
                  </button>
                  <button onClick={() => setShowCreateModal(true)} style={{ padding: '10px 20px', background: '#f8fafc', color: '#1f3965', border: '1px solid #dbe2ea', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                    Raise Manually
                  </button>
                </div>
              )}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #dbe2ea' }}>
                  {['ID', 'Defect Title', 'Severity', 'Priority', 'Status', 'Module', 'Type', 'Raised', 'TMS', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#6b82ab', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d, i) => (
                  <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f0f7ff')}
                    onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafbfc')}>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: '#6b82ab', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{d.id.slice(-8)}</td>
                    <td style={{ padding: '10px 12px', maxWidth: 280 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1f3965', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</div>
                      {d.test_case_title && <div style={{ fontSize: 10, color: '#a6b4cd' }}>📎 {d.test_case_title}</div>}
                      {d.raised_by === 'ai-auto' && <span style={{ fontSize: 9, background: '#eaf5fd', color: '#1e96df', padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>🤖 AI-Raised</span>}
                    </td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}><SevBadge s={d.severity} /></td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: d.priority === 'P0' ? '#c0392b' : d.priority === 'P1' ? '#e67e22' : '#6b82ab' }}>{d.priority}</span>
                    </td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      <select value={d.status} onChange={e => quickUpdate(d.id, 'status', e.target.value)}
                        style={{ ...( STATUS_COLOR[d.status] ? { background: STATUS_COLOR[d.status].bg, color: STATUS_COLOR[d.status].text } : {}), border: 'none', borderRadius: 12, padding: '3px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        {['Open','In Progress','Resolved','Closed','Deferred'].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b82ab' }}>{d.module || '—'}</td>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: '#6b82ab', whiteSpace: 'nowrap' }}>{d.defect_type}</td>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: '#a6b4cd', whiteSpace: 'nowrap' }}>{new Date(d.raised_at).toLocaleDateString()}</td>
                    <td style={{ padding: '10px 12px' }}>
                      {d.tms_issue_key ? (
                        <a href={d.tms_url || '#'} target="_blank" rel="noreferrer"
                          style={{ fontSize: 11, color: '#1e96df', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                          {d.tms_issue_key} <ExternalLink style={{ width: 10, height: 10 }} />
                        </a>
                      ) : (
                        <button onClick={() => pushToTMS(d)} disabled={pushingId === d.id}
                          style={{ fontSize: 10, background: '#f0f7ff', color: '#1e96df', border: '1px solid #bee3f8', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {pushingId === d.id ? '…' : '↑ Jira'}
                        </button>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => setSelectedDefect(d)} title="View details" style={{ padding: 5, background: '#f8fafc', border: '1px solid #dbe2ea', borderRadius: 6, cursor: 'pointer' }}>
                          <Eye style={{ width: 12, height: 12, color: '#6b82ab' }} />
                        </button>
                        <button onClick={() => del(d.id)} title="Delete" style={{ padding: 5, background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: 6, cursor: 'pointer' }}>
                          <Trash2 style={{ width: 12, height: 12, color: '#fc8181' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ─── KANBAN VIEW ─── */}
      {view === 'kanban' && (
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
          {['Open', 'In Progress', 'Resolved', 'Closed'].map(col => {
            const colDefects = filtered.filter(d => d.status === col);
            const colColor = STATUS_COLOR[col];
            return (
              <div key={col} style={{ minWidth: 260, flex: '0 0 260px', background: '#f8fafc', borderRadius: 12, border: '1px solid #dbe2ea', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', background: colColor.bg, borderBottom: '1px solid #dbe2ea', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: 12, color: colColor.text, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{col}</span>
                  <span style={{ background: colColor.text, color: '#fff', borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>{colDefects.length}</span>
                </div>
                <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '70vh', overflowY: 'auto' }}>
                  {colDefects.map(d => (
                    <div key={d.id} onClick={() => setSelectedDefect(d)}
                      style={{ background: '#fff', borderRadius: 10, padding: 12, border: '1px solid #dbe2ea', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = '#1e96df')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = '#dbe2ea')}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#1f3965', marginBottom: 6, lineHeight: 1.3 }}>{d.title}</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <SevBadge s={d.severity} />
                        <span style={{ fontSize: 10, color: '#6b82ab', background: '#f8fafc', border: '1px solid #dbe2ea', borderRadius: 10, padding: '1px 6px' }}>{d.module || 'General'}</span>
                        {d.raised_by === 'ai-auto' && <span style={{ fontSize: 9, background: '#eaf5fd', color: '#1e96df', padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>🤖 AI</span>}
                      </div>
                      {d.tms_issue_key && <div style={{ marginTop: 6, fontSize: 10, color: '#1e96df', fontWeight: 700 }}>🔗 {d.tms_issue_key}</div>}
                    </div>
                  ))}
                  {colDefects.length === 0 && <div style={{ padding: '20px 0', textAlign: 'center', color: '#a6b4cd', fontSize: 12 }}>No defects</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── ANALYTICS VIEW ─── */}
      {view === 'analytics' && stats && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* By Module */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #dbe2ea', padding: 20 }}>
            <h4 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 800, color: '#1f3965' }}>🔥 Defects by Module</h4>
            {(stats.byModule || []).map((m: any) => (
              <div key={m.module} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 12, color: '#1f3965', fontWeight: 600 }}>{m.module || 'Unknown'}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#c0392b' }}>{m.c}</span>
                </div>
                <div style={{ background: '#f1f5f9', borderRadius: 4, height: 6 }}>
                  <div style={{ background: 'linear-gradient(90deg,#e74c3c,#f39c12)', height: 6, borderRadius: 4, width: `${Math.min(100, (m.c / Math.max(1, stats.total)) * 100 * 3)}%` }} />
                </div>
              </div>
            ))}
            {(!stats.byModule?.length) && <p style={{ color: '#a6b4cd', fontSize: 12 }}>No data yet</p>}
          </div>

          {/* By Defect Type */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #dbe2ea', padding: 20 }}>
            <h4 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 800, color: '#1f3965' }}>📋 Defects by Type</h4>
            {(stats.byType || []).map((t: any) => (
              <div key={t.defect_type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 12, color: '#1f3965' }}>{t.defect_type}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#1f3965' }}>{t.c}</span>
              </div>
            ))}
          </div>

          {/* Trend */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #dbe2ea', padding: 20, gridColumn: '1/-1' }}>
            <h4 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 800, color: '#1f3965' }}>📈 Defects Raised — Last 14 Days</h4>
            {(stats.trend || []).length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
                {(stats.trend || []).map((t: any) => {
                  const max = Math.max(...(stats.trend || []).map((x: any) => x.c), 1);
                  return (
                    <div key={t.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ background: '#e74c3c', borderRadius: '3px 3px 0 0', width: '80%', height: `${(t.c / max) * 60}px`, minHeight: 4 }} title={`${t.c} defects`} />
                      <span style={{ fontSize: 9, color: '#a6b4cd', transform: 'rotate(-45deg)', transformOrigin: 'right', whiteSpace: 'nowrap' }}>{t.day?.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            ) : <p style={{ color: '#a6b4cd', fontSize: 12 }}>No trend data yet. Defects raised over time will appear here.</p>}
          </div>
        </div>
      )}

      {/* ─── DETAIL DRAWER ─── */}
      {selectedDefect && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '100%', maxWidth: 560, background: '#fff', height: '100%', overflowY: 'auto', boxShadow: '-4px 0 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }}>
            {/* Drawer header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #dbe2ea', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#f8fafc' }}>
              <div style={{ flex: 1, paddingRight: 16 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <SevBadge s={selectedDefect.severity} />
                  <StatusBadge s={selectedDefect.status} />
                  <span style={{ fontSize: 10, color: '#6b82ab', fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>{selectedDefect.id}</span>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1f3965', margin: 0, lineHeight: 1.3 }}>{selectedDefect.title}</h3>
              </div>
              <button onClick={() => setSelectedDefect(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b82ab', padding: 4 }}><X style={{ width: 20, height: 20 }} /></button>
            </div>

            <div style={{ padding: 24, flex: 1 }}>
              {/* Quick actions */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                {['Open','In Progress','Resolved','Closed'].map(s => (
                  <button key={s} onClick={() => { quickUpdate(selectedDefect.id, 'status', s); setSelectedDefect({...selectedDefect, status: s as any}); }}
                    style={{ fontSize: 11, padding: '5px 12px', borderRadius: 20, border: `1px solid ${STATUS_COLOR[s]?.text || '#dbe2ea'}`, background: selectedDefect.status === s ? (STATUS_COLOR[s]?.bg || '#f8fafc') : '#fff', color: STATUS_COLOR[s]?.text || '#6b82ab', cursor: 'pointer', fontWeight: 700 }}>
                    {s}
                  </button>
                ))}
                <button onClick={() => pushToTMS(selectedDefect)} disabled={!!selectedDefect.tms_issue_key || pushingId === selectedDefect.id}
                  style={{ fontSize: 11, padding: '5px 14px', borderRadius: 20, border: '1px solid #1e96df', background: selectedDefect.tms_issue_key ? '#eaf5fd' : '#fff', color: '#1e96df', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Link2 style={{ width: 12, height: 12 }} />
                  {selectedDefect.tms_issue_key ? selectedDefect.tms_issue_key : pushingId === selectedDefect.id ? 'Pushing…' : 'Push to Jira'}
                </button>
              </div>

              {/* Fields */}
              {[
                { label: 'Module', value: selectedDefect.module },
                { label: 'Type', value: selectedDefect.defect_type },
                { label: 'Priority', value: selectedDefect.priority },
                { label: 'Environment', value: selectedDefect.environment },
                { label: 'Raised By', value: selectedDefect.raised_by === 'ai-auto' ? '🤖 AI Auto-Raised' : selectedDefect.raised_by },
                { label: 'Raised On', value: new Date(selectedDefect.raised_at).toLocaleString() },
                { label: 'Linked Test Case', value: selectedDefect.test_case_title || selectedDefect.test_case_id },
              ].map(f => f.value ? (
                <div key={f.label} style={{ display: 'flex', gap: 12, marginBottom: 10, borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#6b82ab', minWidth: 130, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.label}</span>
                  <span style={{ fontSize: 13, color: '#1f3965', flex: 1 }}>{f.value}</span>
                </div>
              ) : null)}

              {selectedDefect.description && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#6b82ab', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Description</div>
                  <div style={{ fontSize: 13, color: '#1f3965', background: '#f8fafc', borderRadius: 8, padding: 12, lineHeight: 1.6 }}>{selectedDefect.description}</div>
                </div>
              )}

              {selectedDefect.root_cause && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#6b82ab', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Root Cause</div>
                  <div style={{ fontSize: 13, color: '#1f3965', background: '#fff5ec', borderRadius: 8, padding: 12, lineHeight: 1.6, borderLeft: '3px solid #e67e22' }}>{selectedDefect.root_cause}</div>
                </div>
              )}

              {selectedDefect.fix_suggestion && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#6b82ab', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Fix Suggestion</div>
                  <div style={{ fontSize: 13, color: '#1f3965', background: '#f0fff4', borderRadius: 8, padding: 12, lineHeight: 1.6, borderLeft: '3px solid #27ae60' }}>{selectedDefect.fix_suggestion}</div>
                </div>
              )}

              {selectedDefect.failure_log && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#6b82ab', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Failure Log</div>
                  <pre style={{ fontSize: 11, background: '#1a1a2e', color: '#e0e0ff', borderRadius: 8, padding: 12, overflow: 'auto', maxHeight: 200, lineHeight: 1.5 }}>{selectedDefect.failure_log}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── AI ANALYZE FAILURES MODAL ─── */}
      {analyzeMode && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1f3965', margin: 0 }}>🤖 AI Failure Analysis</h3>
                <p style={{ fontSize: 12, color: '#6b82ab', margin: '4px 0 0' }}>Paste failure logs — AI decides which are real defects vs. script errors, then auto-raises defects</p>
              </div>
              <button onClick={() => { setAnalyzeMode(false); setAnalysisResult(null); setPastedLogs(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b82ab' }}><X style={{ width: 20, height: 20 }} /></button>
            </div>

            <label style={{ fontSize: 11, fontWeight: 700, color: '#6b82ab', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>Paste failure logs / test output</label>
            <textarea value={pastedLogs} onChange={e => setPastedLogs(e.target.value)} rows={8}
              placeholder={`Paste test failure logs, CI output, JUnit XML, or any failure report here.\n\nExample:\nFAILED: Login_Test\nExpected: Dashboard page\nActual: Error 500 - Internal Server Error\nStack: com.app.LoginController.authenticate(LoginController.java:45)\n\nFAILED: Search_Test  \nNoSuchElementException: Unable to find element #search-btn\n...`}
              style={{ width: '100%', border: '1px solid #dbe2ea', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#1f3965', background: '#f8fafc', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'monospace', lineHeight: 1.5 }} />

            <button onClick={analyzeFromLogs} disabled={analyzeLoading || !pastedLogs.trim()}
              style={{ marginTop: 14, width: '100%', padding: '12px', background: analyzeLoading || !pastedLogs.trim() ? '#a6b4cd' : 'linear-gradient(135deg,#1f3965,#1e96df)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {analyzeLoading ? <><Loader2 style={{ width: 16, height: 16 }} /> Analyzing…</> : <><Sparkles style={{ width: 16, height: 16 }} /> Analyze & Auto-Raise Defects</>}
            </button>

            {analysisResult && (
              <div style={{ marginTop: 20, padding: 16, background: analysisResult.error ? '#fff0f0' : '#f0fff4', borderRadius: 10, border: `1px solid ${analysisResult.error ? '#f5a0a0' : '#a7f3d0'}` }}>
                {analysisResult.error ? (
                  <p style={{ color: '#c0392b', fontWeight: 700, margin: 0 }}>⚠️ {analysisResult.error}</p>
                ) : (
                  <>
                    <p style={{ fontWeight: 800, color: '#059669', margin: '0 0 12px' }}>
                      ✅ Analysis complete — {analysisResult.raised_count} defect(s) auto-raised
                    </p>
                    {(analysisResult.analyses || []).map((a: any, i: number) => (
                      <div key={i} style={{ background: '#fff', borderRadius: 8, padding: 12, marginBottom: 8, border: '1px solid #dbe2ea' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                          {a.is_functional_defect
                            ? <span style={{ background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>🐛 Functional Defect</span>
                            : <span style={{ background: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>🔧 Script Error</span>}
                          <span style={{ fontSize: 10, color: '#6b82ab' }}>Confidence: {a.confidence}%</span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1f3965', marginBottom: 4 }}>{a.defect_title}</div>
                        <div style={{ fontSize: 11, color: '#6b82ab' }}>{a.root_cause}</div>
                        {!a.is_functional_defect && a.script_fix_needed && (
                          <div style={{ fontSize: 11, color: '#d97706', marginTop: 4, background: '#fef3c7', padding: '4px 8px', borderRadius: 6 }}>
                            Script fix: {a.script_fix_needed}
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── SMART REGRESSION MODAL ─── */}
      {showRegression && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1f3965', margin: 0 }}>🎯 Smart Regression Selection</h3>
                <p style={{ fontSize: 12, color: '#6b82ab', margin: '4px 0 0' }}>Describe what changed — AI identifies only the impacted tests (60–80% reduction)</p>
              </div>
              <button onClick={() => { setShowRegression(false); setRegressionResult(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b82ab' }}><X style={{ width: 20, height: 20 }} /></button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#6b82ab', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>What changed? *</label>
              <textarea value={changeDesc} onChange={e => setChangeDesc(e.target.value)} rows={3}
                placeholder="e.g. 'Added new payment gateway — Stripe integration replacing old PayPal flow. Login page updated with 2FA requirement.'"
                style={{ width: '100%', border: '1px solid #dbe2ea', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#1f3965', background: '#f8fafc', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#6b82ab', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>Modules changed (comma-separated)</label>
              <input value={changedModules} onChange={e => setChangedModules(e.target.value)} placeholder="e.g. Payment, Login, Checkout"
                style={{ width: '100%', border: '1px solid #dbe2ea', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#1f3965', background: '#f8fafc', boxSizing: 'border-box' }} />
            </div>

            <button onClick={runSmartRegression} disabled={regressionLoading || !changeDesc.trim()}
              style={{ width: '100%', padding: '12px', background: regressionLoading || !changeDesc.trim() ? '#a6b4cd' : 'linear-gradient(135deg,#6366f1,#1e96df)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {regressionLoading ? <><Loader2 style={{ width: 16, height: 16 }} /> Analyzing impact…</> : <><Target style={{ width: 16, height: 16 }} /> Find Impacted Tests</>}
            </button>

            {regressionResult && !regressionResult.error && (
              <div style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Total Tests', value: regressionResult.total, color: '#6b82ab' },
                    { label: 'Must Run', value: regressionResult.impacted_count, color: '#e74c3c' },
                    { label: 'Reduction', value: `${regressionResult.reduction_pct}%`, color: '#27ae60' },
                    { label: 'Risk', value: regressionResult.risk_level, color: regressionResult.risk_level === 'High' ? '#e67e22' : '#27ae60' },
                  ].map(c => (
                    <div key={c.label} style={{ flex: 1, minWidth: 100, background: '#f8fafc', borderRadius: 10, padding: '12px 16px', border: '1px solid #dbe2ea', textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: c.color }}>{c.value}</div>
                      <div style={{ fontSize: 10, color: '#6b82ab', fontWeight: 700, textTransform: 'uppercase' }}>{c.label}</div>
                    </div>
                  ))}
                </div>

                {regressionResult.rationale && (
                  <div style={{ background: '#eaf5fd', borderRadius: 8, padding: 12, marginBottom: 12, borderLeft: '3px solid #1e96df' }}>
                    <p style={{ fontSize: 12, color: '#1f3965', margin: 0, lineHeight: 1.5 }}>{regressionResult.rationale}</p>
                  </div>
                )}

                <h5 style={{ fontSize: 12, fontWeight: 800, color: '#1f3965', marginBottom: 8 }}>
                  Tests to include in regression suite ({regressionResult.impacted_count}):
                </h5>
                <div style={{ maxHeight: 220, overflowY: 'auto', background: '#f8fafc', borderRadius: 8, border: '1px solid #dbe2ea' }}>
                  {(regressionResult.impacted_tests || []).map((tc: any) => (
                    <div key={tc.id} style={{ padding: '8px 12px', borderBottom: '1px solid #dbe2ea', display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 9, background: regressionResult.directly_impacted?.includes(tc.id) ? '#fee2e2' : '#fef3c7', color: regressionResult.directly_impacted?.includes(tc.id) ? '#dc2626' : '#d97706', padding: '2px 6px', borderRadius: 10, fontWeight: 700 }}>
                        {regressionResult.directly_impacted?.includes(tc.id) ? 'Direct' : 'Indirect'}
                      </span>
                      <span style={{ fontSize: 12, color: '#1f3965', flex: 1 }}>{tc.title}</span>
                      <span style={{ fontSize: 10, color: '#a6b4cd' }}>{tc.module}</span>
                    </div>
                  ))}
                  {!regressionResult.impacted_tests?.length && <div style={{ padding: 20, textAlign: 'center', color: '#a6b4cd', fontSize: 12 }}>No tests impacted</div>}
                </div>
              </div>
            )}
            {regressionResult?.error && <div style={{ marginTop: 16, padding: 12, background: '#fff0f0', borderRadius: 8, color: '#c0392b', fontSize: 12 }}>⚠️ {regressionResult.error}</div>}
          </div>
        </div>
      )}

      {/* ─── CREATE DEFECT MODAL ─── */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1f3965', margin: 0 }}>🐛 Raise New Defect</h3>
              <button onClick={() => { setShowCreateModal(false); setForm(emptyForm); setSaveErr(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b82ab' }}><X style={{ width: 20, height: 20 }} /></button>
            </div>

            {/* Title */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#6b82ab', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Defect Title *</label>
              <input value={form.title} onChange={e => setForm((f: any) => ({ ...f, title: e.target.value }))} placeholder="Describe what went wrong in plain language"
                style={{ width: '100%', border: '1px solid #dbe2ea', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#1f3965', background: '#f8fafc', boxSizing: 'border-box' }} />
            </div>

            {/* Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              {[
                { key: 'severity', label: 'Severity', opts: ['Critical','High','Medium','Low'] },
                { key: 'priority', label: 'Priority', opts: ['P0','P1','P2','P3'] },
                { key: 'defect_type', label: 'Type', opts: ['Functional','UI','Performance','Security','Data','Integration','Regression'] },
                { key: 'environment', label: 'Environment', opts: ['Production','Staging','QA','Dev','UAT'] },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#6b82ab', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.label}</label>
                  <select value={form[f.key]} onChange={e => setForm((prev: any) => ({ ...prev, [f.key]: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #dbe2ea', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#1f3965', background: '#fff' }}>
                    {f.opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#6b82ab', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Module / Feature Area</label>
              <input value={form.module} onChange={e => setForm((f: any) => ({ ...f, module: e.target.value }))} placeholder="e.g. Login, Payment, Dashboard"
                style={{ width: '100%', border: '1px solid #dbe2ea', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#1f3965', background: '#f8fafc', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#6b82ab', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Description</label>
              <textarea value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} rows={3}
                placeholder="What happened? What was expected? What is the impact?"
                style={{ width: '100%', border: '1px solid #dbe2ea', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#1f3965', background: '#f8fafc', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#6b82ab', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Root Cause</label>
                <input value={form.root_cause} onChange={e => setForm((f: any) => ({ ...f, root_cause: e.target.value }))} placeholder="Known root cause"
                  style={{ width: '100%', border: '1px solid #dbe2ea', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#1f3965', background: '#f8fafc', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#6b82ab', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Assigned To</label>
                <input value={form.assigned_to} onChange={e => setForm((f: any) => ({ ...f, assigned_to: e.target.value }))} placeholder="developer@team.com"
                  style={{ width: '100%', border: '1px solid #dbe2ea', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#1f3965', background: '#f8fafc', boxSizing: 'border-box' }} />
              </div>
            </div>

            {saveErr && <div style={{ marginBottom: 12, padding: '10px 14px', background: '#fff0f0', border: '1px solid #f5a0a0', borderRadius: 8, color: '#c0392b', fontSize: 13, fontWeight: 600 }}>⚠️ {saveErr}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={createDefect} disabled={saving || !form.title.trim()}
                style={{ flex: 1, padding: '12px', background: saving || !form.title.trim() ? '#a6b4cd' : '#1e96df', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                {saving ? '⏳ Saving…' : '🐛 Raise Defect'}
              </button>
              <button onClick={() => { setShowCreateModal(false); setForm(emptyForm); setSaveErr(''); }}
                style={{ padding: '12px 20px', background: '#f8fafc', color: '#6b82ab', border: '1px solid #dbe2ea', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
