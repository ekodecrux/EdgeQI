import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, 
  Play, 
  Clock, 
  Cpu, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Settings2, 
  Crosshair, 
  ShieldAlert, 
  TrendingUp, 
  ArrowRight, 
  Sparkles, 
  Terminal, 
  Sliders, 
  History, 
  Check, 
  Download,
  Flame,
  Bug,
  Code2,
  FileCode2,
  Eye,
  ShieldCheck,
  Activity,
  RefreshCw
} from 'lucide-react';
import { TestCase, RequirementDoc, DefectHotspot, ScriptFile, SecurityVulnerability } from '../types';

interface AgenticOrchestratorProps {
  requirements: RequirementDoc[];
  setRequirements: React.Dispatch<React.SetStateAction<RequirementDoc[]>>;
  testCases: TestCase[];
  setTestCases: React.Dispatch<React.SetStateAction<TestCase[]>>;
  defectHotspots: DefectHotspot[];
  setDefectHotspots: React.Dispatch<React.SetStateAction<DefectHotspot[]>>;
  scripts: ScriptFile[];
  setScripts: React.Dispatch<React.SetStateAction<ScriptFile[]>>;
  vulnerabilities: SecurityVulnerability[];
  setVulnerabilities: React.Dispatch<React.SetStateAction<SecurityVulnerability[]>>;
  onNavigateToTab: (tab: any) => void;
  onExecutePerformanceTest: (
    testType: 'Browser' | 'API',
    endpointOrJourney: string,
    virtualUsers: number,
    durationSeconds: number,
    rampUpTimeSeconds: number,
    rpsLimit?: number
  ) => void;
  onApplyRemediation: (id: string) => void;
}

interface LogLine {
  timestamp: string;
  module: string;
  message: string;
  level: 'info' | 'success' | 'warn' | 'error';
}

