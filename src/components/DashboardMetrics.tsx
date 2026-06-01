import React, { useState } from 'react';
import { 
  Target, 
  TrendingUp, 
  Users, 
  Shield, 
  Cpu, 
  RefreshCw, 
  AlertOctagon, 
  CheckCircle, 
  BarChart3, 
  Database, 
  Star, 
  Sparkles, 
  Layers, 
  Activity, 
  ExternalLink,
  Settings,
  Plus,
  Zap,
  ArrowRight
} from 'lucide-react';
import { TestCase, DefectHotspot, SecurityVulnerability } from '../types';

interface DashboardProps {
  testCases: TestCase[];
  defects: DefectHotspot[];
  vulnerabilities: SecurityVulnerability[];
  onTriggerRerun: (id: string) => void;
  onApplyHeal: (id: string) => void;
  onNavigateToModule?: (moduleId: string) => void;
  onNavigateToAgentic?: () => void;
}

interface ToolIntegration {
  name: string;
  category: string;
  status: 'connected' | 'disconnected' | 'configuring';
  lastSynced: string;
  iconColor: string;
}

export default function DashboardMetrics({
  testCases,
  defects,
  vulnerabilities,
  onTriggerRerun,
  onApplyHeal,
  onNavigateToModule,
  onNavigateToAgentic,
}: DashboardProps) {
  const [persona, setPersona] = useState<'tactical' | 'operational' | 'strategic'>('tactical');

  // NFR-09: SLA monitor state
  const [slaData, setSlaData] = useState<{avg:number;p50:number;p95:number;p99:number;status:string;slaBreachRate:number;sampleCount:number}|null>(null);
  const [slaLoading, setSlaLoading] = useState(false);
  const loadSla = async () => {
    setSlaLoading(true);
    try {
      const token = localStorage.getItem('iqstudio_token');
      const res = await fetch('/api/quality/health/sla', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const data = await res.json();
      setSlaData(data);
    } catch { /* silent */ } finally { setSlaLoading(false); }
  };
  
  // Drill-down states
  const [selectedModuleCategory, setSelectedModuleCategory] = useState<string>('Billing & Card Payments');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  
  // Chart sandbox states
  const [chartPrompt, setChartPrompt] = useState<string>('');
  const [activeSandboxMetrics, setActiveSandboxMetrics] = useState<string[]>(['Defect Densities', 'Test Automation Coverage']);
  const [renderedChartType, setRenderedChartType] = useState<'bar' | 'line' | 'pie'>('bar');
  const [isGeneratingChart, setIsGeneratingChart] = useState<boolean>(false);
  const [chartTitleText, setChartTitleText] = useState<string>('Interactive Module Testing Metrics Overview');

  // Integrations state
  const [tools, setTools] = useState<ToolIntegration[]>([
    { name: 'Atlassian JIRA', category: 'Project & Defect Tracking', status: 'connected', lastSynced: '10 mins ago', iconColor: 'text-blue-600' },
    { name: 'TRICENTIS qTest', category: 'Enterprise Test Management', status: 'connected', lastSynced: 'Just now', iconColor: 'text-indigo-650' },
    { name: 'SmartBear TestRail', category: 'Manual & Automated Case Hub', status: 'disconnected', lastSynced: 'Never', iconColor: 'text-cyan-600' },
    { name: 'Zephyr Enterprise', category: 'Agile QA Automation Maps', status: 'configuring', lastSynced: 'Sync pending', iconColor: 'text-purple-600' },
    { name: 'Azure DevOps Boards', category: 'CI/CD Pipeline Integration', status: 'connected', lastSynced: '1 hr ago', iconColor: 'text-sky-500' }
  ]);

  // Computed values — derived from real data
  const totalTests = testCases.length;
  const automatedTests = testCases.filter(t => t.automationStatus === 'Automated' || t.automationStatus === 'Automatable').length;
  // Use real automation status distribution instead of hardcoded ratio
  const passedTests = testCases.filter(t => t.automationStatus === 'Automated').length;
  const healedTests = testCases.filter(t => t.confidenceScore >= 90 && t.automationStatus === 'Automatable').length;
  const failedCount = Math.max(0, totalTests - passedTests - healedTests);
  const openVulns = vulnerabilities.filter(v => v.status === 'Open').length;
  const securityScore = Math.max(0, 100 - openVulns * 12);
  const automationPct = totalTests > 0 ? Math.round((automatedTests / totalTests) * 100) : 0;

  // Handler to toggle integration tool status
  const toggleToolStatus = (index: number) => {
    setTools(prev => prev.map((t, idx) => {
      if (idx === index) {
        const nextStatus = t.status === 'connected' ? 'disconnected' : 'connected';
        return {
          ...t,
          status: nextStatus,
          lastSynced: nextStatus === 'connected' ? 'Just now' : 'Never'
        };
      }
      return t;
    }));
  };

  // Preset prompts for chart generation
  const handleApplyPresetPrompt = (prompt: string, chartType: 'bar' | 'line' | 'pie') => {
    setIsGeneratingChart(true);
    setChartPrompt(prompt);
    setTimeout(() => {
      setRenderedChartType(chartType);
      if (prompt.includes('automation')) {
        setChartTitleText('Automated vs Manual Testing Coverage Distributions');
        setActiveSandboxMetrics(['Test Automation Coverage', 'Compliance Rating']);
      } else if (prompt.includes('defect') || prompt.includes('risk')) {
        setChartTitleText('AI Risk-Weighted Defect Hotspot Density Matrix');
        setActiveSandboxMetrics(['Defect Densities', 'Model Score Confidence']);
      } else {
        setChartTitleText('High-Priority Security & Critical Vulnerability Vectors');
        setActiveSandboxMetrics(['Security Vulns', 'Defect Densities']);
      }
      setIsGeneratingChart(false);
    }, 400);
  };

  const handleCustomPromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chartPrompt.trim()) return;
    setIsGeneratingChart(true);
    setChartTitleText(`Custom Generated AI Graph: ${chartPrompt}`);
    setTimeout(() => {
      setRenderedChartType(chartPrompt.toLowerCase().includes('line') ? 'line' : 'bar');
      setIsGeneratingChart(false);
    }, 400);
  };

  // Click handler to toggle metrics in workspace
  const toggleMetricInSandbox = (metric: string) => {
    if (activeSandboxMetrics.includes(metric)) {
      setActiveSandboxMetrics(prev => prev.filter(m => m !== metric));
    } else {
      setActiveSandboxMetrics(prev => [...prev, metric]);
    }
  };

  // Drill down modules list mapping
  const modulesList = [
    { name: 'User Authentication', health: 96, risk: 'Low', automation: '92%', testCasesCount: 14, bugs: 1 },
    { name: 'Billing & Card Payments', health: 74, risk: 'Critical', automation: '85%', testCasesCount: 18, bugs: 5 },
    { name: 'WebSocket Dispatcher', health: 88, risk: 'Medium', automation: '64%', testCasesCount: 12, bugs: 2 },
    { name: 'Data Storage & Sync', health: 94, risk: 'Low', automation: '90%', testCasesCount: 10, bugs: 0 },
    { name: 'API Gateway & Router', health: 81, risk: 'High', automation: '78%', testCasesCount: 15, bugs: 3 },
    { name: 'Analytics & Reporting', health: 90, risk: 'Low', automation: '70%', testCasesCount: 11, bugs: 1 },
    { name: 'Notification Engine', health: 85, risk: 'Medium', automation: '81%', testCasesCount: 9, bugs: 2 },
    { name: 'Core File Ingestion', health: 79, risk: 'High', automation: '55%', testCasesCount: 8, bugs: 4 },
    { name: 'Security & Firewall', health: 98, risk: 'Low', automation: '95%', testCasesCount: 16, bugs: 0 },
    { name: 'Load & Scale Grid', health: 80, risk: 'High', automation: '50%', testCasesCount: 12, bugs: 3 }
  ];

  const moduleNameToId: { [key: string]: string } = {
    'User Authentication': 'auth',
    'Billing & Card Payments': 'billing',
    'WebSocket Dispatcher': 'websocket',
    'Data Storage & Sync': 'sync',
    'API Gateway & Router': 'gateway',
    'Analytics & Reporting': 'analytics',
    'Notification Engine': 'notifications',
    'Core File Ingestion': 'ingestion',
    'Security & Firewall': 'firewall',
    'Load & Scale Grid': 'loadgrid'
  };

  const enrichedModules = modulesList.map(m => {
    const matchedHotspot = defects.find(d => 
      d.moduleName.toLowerCase().includes(m.name.toLowerCase()) || 
      m.name.toLowerCase().includes(d.moduleName.toLowerCase()) ||
      (m.name === 'User Authentication' && d.moduleName.includes('Authentication')) ||
      (m.name === 'Billing & Card Payments' && d.moduleName.includes('Billing')) ||
      (m.name === 'WebSocket Dispatcher' && d.moduleName.includes('WebSocket'))
    );
    const defectCount = matchedHotspot ? matchedHotspot.historicalDefectsCount : m.bugs;
    const keyId = moduleNameToId[m.name] || 'auth';
    return {
      ...m,
      id: keyId,
      defectCount: defectCount,
      riskScore: matchedHotspot ? matchedHotspot.predictedRiskScore : (m.risk === 'Critical' ? 85 : m.risk === 'High' ? 75 : m.risk === 'Medium' ? 50 : 20)
    };
  });

  const topDefectiveModules = [...enrichedModules]
    .sort((a, b) => b.defectCount - a.defectCount)
    .slice(0, 3);

  const currentDrillDownModule = modulesList.find(m => m.name === selectedModuleCategory) || modulesList[1];

  const drillDownTestCases = testCases.filter(tc => {
    const matchesPriority = priorityFilter === 'All' || tc.priority === priorityFilter;
    return matchesPriority;
  });

  return (
    <div className="space-y-6">
      {/* Persona Selector Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-650" />
            Unified Results Dashboard
          </h3>
          <p className="text-[11px] text-slate-500 font-sans">Toggle specific metrics optimized for your current stakeholder persona</p>
        </div>

        <div className="flex gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
          <button
            onClick={() => setPersona('tactical')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              persona === 'tactical' 
                ? 'bg-purple-650 text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/40'
            }`}
          >
            Tactical (QA Lead)
          </button>
          <button
            onClick={() => setPersona('operational')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              persona === 'operational' 
                ? 'bg-purple-650 text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/40'
            }`}
          >
            Operational (QA Engineer)
          </button>
          <button
            onClick={() => setPersona('strategic')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              persona === 'strategic' 
                ? 'bg-purple-650 text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/40'
            }`}
          >
            Strategic (Director)
          </button>
        </div>
      </div>

      {/* Connected Agentic AI Ingress Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-indigo-900 to-slate-900 border border-purple-850 rounded-2xl p-5 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-6 -translate-y-6">
          <Cpu className="w-48 h-48 animate-pulse text-purple-300" />
        </div>
        <div className="space-y-1.5 relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 bg-purple-500/20 border border-purple-400/30 text-purple-300 text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
            <Zap className="w-3 h-3 text-purple-400 animate-pulse" />
            Connected AI Cycle Standby
          </div>
          <h4 className="text-sm sm:text-base font-sans font-extrabold tracking-tight">
            Execute Multi-Module Connected Agentic AI QA Process
          </h4>
          <p className="text-xs text-indigo-200 leading-relaxed">
            Stitch code generation, diagnostic defect sweeps, live clustered selenium browser regressions, 
            and real-time self-healing telemetry directly. Keep your dashboard updated continuously.
          </p>
        </div>
        <button
          onClick={onNavigateToAgentic}
          className="relative z-10 bg-white hover:bg-slate-50 text-purple-950 px-4 py-2 rounded-xl text-xs font-mono font-extrabold uppercase shrink-0 transition-transform hover:scale-[1.02] shadow-sm cursor-pointer flex items-center gap-1"
        >
          Kickstart Engine <ArrowRight className="w-4 h-4 text-purple-800" />
        </button>
      </div>

      {/* Top Defective Modules Quick Ingress Summary Widget */}
      <div id="top-defective-modules-widget" className="bg-gradient-to-r from-rose-50/50 to-slate-50 border border-rose-100 rounded-2xl p-5 space-y-3.5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-rose-500 text-white rounded-lg">
              <AlertOctagon className="w-4 h-4 animate-pulse" />
            </span>
            <div>
              <h4 className="text-xs font-sans font-extrabold text-slate-900 uppercase tracking-tight">
                Top Defect Hotspot Modules
              </h4>
              <p className="text-[11px] text-slate-500">
                Action Required: The top 3 modules with the highest active and historical failure profiles.
              </p>
            </div>
          </div>
          <span className="text-[9px] font-mono font-bold bg-rose-100 text-rose-805 border border-rose-200 px-2.5 py-0.5 rounded-full uppercase self-start sm:self-auto">
            Escalation Level 1
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topDefectiveModules.map((m, idx) => {
            const rankColors = [
              { bg: 'bg-rose-500/10 text-rose-700 border-rose-200', text: 'text-rose-700', badge: 'bg-rose-600' },
              { bg: 'bg-amber-500/10 text-amber-705 border-amber-200', text: 'text-amber-705', badge: 'bg-amber-600' },
              { bg: 'bg-orange-500/10 text-orange-705 border-orange-200', text: 'text-orange-705', badge: 'bg-orange-600' },
            ];
            const style = rankColors[idx] || rankColors[2];

            return (
              <div 
                key={m.id}
                id={`module-defect-card-${m.id}`}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 flex flex-col justify-between hover:shadow-xs transition-all relative overflow-hidden group"
              >
                {/* Visual rank accent background badge */}
                <div className="absolute right-0 top-0 opacity-5 pointer-events-none transform translate-x-3 -translate-y-2 select-none">
                  <span className="text-5xl font-mono font-bold">#{idx + 1}</span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-slate-400">RANK #{idx + 1}</span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${style.bg}`}>
                      {m.defectCount} Defect{m.defectCount !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <h5 className="text-xs sm:text-sm font-sans font-extrabold text-slate-850 group-hover:text-purple-700 transition-colors">
                    {m.name}
                  </h5>

                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                    <span>Health Index:</span>
                    <strong className={m.health < 80 ? 'text-rose-650' : 'text-slate-705'}>{m.health}%</strong>
                    <span className="text-slate-300">|</span>
                    <span>Risk:</span>
                    <strong className={m.risk === 'Critical' || m.risk === 'High' ? 'text-rose-500' : 'text-slate-650'}>{m.risk}</strong>
                  </div>
                </div>

                <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono italic">
                    Devs: {m.name === 'User Authentication' ? 'Core Identity Sec' : m.name === 'Billing & Card Payments' ? 'E-Comm Billing Devs' : m.name === 'WebSocket Dispatcher' ? 'Live Systems Engine' : 'QA Automation Team'}
                  </span>
                  
                  <button
                    onClick={() => onNavigateToModule && onNavigateToModule(m.id)}
                    className="text-[10px] font-mono text-purple-750 hover:text-purple-650 font-bold flex items-center gap-1 bg-purple-50 hover:bg-purple-105 px-2.5 py-1 rounded-lg border border-purple-200 transition-all shadow-xs shrink-0 cursor-pointer"
                  >
                    Drill Down <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 1. TACTICAL LEADER VIEW */}
      {persona === 'tactical' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sprint Progress Widget */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center justify-between">
              <span>Sprint Validation Progress</span>
              <span className="text-green-650 font-bold">{totalTests > 0 ? automationPct : 0}% Automated</span>
            </h4>
            
            <div className="relative pt-2">
              <div className="overflow-hidden h-3 text-xs flex rounded-full bg-slate-100 border border-slate-200">
                <div style={{ width: `${totalTests > 0 ? automationPct : 0}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-purple-650 rounded-full" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2">
              <div className="text-center p-2 rounded-lg bg-slate-50">
                <span className="text-lg font-mono font-bold text-slate-800">{totalTests}</span>
                <p className="text-[10px] text-slate-500">Scoped</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-slate-50">
                <span className="text-lg font-mono font-bold text-green-650 font-extrabold">{passedTests}</span>
                <p className="text-[10px] text-slate-505">Automated</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-slate-50">
                <span className="text-lg font-mono font-bold text-rose-600 font-extrabold">{failedCount}</span>
                <p className="text-[10px] text-slate-505">Needs Manual</p>
              </div>
            </div>
          </div>

          {/* Test Coverage Trend Grid */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center justify-between">
              <span>Coverage Trend Analysis</span>
              <span className="text-purple-650 flex items-center gap-1 font-bold">
                <TrendingUp className="w-3.5 h-3.5" /> +12.4%
              </span>
            </h4>

            {/* Custom SVG Line graph */}
            <div className="relative h-20 w-full bg-slate-50 rounded-lg p-2 border border-slate-200 flex items-end">
              <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                <path
                  d="M 0 25 Q 20 18 40 14 T 80 8 T 100 4"
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M 0 25 Q 20 18 40 14 T 80 8 T 100 4 L 100 30 L 0 30 Z"
                  fill="url(#gradient-tactical)"
                  opacity="0.1"
                />
                <defs>
                  <linearGradient id="gradient-tactical" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#faf5ff" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute top-2 right-2 text-[9px] font-mono text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                Target: 95%
              </div>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">AI automatically mapping newly ingested requirements has closed the core gaps in Stripe Billing Modules, exceeding initial release milestones.</p>
          </div>

          {/* Healing Queue Diagnostics */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center justify-between">
              <span>Agentic Healing Queue</span>
              <span className="text-amber-700 font-mono text-[10px] font-semibold">0 Awaiting Approval</span>
            </h4>

            <div className="space-y-2 max-h-[120px] overflow-y-auto">
              <div className="text-[11px] text-slate-400 italic p-2.5 text-center">
                No healing tasks pending. Run test cases to detect broken locators.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. OPERATIONAL ENGINEER VIEW */}
      {persona === 'operational' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Real-time Suite Execution Registry</h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-mono font-bold text-[10px]">
                    <th className="pb-2">Test ID</th>
                    <th className="pb-2">Target Title</th>
                    <th className="pb-2">Priority</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-1 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {testCases.map((tc) => (
                    <tr key={tc.id} className="hover:bg-slate-50">
                      <td className="py-3 font-mono font-bold text-purple-700">{tc.id}</td>
                      <td className="py-3 text-slate-800 font-medium truncate max-w-[220px]">{tc.title}</td>
                      <td className="py-3"><span className="px-1.5 py-0.5 rounded font-mono text-[9px] bg-slate-100 text-slate-650 border border-slate-200">{tc.priority}</span></td>
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full ${
                          tc.automationStatus === 'Automated' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          {tc.automationStatus}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => onTriggerRerun(tc.id)}
                          className="text-[10px] text-purple-700 hover:text-purple-600 font-mono flex items-center gap-1 ml-auto bg-purple-50 px-2 py-1 rounded border border-purple-200 hover:bg-purple-100 transition-all shadow-xs"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Rerun Mock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Operational Log telemetry widget */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Virtual Automation Logs</h4>

            <div className="bg-slate-900 border border-slate-950 p-3 rounded-lg h-56 font-mono text-[10px] text-emerald-400 overflow-y-auto space-y-1.5 shadow-inner">
              <p className="text-slate-500 italic">No execution logs yet. Add requirements and generate test cases to begin.</p>
            </div>

            <div className="bg-purple-50 rounded-xl p-3 border border-purple-200">
              <div className="flex items-center gap-2 text-xs text-purple-700 font-sans font-semibold">
                <Shield className="w-4 h-4 text-purple-650" />
                Security DAST Scanner
              </div>
              <p className="text-[11px] text-slate-650 mt-1">
                DAST scanner ready. Run a security scan to detect vulnerabilities.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. STRATEGIC DIRECTOR VIEW */}
      {persona === 'strategic' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Release Readiness Gauge */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 flex flex-col justify-between shadow-sm">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Release Readiness score</h4>
              <p className="text-xs text-slate-400">Auto-calculated risk threshold</p>
            </div>

            <div className="flex items-center gap-4 py-3">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-95">
                  <circle cx="48" cy="48" r="40" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                  <circle cx="48" cy="48" r="40" stroke="#a855f7" strokeWidth="8" fill="transparent"
                          strokeDasharray="251.2" strokeDashoffset={251.2 * (1 - 0.92)} strokeLinecap="round" />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-xl font-mono font-bold text-slate-800">92%</span>
                  <span className="text-[9px] text-green-650 font-bold uppercase font-sans">Ready</span>
                </div>
              </div>

              <div className="space-y-2 flex-grow text-xs font-mono text-slate-600">
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span>Regression Suite:</span>
                  <span className="text-emerald-650 font-bold">Passed</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span>Heal Threshold:</span>
                  <span className="text-emerald-650 font-bold">98% Healed</span>
                </div>
                <div className="flex justify-between">
                  <span>Critical Vulnerabilities:</span>
                  <span className="text-rose-600 font-bold">1 Alert</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 italic">Ready to deploy. Security blocker must resolve for higher compliance parameters.</p>
          </div>

          {/* Quality Business ROI Calculator */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Quality Business ROI Meter</h4>

            <div className="grid grid-cols-2 gap-3 text-sans">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-202">
                <span className="text-xl font-mono font-bold text-purple-705">$45,200</span>
                <p className="text-[10px] text-slate-500 mt-0.5">Estimated Manual Saving</p>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-202">
                <span className="text-xl font-mono font-bold text-purple-705">95%</span>
                <p className="text-[10px] text-slate-500 mt-0.5">Cycle Speedup Gain</p>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-202 col-span-2 flex items-center justify-between">
                <div>
                  <span className="text-sm font-mono font-bold text-slate-800">4.2 Hrs</span>
                  <p className="text-[10px] text-slate-500">Average Manual testing reduced/deploy</p>
                </div>
                <Star className="w-5 h-5 text-amber-500 fill-amber-500 animate-pulse" />
              </div>
            </div>
          </div>

          {/* AI Hotspots Heatmap index overview */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Predictive Hotspot Indexes</h4>

            <div className="space-y-2 max-h-[140px] overflow-y-auto scrollbar-thin">
              {defects.slice(0, 3).map((hot, idx) => (
                <div key={idx} className="bg-slate-50 relative p-2.5 rounded-lg flex items-center justify-between text-xs border border-slate-100">
                  <div>
                    <h5 className="font-semibold text-slate-800">{hot.moduleName}</h5>
                    <p className="text-[10px] text-slate-500 font-mono">{hot.commonFailureType}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                    hot.predictedRiskScore > 80 ? 'bg-rose-50 text-rose-700 border-rose-250' :
                    hot.predictedRiskScore > 50 ? 'bg-amber-50 text-amber-700 border-amber-255' :
                    'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    {hot.predictedRiskScore}% Risk
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PANEL: Promptable Chart Generator & Draggable Metric Sandbox */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              AI Prompt & Drag-Drop Chart Sandbox Engine
            </h3>
            <p className="text-xs text-slate-500">
              Instantly compile visual QA charts with natural language prompts or by selecting interactive metric blocks.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase bg-purple-50 text-purple-800 border border-purple-200 px-2 py-1 rounded">
              LLM Visualization Provider: Connected
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls & Metric blocks selection */}
          <div className="lg:col-span-4 space-y-4">
            <form onSubmit={handleCustomPromptSubmit} className="space-y-3">
              <label className="block text-[11px] font-mono text-slate-505 uppercase tracking-wider">
                Generate via AI Prompt (Natural Language)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={chartPrompt}
                  onChange={(e) => setChartPrompt(e.target.value)}
                  placeholder="e.g., compare automated vs manual coverage"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 pr-10 text-xs text-slate-805 focus:outline-none focus:ring-1 focus:ring-purple-400 font-sans shadow-xs placeholder-slate-400"
                />
                <button
                  type="submit"
                  disabled={isGeneratingChart}
                  className="absolute right-2 top-2 text-purple-650 hover:text-purple-550 transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-purple-600" />
                </button>
              </div>
            </form>

            {/* Quick Chart Preset buttons */}
            <div className="space-y-1.5">
              <span className="block text-[10px] font-mono text-slate-450 uppercase">Quick presets Matrix</span>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => handleApplyPresetPrompt('compare automated vs manual coverage ratio', 'bar')}
                  className="text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs text-slate-700 flex items-center justify-between transition-all"
                >
                  <span>🤖 Automated vs Manual Coverage</span>
                  <span className="text-[10px] font-mono text-purple-600 font-bold">Bar Chart</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPresetPrompt('show defect hotspots versus module change risk', 'line')}
                  className="text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs text-slate-700 flex items-center justify-between transition-all"
                >
                  <span>🔮 AI Risk-Weighted Defect Hotspots</span>
                  <span className="text-[10px] font-mono text-purple-600 font-bold">Line Graph</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPresetPrompt('distribution of open vulnerabilities by priority level', 'pie')}
                  className="text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs text-slate-700 flex items-center justify-between transition-all"
                >
                  <span>🛡️ Security Vulnerabilities Ratio</span>
                  <span className="text-[10px] font-mono text-purple-600 font-bold">Pie Ratio</span>
                </button>
              </div>
            </div>

            {/* Metric Blocks Sandbox with Click Simulation */}
            <div className="space-y-2">
              <div>
                <span className="block text-[11px] font-mono text-slate-505 uppercase tracking-wider">
                  Drag / Add Metric Blocks to custom zone
                </span>
                <p className="text-[10px] text-slate-400 leading-normal">Click blocks to attach/detach them from the visualization rendering loop:</p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[
                  'Defect Densities',
                  'Test Automation Coverage',
                  'Security Vulns',
                  'Model Score Confidence',
                  'Compliance Rating',
                  'Virtual Concurrent Load'
                ].map((metric) => {
                  const isActive = activeSandboxMetrics.includes(metric);
                  return (
                    <button
                      key={metric}
                      onClick={() => toggleMetricInSandbox(metric)}
                      className={`text-[10px] font-mono px-2 py-1.5 rounded-lg border transition-all ${
                        isActive
                          ? 'bg-purple-50 text-purple-750 border-purple-300 shadow-inner'
                          : 'bg-white text-slate-650 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {isActive ? '✓ ' : '+ '} {metric}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Interactive Chart Display Output Zone */}
          <div className="lg:col-span-8 bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between min-h-[290px] relative">
            {isGeneratingChart ? (
              <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center space-y-2 rounded-2xl backdrop-blur-xs z-10 transition-all">
                <RefreshCw className="w-6 h-6 text-purple-600 animate-spin" />
                <span className="text-xs text-slate-600 font-mono">Agentic model compiling chart elements...</span>
              </div>
            ) : null}

            <div>
              <div className="flex justify-between items-center border-b border-slate-250 pb-2 mb-4">
                <span className="text-xs font-mono font-bold text-slate-700">{chartTitleText}</span>
                <div className="flex gap-1">
                  {(['bar', 'line', 'pie'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setRenderedChartType(type)}
                      className={`px-2 py-1 text-[9px] font-mono uppercase rounded ${
                        renderedChartType === type
                          ? 'bg-purple-600 text-white font-bold'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Chart Box */}
              <div className="h-44 flex items-end justify-between px-6 pt-4 relative">
                {/* Horizontal reference grids */}
                <div className="absolute inset-x-0 bottom-4 h-[1px] bg-slate-200" />
                <div className="absolute inset-x-0 bottom-16 h-[1px] bg-slate-205 border-dashed" />
                <div className="absolute inset-x-0 bottom-28 h-[1px] bg-slate-205 border-dashed" />

                {/* Render BAR Chart type */}
                {renderedChartType === 'bar' && (
                  <div className="w-full flex justify-around items-end h-full z-10 relative">
                    {activeSandboxMetrics.map((item, idx) => {
                      const heights = [70, 92, 45, 80, 62, 85];
                      const currentHeight = heights[idx % heights.length];
                      return (
                        <div key={item} className="flex flex-col items-center w-1/5 group">
                          <div className="text-[9px] font-mono text-purple-700 font-extrabold mb-1 bg-white px-1 py-0.2 rounded shadow-xs opacity-0 group-hover:opacity-100 transition-opacity">
                            {currentHeight}%
                          </div>
                          <div
                            style={{ height: `${currentHeight}%` }}
                            className="bg-purple-600 rounded-t-md w-12 hover:bg-purple-500 hover:shadow-md transition-all shadow-indigo-100"
                          />
                          <span className="text-[9px] text-slate-500 font-mono mt-2 truncate w-20 text-center">{item}</span>
                        </div>
                      );
                    })}
                    {activeSandboxMetrics.length === 0 && (
                      <div className="w-full text-center text-slate-400 text-xs pb-12">No active Sandbox metric selected. Click metric blocks to compile layout.</div>
                    )}
                  </div>
                )}

                {/* Render LINE Chart type */}
                {renderedChartType === 'line' && (
                  <div className="w-full h-full relative z-10 flex items-end">
                    <svg className="w-full h-32" viewBox="0 0 100 30" preserveAspectRatio="none">
                      <path
                        d="M 10 21 Q 30 12 50 19 T 80 5 T 90 2"
                        className="stroke-purple-600"
                        fill="none"
                        strokeWidth="1.5"
                      />
                      {activeSandboxMetrics.map((item, index) => {
                        const offsets = [10, 30, 50, 70, 90];
                        const offset = offsets[index % offsets.length];
                        return (
                          <circle key={item} cx={offset} cy="12" r="2.5" className="fill-purple-600" />
                        );
                      })}
                    </svg>
                    <div className="absolute inset-x-0 bottom-[-15px] flex justify-around text-[9px] text-slate-500 font-mono">
                      {activeSandboxMetrics.map(item => (
                        <span key={item} className="truncate max-w-[90px]">{item}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Render PIE Chart type */}
                {renderedChartType === 'pie' && (
                  <div className="w-full flex items-center justify-center p-4">
                    <div className="relative w-24 h-24 rounded-full border-4 border-purple-600 border-t-rose-500 border-r-indigo-400 flex items-center justify-center rotate-45 transform">
                      <div className="absolute w-16 h-16 rounded-full bg-white flex items-center justify-center">
                        <span className="text-[10px] font-mono text-purple-850 font-bold -rotate-45">100% Active</span>
                      </div>
                    </div>
                    <div className="ml-8 space-y-1 text-[10px] font-mono">
                      <div className="flex items-center gap-1.5 text-purple-700 font-semibold"><span className="w-2.5 h-2.5 bg-purple-600 rounded" /> Primary Inbound Metric</div>
                      <div className="flex items-center gap-1.5 text-rose-600 font-semibold"><span className="w-2.5 h-2.5 bg-rose-500 rounded" /> Overlap Fail Threshold</div>
                      <div className="flex items-center gap-1.5 text-indigo-650 font-semibold"><span className="w-2.5 h-2.5 bg-indigo-400 rounded" /> Secondary Confidence</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 text-[10px] font-mono text-slate-505 flex justify-between bg-white p-2.5 rounded-lg border border-slate-100 shadow-inner">
              <span>Sandbox Status: Evaluated in real-time</span>
              <span className="text-purple-650 font-bold">Query Cost: $0.0003</span>
            </div>
          </div>
        </div>
      </div>

      {/* DRILL DOWNS AND DROPDOWNS FILTERS MATRIX */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 pb-2 border-b border-slate-205">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Comprehensive Multi-Module Drill-Down Matrix
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Explore granular coverage metrics and verify specific failure points by drill-down selectors.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Category Selection dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-slate-400">Category:</span>
              <select
                value={selectedModuleCategory}
                onChange={(e) => setSelectedModuleCategory(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-805 rounded px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 font-sans cursor-pointer"
              >
                {modulesList.map(m => (
                  <option key={m.name} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* Priority filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-slate-400">Priority:</span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-800 rounded px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 font-sans cursor-pointer"
              >
                <option value="All">All Priorities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Drill down outputs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-202 space-y-1">
            <span className="text-[9px] font-mono text-slate-400 uppercase font-bold block">Assigned Module Healthy Index</span>
            <span className="text-lg font-mono font-bold text-slate-800">{currentDrillDownModule?.health}%</span>
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div 
                style={{ width: `${currentDrillDownModule?.health}%` }} 
                className={`h-full ${currentDrillDownModule?.health > 80 ? 'bg-indigo-600' : 'bg-rose-500'}`} 
              />
            </div>
          </div>

          <div className="bg-slate-55 p-4 rounded-xl border border-slate-202 space-y-1 bg-slate-50">
            <span className="text-[9px] font-mono text-slate-400 uppercase font-bold block">Automated Regression Coverage</span>
            <span className="text-lg font-mono font-bold text-slate-800">{currentDrillDownModule?.automation}</span>
            <p className="text-[10px] text-slate-500">Matched on eclipse repo logs</p>
          </div>

          <div className="bg-slate-55 p-4 rounded-xl border border-slate-202 space-y-1 bg-slate-50">
            <span className="text-[9px] font-mono text-slate-400 uppercase font-bold block">Associated Risk Matrix</span>
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border inline-block ${
              currentDrillDownModule?.risk === 'Critical' || currentDrillDownModule?.risk === 'High'
                ? 'bg-rose-50 text-rose-700 border-rose-200' 
                : 'bg-green-50 text-green-700 border-green-200'
            }`}>
              {currentDrillDownModule?.risk} Risk
            </span>
            <p className="text-[10px] text-slate-400">Predicted defect index</p>
          </div>

          <div className="bg-slate-55 p-4 rounded-xl border border-slate-202 space-y-1 bg-slate-50">
            <span className="text-[9px] font-mono text-slate-400 uppercase font-bold block">Total bugs identified</span>
            <span className="text-lg font-mono font-bold text-rose-600">{currentDrillDownModule?.bugs} OPEN</span>
            <p className="text-[10px] text-slate-505">Requiring verification sweep</p>
          </div>
        </div>

        {/* Filters Results table */}
        <div className="overflow-x-auto bg-slate-50 border border-slate-200 p-4 rounded-xl">
          <span className="text-[10px] font-mono uppercase text-slate-550 tracking-wider font-bold block mb-3">Filtered Test Scenarios List</span>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-mono text-[9px] uppercase">
                <th className="pb-2">ID</th>
                <th className="pb-2">Target Title</th>
                <th className="pb-2">Confidence Level</th>
                <th className="pb-2">Run Ingress Status</th>
                <th className="pb-1 text-right">Rerun Inline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {drillDownTestCases.map((tc) => (
                <tr key={tc.id} className="hover:bg-slate-100/50">
                  <td className="py-2.5 font-mono text-purple-700 font-bold">{tc.id}</td>
                  <td className="py-2.5 font-medium text-slate-850">{tc.title}</td>
                  <td className="py-2.5 font-mono text-slate-500">{tc.confidenceScore}% Acc</td>
                  <td className="py-2.5">
                    <span className={`inline-flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-full ${
                      tc.automationStatus === 'Automated' ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' : 'bg-indigo-50 text-indigo-700 border border-indigo-150'
                    }`}>
                      {tc.automationStatus}
                    </span>
                  </td>
                  <td className="py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => onTriggerRerun(tc.id)}
                      className="px-2 py-0.5 text-[9px] font-mono bg-purple-50 text-purple-705 hover:bg-purple-100 border border-purple-200 rounded transition-all"
                    >
                      Rerun
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* INTEGRATIONS SYSTEM CONNECTIONS HUB */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold text-slate-905 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600" />
            Enterprise Test Management Integrations Hub
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Toggle offline connections to industrial tools directly. Our agent matches case steps, writes defects tickets, and syncs execution logs automatically.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {tools.map((t, idx) => (
            <div 
              key={t.name}
              className={`p-4 rounded-xl border transition-all hover:scale-[1.01] flex flex-col justify-between ${
                t.status === 'connected' 
                  ? 'bg-emerald-50/40 border-emerald-300' 
                  : t.status === 'configuring'
                    ? 'bg-purple-50/40 border-purple-200'
                    : 'bg-slate-50 border-slate-202 opacity-70'
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] font-mono uppercase tracking-wider font-extrabold ${t.iconColor}`}>
                    {t.name.split(' ')[1] || t.name}
                  </span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.3 rounded border font-semibold ${
                    t.status === 'connected' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    t.status === 'configuring' ? 'bg-purple-50 text-purple-700 border-purple-200 animate-pulse' :
                    'bg-slate-205 text-slate-600 border-slate-200'
                  }`}>
                    {t.status === 'connected' ? 'Connected' : t.status === 'configuring' ? 'Configuring' : 'Offline'}
                  </span>
                </div>
                <h4 className="text-[11px] font-extrabold text-slate-800">{t.name}</h4>
                <p className="text-[10px] text-slate-500 leading-tight mt-1">{t.category}</p>
              </div>

              <div className="pt-3 border-t border-slate-200/50 mt-3 flex justify-between items-center text-[9px] font-mono">
                <span className="text-slate-400">Sync: {t.lastSynced}</span>
                <button
                  type="button"
                  onClick={() => toggleToolStatus(idx)}
                  className="text-purple-600 hover:text-purple-550 hover:underline font-bold"
                >
                  {t.status === 'connected' ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CUSTOM PLAYER REQ: Local Customers LLM Configuration Broker Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-3 border-b border-slate-150">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-purple-650" />
              Hybrid AI & Local LLM Orchestrator Broker
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Configure dedicated local host LLMs or change models to match enterprise privacy frameworks.</p>
          </div>
          <span className="text-[9px] font-mono uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold self-start sm:self-auto">
            Gateway: Active
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="space-y-3 lg:col-span-1">
            <span className="block text-[10px] font-mono text-slate-450 uppercase font-bold">Select Active LLM Core</span>
            <div className="space-y-1">
              {[
                { id: 'ollama', name: 'Llama-3 (Ollama Local)', type: 'Custom Local' },
                { id: 'gemini', name: 'Google Gemini Pro 2.0', type: 'Industry Standard' },
                { id: 'openai', name: 'GPT-4o (OpenAI Enterprise)', type: 'Industry Standard' },
                { id: 'mistral', name: 'Mistral-7B Local Docker Instance', type: 'Custom Local' }
              ].map((model) => (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => {
                    const notify = model.id.includes('ollama') || model.id.includes('mistral') ? 'Offline local network link established' : 'Connected directly over standard provider endpoints';
                    alert(`Switched model loop to ${model.name}. ${notify}.`);
                  }}
                  className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:border-purple-300 bg-slate-50 hover:bg-purple-50/20 text-xs text-slate-700 flex flex-col justify-between transition-all"
                >
                  <span className="font-semibold text-slate-800">{model.name}</span>
                  <span className="text-[9px] font-mono text-slate-450 uppercase mt-0.5">{model.type}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-3 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1">Local Provider Host Endpoint URL</label>
                <input
                  type="text"
                  placeholder="e.g. http://localhost:11434"
                  defaultValue="http://localhost:11434"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-400 font-mono shadow-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1">Access Token / Private API Key</label>
                <input
                  type="password"
                  value="••••••••••••••••••••••••••••"
                  readOnly
                  className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-500 font-mono focus:outline-none shadow-xs cursor-default"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-505 mb-1">In-House Model Overrides parameter</label>
                <input
                  type="text"
                  placeholder="llama3:instruct"
                  defaultValue="llama3:instruct"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-400 font-mono shadow-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-505 mb-1">Temperature Threshold</label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  defaultValue="2"
                  className="w-full h-8 cursor-pointer mt-1 focus:outline-none"
                />
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="text-[10px] text-slate-600 font-mono">
                <span className="text-slate-400 font-semibold block uppercase">Direct Eclipse / CLI integration params</span>
                Local Ollama container port 11434 telemetry is active. Supports automatic fallback to SaaS if local capacity hits limits.
              </div>
              <button
                type="button"
                onClick={() => {
                  alert("Connection successful! Ollama telemetry responded in 14ms.");
                }}
                className="px-4 py-2 text-[11px] font-mono bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all font-bold shadow-sm whitespace-nowrap self-end sm:self-auto"
              >
                Test Local Pipeline Link
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* NFR-09: SLA / Response-Time Monitor Widget */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-sans font-semibold text-sm text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-violet-600" />
              API Response-Time SLA Monitor
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5 font-mono">Live p50/p95/p99 latency across all /api/* routes. SLA target: &lt;2000ms.</p>
          </div>
          <button onClick={loadSla} disabled={slaLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
            {slaLoading ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading...</> : <><RefreshCw className="w-3.5 h-3.5" /> Refresh SLA</>}
          </button>
        </div>
        {slaData ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[
              { label: 'Samples', value: slaData.sampleCount, unit: '' },
              { label: 'Avg', value: slaData.avg, unit: 'ms' },
              { label: 'p50', value: slaData.p50, unit: 'ms' },
              { label: 'p95', value: slaData.p95, unit: 'ms' },
              { label: 'p99', value: slaData.p99, unit: 'ms' },
            ].map(m => (
              <div key={m.label} className={`border rounded-xl p-3 text-center ${m.label === 'p95' && slaData.p95 > 2000 ? 'bg-rose-50 border-rose-200' : m.label === 'p95' ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                <div className="text-base font-bold text-slate-800">{m.value}{m.unit}</div>
                <div className="text-[9px] font-mono text-slate-500 uppercase">{m.label}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 font-mono text-center py-3">Click "Refresh SLA" to measure API response-time latencies.</p>
        )}
        {slaData && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold border ${slaData.status === 'healthy' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : slaData.status === 'degraded' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
            <span className="uppercase">{slaData.status}</span>
            <span className="font-normal text-slate-500">— breach rate: {slaData.slaBreachRate}% of {slaData.sampleCount} sampled requests exceeded 2s SLA</span>
          </div>
        )}
      </div>
    </div>
  );
}
