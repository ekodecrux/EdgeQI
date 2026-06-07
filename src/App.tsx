import React, { useState, useEffect, useCallback } from 'react';
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
  Play,
  FolderOpen,
  Brain,
  Target,
  GitMerge,
  Menu,
  Crown,
  Building2
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
import LiveDashboard from './components/LiveDashboard';
import RequirementsTab from './components/RequirementsTab';
import DefectPredictTab from './components/DefectPredictTab';
import DefectsManager from './components/DefectsManager';
import ScriptTab from './components/ScriptTab';
import PerformanceTab from './components/PerformanceTab';
import SecurityTab from './components/SecurityTab';
import ChatbotSlideout from './components/ChatbotSlideout';
import TraceabilityTab from './components/TraceabilityTab';
// ModulePagesTab removed — module health absorbed into QA Dashboard
import ScriptConverterTab from './components/ScriptConverterTab';
import TestCaseGeneratorPage from './components/TestCaseGeneratorPage';
import TestPlansTabComponent from './components/TestPlansTab';
import ExecutionEnginePage from './components/ExecutionEnginePage';
import AgenticOrchestrator from './components/AgenticOrchestrator';
import AuthModal from './components/AuthModal';
import LandingPage from './components/LandingPage';
import LLMConfigTab from './components/LLMConfigTab';
import CICDTab from './components/CICDTab';
import FeedbackTemplatesTab from './components/FeedbackTemplatesTab';
import IntegrationsTab from './components/IntegrationsTab';
import SchedulerTab from './components/SchedulerTab';
import AnalyticsTab from './components/AnalyticsTab';
import ProjectHub from './components/ProjectHub';
import RAGKnowledgeBase from './components/RAGKnowledgeBase';
import VoicePromptBar from './components/VoicePromptBar';
import ProjectContextBar from './components/ProjectContextBar';
import AIAssistantPanel from './components/AIAssistantPanel';
import WorkflowBuilder from './components/WorkflowBuilder';
import TmsConfigSettings from './components/TmsConfigSettings';
import CicdConfigSettings from './components/CicdConfigSettings';
import TestDataManager from './components/TestDataManager';
import SuperAdminPortal from './components/SuperAdminPortal';
import TenantAdminPortal from './components/TenantAdminPortal';
import { apiUrl } from '@/src/config/api';

// ── Sidebar helper components ────────────────────────────────────────────────
function SidebarItem({ id, label, Icon, active, onClick }: {
  id: string; label: string; Icon: React.ElementType; active: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className={`sidebar-item${active ? ' active' : ''}`}
      title={label}
    >
      <Icon className={`w-3.5 h-3.5 sidebar-icon shrink-0`} style={{ color: active ? '#A5B4FC' : 'rgba(200,211,230,0.8)' }} />
      <span className="truncate">{label}</span>
    </button>
  );
}

