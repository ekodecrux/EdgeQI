import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Plus,
  HelpCircle,
  CheckCircle,
  Cpu,
  AlertTriangle,
  Play,
  RefreshCcw,
  Filter,
  Check,
  Clipboard,
  Settings2,
  TableProperties,
  Edit2,
  Download,
  FileJson,
  FileText,
  RefreshCw,
  Copy,
  Upload,
  X,
  ThumbsUp,
  ThumbsDown,
  Tag,
  ArrowRight,
  Zap,
  BarChart2,
  Bot,
  Link2,
  ChevronRight,
  ChevronDown,
  Layers,
  ClipboardList,
  CheckSquare,
  Square,
  Globe,
  AlignLeft,
  BookOpen,
  RotateCcw,
} from 'lucide-react';
import { TestCase, RequirementDoc } from '../types';
import VoicePromptBar from './VoicePromptBar';

// ── Interfaces ────────────────────────────────────────────────────────────────

interface Scenario {
  id: string;
  title: string;
  type: 'Positive' | 'Negative' | 'Edge' | 'Boundary';
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  description: string;
  requirementRef?: string;
  approved: boolean | null; // null = not reviewed, true = approved, false = rejected
}

interface TestCaseGeneratorPageProps {
  testCases: TestCase[];
  requirements: RequirementDoc[];
  onTriggerRerun: (id: string) => void;
  onApplyHeal: (id: string) => void;
  onAddManualTestCase?: (tc: TestCase) => void;
  onUpdateTestCase?: (tc: TestCase) => void;
  currentProjectId?: string;
  currentSprintId?: string;
  onNavigateToScripts?: () => void;
}

// ── Wizard step type ──────────────────────────────────────────────────────────

type WizardStep = 'source' | 'scenarios' | 'approve' | 'details';

const STEP_LABELS: { key: WizardStep; label: string; icon: React.ElementType }[] = [
  { key: 'source',    label: '1. Requirements Source', icon: BookOpen },
  { key: 'scenarios', label: '2. Generate Scenarios',   icon: Sparkles },
  { key: 'approve',   label: '3. Review & Approve',     icon: CheckSquare },
  { key: 'details',   label: '4. Full Test Cases',       icon: ClipboardList },
];

// ── Priority / Type badge helpers ─────────────────────────────────────────────

const priorityColor: Record<string, string> = {
  P0: 'bg-red-100 text-red-700 border border-red-200',
  P1: 'bg-orange-100 text-orange-700 border border-orange-200',
  P2: 'bg-blue-100 text-blue-700 border border-blue-200',
  P3: 'bg-slate-100 text-slate-600 border border-slate-200',
};

const typeColor: Record<string, string> = {
  Positive:  'bg-green-100 text-green-700',
  Negative:  'bg-red-100 text-red-700',
  Edge:      'bg-purple-100 text-purple-700',
  Boundary:  'bg-yellow-100 text-yellow-700',
};

// ── Main Component ─────────────────────────────────────────────────────────────

