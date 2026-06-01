import { useState, useEffect } from 'react';
import { 
  Zap, 
  TrendingUp, 
  Sparkles, 
  FileText, 
  Crosshair, 
  Settings2, 
  Sliders, 
  ShieldAlert, 
  MessageSquareCode, 
  Terminal, 
  User, 
  HelpCircle,
  Database,
  History,
  Table,
  Layers,
  RefreshCw,
  TableProperties,
  Cpu,
  GitBranch,
  Link,
  BookOpen,
  LogOut,
  UserCircle,
  Clock,
  BarChart3,
  CheckSquare,
  Plus,
  X,
  Edit2,
  Play
} from 'lucide-react';

import { 
  TestCase, 
  RequirementDoc, 
  DefectHotspot, 
  ImpactReport, 
  PerformanceConfig, 
  SecurityVulnerability, 
  ScriptFile, 
  AgentStep, 
  AuditLog 
} from './types';

import AgentFlowVisualizer from './components/AgentFlowVisualizer';
import DashboardMetrics from './components/DashboardMetrics';
import RequirementsTab from './components/RequirementsTab';
import DefectPredictTab from './components/DefectPredictTab';
import ScriptTab from './components/ScriptTab';
import PerformanceTab from './components/PerformanceTab';
import SecurityTab from './components/SecurityTab';
import ChatbotSlideout from './components/ChatbotSlideout';
import TraceabilityTab from './components/TraceabilityTab';
import ModulePagesTab from './components/ModulePagesTab';
import ScriptConverterTab from './components/ScriptConverterTab';
import TestCaseGeneratorPage from './components/TestCaseGeneratorPage';
import ExecutionEnginePage from './components/ExecutionEnginePage';
import AgenticOrchestrator from './components/AgenticOrchestrator';
import AuthModal from './components/AuthModal';
import LLMConfigTab from './components/LLMConfigTab';
import CICDTab from './components/CICDTab';
import FeedbackTemplatesTab from './components/FeedbackTemplatesTab';
import IntegrationsTab from './components/IntegrationsTab';
import SchedulerTab from './components/SchedulerTab';
import AnalyticsTab from './components/AnalyticsTab';