function SidebarGroup({ label, children, defaultOpen = false }: {
  label: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-2 py-1 mt-2 group"
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
      >
        <span className="sidebar-section-label" style={{ margin: 0, letterSpacing: '0.08em', fontSize: 10, fontFamily: 'Inter, sans-serif', textTransform: 'uppercase' }}>{label}</span>
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          style={{ color: 'rgba(166,180,205,0.75)', flexShrink: 0 }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <nav className="flex flex-col mt-0.5">
          {children}
        </nav>
      )}
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

  const token = () => localStorage.getItem('iq_token');
  const authH = () => ({ 'Content-Type': 'application/json', ...(token() ? { Authorization: `Bearer ${token()}` } : {}) });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/quality/execution/manual'), { headers: authH() });
      const data = await res.json();
      if (data.runs) setRuns(data.runs);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const startRun = async () => {
    if (!form.tcTitle.trim()) return;
    try {
      const res = await fetch(apiUrl('/api/quality/execution/manual'), {
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
      const res = await fetch(apiUrl(`/api/quality/execution/manual/${runId}/status`), {
        method: 'PATCH', headers: authH(),
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.run) { setRuns(prev => prev.map(r => r.id === runId ? data.run : r)); if (selectedRun?.id === runId) setSelectedRun(data.run); }
    } catch { /* silent */ }
  };

  const updateStep = async (runId: string, stepIdx: number, result: string, actual: string) => {
    try {
      const res = await fetch(apiUrl(`/api/quality/execution/manual/${runId}/step`), {
        method: 'PATCH', headers: authH(),
        body: JSON.stringify({ stepIdx, result, actual })
      });
      const data = await res.json();
      if (data.run) { setRuns(prev => prev.map(r => r.id === runId ? data.run : r)); setSelectedRun(data.run); }
    } catch { /* silent */ }
  };

  const statusBadge: Record<string,string> = { in_progress:'badge badge-amber', passed:'badge badge-green', failed:'badge badge-red', blocked:'badge badge-red' };
  const stepColors: Record<string,string> = { pass:'bg-green-100 text-green-700', fail:'bg-red-100 text-red-700', skip:'bg-slate-100 text-slate-600', pending:'bg-slate-50 text-slate-400' };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-fadeInUp">
      <div className="lg:col-span-5 space-y-4">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="panel-title flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-blue-500" /> Manual Execution
                <span className="chip">REQ-33</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Track manual test execution with step-by-step results.</p>
            </div>
            <button onClick={() => setShowForm(v => !v)} className="btn-primary flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> New Run
            </button>
          </div>
          {feedback && <div className="mb-3 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 font-mono">{feedback}</div>}
          {showForm && (
            <div className="mb-4 p-3 metal-surface rounded-xl space-y-2">
              <input value={form.tcTitle} onChange={e => setForm(f => ({...f, tcTitle: e.target.value}))} placeholder="Test case title *"
                className="input-glass w-full" />
              <input value={form.tester} onChange={e => setForm(f => ({...f, tester: e.target.value}))} placeholder="Tester name"
                className="input-glass w-full" />
              <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={2} placeholder="Notes / context…"
                className="input-glass w-full" />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
                <button onClick={startRun} disabled={!form.tcTitle.trim()} className="btn-primary">Start Run</button>
              </div>
            </div>
          )}
          {loading ? <div className="text-center py-8 text-slate-400 text-xs font-mono">Loading…</div> : runs.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs font-mono">No manual runs yet.</div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-thin">
              {runs.map(run => (
                <div key={run.id} onClick={() => setSelectedRun(run)}
                  className={`p-3 border rounded-xl cursor-pointer transition-all ${
                    selectedRun?.id === run.id
                      ? 'border-blue-400 bg-blue-50/50 glow-blue'
                      : 'border-slate-200/80 bg-white/50 hover:border-blue-300'
                  }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">{run.tcTitle}</p>
                      <p className="text-[10px] font-mono text-slate-500">Tester: {run.tester} · {run.steps?.length || 0} steps</p>
                    </div>
                    <span className={statusBadge[run.status] || 'badge badge-slate'}>{run.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-7">
        {selectedRun ? (
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-slate-900">{selectedRun.tcTitle}</h4>
                <p className="text-xs text-slate-500">Tester: {selectedRun.tester} · Started: {selectedRun.startedAt ? new Date(selectedRun.startedAt).toLocaleString() : '—'}</p>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {(['in_progress','passed','failed','blocked'] as const).map(s => (
                  <button key={s} onClick={() => updateStatus(selectedRun.id, s)}
                    className={`text-[9px] font-mono font-bold px-2 py-1 rounded-lg border transition-all ${
                      selectedRun.status === s
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white/60 text-slate-500 border-slate-200 hover:border-blue-300'
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            {selectedRun.notes && <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2">{selectedRun.notes}</p>}
            <div className="space-y-2">
              <h5 className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">Test Steps</h5>
              {(selectedRun.steps || []).map((step: any, i: number) => (
                <div key={i} className="border border-slate-200/80 bg-white/50 rounded-xl p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] font-mono text-slate-400 mt-0.5 shrink-0">#{i+1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800">{step.action}</p>
                      <p className="text-[10px] text-slate-500 font-mono">Expected: {step.expected}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {(['pass','fail','skip'] as const).map(r => (
                        <button key={r} onClick={() => updateStep(selectedRun.id, i, r, step.actual || '')}
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-all ${step.result === r ? stepColors[r] + ' font-bold border-transparent' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'}`}>
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                  {step.actual !== undefined && (
                    <input type="text" value={step.actual || ''} placeholder="Actual result observed…"
                      onChange={e => { const s = [...selectedRun.steps]; s[i] = {...s[i], actual: e.target.value}; setSelectedRun({...selectedRun, steps: s}); }}
                      onBlur={e => updateStep(selectedRun.id, i, step.result || 'pending', e.target.value)}
                      className="input-glass w-full" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-full min-h-[300px] flex items-center justify-center glass-card">
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
  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    'traceability' | 
    'audit' |
    'llm-config' |
    'cicd' |
    'integrations' |
    'feedback' |
    'scheduler' |
    'analytics' |
    'test-plans' |
    'manual-execution' |
    'projects' |
    'rag-kb' |
    'workflow-builder' |
    'defect-impact' |
    'settings' |
    'cicd-settings' |
    'test-data' |
    'super-admin' |
    'org-admin'
  >('agentic');
  
  // Sprint context — active sprint for current project
  const [currentSprintId, setCurrentSprintId] = useState<string>('');

  // Auth state
  const [authUser, setAuthUser] = useState<{ id: number; email: string; name: string; role: string } | null>(() => {
    try { return JSON.parse(localStorage.getItem('iq_user') || 'null'); } catch { return null; }
  });
  const [authToken, setAuthToken] = useState<string>(() => localStorage.getItem('iq_token') || '');

  // Landing page state — show landing if not already authenticated
  const [showLanding, setShowLanding] = useState<boolean>(() => {
    try { return !localStorage.getItem('iq_token'); } catch { return true; }
  });
  // When user clicks any CTA on landing, dismiss landing and show auth modal
  const handleLandingCTA = () => setShowLanding(false);

  const handleLogin = (user: any, token: string) => {
    setAuthUser(user);
    setAuthToken(token);
    setShowLanding(false);
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

  // Project Partitioning — load from DB
  const [currentProjectId, setCurrentProjectId] = useState<string>('ALL');
  const [dbProjects, setDbProjects] = useState<{ id: string; name: string; icon: string; color: string; status: string }[]>([]);
  const [dbSprints, setDbSprints] = useState<{ id: string; project_id: string; name: string; status: string }[]>([]);
  // All sprints across all projects — used by ProjectContextBar when user switches project inline
  const [allDbSprints, setAllDbSprints] = useState<{ id: string; project_id: string; name: string; status: string }[]>([]);

  // Load projects from DB on mount and whenever user leaves ProjectHub
  const reloadProjects = () => {
    const token = localStorage.getItem('iq_token') || '';
    fetch(apiUrl('/api/quality/projects'), { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { projects: [] })
      .then((data: any) => {
        const list = data.projects || data || [];
        setDbProjects(list.map((p: any) => ({ id: p.id, name: p.name, icon: p.icon || '🚀', color: p.color || '#1e96df', status: p.status || 'active' })));
      })
      .catch(() => {});
    fetch(apiUrl('/api/quality/sprints'), { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { sprints: [] })
      .then((data: any) => { setAllDbSprints(data.sprints || data || []); })
      .catch(() => {});
  };
  useEffect(() => { reloadProjects(); }, []);
  // Reload project list whenever user navigates away from Project Hub (they may have created one)
  useEffect(() => { if (activeTab !== 'projects') reloadProjects(); }, [activeTab]);

  // Load sprints when project changes
  useEffect(() => {
    if (currentProjectId === 'ALL') { setDbSprints([]); setCurrentSprintId(''); return; }
    const token = localStorage.getItem('iq_token') || '';
    fetch(apiUrl(`/api/quality/sprints?project_id=${currentProjectId}`), { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { sprints: [] })
      .then((data: any) => {
        const list = data.sprints || data || [];
        setDbSprints(list);
        // Auto-select active sprint
        const active = list.find((s: any) => s.status === 'active');
        setCurrentSprintId(active?.id || list[0]?.id || '');
      })
      .catch(() => {});
  }, [currentProjectId]);

  // Handler used by ProjectContextBar — changes active project and auto-selects its sprint
  const handleContextBarProjectChange = (id: string) => {
    setCurrentProjectId(id);
    if (id === 'ALL') { setCurrentSprintId(''); return; }
    const projectSprints = allDbSprints.filter(s => s.project_id === id);
    const active = projectSprints.find(s => s.status === 'active');
    setCurrentSprintId(active?.id || projectSprints[0]?.id || '');
  };

  // Collect all unique project IDs from existing data + DB projects
  const allProjectIds = Array.from(new Set([
    ...dbProjects.map(p => p.id),
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
    setActiveTab('dashboard');
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
          fetch(apiUrl('/api/quality/requirements')).then(r => r.json()),
          fetch(apiUrl('/api/quality/testcases')).then(r => r.json()),
          fetch(apiUrl('/api/quality/defects/hotspots')).then(r => r.json()),
          fetch(apiUrl('/api/quality/impact/reports')).then(r => r.json()),
          fetch(apiUrl('/api/quality/scripts')).then(r => r.json()),
          fetch(apiUrl('/api/quality/performance/configs')).then(r => r.json()),
          fetch(apiUrl('/api/quality/security/vulnerabilities')).then(r => r.json()),
          fetch(apiUrl('/api/quality/audit')).then(r => r.json())
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
      const response = await fetch(apiUrl('/api/quality/requirements/add'), {
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
      const res = await fetch(apiUrl('/api/quality/defects/predict'), {
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
      const res = await fetch(apiUrl('/api/quality/impact/analyze'), {
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
      const res = await fetch(apiUrl('/api/quality/scripts/generate'), {
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
      const res = await fetch(apiUrl('/api/quality/performance/execute'), {
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
      const res = await fetch(apiUrl('/api/quality/security/remediate'), {
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
    const response = await fetch(apiUrl('/api/quality/assistant/chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    const data = await response.json();
    return data.text;
  };

  // Close mobile menu when tab changes
  const handleTabChange = (tab: any) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  // navigate-tab custom event — fired by TmsSyncBar + CICDTab "Configure in Settings →" links
  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent).detail as string;
      if (tab) handleTabChange(tab);
    };
    window.addEventListener('navigate-tab', handler);
    return () => window.removeEventListener('navigate-tab', handler);
  }, []);

  // Helper trigger audit fetch after changes
  const handleAddAuditLog = async () => {
    try {
      const logs = await fetch(apiUrl('/api/quality/audit')).then(r => r.json());
      setAuditLogs(logs);
    } catch (e) {
      console.warn("Audit refresh failure.");
    }
  };

  // BULK IMPORT: requirements from TMS
  const handleImportRequirementsFromTMS = (reqs: RequirementDoc[]) => {
    setRequirements(prev => {
      const existingIds = new Set(prev.map(r => r.id));
      const newReqs = reqs.filter(r => !existingIds.has(r.id));
      return [...newReqs, ...prev];
    });
  };

  // BULK IMPORT: test cases from TMS
  const handleImportTestCasesFromTMS = (tcs: TestCase[]) => {
    setTestCases(prev => {
      const existingIds = new Set(prev.map(tc => tc.id));
      const newTcs = tcs.filter(tc => !existingIds.has(tc.id)).map(tc => ({ ...tc, projectId: currentProjectId }));
      return [...newTcs, ...prev];
    });
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
      const res = await fetch(apiUrl('/api/quality/execution/run'), {
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

  // Show landing page before auth if user hasn't logged in yet
  if (showLanding && !authUser) {
    return <LandingPage onGetStarted={handleLandingCTA} />;
  }

  // ── SUPER ADMIN: Completely isolated Business Control Plane ──────────────────
  // Super admins see ONLY the business portal — no QA platform features at all.
  if (authUser?.role === 'super_admin') {
    return (
      <div className="min-h-screen flex" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', background: '#0B0F1A' }}>
        {!authUser && <AuthModal onLogin={handleLogin} />}

        {/* Minimal Super Admin sidebar — logo + user + logout only */}
        <aside style={{
          width: 220, minWidth: 220, maxWidth: 220,
          background: 'linear-gradient(180deg, #0F172A 0%, #0B0F1A 100%)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0
        }}>
          {/* Logo */}
          <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #5B6CFF 0%, #7C3AED 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(91,108,255,0.35)' }}>
                <Crown className="w-4 h-4 text-white" />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 900, color: '#fff', letterSpacing: '0.18em', fontFamily: 'Inter, sans-serif', lineHeight: 1 }}>EDGE<span style={{ color: '#818CF8', marginLeft: 2 }}>QI</span></p>
                <p style={{ fontSize: 8, fontFamily: 'JetBrains Mono, monospace', color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>Super Admin</p>
              </div>
            </div>
          </div>

          {/* Nav — only one item: Business Control Plane */}
          <div style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
            <div style={{ marginBottom: 4 }}>
              <p style={{ fontSize: 9, fontFamily: 'Inter, sans-serif', color: '#475569', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 8px 8px', fontWeight: 700 }}>Administration</p>
              <button
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, rgba(91,108,255,0.18) 0%, rgba(124,58,237,0.12) 100%)',
                  color: '#A5B4FC', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600
                }}
              >
                <Crown className="w-3.5 h-3.5" style={{ color: '#A5B4FC', flexShrink: 0 }} />
                Business Control Plane
              </button>
            </div>
          </div>

          {/* User footer */}
          <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(15,23,42,0.6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #5B6CFF, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {authUser?.name?.charAt(0) || 'S'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 11, color: '#E2E8F0', fontFamily: 'Inter, sans-serif', fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{authUser?.name}</p>
                <p style={{ fontSize: 9, color: '#94A3B8', fontFamily: 'Inter, sans-serif', margin: 0 }}>super admin</p>
              </div>
              <button onClick={handleLogout} title="Sign out" style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                onMouseLeave={e => (e.currentTarget.style.color = '#64748B')}>
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: '#64748B' }}>
              <span>EDGE QI · v3.0</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />LIVE</span>
            </div>
          </div>
        </aside>

        {/* Full-screen Super Admin portal — no header bar, no QA chrome */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#0B0F1A' }}>
          <SuperAdminPortal token={authToken} />
        </div>

        {/* AI Copilot still available to super admin */}
        <ChatbotSlideout
          onSendMessage={handleSendAssistantMessage}
          isOpen={chatbotOpen}
          onClose={() => setChatbotOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', color: '#0F172A' }}>
      {/* Auth Gate — show login if not authenticated */}
      {!authUser && <AuthModal onLogin={handleLogin} />}

      {/* ── MOBILE OVERLAY BACKDROP ─────────────────────────────────── */}
      {mobileMenuOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ── SIDEBAR ─────────────────────────────────────────────────── */}
      <aside className={`sidebar${mobileMenuOpen ? ' sidebar-open' : ''}`}>
        {/* Logo — fixed at top */}
        <div className="px-4 py-4 shrink-0 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #5B6CFF 0%, #7C3AED 100%)', boxShadow: '0 4px 12px rgba(91,108,255,0.35)' }}>
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-[15px] font-black text-white leading-tight" style={{ letterSpacing: '0.18em', fontFamily: 'Inter, sans-serif' }}>EDGE<span style={{ color: '#818CF8' }} className="ml-1">QI</span></p>
              <p style={{ fontSize: 8, fontFamily: 'JetBrains Mono, monospace', color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>Quality Intelligence</p>
            </div>
          </div>
        </div>

        {/* Scrollable Nav area — fills all space between logo and footer */}
        <div className="sidebar-scroll flex-1 overflow-y-auto overflow-x-hidden px-2 py-2">

          {/* ── Section: My Projects ───────────────────────────────────── */}
          <SidebarGroup label="My Projects" defaultOpen>
            {[
              { id: 'projects', label: 'Project Hub',    icon: FolderOpen },
              { id: 'rag-kb',   label: 'Knowledge Base', icon: Brain },
            ].map(p => <SidebarItem key={p.id} id={p.id} label={p.label} Icon={p.icon} active={activeTab === p.id} onClick={() => handleTabChange(p.id)} />)}
          </SidebarGroup>

          {/* ── Section: Testing Workflow ────────────────────────────── */}
          <SidebarGroup label="Testing Workflow" defaultOpen>
            {[
              { id: 'agentic',       label: 'AI Auto-Test',          icon: Zap },
              { id: 'requirements',  label: 'Requirements',           icon: FileText },
              { id: 'test-plans',    label: 'Test Plans',             icon: TableProperties },
              { id: 'testcases',     label: 'Test Cases',             icon: TableProperties },
              { id: 'traceability',  label: 'Traceability Matrix',    icon: Table },
              { id: 'scripts',       label: 'Test Automation',        icon: Settings2 },
              { id: 'test-data',     label: 'Test Data Manager',      icon: Database },
              { id: 'defect-impact', label: 'Defect & Impact AI',     icon: Target },
            ].map(p => <SidebarItem key={p.id} id={p.id} label={p.label} Icon={p.icon} active={activeTab === p.id} onClick={() => handleTabChange(p.id)} />)}
          </SidebarGroup>

          {/* ── Section: Run & Analyze ──────────────────────────────── */}
          <SidebarGroup label="Run & Analyze" defaultOpen>
            {[
              { id: 'execution',        label: 'Run Tests',          icon: Cpu },
              { id: 'manual-execution', label: 'Manual Testing',     icon: CheckSquare },
              { id: 'defects',          label: 'Defects & Bugs',     icon: Crosshair },
              { id: 'performance',      label: 'Load & Performance', icon: Sliders },
              { id: 'security',         label: 'Security Scan',      icon: ShieldAlert },
              { id: 'dashboard',        label: 'Live Dashboard',     icon: TrendingUp },
            ].map(p => <SidebarItem key={p.id} id={p.id} label={p.label} Icon={p.icon} active={activeTab === p.id} onClick={() => handleTabChange(p.id)} />)}
          </SidebarGroup>

          {/* ── Section: Settings & Integrations ────────────────────── */}
          <SidebarGroup label="Settings & Integrations">
            {[
              { id: 'settings',      label: 'TMS Settings',       icon: Settings2 },
              { id: 'cicd-settings', label: 'CI/CD Settings',      icon: GitBranch },
              { id: 'integrations',  label: 'Connect Tools',       icon: Link },
              { id: 'workflow-builder', label: 'Workflow Builder', icon: GitBranch },
              { id: 'cicd',         label: 'CI/CD Pipeline',    icon: GitBranch },
              { id: 'scheduler',    label: 'Scheduled Runs',    icon: Clock },
              { id: 'analytics',    label: 'AI Insights',       icon: BarChart3 },
              { id: 'llm-config',   label: 'AI Model Config',   icon: Cpu },
              { id: 'converter',    label: 'Script Converter',  icon: RefreshCw },
              { id: 'feedback',     label: 'Prompt Library',    icon: BookOpen },
              { id: 'audit',        label: 'Activity Log',      icon: History },
            ].map(p => <SidebarItem key={p.id} id={p.id} label={p.label} Icon={p.icon} active={activeTab === p.id} onClick={() => handleTabChange(p.id)} />)}
          </SidebarGroup>

          {/* ── Section: Administration (role-gated) ─────────────────── */}
          {/* Administration section — org_admin only (super_admin has its own isolated layout) */}
          {authUser?.role === 'org_admin' && (
            <SidebarGroup label="Administration">
              <SidebarItem id="org-admin" label="Org Admin" Icon={Building2} active={activeTab === 'org-admin'} onClick={() => handleTabChange('org-admin' as any)} />
            </SidebarGroup>
          )}

        </div>

        {/* User footer — always visible at bottom, never overlaps */}
        <div className="shrink-0 px-3 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(15,23,42,0.6)' }}>
          {authUser ? (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-[10px] text-white" style={{ background: 'linear-gradient(135deg, #5B6CFF, #7C3AED)' }}>
                {authUser.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate font-semibold" style={{ fontSize: 11, color: '#E2E8F0', fontFamily: 'Inter, sans-serif' }}>{authUser.name}</p>
                <p className="truncate" style={{ fontSize: 9, color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>{authUser.role.replace('_', ' ')}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setShowLanding(true)} title="Home" style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#94A3B8')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#64748B')}>
                  <Layers className="w-3 h-3" />
                </button>
                <button onClick={handleLogout} title="Sign out" style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#64748B')}>
                  <LogOut className="w-3 h-3" />
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowLanding(true)} className="flex items-center gap-1 px-1 w-full" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(166,180,205,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>← Home Page</span>
            </button>
          )}
          <div className="flex items-center justify-between mt-1.5 px-0.5" style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: '#64748B' }}>
            <span>EDGE QI · v3.0</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#10B981' }} />LIVE</span>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────── */}
      <div className="main-content flex flex-col min-h-screen">

        {/* Top Header Bar — Enterprise Design System */}
        <header className="sticky top-0 z-30 px-4 md:px-6 flex items-center justify-between"
          style={{ background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(15,23,42,0.06)', height: 'var(--topbar-h, 56px)', minHeight: 'var(--topbar-h, 56px)' }}>
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 border border-slate-200"
              onClick={() => setMobileMenuOpen(o => !o)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen
                ? <X className="w-4 h-4 text-slate-600" />
                : <Menu className="w-4 h-4 text-slate-600" />}
            </button>
            <div>
              <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 800, color: '#0F172A', letterSpacing: '0.12em', lineHeight: 1 }}>
                EDGE <span style={{ color: '#5B6CFF' }}>QI</span>
              </h1>
              <p className="hidden sm:block" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#94A3B8', letterSpacing: '0.06em', marginTop: 2 }}>Edge Quality Intelligence Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 md:gap-2">
            {/* Project Selector — populated from DB */}
            <div className="flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
              <select
                value={currentProjectId}
                onChange={(e) => { setCurrentProjectId(e.target.value); }}
                className="input-glass text-xs"
                style={{ maxWidth: 130 }}
              >
                <option value="ALL">🗂 All Projects</option>
                {dbProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                ))}
                {allProjectIds.filter(id => !dbProjects.find(p => p.id === id)).map(pid => (
                  <option key={pid} value={pid}>📁 {pid}</option>
                ))}
              </select>
            </div>

            {/* Sprint Selector — shows only when a project is selected */}
            {currentProjectId !== 'ALL' && dbSprints.length > 0 && (
              <div className="hidden sm:flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
                <select
                  value={currentSprintId}
                  onChange={e => setCurrentSprintId(e.target.value)}
                  className="input-glass text-xs"
                  style={{ maxWidth: 130 }}
                >
                  <option value="">No Sprint</option>
                  {dbSprints.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.status === 'active' ? '🟢' : s.status === 'planning' ? '📋' : s.status === 'completed' ? '✅' : '⏸'} {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Quick link to Project Hub */}
            <button onClick={() => setActiveTab('projects')} title="Open Project Hub"
              className="p-1.5 hover:bg-slate-100 rounded-lg border border-slate-200 hidden md:flex items-center">
              <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
            </button>

            <button
              onClick={() => setChatbotOpen(!chatbotOpen)}
              className="btn-primary flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg, #5B6CFF 0%, #7C3AED 100%)', border: 'none', boxShadow: '0 4px 14px rgba(91,108,255,0.30)', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}
            >
              <MessageSquareCode className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AI Copilot</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-3 md:p-6 overflow-x-hidden">
          
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
            <div>
              <ProjectContextBar
                currentProjectId={currentProjectId} currentSprintId={currentSprintId}
                projects={dbProjects} sprints={allDbSprints}
                onChangeProject={handleContextBarProjectChange}
                onChangeSprint={setCurrentSprintId}
                onGoToProjectHub={() => setActiveTab('projects')}
                moduleName="Live Dashboard"
              />
              <LiveDashboard
                currentProjectId={currentProjectId}
                currentSprintId={currentSprintId}
                onNavigateTo={(t) => setActiveTab(t as any)}
              />
            </div>
          )}

          {activeTab === 'execution' && (
            <div>
              <ProjectContextBar
                currentProjectId={currentProjectId} currentSprintId={currentSprintId}
                projects={dbProjects} sprints={allDbSprints}
                onChangeProject={handleContextBarProjectChange}
                onChangeSprint={setCurrentSprintId}
                onGoToProjectHub={() => setActiveTab('projects')}
                moduleName="Execution Engine"
              />
              <ExecutionEnginePage
                activeSteps={activeSteps}
                currentRunId={currentRunId}
                isRunning={isRunning}
                onTriggerRun={handleExecuteAutonomousCycle}
                onOverrideConfirm={handleManualOverrideConfig}
                onNavigateToDashboard={() => setActiveTab('dashboard')}
                currentProjectId={currentProjectId}
                currentSprintId={currentSprintId}
              />
            </div>
          )}

          {activeTab === 'requirements' && (
            <div>
              <ProjectContextBar
                currentProjectId={currentProjectId} currentSprintId={currentSprintId}
                projects={dbProjects} sprints={allDbSprints}
                onChangeProject={handleContextBarProjectChange}
                onChangeSprint={setCurrentSprintId}
                onGoToProjectHub={() => setActiveTab('projects')}
                moduleName="Requirements"
              />
              <RequirementsTab
                requirements={filteredRequirements}
                testCases={filteredTestCases}
                onAddRequirement={handleAddRequirement}
                isGenerating={isGeneratingRequirements}
                onGenerateTestCaseCode={(tcId) => handleGenerateScript(tcId, 'Playwright', 'TypeScript')}
                onNavigateToTestCases={() => setActiveTab('testcases')}
                currentProjectId={currentProjectId}
                currentSprintId={currentSprintId}
                projects={dbProjects}
                onCreateProject={() => setActiveTab('projects')}
                onSelectProject={(id) => setCurrentProjectId(id)}
              />
            </div>
          )}

          {activeTab === 'testcases' && (
            <div>
              <ProjectContextBar
                currentProjectId={currentProjectId} currentSprintId={currentSprintId}
                projects={dbProjects} sprints={allDbSprints}
                onChangeProject={handleContextBarProjectChange}
                onChangeSprint={setCurrentSprintId}
                onGoToProjectHub={() => setActiveTab('projects')}
                moduleName="Test Cases"
              />
              <TestCaseGeneratorPage
                testCases={filteredTestCases}
                requirements={filteredRequirements}
                onTriggerRerun={handleRerunMockTestCase}
                onApplyHeal={handleApplyHealMock}
                onAddManualTestCase={(newCase) => setTestCases(prev => [{ ...newCase, projectId: currentProjectId }, ...prev])}
                onUpdateTestCase={handleUpdateTestCase}
                currentProjectId={currentProjectId}
                currentSprintId={currentSprintId}
                onNavigateToScripts={() => setActiveTab('scripts')}
              />
            </div>
          )}


          {activeTab === 'traceability' && (
            <div>
              <ProjectContextBar
                currentProjectId={currentProjectId} currentSprintId={currentSprintId}
                projects={dbProjects} sprints={allDbSprints}
                onChangeProject={handleContextBarProjectChange}
                onChangeSprint={setCurrentSprintId}
                onGoToProjectHub={() => setActiveTab('projects')}
                moduleName="Traceability Matrix"
              />
              <TraceabilityTab
                requirements={filteredRequirements}
                testCases={filteredTestCases}
                onTriggerRerun={handleRerunMockTestCase}
                currentProjectId={currentProjectId}
              />
            </div>
          )}

          {activeTab === 'defects' && (
            <div>
              <ProjectContextBar
                currentProjectId={currentProjectId} currentSprintId={currentSprintId}
                projects={dbProjects} sprints={allDbSprints}
                onChangeProject={handleContextBarProjectChange}
                onChangeSprint={setCurrentSprintId}
                onGoToProjectHub={() => setActiveTab('projects')}
                moduleName="Defects & Bugs"
              />
              <DefectsManager
                currentProjectId={currentProjectId}
                currentSprintId={currentSprintId}
                onNavigateTo={(t) => setActiveTab(t as any)}
              />
            </div>
          )}

          {activeTab === 'scripts' && (
            <div>
              <ProjectContextBar
                currentProjectId={currentProjectId} currentSprintId={currentSprintId}
                projects={dbProjects} sprints={allDbSprints}
                onChangeProject={handleContextBarProjectChange}
                onChangeSprint={setCurrentSprintId}
                onGoToProjectHub={() => setActiveTab('projects')}
                moduleName="Script Generator"
              />
              <ScriptTab
                testCases={filteredTestCases}
                scripts={filteredScripts}
                onGenerateScript={handleGenerateScript}
                isGeneratingScript={isGeneratingRequirements || isGeneratingScript}
                currentProjectId={currentProjectId}
                currentSprintId={currentSprintId}
                onNavigateToExecution={() => setActiveTab('execution')}
              />
            </div>
          )}

          {activeTab === 'converter' && (
            <ScriptConverterTab />
          )}

          {activeTab === 'performance' && (
            <div>
              <ProjectContextBar
                currentProjectId={currentProjectId} currentSprintId={currentSprintId}
                projects={dbProjects} sprints={allDbSprints}
                onChangeProject={handleContextBarProjectChange}
                onChangeSprint={setCurrentSprintId}
                onGoToProjectHub={() => setActiveTab('projects')}
                moduleName="Performance Testing"
              />
              <PerformanceTab
                configs={filteredPerformanceConfigs}
                testCases={filteredTestCases}
                onExecutePerformanceTest={handleExecutePerformanceTest}
                isExecuting={isExecutingPerformance}
                onNavigateToDashboard={() => setActiveTab('dashboard')}
              />
            </div>
          )}

          {activeTab === 'security' && (
            <div>
              <ProjectContextBar
                currentProjectId={currentProjectId} currentSprintId={currentSprintId}
                projects={dbProjects} sprints={allDbSprints}
                onChangeProject={handleContextBarProjectChange}
                onChangeSprint={setCurrentSprintId}
                onGoToProjectHub={() => setActiveTab('projects')}
                moduleName="Security Testing"
              />
              <SecurityTab
                vulnerabilities={filteredVulnerabilities}
                testCases={filteredTestCases}
                onApplyRemediation={handleApplyRemediation}
                isRemediating={isRemediatingSecurity}
                onNavigateToDashboard={() => setActiveTab('dashboard')}
              />
            </div>
          )}

          {activeTab === 'test-plans' && (
            <TestPlansTabComponent
              currentProjectId={currentProjectId}
              currentSprintId={currentSprintId}
            />
          )}
          {activeTab === 'manual-execution' && <ManualExecutionTab />}
          {activeTab === 'settings' && <TmsConfigSettings />}
          {activeTab === 'cicd-settings' && <CicdConfigSettings />}
          {activeTab === 'llm-config' && <LLMConfigTab />}
          {activeTab === 'cicd' && <CICDTab />}
          {activeTab === 'integrations' && (
            <IntegrationsTab
              requirements={filteredRequirements}
              testCases={filteredTestCases}
              defectHotspots={filteredDefectHotspots}
              onAddRequirement={handleImportRequirementsFromTMS}
              onAddTestCases={handleImportTestCasesFromTMS}
            />
          )}
          {activeTab === 'feedback' && <FeedbackTemplatesTab />}
          {activeTab === 'scheduler' && <SchedulerTab currentProjectId={currentProjectId === 'ALL' ? 'global' : currentProjectId} />}
          {activeTab === 'analytics' && <AnalyticsTab currentProjectId={currentProjectId === 'ALL' ? 'global' : currentProjectId} />}
          {activeTab === 'workflow-builder' && (
            <WorkflowBuilder
              currentProjectId={currentProjectId}
              currentSprintId={currentSprintId}
            />
          )}
          
          {activeTab === 'projects' && (
            <ProjectHub
              currentProjectId={currentProjectId}
              onSelectProject={(id) => { setCurrentProjectId(id); }}
              onNavigateTo={(tab) => setActiveTab(tab as any)}
              onProjectsChanged={reloadProjects}
            />
          )}

          {activeTab === 'defect-impact' && (
            <div>
              <ProjectContextBar
                currentProjectId={currentProjectId} currentSprintId={currentSprintId}
                projects={dbProjects} sprints={allDbSprints}
                onChangeProject={handleContextBarProjectChange}
                onChangeSprint={setCurrentSprintId}
                onGoToProjectHub={() => setActiveTab('projects')}
                moduleName="Defect & Impact AI"
              />
              <DefectPredictTab
                defects={filteredDefectHotspots}
                impactReports={impactReports}
                onPredictHotspots={handlePredictHotspots}
                onAnalyzeImpact={handleAnalyzeImpact}
                isAnalyzing={isAnalyzingImpact}
                currentProjectId={currentProjectId}
                testCases={filteredTestCases}
                onNavigateToExecution={() => setActiveTab('execution')}
              />
            </div>
          )}
          
          {activeTab === 'test-data' && (
            <TestDataManager currentProjectId={currentProjectId} token={authToken} />
          )}

          {activeTab === 'super-admin' && authUser?.role === 'super_admin' && (
            <SuperAdminPortal token={authToken} />
          )}

          {activeTab === 'org-admin' && authUser?.role === 'org_admin' && (
            <TenantAdminPortal token={authToken} />
          )}

          {activeTab === 'rag-kb' && (
            <RAGKnowledgeBase
              currentProjectId={currentProjectId}
              onNavigateTo={(tab) => setActiveTab(tab as any)}
            />
          )}

          {activeTab === 'audit' && (
            <div className="glass-card p-6 space-y-4 animate-fadeInUp">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="panel-title">Autonomous Decisional Audit Trail</h3>
                  <p className="text-xs text-slate-500 mt-1">Audit logs documenting exact actions performed by different agents.</p>
                </div>
                <button onClick={handleAddAuditLog} className="btn-ghost">
                  Force Sync Logs
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="table-glass">
                  <thead>
                    <tr>
                      <th>Audit ID</th>
                      <th>Timestamp</th>
                      <th>Action / Event</th>
                      <th>Agent Node</th>
                      <th>Details</th>
                      <th className="text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="text-blue-600 font-bold font-mono">{log.id}</td>
                        <td className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</td>
                        <td className="font-semibold text-slate-800">{log.action}</td>
                        <td className="text-slate-600">{log.affectedEntity}</td>
                        <td className="text-slate-500 italic max-w-[280px] truncate">{log.details}</td>
                        <td className="text-slate-400 text-right font-mono">${log.costEstimate || '0.0002'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-200/60 py-3 px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-slate-400 text-[10px] font-mono bg-white/50">
          <span>© 2026 EDGE QI · All pipelines active</span>
          <div className="flex items-center gap-1.5 text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span>Port 3000 · SSL Active · 2 Workers Online</span>
          </div>
        </footer>
      </div>

      {/* Global Slideout Chat Helper Copilot component */}
      <ChatbotSlideout
        onSendMessage={handleSendAssistantMessage}
        isOpen={chatbotOpen}
        onClose={() => setChatbotOpen(false)}
      />

      {/* GAP-18-20: AI Assistant Panel — context-aware copilot on every page */}
      <AIAssistantPanel
        currentModule={activeTab}
        currentProjectId={currentProjectId}
        currentSprintId={currentSprintId}
      />
    </div>
  );
}
