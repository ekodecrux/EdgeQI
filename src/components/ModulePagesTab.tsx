import React, { useState } from 'react';
import { 
  Layers, 
  Lock, 
  CreditCard, 
  Radio, 
  Database, 
  Cpu, 
  BarChart3, 
  Bell, 
  FileCode, 
  Shield, 
  Server, 
  CheckCircle, 
  AlertTriangle, 
  ArrowRight, 
  Settings2, 
  Play, 
  Activity, 
  Zap,
  TrendingUp,
  FileText
} from 'lucide-react';
import { TestCase, DefectHotspot, SecurityVulnerability, RequirementDoc } from '../types';

interface ModulePagesTabProps {
  requirements: RequirementDoc[];
  testCases: TestCase[];
  defects: DefectHotspot[];
  vulnerabilities: SecurityVulnerability[];
  onTriggerRerun: (id: string) => void;
  onApplyHeal: (id: string) => void;
  activeModuleId?: string;
  onActiveModuleIdChange?: (id: string) => void;
}

interface ModuleDetails {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  health: number;
  risk: 'Critical' | 'High' | 'Medium' | 'Low';
  automation: string;
  bugsCount: number;
  avgResponseMs: number;
  throughputTps: number;
  complianceRatio: number;
  devTeam: string;
}

