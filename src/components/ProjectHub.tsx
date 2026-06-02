import React, { useState, useEffect, useRef } from 'react';
import {
  FolderOpen, Plus, Edit3, Trash2, CheckCircle, Clock, AlertTriangle,
  BarChart3, Layers, ArrowRight, Settings, Zap, Users, GitBranch,
  Calendar, Target, TrendingUp, BookOpen, Cpu, X, Save, RefreshCw,
  ChevronDown, ChevronRight, Play, Archive, Star
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
const SPRINT_STATUSES = ['planning', 'active', 'completed', 'cancelled'];

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
  const [selectedProjectForDetail, setSelectedProjectForDetail] = useState<string | null>(null);
  const [expandedSprint, setExpandedSprint] = useState<string | null>(null);

  // Form states
  const [form, setForm] = useState({ name: '', description: '', app_url: '', tech_stack: '', owner_email: '', color: '#1e96df', icon: '🚀', status: 'active' });
  const [sprintForm, setSprintForm] = useState({ name: '', goal: '', start_date: '', end_date: '', project_id: currentProjectId, status: 'planning' });
  const [saving, setSaving] = useState(false);
  const [filterProject, setFilterProject] = useState(currentProjectId || 'ALL');
  const token = () => localStorage.getItem('iqstudio_token') || '';

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
        setForm({ name: '', description: '', app_url: '', tech_stack: '', owner_email: '', color: '#1e96df', icon: '🚀', status: 'active' });
        if (data.project?.id) onSelectProject(data.project.id);
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

  const filteredSprints = filterProject === 'ALL' ? sprints : sprints.filter(s => s.project_id === filterProject);
  const filteredRuns = filterProject === 'ALL' ? runs : runs.filter(r => r.project_id === filterProject);
  const activeProject = projects.find(p => p.id === currentProjectId);

  // ── Stats per project
  const getProjectStats = (pid: string) => {
    const pSprints = sprints.filter(s => s.project_id === pid);
    const pRuns = runs.filter(r => r.project_id === pid);
    const latestRun = pRuns[0];
    return { sprintCount: pSprints.length, runCount: pRuns.length, latestPassRate: latestRun ? Math.round(latestRun.pass_rate) : null, activeSprint: pSprints.find(s => s.status === 'active') };
  };

  // ── STATUS BADGES
  const statusBadge = (s: string) => {
    const map: Record<string, string> = { active: 'bg-emerald-100 text-emerald-700 border-emerald-200', planning: 'bg-sky-100 text-sky-700 border-sky-200', completed: 'bg-slate-100 text-slate-600 border-slate-200', cancelled: 'bg-red-100 text-red-600 border-red-200', archived: 'bg-amber-100 text-amber-700 border-amber-200' };
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
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => { setEditingProject(null); setForm({ name: '', description: '', app_url: '', tech_stack: '', owner_email: '', color: '#1e96df', icon: '🚀', status: 'active' }); setShowCreateProject(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', background: '#1e96df', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <Plus style={{ width: 16, height: 16 }} /> New Project
          </button>
        </div>
      </div>

      {/* ── CURRENT PROJECT BANNER ── */}
      {activeProject && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: activeProject.color + '12', border: `1px solid ${activeProject.color}40`, borderRadius: 12, padding: '14px 20px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 28 }}>{activeProject.icon}</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#1f3965' }}>Active Project: {activeProject.name}</div>
              <div style={{ fontSize: 12, color: '#6b82ab', marginTop: 2 }}>{activeProject.description || 'No description'} · {activeProject.tech_stack || 'No tech stack'}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['requirements', 'testcases', 'defects', 'execution', 'dashboard'] as const).map((tab, i) => {
              const labels = ['Requirements', 'Test Cases', 'Impact', 'Execution', 'Dashboard'];
              return (
                <button key={tab} onClick={() => onNavigateTo(tab)}
                  style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, color: activeProject.color, background: activeProject.color + '18', border: `1px solid ${activeProject.color}40`, borderRadius: 7, cursor: 'pointer' }}>
                  {labels[i]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB BAR ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {(['projects', 'sprints', 'runs'] as const).map(v => (
          <button key={v} onClick={() => setActiveView(v)}
            style={{ padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: activeView === v ? 700 : 500, border: `1px solid ${activeView === v ? '#1e96df' : '#dbe2ea'}`, background: activeView === v ? '#eaf5fd' : '#f8fafc', color: activeView === v ? '#1e96df' : '#6b82ab', cursor: 'pointer', textTransform: 'capitalize' }}>
            {v === 'projects' ? '🗂 Projects' : v === 'sprints' ? '🏃 Sprints' : '▶ Run History'}
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
          <button onClick={() => setShowCreateSprint(true)}
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
              <div key={p.id} style={{ background: '#fff', border: `2px solid ${isActive ? p.color : '#dbe2ea'}`, borderRadius: 14, padding: 20, transition: 'all 0.18s', boxShadow: isActive ? `0 4px 20px ${p.color}25` : '0 1px 4px rgba(31,57,101,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: p.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, border: `1px solid ${p.color}30` }}>
                      {p.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#1f3965', marginBottom: 2 }}>{p.name}</div>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, border: '1px solid', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }} className={statusBadge(p.status)}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => startEdit(p)} style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #dbe2ea', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Edit3 style={{ width: 13, height: 13, color: '#6b82ab' }} />
                    </button>
                    <button onClick={() => deleteProject(p.id)} style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #fee2e2', background: '#fff5f5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash2 style={{ width: 13, height: 13, color: '#ef4444' }} />
                    </button>
                  </div>
                </div>

                <p style={{ fontSize: 12, color: '#6b82ab', marginBottom: 14, lineHeight: 1.5 }}>{p.description || 'No description added yet'}</p>

                {p.tech_stack && <div style={{ fontSize: 11, color: p.color, background: p.color + '10', border: `1px solid ${p.color}30`, borderRadius: 6, padding: '3px 10px', display: 'inline-block', marginBottom: 14, fontWeight: 600 }}>{p.tech_stack}</div>}

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
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

                {stats.activeSprint && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#166534' }}>
                    🏃 Active Sprint: <strong>{stats.activeSprint.name}</strong>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  {isActive ? (
                    <div style={{ flex: 1, padding: '8px', background: p.color + '15', border: `1px solid ${p.color}40`, borderRadius: 8, textAlign: 'center', fontSize: 12, fontWeight: 700, color: p.color }}>
                      ✓ Currently Active
                    </div>
                  ) : (
                    <button onClick={() => onSelectProject(p.id)}
                      style={{ flex: 1, padding: '8px', background: p.color, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      Switch to this Project →
                    </button>
                  )}
                  <button onClick={() => { onSelectProject(p.id); onNavigateTo('rag-kb'); }}
                    style={{ padding: '8px 12px', border: '1px solid #dbe2ea', background: '#f8fafc', borderRadius: 8, fontSize: 12, color: '#6b82ab', cursor: 'pointer', fontWeight: 600 }}>
                    📚 Knowledge Base
                  </button>
                </div>

                {p.app_url && <div style={{ marginTop: 10, fontSize: 11, color: '#1e96df' }}>🔗 {p.app_url}</div>}
              </div>
            );
          })}

          {/* Add new project card */}
          <button onClick={() => { setEditingProject(null); setForm({ name: '', description: '', app_url: '', tech_stack: '', owner_email: '', color: '#1e96df', icon: '🚀', status: 'active' }); setShowCreateProject(true); }}
            style={{ background: '#f8fafc', border: '2px dashed #dbe2ea', borderRadius: 14, padding: 20, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 200 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#eaf5fd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus style={{ width: 24, height: 24, color: '#1e96df' }} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1e96df' }}>Create New Project</div>
            <div style={{ fontSize: 12, color: '#6b82ab', textAlign: 'center' }}>Set up a new application workspace with its own requirements, test cases, sprints and knowledge base</div>
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
            </div>
          )}
          {filteredSprints.map(s => {
            const proj = projects.find(p => p.id === s.project_id);
            const sprintRuns = runs.filter(r => r.sprint_id === s.id);
            const isExpanded = expandedSprint === s.id;
            const daysLeft = s.end_date ? Math.ceil((new Date(s.end_date).getTime() - Date.now()) / 86400000) : null;
            return (
              <div key={s.id} style={{ background: '#fff', border: '1px solid #dbe2ea', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', cursor: 'pointer', gap: 14 }} onClick={() => setExpandedSprint(isExpanded ? null : s.id)}>
                  <span style={{ fontSize: 20 }}>{proj?.icon || '📁'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#1f3965' }}>{s.name}</span>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, border: '1px solid', fontWeight: 700 }} className={statusBadge(s.status)}>{s.status}</span>
                      {proj && <span style={{ fontSize: 11, color: proj.color, background: proj.color + '15', border: `1px solid ${proj.color}30`, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>{proj.name}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b82ab', marginTop: 3 }}>{s.goal || 'No goal set'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6b82ab' }}>
                    {s.start_date && <span>📅 {s.start_date}</span>}
                    {daysLeft !== null && <span style={{ color: daysLeft < 0 ? '#ef4444' : daysLeft < 3 ? '#f59e0b' : '#10b981', fontWeight: 700 }}>{daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}</span>}
                    <span>▶ {sprintRuns.length} runs</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginLeft: 10 }}>
                    {['active', 'completed'].filter(st => st !== s.status).map(st => (
                      <button key={st} onClick={e => { e.stopPropagation(); updateSprintStatus(s.id, st); }}
                        style={{ fontSize: 10, padding: '4px 10px', borderRadius: 6, border: '1px solid #dbe2ea', background: '#f8fafc', color: '#1f3965', cursor: 'pointer', fontWeight: 600 }}>
                        → {st}
                      </button>
                    ))}
                  </div>
                  {isExpanded ? <ChevronDown style={{ width: 16, height: 16, color: '#6b82ab' }} /> : <ChevronRight style={{ width: 16, height: 16, color: '#6b82ab' }} />}
                </div>

                {isExpanded && (
                  <div style={{ borderTop: '1px solid #f1f5f9', padding: '16px 20px', background: '#f8fafc' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#6b82ab', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Run History in this Sprint</div>
                    {sprintRuns.length === 0 ? (
                      <div style={{ fontSize: 12, color: '#a6b4cd', textAlign: 'center', padding: '20px' }}>No runs recorded in this sprint yet</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {sprintRuns.map(r => (
                          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#fff', border: '1px solid #dbe2ea', borderRadius: 8, padding: '10px 14px' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.pass_rate >= 90 ? '#10b981' : r.pass_rate >= 70 ? '#f59e0b' : '#ef4444', flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: '#1f3965' }}>{r.run_label || r.id}</div>
                              <div style={{ fontSize: 11, color: '#6b82ab' }}>{r.module} · {r.environment} · {r.branch}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#6b82ab' }}>
                              <span style={{ color: '#10b981', fontWeight: 700 }}>✓ {r.passed}</span>
                              <span style={{ color: '#ef4444', fontWeight: 700 }}>✗ {r.failed}</span>
                              <span style={{ color: '#f59e0b', fontWeight: 700 }}>⚡ {r.healed}</span>
                              <span style={{ background: r.pass_rate >= 90 ? '#f0fdf4' : r.pass_rate >= 70 ? '#fffbeb' : '#fff5f5', color: r.pass_rate >= 90 ? '#166534' : r.pass_rate >= 70 ? '#854d0e' : '#991b1b', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>{Math.round(r.pass_rate)}%</span>
                            </div>
                            <div style={{ fontSize: 10, color: '#a6b4cd' }}>{new Date(r.created_at).toLocaleDateString()}</div>
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
        <div>
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
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 700, color: '#1e96df' }}>{r.id}</td>
                      <td style={{ padding: '10px 12px' }}>{proj ? <span><span style={{ marginRight: 4 }}>{proj.icon}</span>{proj.name}</span> : <span style={{ color: '#a6b4cd' }}>—</span>}</td>
                      <td style={{ padding: '10px 12px', color: '#6b82ab' }}>{sprint?.name || '—'}</td>
                      <td style={{ padding: '10px 12px' }}><span style={{ background: '#eaf5fd', color: '#1e96df', padding: '2px 8px', borderRadius: 20, fontWeight: 600, fontSize: 10 }}>{r.module}</span></td>
                      <td style={{ padding: '10px 12px', color: '#6b82ab', textTransform: 'capitalize' }}>{r.run_type}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ background: r.pass_rate >= 90 ? '#f0fdf4' : r.pass_rate >= 70 ? '#fffbeb' : '#fff5f5', color: r.pass_rate >= 90 ? '#166534' : r.pass_rate >= 70 ? '#854d0e' : '#991b1b', padding: '3px 10px', borderRadius: 20, fontWeight: 800, fontSize: 11 }}>
                          {Math.round(r.pass_rate)}%
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}><span style={{ color: '#10b981', fontWeight: 700 }}>{r.passed}</span>/<span style={{ color: '#ef4444', fontWeight: 700 }}>{r.failed}</span>/<span style={{ color: '#f59e0b', fontWeight: 700 }}>{r.healed}</span></td>
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
        </div>
      )}

      {/* ════════════════ CREATE/EDIT PROJECT MODAL ════════════════ */}
      {showCreateProject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(31,57,101,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1f3965', margin: 0 }}>{editingProject ? 'Edit Project' : 'Create New Project'}</h2>
              <button onClick={() => { setShowCreateProject(false); setEditingProject(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b82ab' }}><X style={{ width: 20, height: 20 }} /></button>
            </div>

            {/* Icon + Color Picker */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b82ab', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Project Icon</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {PROJECT_ICONS.map(ic => (
                  <button key={ic} onClick={() => setForm(f => ({ ...f, icon: ic }))}
                    style={{ width: 36, height: 36, borderRadius: 8, border: `2px solid ${form.icon === ic ? '#1e96df' : '#dbe2ea'}`, background: form.icon === ic ? '#eaf5fd' : '#f8fafc', cursor: 'pointer', fontSize: 18 }}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b82ab', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Project Color</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {PROJECT_COLORS.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                    style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: form.color === c ? '3px solid #1f3965' : '2px solid transparent', cursor: 'pointer' }} />
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              {inp('Project Name *', 'name', 'e.g. MyApp Banking Platform')}
              {inp('Owner Email', 'owner_email', 'qa-lead@company.com', 'email')}
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b82ab', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What does this application do? What's the testing scope?" rows={3}
                style={{ width: '100%', border: '1px solid #dbe2ea', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#1f3965', background: '#f8fafc', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              {inp('Application URL', 'app_url', 'https://staging.myapp.com')}
              {inp('Tech Stack', 'tech_stack', 'React / Node.js / PostgreSQL')}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={saveProject} disabled={saving || !form.name.trim()}
                style={{ flex: 1, padding: '11px', background: '#1e96df', color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? '⏳ Saving…' : editingProject ? '✓ Save Changes' : '🚀 Create Project'}
              </button>
              <button onClick={() => { setShowCreateProject(false); setEditingProject(null); }}
                style={{ padding: '11px 20px', background: '#f8fafc', color: '#6b82ab', border: '1px solid #dbe2ea', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ CREATE SPRINT MODAL ════════════════ */}
      {showCreateSprint && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, boxShadow: '0 24px 60px rgba(31,57,101,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1f3965', margin: 0 }}>🏃 Create Sprint</h2>
              <button onClick={() => setShowCreateSprint(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b82ab' }}><X style={{ width: 20, height: 20 }} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#6b82ab', marginBottom: 4, display: 'block', textTransform: 'uppercase' }}>Project *</label>
                <select value={sprintForm.project_id} onChange={e => setSprintForm(f => ({ ...f, project_id: e.target.value }))}
                  style={{ width: '100%', border: '1px solid #dbe2ea', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#1f3965', background: '#f8fafc' }}>
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
              <button onClick={saveSprint} disabled={saving || !sprintForm.name.trim()}
                style={{ padding: '11px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? '⏳ Creating…' : '🏃 Create Sprint'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
