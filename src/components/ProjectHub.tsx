import React, { useState, useEffect } from 'react';
import {
  FolderOpen, Plus, Edit3, Trash2, X, ChevronDown, ChevronRight,
  ArrowRight, Layers, Play, BookOpen, Target, TrendingUp, Zap,
  CheckCircle, Clock, AlertTriangle, BarChart3, GitBranch, Calendar
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Project {
  id: string;
  name: string;
  description: string;
  app_url?: string;
  tech_stack?: string;
  owner_email?: string;
  status: 'active' | 'archived' | 'planning';
  color: string;
  icon: string;
  created_at: string;
  updated_at?: string;
}

interface Sprint {
  id: string;
  project_id: string;
  name: string;
  goal: string;
  start_date: string;
  end_date: string;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  velocity: number;
  created_at: string;
}

interface RunVersion {
  id: string;
  project_id: string;
  sprint_id?: string;
  run_label: string;
  module: string;
  run_type: string;
  total_tests: number;
  passed: number;
  failed: number;
  healed: number;
  pass_rate: number;
  duration_ms: number;
  environment: string;
  branch: string;
  triggered_by: string;
  ai_summary?: string;
  notes?: string;
  created_at: string;
}

interface ProjectHubProps {
  currentProjectId: string;
  onSelectProject: (id: string) => void;
  onNavigateTo: (tab: string) => void;
}

const PROJECT_ICONS = ['🚀', '⚡', '🎯', '🔥', '💎', '🌟', '🛡️', '🧩', '📱', '🌐', '🔐', '🏗️'];
const PROJECT_COLORS = ['#1e96df', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

// ── Velocity Sparkline ────────────────────────────────────────────────────────
function VelocitySparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#a6b4cd' }}>
        <span>No trend yet</span>
      </div>
    );
  }
  const W = 120, H = 32, pad = 4;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (W - pad * 2);
    const y = H - pad - ((v - min) / range) * (H - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = values[values.length - 1];
  const prev = values[values.length - 2];
  const delta = last - prev;
  const trendColor = delta >= 0 ? '#10b981' : '#ef4444';
  const trendIcon = delta >= 0 ? '↑' : '↓';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width={W} height={H} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {/* Fill area */}
        <polygon
          points={`${pts[0]},${H - pad} ${pts.join(' ')} ${pts[pts.length - 1].split(',')[0]},${H - pad}`}
          fill={`url(#grad-${color.replace('#', '')})`}
        />
        {/* Line */}
        <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {/* Last dot */}
        <circle
          cx={parseFloat(pts[pts.length - 1].split(',')[0])}
          cy={parseFloat(pts[pts.length - 1].split(',')[1])}
          r="3.5" fill={color} stroke="#fff" strokeWidth="1.5"
        />
      </svg>
      <div style={{ fontSize: 11 }}>
        <div style={{ color: trendColor, fontWeight: 800 }}>{trendIcon} {Math.abs(delta).toFixed(0)}%</div>
        <div style={{ color: '#a6b4cd' }}>last: {last.toFixed(0)}%</div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ProjectHub({ currentProjectId, onSelectProject, onNavigateTo }: ProjectHubProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [runs, setRuns] = useState<RunVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'projects' | 'sprints' | 'runs'>('projects');
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateSprint, setShowCreateSprint] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [expandedSprint, setExpandedSprint] = useState<string | null>(null);
  const [justCreatedProject, setJustCreatedProject] = useState<Project | null>(null);

  // Form states
  const [form, setForm] = useState({ name: '', description: '', app_url: '', tech_stack: '', owner_email: '', color: '#1e96df', icon: '🚀', status: 'active' });
  const [sprintForm, setSprintForm] = useState({ name: '', goal: '', start_date: '', end_date: '', project_id: currentProjectId, status: 'planning' });
  const [saving, setSaving] = useState(false);
  const [filterProject, setFilterProject] = useState(currentProjectId || 'ALL');
  const token = () => localStorage.getItem('iq_token') || '';

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { setFilterProject(currentProjectId || 'ALL'); }, [currentProjectId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [pRes, sRes, rRes] = await Promise.all([
        fetch('/api/quality/projects', { headers: { Authorization: `Bearer ${token()}` } }),
        fetch('/api/quality/sprints', { headers: { Authorization: `Bearer ${token()}` } }),
        fetch('/api/quality/run-versions', { headers: { Authorization: `Bearer ${token()}` } }),
      ]);
      const [pData, sData, rData] = await Promise.all([pRes.json(), sRes.json(), rRes.json()]);
      setProjects(pData.projects || []);
      setSprints(sData.sprints || []);
      setRuns(rData.runs || []);
    } catch (e) { console.warn('ProjectHub load error', e); }
    setLoading(false);
  };

  const saveProject = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const method = editingProject ? 'PATCH' : 'POST';
      const url = editingProject ? `/api/quality/projects/${editingProject.id}` : '/api/quality/projects';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        await loadAll();
        setShowCreateProject(false);
        setEditingProject(null);
        const created = data.project;
        setForm({ name: '', description: '', app_url: '', tech_stack: '', owner_email: '', color: '#1e96df', icon: '🚀', status: 'active' });
        if (created?.id) {
          onSelectProject(created.id);
          if (!editingProject) setJustCreatedProject(created);
        }
      }
    } catch {}
    setSaving(false);
  };

  const saveSprint = async () => {
    if (!sprintForm.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/quality/sprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ ...sprintForm, project_id: filterProject !== 'ALL' ? filterProject : sprintForm.project_id }),
      });
      const data = await res.json();
      if (data.success) {
        await loadAll();
        setShowCreateSprint(false);
        setSprintForm({ name: '', goal: '', start_date: '', end_date: '', project_id: currentProjectId, status: 'planning' });
      }
    } catch {}
    setSaving(false);
  };

  const deleteProject = async (id: string) => {
    if (!confirm('Delete this project and all its data?')) return;
    await fetch(`/api/quality/projects/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
    await loadAll();
    if (currentProjectId === id) onSelectProject('ALL');
  };

  const updateSprintStatus = async (id: string, status: string) => {
    await fetch(`/api/quality/sprints/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ status }),
    });
    await loadAll();
  };

  const startEdit = (p: Project) => {
    setEditingProject(p);
    setForm({ name: p.name, description: p.description, app_url: p.app_url || '', tech_stack: p.tech_stack || '', owner_email: p.owner_email || '', color: p.color, icon: p.icon, status: p.status });
    setShowCreateProject(true);
  };

  // Open Project: select + navigate to requirements in one action
  const openProject = (p: Project) => {
    onSelectProject(p.id);
    onNavigateTo('requirements');
  };

  const filteredSprints = filterProject === 'ALL' ? sprints : sprints.filter(s => s.project_id === filterProject);
  const filteredRuns = filterProject === 'ALL' ? runs : runs.filter(r => r.project_id === filterProject);
  const activeProject = projects.find(p => p.id === currentProjectId);

  // Stats per project
  const getProjectStats = (pid: string) => {
    const pSprints = sprints.filter(s => s.project_id === pid);
    const pRuns = runs.filter(r => r.project_id === pid);
    const latestRun = pRuns[0];
    return {
      sprintCount: pSprints.length,
      runCount: pRuns.length,
      latestPassRate: latestRun ? Math.round(latestRun.pass_rate) : null,
      activeSprint: pSprints.find(s => s.status === 'active'),
    };
  };

  // Velocity data for a sprint (pass_rate of its runs, oldest→newest)
  const getSprintVelocity = (sprintId: string) => {
    return runs
      .filter(r => r.sprint_id === sprintId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map(r => r.pass_rate);
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      planning: 'bg-sky-100 text-sky-700 border-sky-200',
      completed: 'bg-slate-100 text-slate-600 border-slate-200',
      cancelled: 'bg-red-100 text-red-600 border-red-200',
      archived: 'bg-amber-100 text-amber-700 border-amber-200',
    };
    return map[s] || 'bg-slate-100 text-slate-500 border-slate-200';
  };

  const inp = (label: string, key: string, ph: string, type = 'text') => (
    <div key={key}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b82ab', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
      <input type={type} value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={ph}
        style={{ width: '100%', border: '1px solid #dbe2ea', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#1f3965', background: '#f8fafc', boxSizing: 'border-box' }} />
    </div>
  );

  return (
    <div style={{ fontFamily: '"Lato", Arial, sans-serif' }}>

      {/* ── PAGE HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 20, borderBottom: '1px solid #dbe2ea', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#1f3965 0%,#1e96df 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FolderOpen style={{ width: 22, height: 22, color: '#fff' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1f3965', margin: 0 }}>Project Hub</h1>
            <p style={{ fontSize: 13, color: '#6b82ab', margin: '2px 0 0' }}>Create, manage and track all your applications end-to-end through STLC</p>
          </div>
        </div>
        <button onClick={() => { setEditingProject(null); setJustCreatedProject(null); setForm({ name: '', description: '', app_url: '', tech_stack: '', owner_email: '', color: '#1e96df', icon: '🚀', status: 'active' }); setShowCreateProject(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', background: '#1e96df', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px #1e96df40' }}>
          <Plus style={{ width: 16, height: 16 }} /> New Project
        </button>
      </div>

      {/* ── JUST CREATED — Quick-Start Banner ── */}
      {justCreatedProject && (
        <div style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)', border: '1.5px solid #86efac', borderRadius: 14, padding: '18px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 32 }}>{justCreatedProject.icon}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#166534' }}>
                ✅ Project "<span style={{ color: '#1f3965' }}>{justCreatedProject.name}</span>" created!
              </div>
              <div style={{ fontSize: 12, color: '#16a34a', marginTop: 3 }}>
                It's now your active project. Everything you create will be saved under it.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { label: '📋 Add Requirements', tab: 'requirements', color: '#1e96df' },
              { label: '🏃 Create Sprint', action: () => { setSprintForm(f => ({ ...f, project_id: justCreatedProject.id })); setShowCreateSprint(true); }, color: '#6366f1' },
              { label: '📚 Knowledge Base', tab: 'rag-kb', color: '#10b981' },
              { label: '🔬 Generate Test Cases', tab: 'testcases', color: '#f59e0b' },
            ].map((btn, i) => (
              <button key={i} onClick={() => {
                if (btn.action) btn.action();
                else if (btn.tab) { setJustCreatedProject(null); onNavigateTo(btn.tab); }
              }}
                style={{ padding: '8px 14px', background: '#fff', border: `1.5px solid ${btn.color}50`, borderRadius: 8, fontSize: 12, fontWeight: 700, color: btn.color, cursor: 'pointer', transition: 'all 0.15s' }}>
                {btn.label}
              </button>
            ))}
            <button onClick={() => setJustCreatedProject(null)}
              style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #bbf7d0', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b82ab' }}>
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>
      )}

      {/* ── CURRENT PROJECT BANNER ── */}
      {activeProject && !justCreatedProject && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: activeProject.color + '0e', border: `1px solid ${activeProject.color}35`, borderRadius: 12, padding: '12px 18px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>{activeProject.icon}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#1f3965' }}>Active: {activeProject.name}</div>
              <div style={{ fontSize: 11, color: '#6b82ab', marginTop: 1 }}>{activeProject.tech_stack || activeProject.description || 'No details set'}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {([
              { tab: 'requirements', label: 'Requirements', icon: '📋' },
              { tab: 'testcases', label: 'Test Cases', icon: '🔬' },
              { tab: 'execution', label: 'Execution', icon: '▶' },
              { tab: 'rag-kb', label: 'Knowledge Base', icon: '📚' },
              { tab: 'dashboard', label: 'Dashboard', icon: '📊' },
            ] as const).map(item => (
              <button key={item.tab} onClick={() => onNavigateTo(item.tab)}
                style={{ padding: '5px 11px', fontSize: 11, fontWeight: 600, color: activeProject.color, background: activeProject.color + '15', border: `1px solid ${activeProject.color}35`, borderRadius: 6, cursor: 'pointer' }}>
                {item.icon} {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB BAR ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
        {(['projects', 'sprints', 'runs'] as const).map(v => (
          <button key={v} onClick={() => setActiveView(v)}
            style={{ padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: activeView === v ? 700 : 500, border: `1px solid ${activeView === v ? '#1e96df' : '#dbe2ea'}`, background: activeView === v ? '#eaf5fd' : '#f8fafc', color: activeView === v ? '#1e96df' : '#6b82ab', cursor: 'pointer', textTransform: 'capitalize' }}>
            {v === 'projects' ? `🗂 Projects (${projects.length})` : v === 'sprints' ? '🏃 Sprints' : '▶ Run History'}
          </button>
        ))}
        {activeView !== 'projects' && (
          <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
            style={{ marginLeft: 'auto', border: '1px solid #dbe2ea', borderRadius: 8, padding: '7px 12px', fontSize: 12, color: '#1f3965', background: '#fff', cursor: 'pointer' }}>
            <option value="ALL">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
          </select>
        )}
        {activeView === 'sprints' && (
          <button onClick={() => { setSprintForm(f => ({ ...f, project_id: currentProjectId !== 'ALL' ? currentProjectId : (projects[0]?.id || '') })); setShowCreateSprint(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            <Plus style={{ width: 14, height: 14 }} /> New Sprint
          </button>
        )}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '40px', color: '#6b82ab', fontSize: 13 }}>Loading projects…</div>}

      {/* ════════════════ PROJECTS VIEW ════════════════ */}
      {!loading && activeView === 'projects' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 18 }}>
          {projects.map(p => {
            const stats = getProjectStats(p.id);
            const isActive = p.id === currentProjectId;
            return (
              <div key={p.id} style={{ background: '#fff', border: `2px solid ${isActive ? p.color : '#dbe2ea'}`, borderRadius: 14, padding: 20, transition: 'all 0.18s', boxShadow: isActive ? `0 4px 20px ${p.color}25` : '0 1px 4px rgba(31,57,101,0.06)', display: 'flex', flexDirection: 'column', gap: 0 }}>
                
                {/* Card Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: p.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, border: `1px solid ${p.color}30`, flexShrink: 0 }}>
                      {p.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#1f3965', marginBottom: 3 }}>{p.name}</div>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, border: '1px solid', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }} className={statusBadge(p.status)}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => startEdit(p)} title="Edit project"
                      style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #dbe2ea', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Edit3 style={{ width: 13, height: 13, color: '#6b82ab' }} />
                    </button>
                    <button onClick={() => deleteProject(p.id)} title="Delete project"
                      style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #fee2e2', background: '#fff5f5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash2 style={{ width: 13, height: 13, color: '#ef4444' }} />
                    </button>
                  </div>
                </div>

                {/* Description */}
                <p style={{ fontSize: 12, color: '#6b82ab', marginBottom: 12, lineHeight: 1.55, minHeight: 34 }}>{p.description || 'No description added yet'}</p>

                {/* Tech Stack chip */}
                {p.tech_stack && (
                  <div style={{ fontSize: 11, color: p.color, background: p.color + '10', border: `1px solid ${p.color}30`, borderRadius: 6, padding: '3px 10px', display: 'inline-block', marginBottom: 12, fontWeight: 600 }}>
                    {p.tech_stack}
                  </div>
                )}

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                  {[
                    { label: 'Sprints', value: stats.sprintCount, icon: '🏃' },
                    { label: 'Runs', value: stats.runCount, icon: '▶' },
                    { label: 'Pass Rate', value: stats.latestPassRate !== null ? `${stats.latestPassRate}%` : '—', icon: '✅' },
                  ].map(s => (
                    <div key={s.label} style={{ background: '#f8fafc', border: '1px solid #dbe2ea', borderRadius: 8, padding: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: 10, marginBottom: 2 }}>{s.icon}</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#1f3965' }}>{s.value}</div>
                      <div style={{ fontSize: 10, color: '#6b82ab' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Active Sprint pill */}
                {stats.activeSprint && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '7px 12px', marginBottom: 12, fontSize: 12, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>🏃</span>
                    <span>Active Sprint: <strong>{stats.activeSprint.name}</strong></span>
                  </div>
                )}

                {/* App URL */}
                {p.app_url && (
                  <div style={{ fontSize: 11, color: '#1e96df', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    🔗 <a href={p.app_url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>{p.app_url}</a>
                  </div>
                )}

                {/* ── ACTION BUTTONS ── */}
                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* PRIMARY: Open Project → Requirements */}
                  <button onClick={() => openProject(p)}
                    style={{
                      width: '100%', padding: '10px 16px',
                      background: isActive
                        ? `linear-gradient(135deg, ${p.color} 0%, ${p.color}cc 100%)`
                        : `linear-gradient(135deg, #1f3965 0%, #1e96df 100%)`,
                      color: '#fff', border: 'none', borderRadius: 9,
                      fontSize: 13, fontWeight: 800, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: '0 2px 8px rgba(31,57,101,0.18)',
                      letterSpacing: '0.01em',
                    }}>
                    {isActive ? (
                      <><span style={{ fontSize: 15 }}>{p.icon}</span> Open Project → Requirements</>
                    ) : (
                      <><ArrowRight style={{ width: 15, height: 15 }} /> Open Project</>
                    )}
                  </button>

                  {/* SECONDARY ROW */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7 }}>
                    <button onClick={() => { onSelectProject(p.id); onNavigateTo('testcases'); }}
                      style={{ padding: '7px 6px', background: '#f8fafc', border: '1px solid #dbe2ea', borderRadius: 7, fontSize: 11, fontWeight: 600, color: '#6b82ab', cursor: 'pointer', textAlign: 'center' }}>
                      🔬 Test Cases
                    </button>
                    <button onClick={() => { onSelectProject(p.id); onNavigateTo('execution'); }}
                      style={{ padding: '7px 6px', background: '#f8fafc', border: '1px solid #dbe2ea', borderRadius: 7, fontSize: 11, fontWeight: 600, color: '#6b82ab', cursor: 'pointer', textAlign: 'center' }}>
                      ▶ Execute
                    </button>
                    <button onClick={() => { onSelectProject(p.id); onNavigateTo('rag-kb'); }}
                      style={{ padding: '7px 6px', background: '#f8fafc', border: '1px solid #dbe2ea', borderRadius: 7, fontSize: 11, fontWeight: 600, color: '#6b82ab', cursor: 'pointer', textAlign: 'center' }}>
                      📚 KB
                    </button>
                  </div>
                </div>

              </div>
            );
          })}

          {/* Add new project card */}
          <button onClick={() => { setEditingProject(null); setJustCreatedProject(null); setForm({ name: '', description: '', app_url: '', tech_stack: '', owner_email: '', color: '#1e96df', icon: '🚀', status: 'active' }); setShowCreateProject(true); }}
            style={{ background: '#f8fafc', border: '2px dashed #dbe2ea', borderRadius: 14, padding: 20, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 220, transition: 'all 0.18s' }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: '#eaf5fd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus style={{ width: 26, height: 26, color: '#1e96df' }} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1e96df' }}>Create New Project</div>
            <div style={{ fontSize: 12, color: '#6b82ab', textAlign: 'center', maxWidth: 240 }}>
              Set up a new application workspace with its own requirements, test cases, sprints and knowledge base
            </div>
          </button>
        </div>
      )}

      {/* ════════════════ SPRINTS VIEW ════════════════ */}
      {!loading && activeView === 'sprints' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filteredSprints.length === 0 && (
            <div style={{ textAlign: 'center', padding: '50px', color: '#6b82ab', background: '#f8fafc', borderRadius: 12, border: '1px dashed #dbe2ea' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🏃</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>No sprints yet</div>
              <div style={{ fontSize: 13 }}>Create your first sprint to start organizing work into time-boxed iterations</div>
              <button onClick={() => { setSprintForm(f => ({ ...f, project_id: currentProjectId !== 'ALL' ? currentProjectId : '' })); setShowCreateSprint(true); }}
                style={{ marginTop: 16, padding: '9px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                <Plus style={{ width: 14, height: 14, display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />New Sprint
              </button>
            </div>
          )}

          {filteredSprints.map(s => {
            const proj = projects.find(p => p.id === s.project_id);
            const sprintRuns = runs.filter(r => r.sprint_id === s.id).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            const velocityData = getSprintVelocity(s.id);
            const isExpanded = expandedSprint === s.id;
            const daysLeft = s.end_date ? Math.ceil((new Date(s.end_date).getTime() - Date.now()) / 86400000) : null;
            const avgPassRate = sprintRuns.length ? sprintRuns.reduce((acc, r) => acc + r.pass_rate, 0) / sprintRuns.length : null;

            return (
              <div key={s.id} style={{ background: '#fff', border: '1px solid #dbe2ea', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(31,57,101,0.04)' }}>
                {/* Sprint row */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', cursor: 'pointer', gap: 14 }} onClick={() => setExpandedSprint(isExpanded ? null : s.id)}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{proj?.icon || '📁'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#1f3965' }}>{s.name}</span>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, border: '1px solid', fontWeight: 700 }} className={statusBadge(s.status)}>{s.status}</span>
                      {proj && <span style={{ fontSize: 11, color: proj.color, background: proj.color + '15', border: `1px solid ${proj.color}30`, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>{proj.name}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b82ab', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.goal || 'No sprint goal set'}</div>
                  </div>

                  {/* Velocity sparkline */}
                  <div style={{ flexShrink: 0, minWidth: 160 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#a6b4cd', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Pass Rate Trend</div>
                    <VelocitySparkline values={velocityData} color={proj?.color || '#1e96df'} />
                  </div>

                  {/* Meta */}
                  <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#6b82ab', flexShrink: 0 }}>
                    {s.start_date && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar style={{ width: 12, height: 12 }} />{s.start_date}</span>}
                    {daysLeft !== null && (
                      <span style={{ color: daysLeft < 0 ? '#ef4444' : daysLeft < 3 ? '#f59e0b' : '#10b981', fontWeight: 700 }}>
                        {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                      </span>
                    )}
                    {avgPassRate !== null && (
                      <span style={{ background: avgPassRate >= 90 ? '#f0fdf4' : avgPassRate >= 70 ? '#fffbeb' : '#fff5f5', color: avgPassRate >= 90 ? '#166534' : avgPassRate >= 70 ? '#854d0e' : '#991b1b', padding: '2px 8px', borderRadius: 20, fontWeight: 800 }}>
                        avg {Math.round(avgPassRate)}%
                      </span>
                    )}
                    <span style={{ color: '#a6b4cd' }}>▶ {sprintRuns.length} runs</span>
                  </div>

                  {/* Status change */}
                  <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                    {['active', 'completed'].filter(st => st !== s.status).map(st => (
                      <button key={st} onClick={e => { e.stopPropagation(); updateSprintStatus(s.id, st); }}
                        style={{ fontSize: 10, padding: '4px 9px', borderRadius: 6, border: '1px solid #dbe2ea', background: '#f8fafc', color: '#1f3965', cursor: 'pointer', fontWeight: 600 }}>
                        → {st}
                      </button>
                    ))}
                  </div>
                  {isExpanded ? <ChevronDown style={{ width: 16, height: 16, color: '#6b82ab', flexShrink: 0 }} /> : <ChevronRight style={{ width: 16, height: 16, color: '#6b82ab', flexShrink: 0 }} />}
                </div>

                {/* Expanded run list */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid #f1f5f9', padding: '16px 18px', background: '#f8fafc' }}>
                    {/* Sprint shortcuts */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                      {proj && (
                        <button onClick={() => { onSelectProject(proj.id); onNavigateTo('requirements'); }}
                          style={{ padding: '6px 12px', background: '#fff', border: `1px solid ${proj.color}40`, borderRadius: 7, fontSize: 11, fontWeight: 700, color: proj.color, cursor: 'pointer' }}>
                          📋 Open Requirements
                        </button>
                      )}
                      {proj && (
                        <button onClick={() => { onSelectProject(proj.id); onNavigateTo('execution'); }}
                          style={{ padding: '6px 12px', background: '#fff', border: '1px solid #dbe2ea', borderRadius: 7, fontSize: 11, fontWeight: 600, color: '#6b82ab', cursor: 'pointer' }}>
                          ▶ Run Execution
                        </button>
                      )}
                    </div>

                    <div style={{ fontSize: 12, fontWeight: 700, color: '#6b82ab', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Run History ({sprintRuns.length})
                    </div>
                    {sprintRuns.length === 0 ? (
                      <div style={{ fontSize: 12, color: '#a6b4cd', textAlign: 'center', padding: '20px' }}>No runs recorded in this sprint yet</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                        {[...sprintRuns].reverse().map((r, idx) => (
                          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#fff', border: '1px solid #dbe2ea', borderRadius: 8, padding: '10px 14px' }}>
                            <div style={{ fontSize: 10, color: '#a6b4cd', fontWeight: 700, width: 20, textAlign: 'right', flexShrink: 0 }}>#{sprintRuns.length - idx}</div>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.pass_rate >= 90 ? '#10b981' : r.pass_rate >= 70 ? '#f59e0b' : '#ef4444', flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: '#1f3965', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.run_label || r.id}</div>
                              <div style={{ fontSize: 11, color: '#6b82ab' }}>{r.module} · {r.environment} · {r.branch}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 10, fontSize: 11, color: '#6b82ab', flexShrink: 0 }}>
                              <span style={{ color: '#10b981', fontWeight: 700 }}>✓{r.passed}</span>
                              <span style={{ color: '#ef4444', fontWeight: 700 }}>✗{r.failed}</span>
                              <span style={{ color: '#f59e0b', fontWeight: 700 }}>⚡{r.healed}</span>
                              <span style={{ background: r.pass_rate >= 90 ? '#f0fdf4' : r.pass_rate >= 70 ? '#fffbeb' : '#fff5f5', color: r.pass_rate >= 90 ? '#166534' : r.pass_rate >= 70 ? '#854d0e' : '#991b1b', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>{Math.round(r.pass_rate)}%</span>
                            </div>
                            <div style={{ fontSize: 10, color: '#a6b4cd', flexShrink: 0 }}>{new Date(r.created_at).toLocaleDateString()}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ════════════════ RUN HISTORY VIEW ════════════════ */}
      {!loading && activeView === 'runs' && (
        <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #dbe2ea', borderRadius: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #dbe2ea' }}>
                {['Run ID', 'Project', 'Sprint', 'Module', 'Type', 'Pass%', 'Tests', 'Duration', 'Env', 'Date', 'Notes'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#6b82ab', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRuns.length === 0 && (
                <tr><td colSpan={11} style={{ textAlign: 'center', padding: '40px', color: '#a6b4cd' }}>No runs recorded yet. Runs are created automatically when you execute tests.</td></tr>
              )}
              {filteredRuns.map((r, i) => {
                const proj = projects.find(p => p.id === r.project_id);
                const sprint = sprints.find(s => s.id === r.sprint_id);
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafbfd' }}>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 700, color: '#1e96df', fontSize: 11 }}>{r.id}</td>
                    <td style={{ padding: '10px 12px' }}>{proj ? <span>{proj.icon} {proj.name}</span> : <span style={{ color: '#a6b4cd' }}>—</span>}</td>
                    <td style={{ padding: '10px 12px', color: '#6b82ab' }}>{sprint?.name || '—'}</td>
                    <td style={{ padding: '10px 12px' }}><span style={{ background: '#eaf5fd', color: '#1e96df', padding: '2px 8px', borderRadius: 20, fontWeight: 600, fontSize: 10 }}>{r.module}</span></td>
                    <td style={{ padding: '10px 12px', color: '#6b82ab', textTransform: 'capitalize' }}>{r.run_type}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ background: r.pass_rate >= 90 ? '#f0fdf4' : r.pass_rate >= 70 ? '#fffbeb' : '#fff5f5', color: r.pass_rate >= 90 ? '#166534' : r.pass_rate >= 70 ? '#854d0e' : '#991b1b', padding: '3px 10px', borderRadius: 20, fontWeight: 800, fontSize: 11 }}>
                        {Math.round(r.pass_rate)}%
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ color: '#10b981', fontWeight: 700 }}>{r.passed}</span>/
                      <span style={{ color: '#ef4444', fontWeight: 700 }}>{r.failed}</span>/
                      <span style={{ color: '#f59e0b', fontWeight: 700 }}>{r.healed}</span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#6b82ab' }}>{r.duration_ms > 0 ? `${(r.duration_ms / 1000).toFixed(1)}s` : '—'}</td>
                    <td style={{ padding: '10px 12px', color: '#6b82ab' }}>{r.environment}</td>
                    <td style={{ padding: '10px 12px', color: '#a6b4cd', whiteSpace: 'nowrap' }}>{new Date(r.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '10px 12px', color: '#6b82ab', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.notes || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ════════════════ CREATE/EDIT PROJECT MODAL ════════════════ */}
      {showCreateProject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(31,57,101,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1f3965', margin: 0 }}>
                {editingProject ? `✏️ Edit: ${editingProject.name}` : '🚀 Create New Project'}
              </h2>
              <button onClick={() => { setShowCreateProject(false); setEditingProject(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b82ab' }}>
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>

            {/* Icon picker */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b82ab', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Project Icon</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {PROJECT_ICONS.map(ic => (
                  <button key={ic} onClick={() => setForm(f => ({ ...f, icon: ic }))}
                    style={{ width: 38, height: 38, borderRadius: 9, border: `2px solid ${form.icon === ic ? '#1e96df' : '#dbe2ea'}`, background: form.icon === ic ? '#eaf5fd' : '#f8fafc', cursor: 'pointer', fontSize: 18, transition: 'all 0.12s' }}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            {/* Color picker */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b82ab', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Brand Color</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {PROJECT_COLORS.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                    style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: form.color === c ? '3px solid #1f3965' : '2px solid transparent', cursor: 'pointer', transition: 'all 0.12s' }} />
                ))}
                {/* Preview */}
                <div style={{ marginLeft: 8, width: 40, height: 40, borderRadius: 10, background: form.color + '18', border: `2px solid ${form.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  {form.icon}
                </div>
              </div>
            </div>

            {/* Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              {inp('Project Name *', 'name', 'e.g. MyApp Banking Platform')}
              {inp('Owner Email', 'owner_email', 'qa-lead@company.com', 'email')}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b82ab', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What does this application do? What's the testing scope?" rows={3}
                style={{ width: '100%', border: '1px solid #dbe2ea', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#1f3965', background: '#f8fafc', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 22 }}>
              {inp('Application URL', 'app_url', 'https://staging.myapp.com')}
              {inp('Tech Stack', 'tech_stack', 'React / Node.js / PostgreSQL')}
            </div>

            {/* Status */}
            <div style={{ marginBottom: 22 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b82ab', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Project Status</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['active', 'planning', 'archived'].map(s => (
                  <button key={s} onClick={() => setForm(f => ({ ...f, status: s }))}
                    style={{ padding: '6px 16px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'capitalize', border: `1px solid ${form.status === s ? '#1e96df' : '#dbe2ea'}`, background: form.status === s ? '#eaf5fd' : '#f8fafc', color: form.status === s ? '#1e96df' : '#6b82ab', cursor: 'pointer' }}>
                    {s === 'active' ? '✅ ' : s === 'planning' ? '🗓 ' : '📦 '}{s}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={saveProject} disabled={saving || !form.name.trim()}
                style={{ flex: 1, padding: '12px', background: saving || !form.name.trim() ? '#a6b4cd' : '#1e96df', color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: saving || !form.name.trim() ? 'not-allowed' : 'pointer' }}>
                {saving ? '⏳ Saving…' : editingProject ? '✓ Save Changes' : '🚀 Create Project'}
              </button>
              <button onClick={() => { setShowCreateProject(false); setEditingProject(null); }}
                style={{ padding: '12px 22px', background: '#f8fafc', color: '#6b82ab', border: '1px solid #dbe2ea', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ CREATE SPRINT MODAL ════════════════ */}
      {showCreateSprint && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, boxShadow: '0 24px 60px rgba(31,57,101,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1f3965', margin: 0 }}>🏃 Create Sprint</h2>
              <button onClick={() => setShowCreateSprint(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b82ab' }}>
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#6b82ab', marginBottom: 4, display: 'block', textTransform: 'uppercase' }}>Project *</label>
                <select value={sprintForm.project_id} onChange={e => setSprintForm(f => ({ ...f, project_id: e.target.value }))}
                  style={{ width: '100%', border: '1px solid #dbe2ea', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#1f3965', background: '#f8fafc' }}>
                  <option value="">— Select a project —</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#6b82ab', marginBottom: 4, display: 'block', textTransform: 'uppercase' }}>Sprint Name *</label>
                <input value={sprintForm.name} onChange={e => setSprintForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Sprint 1 · v2.4 Release"
                  style={{ width: '100%', border: '1px solid #dbe2ea', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#1f3965', background: '#f8fafc', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#6b82ab', marginBottom: 4, display: 'block', textTransform: 'uppercase' }}>Sprint Goal</label>
                <input value={sprintForm.goal} onChange={e => setSprintForm(f => ({ ...f, goal: e.target.value }))} placeholder="Deliver login module + API auth coverage"
                  style={{ width: '100%', border: '1px solid #dbe2ea', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#1f3965', background: '#f8fafc', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#6b82ab', marginBottom: 4, display: 'block', textTransform: 'uppercase' }}>Start Date</label>
                  <input type="date" value={sprintForm.start_date} onChange={e => setSprintForm(f => ({ ...f, start_date: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #dbe2ea', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#1f3965', background: '#f8fafc', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#6b82ab', marginBottom: 4, display: 'block', textTransform: 'uppercase' }}>End Date</label>
                  <input type="date" value={sprintForm.end_date} onChange={e => setSprintForm(f => ({ ...f, end_date: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #dbe2ea', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#1f3965', background: '#f8fafc', boxSizing: 'border-box' }} />
                </div>
              </div>
              <button onClick={saveSprint} disabled={saving || !sprintForm.name.trim() || !sprintForm.project_id}
                style={{ padding: '12px', background: saving || !sprintForm.name.trim() || !sprintForm.project_id ? '#a6b4cd' : '#6366f1', color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? '⏳ Creating…' : '🏃 Create Sprint'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
