import React, { useState, useEffect } from 'react';
import { TableProperties, Plus, X, RefreshCw, FolderOpen, CheckSquare } from 'lucide-react';

interface TestPlansTabProps {
  currentProjectId?: string;
  currentSprintId?: string;
}

// ── PlanProgressPanel (inline) ────────────────────────────────────────────────
function PlanProgressPanel({ planId, planName }: { planId: string; planName: string }) {
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const token = () => localStorage.getItem('iq_token');
  const authH = () => ({ 'Content-Type': 'application/json', ...(token() ? { Authorization: `Bearer ${token()}` } : {}) });

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/quality/test-plans/${planId}/progress`, { headers: authH() });
      const d = await r.json();
      setProgress(d);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [planId]);

  const statusColor: Record<string, string> = {
    completed:   'badge-green',
    in_progress: 'badge-amber',
    not_started: 'badge-slate',
  };

  if (loading) return <div className="text-xs text-slate-400 py-2">Loading progress…</div>;
  if (!progress) return null;

  return (
    <div className="mt-3 p-3 bg-blue-50/60 border border-blue-200/60 rounded-xl text-xs space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-bold text-blue-700 text-[11px]">{planName} — Milestone Progress</span>
        <span className={`badge ${statusColor[progress.milestoneStatus] || 'badge-slate'}`}>
          {progress.milestoneStatus?.replace('_', ' ')}
        </span>
      </div>
      {progress.milestone && (
        <div className="text-[10px] text-blue-600 font-mono">🏁 {progress.milestone}</div>
      )}
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${progress.progress || 0}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-blue-500 font-mono">
        <span>{progress.progress || 0}% complete</span>
        <span>{progress.passed}/{progress.tcCount} TCs passed</span>
      </div>
    </div>
  );
}

// ── Main TestPlansTab Component ───────────────────────────────────────────────
export default function TestPlansTab({ currentProjectId = 'ALL', currentSprintId }: TestPlansTabProps) {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', milestone: '' });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  const token = () => localStorage.getItem('iq_token');
  const authH = () => ({ 'Content-Type': 'application/json', ...(token() ? { Authorization: `Bearer ${token()}` } : {}) });

  const load = async () => {
    setLoading(true);
    try {
      // ── PROJECT FILTER: include projectId in query so server can scope results ──
      const params = new URLSearchParams();
      if (currentProjectId && currentProjectId !== 'ALL') {
        params.set('projectId', currentProjectId);
      }
      const url = `/api/quality/test-plans${params.toString() ? `?${params}` : ''}`;
      const res = await fetch(url, { headers: authH() });
      const data = await res.json();
      if (data.plans) {
        // Client-side filter as well for instant response while server catches up
        const filtered = currentProjectId === 'ALL'
          ? data.plans
          : data.plans.filter((p: any) => !p.projectId || p.projectId === currentProjectId);
        setPlans(filtered);
      }
    } catch { /* silent */ } finally { setLoading(false); }
  };

  // Reload when project changes
  useEffect(() => { load(); }, [currentProjectId]);

  const createPlan = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const body = {
        ...form,
        // ── LINK TO PROJECT ──
        projectId: currentProjectId !== 'ALL' ? currentProjectId : undefined,
        sprintId:  currentSprintId || undefined,
      };
      const res = await fetch('/api/quality/test-plans', {
        method: 'POST', headers: authH(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.plan) {
        setPlans(prev => [data.plan, ...prev]);
        setShowForm(false);
        setForm({ name: '', description: '', milestone: '' });
        setFeedback('Test plan created!');
        setTimeout(() => setFeedback(''), 3000);
      }
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const deletePlan = async (id: string) => {
    try {
      await fetch(`/api/quality/test-plans/${id}`, { method: 'DELETE', headers: authH() });
      setPlans(prev => prev.filter(p => p.id !== id));
    } catch { /* silent */ }
  };

  const statusColors: Record<string, string> = {
    draft:     'badge badge-slate',
    active:    'badge badge-green',
    completed: 'badge badge-blue',
    archived:  'badge badge-slate',
  };

  return (
    <div className="space-y-5 animate-fadeInUp">
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="panel-title flex items-center gap-2">
              <TableProperties className="w-4 h-4 text-blue-500" /> Test Plans
              <span className="chip">REQ-30</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Create and manage test execution plans with milestones and test case associations.
            </p>
            {/* Show current project context */}
            {currentProjectId && currentProjectId !== 'ALL' && (
              <div className="flex items-center gap-1.5 mt-1">
                <FolderOpen className="w-3 h-3 text-blue-400" />
                <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  Project: {currentProjectId}
                </span>
                {currentSprintId && (
                  <span className="text-[10px] font-mono text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                    Sprint: {currentSprintId}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="btn-ghost flex items-center gap-1" title="Refresh">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setShowForm(v => !v)} className="btn-primary flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> New Plan
            </button>
          </div>
        </div>

        {feedback && (
          <div className="mb-3 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 font-mono">
            {feedback}
          </div>
        )}

        {showForm && (
          <div className="mb-4 p-4 metal-surface rounded-xl space-y-3">
            <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-blue-500" /> New Test Plan
              {currentProjectId !== 'ALL' && (
                <span className="ml-1 text-[10px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                  → {currentProjectId}
                </span>
              )}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Plan Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Sprint 23 Regression"
                  className="input-glass w-full"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Milestone</label>
                <input
                  value={form.milestone}
                  onChange={e => setForm(f => ({ ...f, milestone: e.target.value }))}
                  placeholder="v2.4.0 Release"
                  className="input-glass w-full"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="Scope and objectives…"
                className="input-glass w-full"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
              <button onClick={createPlan} disabled={saving || !form.name.trim()} className="btn-primary">
                {saving ? 'Creating…' : 'Create Plan'}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-slate-400 text-xs font-mono">Loading test plans…</div>
        ) : plans.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs font-mono border-2 border-dashed border-slate-200 rounded-xl">
            <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
            {currentProjectId !== 'ALL'
              ? `No test plans for project ${currentProjectId} yet.`
              : 'No test plans yet.'}
            <br />Click "New Plan" to create one.
          </div>
        ) : (
          <div className="space-y-2">
            {plans.map(plan => (
              <div
                key={plan.id}
                className="flex items-start gap-3 p-3 bg-white/60 border border-slate-200/80 rounded-xl hover:border-blue-300 hover:bg-blue-50/30 transition-all"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900 text-sm">{plan.name}</span>
                    <span className={statusColors[plan.status] || 'badge badge-slate'}>{plan.status}</span>
                    {plan.milestone && <span className="chip">🏁 {plan.milestone}</span>}
                    {/* Project badge */}
                    {plan.projectId && (
                      <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        <FolderOpen className="w-2.5 h-2.5 inline mr-0.5" />{plan.projectId}
                      </span>
                    )}
                    {plan.sprintId && (
                      <span className="text-[10px] font-mono text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                        {plan.sprintId}
                      </span>
                    )}
                  </div>
                  {plan.description && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{plan.description}</p>
                  )}
                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                    {plan.tcIds?.length || 0} test cases · Created {new Date(plan.createdAt).toLocaleDateString()}
                  </p>
                  {/* REQ-31/32: Milestone progress inline */}
                  <PlanProgressPanel planId={plan.id} planName={plan.name} />
                </div>
                <button
                  onClick={() => deletePlan(plan.id)}
                  className="text-slate-400 hover:text-red-500 shrink-0 mt-0.5 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