export default function TestCaseGeneratorPage({
  testCases,
  requirements,
  onTriggerRerun,
  onApplyHeal,
  onAddManualTestCase,
  onUpdateTestCase,
  currentProjectId = 'ALL',
  currentSprintId,
  onNavigateToScripts,
}: TestCaseGeneratorPageProps) {

  // ── Wizard navigation ──────────────────────────────────────────────────────
  const [wizardStep, setWizardStep] = useState<WizardStep>('source');

  // ── Source step state ──────────────────────────────────────────────────────
  type SourceMode = 'existing' | 'text' | 'url' | 'file';
  const [sourceMode, setSourceMode] = useState<SourceMode>('existing');
  const [selectedReqIds, setSelectedReqIds] = useState<Set<string>>(new Set());
  const [pastedText, setPastedText] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceUrlLoading, setSourceUrlLoading] = useState(false);
  const [fetchedUrlContent, setFetchedUrlContent] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileContent, setUploadedFileContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Scenario generation step ───────────────────────────────────────────────
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [generatingScenarios, setGeneratingScenarios] = useState(false);
  const [scenarioError, setScenarioError] = useState('');
  const [scenarioCount, setScenarioCount] = useState(8);
  const [includeTypes, setIncludeTypes] = useState<Set<string>>(new Set(['Positive', 'Negative', 'Edge', 'Boundary']));

  // ── Approve step ───────────────────────────────────────────────────────────
  const [approvalFeedback, setApprovalFeedback] = useState('');

  // ── Details generation step ────────────────────────────────────────────────
  const [generatedTCs, setGeneratedTCs] = useState<TestCase[]>([]);
  const [generatingDetails, setGeneratingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [selectedTC, setSelectedTC] = useState<TestCase | null>(null);

  // ── TMS Push state ─────────────────────────────────────────────────────────
  const [showTmsPushPanel, setShowTmsPushPanel] = useState(false);
  const [tmsPushConfig, setTmsPushConfig] = useState({ tmsType: 'jira', baseUrl: '', projectKey: '', token: '', testCaseType: 'Test' });
  const [tmsPushing, setTmsPushing] = useState(false);
  const [tmsPushResult, setTmsPushResult] = useState<{ pushed: number; failed: number; urls: string[] } | null>(null);

  // ── Existing TC list (from props) ──────────────────────────────────────────
  const [localTestCases, setLocalTestCases] = useState<TestCase[]>(testCases);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [tcViewMode, setTcViewMode] = useState<'wizard' | 'list'>('wizard');
  const [feedback, setFeedback] = useState('');

  // ── Feasibility ───────────────────────────────────────────────────────────
  const [showFeasibilityPanel, setShowFeasibilityPanel] = useState(false);
  const [feasibilityRunning, setFeasibilityRunning] = useState(false);
  const [feasibilityResults, setFeasibilityResults] = useState<any[]>([]);
  const [feasibilitySummary, setFeasibilitySummary] = useState<any>(null);

  // ── Sync with parent testCases prop ───────────────────────────────────────
  useEffect(() => {
    setLocalTestCases(testCases);
  }, [testCases]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const token = () => localStorage.getItem('iq_token') || '';
  const authH = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

  const toast = (msg: string, ms = 3500) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), ms);
  };

  // ── Source step helpers ───────────────────────────────────────────────────

  const filteredRequirements = currentProjectId === 'ALL'
    ? requirements
    : requirements.filter(r => !r.projectId || r.projectId === currentProjectId);

  const toggleReqSelection = (id: string) => {
    setSelectedReqIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllReqs = () => {
    setSelectedReqIds(new Set(filteredRequirements.map(r => r.id)));
  };

  const clearReqSelection = () => setSelectedReqIds(new Set());

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setUploadedFileContent(ev.target?.result as string || '');
    reader.readAsText(file);
  };

  const handleFetchUrl = async () => {
    if (!sourceUrl.trim()) return;
    setSourceUrlLoading(true);
    setFetchedUrlContent('');
    try {
      const res = await fetch('/api/quality/requirements/fetch-url', {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify({ url: sourceUrl }),
      });
      const data = await res.json();
      if (data.content) {
        setFetchedUrlContent(data.content);
        toast(`✅ Fetched content from URL (${data.content.length} chars)`);
      } else {
        setFetchedUrlContent('');
        toast(`⚠️ Could not fetch content: ${data.error || 'unknown error'}`);
      }
    } catch (e: any) {
      toast(`⚠️ Fetch failed: ${e.message}`);
    } finally {
      setSourceUrlLoading(false);
    }
  };

  // Compose the requirements text to send to AI from whatever source mode is active
  const buildRequirementsPayload = (): string => {
    if (sourceMode === 'existing') {
      const selected = filteredRequirements.filter(r => selectedReqIds.has(r.id));
      if (selected.length === 0) return '';
      return selected.map(r => `## ${r.title}\n${r.content}`).join('\n\n---\n\n');
    }
    if (sourceMode === 'text') return pastedText.trim();
    if (sourceMode === 'url') return fetchedUrlContent.trim();
    if (sourceMode === 'file') return uploadedFileContent.trim();
    return '';
  };

  const canProceedToScenarios = (): boolean => {
    if (sourceMode === 'existing') return selectedReqIds.size > 0;
    if (sourceMode === 'text') return pastedText.trim().length > 10;
    if (sourceMode === 'url') return fetchedUrlContent.length > 10;
    if (sourceMode === 'file') return uploadedFileContent.length > 10;
    return false;
  };

  // ── Scenario generation ───────────────────────────────────────────────────

  const handleGenerateScenarios = async () => {
    const requirementsText = buildRequirementsPayload();
    if (!requirementsText) {
      setScenarioError('No requirements content found. Go back and select/enter requirements.');
      return;
    }
    setGeneratingScenarios(true);
    setScenarioError('');
    setScenarios([]);
    try {
      const res = await fetch('/api/quality/testcases/generate-scenarios', {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify({
          requirementsText,
          count: scenarioCount,
          types: Array.from(includeTypes),
          projectId: currentProjectId,
        }),
      });
      const data = await res.json();
      if (data.scenarios && Array.isArray(data.scenarios)) {
        setScenarios(data.scenarios.map((s: any) => ({ ...s, approved: null })));
        setWizardStep('approve');
      } else {
        setScenarioError(data.error || 'AI returned no scenarios. Please try again.');
      }
    } catch (e: any) {
      setScenarioError(`Generation failed: ${e.message}`);
    } finally {
      setGeneratingScenarios(false);
    }
  };

  // ── Approval step ─────────────────────────────────────────────────────────

  const toggleApproval = (id: string, value: boolean) => {
    setScenarios(prev => prev.map(s => s.id === id ? { ...s, approved: value } : s));
  };

  const approveAll = () => setScenarios(prev => prev.map(s => ({ ...s, approved: true })));
  const rejectAll  = () => setScenarios(prev => prev.map(s => ({ ...s, approved: false })));

  const approvedScenarios = scenarios.filter(s => s.approved === true);
  const canGenerateDetails = approvedScenarios.length > 0;

  // ── Details generation ────────────────────────────────────────────────────

  const handleGenerateDetails = async () => {
    if (!canGenerateDetails) return;
    setGeneratingDetails(true);
    setDetailsError('');
    setGeneratedTCs([]);
    try {
      const res = await fetch('/api/quality/testcases/generate-details', {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify({
          scenarios: approvedScenarios,
          requirementsText: buildRequirementsPayload(),
          projectId: currentProjectId,
        }),
      });
      const data = await res.json();
      if (data.testCases && Array.isArray(data.testCases)) {
        setGeneratedTCs(data.testCases);
        setWizardStep('details');
      } else {
        setDetailsError(data.error || 'AI returned no test cases. Please try again.');
      }
    } catch (e: any) {
      setDetailsError(`Generation failed: ${e.message}`);
    } finally {
      setGeneratingDetails(false);
    }
  };

  // ── Save generated TCs to app state ──────────────────────────────────────

  const handleSaveAllGenerated = () => {
    generatedTCs.forEach(tc => onAddManualTestCase?.({ ...tc, projectId: currentProjectId }));
    setLocalTestCases(prev => [...generatedTCs.map(tc => ({ ...tc, projectId: currentProjectId })), ...prev]);
    toast(`✅ Saved ${generatedTCs.length} test cases to project!`);
    // Reset wizard for another round
    setTimeout(() => {
      setWizardStep('source');
      setGeneratedTCs([]);
      setScenarios([]);
      setSelectedReqIds(new Set());
      setPastedText('');
      setFetchedUrlContent('');
      setUploadedFileContent('');
    }, 2000);
  };

  // ── TMS Push handler ──────────────────────────────────────────────────────

  const handlePushToTMS = async () => {
    if (generatedTCs.length === 0) { toast('❌ No test cases to push'); return; }
    if (!tmsPushConfig.baseUrl && tmsPushConfig.tmsType !== 'demo') { toast('❌ TMS Base URL required'); return; }
    setTmsPushing(true);
    setTmsPushResult(null);
    try {
      const res = await fetch('/api/quality/integrations/tms/push-testcases', {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify({ ...tmsPushConfig, testCases: generatedTCs }),
      });
      const data = await res.json();
      if (data.pushed !== undefined) {
        setTmsPushResult({ pushed: data.pushed, failed: data.failed || 0, urls: data.urls || [] });
        toast(`✅ Pushed ${data.pushed} test cases to ${tmsPushConfig.tmsType.toUpperCase()}`);
      } else {
        toast(`❌ TMS push failed: ${data.error || 'Unknown error'}`);
      }
    } catch (e: any) {
      toast(`❌ Network error: ${e.message}`);
    } finally {
      setTmsPushing(false);
    }
  };

  // ── Feasibility analysis ──────────────────────────────────────────────────

  const runFeasibilityAnalysis = async () => {
    if (localTestCases.length === 0) return;
    setFeasibilityRunning(true);
    setFeasibilityResults([]);
    setFeasibilitySummary(null);
    try {
      const res = await fetch('/api/quality/testcases/feasibility-analysis', {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify({
          test_cases: localTestCases.slice(0, 30).map(tc => ({
            id: tc.id, title: tc.title, type: tc.type,
            steps: tc.steps?.length || 0, priority: tc.priority,
          })),
        }),
      });
      const data = await res.json();
      if (data.results) {
        setFeasibilityResults(data.results);
        setFeasibilitySummary(data.summary);
        setLocalTestCases(prev => prev.map(tc => {
          const r = data.results.find((x: any) => x.id === tc.id);
          return r
            ? { ...tc, automationStatus: r.verdict === 'Automatable' ? 'Automatable' : r.verdict === 'Manual Only' ? 'Needs Manual' : tc.automationStatus, confidenceScore: r.confidence_score ?? tc.confidenceScore }
            : tc;
        }));
      }
    } catch (e: any) {
      setFeasibilitySummary({ error: e.message });
    } finally { setFeasibilityRunning(false); }
  };

  // ── Export ────────────────────────────────────────────────────────────────

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const params = new URLSearchParams({ format });
      if (currentProjectId && currentProjectId !== 'ALL') params.set('projectId', currentProjectId);
      const res = await fetch(`/api/quality/testcases/export?${params}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `testcases-export.${format}`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      toast(`Exported test cases as ${format.toUpperCase()}`);
    } catch (e: any) {
      toast(`Export failed: ${e.message}`);
    }
  };

  // ── Filtered TC list ──────────────────────────────────────────────────────

  const categories = ['all', 'Positive', 'Negative', 'Edge', 'Boundary'];
  const filteredCases = localTestCases.filter(tc =>
    (activeCategory === 'all' || tc.type === activeCategory)
  );

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderStepIndicator = () => (
    <div className="flex items-center gap-0 mb-6">
      {STEP_LABELS.map((step, idx) => {
        const currentIdx = STEP_LABELS.findIndex(s => s.key === wizardStep);
        const isActive    = step.key === wizardStep;
        const isCompleted = idx < currentIdx;
        const Icon = step.icon;
        return (
          <React.Fragment key={step.key}>
            <button
              onClick={() => isCompleted ? setWizardStep(step.key) : undefined}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${isActive    ? 'bg-blue-600 text-white shadow-md' :
                  isCompleted ? 'bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer' :
                                'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{step.label}</span>
              {isCompleted && <Check className="w-3 h-3 ml-0.5" />}
            </button>
            {idx < STEP_LABELS.length - 1 && (
              <ChevronRight className={`w-4 h-4 shrink-0 mx-0.5 ${isCompleted ? 'text-green-400' : 'text-slate-300'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  // ── STEP 1: Requirements Source ───────────────────────────────────────────

  const renderSourceStep = () => (
    <div className="space-y-4 animate-fadeInUp">
      <div className="glass-card p-5">
        <h3 className="panel-title flex items-center gap-2 mb-1">
          <BookOpen className="w-4 h-4 text-blue-500" />
          Requirements Source
          <span className="chip">Step 1</span>
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Choose where the AI should pull requirements from to generate test scenarios.
        </p>

        {/* Source mode tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {[
            { key: 'existing', label: 'From Requirements Tab', icon: Layers },
            { key: 'text',     label: 'Paste Text',            icon: AlignLeft },
            { key: 'url',      label: 'From URL',              icon: Globe },
            { key: 'file',     label: 'Upload File',           icon: Upload },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSourceMode(key as SourceMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                ${sourceMode === key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Source: Existing Requirements */}
        {sourceMode === 'existing' && (
          <div>
            {filteredRequirements.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs font-mono border-2 border-dashed border-slate-200 rounded-xl">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No requirements found for this project.
                <br />Go to the <strong>Requirements</strong> tab to upload or add requirements first.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500">{filteredRequirements.length} requirement(s) available — {selectedReqIds.size} selected</span>
                  <div className="flex gap-2">
                    <button onClick={selectAllReqs} className="text-xs text-blue-600 hover:underline">Select All</button>
                    <span className="text-slate-300">|</span>
                    <button onClick={clearReqSelection} className="text-xs text-slate-500 hover:underline">Clear</button>
                  </div>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin pr-1">
                  {filteredRequirements.map(req => {
                    const isSelected = selectedReqIds.has(req.id);
                    return (
                      <div
                        key={req.id}
                        onClick={() => toggleReqSelection(req.id)}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all
                          ${isSelected
                            ? 'border-blue-400 bg-blue-50/60 glow-blue'
                            : 'border-slate-200 bg-white/60 hover:border-blue-300'}`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {isSelected
                            ? <CheckSquare className="w-4 h-4 text-blue-500" />
                            : <Square className="w-4 h-4 text-slate-400" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-800 truncate">{req.title}</p>
                          <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{req.content?.substring(0, 120)}…</p>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono
                              ${req.sourceType === 'file'    ? 'bg-purple-100 text-purple-700' :
                                req.sourceType === 'url'     ? 'bg-blue-100 text-blue-700' :
                                req.sourceType === 'voice'   ? 'bg-green-100 text-green-700' :
                                                               'bg-slate-100 text-slate-600'}`}>
                              {req.sourceType}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono">{req.id}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Source: Paste Text */}
        {sourceMode === 'text' && (
          <div>
            <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">
              Paste requirements, user stories, or feature descriptions
            </label>
            <textarea
              value={pastedText}
              onChange={e => setPastedText(e.target.value)}
              placeholder={`Example:\n\nAs a user, I want to log in with email and password so that I can access my account.\n\nAcceptance criteria:\n- Valid credentials → redirect to dashboard\n- Invalid password → show "Invalid credentials" error\n- 3 failed attempts → lock account for 15 minutes`}
              rows={10}
              className="input-glass w-full font-mono text-xs"
            />
            <p className="text-[10px] text-slate-400 mt-1">{pastedText.length} characters</p>
          </div>
        )}

        {/* Source: URL */}
        {sourceMode === 'url' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                value={sourceUrl}
                onChange={e => setSourceUrl(e.target.value)}
                placeholder="https://confluence.company.com/requirements/feature-x"
                className="input-glass flex-1"
              />
              <button
                onClick={handleFetchUrl}
                disabled={!sourceUrl.trim() || sourceUrlLoading}
                className="btn-primary flex items-center gap-1.5 shrink-0"
              >
                {sourceUrlLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                {sourceUrlLoading ? 'Fetching…' : 'Fetch'}
              </button>
            </div>
            {fetchedUrlContent && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                <p className="text-xs text-green-700 font-medium mb-1">✅ Content fetched ({fetchedUrlContent.length} chars)</p>
                <pre className="text-[10px] text-green-800 font-mono whitespace-pre-wrap line-clamp-5">
                  {fetchedUrlContent.substring(0, 400)}…
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Source: File Upload */}
        {sourceMode === 'file' && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.csv,.json,.pdf,.docx"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all"
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
              <p className="text-sm text-slate-600 font-medium">
                {uploadedFileName ? uploadedFileName : 'Click to upload requirements file'}
              </p>
              <p className="text-xs text-slate-400 mt-1">TXT, Markdown, CSV, JSON, PDF, DOCX</p>
            </div>
            {uploadedFileContent && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                <p className="text-xs text-green-700 font-medium mb-1">✅ File loaded: {uploadedFileName} ({uploadedFileContent.length} chars)</p>
                <pre className="text-[10px] text-green-800 font-mono whitespace-pre-wrap line-clamp-4">
                  {uploadedFileContent.substring(0, 300)}…
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Proceed button */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={() => setWizardStep('scenarios')}
            disabled={!canProceedToScenarios()}
            className="btn-primary flex items-center gap-2 disabled:opacity-40"
          >
            Next: Configure Scenarios
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  // ── STEP 2: Scenario Generation Config ────────────────────────────────────

  const renderScenariosStep = () => (
    <div className="space-y-4 animate-fadeInUp">
      <div className="glass-card p-5">
        <h3 className="panel-title flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-purple-500" />
          AI Scenario Generation
          <span className="chip">Step 2</span>
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          AI will generate lightweight scenario titles and descriptions from your requirements. You'll review them before full test cases are created.
        </p>

        {/* Summary of source */}
        <div className="p-3 bg-blue-50/60 border border-blue-200/60 rounded-xl mb-4">
          <p className="text-xs text-blue-700 font-medium">
            {sourceMode === 'existing'
              ? `📋 ${selectedReqIds.size} requirement(s) selected`
              : sourceMode === 'text'
              ? `📝 Pasted text (${pastedText.length} chars)`
              : sourceMode === 'url'
              ? `🌐 URL: ${sourceUrl}`
              : `📁 File: ${uploadedFileName}`}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {/* Number of scenarios */}
          <div>
            <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">
              Scenarios to Generate
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={3}
                max={20}
                value={scenarioCount}
                onChange={e => setScenarioCount(+e.target.value)}
                className="flex-1"
              />
              <span className="text-sm font-bold text-blue-600 w-6 text-right">{scenarioCount}</span>
            </div>
          </div>

          {/* Test types */}
          <div>
            <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">
              Include Test Types
            </label>
            <div className="flex gap-2 flex-wrap">
              {['Positive', 'Negative', 'Edge', 'Boundary'].map(t => (
                <button
                  key={t}
                  onClick={() => setIncludeTypes(prev => {
                    const next = new Set(prev);
                    if (next.has(t)) next.delete(t); else next.add(t);
                    return next;
                  })}
                  className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-all
                    ${includeTypes.has(t) ? typeColor[t] + ' border-current' : 'bg-slate-100 text-slate-400 border-slate-200'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {scenarioError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
            <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />{scenarioError}
          </div>
        )}

        <div className="flex gap-2 justify-between">
          <button onClick={() => setWizardStep('source')} className="btn-ghost flex items-center gap-1.5">
            ← Back
          </button>
          <button
            onClick={handleGenerateScenarios}
            disabled={generatingScenarios || includeTypes.size === 0}
            className="btn-primary flex items-center gap-2"
          >
            {generatingScenarios
              ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Generating Scenarios…</>
              : <><Sparkles className="w-3.5 h-3.5" /> Generate {scenarioCount} Scenarios</>}
          </button>
        </div>
      </div>

      {/* Show existing scenarios if already generated (re-entered step) */}
      {scenarios.length > 0 && !generatingScenarios && (
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 mb-2">Previously generated scenarios — click "Next: Review" to continue.</p>
          <button onClick={() => setWizardStep('approve')} className="btn-primary flex items-center gap-2">
            Next: Review Scenarios <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );

  // ── STEP 3: Scenario Approval ─────────────────────────────────────────────

  const renderApproveStep = () => (
    <div className="space-y-4 animate-fadeInUp">
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="panel-title flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-green-500" />
            Review & Approve Scenarios
            <span className="chip">Step 3</span>
          </h3>
          <div className="flex gap-2">
            <button onClick={approveAll} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium">
              ✅ Approve All
            </button>
            <button onClick={rejectAll} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium">
              ❌ Reject All
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Approve the scenarios you want full test cases for. Rejected scenarios will be skipped.
          <span className="ml-2 font-medium text-blue-600">{approvedScenarios.length} of {scenarios.length} approved</span>
        </p>

        {approvalFeedback && (
          <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 font-mono">
            {approvalFeedback}
          </div>
        )}

        <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-thin pr-1">
          {scenarios.map((scenario, idx) => (
            <div
              key={scenario.id}
              className={`p-3 rounded-xl border transition-all
                ${scenario.approved === true  ? 'border-green-300 bg-green-50/60' :
                  scenario.approved === false ? 'border-red-200 bg-red-50/40 opacity-60' :
                                                'border-slate-200 bg-white/60'}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex flex-col gap-1 shrink-0 mt-0.5">
                  <button
                    onClick={() => toggleApproval(scenario.id, true)}
                    className={`p-1 rounded-lg transition-all ${scenario.approved === true ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-green-100 hover:text-green-600'}`}
                    title="Approve"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => toggleApproval(scenario.id, false)}
                    className={`p-1 rounded-lg transition-all ${scenario.approved === false ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-red-100 hover:text-red-500'}`}
                    title="Reject"
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[10px] font-mono text-slate-400">#{idx + 1}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${typeColor[scenario.type] || 'bg-slate-100 text-slate-600'}`}>
                      {scenario.type}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${priorityColor[scenario.priority]}`}>
                      {scenario.priority}
                    </span>
                    {scenario.approved === true  && <span className="text-[10px] text-green-600 font-medium">✅ Approved</span>}
                    {scenario.approved === false && <span className="text-[10px] text-red-500 font-medium">❌ Rejected</span>}
                    {scenario.approved === null  && <span className="text-[10px] text-slate-400">⏳ Pending</span>}
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{scenario.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{scenario.description}</p>
                  {scenario.requirementRef && (
                    <p className="text-[10px] font-mono text-blue-500 mt-1">
                      <Link2 className="w-3 h-3 inline mr-1" />{scenario.requirementRef}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {detailsError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
            <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />{detailsError}
          </div>
        )}

        <div className="mt-4 flex gap-2 justify-between">
          <button onClick={() => setWizardStep('scenarios')} className="btn-ghost flex items-center gap-1.5">
            ← Back
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => { setScenarios([]); setWizardStep('scenarios'); }}
              className="btn-ghost flex items-center gap-1.5"
              title="Re-generate scenarios"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Re-generate
            </button>
            <button
              onClick={handleGenerateDetails}
              disabled={!canGenerateDetails || generatingDetails}
              className="btn-primary flex items-center gap-2 disabled:opacity-40"
            >
              {generatingDetails
                ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Generating Test Cases…</>
                : <><Zap className="w-3.5 h-3.5" /> Generate Full Test Cases ({approvedScenarios.length})</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── STEP 4: Full TC Details ───────────────────────────────────────────────

  const renderDetailsStep = () => (
    <div className="space-y-4 animate-fadeInUp">
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="panel-title flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-blue-500" />
            Generated Test Cases
            <span className="badge badge-green">{generatedTCs.length} ready</span>
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowTmsPushPanel(v => !v)}
              className="btn-ghost flex items-center gap-1.5 text-purple-600 border-purple-200 hover:bg-purple-50"
            >
              <Link2 className="w-3.5 h-3.5" /> Push to TMS
            </button>
            <button
              onClick={handleSaveAllGenerated}
              className="btn-primary flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Save All to Project
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Review the fully generated test cases below. Click "Save All to Project" to add them, or start over to generate more.
        </p>

        {/* TMS Push Panel */}
        {showTmsPushPanel && (
          <div className="mb-4 p-4 bg-purple-50/60 border border-purple-200 rounded-xl">
            <h4 className="text-sm font-bold text-purple-800 mb-3 flex items-center gap-2">
              <Link2 className="w-4 h-4" /> Push {generatedTCs.length} Test Cases to TMS
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-[10px] font-semibold text-slate-600 uppercase mb-1 block">TMS Type</label>
                <select value={tmsPushConfig.tmsType} onChange={e => setTmsPushConfig(p => ({ ...p, tmsType: e.target.value }))}
                  className="input-field text-xs w-full">
                  <option value="jira">Jira</option>
                  <option value="azure">Azure DevOps</option>
                  <option value="testrail">TestRail</option>
                  <option value="rally">Rally</option>
                  <option value="alm">HP ALM</option>
                  <option value="demo">Demo Mode</option>
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
                      placeholder="Bearer token or PAT" className="input-field text-xs w-full" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 uppercase mb-1 block">Issue Type</label>
                    <input value={tmsPushConfig.testCaseType} onChange={e => setTmsPushConfig(p => ({ ...p, testCaseType: e.target.value }))}
                      placeholder="Test, Story, Task..." className="input-field text-xs w-full" />
                  </div>
                </>
              )}
            </div>
            {tmsPushResult && (
              <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg text-xs">
                <p className="font-bold text-green-700">✅ Pushed {tmsPushResult.pushed} test cases</p>
                {tmsPushResult.failed > 0 && <p className="text-red-600">⚠️ {tmsPushResult.failed} failed</p>}
                {tmsPushResult.urls.slice(0, 3).map((u, i) => (
                  <a key={i} href={u} target="_blank" rel="noreferrer" className="block text-blue-600 underline truncate">{u}</a>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={handlePushToTMS} disabled={tmsPushing}
                className="btn-primary text-xs flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700">
                {tmsPushing ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Pushing...</> : <><Link2 className="w-3.5 h-3.5" /> Push to TMS</>}
              </button>
              <button onClick={() => setShowTmsPushPanel(false)} className="btn-ghost text-xs">Cancel</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* TC List */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto scrollbar-thin pr-1">
            {generatedTCs.map((tc, idx) => (
              <div
                key={tc.id}
                onClick={() => setSelectedTC(tc)}
                className={`p-3 rounded-xl border cursor-pointer transition-all
                  ${selectedTC?.id === tc.id
                    ? 'border-blue-400 bg-blue-50/60 glow-blue'
                    : 'border-slate-200 bg-white/60 hover:border-blue-300'}`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-[10px] font-mono text-slate-400 mt-0.5">#{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${priorityColor[tc.priority]}`}>{tc.priority}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${typeColor[tc.type]}`}>{tc.type}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 truncate">{tc.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{tc.description}</p>
                    <p className="text-[10px] font-mono text-slate-400 mt-1">{tc.steps?.length || 0} steps</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* TC Detail Panel */}
          {selectedTC ? (
            <div className="p-4 bg-blue-50/40 border border-blue-200/60 rounded-xl text-xs space-y-3 max-h-[600px] overflow-y-auto scrollbar-thin">
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${priorityColor[selectedTC.priority]}`}>{selectedTC.priority}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${typeColor[selectedTC.type]}`}>{selectedTC.type}</span>
                  <span className="text-[10px] font-mono text-slate-400">{selectedTC.id}</span>
                </div>
                <h4 className="font-bold text-slate-800 text-sm leading-snug">{selectedTC.title}</h4>
                <p className="text-slate-600 mt-1">{selectedTC.description}</p>
              </div>
              {selectedTC.preconditions && (
                <div>
                  <p className="font-semibold text-slate-700 mb-1">Preconditions</p>
                  <p className="text-slate-600 bg-white/60 p-2 rounded-lg border border-slate-200">{selectedTC.preconditions}</p>
                </div>
              )}
              {selectedTC.steps?.length > 0 && (
                <div>
                  <p className="font-semibold text-slate-700 mb-2">Test Steps</p>
                  <div className="space-y-1.5">
                    {selectedTC.steps.map((step, i) => (
                      <div key={i} className="p-2 bg-white/70 border border-slate-200 rounded-lg">
                        <div className="flex gap-2">
                          <span className="text-[10px] font-bold text-blue-500 w-5 shrink-0">{i + 1}.</span>
                          <div className="flex-1">
                            <p className="font-medium text-slate-700">{step.action}</p>
                            <p className="text-slate-500 mt-0.5"><span className="font-medium">Expected:</span> {step.expectedResult}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedTC.testData && (
                <div>
                  <p className="font-semibold text-slate-700 mb-1">Test Data</p>
                  <pre className="text-slate-600 bg-white/60 p-2 rounded-lg border border-slate-200 whitespace-pre-wrap font-mono text-[10px]">{selectedTC.testData}</pre>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 bg-slate-50/60 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
              Click a test case to view details
            </div>
          )}
        </div>

        <div className="mt-4 flex gap-2 justify-between">
          <button onClick={() => setWizardStep('approve')} className="btn-ghost flex items-center gap-1.5">
            ← Back to Scenarios
          </button>
          <button
            onClick={() => { setWizardStep('source'); setScenarios([]); setGeneratedTCs([]); }}
            className="btn-ghost flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Start Over
          </button>
        </div>
      </div>
    </div>
  );

  // ── Existing TC List Panel ────────────────────────────────────────────────

  const renderExistingTCList = () => (
    <div className="glass-card p-5 mt-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="panel-title flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-slate-500" />
          All Test Cases
          <span className="chip">{filteredCases.length}</span>
        </h3>
        <div className="flex gap-2">
          <button onClick={() => handleExport('csv')} className="btn-ghost text-xs flex items-center gap-1">
            <Download className="w-3 h-3" /> CSV
          </button>
          <button onClick={() => handleExport('json')} className="btn-ghost text-xs flex items-center gap-1">
            <FileJson className="w-3 h-3" /> JSON
          </button>
          <button
            onClick={() => { setShowFeasibilityPanel(true); runFeasibilityAnalysis(); }}
            className="btn-ghost text-xs flex items-center gap-1"
          >
            <Cpu className="w-3 h-3" /> Feasibility
          </button>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-1 mb-3 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-all
              ${activeCategory === cat ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'}`}
          >
            {cat === 'all' ? `All (${localTestCases.length})` : cat}
          </button>
        ))}
      </div>

      {filteredCases.length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-xs font-mono border-2 border-dashed border-slate-200 rounded-xl">
          <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No test cases yet. Use the wizard above to generate some!
        </div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-thin pr-1">
          {filteredCases.map(tc => (
            <div
              key={tc.id}
              className="flex items-start gap-3 p-3 bg-white/60 border border-slate-200/80 rounded-xl hover:border-blue-300 hover:bg-blue-50/30 transition-all"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${priorityColor[tc.priority]}`}>{tc.priority}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${typeColor[tc.type]}`}>{tc.type}</span>
                  {tc.automationStatus && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono
                      ${tc.automationStatus === 'Automatable' ? 'bg-green-100 text-green-700' :
                        tc.automationStatus === 'Automated'   ? 'bg-blue-100 text-blue-700' :
                                                                 'bg-orange-100 text-orange-700'}`}>
                      {tc.automationStatus}
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-slate-400">{tc.id}</span>
                </div>
                <p className="text-sm font-medium text-slate-800 truncate">{tc.title}</p>
                {tc.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{tc.description}</p>}
                <p className="text-[10px] font-mono text-slate-400 mt-0.5">{tc.steps?.length || 0} steps · confidence {tc.confidenceScore}%</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => { onTriggerRerun(tc.id); }}
                  className="p-1 text-slate-400 hover:text-blue-500 transition-colors"
                  title="Re-run"
                >
                  <Play className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onApplyHeal(tc.id)}
                  className="p-1 text-slate-400 hover:text-green-500 transition-colors"
                  title="Heal"
                >
                  <Zap className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── Feasibility Modal ─────────────────────────────────────────────────────

  const renderFeasibilityModal = () => {
    if (!showFeasibilityPanel) return null;
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-500" /> Automation Feasibility Analysis
              <span className="chip">GAP-06</span>
            </h3>
            <button onClick={() => setShowFeasibilityPanel(false)} className="text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {feasibilityRunning ? (
              <div className="text-center py-10">
                <RefreshCw className="w-8 h-8 mx-auto text-purple-500 animate-spin mb-3" />
                <p className="text-sm text-slate-600">Analyzing test cases for automation feasibility…</p>
              </div>
            ) : feasibilitySummary?.error ? (
              <div className="text-red-600 text-sm p-3 bg-red-50 rounded-xl">{feasibilitySummary.error}</div>
            ) : feasibilitySummary ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-green-50 rounded-xl border border-green-200 text-center">
                    <p className="text-xl font-bold text-green-700">{feasibilitySummary.automatable || 0}</p>
                    <p className="text-xs text-green-600">Automatable</p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-xl border border-orange-200 text-center">
                    <p className="text-xl font-bold text-orange-700">{feasibilitySummary.partial || 0}</p>
                    <p className="text-xs text-orange-600">Partial</p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-center">
                    <p className="text-xl font-bold text-red-700">{feasibilitySummary.manual_only || 0}</p>
                    <p className="text-xs text-red-600">Manual Only</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {feasibilityResults.map(r => (
                    <div key={r.id} className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-center justify-between gap-2">
                      <span className="font-mono text-slate-600">{r.id}</span>
                      <span className="text-slate-700 flex-1 truncate">{r.title}</span>
                      <span className={`px-2 py-0.5 rounded font-medium ${r.verdict === 'Automatable' ? 'bg-green-100 text-green-700' : r.verdict === 'Partial' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                        {r.verdict}
                      </span>
                      <span className="text-slate-400 font-mono">{r.confidence_score}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  // ── Main Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 animate-fadeInUp">
      {/* Global feedback toast */}
      {feedback && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 bg-blue-600 text-white text-xs rounded-xl shadow-lg font-mono animate-fadeInUp">
          {feedback}
        </div>
      )}

      {/* Header */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="panel-title flex items-center gap-2 text-base">
              <Bot className="w-5 h-5 text-blue-500" />
              AI Test Case Generator
              <span className="chip">REQ-01</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Generate test cases from requirements in 4 steps: source → scenarios → approve → full details
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setTcViewMode(tcViewMode === 'wizard' ? 'list' : 'wizard')}
              className="btn-ghost text-xs flex items-center gap-1.5"
            >
              {tcViewMode === 'wizard'
                ? <><ClipboardList className="w-3.5 h-3.5" /> View All TCs</>
                : <><Sparkles className="w-3.5 h-3.5" /> Generate New</>}
            </button>
          </div>
        </div>
      </div>

      {tcViewMode === 'wizard' ? (
        <>
          {/* Wizard step indicator */}
          {renderStepIndicator()}

          {/* Active step content */}
          {wizardStep === 'source'    && renderSourceStep()}
          {wizardStep === 'scenarios' && renderScenariosStep()}
          {wizardStep === 'approve'   && renderApproveStep()}
          {wizardStep === 'details'   && renderDetailsStep()}

          {/* Always show existing TC list at the bottom */}
          {renderExistingTCList()}
        </>
      ) : (
        renderExistingTCList()
      )}

      {/* Feasibility modal */}
      {renderFeasibilityModal()}
    </div>
  );
}