export default function ModulePagesTab({
  requirements,
  testCases,
  defects,
  vulnerabilities,
  onTriggerRerun,
  onApplyHeal,
  activeModuleId: propActiveModuleId,
  onActiveModuleIdChange,
}: ModulePagesTabProps) {
  // Define our 10 specific modules under test
  const modules: ModuleDetails[] = [
    { 
      id: 'auth', 
      name: 'User Authentication', 
      description: 'Handles JWT authorization tokens, session pools, MFA gates, and federated directory links.', 
      icon: Lock, 
      health: 96, 
      risk: 'Low', 
      automation: '92%', 
      bugsCount: 1, 
      avgResponseMs: 42, 
      throughputTps: 180, 
      complianceRatio: 100,
      devTeam: 'Core Identity Sec'
    },
    { 
      id: 'billing', 
      name: 'Billing & Card Payments', 
      description: 'Manages ledger sync pipelines, Stripe card checkouts, local billing invoices, and tax brackets.', 
      icon: CreditCard, 
      health: 74, 
      risk: 'Critical', 
      automation: '85%', 
      bugsCount: 5, 
      avgResponseMs: 312, 
      throughputTps: 45, 
      complianceRatio: 90,
      devTeam: 'E-Comm Billing Devs'
    },
    { 
      id: 'websocket', 
      name: 'WebSocket Dispatcher', 
      description: 'Coordinates concurrent bidirectional live streams, heartbeat packets, and trace brokers.', 
      icon: Radio, 
      health: 88, 
      risk: 'Medium', 
      automation: '64%', 
      bugsCount: 2, 
      avgResponseMs: 14, 
      throughputTps: 1200, 
      complianceRatio: 95,
      devTeam: 'Live Systems Engine'
    },
    { 
      id: 'sync', 
      name: 'Data Storage & Sync', 
      description: 'Orchestrates multi-zone database syncs, asset caching layers, and transaction rollback states.', 
      icon: Database, 
      health: 94, 
      risk: 'Low', 
      automation: '90%', 
      bugsCount: 0, 
      avgResponseMs: 28, 
      throughputTps: 450, 
      complianceRatio: 98,
      devTeam: 'Database Reliability'
    },
    { 
      id: 'gateway', 
      name: 'API Gateway & Router', 
      description: 'Filters ingress payloads, provides rate limits, manages token caching, and resolves internal URIs.', 
      icon: Cpu, 
      health: 81, 
      risk: 'High', 
      automation: '78%', 
      bugsCount: 3, 
      avgResponseMs: 8, 
      throughputTps: 3400, 
      complianceRatio: 85,
      devTeam: 'Infrastructure Edge'
    },
    { 
      id: 'analytics', 
      name: 'Analytics & Reporting', 
      description: 'Generates system throughput graphs, metric snapshots, cost matrix forecasts, and CSV downloads.', 
      icon: BarChart3, 
      health: 90, 
      risk: 'Low', 
      automation: '70%', 
      bugsCount: 1, 
      avgResponseMs: 250, 
      throughputTps: 20, 
      complianceRatio: 100,
      devTeam: 'Business Intelligence'
    },
    { 
      id: 'notifications', 
      name: 'Notification Engine', 
      description: 'Pushes automated system email receipts, SMS verification alerts, and Slack webhook pings.', 
      icon: Bell, 
      health: 85, 
      risk: 'Medium', 
      automation: '81%', 
      bugsCount: 2, 
      avgResponseMs: 85, 
      throughputTps: 150, 
      complianceRatio: 92,
      devTeam: 'Customer Integrations'
    },
    { 
      id: 'ingestion', 
      name: 'Core File Ingestion', 
      description: 'Parses incoming CSV schema grids, handles unstructured PDF documents, and triggers antiviral scans.', 
      icon: FileCode, 
      health: 79, 
      risk: 'High', 
      automation: '55%', 
      bugsCount: 4, 
      avgResponseMs: 480, 
      throughputTps: 15, 
      complianceRatio: 80,
      devTeam: 'Data Feed Processing'
    },
    { 
      id: 'firewall', 
      name: 'Security & Firewall', 
      description: 'Monitors real-time intrusion indicators, blocks IP headers, and manages compliance logging.', 
      icon: Shield, 
      health: 98, 
      risk: 'Low', 
      automation: '95%', 
      bugsCount: 0, 
      avgResponseMs: 3, 
      throughputTps: 5000, 
      complianceRatio: 100,
      devTeam: 'DevSecOps Team'
    },
    { 
      id: 'loadgrid', 
      name: 'Load & Scale Grid', 
      description: 'Auto-allocates cluster instances during rush hours, schedules worker pools, and spins down idle VMs.', 
      icon: Server, 
      health: 80, 
      risk: 'High', 
      automation: '50%', 
      bugsCount: 3, 
      avgResponseMs: 140, 
      throughputTps: 800, 
      complianceRatio: 88,
      devTeam: 'SRE & Platform Org'
    }
  ];

  const [localActiveModuleId, setLocalActiveModuleId] = useState<string>('billing');

  const activeModuleId = propActiveModuleId !== undefined ? propActiveModuleId : localActiveModuleId;
  const setActiveModuleId = onActiveModuleIdChange !== undefined ? onActiveModuleIdChange : setLocalActiveModuleId;

  const currentModule = modules.find(m => m.id === activeModuleId) || modules[0];
  const ModuleIcon = currentModule.icon;

  // Filter test cases associated with current active module
  const moduleTests = testCases.filter(tc => {
    // If testcase contains text relevant to module
    const desc = (tc.description + tc.title).toLowerCase();
    const nameWords = currentModule.name.toLowerCase().split(' ');
    return nameWords.some(word => word.length > 3 && desc.includes(word)) || tc.id.charCodeAt(0) % 3 === currentModule.id.charCodeAt(0) % 3;
  });

  // Filter defects for active module
  const moduleDefects = defects.filter(df => 
    df.moduleName.toLowerCase().includes(currentModule.name.toLowerCase()) || 
    df.moduleName.toLowerCase().includes(currentModule.id.toLowerCase())
  );

  // Filter vulnerabilities for active module
  const moduleVulns = vulnerabilities.filter(vuln => {
    const isMatched = currentModule.id === 'firewall' || currentModule.id === 'auth' 
      ? vuln.severity === 'Critical' || vuln.severity === 'High' 
      : vuln.severity === 'Medium' || vuln.severity === 'Low';
    return isMatched && vuln.status === 'Open';
  });

  // Filter requirement docs that may match this module
  const moduleReqs = requirements.filter(req => 
    req.title.toLowerCase().includes(currentModule.name.toLowerCase()) ||
    req.suggestedModules?.some(m => m.toLowerCase().includes(currentModule.name.toLowerCase()))
  );

  return (
    <div id="module-pages-tab-root" className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      
      {/* LEFT NAVIGATION: Module selector sidebar card */}
      <div id="module-sidebar-card" className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4 h-fit">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            Product Modules Under Test
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">Select an active module to load its specific telemetry interface.</p>
        </div>

        <div className="space-y-1">
          {modules.map((m) => {
            const IconComponent = m.icon;
            const isSelected = m.id === activeModuleId;
            const healthColor = m.health > 90 ? 'text-emerald-600' : m.health > 80 ? 'text-indigo-600' : 'text-rose-500';

            return (
              <button
                key={m.id}
                id={`btn-module-select-${m.id}`}
                onClick={() => setActiveModuleId(m.id)}
                className={`w-full text-left p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                  isSelected 
                    ? 'bg-purple-50/70 border-purple-300 text-purple-950 font-bold' 
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100/50 text-slate-705'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <IconComponent className={`w-4 h-4 shrink-0 ${isSelected ? 'text-purple-600' : 'text-slate-450'}`} />
                  <span className="truncate">{m.name}</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono shrink-0">
                  <span className={`text-[10px] font-bold ${healthColor}`}>{m.health}%</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${m.health > 90 ? 'bg-emerald-500' : m.health > 80 ? 'bg-indigo-500' : 'bg-rose-500'}`} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT MAIN PANEL: Module-Specific Page details */}
      <div id="module-detail-panel" className="lg:col-span-3 space-y-6">
        
        {/* Module Master Banner */}
        <div id="module-master-banner" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-purple-100 text-purple-700 rounded-xl shadow-inner mt-0.5">
                <ModuleIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold font-sans text-slate-900">{currentModule.name}</h2>
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase border ${
                    currentModule.risk === 'Critical' || currentModule.risk === 'High'
                      ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                      : 'bg-green-50 text-green-700 border-green-200'
                  }`}>
                    {currentModule.risk} Risk Category
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{currentModule.devTeam} • Active Coverage</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-400">Pipeline Status:</span>
              <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-1 border border-indigo-200 rounded">
                Telemetry Link Active
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-150-100">
            {currentModule.description}
          </p>

          {/* GRANULAR TELEMETRY KPI CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div id="kpi-health-card" className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-col justify-between">
              <span className="text-[10px] text-slate-450 uppercase font-bold font-mono">Module Health</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className={`text-xl font-mono font-bold ${currentModule.health > 90 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {currentModule.health}%
                </span>
                <span className="text-[9px] text-slate-400 font-mono">Index</span>
              </div>
              <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-2">
                <div 
                  style={{ width: `${currentModule.health}%` }} 
                  className={`h-full ${currentModule.health > 80 ? 'bg-indigo-600' : 'bg-rose-500'}`} 
                />
              </div>
            </div>

            <div id="kpi-automation-card" className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-col justify-between">
              <span className="text-[10px] text-slate-450 uppercase font-bold font-mono">Auto Regression</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-mono font-bold text-slate-800">{currentModule.automation}</span>
                <span className="text-[9px] text-slate-400 font-mono">Target</span>
              </div>
              <p className="text-[9px] text-slate-400 mt-2 font-mono">Mapped tests validated</p>
            </div>

            <div id="kpi-latency-card" className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-col justify-between">
              <span className="text-[10px] text-slate-450 uppercase font-bold font-mono">Avg API Latency</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-mono font-bold text-slate-850">{currentModule.avgResponseMs}ms</span>
                <span className="text-[9px] text-slate-400 font-mono">p95</span>
              </div>
              <p className="text-[9px] text-slate-400 mt-2 font-mono">Target load threshold: 400ms</p>
            </div>

            <div id="kpi-throughput-card" className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-col justify-between">
              <span className="text-[10px] text-slate-450 uppercase font-bold font-mono">Peak Capacity</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-mono font-bold text-slate-850">{currentModule.throughputTps}</span>
                <span className="text-[9px] text-slate-400 font-mono">TPS</span>
              </div>
              <p className="text-[9px] text-slate-400 mt-2 font-mono">Max requests/sec</p>
            </div>
          </div>
        </div>

        {/* SECTION A: MODULE DEFECT AND COMPLIANCE MAP */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Defect Forecast & Hotspots Card */}
          <div id="module-defect-card" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Machine Learning Defect Forecast
            </h3>

            {moduleDefects.length > 0 ? (
              moduleDefects.map((df, idx) => (
                <div key={idx} id={`defect-forecast-${idx}`} className="bg-slate-50 border border-slate-250-100 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded">
                      HOTSPOT DETECTED
                    </span>
                    <span className="text-[10px] text-slate-450 font-mono">Risk Weight: {df.predictedRiskScore}%</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-805">Typical Fault Pattern:</h4>
                    <p className="text-xs text-slate-600 mt-0.5">{df.developerPattern}</p>
                  </div>
                  <div className="bg-white border border-slate-200 p-2.5 rounded-lg text-xs leading-relaxed text-slate-650 italic">
                    <strong className="block text-[10px] uppercase font-mono text-slate-405 font-bold not-italic mb-0.5">Automated Prescriptive Advice</strong>
                    {df.recommendation}
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-emerald-50/50 border border-emerald-150 rounded-xl p-4 text-center space-y-1">
                <CheckCircle className="w-5 h-5 text-emerald-600 mx-auto" />
                <h4 className="text-xs font-semibold text-emerald-850">Outstanding Code Integrity</h4>
                <p className="text-[11px] text-slate-500">No active historical defects or hotspot risks cached in model telemetry stores.</p>
              </div>
            )}
          </div>

          {/* Module Security & Compliance Grid */}
          <div id="module-security-card" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-purple-650" />
              Security Vulnerabilities & Compliance
            </h3>

            <div className="space-y-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-400 font-mono text-[9px] block uppercase font-bold">In-House Compliance Rank</span>
                  <span className="font-semibold text-slate-800">PII & GDPR Ledger Masking</span>
                </div>
                <div className="font-mono text-right">
                  <span className="text-purple-750 font-bold block">{currentModule.complianceRatio}%</span>
                  <span className="text-[9px] text-slate-450">Compliant</span>
                </div>
              </div>

              {moduleVulns.length > 0 ? (
                moduleVulns.map((v) => (
                  <div key={v.id} id={`vuln-row-${v.id}`} className="border border-rose-200/60 bg-rose-50/30 rounded-xl p-3 flex justify-between items-start gap-2 text-xs">
                    <div>
                      <span className="text-rose-700 font-mono text-[9px] font-bold uppercase px-1.5 py-0.5 bg-rose-50 border border-rose-200 rounded shrink-0 mr-1.5 mb-1 inline-block">
                        {v.severity}
                      </span>
                      <h4 className="font-semibold text-slate-900 mt-1">{v.title}</h4>
                      <p className="text-[10px] text-slate-505 font-mono mt-0.5">{v.vulnerabilityClass} • {v.toolExposedBy}</p>
                    </div>
                    <span className="text-[10px] font-mono text-rose-600 font-bold">OPEN</span>
                  </div>
                ))
              ) : (
                <div className="bg-emerald-50/50 border border-emerald-150 rounded-xl p-4 text-center space-y-1">
                  <CheckCircle className="w-5 h-5 text-emerald-600 mx-auto" />
                  <h4 className="text-xs font-semibold text-emerald-850 font-sans">No Exposed Vulnerability Anchors</h4>
                  <p className="text-[11px] text-slate-550">Dynamic and Static scans conform to highest enterprise class compliance metrics.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION B: NLP REQUIREMENTS ASSOCIATED TO THIS MODULE */}
        <div id="module-requirements-panel" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-indigo-650" />
            Mapped NLP Specifications & Traceability (GDPR/SOC2)
          </h3>

          <div className="space-y-3">
            {moduleReqs.length > 0 ? (
              moduleReqs.map((req) => (
                <div key={req.id} id={`module-req-item-${req.id}`} className="border border-slate-200 hover:border-slate-300 rounded-xl p-4 text-xs space-y-1.5 transition-all bg-slate-50/50">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-purple-650 font-bold uppercase tracking-wider text-[10px]">{req.id}</span>
                    <span className="text-slate-400 font-mono text-[10px]">Ingested: {new Date(req.parsedAt).toLocaleDateString()}</span>
                  </div>
                  <h4 className="font-semibold text-slate-805 text-sm">{req.title}</h4>
                  <p className="text-slate-605 italic leading-relaxed">{req.content}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl text-slate-450 text-xs">
                No explicitly matched raw specifications currently mapped. Using default suite benchmarks.
              </div>
            )}
          </div>
        </div>

        {/* SECTION C: COMPREHENSIVE AUTOMATED TEST SCENARIOS FOR THIS MODULE */}
        <div id="module-test-scenarios-panel" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                <Settings2 className="w-4 h-4 text-purple-650" />
                Durable Module E2E Test Suite Scenarios
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Detailed assertions and validation rules targeting this specific deployment segment.</p>
            </div>
            <span className="text-[10px] font-mono bg-purple-50 text-purple-705 px-2.5 py-1 rounded-full border border-purple-200 font-semibold shadow-xs">
              Count: {moduleTests.length} Scenarios
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {moduleTests.map((tc) => (
              <div key={tc.id} id={`tc-card-${tc.id}`} className="border border-slate-200 rounded-xl p-4 bg-white hover:border-purple-250 hover:shadow-xs transition-all flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-start gap-1">
                    <span className="text-[10px] font-mono text-purple-600 font-bold">{tc.id}</span>
                    <span className={`text-[9px] font-mono border px-2 py-0.5 rounded ${
                      tc.priority === 'P0' ? 'bg-red-50 text-red-700 border-red-200 font-bold' :
                      tc.priority === 'P1' ? 'bg-amber-50 text-amber-700 border-amber-200 font-bold' :
                      'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                      {tc.priority}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-805 font-sans leading-tight">{tc.title}</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed truncate">{tc.description}</p>
                </div>

                <div className="bg-slate-50 rounded-lg p-2.5 text-[10px] space-y-1 border border-slate-150-100">
                  <span className="block text-[8px] font-mono text-slate-400 uppercase font-bold">Key Validation Checks:</span>
                  {tc.steps?.slice(0, 2).map((st, sidx) => (
                    <div key={sidx} className="flex gap-1 items-start text-slate-600">
                      <span className="text-purple-600 shrink-0 font-bold">►</span>
                      <p className="truncate"><span className="font-semibold text-slate-700">{st.action}</span> ➔ {st.expectedResult}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-1">
                  <div className="flex items-center gap-1 font-mono text-[9px] text-slate-450">
                    <span>Rate:</span>
                    <span className="text-indigo-650 font-bold">{tc.confidenceScore}%</span>
                  </div>

                  <div className="flex gap-1.5">
                    {tc.automationStatus === 'Automated' ? (
                      <span className="text-[9px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-250 px-2 py-0.5 rounded font-bold">
                        AUTOMATED
                      </span>
                    ) : (
                      <button
                        type="button"
                        id={`btn-heal-${tc.id}`}
                        onClick={() => onApplyHeal(tc.id)}
                        className="text-[9px] font-mono bg-indigo-600 hover:bg-indigo-500 text-white rounded px-2 py-0.5 font-bold transition-all"
                      >
                        Auto-Heal
                      </button>
                    )}

                    <button
                      type="button"
                      id={`btn-rerun-${tc.id}`}
                      onClick={() => onTriggerRerun(tc.id)}
                      className="text-[9px] font-mono bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-350 text-slate-650 rounded px-2 py-0.5 font-bold transition-all"
                    >
                      Trigger
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
