import React, { useState, useEffect, useRef } from 'react';
import {
  Crosshair, Sparkles, Upload, FileText, Download, RefreshCw, Loader2,
  FileJson, Layers, Wand2, Tag, Plus, Play, Code, GitCommit, CheckCircle,
  AlertTriangle, XCircle, ChevronRight, Target, Zap, BarChart2, Brain,
  ArrowRight, Check, X, Clock, Shield, TrendingUp, Filter, Eye, Link2,
  Cpu, Bot
} from 'lucide-react';
import { DefectHotspot, ImpactReport, TestCase } from '../types';
import { apiUrl } from '@/src/config/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DefectPredictProps {
  defects: DefectHotspot[];
  impactReports: ImpactReport[];
  onPredictHotspots: (title: string, description: string) => Promise<void>;
  onAnalyzeImpact: (changeTrigger: string, description: string) => Promise<void>;
  isAnalyzing: boolean;
  currentProjectId?: string;
  testCases?: TestCase[];
  onNavigateToExecution?: () => void;
}

type Panel = 'import' | 'classify' | 'impact' | 'hotspot';

interface ClassifiedDefect {
  id: string;
  title: string;
  module: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  category: 'Genuine' | 'Flaky' | 'Environment' | 'DataSetup' | 'Automation';
  confidence: number;
  failureReason: string;
  steps: string;
  approved: boolean | null;
  tmsStatus?: 'pending' | 'pushed' | 'failed';
  tmsUrl?: string;
}

interface ImpactedSuite {
  tcId: string;
  title: string;
  module: string;
  riskScore: number;
  reason: string;
  included: boolean;
  isRegression?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const token = () => localStorage.getItem('iq_token') || '';
const authH = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

const categoryColor: Record<string, string> = {
  Genuine:     'bg-red-100 text-red-700 border-red-200',
  Flaky:       'bg-yellow-100 text-yellow-700 border-yellow-200',
  Environment: 'bg-blue-100 text-blue-700 border-blue-200',
  DataSetup:   'bg-purple-100 text-purple-700 border-purple-200',
  Automation:  'bg-orange-100 text-orange-700 border-orange-200',
};

const severityColor: Record<string, string> = {
  Critical: 'text-red-700 bg-red-50 border-red-200',
  High:     'text-orange-700 bg-orange-50 border-orange-200',
  Medium:   'text-yellow-700 bg-yellow-50 border-yellow-200',
  Low:      'text-green-700 bg-green-50 border-green-200',
};

async function exportDefects(format: 'csv' | 'json') {
  const res = await fetch(apiUrl(`/api/quality/defects/export?format=${format}`));
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `defects.${format}`; a.click();
  URL.revokeObjectURL(url);
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function DefectPredictTab({
  defects,
  impactReports,
  onPredictHotspots,
  onAnalyzeImpact,
  isAnalyzing,
  currentProjectId,
  testCases = [],
  onNavigateToExecution,
}: DefectPredictProps) {

  const [panel, setPanel] = useState<Panel>('import');
  const [toast, setToast] = useState('');
  const showToast = (msg: string, ms = 3000) => { setToast(msg); setTimeout(() => setToast(''), ms); };

  // ── Panel 1: Import ────────────────────────────────────────────────────────
  const [importMode, setImportMode] = useState<'file' | 'paste' | 'tms'>('file');
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: string; status: string }[]>([]);
  const [selectedFileSource, setSelectedFileSource] = useState<'CSV' | 'Zephyr' | 'Eclipse Log' | 'JUnit XML' | 'Excel'>('CSV');
  const [pasteText, setPasteText] = useState('');
  const [isClassifyingText, setIsClassifyingText] = useState(false);
  const [tmsPullConfig, setTmsPullConfig] = useState({ tmsType: 'demo', baseUrl: '', projectKey: '', token: '' });
  const [isTmsPulling, setIsTmsPulling] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Panel 2: Classify ──────────────────────────────────────────────────────
  const [classified, setClassified] = useState<ClassifiedDefect[]>([]);
  const [isAiClassifying, setIsAiClassifying] = useState(false);
  const [showTmsPush, setShowTmsPush] = useState(false);
  const [tmsPushConfig, setTmsPushConfig] = useState({ tmsType: 'demo', baseUrl: '', projectKey: '', token: '', issueType: 'Bug' });
  const [isPushing, setIsPushing] = useState(false);
  const [pushResult, setPushResult] = useState<{ pushed: number; failed: number; urls: string[] } | null>(null);

  // ── Panel 3: Impact ────────────────────────────────────────────────────────
  const [changeReq, setChangeReq] = useState('');
  const [changeDesc, setChangeDesc] = useState('');
  const [isAnalyzingFull, setIsAnalyzingFull] = useState(false);
  const [impactedSuite, setImpactedSuite] = useState<ImpactedSuite[]>([]);
  const [impactSummary, setImpactSummary] = useState('');
  const [regressionRecommendation, setRegressionRecommendation] = useState<{
    riskLevel: string; targetModules: string[]; riskPercent: number;
    testCasesToRun: string[]; eclipseRunConfig: string;
    intelligenceLog: string[]; rootCauses?: string[]; recommendations?: string;
  } | null>(null);
  const [showConfigSnippet, setShowConfigSnippet] = useState(false);
  const [isQueueing, setIsQueueing] = useState(false);
  const [queuedRunId, setQueuedRunId] = useState('');

  // ── Panel 4: Hotspot ───────────────────────────────────────────────────────
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleDesc, setModuleDesc] = useState('');
  const [activeReportIndex, setActiveReportIndex] = useState<number | null>(0);
  const [clusters, setClusters] = useState<any[]>([]);
  const [clustersLoading, setClustersLoading] = useState(false);
  const [newClusterLabel, setNewClusterLabel] = useState('');
  const [newClusterPattern, setNewClusterPattern] = useState('');
  const [showAddCluster, setShowAddCluster] = useState(false);

  // Triage
  const [triageTitle, setTriageTitle] = useState('');
  const [triageDesc, setTriageDesc] = useState('');
  const [triageStack, setTriageStack] = useState('');
  const [triageResult, setTriageResult] = useState<any>(null);
  const [triaging, setTriaging] = useState(false);

  // AI Assistant
  const [assistantMsg, setAssistantMsg] = useState('');
  const [assistantReply, setAssistantReply] = useState('');
  const [assistantLoading, setAssistantLoading] = useState(false);

  useEffect(() => { loadClusters(); }, []);