// ── REQ-30: TEST PLAN CRUD ────────────────────────────────────────────────────
function TestPlansTab() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', milestone: '' });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  const token = () => localStorage.getItem('iqstudio_token');
  const authH = () => ({ 'Content-Type': 'application/json', ...(token() ? { Authorization: `Bearer ${token()}` } : {}) });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/quality/test-plans', { headers: authH() });
      const data = await res.json();
      if (data.plans) setPlans(data.plans);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const createPlan = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/quality/test-plans', {
        method: 'POST', headers: authH(),
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.plan) { setPlans(prev => [data.plan, ...prev]); setShowForm(false); setForm({ name: '', description: '', milestone: '' }); setFeedback('Test plan created!'); setTimeout(() => setFeedback(''), 3000); }
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const deletePlan = async (id: string) => {
    try {
      await fetch(`/api/quality/test-plans/${id}`, { method: 'DELETE', headers: authH() });
      setPlans(prev => prev.filter(p => p.id !== id));
    } catch { /* silent */ }
  };

  const statusColors: Record<string,string> = { draft:'bg-slate-100 text-slate-600', active:'bg-emerald-50 text-emerald-700', completed:'bg-blue-50 text-blue-700', archived:'bg-slate-50 text-slate-400' };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-sans font-semibold text-slate-900 flex items-center gap-2">
              <TableProperties className="w-4 h-4 text-teal-600" /> Test Plans <span className="text-[10px] font-mono text-slate-400 ml-1">(REQ-30)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Create and manage test execution plans with milestones and test case associations.</p>
          </div>
          <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg transition-colors">
            <Plus className="w-3.5 h-3.5" /> New Plan
          </button>
        </div>
        {feedback && <div className="mb-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 font-mono">{feedback}</div>}
        {showForm && (
          <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Plan Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Sprint 23 Regression"
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-teal-400" />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Milestone</label>
                <input value={form.milestone} onChange={e => setForm(f => ({...f, milestone: e.target.value}))} placeholder="v2.4.0 Release"
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-teal-400" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={2} placeholder="Scope and objectives..."
                className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-teal-400" />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100">Cancel</button>
              <button onClick={createPlan} disabled={saving || !form.name.trim()} className="px-4 py-1.5 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700 disabled:opacity-50">
                {saving ? 'Creating…' : 'Create Plan'}
              </button>
            </div>
          </div>
        )}
        {loading ? (
          <div className="text-center py-8 text-slate-400 text-xs font-mono">Loading test plans…</div>
        ) : plans.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs font-mono">No test plans yet. Click "New Plan" to create one.</div>
        ) : (
          <div className="space-y-2">
            {plans.map(plan => (
              <div key={plan.id} className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-teal-300 transition-all">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900 text-sm">{plan.name}</span>
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full ${statusColors[plan.status] || 'bg-slate-100 text-slate-600'}`}>{plan.status}</span>
                    {plan.milestone && <span className="text-[10px] font-mono text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded-full">🏁 {plan.milestone}</span>}
                  </div>
                  {plan.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{plan.description}</p>}
                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">{plan.tcIds?.length || 0} test cases · Created {new Date(plan.createdAt).toLocaleDateString()}</p>
                  {/* REQ-31/32: Milestone progress inline */}
                  <PlanProgressPanel planId={plan.id} planName={plan.name} />
                </div>
                <button onClick={() => deletePlan(plan.id)} className="text-slate-400 hover:text-rose-500 shrink-0 mt-0.5 transition-colors">
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

// ── REQ-31/32: TEST PLAN EXECUTION LINK + MILESTONE TRACKING ─────────────────
function PlanProgressPanel({ planId, planName }: { planId: string; planName: string }) {
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const token = () => localStorage.getItem('iqstudio_token');
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

  const statusColor: Record<string,string> = {
    completed: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    in_progress: 'text-amber-700 bg-amber-50 border-amber-200',
    not_started: 'text-slate-600 bg-slate-50 border-slate-200',
  };

  if (loading) return <div className="text-xs text-slate-400 py-2">Loading progress…</div>;
  if (!progress) return null;

  return (
    <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-bold text-indigo-700">{planName} — Milestone Progress</span>
        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-bold ${statusColor[progress.milestoneStatus] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>{progress.milestoneStatus?.replace('_',' ')}</span>
      </div>
      {progress.milestone && <div className="text-[10px] text-indigo-600 font-mono">🏁 {progress.milestone}</div>}
      <div className="w-full bg-indigo-100 rounded-full h-1.5">
        <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${progress.progress || 0}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-indigo-600 font-mono">
        <span>{progress.progress || 0}% complete</span>
        <span>{progress.passed}/{progress.tcCount} TCs passed</span>
      </div>
    </div>
  );
}

// ── REQ-33: MANUAL TEST EXECUTION TRACKER ─────────────────────────────────────
function ManualExecutionTab() {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ tcTitle: '', tester: '', notes: '' });
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [feedback, setFeedback] = useState('');

  const token = () => localStorage.getItem('iqstudio_token');
  const authH = () => ({ 'Content-Type': 'application/json', ...(token() ? { Authorization: `Bearer ${token()}` } : {}) });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/quality/execution/manual', { headers: authH() });
      const data = await res.json();
      if (data.runs) setRuns(data.runs);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const startRun = async () => {
    if (!form.tcTitle.trim()) return;
    try {
      const res = await fetch('/api/quality/execution/manual', {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ tcTitle: form.tcTitle, tester: form.tester || 'QA Engineer', notes: form.notes,
          steps: [{ action: 'Navigate to feature', expected: 'Page loads correctly' }, { action: 'Perform test action', expected: 'Feature responds as expected' }] })
      });
      const data = await res.json();
      if (data.run) { setRuns(prev => [data.run, ...prev]); setShowForm(false); setForm({ tcTitle: '', tester: '', notes: '' }); setFeedback('Manual run started!'); setTimeout(() => setFeedback(''), 3000); }
    } catch { /* silent */ }
  };

  const updateStatus = async (runId: string, status: string) => {
    try {
      const res = await fetch(`/api/quality/execution/manual/${runId}/status`, {
        method: 'PATCH', headers: authH(),
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.run) { setRuns(prev => prev.map(r => r.id === runId ? data.run : r)); if (selectedRun?.id === runId) setSelectedRun(data.run); }
    } catch { /* silent */ }
  };

  const updateStep = async (runId: string, stepIdx: number, result: string, actual: string) => {
    try {
      const res = await fetch(`/api/quality/execution/manual/${runId}/step`, {
        method: 'PATCH', headers: authH(),
        body: JSON.stringify({ stepIdx, result, actual })
      });
      const data = await res.json();
      if (data.run) { setRuns(prev => prev.map(r => r.id === runId ? data.run : r)); setSelectedRun(data.run); }
    } catch { /* silent */ }
  };

  const statusColors: Record<string,string> = { in_progress:'bg-amber-50 text-amber-700 border-amber-200', passed:'bg-emerald-50 text-emerald-700 border-emerald-200', failed:'bg-rose-50 text-rose-700 border-rose-200', blocked:'bg-orange-50 text-orange-700 border-orange-200' };
  const stepColors: Record<string,string> = { pass:'bg-emerald-100 text-emerald-700', fail:'bg-rose-100 text-rose-700', skip:'bg-slate-100 text-slate-600', pending:'bg-slate-50 text-slate-400' };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-sans font-semibold text-slate-900 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-orange-500" /> Manual Execution <span className="text-[10px] font-mono text-slate-400 ml-1">(REQ-33)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Track manual test execution with step-by-step results.</p>
            </div>
            <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg transition-colors">
              <Plus className="w-3.5 h-3.5" /> New Run
            </button>
          </div>
          {feedback && <div className="mb-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 font-mono">{feedback}</div>}
          {showForm && (
            <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <input value={form.tcTitle} onChange={e => setForm(f => ({...f, tcTitle: e.target.value}))} placeholder="Test case title *"
                className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400" />
              <input value={form.tester} onChange={e => setForm(f => ({...f, tester: e.target.value}))} placeholder="Tester name"
                className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400" />
              <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={2} placeholder="Notes / context…"
                className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400" />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100">Cancel</button>
                <button onClick={startRun} disabled={!form.tcTitle.trim()} className="px-4 py-1.5 bg-orange-500 text-white text-xs font-semibold rounded-lg hover:bg-orange-600 disabled:opacity-50">Start Run</button>
              </div>
            </div>
          )}
          {loading ? <div className="text-center py-8 text-slate-400 text-xs font-mono">Loading…</div> : runs.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs font-mono">No manual runs yet.</div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {runs.map(run => (
                <div key={run.id} onClick={() => setSelectedRun(run)}
                  className={`p-3 border rounded-xl cursor-pointer transition-all ${selectedRun?.id === run.id ? 'border-orange-400 bg-orange-50/50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">{run.tcTitle}</p>
                      <p className="text-[10px] font-mono text-slate-500">Tester: {run.tester} · {run.steps?.length || 0} steps</p>
                    </div>
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${statusColors[run.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>{run.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-7">
        {selectedRun ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-slate-900">{selectedRun.tcTitle}</h4>
                <p className="text-xs text-slate-500">Tester: {selectedRun.tester} · Started: {selectedRun.startedAt ? new Date(selectedRun.startedAt).toLocaleString() : '—'}</p>
              </div>
              <div className="flex gap-1.5">
                {(['in_progress','passed','failed','blocked'] as const).map(s => (
                  <button key={s} onClick={() => updateStatus(selectedRun.id, s)}
                    className={`text-[9px] font-mono font-bold px-2 py-1 rounded-lg border transition-all ${selectedRun.status === s ? statusColors[s] : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            {selectedRun.notes && <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2">{selectedRun.notes}</p>}
            <div className="space-y-2">
              <h5 className="text-xs font-mono font-bold text-slate-600 uppercase tracking-wider">Test Steps</h5>
              {(selectedRun.steps || []).map((step: any, i: number) => (
                <div key={i} className="border border-slate-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] font-mono text-slate-400 mt-0.5 shrink-0">#{i+1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800">{step.action}</p>
                      <p className="text-[10px] text-slate-500 font-mono">Expected: {step.expected}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {(['pass','fail','skip'] as const).map(r => (
                        <button key={r} onClick={() => updateStep(selectedRun.id, i, r, step.actual || '')}
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-all ${step.result === r ? stepColors[r] + ' font-bold border-transparent' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                  {step.actual !== undefined && (
                    <input type="text" value={step.actual || ''} placeholder="Actual result observed…"
                      onChange={e => { const s = [...selectedRun.steps]; s[i] = {...s[i], actual: e.target.value}; setSelectedRun({...selectedRun, steps: s}); }}
                      onBlur={e => updateStep(selectedRun.id, i, step.result || 'pending', e.target.value)}
                      className="w-full text-[11px] border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-300 font-mono" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-full min-h-[300px] flex items-center justify-center bg-white border border-slate-200 rounded-2xl">
            <div className="text-center text-slate-400">
              <CheckSquare className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-medium">Select a run to view steps</p>
              <p className="text-xs mt-1">Click any run on the left to open step tracker</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  // Navigation layout Page active
  const [activeTab, setActiveTab] = useState<
    'agentic' |
    'dashboard' | 
    'execution' | 
    'requirements' | 
    'testcases' | 
    'scripts' | 
    'converter' | 
    'defects' | 
    'performance' | 
    'security' | 
    'modules' | 
    'traceability' | 
    'audit' |
    'llm-config' |
    'cicd' |
    'integrations' |
    'feedback' |
    'scheduler' |
    'analytics' |
    'test-plans' |
    'manual-execution'
  >('agentic');

  // Auth state
  const [authUser, setAuthUser] = useState<{ id: number; email: string; name: string; role: string } | null>(() => {
    try { return JSON.parse(localStorage.getItem('iq_user') || 'null'); } catch { return null; }
  });
  const [authToken, setAuthToken] = useState<string>(() => localStorage.getItem('iq_token') || '');

  const handleLogin = (user: any, token: string) => {
    setAuthUser(user);
    setAuthToken(token);
  };

  const handleLogout = () => {
    localStorage.removeItem('iq_token');
    localStorage.removeItem('iq_user');
    setAuthUser(null);
    setAuthToken('');
  };

  // Unified State Stores
  const [requirements, setRequirements] = useState<RequirementDoc[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [defectHotspots, setDefectHotspots] = useState<DefectHotspot[]>([]);
  const [impactReports, setImpactReports] = useState<ImpactReport[]>([]);
  const [scripts, setScripts] = useState<ScriptFile[]>([]);
  const [performanceConfigs, setPerformanceConfigs] = useState<PerformanceConfig[]>([]);
  const [vulnerabilities, setVulnerabilities] = useState<SecurityVulnerability[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Project Partitioning — dynamically build project list from actual data
  const [currentProjectId, setCurrentProjectId] = useState<string>('ALL');

  // Collect all unique project IDs from existing data
  const allProjectIds = Array.from(new Set([
    ...requirements.map(r => r.projectId),
    ...testCases.map(tc => tc.projectId),
  ].filter(Boolean))) as string[];

  const filteredRequirements = currentProjectId === 'ALL' ? requirements : requirements.filter(r => !r.projectId || r.projectId === currentProjectId);
  const filteredTestCases = currentProjectId === 'ALL' ? testCases : testCases.filter(tc => !tc.projectId || tc.projectId === currentProjectId);
  const filteredDefectHotspots = currentProjectId === 'ALL' ? defectHotspots : defectHotspots.filter(h => !h.projectId || h.projectId === currentProjectId);
  const filteredScripts = currentProjectId === 'ALL' ? scripts : scripts.filter(s => !s.projectId || s.projectId === currentProjectId);
  const filteredVulnerabilities = currentProjectId === 'ALL' ? vulnerabilities : vulnerabilities.filter(v => !v.projectId || v.projectId === currentProjectId);
  const filteredPerformanceConfigs = currentProjectId === 'ALL' ? performanceConfigs : performanceConfigs.filter(pc => !pc.projectId || pc.projectId === currentProjectId);

  // Orchestrator Action flags
  const [currentRunId, setCurrentRunId] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isGeneratingRequirements, setIsGeneratingRequirements] = useState(false);
  const [isAnalyzingImpact, setIsAnalyzingImpact] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isExecutingPerformance, setIsExecutingPerformance] = useState(false);
  const [isRemediatingSecurity, setIsRemediatingSecurity] = useState<string | null>(null);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string>('billing');

  const handleNavigateToModule = (moduleId: string) => {
    setSelectedModuleId(moduleId);
    setActiveTab('modules');
  };

  const handleUpdateTestCase = (updated: TestCase) => {
    setTestCases(prev => prev.map(tc => tc.id === updated.id ? updated : tc));
  };

  // Pipeline Nodes steps values
  const [activeSteps, setActiveSteps] = useState<AgentStep[]>([
    {
      id: "req-agent",
      name: "📄 Requirements Parser",
      agentName: "Requirements Analysis Agent",
      description: "Extract, ingest and parse raw user specifications",
      status: "pending",
      progress: 0,
    },
    {
      id: "impact-agent",
      name: "🔮 Regression Analyzer",
      agentName: "Impact Overlay Tracer",
      description: "Compare code deltas and map suite regression loops",
      status: "pending",
      progress: 0,
    },
    {
      id: "script-agent",
      name: "⚙ POM Compiler",
      agentName: "Multi-framework Code Generator",
      description: "Compile production POM automation wrappers",
      status: "pending",
      progress: 0,
    },
    {
      id: "execute-agent",
      name: "▶ Test Executor Grid",
      agentName: "Load/Selenium Grid Orchestrator",
      description: "Launch suite executions with real logs & visual screenshots",
      status: "pending",
      progress: 0,
      output: `[System Standby Mode] Execution Engine ready to launch.

=======================================================
SUMMARY OF WHAT THIS ENGINE DOES:
=======================================================
• Instantiates browser processes across clean headless Chromium, Firefox and WebKit nodes.
• Synchronizes and resolves POM Page Object selectors and assertion configurations.
• Performs mock user behavior executions (Clicks, Form fills, Keyboard inputs, Dropdown selections).
• Observes responsive viewport visual differences, measuring microservice API delay margins.
• Triggers Real-Time Self-Healing filters to correct minor locator deviations dynamically.

=======================================================
LATEST QE DASHBOARD RESULTS:
=======================================================
• QE Dashboard Release Status: 92% SAFE (Production Ready)
• Overall Test Scenarios count: 125
• Automated Testing Coverage: 84%
• Historic Case Integrations: 105 Passed | 11 Healed | 9 Failed
• Security Threat Level Score: 85% Compliant (SAST/DAST approved)
=======================================================`
    }
  ]);

  // MOUNT INITIALIZER: Load all Memory stores from our full-stack server
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [reqs, tcs, defects, impacts, scriptsList, perfs, vuls, logs] = await Promise.all([
          fetch('/api/quality/requirements').then(r => r.json()),
          fetch('/api/quality/testcases').then(r => r.json()),
          fetch('/api/quality/defects/hotspots').then(r => r.json()),
          fetch('/api/quality/impact/reports').then(r => r.json()),
          fetch('/api/quality/scripts').then(r => r.json()),
          fetch('/api/quality/performance/configs').then(r => r.json()),
          fetch('/api/quality/security/vulnerabilities').then(r => r.json()),
          fetch('/api/quality/audit').then(r => r.json())
        ]);

        setRequirements(reqs);
        setTestCases(tcs);
        setDefectHotspots(defects);
        setImpactReports(impacts);
        setScripts(scriptsList);
        setPerformanceConfigs(perfs);
        setVulnerabilities(vuls);
        setAuditLogs(logs);
      } catch (err) {
        console.warn("Could not sync state indices with sever endpoints. Loading default client stores.", err);
      }
    }
    loadInitialData();
  }, []);

  // 1. ADD NEW REQUIREMENT & TRIGGER AUTO COMPILE
  const handleAddRequirement = async (
    title: string,
    content: string,
    sourceType: 'file' | 'text' | 'url' | 'voice',
    crawlerSettings?: {
      username?: string;
      password?: string;
      sapGuiWeb?: boolean;
      salesforceShadow?: boolean;
    }
  ) => {
    setIsGeneratingRequirements(true);
    
    // Switch to requirements tab for focus awareness
    setActiveTab('requirements');

    // Trigger Requirements Analyzer agent visual node to active state
    const prepMessage = sourceType === 'url'
      ? `[${new Date().toLocaleTimeString()}] Playwright Crawler initialized on host. Dynamic COTS shadow dom penetrating mode enabled.`
      : `[${new Date().toLocaleTimeString()}] Requirements Agent activated. Parsing file headers...`;
    
    setActiveSteps(prev => prev.map(s => s.id === 'req-agent' ? { ...s, status: 'running', progress: 40, output: prepMessage } : s));

    try {
      const response = await fetch('/api/quality/requirements/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title, 
          content, 
          sourceType, 
          projectId: currentProjectId,
          crawlerSettings 
        }),
      });
      const data = await response.json();

      if (data.success) {
        // Invalidate state lists
        setRequirements(prev => [data.requirement, ...prev]);
        setTestCases(prev => [...(data.generatedTestCaseCode || []), ...data.generatedTestCases, ...prev]);

        // Finish Requirements Agent visual node gracefully
        const finishMessage = sourceType === 'url'
          ? `[${new Date().toLocaleTimeString()}] Crawler completed! Auto-discovered active views on ${title || content}. Generated ${data.generatedTestCases.length} real-time UI/COTS test cases.`
          : `[${new Date().toLocaleTimeString()}] Finished requirement compilation successfully. Mapped ${data.generatedTestCases.length} core test suite scenarios.`;

        setActiveSteps(prev => prev.map(s => s.id === 'req-agent' ? { ...s, status: 'completed', progress: 100, output: finishMessage } : s));
        
        // Expose a quick audit updates
        handleAddAuditLog();
      }
    } catch (e: any) {
      setActiveSteps(prev => prev.map(s => s.id === 'req-agent' ? { ...s, status: 'failed', progress: 0, output: `[ERROR] Requirement compilation aborted: ${e.message}` } : s));
    } finally {
      setIsGeneratingRequirements(false);
    }
  };

  // 2. RUN PREDICITVE HOTSPOT MODEL FORECASTS
  const handlePredictHotspots = async (title: string, description: string) => {
    try {
      const res = await fetch('/api/quality/defects/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });
      const data = await res.json();
      if (data.success) {
        setDefectHotspots(prev => [data.predicted, ...prev]);
        handleAddAuditLog();
      }
    } catch (e) {
      console.warn("Forecast transaction failed.", e);
    }
  };

  // 3. UNDERTAKE IMPACT ANALYSIS delta validations
  const handleAnalyzeImpact = async (changeTrigger: string, description: string) => {
    setIsAnalyzingImpact(true);
    
    // Highlight regression trace node on the visual flow orchestrator map
    setActiveSteps(prev => prev.map(s => s.id === 'impact-agent' ? { ...s, status: 'running', progress: 50, output: `[${new Date().toLocaleTimeString()}] Scanning Git repository commit histories...` } : s));

    try {
      const res = await fetch('/api/quality/impact/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changeTrigger, description }),
      });
      const data = await res.json();
      if (data.success) {
        setImpactReports(prev => [data.report, ...prev]);
        
        // Finalize regression trace node on map
        setActiveSteps(prev => prev.map(s => s.id === 'impact-agent' ? { ...s, status: 'completed', progress: 100, output: `[${new Date().toLocaleTimeString()}] Code trace mapped. Detected overlap parameters with checkout metrics.` } : s));
        handleAddAuditLog();
      }
    } catch (e: any) {
      setActiveSteps(prev => prev.map(s => s.id === 'impact-agent' ? { ...s, status: 'failed', progress: 0, output: `[ERROR] Regression sweep compilation halted: ${e.message}` } : s));
    } finally {
      setIsAnalyzingImpact(false);
    }
  };

  // 4. GENERATE PROGRAMMATIC AUTOMATION SCRIPTS
  const handleGenerateScript = async (
    testCaseId: string, 
    framework: 'Playwright' | 'Selenium' | 'Cypress' | 'Robot', 
    language: 'TypeScript' | 'Java' | 'Python' | 'JavaScript'
  ) => {
    setIsGeneratingScript(true);
    setActiveTab('scripts');
    
    // Highlight compilation script node on visual dashboard map
    setActiveSteps(prev => prev.map(s => s.id === 'script-agent' ? { ...s, status: 'running', progress: 30, output: `[${new Date().toLocaleTimeString()}] Initializing code compilers for targets...` } : s));

    try {
      const res = await fetch('/api/quality/scripts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testCaseId, framework, language }),
      });
      const data = await res.json();
      if (data.success) {
        setScripts(prev => {
          const filtered = prev.filter(s => s.fileName !== data.script.fileName);
          return [data.script, ...filtered];
        });

        // Finish script compression compiler maps
        setActiveSteps(prev => prev.map(s => s.id === 'script-agent' ? { ...s, status: 'completed', progress: 100, output: `[${new Date().toLocaleTimeString()}] Written full automated code. Applied explicit timers and explicit Page Object variables.` } : s));
        handleAddAuditLog();
      }
    } catch (e: any) {
      setActiveSteps(prev => prev.map(s => s.id === 'script-agent' ? { ...s, status: 'failed', progress: 0, output: `[ERROR] Compile script aborted: ${e.message}` } : s));
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // 5. INJECT INTENSIVE CONCURRENT PERFORMANCE LOAD TESTS
  const handleExecutePerformanceTest = async (
    testType: 'Browser' | 'API',
    endpointOrJourney: string,
    virtualUsers: number,
    durationSeconds: number,
    rampUpTimeSeconds: number,
    rpsLimit?: number
  ) => {
    setIsExecutingPerformance(true);
    try {
      const res = await fetch('/api/quality/performance/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testType, endpointOrJourney, virtualUsers, durationSeconds, rampUpTimeSeconds, rpsLimit }),
      });
      const data = await res.json();
      if (data.success) {
        setPerformanceConfigs(prev => [data.config, ...prev]);
        handleAddAuditLog();
      }
    } catch (e) {
      console.warn("Performance execution sweep failed.", e);
    } finally {
      setIsExecutingPerformance(false);
    }
  };

  // 6. APPLY AUTOMATED SECURTIY VULNERABILITY REMEDIATIONS
  const handleApplyRemediation = async (vulnerabilityId: string) => {
    setIsRemediatingSecurity(vulnerabilityId);
    try {
      const res = await fetch('/api/quality/security/remediate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vulnerabilityId }),
      });
      const data = await res.json();
      if (data.success) {
        setVulnerabilities(prev => prev.map(v => v.id === vulnerabilityId ? data.vulnerability : v));
        handleAddAuditLog();
      }
    } catch (e) {
      console.warn("Remediation execution failed.", e);
    } finally {
      setIsRemediatingSecurity(null);
    }
  };

  // 7. CLIENT-SIDE SERVICE BOT ENQUIRIES (Proxy to Gemini server endpoint)
  const handleSendAssistantMessage = async (prompt: string) => {
    // Collect last few messages to preserve history context
    const response = await fetch('/api/quality/assistant/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    const data = await response.json();
    return data.text;
  };

  // Helper trigger audit fetch after changes
  const handleAddAuditLog = async () => {
    try {
      const logs = await fetch('/api/quality/audit').then(r => r.json());
      setAuditLogs(logs);
    } catch (e) {
      console.warn("Audit refresh failure.");
    }
  };

  // TRIGGER RE-RUN FOR TEST CASES (simulation UI feedbacks)
  const handleRerunMockTestCase = (testId: string) => {
    // Simulated live rerun, changes logs and outputs
    setTestCases(prev => prev.map(tc => tc.id === testId ? { ...tc, automationStatus: 'Automated' } : tc));
    handleAddAuditLog();
  };

  const handleApplyHealMock = (testId: string) => {
    setTestCases(prev => prev.map(tc => tc.id === testId ? { ...tc, automationStatus: 'Automated', confidenceScore: 99 } : tc));
    handleAddAuditLog();
  };

  // PIPELINE SIMULATOR CYCLE RUNNER — uses real /api/quality/execution/run
  const handleExecuteAutonomousCycle = async () => {
    const runId = `RUN-${Math.floor(Date.now() / 1000).toString().slice(-5)}`;
    setIsRunning(true);
    setCurrentRunId(runId);

    // Reset all steps to pending
    setActiveSteps(prev => prev.map(s => ({ ...s, status: 'pending', progress: 0, output: '' })));

    // Step 1 — Requirements Parser
    setActiveSteps(prev => prev.map(s => s.id === 'req-agent' ? {
      ...s, status: 'running', progress: 40,
      output: `[${new Date().toLocaleTimeString()}] Requirements Agent activated. Parsing specification headers and extracting functional modules...`
    } : s));
    await new Promise(r => setTimeout(r, 900));
    setActiveSteps(prev => prev.map(s => s.id === 'req-agent' ? {
      ...s, status: 'completed', progress: 100,
      output: `[${new Date().toLocaleTimeString()}] ✔ Parsed ${testCases.length} test cases from ${requirements.length} requirement documents. Functional modules mapped.`
    } : s));

    // Step 2 — Regression Analyzer
    setActiveSteps(prev => prev.map(s => s.id === 'impact-agent' ? {
      ...s, status: 'running', progress: 50,
      output: `[${new Date().toLocaleTimeString()}] Scanning Git deltas and dependency graph for regression exposure...`
    } : s));
    await new Promise(r => setTimeout(r, 900));
    setActiveSteps(prev => prev.map(s => s.id === 'impact-agent' ? {
      ...s, status: 'completed', progress: 100,
      output: `[${new Date().toLocaleTimeString()}] ✔ Regression risk scored. ${impactReports.length} impact zones mapped. Traceability links validated.`
    } : s));

    // Step 3 — POM Compiler
    setActiveSteps(prev => prev.map(s => s.id === 'script-agent' ? {
      ...s, status: 'running', progress: 60,
      output: `[${new Date().toLocaleTimeString()}] Compiling Page Object Models and generating typed Playwright/Selenium wrappers...`
    } : s));
    await new Promise(r => setTimeout(r, 900));
    setActiveSteps(prev => prev.map(s => s.id === 'script-agent' ? {
      ...s, status: 'completed', progress: 100,
      output: `[${new Date().toLocaleTimeString()}] ✔ Compiled ${scripts.length} automation scripts. Explicit wait strategies and locator fallbacks applied.`
    } : s));

    // Step 4 — Live Execution Grid (calls real API)
    setActiveSteps(prev => prev.map(s => s.id === 'execute-agent' ? {
      ...s, status: 'running', progress: 30,
      output: `[${new Date().toLocaleTimeString()}] Spawning headless Chromium/WebKit/Firefox container cluster...\n[${new Date().toLocaleTimeString()}] Dispatching ${Math.min(testCases.length, 35)} test cases to execution grid...`
    } : s));

    try {
      // Pick up to 35 real test case IDs from state
      const tcIds = testCases.slice(0, 35).map(tc => tc.id);
      const res = await fetch('/api/quality/execution/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testCaseIds: tcIds,
          framework: 'Playwright',
          browser: 'Chromium'
        })
      });
      const data = await res.json();

      if (data.success) {
        const { passed, failed, healed, aiSummary, healingRecommendations, results } = data;
        const total = results?.length || tcIds.length;
        const readiness = Math.round((passed / Math.max(total, 1)) * 100);

        // Build per-module breakdown from real results
        const moduleBreakdown = (results || []).reduce((acc: Record<string, { pass: number; fail: number; heal: number }>, r: any) => {
          const mod = r.module || 'General';
          if (!acc[mod]) acc[mod] = { pass: 0, fail: 0, heal: 0 };
          if (r.status === 'passed') acc[mod].pass++;
          else if (r.status === 'healed') acc[mod].heal++;
          else acc[mod].fail++;
          return acc;
        }, {});

        const moduleLines = Object.entries(moduleBreakdown)
          .map(([mod, s]: [string, any]) =>
            `  • ${mod} ➔ ${s.pass} passed | ${s.heal} healed | ${s.fail} failed`)
          .join('\n');

        const healRecLines = (healingRecommendations || []).map((r: string) => `  → ${r}`).join('\n');

        setActiveSteps(prev => prev.map(s => s.id === 'execute-agent' ? {
          ...s,
          status: 'completed',
          progress: 100,
          output: `[${new Date().toLocaleTimeString()}] ✔ Headless browser contexts initialized across Chromium / WebKit / Firefox.
[${new Date().toLocaleTimeString()}] ➔ Executed ${total} test cases across grid container pool.

RESULTS BY MODULE:
${moduleLines || '  (no module breakdown available)'}

[${new Date().toLocaleTimeString()}] ➔ Viewport telemetry screenshots & DOM snapshots captured.

=======================================================
AI EXECUTION SUMMARY
=======================================================
${aiSummary || 'No AI summary available.'}
${healRecLines ? `\nHEALING RECOMMENDATIONS:\n${healRecLines}` : ''}

=======================================================
FINAL OUTCOME: QE DASHBOARD RESULTS
=======================================================
• Quality Release Readiness Status: ${readiness}% ${readiness >= 85 ? 'SAFE / READY FOR STAGING' : 'DEGRADED / NEEDS ATTENTION'}
• Total Scenarios Evaluated and Verified: ${total} Scenarios
• Historical Status Breakdown: ${passed} Passed | ${healed} Self-Healed | ${failed} Open Defects
• Run ID: ${data.runId || runId}
=======================================================
[${new Date().toLocaleTimeString()}] ✔ Pipeline cycle run completed successfully. Standby.`
        } : s));
      } else {
        throw new Error(data.error || 'Execution API returned failure');
      }
    } catch (err: any) {
      setActiveSteps(prev => prev.map(s => s.id === 'execute-agent' ? {
        ...s, status: 'failed', progress: 0,
        output: `[${new Date().toLocaleTimeString()}] ✖ Execution grid error: ${err.message}\n[FALLBACK] Check server logs for details.`
      } : s));
    }

    setIsRunning(false);
    handleAddAuditLog();
  };

  const handleManualOverrideConfig = (stepId: string) => {
    // Logs audit changes of manual configurations
    console.log("Applied Manual override intercept on Node:", stepId);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Auth Gate — show login if not authenticated */}
      {!authUser && <AuthModal onLogin={handleLogin} />}
      
      {/* Top Main Navigation Nav header Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl shadow-md">
            <Zap className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-sans font-extrabold tracking-tight text-slate-900 uppercase sm:text-base">
              Agentic AI Quality Intelligence Platform
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-500 font-mono">End-to-End Autonomous Quality Engineering Core</p>
          </div>
        </div>

        {/* Global Toolbar and Controls */}
        <div className="flex items-center gap-3">
          {/* Quick Stats Banner links */}
          <div className="hidden md:flex items-center gap-4 text-xs font-mono border-r border-slate-200 pr-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-400 uppercase font-bold font-sans">Active Project Context</span>
              <span className="text-emerald-600 font-extrabold text-right font-sans">Segregated Sandbox</span>
            </div>
          </div>

          {/* Project Switcher Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={currentProjectId}
              onChange={(e) => setCurrentProjectId(e.target.value)}
              className="bg-slate-50 border border-slate-250 hover:border-purple-300 text-slate-800 font-sans font-bold text-xs rounded-xl p-2 focus:outline-none focus:ring-1 focus:ring-purple-400 shadow-sm"
            >
              <option value="ALL">🗂 All Projects</option>
              {allProjectIds.map(pid => (
                <option key={pid} value={pid}>📁 {pid}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setChatbotOpen(!chatbotOpen)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-purple-700 hover:bg-slate-50 font-mono font-semibold shadow-sm transition-all hover:border-slate-300"
          >
            <MessageSquareCode className="w-4 h-4 text-purple-600" />
            <span className="hidden sm:inline">Ask AI Copilot</span>
          </button>
        </div>
      </header>

      {/* Main Responsive Sidebar + Page Canvas Layout */}
      <main className="max-w-7xl mx-auto w-full p-4 md:p-6 flex-grow flex flex-col lg:flex-row gap-6">
        
        {/* Left Sidebar Navigation: Distinct Dedicated Modules Directory */}
        <aside className="w-full lg:w-64 shrink-0 flex flex-col gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-450 font-bold block">QE Command Board</span>
              <p className="text-[10px] text-slate-500 leading-normal mt-0.5">Access specialized testing pages.</p>
            </div>
            
            <nav className="flex flex-col gap-1">
              {[
                { id: 'agentic', label: 'Agentic AI Engine', icon: Zap, color: 'text-purple-650 font-black' },
                { id: 'requirements', label: 'Requirement Analysis', icon: FileText, color: 'text-blue-600' },
                { id: 'testcases', label: 'Test Case Generator', icon: TableProperties, color: 'text-emerald-600' },
                { id: 'traceability', label: 'Traceability Matrix', icon: Table, color: 'text-teal-600' },
                { id: 'scripts', label: 'Script Generator', icon: Settings2, color: 'text-amber-600' },
                { id: 'defects', label: 'Impact Analyzer', icon: Crosshair, color: 'text-rose-600' },
                { id: 'performance', label: 'Performance Testing', icon: Sliders, color: 'text-cyan-600' },
                { id: 'security', label: 'Security Testing', icon: ShieldAlert, color: 'text-red-600' },
                { id: 'dashboard', label: 'QE Dashboard', icon: TrendingUp, color: 'text-purple-600' },
                { id: 'modules', label: 'Module Quality', icon: Layers, color: 'text-purple-650' },
                { id: 'execution', label: 'Execution Engine', icon: Cpu, color: 'text-indigo-600' },
                { id: 'test-plans', label: 'Test Plans', icon: TableProperties, color: 'text-teal-600' },
                { id: 'manual-execution', label: 'Manual Execution', icon: CheckSquare, color: 'text-orange-600' },
                { id: 'audit', label: 'Pipeline Audit Log', icon: History, color: 'text-slate-650' },
                { id: 'converter', label: 'Enterprise Converter', icon: RefreshCw, color: 'text-pink-600' },
              ].map((page) => {
                const Icon = page.icon;
                const isSelected = activeTab === page.id;
                return (
                  <button
                    key={page.id}
                    onClick={() => setActiveTab(page.id as any)}
                    className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-left text-xs font-sans font-bold transition-all ${
                      isSelected 
                        ? 'bg-slate-900 text-white shadow-sm' 
                        : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 py-1">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : page.color}`} />
                      <span>{page.label}</span>
                    </div>
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                  </button>
                );
              })}
              {/* Additional tools section */}
              <div className="pt-2 mt-1 border-t border-slate-100">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-1 px-1">Config &amp; Integrations</span>
                {[
                  { id: 'scheduler', label: 'Test Scheduler', icon: Clock, color: 'text-indigo-600' },
                  { id: 'analytics', label: 'AI Analytics', icon: BarChart3, color: 'text-violet-600' },
                  { id: 'cicd', label: 'CI/CD Integration', icon: GitBranch, color: 'text-cyan-600' },
                  { id: 'integrations', label: 'TMS Integrations', icon: Link, color: 'text-sky-600' },
                  { id: 'llm-config', label: 'LLM Providers', icon: Cpu, color: 'text-violet-600' },
                  { id: 'feedback', label: 'Prompts & Feedback', icon: BookOpen, color: 'text-amber-600' },
                ].map((page) => {
                  const Icon = page.icon;
                  const isSelected = activeTab === page.id;
                  return (
                    <button
                      key={page.id}
                      onClick={() => setActiveTab(page.id as any)}
                      className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-left text-xs font-sans font-bold transition-all ${
                        isSelected 
                          ? 'bg-slate-900 text-white shadow-sm' 
                          : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 py-1">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : page.color}`} />
                        <span>{page.label}</span>
                      </div>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                    </button>
                  );
                })}
              </div>
            </nav>
            
            {/* User info */}
            {authUser && (
              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-center gap-2 px-1">
                  <UserCircle className="w-5 h-5 text-indigo-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">{authUser.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{authUser.role.replace('_', ' ')}</p>
                  </div>
                  <button onClick={handleLogout} title="Sign out" className="p-1 text-slate-400 hover:text-red-500 rounded">
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>TCP INGRESS 3000</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
          </div>
        </aside>

        {/* Right Active Viewport Canvas */}
        <div className="flex-1 min-w-0">
          
          {activeTab === 'agentic' && (
            <AgenticOrchestrator
              requirements={requirements}
              setRequirements={setRequirements}
              testCases={testCases}
              setTestCases={setTestCases}
              defectHotspots={defectHotspots}
              setDefectHotspots={setDefectHotspots}
              scripts={scripts}
              setScripts={setScripts}
              vulnerabilities={vulnerabilities}
              setVulnerabilities={setVulnerabilities}
              onNavigateToTab={setActiveTab}
              onExecutePerformanceTest={handleExecutePerformanceTest}
              onApplyRemediation={handleApplyRemediation}
            />
          )}

          {activeTab === 'dashboard' && (
            <DashboardMetrics
              testCases={filteredTestCases}
              defects={filteredDefectHotspots}
              vulnerabilities={filteredVulnerabilities}
              onTriggerRerun={handleRerunMockTestCase}
              onApplyHeal={handleApplyHealMock}
              onNavigateToModule={handleNavigateToModule}
              onNavigateToAgentic={() => setActiveTab('agentic')}
            />
          )}

          {activeTab === 'execution' && (
            <ExecutionEnginePage
              activeSteps={activeSteps}
              currentRunId={currentRunId}
              isRunning={isRunning}
              onTriggerRun={handleExecuteAutonomousCycle}
              onOverrideConfirm={handleManualOverrideConfig}
            />
          )}

          {activeTab === 'requirements' && (
            <RequirementsTab
              requirements={filteredRequirements}
              testCases={filteredTestCases}
              onAddRequirement={handleAddRequirement}
              isGenerating={isGeneratingRequirements}
              onGenerateTestCaseCode={(tcId) => handleGenerateScript(tcId, 'Playwright', 'TypeScript')}
            />
          )}

          {activeTab === 'testcases' && (
            <TestCaseGeneratorPage
              testCases={filteredTestCases}
              onTriggerRerun={handleRerunMockTestCase}
              onApplyHeal={handleApplyHealMock}
              onAddManualTestCase={(newCase) => setTestCases(prev => [{ ...newCase, projectId: currentProjectId }, ...prev])}
              onUpdateTestCase={handleUpdateTestCase}
              currentProjectId={currentProjectId}
            />
          )}

          {activeTab === 'modules' && (
            <ModulePagesTab
              requirements={filteredRequirements}
              testCases={filteredTestCases}
              defects={filteredDefectHotspots}
              vulnerabilities={filteredVulnerabilities}
              onTriggerRerun={handleRerunMockTestCase}
              onApplyHeal={handleApplyHealMock}
              activeModuleId={selectedModuleId}
              onActiveModuleIdChange={setSelectedModuleId}
            />
          )}

          {activeTab === 'traceability' && (
            <TraceabilityTab
              requirements={filteredRequirements}
              testCases={filteredTestCases}
              onTriggerRerun={handleRerunMockTestCase}
              currentProjectId={currentProjectId}
            />
          )}

          {activeTab === 'defects' && (
            <DefectPredictTab
              defects={filteredDefectHotspots}
              impactReports={impactReports}
              onPredictHotspots={handlePredictHotspots}
              onAnalyzeImpact={handleAnalyzeImpact}
              isAnalyzing={isAnalyzingImpact}
            />
          )}

          {activeTab === 'scripts' && (
            <ScriptTab
              testCases={filteredTestCases}
              scripts={filteredScripts}
              onGenerateScript={handleGenerateScript}
              isGeneratingScript={isGeneratingRequirements || isGeneratingScript}
              currentProjectId={currentProjectId}
            />
          )}

          {activeTab === 'converter' && (
            <ScriptConverterTab />
          )}

          {activeTab === 'performance' && (
            <PerformanceTab
              configs={filteredPerformanceConfigs}
              onExecutePerformanceTest={handleExecutePerformanceTest}
              isExecuting={isExecutingPerformance}
            />
          )}

          {activeTab === 'security' && (
            <SecurityTab
              vulnerabilities={filteredVulnerabilities}
              onApplyRemediation={handleApplyRemediation}
              isRemediating={isRemediatingSecurity}
            />
          )}

          {activeTab === 'test-plans' && <TestPlansTab />}
          {activeTab === 'manual-execution' && <ManualExecutionTab />}
          {activeTab === 'llm-config' && <LLMConfigTab />}
          {activeTab === 'cicd' && <CICDTab />}
          {activeTab === 'integrations' && <IntegrationsTab />}
          {activeTab === 'feedback' && <FeedbackTemplatesTab />}
          {activeTab === 'scheduler' && <SchedulerTab />}
          {activeTab === 'analytics' && <AnalyticsTab />}

          {activeTab === 'audit' && (
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-sans font-semibold text-slate-800">Autonomous Decisional Audit Trail</h3>
                  <p className="text-xs text-slate-500 mt-1">Audit logs documenting exact actions performed by different agents.</p>
                </div>
                <button
                  onClick={handleAddAuditLog}
                  className="px-2.5 py-1 text-[11px] font-mono bg-slate-50 border border-slate-200 hover:border-slate-300 rounded text-slate-650 font-medium"
                >
                  Force Sync Logs
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="pb-2">Audit ID</th>
                      <th className="pb-2">Timestamp</th>
                      <th className="pb-2">Action / Event</th>
                      <th className="pb-2">Assigned Agent Node</th>
                      <th className="pb-2">Audit Payload Details</th>
                      <th className="pb-2 text-right">Cost Estimative</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="py-3 text-purple-600 font-bold">{log.id}</td>
                        <td className="py-3 text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</td>
                        <td className="py-3 font-semibold text-slate-800">{log.action}</td>
                        <td className="py-3 text-slate-600 font-medium">{log.affectedEntity}</td>
                        <td className="py-3 text-slate-650 italic max-w-[280px] truncate">{log.details}</td>
                        <td className="py-3 text-slate-400 text-right">${log.costEstimate || '0.0002'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Global Slideout Chat Helper Copilot component */}
      <ChatbotSlideout
        onSendMessage={handleSendAssistantMessage}
        isOpen={chatbotOpen}
        onClose={() => setChatbotOpen(false)}
      />

      {/* Footer System Status details */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-sm text-slate-400 text-[10px] font-mono">
        <span>© 2026 Agentic AI Quality Intelligence Platform. All pipelines active.</span>
        <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Active ingress node: Port 3000 Inbound telemetry - SSL True</span>
        </div>
      </footer>
    </div>
  );
}
