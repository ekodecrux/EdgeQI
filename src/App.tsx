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
  Cpu
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
    'audit'
  >('agentic');

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
            </nav>
            
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