  // ── Handlers: Import ───────────────────────────────────────────────────────

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (e.dataTransfer.files?.[0]) uploadDefectDump(e.dataTransfer.files[0]);
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) uploadDefectDump(e.target.files[0]);
  };

  const uploadDefectDump = async (file: File) => {
    setIsUploading(true);
    setUploadedFiles([{ name: file.name, size: `${(file.size / 1024).toFixed(1)} KB`, status: 'AI Analyzing...' }]);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sourceType', selectedFileSource);
      const resp = await fetch(apiUrl('/api/quality/defects/upload-dump'), { method: 'POST', body: formData });
      const data = await resp.json();
      if (data.success && data.analysis) {
        const a = data.analysis;
        const xmlConfig = `<?xml version="1.0" encoding="UTF-8"?>
<suite name="AI-Recommended Regression Suite" verbose="1">
  <listeners>
    <listener class-name="com.platform.regression.RiskBasedListener"/>
  </listeners>
  <test name="HighRiskRegressionSuite">
    <classes>
      <class name="com.platform.regression.AISelectedTests">
        <methods>
          ${(a.regressionTargets || []).map((tc: string) => `<include name="verify_${tc.toLowerCase().replace(/-/g, '_')}"/>`).join('\n          ')}
        </methods>
      </class>
    </classes>
  </test>
</suite>`;
        setRegressionRecommendation({
          riskLevel: a.riskLevel || 'High',
          targetModules: a.targetModules || [],
          riskPercent: a.riskScore || 0,
          testCasesToRun: a.regressionTargets || [],
          eclipseRunConfig: xmlConfig,
          intelligenceLog: a.intelligenceLogs || [],
          rootCauses: a.rootCauses || [],
          recommendations: a.recommendations
        });
        // Auto-populate impacted suite from regression dump
        if (a.regressionTargets?.length) {
          const suite: ImpactedSuite[] = a.regressionTargets.map((tcId: string, i: number) => ({
            tcId, title: `Regression: ${tcId}`, module: (a.targetModules || [])[i % (a.targetModules?.length || 1)] || 'Core',
            riskScore: Math.max(60, a.riskScore - i * 5), reason: 'Identified from regression dump analysis',
            included: true, isRegression: true
          }));
          setImpactedSuite(suite);
        }
        setUploadedFiles([{ name: file.name, size: `${(file.size / 1024).toFixed(1)} KB`, status: 'AI Analysis Complete ✓' }]);
        showToast('✅ Defect dump analyzed — switch to Impact tab to see regression suite');
      }
    } catch {
      setUploadedFiles([{ name: file.name, size: '', status: 'Error — retry' }]);
    } finally { setIsUploading(false); }
  };

  const triggerSampleUpload = () => {
    const csv = `Test ID,Module,Status,Error\nTC-001,Authentication,FAIL,Timeout on login\nTC-002,Billing,FAIL,Null pointer in charge\nTC-005,API Gateway,PASS,\nTC-008,File Upload,FAIL,413 payload too large\n`;
    const blob = new Blob([csv], { type: 'text/csv' });
    uploadDefectDump(new File([blob], `sample_dump_${Date.now()}.csv`, { type: 'text/csv' }));
  };

  const handleClassifyText = async () => {
    if (!pasteText.trim()) return;
    setIsClassifyingText(true);
    try {
      const r = await fetch(apiUrl('/api/quality/defects/classify-text'), {
        method: 'POST', headers: authH(), body: JSON.stringify({ text: pasteText, projectId: currentProjectId })
      });
      const d = await r.json();
      const items: ClassifiedDefect[] = (d.classified || []).map((c: any) => ({ ...c, approved: null }));
      setClassified(prev => [...items, ...prev]);
      setPanel('classify');
      showToast(`✅ ${items.length} defects classified — review in Classify tab`);
    } catch { showToast('❌ Classification failed'); }
    setIsClassifyingText(false);
  };

  const handleTmsPull = async () => {
    setIsTmsPulling(true);
    try {
      const r = await fetch(apiUrl('/api/quality/defects/tms-pull'), {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ ...tmsPullConfig, projectId: currentProjectId })
      });
      const d = await r.json();
      if (d.error) { showToast(`❌ ${d.error}`); return; }
      const items: ClassifiedDefect[] = (d.defects || []).map((def: any) => ({ ...def, approved: null }));
      if (items.length) { setClassified(prev => [...items, ...prev]); setPanel('classify'); showToast(`✅ Pulled ${items.length} defects from TMS`); }
      else showToast('No defects found — check project key / filters');
    } catch { showToast('❌ TMS connection failed'); }
    setIsTmsPulling(false);
  };

  // ── Handlers: Classify ────────────────────────────────────────────────────

  const handleLoadSampleClassify = async () => {
    setIsAiClassifying(true);
    try {
      const r = await fetch(apiUrl('/api/quality/defects/ai-classify'), {
        method: 'POST', headers: authH(), body: JSON.stringify({ useSample: true, projectId: currentProjectId })
      });
      const d = await r.json();
      const items: ClassifiedDefect[] = (d.classified || []).map((c: any) => ({ ...c, approved: null }));
      setClassified(items);
      showToast(`✅ Loaded ${items.length} sample classified defects`);
    } catch { showToast('❌ Failed to load sample'); }
    setIsAiClassifying(false);
  };

  const handleReClassifyAll = async () => {
    if (!classified.length) return;
    setIsAiClassifying(true);
    try {
      const r = await fetch(apiUrl('/api/quality/defects/ai-classify'), {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ items: classified.map(c => ({ id: c.id, title: c.title, failureReason: c.failureReason })) })
      });
      const d = await r.json();
      const updated: ClassifiedDefect[] = (d.classified || []).map((c: any) => ({ ...c, approved: null }));
      if (updated.length) setClassified(updated);
      showToast('✅ Re-classified all defects');
    } catch { showToast('❌ AI classify failed'); }
    setIsAiClassifying(false);
  };

  const approveDefect = (id: string, val: boolean) =>
    setClassified(prev => prev.map(d => d.id === id ? { ...d, approved: val } : d));

  const approveAllGenuine = () =>
    setClassified(prev => prev.map(d => d.category === 'Genuine' ? { ...d, approved: true } : d));

  const handleTmsPush = async () => {
    const toRaise = classified.filter(d => d.approved === true && d.tmsStatus !== 'pushed');
    if (!toRaise.length) { showToast('No approved defects to push'); return; }
    if (!tmsPushConfig.baseUrl && tmsPushConfig.tmsType !== 'demo') { showToast('❌ Base URL required'); return; }
    setIsPushing(true); setPushResult(null);
    try {
      const r = await fetch(apiUrl('/api/quality/defects/tms-push'), {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ ...tmsPushConfig, defects: toRaise, projectId: currentProjectId })
      });
      const d = await r.json();
      setPushResult({ pushed: d.pushed || 0, failed: d.failed || 0, urls: d.urls || [] });
      if (d.pushed) {
        setClassified(prev => prev.map(def => toRaise.find(t => t.id === def.id)
          ? { ...def, tmsStatus: 'pushed', tmsUrl: d.urls?.[0] || '' } : def));
        showToast(`✅ Pushed ${d.pushed} genuine defects to ${tmsPushConfig.tmsType.toUpperCase()}`);
      }
    } catch { showToast('❌ TMS push failed'); }
    setIsPushing(false);
  };

  // ── Handlers: Impact ──────────────────────────────────────────────────────

  const handleAnalyzeFull = async () => {
    if (!changeReq.trim()) return;
    setIsAnalyzingFull(true); setImpactedSuite([]); setImpactSummary('');
    try {
      const r = await fetch(apiUrl('/api/quality/impact/analyze-full'), {
        method: 'POST', headers: authH(),
        body: JSON.stringify({
          changeRequirement: changeReq, description: changeDesc,
          defectHistory: classified.filter(d => d.category === 'Genuine').map(d => ({ module: d.module, title: d.title })),
          projectId: currentProjectId,
          availableTCs: testCases.map(tc => ({ id: tc.id, title: tc.title, module: (tc as any).module || '' }))
        })
      });
      const d = await r.json();
      const suite: ImpactedSuite[] = (d.impactedSuite || []).map((s: any) => ({ ...s, included: s.included !== false }));
      setImpactedSuite(suite);
      setImpactSummary(d.summary || '');
      // Also run legacy impact for the impactReports panel
      await onAnalyzeImpact(changeReq, changeDesc);
      showToast(`✅ Impact analysis complete — ${suite.filter((s: ImpactedSuite) => s.included).length} TCs selected`);
    } catch { showToast('❌ Impact analysis failed'); }
    setIsAnalyzingFull(false);
  };

  const handleSendToExecution = async () => {
    const toQueue = impactedSuite.filter(s => s.included).map(s => s.tcId);
    if (!toQueue.length) { showToast('No test cases selected for execution'); return; }
    setIsQueueing(true);
    try {
      const r = await fetch(apiUrl('/api/quality/execution/queue-impact'), {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ testCaseIds: toQueue, projectId: currentProjectId, source: 'defect-impact' })
      });
      const d = await r.json();
      setQueuedRunId(d.runId || '');
      showToast(`✅ ${toQueue.length} TCs queued for execution (Run: ${d.runId})`);
      setTimeout(() => onNavigateToExecution?.(), 1500);
    } catch { showToast('❌ Failed to queue for execution'); }
    setIsQueueing(false);
  };

  // ── Handlers: Hotspot ─────────────────────────────────────────────────────

  const handlePredictSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleTitle.trim()) return;
    await onPredictHotspots(moduleTitle, moduleDesc);
    setModuleTitle(''); setModuleDesc('');
  };

  const loadClusters = async () => {
    setClustersLoading(true);
    try {
      const r = await fetch(apiUrl('/api/quality/defects/clusters'), { headers: { Authorization: `Bearer ${token()}` } });
      const d = await r.json(); setClusters(d.clusters || []);
    } catch { /* ignore */ }
    setClustersLoading(false);
  };

  const handleAddCluster = async () => {
    if (!newClusterLabel || !newClusterPattern) return;
    const r = await fetch(apiUrl('/api/quality/defects/clusters'), {
      method: 'POST', headers: authH(),
      body: JSON.stringify({ label: newClusterLabel, pattern: newClusterPattern, severity: 'Medium' })
    });
    const d = await r.json();
    if (d.success) { setClusters(prev => [...prev, d.cluster]); setNewClusterLabel(''); setNewClusterPattern(''); setShowAddCluster(false); }
  };

  const handleTriage = async () => {
    if (!triageTitle && !triageDesc) return;
    setTriaging(true); setTriageResult(null);
    try {
      const r = await fetch(apiUrl('/api/quality/defects/triage'), {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ title: triageTitle, description: triageDesc, stackTrace: triageStack })
      });
      const d = await r.json(); if (d.success) setTriageResult(d.triage);
    } catch { /* ignore */ }
    setTriaging(false);
  };

  const handleAssistant = async () => {
    if (!assistantMsg.trim()) return;
    setAssistantLoading(true); setAssistantReply('');
    try {
      const r = await fetch(apiUrl('/api/quality/assistant/chat'), {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ message: assistantMsg, module: 'defect-impact', projectId: currentProjectId })
      });
      const d = await r.json(); setAssistantReply(d.reply || d.message || 'No response');
    } catch { setAssistantReply('AI assistant unavailable'); }
    setAssistantLoading(false);
  };

  // ── Stats ─────────────────────────────────────────────────────────────────

  const genuineCount   = classified.filter(d => d.category === 'Genuine').length;
  const approvedCount  = classified.filter(d => d.approved === true).length;
  const pushedCount    = classified.filter(d => d.tmsStatus === 'pushed').length;
  const includedSuite  = impactedSuite.filter(s => s.included).length;
  const regressionSuite = impactedSuite.filter(s => s.isRegression && s.included).length;

  // ── Render ────────────────────────────────────────────────────────────────

  const navItems: { id: Panel; label: string; icon: any; badge?: number | string }[] = [
    { id: 'import',   label: '1. Import Defects',         icon: Upload,    badge: uploadedFiles.length || undefined },
    { id: 'classify', label: '2. AI Classify & Approve',  icon: Brain,     badge: classified.length || undefined },
    { id: 'impact',   label: '3. Impact & Regression',    icon: Target,    badge: includedSuite || undefined },
    { id: 'hotspot',  label: '4. Hotspot Heatmap',        icon: BarChart2, badge: defects.length || undefined },
  ];

  return (
    <div className="space-y-5 animate-fadeInUp">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 bg-slate-800 text-white text-xs rounded-xl shadow-lg border border-slate-600 animate-fadeInUp">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="glass-card p-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="panel-title flex items-center gap-2 text-base">
            <Target className="w-5 h-5 text-rose-500" />
            Defect &amp; Impact AI
            <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded font-mono border border-rose-200">Testing Workflow</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Import defect dump → AI classify → approve genuine defects → analyze regression impact → queue for Execution Engine
          </p>
        </div>
        {/* Workflow progress bar */}
        <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
          {navItems.map((n, i) => (
            <React.Fragment key={n.id}>
              <button onClick={() => setPanel(n.id)}
                className={`px-2 py-1 rounded flex items-center gap-1 transition-all border ${
                  panel === n.id ? 'bg-rose-600 text-white border-rose-600' : 'border-slate-200 hover:border-rose-300 hover:text-rose-600'
                }`}>
                <n.icon className="w-3 h-3" />
                {n.label.split('.')[0]}.
                {n.badge ? <span className="bg-white/30 px-1 rounded">{n.badge}</span> : null}
              </button>
              {i < navItems.length - 1 && <ChevronRight className="w-3 h-3 text-slate-300" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Defects Imported', value: classified.length, color: 'text-slate-700' },
          { label: 'Genuine',          value: genuineCount,      color: 'text-red-600' },
          { label: 'Approved',         value: approvedCount,     color: 'text-green-600' },
          { label: 'Pushed to TMS',    value: pushedCount,       color: 'text-purple-600' },
          { label: 'Regression Suite', value: includedSuite,     color: 'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="glass-card p-3 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">

        {/* ── Main Panel ──────────────────────────────────────────────────── */}
        <div className="xl:col-span-9 space-y-4">

          {/* Panel nav tabs */}
          <div className="flex gap-1 border-b border-slate-200 pb-0">
            {navItems.map(n => (
              <button key={n.id} onClick={() => setPanel(n.id)}
                className={`px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all flex items-center gap-1.5 ${
                  panel === n.id
                    ? 'border-rose-500 text-rose-600 bg-rose-50'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}>
                <n.icon className="w-3.5 h-3.5" />
                {n.label}
                {n.badge ? <span className="bg-slate-200 text-slate-600 text-[9px] px-1.5 rounded-full font-mono">{n.badge}</span> : null}
              </button>
            ))}
          </div>

          {/* ── Panel 1: Import ──────────────────────────────────────── */}
          {panel === 'import' && (
            <div className="glass-card p-5 space-y-4">
              <h3 className="panel-title flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-500" /> Import Defect / Failure Data
              </h3>
              <p className="text-xs text-slate-500">Upload a defect dump, paste failure logs, or pull directly from your TMS. The data will be AI-classified in Step 2.</p>

              {/* Mode selector */}
              <div className="flex gap-2">
                {(['file', 'paste', 'tms'] as const).map(m => (
                  <button key={m} onClick={() => setImportMode(m)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      importMode === m ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:border-blue-300'
                    }`}>
                    {m === 'file' ? '📁 File Upload' : m === 'paste' ? '📋 Paste Log' : '🔗 Pull from TMS'}
                  </button>
                ))}
              </div>

              {/* File upload */}
              {importMode === 'file' && (
                <div className="space-y-3">
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase mb-1 block">Source Format</label>
                      <select value={selectedFileSource} onChange={e => setSelectedFileSource(e.target.value as any)}
                        className="input-field text-xs w-full">
                        <option value="CSV">IntelliJ / CSV Regression Dump</option>
                        <option value="Excel">Excel / JIRA Export (.xlsx)</option>
                        <option value="Zephyr">Zephyr Scale Export</option>
                        <option value="JUnit XML">JUnit XML Execution Logs</option>
                        <option value="Eclipse Log">Eclipse Compilation Warnings</option>
                      </select>
                    </div>
                    <button onClick={triggerSampleUpload} disabled={isUploading}
                      className="btn-ghost text-xs flex items-center gap-1 whitespace-nowrap">
                      <Sparkles className="w-3 h-3" /> Try Sample
                    </button>
                  </div>

                  <div onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                      dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100/60 hover:border-blue-300'
                    }`}>
                    <input ref={fileInputRef} type="file" className="hidden" accept=".csv,.xlsx,.xls,.json,.xml" onChange={handleFileChange} />
                    <FileText className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">Drag &amp; drop your defect dump here</p>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono uppercase">CSV · Excel · JUnit XML · Zephyr</p>
                  </div>

                  {uploadedFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl text-xs">
                      <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                      <span className="font-semibold text-slate-700">{f.name}</span>
                      <span className="text-slate-400">{f.size}</span>
                      <span className={`ml-auto font-medium ${f.status.includes('✓') ? 'text-green-600' : f.status.includes('Error') ? 'text-red-600' : 'text-blue-600'}`}>{f.status}</span>
                    </div>
                  ))}

                  {isUploading && (
                    <div className="flex items-center gap-2 text-xs text-blue-600">
                      <Loader2 className="w-4 h-4 animate-spin" /> Analyzing dump with AI...
                    </div>
                  )}

                  {regressionRecommendation && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-800">📊 Regression Impact Analysis</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold border font-mono ${
                          regressionRecommendation.riskLevel === 'Critical' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>Risk: {regressionRecommendation.riskPercent}% — {regressionRecommendation.riskLevel}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {regressionRecommendation.targetModules.map(m => (
                          <span key={m} className="text-[10px] bg-white border border-amber-200 px-2 py-0.5 rounded font-mono text-amber-800">{m}</span>
                        ))}
                      </div>
                      <div className="text-[10px] font-mono text-slate-600">
                        <span className="font-bold text-rose-700">Regression targets: </span>
                        {regressionRecommendation.testCasesToRun.join(' · ')}
                      </div>
                      {regressionRecommendation.recommendations && (
                        <div className="text-[10px] text-blue-800 bg-blue-50 border border-blue-200 rounded p-2">
                          💡 {regressionRecommendation.recommendations}
                        </div>
                      )}
                      <div className="bg-slate-900 rounded p-2 font-mono text-[9px] text-green-400 max-h-20 overflow-y-auto">
                        {regressionRecommendation.intelligenceLog.map((l, i) => <p key={i}>{l}</p>)}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setShowConfigSnippet(v => !v)} className="btn-ghost text-[10px] flex items-center gap-1">
                          <Code className="w-3 h-3" /> {showConfigSnippet ? 'Hide' : 'View'} XML Config
                        </button>
                        <button onClick={() => {
                          const blob = new Blob([regressionRecommendation.eclipseRunConfig], { type: 'application/xml' });
                          const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
                          a.download = 'regression-suite.xml'; a.click();
                        }} className="btn-ghost text-[10px] flex items-center gap-1">
                          <Download className="w-3 h-3" /> Export XML
                        </button>
                        <button onClick={() => { setPanel('impact'); }} className="btn-primary text-[10px] flex items-center gap-1 ml-auto">
                          <ArrowRight className="w-3 h-3" /> Go to Impact Analysis →
                        </button>
                      </div>
                      {showConfigSnippet && (
                        <pre className="bg-slate-950 text-slate-300 rounded p-3 text-[9px] font-mono overflow-x-auto">{regressionRecommendation.eclipseRunConfig}</pre>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Paste log */}
              {importMode === 'paste' && (
                <div className="space-y-3">
                  <textarea value={pasteText} onChange={e => setPasteText(e.target.value)} rows={8}
                    placeholder="Paste failure logs, test run output, Jira defect list, or stack traces here...&#10;&#10;Example:&#10;TC-001: Login timeout — NullPointerException at auth.service.ts:142&#10;TC-007: Payment failed — DB connection refused after 5 retries&#10;TC-012: File upload — 413 Payload Too Large"
                    className="input-field text-xs w-full font-mono resize-y" />
                  <div className="flex gap-2">
                    <button onClick={handleClassifyText} disabled={isClassifyingText || !pasteText.trim()}
                      className="btn-primary flex items-center gap-1.5">
                      {isClassifyingText ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Classifying...</> : <><Brain className="w-3.5 h-3.5" /> Classify with AI</>}
                    </button>
                    <button onClick={() => setPasteText('')} className="btn-ghost">Clear</button>
                  </div>
                </div>
              )}

              {/* TMS pull */}
              {importMode === 'tms' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-600 uppercase mb-1 block">TMS Tool</label>
                      <select value={tmsPullConfig.tmsType} onChange={e => setTmsPullConfig(p => ({ ...p, tmsType: e.target.value }))}
                        className="input-field text-xs w-full">
                        <option value="demo">Demo Mode</option>
                        <option value="jira">Jira / Zephyr</option>
                        <option value="azure">Azure DevOps</option>
                        <option value="testrail">TestRail</option>
                        <option value="rally">Rally</option>
                      </select>
                    </div>
                    {tmsPullConfig.tmsType !== 'demo' && (
                      <>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-600 uppercase mb-1 block">Base URL</label>
                          <input value={tmsPullConfig.baseUrl} onChange={e => setTmsPullConfig(p => ({ ...p, baseUrl: e.target.value }))}
                            placeholder="https://myorg.atlassian.net" className="input-field text-xs w-full" />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-600 uppercase mb-1 block">Project Key</label>
                          <input value={tmsPullConfig.projectKey} onChange={e => setTmsPullConfig(p => ({ ...p, projectKey: e.target.value }))}
                            placeholder="PROJ" className="input-field text-xs w-full" />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-600 uppercase mb-1 block">API Token</label>
                          <input type="password" value={tmsPullConfig.token} onChange={e => setTmsPullConfig(p => ({ ...p, token: e.target.value }))}
                            placeholder="Bearer / PAT token" className="input-field text-xs w-full" />
                        </div>
                      </>
                    )}
                  </div>
                  <button onClick={handleTmsPull} disabled={isTmsPulling}
                    className="btn-primary flex items-center gap-1.5">
                    {isTmsPulling ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Pulling...</> : <><Link2 className="w-3.5 h-3.5" /> Pull Defects from TMS</>}
                  </button>
                </div>
              )}

              {classified.length > 0 && (
                <button onClick={() => setPanel('classify')} className="w-full py-2 rounded-xl border border-rose-300 text-rose-600 text-xs font-semibold hover:bg-rose-50 transition-all flex items-center justify-center gap-2">
                  <ArrowRight className="w-3.5 h-3.5" /> {classified.length} defects ready — go to Classify &amp; Approve →
                </button>
              )}
            </div>
          )}

          {/* ── Panel 2: Classify & Approve ──────────────────────────── */}
          {panel === 'classify' && (
            <div className="glass-card p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="panel-title flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-500" /> AI Defect Classification
                  <span className="badge badge-purple">{classified.length} defects</span>
                </h3>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={handleLoadSampleClassify} disabled={isAiClassifying} className="btn-ghost text-xs flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Load Sample
                  </button>
                  <button onClick={handleReClassifyAll} disabled={isAiClassifying || !classified.length} className="btn-ghost text-xs flex items-center gap-1">
                    {isAiClassifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Re-Classify All
                  </button>
                  <button onClick={approveAllGenuine} disabled={!genuineCount} className="btn-primary text-xs flex items-center gap-1">
                    <Check className="w-3 h-3" /> Approve All Genuine ({genuineCount})
                  </button>
                </div>
              </div>

              {/* Category legend */}
              <div className="flex flex-wrap gap-2">
                {Object.entries(categoryColor).map(([cat, cls]) => (
                  <span key={cat} className={`text-[10px] px-2 py-0.5 rounded border font-mono ${cls}`}>{cat}</span>
                ))}
              </div>

              {classified.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  <Brain className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  No defects imported yet — go to Import tab first or load sample
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-thin pr-1">
                  {classified.map(d => (
                    <div key={d.id} className={`p-3 rounded-xl border transition-all ${
                      d.approved === true ? 'border-green-300 bg-green-50/40' :
                      d.approved === false ? 'border-slate-200 bg-slate-50/40 opacity-60' :
                      'border-slate-200 bg-white/80'
                    }`}>
                      <div className="flex items-start gap-3">
                        {/* Approve / Reject */}
                        <div className="flex flex-col gap-1 shrink-0 mt-0.5">
                          <button onClick={() => approveDefect(d.id, true)}
                            className={`p-1 rounded ${d.approved === true ? 'bg-green-500 text-white' : 'bg-slate-100 hover:bg-green-100 text-slate-400 hover:text-green-600'}`}
                            title="Approve — raise in TMS">
                            <Check className="w-3 h-3" />
                          </button>
                          <button onClick={() => approveDefect(d.id, false)}
                            className={`p-1 rounded ${d.approved === false ? 'bg-slate-400 text-white' : 'bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-500'}`}
                            title="Reject / skip">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold font-mono ${categoryColor[d.category]}`}>{d.category}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono ${severityColor[d.severity]}`}>{d.severity}</span>
                            <span className="text-[9px] text-slate-400 font-mono">{d.module}</span>
                            <span className="text-[9px] text-slate-400 ml-auto">{d.confidence}% confidence</span>
                            {d.tmsStatus === 'pushed' && <span className="text-[9px] text-purple-600 font-bold">✅ In TMS</span>}
                          </div>
                          <p className="text-xs font-semibold text-slate-800 truncate">{d.title}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{d.failureReason}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TMS Push section */}
              {approvedCount > 0 && (
                <div className="border-t border-slate-200 pt-4">
                  <button onClick={() => setShowTmsPush(v => !v)}
                    className="flex items-center gap-2 text-xs font-semibold text-purple-600 hover:text-purple-800">
                    <Link2 className="w-3.5 h-3.5" />
                    Push {approvedCount} Approved Defects to TMS
                    <ChevronRight className={`w-3 h-3 transition-transform ${showTmsPush ? 'rotate-90' : ''}`} />
                  </button>

                  {showTmsPush && (
                    <div className="mt-3 p-4 bg-purple-50/60 border border-purple-200 rounded-xl space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] font-semibold text-slate-600 uppercase mb-1 block">TMS Type</label>
                          <select value={tmsPushConfig.tmsType} onChange={e => setTmsPushConfig(p => ({ ...p, tmsType: e.target.value }))}
                            className="input-field text-xs w-full">
                            <option value="demo">Demo Mode</option>
                            <option value="jira">Jira</option>
                            <option value="azure">Azure DevOps</option>
                            <option value="testrail">TestRail</option>
                            <option value="rally">Rally</option>
                          </select>
                        </div>
                        {tmsPushConfig.tmsType !== 'demo' && (
                          <>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-600 uppercase mb-1 block">Base URL</label>
                              <input value={tmsPushConfig.baseUrl} onChange={e => setTmsPushConfig(p => ({ ...p, baseUrl: e.target.value }))}
                                placeholder="https://myorg.atlassian.net" className="input-field text-xs w-full" />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-600 uppercase mb-1 block">Project Key</label>
                              <input value={tmsPushConfig.projectKey} onChange={e => setTmsPushConfig(p => ({ ...p, projectKey: e.target.value }))}
                                placeholder="PROJ" className="input-field text-xs w-full" />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-600 uppercase mb-1 block">API Token</label>
                              <input type="password" value={tmsPushConfig.token} onChange={e => setTmsPushConfig(p => ({ ...p, token: e.target.value }))}
                                placeholder="Bearer / PAT" className="input-field text-xs w-full" />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-600 uppercase mb-1 block">Issue Type</label>
                              <input value={tmsPushConfig.issueType} onChange={e => setTmsPushConfig(p => ({ ...p, issueType: e.target.value }))}
                                placeholder="Bug, Defect..." className="input-field text-xs w-full" />
                            </div>
                          </>
                        )}
                      </div>
                      {pushResult && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs">
                          <p className="font-bold text-green-700">✅ Pushed {pushResult.pushed} defects</p>
                          {pushResult.failed > 0 && <p className="text-red-600">⚠️ {pushResult.failed} failed</p>}
                          {pushResult.urls.slice(0, 3).map((u, i) => (
                            <a key={i} href={u} target="_blank" rel="noreferrer" className="block text-blue-600 underline truncate text-[10px]">{u}</a>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button onClick={handleTmsPush} disabled={isPushing}
                          className="btn-primary flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700">
                          {isPushing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Pushing...</> : <><Link2 className="w-3.5 h-3.5" /> Push to TMS</>}
                        </button>
                        <button onClick={() => setPanel('impact')} className="btn-ghost flex items-center gap-1.5 text-blue-600">
                          <ArrowRight className="w-3.5 h-3.5" /> Go to Impact Analysis →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Panel 3: Impact & Regression Suite ───────────────────── */}
          {panel === 'impact' && (
            <div className="space-y-4">
              {/* Change req input */}
              <div className="glass-card p-5 space-y-3">
                <h3 className="panel-title flex items-center gap-2">
                  <GitCommit className="w-4 h-4 text-blue-500" /> Change Requirement → Impact Analysis
                </h3>
                <p className="text-xs text-slate-500">
                  Describe the code/requirement change. AI will cross-reference defect history and identify the regression suite to run.
                </p>
                <div className="space-y-2">
                  <input value={changeReq} onChange={e => setChangeReq(e.target.value)}
                    placeholder="e.g. Refactored authentication service — SSO token validation logic updated"
                    className="input-field text-xs w-full" />
                  <textarea value={changeDesc} onChange={e => setChangeDesc(e.target.value)} rows={2}
                    placeholder="Additional details — modules affected, files changed, linked requirements..."
                    className="input-field text-xs w-full resize-none" />
                </div>
                <div className="flex gap-2 items-center">
                  <button onClick={handleAnalyzeFull} disabled={isAnalyzingFull || !changeReq.trim()}
                    className="btn-primary flex items-center gap-1.5">
                    {isAnalyzingFull ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing...</> : <><Target className="w-3.5 h-3.5" /> Analyze Impact</>}
                  </button>
                  {genuineCount > 0 && (
                    <span className="text-[10px] text-slate-500">Using {genuineCount} genuine defects from classification as history</span>
                  )}
                  {regressionRecommendation && !changeReq && (
                    <button onClick={() => { setChangeReq('Regression analysis from defect dump'); handleAnalyzeFull(); }}
                      className="btn-ghost text-xs flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Use Dump Analysis
                    </button>
                  )}
                </div>
                {impactSummary && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                    <span className="font-bold">AI Summary: </span>{impactSummary}
                  </div>
                )}
              </div>

              {/* Regression suite from dump */}
              {regressionRecommendation && impactedSuite.length === 0 && (
                <div className="glass-card p-4 border-l-4 border-amber-400">
                  <p className="text-xs font-bold text-amber-800 mb-2">📊 Regression Suite from Dump Analysis ({regressionRecommendation.testCasesToRun.length} targets)</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {regressionRecommendation.testCasesToRun.map(tc => (
                      <span key={tc} className="text-[10px] font-mono bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded">{tc}</span>
                    ))}
                  </div>
                  <button onClick={() => {
                    const suite: ImpactedSuite[] = regressionRecommendation.testCasesToRun.map((tcId, i) => ({
                      tcId, title: `Regression: ${tcId}`, module: regressionRecommendation.targetModules[i % regressionRecommendation.targetModules.length] || 'Core',
                      riskScore: Math.max(65, regressionRecommendation.riskPercent - i * 3), reason: 'From regression dump analysis',
                      included: true, isRegression: true
                    }));
                    setImpactedSuite(suite);
                  }} className="btn-primary text-xs flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Import as Regression Suite
                  </button>
                </div>
              )}

              {/* Impacted suite table */}
              {impactedSuite.length > 0 && (
                <div className="glass-card p-5 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="panel-title flex items-center gap-2">
                      <Shield className="w-4 h-4 text-green-500" />
                      Regression Suite
                      <span className="badge badge-green">{includedSuite} selected</span>
                      {regressionSuite > 0 && <span className="badge badge-amber">{regressionSuite} from dump</span>}
                    </h3>
                    <div className="flex gap-2">
                      <button onClick={() => setImpactedSuite(s => s.map(t => ({ ...t, included: true })))} className="btn-ghost text-xs">Select All</button>
                      <button onClick={() => setImpactedSuite(s => s.map(t => ({ ...t, included: false })))} className="btn-ghost text-xs">Deselect All</button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin pr-1">
                    {impactedSuite.map((s, i) => (
                      <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        s.included ? 'border-blue-200 bg-blue-50/40' : 'border-slate-200 bg-slate-50 opacity-60'
                      }`}>
                        <input type="checkbox" checked={s.included}
                          onChange={e => setImpactedSuite(prev => prev.map((t, j) => j === i ? { ...t, included: e.target.checked } : t))}
                          className="w-4 h-4 accent-blue-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-mono text-blue-600 font-bold">{s.tcId}</span>
                            <span className="text-[10px] text-slate-500">{s.module}</span>
                            {s.isRegression && <span className="text-[9px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 rounded font-mono">REGRESSION</span>}
                            <span className={`ml-auto text-[10px] font-bold font-mono ${s.riskScore >= 80 ? 'text-red-600' : s.riskScore >= 60 ? 'text-orange-600' : 'text-green-600'}`}>
                              {s.riskScore}% risk
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 font-medium truncate mt-0.5">{s.title}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{s.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Risk heatmap mini */}
                  <div className="flex gap-1 flex-wrap">
                    {['Critical', 'High', 'Medium', 'Low'].map(level => {
                      const lvlCount = impactedSuite.filter(s => s.included && (
                        level === 'Critical' ? s.riskScore >= 90 :
                        level === 'High' ? s.riskScore >= 70 :
                        level === 'Medium' ? s.riskScore >= 50 : s.riskScore < 50
                      )).length;
                      return lvlCount > 0 ? (
                        <span key={level} className={`text-[10px] px-2 py-1 rounded border font-mono font-bold ${
                          level === 'Critical' ? 'bg-red-50 text-red-700 border-red-200' :
                          level === 'High' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                          level === 'Medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                          'bg-green-50 text-green-700 border-green-200'
                        }`}>{lvlCount} {level}</span>
                      ) : null;
                    })}
                  </div>

                  {/* Send to Execution Engine CTA */}
                  <div className="border-t border-slate-200 pt-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          🚀 Ready to Run — {includedSuite} test cases selected
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          New automation suite + regression targets will be queued in the Execution Engine
                        </p>
                      </div>
                      <button onClick={handleSendToExecution} disabled={isQueueing || !includedSuite}
                        className="btn-primary flex items-center gap-2 text-sm px-5 py-2.5 bg-green-600 hover:bg-green-700 shadow-lg">
                        {isQueueing ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Queuing...</>
                        ) : (
                          <><Cpu className="w-4 h-4" /> Send to Execution Engine <ArrowRight className="w-4 h-4" /></>
                        )}
                      </button>
                    </div>
                    {queuedRunId && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Run queued: <span className="font-mono font-bold">{queuedRunId}</span> — navigating to Execution Engine...
                      </div>
                    )}
                  </div>

                  {/* Export options */}
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => {
                      const csv = ['TC ID,Title,Module,Risk Score,Reason', ...impactedSuite.filter(s => s.included).map(s => `${s.tcId},"${s.title}",${s.module},${s.riskScore},"${s.reason}"`)].join('\n');
                      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'regression-suite.csv'; a.click();
                    }} className="btn-ghost text-[10px] flex items-center gap-1">
                      <Download className="w-3 h-3" /> Export Suite CSV
                    </button>
                    <button onClick={() => exportDefects('csv')} className="btn-ghost text-[10px] flex items-center gap-1">
                      <Download className="w-3 h-3" /> Export Defects CSV
                    </button>
                  </div>
                </div>
              )}

              {/* Legacy impact reports */}
              {impactReports.length > 0 && (
                <div className="glass-card p-5 space-y-3">
                  <h3 className="panel-title flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-500" /> Past Impact Reports
                    <span className="chip">{impactReports.length}</span>
                  </h3>
                  <div className="space-y-2">
                    {impactReports.map((rep, idx) => {
                      const isActive = activeReportIndex === idx;
                      return (
                        <div key={idx} onClick={() => setActiveReportIndex(idx)}
                          className={`border rounded-xl p-3 cursor-pointer transition-all ${isActive ? 'bg-blue-50/40 border-blue-400' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-800 truncate max-w-[280px]">{rep.changeTrigger}</span>
                            <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold border ${rep.riskScore > 75 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                              Risk: {rep.riskScore}%
                            </span>
                          </div>
                          {isActive && (
                            <div className="mt-3 pt-3 border-t border-slate-200 text-xs space-y-2">
                              <div className="flex justify-between text-[11px] font-mono text-slate-500">
                                <span>Impacted Domain:</span>
                                <span className="text-blue-600 font-bold">{rep.impactedModule}</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {rep.impactedTestCaseIds.map(tcId => (
                                  <span key={tcId} className="badge badge-blue px-2 py-0.5 rounded text-[10px] font-bold font-mono">{tcId}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Panel 4: Hotspot Heatmap ──────────────────────────────── */}
          {panel === 'hotspot' && (
            <div className="space-y-4">
              {/* Heatmap grid */}
              <div className="glass-card p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="panel-title flex items-center gap-2">
                      <Crosshair className="w-4 h-4 text-rose-600" /> AI Defect Hotspot Heatmap
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Risk scores from historical defect patterns and module failure frequency.</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => exportDefects('csv')} className="btn-ghost text-[10px] flex items-center gap-1"><Download className="w-3 h-3" />CSV</button>
                    <button onClick={() => exportDefects('json')} className="btn-ghost text-[10px] flex items-center gap-1"><FileJson className="w-3 h-3" />JSON</button>
                  </div>
                </div>

                {defects.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-sm">
                    <BarChart2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    No hotspot data yet — use "Forecast New Module Risk" below
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 border border-slate-200 rounded-xl">
                    {defects.map((d, idx) => {
                      const isHigh = d.predictedRiskScore > 75;
                      const isMed = d.predictedRiskScore > 50 && d.predictedRiskScore <= 75;
                      return (
                        <div key={idx} className={`relative p-3 rounded-xl border transition-all hover:scale-[1.02] cursor-default flex flex-col justify-between h-28 ${
                          isHigh ? 'bg-rose-50 border-rose-300 shadow-sm shadow-rose-200/50' :
                          isMed ? 'bg-amber-50/70 border-amber-300' : 'bg-white border-slate-200'}`}>
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400">H-{idx + 10}</span>
                              <span className={`text-[10px] font-mono font-bold ${isHigh ? 'text-rose-600' : isMed ? 'text-amber-600' : 'text-slate-500'}`}>{d.predictedRiskScore}%</span>
                            </div>
                            <h4 className="text-xs font-semibold text-slate-800 line-clamp-1">{d.moduleName}</h4>
                            <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 italic">{d.recommendation}</p>
                          </div>
                          <div className="flex justify-between text-[8px] font-mono text-slate-400 pt-1 border-t border-slate-100">
                            <span>Defects: {d.historicalDefectsCount}</span>
                            <span className="truncate max-w-[65px]">{d.commonFailureType?.split(',')[0]}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Forecast form */}
                <form onSubmit={handlePredictSubmit} className="mt-4 space-y-3 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block">Forecast New Module Risk</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input type="text" placeholder="Module e.g. JWT Token Vault" value={moduleTitle} onChange={e => setModuleTitle(e.target.value)}
                      className="input-field text-xs" />
                    <input type="text" placeholder="Features / files touched" value={moduleDesc} onChange={e => setModuleDesc(e.target.value)}
                      className="input-field text-xs" />
                  </div>
                  <button type="submit" className="btn-primary w-full flex items-center justify-center gap-1.5 text-xs">
                    <Sparkles className="w-3.5 h-3.5" /> Model Predicted Defect Index
                  </button>
                </form>
              </div>

              {/* Root Cause Clusters */}
              <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-bold text-slate-700">Root Cause Cluster Grouping</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={loadClusters} className="p-1 rounded hover:bg-slate-100" title="Refresh">
                      <RefreshCw className={`w-3 h-3 text-slate-400 ${clustersLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={() => setShowAddCluster(s => !s)} className="btn-primary text-[10px] flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Add Cluster
                    </button>
                  </div>
                </div>
                {showAddCluster && (
                  <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                    <input value={newClusterLabel} onChange={e => setNewClusterLabel(e.target.value)}
                      placeholder="Cluster label (e.g. UI Rendering Failures)" className="input-field text-xs w-full" />
                    <input value={newClusterPattern} onChange={e => setNewClusterPattern(e.target.value)}
                      placeholder="Pattern keywords (e.g. timeout|element not found)" className="input-field text-xs w-full" />
                    <button onClick={handleAddCluster} className="btn-primary text-[10px]">Save Cluster</button>
                  </div>
                )}
                <div className="space-y-2">
                  {clustersLoading ? <div className="text-center py-4 text-slate-400 text-xs">Loading...</div> :
                    clusters.length === 0 ? <div className="text-center py-4 text-slate-400 text-xs">No clusters yet</div> :
                    clusters.map(cl => (
                      <div key={cl.id} className="border border-blue-100 rounded-lg p-3 bg-blue-50/40">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Tag className="w-3 h-3 text-blue-500" />
                            <span className="text-xs font-bold text-slate-700">{cl.label}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono font-bold ${
                              cl.severity === 'High' || cl.severity === 'Critical' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              cl.severity === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-green-50 text-green-700 border-green-200'
                            }`}>{cl.severity}</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500">{cl.count} defects</span>
                        </div>
                        <div className="mt-1 text-[10px] font-mono text-slate-500">Pattern: <span className="text-blue-600">{cl.pattern}</span></div>
                        {cl.suggestedFix && <div className="mt-1 text-[10px] text-slate-600 italic">💡 {cl.suggestedFix}</div>}
                      </div>
                    ))
                  }
                </div>
              </div>

              {/* AI Defect Triage */}
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Wand2 className="w-4 h-4 text-rose-500" />
                  <span className="text-xs font-bold text-slate-700">AI Defect Triage Assistant</span>
                </div>
                <div className="space-y-2 mb-3">
                  <input value={triageTitle} onChange={e => setTriageTitle(e.target.value)}
                    placeholder="Defect title (e.g. Login button unresponsive on Safari)" className="input-field text-xs w-full" />
                  <textarea value={triageDesc} onChange={e => setTriageDesc(e.target.value)} placeholder="Description / steps to reproduce…"
                    rows={2} className="input-field text-xs w-full resize-none" />
                  <textarea value={triageStack} onChange={e => setTriageStack(e.target.value)} placeholder="Stack trace (optional)…"
                    rows={2} className="input-field text-xs w-full resize-none font-mono" />
                  <button onClick={handleTriage} disabled={triaging || (!triageTitle && !triageDesc)}
                    className="btn-primary text-xs flex items-center gap-1.5">
                    {triaging ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                    {triaging ? 'Triaging…' : 'Triage with AI'}
                  </button>
                </div>
                {triageResult && (
                  <div className="border border-rose-200 rounded-lg p-3 bg-rose-50/40 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-rose-600 text-white">{triageResult.priority}</span>
                      <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-slate-700 text-white">{triageResult.category}</span>
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded border ${
                        triageResult.actualSeverity === 'Critical' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>{triageResult.actualSeverity}</span>
                      <span className="text-[9px] text-slate-500 ml-auto">Confidence: {Math.round((triageResult.confidence || 0) * 100)}%</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div><span className="text-slate-500">Owner:</span> <span className="font-bold text-slate-700">{triageResult.suggestedOwner}</span></div>
                      <div><span className="text-slate-500">Est. fix:</span> <span className="font-bold text-slate-700">{triageResult.estimatedFixTime}</span></div>
                    </div>
                    <div className="text-[10px] text-slate-700">
                      <span className="font-bold text-slate-500">Root cause: </span>{triageResult.rootCauseSuggestion}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Right Sidebar ──────────────────────────────────────────────────── */}
        <div className="xl:col-span-3 space-y-4">

          {/* Workflow guide */}
          <div className="glass-card p-4">
            <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-500" /> Workflow Guide
            </h4>
            <div className="space-y-2">
              {[
                { step: '1', label: 'Import defect dump / paste / TMS pull', done: uploadedFiles.length > 0 || classified.length > 0 },
                { step: '2', label: 'AI classify — approve genuine defects', done: approvedCount > 0 },
                { step: '3', label: 'Analyze impact → regression suite', done: impactedSuite.length > 0 },
                { step: '4', label: 'Send suite to Execution Engine', done: !!queuedRunId },
              ].map(s => (
                <div key={s.step} className={`flex items-start gap-2 text-[10px] ${s.done ? 'text-green-700' : 'text-slate-500'}`}>
                  <span className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5 ${s.done ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {s.done ? '✓' : s.step}
                  </span>
                  {s.label}
                </div>
              ))}
            </div>
            {queuedRunId && (
              <button onClick={onNavigateToExecution} className="w-full mt-3 btn-primary text-xs flex items-center justify-center gap-1">
                <Cpu className="w-3 h-3" /> Go to Execution Engine
              </button>
            )}
          </div>

          {/* Quick stats */}
          <div className="glass-card p-4">
            <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-2">
              <BarChart2 className="w-3.5 h-3.5 text-blue-500" /> Classification Stats
            </h4>
            {classified.length === 0 ? (
              <p className="text-[10px] text-slate-400">Import defects to see stats</p>
            ) : (
              <div className="space-y-2">
                {(['Genuine', 'Flaky', 'Environment', 'DataSetup', 'Automation'] as const).map(cat => {
                  const count = classified.filter(d => d.category === cat).length;
                  const pct = classified.length ? Math.round(count / classified.length * 100) : 0;
                  return count > 0 ? (
                    <div key={cat}>
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className={`font-mono font-bold ${categoryColor[cat].split(' ')[1]}`}>{cat}</span>
                        <span className="text-slate-500">{count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full rounded-full ${cat === 'Genuine' ? 'bg-red-500' : cat === 'Flaky' ? 'bg-yellow-500' : cat === 'Environment' ? 'bg-blue-500' : cat === 'DataSetup' ? 'bg-purple-500' : 'bg-orange-500'}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  ) : null;
                })}
              </div>
            )}
          </div>

          {/* Regression suite summary */}
          {impactedSuite.length > 0 && (
            <div className="glass-card p-4 border-l-4 border-green-400">
              <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-green-500" /> Suite Summary
              </h4>
              <div className="space-y-1 text-[10px] text-slate-600">
                <div className="flex justify-between"><span>Total TCs:</span><span className="font-bold text-blue-600">{impactedSuite.length}</span></div>
                <div className="flex justify-between"><span>Selected:</span><span className="font-bold text-green-600">{includedSuite}</span></div>
                <div className="flex justify-between"><span>From dump:</span><span className="font-bold text-amber-600">{regressionSuite}</span></div>
                <div className="flex justify-between"><span>Avg risk:</span><span className="font-bold text-rose-600">{impactedSuite.length ? Math.round(impactedSuite.reduce((a, s) => a + s.riskScore, 0) / impactedSuite.length) : 0}%</span></div>
              </div>
              <button onClick={handleSendToExecution} disabled={isQueueing || !includedSuite}
                className="w-full mt-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all">
                {isQueueing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Cpu className="w-3 h-3" />}
                Send to Execution Engine
              </button>
            </div>
          )}

          {/* AI Assistant */}
          <div className="glass-card p-4">
            <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-2">
              <Bot className="w-3.5 h-3.5 text-purple-500" /> AI Assistant
            </h4>
            <textarea value={assistantMsg} onChange={e => setAssistantMsg(e.target.value)} rows={3}
              placeholder="Ask about defect patterns, regression strategy, impact analysis..."
              className="input-field text-xs w-full resize-none mb-2" />
            <button onClick={handleAssistant} disabled={assistantLoading || !assistantMsg.trim()}
              className="btn-primary w-full text-xs flex items-center justify-center gap-1.5">
              {assistantLoading ? <><Loader2 className="w-3 h-3 animate-spin" /> Thinking...</> : <><Sparkles className="w-3 h-3" /> Ask AI</>}
            </button>
            {assistantReply && (
              <div className="mt-2 p-2.5 bg-purple-50 border border-purple-200 rounded-lg text-[10px] text-purple-900 whitespace-pre-wrap">
                {assistantReply}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