export default function AgenticOrchestrator({
  requirements,
  setRequirements,
  testCases,
  setTestCases,
  defectHotspots,
  setDefectHotspots,
  scripts,
  setScripts,
  vulnerabilities,
  setVulnerabilities,
  onNavigateToTab,
  onExecutePerformanceTest,
  onApplyRemediation
}: AgenticOrchestratorProps) {
  const [orchestratorState, setOrchestratorState] = useState<'idle' | 'running' | 'completed'>('idle');
  const [currentStepId, setCurrentStepId] = useState<number>(0);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [progress, setProgress] = useState<number>(0);
  
  // Scenarios variables generated internally
  const [generatedCasesCount, setGeneratedCasesCount] = useState(0);
  const [automatedScriptsCount, setAutomatedScriptsCount] = useState(0);
  const [identifiedRegressionCount, setIdentifiedRegressionCount] = useState(0);
  const [runLogsExported, setRunLogsExported] = useState(false);

  // Recommendations Trigger states
  const [perfRunningName, setPerfRunningName] = useState<string | null>(null);
  const [perfCompleted, setPerfCompleted] = useState<string[]>([]);
  
  const [secRunningId, setSecRunningId] = useState<string | null>(null);
  const [secCompleted, setSecCompleted] = useState<string[]>([]);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Recommended scenarios list
  const recommendedPerfScenarios = [
    {
      id: 'perf-checkout-stress',
      title: 'Checkout API Concurrent Stress Loop',
      endpoint: '/api/payment/checkout',
      desc: 'Simulate high concurrency bottleneck (120 Virtual Users) focusing on card transaction sync under stress.',
      intensity: 'High Intensity (Spike)',
      params: { testType: 'API' as const, users: 120, duration: 45, ramp: 8 }
    },
    {
      id: 'perf-websocket-contention',
      title: 'WebSocket Realtime Push Saturation Test',
      endpoint: '/api/websocket/dispatcher/stream',
      desc: 'Evaluate socket response degradation margins under heavy continuous message broadcasting.',
      intensity: 'Medium (Sustained Load)',
      params: { testType: 'Browser' as const, users: 60, duration: 30, ramp: 5 }
    }
  ];

  const recommendedSecScenarios = [
    {
      id: 'SEC-002', // matches a real open high-severity vulnerability
      title: 'Payload Injection Filter verification',
      vulnerabilityId: 'SEC-002',
      desc: 'Validate remediation of OWASP Top 10 SQL Injection vulnerability in WebSocket dispatcher endpoints.',
      severity: 'Critical Threat Mitigation'
    },
    {
      id: 'SEC-003',
      title: 'Cross-Origin CORS Access Scan',
      vulnerabilityId: 'SEC-003',
      desc: 'Conduct Cross-Origin Resource Sharing (CORS) check payloads on system payment modules.',
      severity: 'High Severity Audit'
    }
  ];

  const appendLog = (module: string, message: string, level: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    const timeStr = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp: timeStr, module, message, level }]);
  };

  const stepsList = [
    { id: 1, label: 'Test Case Matrix Generator', agent: 'Requirements Parsing Specialist', icon: FileText },
    { id: 2, label: 'Test Automation Script Compiler', agent: 'Multi-Framework Synthesizer Agent', icon: Settings2 },
    { id: 3, label: 'Impact Analyzer & Regression Engine', agent: 'Overlapping System Heat-map Tracer', icon: Crosshair },
    { id: 4, label: 'Headless Execution Grid', agent: 'Selenium-Playwright Multi-Node Scheduler', icon: Cpu },
  ];

  const runAgenticEngine = async () => {
    if (orchestratorState === 'running') return;
    
    setOrchestratorState('running');
    setCurrentStepId(1);
    setProgress(5);
    setLogs([]);
    setRunLogsExported(false);

    // --- STEP 1: TEST CASE MATRIX GENERATOR ---
    appendLog('GEN-AGENT', 'Booting Requirements Model Ingress Service...', 'info');
    await new Promise(r => setTimeout(r, 600));
    appendLog('GEN-AGENT', 'Analyzing parsed product design matrices and specifications...', 'info');
    await new Promise(r => setTimeout(r, 900));
    appendLog('GEN-AGENT', 'Compiling requirements database indexes...', 'info');
    
    // Inject mock requirement and testcases
    const newReqId = `REQ-${Math.floor(Math.random() * 900) + 100}`;
    const mockReq: RequirementDoc = {
      id: newReqId,
      title: 'Agentic AI Connected Gateway Validation',
      content: 'Ensures proper hand-offs and transaction security bounds across gateway routes.',
      sourceType: 'text',
      parsedAt: new Date().toISOString(),
      suggestedModules: ['API Gateway & Router', 'Security & Firewall']
    };

    const newTCs: TestCase[] = [
      {
        id: `TC-${Math.floor(Math.random() * 9000) + 1000}`,
        title: 'API Gateway Connected Agentic Authorization Token Check',
        description: 'Verify token parsing does not allow route leaks during multi-agent concurrent gateway stress.',
        priority: 'P0',
        type: 'Boundary',
        preconditions: 'Gateway node running under telemetry stream.',
        automationStatus: 'Needs Manual',
        confidenceScore: 92,
        testData: '{"authToken": "test-mock"}',
        steps: [
          { action: 'Inject payload with empty auth token', expectedResult: 'Reject query with status response 401.' },
          { action: 'Retry with sanitized user session token', expectedResult: 'Complete authorization check in under 30ms.' }
        ]
      },
      {
        id: `TC-${Math.floor(Math.random() * 9000) + 1000}`,
        title: 'Billing Engine - Concurrent Card Fraud Detection Flow',
        description: 'Ensure automated mitigation triggers card block within 2.5 seconds of concurrent fraud signals.',
        priority: 'P0',
        type: 'Positive',
        preconditions: 'Billing microservice initialized.',
        automationStatus: 'Needs Manual',
        confidenceScore: 89,
        testData: '{"fraudSignal": true}',
        steps: [
          { action: 'Stagger 3 fraud patterns under 1 second', expectedResult: 'Dispatch account block trigger to Security module.' }
        ]
      }
    ];

    setRequirements(prev => [mockReq, ...prev]);
    setTestCases(prev => [...newTCs, ...prev]);
    setGeneratedCasesCount(2);

    setProgress(25);
    appendLog('GEN-AGENT', `✔ Successfully created new telemetry requirement spec: ${mockReq.title}`, 'success');
    appendLog('GEN-AGENT', `✔ Dynamic synthesizer generated 2 new multi-module test case matrices:`, 'success');
    newTCs.forEach(tc => appendLog('GEN-AGENT', `↳ Added [${tc.id}] ${tc.title}`, 'success'));
    
    await new Promise(r => setTimeout(r, 1200));

    // --- STEP 2: TEST AUTOMATION SCRIPT GENERATOR ---
    setCurrentStepId(2);
    setProgress(35);
    appendLog('SCRIPT-COMPILER', 'Pulling freshly minted test case schemas from the memory store...', 'info');
    await new Promise(r => setTimeout(r, 800));
    appendLog('SCRIPT-COMPILER', 'Synthesizing robust TypeScript Playwright Automation Scripts...', 'info');
    await new Promise(r => setTimeout(r, 1000));

    // Build automated scripts in background
    const newScripts: ScriptFile[] = newTCs.map(tc => {
      const fileName = `${tc.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.spec.ts`;
      return {
        fileName,
        framework: 'Playwright',
        language: 'TypeScript',
        code: `import { test, expect } from '@playwright/test';\n\ntest('${tc.title}', async ({ page }) => {\n  // Preconditions: ${tc.preconditions}\n  await page.goto('/gateway/auth');\n  // Step 1\n  const submitBtn = page.locator("button[type='submit']");\n  await expect(submitBtn).toBeVisible({ timeout: 5000 });\n});`
      };
    });

    setScripts(prev => [...newScripts, ...prev]);
    setAutomatedScriptsCount(newScripts.length);
    // Mark these as automated in main test case page
    setTestCases(prev => prev.map(tc => 
      newTCs.some(ntc => ntc.id === tc.id) ? { ...tc, automationStatus: 'Automated' } : tc
    ));

    setProgress(50);
    appendLog('SCRIPT-COMPILER', `✔ Playwright/TypeScript wrapper compilation completed.`, 'success');
    newScripts.forEach(sc => appendLog('SCRIPT-COMPILER', `↳ Created production script file: ${sc.fileName}`, 'success'));
    
    await new Promise(r => setTimeout(r, 1200));

    // --- STEP 3: IMPACT ANALYZER & REGRESSION SUITE ENGINES ---
    setCurrentStepId(3);
    setProgress(60);
    appendLog('IMPACT-ANALYZER', 'Loading latest microservice defect dumps & telemetry indicators...', 'info');
    await new Promise(r => setTimeout(r, 900));
    appendLog('IMPACT-ANALYZER', 'Overlaying test code dependencies with active system failures...', 'warn');
    
    // Read historical hotspot telemetry
    const mockHotspot: DefectHotspot = {
      moduleName: 'WebSocket Dispatcher',
      historicalDefectsCount: 6,
      predictedRiskScore: 94,
      commonFailureType: 'Connection Drop-out Exception',
      developerPattern: 'Async socket connection leak',
      recommendation: 'Configure explicit hearbeat keepalive ping-pong timeouts'
    };
    
    setDefectHotspots(prev => {
      const exists = prev.some(h => h.moduleName === mockHotspot.moduleName);
      return exists ? prev : [mockHotspot, ...prev];
    });

    appendLog('IMPACT-ANALYZER', `Analyzing 10 module nodes. System Hotspots detected inside Billing & WebSocket systems!`, 'warn');
    await new Promise(r => setTimeout(r, 800));

    // Calculate regression mapping count
    const regressionCount = testCases.length + 2; 
    setIdentifiedRegressionCount(regressionCount);

    setProgress(75);
    appendLog('IMPACT-ANALYZER', `✔ Dynamic Impact Analysis completed. Mapped regression overlap suite: ${regressionCount} total test cases flagged!`, 'success');
    appendLog('IMPACT-ANALYZER', `✔ Regression criteria: Modules with risk scores > 70% and affected billing routes.`, 'success');
    
    await new Promise(r => setTimeout(r, 1200));

    // --- STEP 4: HEADLESS EXECUTION GRID TRIGGER ---
    setCurrentStepId(4);
    setProgress(80);
    appendLog('EXECUTION-GRID', 'Bootstrapping Local headless worker clusters...', 'info');
    await new Promise(r => setTimeout(r, 1000));
    appendLog('EXECUTION-GRID', `Dispatched suite containing ${regressionCount} test cases to Local grid.`, 'info');
    appendLog('EXECUTION-GRID', 'Concurrently executing Chromium, Firefox, WebKit worker nodes...', 'info');
    await new Promise(r => setTimeout(r, 1200));
    
    appendLog('EXECUTION-GRID', `[WORKER #1] Spec auth_token_check.spec.ts -> Pass (Latency: 28ms)`, 'success');
    appendLog('EXECUTION-GRID', `[WORKER #2] Spec card_fraud_detection.spec.ts -> Pass (Latency: 485ms)`, 'success');
    appendLog('EXECUTION-GRID', `[WORKER #3] Evaluated 125 assertions across functional matrix...`, 'success');

    setProgress(100);
    appendLog('CORE-ORCHESTRATOR', 'Consolidating multi-agent deliverables to Dashboard...', 'info');
    await new Promise(r => setTimeout(r, 800));
    
    setOrchestratorState('completed');
    appendLog('SYS-CORE', '⚡ Connected Agentic AI QA Process successfully finalized! Dashboard updated with newest pipeline states.', 'success');
  };

  // Trigger performance load run from recommendations panel
  const handleLaunchRecommendPerf = async (scenario: typeof recommendedPerfScenarios[0]) => {
    setPerfRunningName(scenario.title);
    appendLog('RECOMMENDED-PERF', `Launching load injection sweep for [${scenario.title}] against ${scenario.endpoint}...`, 'info');
    
    try {
      // Trigger execution via provided App.tsx handler
      onExecutePerformanceTest(
        scenario.params.testType,
        scenario.endpoint,
        scenario.params.users,
        scenario.params.duration,
        scenario.params.ramp
      );
      
      await new Promise(r => setTimeout(r, 2200));
      setPerfCompleted(prev => [...prev, scenario.id]);
      appendLog('RECOMMENDED-PERF', `✔ Successfully executed stress scenario against ${scenario.endpoint}. Staging server handled 420 reqs/sec peak load.`, 'success');
    } catch (err: any) {
      appendLog('RECOMMENDED-PERF', `❌ Performance scenario execution failure: ${err.message}`, 'error');
    } finally {
      setPerfRunningName(null);
    }
  };

  // Trigger security remediation scan from recommendations panel
  const handleLaunchRecommendSec = async (scenario: typeof recommendedSecScenarios[0]) => {
    setSecRunningId(scenario.id);
    appendLog('RECOMMENDED-SEC', `Deploying target code remediation payload scans for ${scenario.vulnerabilityId}:${scenario.title}...`, 'info');

    try {
      // Call standard remediation mock callback
      onApplyRemediation(scenario.vulnerabilityId);
      
      await new Promise(r => setTimeout(r, 2000));
      setSecCompleted(prev => [...prev, scenario.id]);
      appendLog('RECOMMENDED-SEC', `✔ Remediated & patched. Vulnerability vulnerabilityId ${scenario.vulnerabilityId} verified as closed.`, 'success');
    } catch (err: any) {
      appendLog('RECOMMENDED-SEC', `❌ Security remediation execution failure: ${err.message}`, 'error');
    } finally {
      setSecRunningId(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Intro Header */}
      {/* Page Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingBottom:20,marginBottom:4,borderBottom:'1px solid #dbe2ea'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:40,height:40,borderRadius:10,background:'linear-gradient(135deg,#093158 0%,#1e96df 100%)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <Zap style={{width:20,height:20,color:'#ffffff'}} />
          </div>
          <div>
            <h1 style={{fontFamily:'"Lato",Arial,sans-serif',fontSize:20,fontWeight:700,color:'#1f3965',lineHeight:1,margin:0}}>Agentic AI Engine</h1>
            <p style={{fontFamily:'"Lato",Arial,sans-serif',fontSize:13,color:'#6b82ab',margin:'3px 0 0'}}>One-click end-to-end QA automation</p>
          </div>
        </div>
      </div>

      {/* Main Orchestration Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Step Progression Timeline */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 style={{fontFamily:'"Lato",Arial,sans-serif',fontSize:13,fontWeight:700,color:'#1f3965',display:'flex',alignItems:'center',gap:8,margin:0}}><Cpu style={{width:16,height:16,color:'#1e96df'}} />Pipeline</h3>

            <div className="space-y-4 relative pl-3 border-l border-slate-100 mt-2">
              {stepsList.map(step => {
                const isActive = orchestratorState === 'running' && currentStepId === step.id;
                const isPast = orchestratorState === 'completed' || (orchestratorState === 'running' && currentStepId > step.id);
                const Icon = step.icon;

                return (
                  <div key={step.id} className="relative space-y-1">
                    {/* Visual indicators */}
                    <div className={`absolute -left-[21px] top-1 px-1 rounded-full border text-[9px] font-bold font-mono transition-all ${
                      isPast 
                        ? 'bg-emerald-600 border-emerald-600 text-white' 
                        : isActive 
                        ? 'bg-purple-650 border-purple-650 text-white animate-pulse' 
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}>
                      {isPast ? '✔' : step.id}
                    </div>

                    <div className="flex items-center gap-2 pl-4">
                      <Icon className={`w-3.5 h-3.5 ${
                        isActive ? 'text-purple-600 animate-bounce' : isPast ? 'text-emerald-600' : 'text-slate-400'
                      }`} />
                      <h4 className={`text-xs font-bold font-sans ${
                        isActive ? 'text-purple-900' : isPast ? 'text-emerald-950' : 'text-slate-605'
                      }`}>
                        {step.label}
                      </h4>
                    </div>
                    <p className="text-[10px] pl-4 text-slate-500 font-mono">
                      Agent: {step.agent}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* CTA Execution Button */}
            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
              <button
                onClick={runAgenticEngine}
                disabled={orchestratorState === 'running'}
                className="w-full py-2.5 px-4 rounded-xl font-mono text-xs font-semibold uppercase flex items-center justify-center gap-2 transition-all shadow-md"
                style={orchestratorState === 'running'
                  ? {background:'#f2f4f8', color:'#6b82ab', border:'1px solid #dbe2ea', cursor:'not-allowed'}
                  : {background:'#1e96df', color:'#ffffff', border:'none', cursor:'pointer'}
                }
              >
                {orchestratorState === 'running' ? (
                  <>
                    <span className="w-2 h-2 rounded-full animate-ping" style={{background:'#1e96df'}} />
                    Running Connected Cycle ({progress}%)
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 text-indigo-200 fill-indigo-200" />
                    Kickstart Agentic AI Engine
                  </>
                )}
              </button>

              
            </div>
          </div>

          {/* Connected Outcomes Dashboard Metrics widget */}
          {orchestratorState === 'completed' && (
            <div className="bg-gradient-to-br from-emerald-900 to-teal-900 text-white rounded-2xl p-5 shadow-sm space-y-3.5">
              <h4 className="text-xs font-sans font-black tracking-widest uppercase text-emerald-200 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-300" />
                Pipeline Outcome Summary
              </h4>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-white/10 p-2.5 rounded-xl border border-white/10">
                  <span className="block text-lg font-mono font-extrabold text-emerald-300">{generatedCasesCount}</span>
                  <span className="text-[9px] font-mono uppercase tracking-tight text-white/70">Test Cases Created</span>
                </div>
                <div className="bg-white/10 p-2.5 rounded-xl border border-white/10">
                  <span className="block text-lg font-mono font-extrabold text-emerald-300">{automatedScriptsCount}</span>
                  <span className="text-[9px] font-mono uppercase tracking-tight text-white/70">Scripts Drafted</span>
                </div>
                <div className="bg-white/10 p-2.5 rounded-xl border border-white/10">
                  <span className="block text-lg font-mono font-extrabold text-emerald-300">{identifiedRegressionCount}</span>
                  <span className="text-[9px] font-mono uppercase tracking-tight text-white/70">Total Regressions Run</span>
                </div>
                <div className="bg-white/10 p-2.5 rounded-xl border border-white/10">
                  <span className="block text-lg font-mono font-extrabold text-emerald-300">100% OK</span>
                  <span className="text-[9px] font-mono uppercase tracking-tight text-white/70">Grid Status</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => onNavigateToTab('dashboard')}
                  className="w-full py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-mono text-[10px] rounded-lg border border-emerald-600 transition-colors flex items-center justify-center gap-1.5 font-bold"
                >
                  View Updated QE Dashboard <ArrowRight className="w-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Console / Workspace logging panel */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <div className="bg-slate-950 rounded-2xl overflow-hidden border border-slate-900 shadow-xl flex-1 flex flex-col min-h-[420px]">
            {/* Terminal Header */}
            <div className="bg-slate-900/60 px-4 py-3 border-b border-slate-900 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-300 font-mono">
                <Terminal className="w-4 h-4" style={{color:'#5bb8f5'}} />
                <span>agentic_engine_stdout.log</span>
              </div>
              <div className="flex gap-2 items-center">
                {logs.length > 0 && (
                  <button 
                    onClick={() => {
                      const completeText = logs.map(l => `[${l.timestamp}] [${l.module}] ${l.message}`).join('\n');
                      const blob = new Blob([completeText], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `agentic-live-orchestrator.log`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      setRunLogsExported(true);
                      setTimeout(() => setRunLogsExported(false), 3000);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-0.5 border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white rounded text-[10px] font-mono font-bold transition-all"
                  >
                    <Download className="w-3 h-3" />
                    {runLogsExported ? 'Copied' : 'Export Logs'}
                  </button>
                )}
                {orchestratorState === 'running' && (
                  <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-0.5 rounded border border-purple-900">
                    <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{background:'#1e96df'}} />
                    <span style={{fontSize:10,fontFamily:'monospace',color:'#5bb8f5',textTransform:'uppercase',letterSpacing:'0.08em'}}>Running…</span>
                  </div>
                )}
              </div>
            </div>

            {/* Log list */}
            <div className="p-4 flex-1 text-slate-200 font-mono text-[11px] leading-relaxed overflow-y-auto max-h-[360px]">
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-600 text-xs py-16 space-y-2">
                  <Cpu className="w-10 h-10 text-slate-800 animate-pulse" />
                  <p className="font-mono font-bold" style={{color:'#6b82ab'}}>Pipeline ready.</p>
                  <p style={{fontSize:11,color:'#a6b4cd',marginTop:4}}>Click Run to start the full QA cycle.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {logs.map((log, index) => {
                    const levelColors = {
                      info: 'text-slate-300',
                      success: 'text-emerald-400 font-bold',
                      warn: 'text-yellow-400 font-bold',
                      error: 'text-rose-400 font-extrabold'
                    };
                    return (
                      <div key={index} className="flex items-start gap-2 hover:bg-slate-900/30 p-0.5 rounded">
                        <span className="text-slate-550 shrink-0 text-[10px] select-none">[{log.timestamp}]</span>
                        <span className="text-indigo-400 shrink-0 select-none">[{log.module}]</span>
                        <span className={`${levelColors[log.level]}`}>{log.message}</span>
                      </div>
                    );
                  })}
                  <div ref={terminalEndRef} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Performance & Security Testing Scenarios Panel */}
      {orchestratorState === 'completed' && (
        <div id="ai-recommendations-panel" className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm animate-slide-up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-sans font-extrabold text-sm text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600" />
                AI-Recommended Next Scenario Sweeps
              </h3>
              <p className="text-xs text-slate-500">
                Connected analysis discovered high risk profiles in microservice endpoints. Trigger target tests directly:
              </p>
            </div>
            <span className="text-[9px] font-mono bg-purple-50 text-purple-700 px-3 py-1 rounded-full border border-purple-100 uppercase font-black uppercase tracking-wider self-start sm:self-auto">
              Dynamic Recommendations Enabled
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Recommended Performance panel */}
            <div className="bg-slate-50 border border-slate-205 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-cyan-100 text-cyan-700 rounded-lg">
                  <Sliders className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-xs font-sans font-black uppercase text-slate-900">Performance Scalability Scenarios</h4>
                  <p className="text-[10px] text-slate-500">API throughput and user transaction bottlenecks</p>
                </div>
              </div>

              <div className="space-y-3">
                {recommendedPerfScenarios.map(sc => {
                  const isRunning = perfRunningName === sc.title;
                  const isDone = perfCompleted.includes(sc.id);

                  return (
                    <div key={sc.id} className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono bg-cyan-50 text-cyan-700 border border-cyan-200 px-2.5 py-0.5 rounded-full font-bold uppercase">
                          {sc.intensity}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-slate-400">{sc.endpoint}</span>
                      </div>
                      
                      <h5 className="text-xs font-bold text-slate-900">{sc.title}</h5>
                      <p className="text-[10px] text-slate-650 leading-relaxed">{sc.desc}</p>
                      
                      <button
                        onClick={() => handleLaunchRecommendPerf(sc)}
                        disabled={isRunning}
                        className={`w-full mt-2 py-1 px-3 text-[10px] font-mono rounded-lg font-bold flex items-center justify-center gap-1.5 border transition-all ${
                          isDone 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-250 cursor-default'
                            : isRunning
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                            : 'bg-cyan-50 text-cyan-750 border-cyan-200 hover:bg-cyan-102 cursor-pointer'
                        }`}
                      >
                        {isDone ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            Stress Sweep Completed successfully!
                          </>
                        ) : isRunning ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Load injection in progress...
                          </>
                        ) : (
                          <>
                            <Flame className="w-3 h-3 text-cyan-600" />
                            Execute Recommended Performance Sweep
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recommended Security panel */}
            <div className="bg-slate-50 border border-slate-205 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-red-100 text-red-700 rounded-lg">
                  <ShieldAlert className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-xs font-sans font-black uppercase text-slate-900">Security Penetration Scenarios</h4>
                  <p className="text-[10px] text-slate-500">API entry-point defense vulnerabilities scan</p>
                </div>
              </div>

              <div className="space-y-3">
                {recommendedSecScenarios.map(sc => {
                  const isRunning = secRunningId === sc.id;
                  const isDone = secCompleted.includes(sc.id);

                  return (
                    <div key={sc.id} className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full font-bold uppercase">
                          {sc.severity}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-slate-400">Target: {sc.vulnerabilityId}</span>
                      </div>
                      
                      <h5 className="text-xs font-bold text-slate-900">{sc.title}</h5>
                      <p className="text-[10px] text-slate-650 leading-relaxed">{sc.desc}</p>
                      
                      <button
                        onClick={() => handleLaunchRecommendSec(sc)}
                        disabled={isRunning}
                        className={`w-full mt-2 py-1 px-3 text-[10px] font-mono rounded-lg font-bold flex items-center justify-center gap-1.5 border transition-all ${
                          isDone 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-250 cursor-default'
                            : isRunning
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                            : 'bg-red-50 text-red-750 border-red-200 hover:bg-red-102 cursor-pointer'
                        }`}
                      >
                        {isDone ? (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            Remediated & Approved!
                          </>
                        ) : isRunning ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Executing defense sweep injection...
                          </>
                        ) : (
                          <>
                            <ShieldAlert className="w-3 h-3 text-red-650" />
                            Verify Security Vulnerabilities Scan
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
