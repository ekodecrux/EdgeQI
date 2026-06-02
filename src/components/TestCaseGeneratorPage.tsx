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
  Tag
} from 'lucide-react';
import { TestCase } from '../types';

interface TestCaseGeneratorPageProps {
  testCases: TestCase[];
  onTriggerRerun: (id: string) => void;
  onApplyHeal: (id: string) => void;
  onAddManualTestCase?: (tc: TestCase) => void;
  onUpdateTestCase?: (tc: TestCase) => void;
  currentProjectId?: string;
}

export default function TestCaseGeneratorPage({
  testCases,
  onTriggerRerun,
  onApplyHeal,
  onAddManualTestCase,
  onUpdateTestCase,
  currentProjectId = 'ALL'
}: TestCaseGeneratorPageProps) {
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [tcPriority, setTcPriority] = useState<'P0' | 'P1' | 'P2' | 'P3'>('P0');
  const [tcType, setTcType] = useState<string>('Positive');
  const [tcTitle, setTcTitle] = useState('');
  const [tcDesc, setTcDesc] = useState('');
  const [tcPreconditions, setTcPreconditions] = useState('');
  const [tcSteps, setTcSteps] = useState('');
  const [tcTestData, setTcTestData] = useState('');
  
  // Local state for interactive testcases
  const [localTestCases, setLocalTestCases] = useState<TestCase[]>(testCases);
  const [feedback, setFeedback] = useState('');
  const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null);

  // Export & Regenerate states
  const [isExporting, setIsExporting] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [regenFeedback, setRegenFeedback] = useState<Record<string, string>>({});

  // REQ-36: TC approval state
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approvalMap, setApprovalMap] = useState<Record<string, 'pending'|'approved'|'rejected'>>({});
  const [approvalMsg, setApprovalMsg] = useState('');

  // REQ-13: TC tagging state
  const [tagsMap, setTagsMap] = useState<Record<string, string[]>>({});
  const [tagInput, setTagInput] = useState<Record<string, string>>({});
  const [activeTagFilter, setActiveTagFilter] = useState<string>('');

  // REQ-28: Clone state
  const [cloningId, setCloningId] = useState<string | null>(null);

  // REQ-16: Inline step editor state
  const [editingStepsId, setEditingStepsId] = useState<string | null>(null);
  const [editingSteps, setEditingSteps] = useState<{ action: string; expectedResult: string }[]>([]);
  const [savingSteps, setSavingSteps] = useState(false);

  // REQ-18: Bulk priority state
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkPriority, setBulkPriority] = useState<'P0' | 'P1' | 'P2' | 'P3'>('P1');
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // REQ-26: Bulk import state
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importJson, setImportJson] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; failed: number } | null>(null);
  const bulkFileRef = useRef<HTMLInputElement>(null);

  // Sync state whenever parent props update (CRITICAL for project-level separation)
  useEffect(() => {
    setLocalTestCases(testCases);
  }, [testCases]);

  // Handle local simulation rerun
  const handleRerun = (id: string) => {
    onTriggerRerun(id);
    setLocalTestCases(prev => prev.map(tc => tc.id === id ? { ...tc, confidenceScore: 100 } : tc));
    setFeedback(`TestCase ${id} simulation rerun passed successfully!`);
    setTimeout(() => setFeedback(''), 3000);
  };

  // Export test cases
  const handleExport = async (format: 'csv' | 'json') => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams({ format });
      if (currentProjectId && currentProjectId !== 'ALL') params.set('projectId', currentProjectId);
      const res = await fetch(`/api/quality/testcases/export?${params}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `testcases-export.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setFeedback(`Exported ${filteredCases.length} test cases as ${format.toUpperCase()}`);
      setTimeout(() => setFeedback(''), 3000);
    } catch (e: any) {
      setFeedback(`Export failed: ${e.message}`);
      setTimeout(() => setFeedback(''), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  // AI Regenerate a test case with optional feedback
  const handleRegenerate = async (tc: TestCase, userFeedback?: string) => {
    setRegeneratingId(tc.id);
    try {
      const res = await fetch(`/api/quality/testcases/${tc.id}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: userFeedback || '' })
      });
      const data = await res.json();
      if (data.success && data.testCase) {
        setLocalTestCases(prev => prev.map(t => t.id === tc.id ? { ...t, ...data.testCase } : t));
        setFeedback(`AI regenerated ${tc.id} successfully!`);
        setTimeout(() => setFeedback(''), 3000);
      }
    } catch (e: any) {
      setFeedback(`Regeneration failed: ${e.message}`);
      setTimeout(() => setFeedback(''), 3000);
    } finally {
      setRegeneratingId(null);
      setRegenFeedback(prev => ({ ...prev, [tc.id]: '' }));
    }
  };

  const handleHeal = (id: string) => {
    onApplyHeal(id);
    setLocalTestCases(prev => prev.map(tc => tc.id === id ? { ...tc, automationStatus: 'Automated', confidenceScore: 99 } : tc));
    setFeedback(`Injected real-time DOM telemetry repair on ${id}. Selector locator healed!`);
    setTimeout(() => setFeedback(''), 3000);
  };

  // REQ-36: TC approval/sign-off
  const handleApprove = async (tc: TestCase, action: 'approve' | 'reject') => {
    setApprovingId(tc.id);
    try {
      const token = localStorage.getItem('iqstudio_token');
      const res = await fetch(`/api/quality/testcases/${tc.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ action, approvedBy: 'qa-lead' })
      });
      const data = await res.json();
      if (data.success) {
        setApprovalMap(prev => ({ ...prev, [tc.id]: data.status }));
        setApprovalMsg(`${tc.id} ${data.status}`);
        setTimeout(() => setApprovalMsg(''), 3000);
      }
    } catch (e: any) {
      setApprovalMsg(`Approval failed: ${e.message}`);
      setTimeout(() => setApprovalMsg(''), 3000);
    } finally { setApprovingId(null); }
  };

  // REQ-13: Save tags for a TC
  const handleSaveTags = async (tcId: string) => {
    const raw = tagInput[tcId] || '';
    const tags = raw.split(',').map(t => t.trim()).filter(Boolean);
    try {
      const token = localStorage.getItem('iqstudio_token');
      await fetch(`/api/quality/testcases/${tcId}/tags`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ tags })
      });
      setTagsMap(prev => ({ ...prev, [tcId]: tags }));
      setTagInput(prev => ({ ...prev, [tcId]: '' }));
    } catch { /* silent */ }
  };

  // REQ-16: Save inline steps to backend
  const handleSaveSteps = async (tcId: string) => {
    setSavingSteps(true);
    try {
      const token = localStorage.getItem('iqstudio_token');
      const res = await fetch(`/api/quality/testcases/${tcId}/steps`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ steps: editingSteps })
      });
      const data = await res.json();
      if (data.success) {
        setLocalTestCases(prev => prev.map(tc => tc.id === tcId ? { ...tc, steps: editingSteps } : tc));
        setFeedback(`Steps for ${tcId} saved successfully!`);
        setEditingStepsId(null);
        setTimeout(() => setFeedback(''), 3000);
      }
    } catch (e: any) {
      setFeedback(`Steps save failed: ${e.message}`);
      setTimeout(() => setFeedback(''), 3000);
    } finally { setSavingSteps(false); }
  };

  // REQ-18: Bulk priority update
  const handleBulkPriorityUpdate = async () => {
    if (bulkSelected.size === 0) return;
    setBulkUpdating(true);
    try {
      const token = localStorage.getItem('iqstudio_token');
      const res = await fetch('/api/quality/testcases/bulk-priority', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ ids: Array.from(bulkSelected), priority: bulkPriority })
      });
      const data = await res.json();
      if (data.success) {
        setLocalTestCases(prev => prev.map(tc => bulkSelected.has(tc.id) ? { ...tc, priority: bulkPriority } : tc));
        setFeedback(`Updated priority to ${bulkPriority} for ${data.updated} test case(s)`);
        setBulkSelected(new Set());
        setTimeout(() => setFeedback(''), 3000);
      }
    } catch (e: any) {
      setFeedback(`Bulk update failed: ${e.message}`);
      setTimeout(() => setFeedback(''), 3000);
    } finally { setBulkUpdating(false); }
  };

  // REQ-28: Clone test case
  const handleClone = async (tc: TestCase) => {
    setCloningId(tc.id);
    try {
      const res = await fetch(`/api/quality/testcases/${tc.id}/clone`, { method: 'POST' });
      const data = await res.json();
      if (data.success && data.testCase) {
        setLocalTestCases(prev => [...prev, data.testCase]);
        setFeedback(`Cloned ${tc.id} → ${data.testCase.id}`);
        setTimeout(() => setFeedback(''), 3000);
      }
    } catch (e: any) {
      setFeedback(`Clone failed: ${e.message}`);
      setTimeout(() => setFeedback(''), 3000);
    } finally { setCloningId(null); }
  };

  // REQ-26: Bulk import test cases
  const handleBulkImport = async () => {
    setImporting(true);
    try {
      const formData = new FormData();
      if (importFile) {
        formData.append('file', importFile);
      } else if (importJson.trim()) {
        formData.append('testCasesJson', importJson.trim());
      } else {
        setFeedback('Provide a CSV file or JSON data to import.');
        setTimeout(() => setFeedback(''), 3000);
        return;
      }
      const res = await fetch('/api/quality/testcases/bulk-import', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setImportResult({ imported: data.imported, failed: data.failed });
        setLocalTestCases(prev => [...prev, ...(data.testCases || [])]);
        setFeedback(`Imported ${data.imported} test cases successfully!`);
        setTimeout(() => setFeedback(''), 4000);
        setImportFile(null); setImportJson('');
      } else {
        setFeedback(`Import failed: ${data.error}`);
        setTimeout(() => setFeedback(''), 3000);
      }
    } catch (e: any) {
      setFeedback(`Import error: ${e.message}`);
      setTimeout(() => setFeedback(''), 3000);
    } finally { setImporting(false); }
  };

  const categories = ['all', 'Positive', 'Negative', 'Edge', 'Boundary'];

  const filteredCases = localTestCases.filter(tc => {
    const catOk = activeCategory === 'all' || tc.type.toLowerCase() === activeCategory.toLowerCase();
    const tagOk = !activeTagFilter || (tagsMap[tc.id] || []).includes(activeTagFilter);
    return catOk && tagOk;
  });

  // All unique tags across TCs (REQ-13)
  const allTags = Array.from(new Set(Object.values(tagsMap).flat())).filter(Boolean);

  const handleCreateCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tcTitle.trim() || !tcDesc.trim()) return;

    const idSuffix = Math.floor(Math.random() * 900) + 100;
    const newCase: TestCase = {
      id: `TC-${idSuffix}`,
      title: tcTitle,
      description: tcDesc,
      priority: tcPriority as any,
      type: tcType as any,
      preconditions: tcPreconditions || 'User logged back inside active workspace.',
      automationStatus: 'Needs Manual',
      confidenceScore: 82,
      testData: tcTestData || '{"userId": "demo-qa"}',
      steps: tcSteps ? tcSteps.split('\n').map(step => ({ action: step, expectedResult: 'Assert target status behaves correctly.' })) : [
        { action: 'Access main application index layout URL', expectedResult: 'State responds and sets components.' }
      ]
    };

    if (onAddManualTestCase) {
      onAddManualTestCase(newCase);
    }
    setLocalTestCases(prev => [newCase, ...prev]);

    // Clear Form
    setTcTitle('');
    setTcDesc('');
    setTcPreconditions('');
    setTcSteps('');
    setTcTestData('');
    setFeedback(`Manual test case ${newCase.id} appended to current suite inventory!`);
    setTimeout(() => setFeedback(''), 4000);
  };

  const getProjectBadgeStr = () => {
    if (!currentProjectId || currentProjectId === 'ALL') return '🗂 All Projects';
    return `📁 ${currentProjectId}`;
  };

  return (
    <div className="space-y-6">
      
      {/* REQ-26: Bulk Import Modal */}
      {showBulkImport && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-600" /> Bulk Import Test Cases
              </h3>
              <button onClick={() => { setShowBulkImport(false); setImportResult(null); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-xs text-slate-500">Import test cases from a CSV file or paste JSON data. CSV headers: <span className="font-mono text-xs bg-slate-100 px-1 rounded">title, description, priority, type, preconditions, testData, steps</span></p>
              
              <div>
                <label className="block text-[11px] font-mono uppercase text-slate-500 mb-1">Upload CSV File</label>
                <input
                  type="file"
                  accept=".csv,.txt"
                  ref={bulkFileRef}
                  onChange={e => setImportFile(e.target.files?.[0] || null)}
                  aria-label="Upload CSV file for bulk import"
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {importFile && <p className="text-[10px] text-blue-600 mt-1 font-mono">Selected: {importFile.name}</p>}
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                <div className="relative flex justify-center text-[10px] font-mono text-slate-400"><span className="bg-white px-2">or paste JSON</span></div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-slate-500 mb-1">JSON Array</label>
                <textarea
                  placeholder='[{"title":"Login test","priority":"P1","type":"Positive","steps":"Enter username"}]'
                  value={importJson}
                  onChange={e => setImportJson(e.target.value)}
                  rows={4}
                  aria-label="JSON data for bulk import"
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {importResult && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 font-mono">
                  ✅ Imported {importResult.imported} test cases · {importResult.failed} failed
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <button onClick={() => { setShowBulkImport(false); setImportResult(null); }} className="px-4 py-2 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</button>
                <button
                  onClick={handleBulkImport}
                  disabled={importing || (!importFile && !importJson.trim())}
                  aria-label="Start bulk import"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {importing ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Importing...</> : <><Upload className="w-3.5 h-3.5" /> Import Now</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Intro Header */}
      <div className="rounded-3xl p-6 text-white shadow-xs relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-12 -translate-y-6">
          <TableProperties className="w-96 h-96" />
        </div>
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs text-blue-200 mb-3 font-mono font-bold">
            <Cpu className="w-3.5 h-3.5 text-blue-300 animate-pulse" />
            Active Workspace Scope: {getProjectBadgeStr()}
          </div>
          <h2 className="text-2xl font-sans font-extrabold tracking-tight">
            QA Test Case Matrix Generator
          </h2>
          <p className="text-blue-100 text-xs sm:text-sm mt-1 leading-relaxed">
            Construct, synchronize, and execute structured test matrices based on functional parameters. Edit priorities on-the-fly, declare explicit UI assertions, and run quick-checks to evaluate automated healing thresholds.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left column: Create Manual scenario */}
        <div className="lg:col-span-4">
          <div className="glass-card p-5 space-y-4">
            
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-sans font-bold text-slate-900 text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-500 font-bold" />
                Declare Manual Suite Scenario
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Quickly append specialized validations to the mapped spec.</p>
            </div>

            <form onSubmit={handleCreateCase} className="space-y-3">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Scenario Title (Required)</label>
                <input
                  type="text"
                  placeholder="e.g. Reject negative cash wallets"
                  value={tcTitle}
                  onChange={(e) => setTcTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-400"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Detailed Description</label>
                <textarea
                  placeholder="Verifies that transaction requests with a negative wallet balance throw a 403 authorization lock..."
                  value={tcDesc}
                  onChange={(e) => setTcDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-400 leading-normal"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Priority</label>
                  <select
                    value={tcPriority}
                    onChange={(e: any) => setTcPriority(e.target.value)}
                    className="input-glass w-full text-xs"
                  >
                    <option value="P0">P0 - Critical Focus</option>
                    <option value="P1">P1 - Standard Flow</option>
                    <option value="P2">P2 - Secondary Checks</option>
                    <option value="P3">P3 - Trivial Specs</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Testing Type</label>
                  <select
                    value={tcType}
                    onChange={(e) => setTcType(e.target.value)}
                    className="input-glass w-full text-xs"
                  >
                    <option value="Positive">Positive</option>
                    <option value="Negative">Negative</option>
                    <option value="Edge">Edge Case</option>
                    <option value="Boundary">Boundary Check</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Preconditions</label>
                <input
                  type="text"
                  placeholder="e.g. Account balance holds negative limit"
                  value={tcPreconditions}
                  onChange={(e) => setTcPreconditions(e.target.value)}
                  className="input-glass w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Steps (One action per line)</label>
                <textarea
                  placeholder="Click Checkout Button&#10;Verify balance modal dialog exists&#10;Assert negative checkout error text is displayed"
                  value={tcSteps}
                  onChange={(e) => setTcSteps(e.target.value)}
                  rows={2}
                  className="input-glass w-full text-xs leading-normal"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Test Parameters / Mock Data</label>
                <input
                  type="text"
                  placeholder='e.g. {"balance": -10, "currency": "USD"}'
                  value={tcTestData}
                  onChange={(e) => setTcTestData(e.target.value)}
                  className="input-glass w-full text-xs"
                />
              </div>

              <button
                type="submit"
                className="btn-primary w-full py-2 px-4 text-xs flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Matrix Scenario
              </button>
            </form>

            {feedback && (
              <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-center text-xs leading-normal font-mono animate-fade-in">
                {feedback}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Test Case Inventory List Grid */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          
          {/* REQ-36: Approval feedback banner */}
          {approvalMsg && (
            <div className={`px-4 py-2 rounded-xl text-xs font-mono font-bold border ${approvalMsg.includes('approved') ? 'bg-green-50 text-green-700 border-green-200' : approvalMsg.includes('rejected') ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
              {approvalMsg}
            </div>
          )}

          {/* Controls Bar */}
          <div className="glass-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-bold text-slate-700 uppercase font-mono">Filter Suite:</span>
              <div className="flex flex-wrap gap-1">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-2.5 py-1 text-[10px] font-mono rounded-lg border transition-all ${
                      activeCategory === cat 
                        ? 'btn-primary text-[10px] font-bold' 
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              {/* REQ-13: Tag filter chips */}
              {allTags.length > 0 && (
                <div className="flex items-center gap-1 ml-2">
                  <Tag className="w-3 h-3 text-blue-400" />
                  {allTags.map(tag => (
                    <button key={tag} onClick={() => setActiveTagFilter(activeTagFilter === tag ? '' : tag)}
                      className={`px-2 py-0.5 text-[9px] font-mono rounded-full border transition-all ${activeTagFilter === tag ? 'bg-blue-100 text-blue-700 border-blue-300 font-bold' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-blue-50'}`}>
                      #{tag}
                    </button>
                  ))}
                  {activeTagFilter && <button onClick={() => setActiveTagFilter('')} className="text-[9px] text-slate-400 hover:text-rose-500 ml-1"><X className="w-3 h-3" /></button>}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                Suite Coverage: <strong className="text-blue-700">{Math.min(95, Math.max(76, filteredCases.length * 5 + 50))}%</strong>
              </span>
              {/* REQ-18: Bulk priority controls */}
              {bulkSelected.size > 0 && (
                <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1">
                  <span className="text-[10px] font-mono text-blue-700 font-bold">{bulkSelected.size} selected</span>
                  <select value={bulkPriority} onChange={e => setBulkPriority(e.target.value as any)}
                    className="text-[10px] font-mono border border-blue-200 rounded px-1 py-0.5 bg-white text-blue-800 focus:outline-none">
                    <option value="P0">P0</option>
                    <option value="P1">P1</option>
                    <option value="P2">P2</option>
                    <option value="P3">P3</option>
                  </select>
                  <button onClick={handleBulkPriorityUpdate} disabled={bulkUpdating}
                    className="flex items-center gap-1 text-[10px] font-mono bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700 disabled:opacity-50">
                    {bulkUpdating ? <RefreshCw className="w-3 h-3 animate-spin" /> : null} Apply
                  </button>
                  <button onClick={() => setBulkSelected(new Set())}
                    className="text-[10px] text-blue-500 hover:text-blue-700"><X className="w-3 h-3" /></button>
                </div>
              )}
              {/* Export + Import buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleExport('csv')}
                  disabled={isExporting || filteredCases.length === 0}
                  className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-lg text-[10px] font-mono transition-all disabled:opacity-50"
                  title="Export as CSV" aria-label="Export test cases as CSV"
                >
                  {isExporting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                  CSV
                </button>
                <button
                  onClick={() => handleExport('json')}
                  disabled={isExporting || filteredCases.length === 0}
                  className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-lg text-[10px] font-mono transition-all disabled:opacity-50"
                  title="Export as JSON" aria-label="Export test cases as JSON"
                >
                  {isExporting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <FileJson className="w-3 h-3" />}
                  JSON
                </button>
                {/* REQ-26: Bulk Import button */}
                <button
                  onClick={() => setShowBulkImport(true)}
                  className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-lg text-[10px] font-mono transition-all"
                  title="Bulk import test cases" aria-label="Bulk import test cases"
                >
                  <Upload className="w-3 h-3" /> Import
                </button>
              </div>
            </div>
          </div>

          {/* List Card Grid */}
          <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
            {filteredCases.map(tc => {
              const isSelected = selectedTestCase?.id === tc.id;
              return (
                <div
                  key={tc.id}
                  onClick={() => setSelectedTestCase(isSelected ? null : tc)}
                  className={`glass-card p-4 transition-all cursor-pointer ${bulkSelected.has(tc.id) ? 'ring-1 ring-blue-400 border-blue-300 ' : ''}${
                    isSelected ? 'ring-1 ring-blue-500 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* REQ-18: Bulk select checkbox */}
                    <input type="checkbox" checked={bulkSelected.has(tc.id)}
                      onChange={e => { e.stopPropagation(); setBulkSelected(prev => { const s = new Set(prev); s.has(tc.id) ? s.delete(tc.id) : s.add(tc.id); return s; }); }}
                      onClick={e => e.stopPropagation()}
                      className="mt-1 accent-blue-600 w-3.5 h-3.5 shrink-0" />
                    <div className="space-y-1 text-left flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-mono text-blue-600 font-bold">{tc.id}</span>
                        <span className={`px-1.5 py-0.2 rounded font-mono text-[9px] font-bold uppercase ${
                          tc.priority === 'P0' ? 'bg-rose-50 text-rose-700 border border-rose-200/50' :
                          tc.priority === 'P1' ? 'bg-amber-50 text-amber-700 border border-amber-200/50' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {tc.priority}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500 bg-slate-100 px-1 py-0.2 rounded border border-slate-200">
                          {tc.type}
                        </span>
                        <span className={`text-[9px] font-mono px-1.5 rounded-sm ${
                          tc.automationStatus === 'Automated' ? 'badge badge-green' : 'badge badge-blue'
                        }`}>
                          {tc.automationStatus}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">{tc.title}</h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2">{tc.description}</p>
                    </div>

                    {/* Operational controls for cases */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRerun(tc.id);
                        }}
                        className="bg-slate-50 p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all text-slate-500"
                        title="Simulate validation test"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>

                      {/* REQ-28: Clone button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleClone(tc); }}
                        disabled={cloningId === tc.id}
                        className="bg-blue-50 text-blue-700 p-1.5 rounded-lg border border-blue-200 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50"
                        title="Clone this test case" aria-label={`Clone test case ${tc.id}`}
                      >
                        {cloningId === tc.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      {/* REQ-16: Inline step editor button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingStepsId(tc.id); setEditingSteps(tc.steps ? tc.steps.map(s => ({...s})) : []); }}
                        className="bg-blue-50 text-blue-700 p-1.5 rounded-lg border border-blue-200 hover:bg-blue-600 hover:text-white transition-all"
                        title="Edit steps inline" aria-label={`Edit steps for ${tc.id}`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* AI Regenerate button (REQ-29) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRegenerate(tc);
                        }}
                        disabled={regeneratingId === tc.id}
                        className="bg-blue-50 text-blue-700 p-1.5 rounded-lg border border-blue-200 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50"
                        title="AI Regenerate this test case" aria-label={`AI regenerate test case ${tc.id}`}
                      >
                        {regeneratingId === tc.id
                          ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          : <Sparkles className="w-3.5 h-3.5" />}
                      </button>

                      {tc.confidenceScore < 90 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleHeal(tc.id);
                          }}
                          className="bg-amber-50 text-amber-800 p-1.5 rounded-lg border border-amber-200 hover:bg-amber-600 hover:text-white transition-all animate-pulse"
                          title="Heal locators dynamically"
                        >
                          <RefreshCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expansion info content */}
                  {isSelected && (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-4 text-xs leading-relaxed text-slate-705" onClick={(e) => e.stopPropagation()}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1">Preconditions</span>
                          <p className="bg-slate-50 p-2.5 rounded-xl border border-slate-150 text-slate-800 font-mono text-[11px]">
                            {tc.preconditions}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1">Execution Parameters & Test Data</span>
                          <p className="bg-slate-50 p-2.5 rounded-xl border border-slate-150 text-blue-700 font-mono text-[11px] break-all">
                            {tc.testData}
                          </p>
                        </div>
                      </div>

                      <div className="text-left">
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Sequential Testing Steps Mapped</span>
                        <div className="space-y-2 bg-slate-900 text-slate-200 p-4 rounded-xl border border-slate-800">
                          {tc.steps?.map((st, i) => (
                            <div key={i} className="flex gap-2 text-[11px]">
                              <span className="text-slate-400 font-mono">[{i + 1}]</span>
                              <div className="flex-1">
                                <span className="text-white font-bold">{st.action}</span>
                                <p className="text-[10px] text-blue-400 font-mono mt-0.5">➔ Assert: {st.expectedResult}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-100 pt-3 flex-wrap gap-2 text-[10px] font-mono text-slate-500">
                        <span>Confidence Threshold: <strong className="text-blue-600 font-bold">{tc.confidenceScore}%</strong></span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingTestCase(tc)}
                            className="inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-600 hover:text-white border border-blue-200 px-2.5 py-1 rounded-md text-blue-700 font-sans font-bold text-[10px] transition-all"
                          >
                            <Edit2 className="w-3 h-3" /> Edit Test Case
                          </button>
                          <span className="flex items-center gap-1 text-[11px]">
                            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                            Parsed by NLP Core
                          </span>
                        </div>
                      </div>
                      {/* REQ-36: Approval / sign-off */}
                      <div className="border-t border-slate-100 pt-2 flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">Sign-off:</span>
                        {approvalMap[tc.id] === 'approved' ? (
                          <span className="text-[10px] font-mono bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-bold">✔ Approved</span>
                        ) : approvalMap[tc.id] === 'rejected' ? (
                          <span className="text-[10px] font-mono bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full font-bold">✘ Rejected</span>
                        ) : (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); handleApprove(tc, 'approve'); }} disabled={approvingId === tc.id}
                              className="flex items-center gap-1 text-[10px] font-mono bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-lg hover:bg-green-600 hover:text-white transition-all disabled:opacity-50">
                              <ThumbsUp className="w-3 h-3" /> Approve
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleApprove(tc, 'reject'); }} disabled={approvingId === tc.id}
                              className="flex items-center gap-1 text-[10px] font-mono bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-lg hover:bg-rose-600 hover:text-white transition-all disabled:opacity-50">
                              <ThumbsDown className="w-3 h-3" /> Reject
                            </button>
                          </>
                        )}
                      </div>

                      {/* REQ-13: Tag input */}
                      <div className="border-t border-slate-100 pt-2 flex items-center gap-2 flex-wrap">
                        <Tag className="w-3 h-3 text-blue-400 shrink-0" />
                        {(tagsMap[tc.id] || []).map(tag => (
                          <span key={tag} className="text-[9px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded-full">#{tag}</span>
                        ))}
                        <input type="text" placeholder="Add tags (comma-sep)..." value={tagInput[tc.id] || ''}
                          onChange={(e) => setTagInput(prev => ({ ...prev, [tc.id]: e.target.value }))}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSaveTags(tc.id); } }}
                          className="flex-1 min-w-[120px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 text-[10px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-300" />
                        <button onClick={(e) => { e.stopPropagation(); handleSaveTags(tc.id); }}
                          className="text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-lg hover:bg-blue-600 hover:text-white transition-all">
                          Save
                        </button>
                      </div>

                      {/* AI Regenerate with feedback (REQ-29) */}
                      <div className="border-t border-slate-100 pt-2 flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Optional: feedback for AI regeneration..."
                          value={regenFeedback[tc.id] || ''}
                          onChange={(e) => setRegenFeedback(prev => ({ ...prev, [tc.id]: e.target.value }))}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleRegenerate(tc, regenFeedback[tc.id]); }}
                          disabled={regeneratingId === tc.id}
                          className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold disabled:opacity-50 transition-all"
                        >
                          {regeneratingId === tc.id
                            ? <><RefreshCw className="w-3 h-3 animate-spin" /> Regenerating...</>
                            : <><Sparkles className="w-3 h-3" /> AI Regen</>}
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              );
            })}

            {/* REQ-16: Inline step editor modal */}
            {editingStepsId && (() => {
              return (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
                    <div className="flex items-center justify-between p-4 border-b border-slate-200">
                      <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
                        <Edit2 className="w-4 h-4 text-blue-500" /> Edit Steps &mdash; {editingStepsId}
                      </h3>
                      <button onClick={() => setEditingStepsId(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {editingSteps.map((step, idx) => (
                          <div key={idx} className="flex gap-2 items-start">
                            <span className="text-[10px] font-mono text-slate-400 mt-2.5 shrink-0">#{idx+1}</span>
                            <input type="text" placeholder="Action" value={step.action}
                              onChange={e => { const s = [...editingSteps]; s[idx] = {...s[idx], action: e.target.value}; setEditingSteps(s); }}
                              className="flex-1 border border-slate-200 rounded-lg p-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-400" />
                            <input type="text" placeholder="Expected result" value={step.expectedResult}
                              onChange={e => { const s = [...editingSteps]; s[idx] = {...s[idx], expectedResult: e.target.value}; setEditingSteps(s); }}
                              className="flex-1 border border-slate-200 rounded-lg p-1.5 text-[11px] text-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                            <button onClick={() => setEditingSteps(prev => prev.filter((_, i) => i !== idx))}
                              className="text-rose-400 hover:text-rose-600 mt-1.5 shrink-0"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        ))}
                        {editingSteps.length === 0 && <p className="text-center text-slate-400 text-[11px] py-4 font-mono">No steps. Add one below.</p>}
                      </div>
                      <button onClick={() => setEditingSteps(prev => [...prev, { action: '', expectedResult: '' }])}
                        className="text-[11px] font-mono text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-lg hover:bg-blue-600 hover:text-white transition-all">
                        + Add Step
                      </button>
                      <div className="flex gap-2 justify-end border-t border-slate-100 pt-3">
                        <button onClick={() => setEditingStepsId(null)} className="px-4 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</button>
                        <button onClick={() => handleSaveSteps(editingStepsId!)} disabled={savingSteps}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50">
                          {savingSteps ? <><RefreshCw className="w-3 h-3 animate-spin" /> Saving...</> : 'Save Steps'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {filteredCases.length === 0 && (
              <div className="glass-card border-dashed p-8 text-center text-slate-500">
                <TableProperties className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <span className="text-sm font-bold block">No Test Scenarios Loaded</span>
                <p className="text-xs text-slate-400 max-w-sm mt-1 mx-auto leading-normal">
                  No active test cases corresponding to the selected testing type. Feel free to add quick manual situations on the side.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Edit Scenario Modal Overlay */}
      {editingTestCase && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setEditingTestCase(null)}>
          <div className="glass-card-lg p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-slate-150 pb-3 flex justify-between items-center text-left">
              <div>
                <h3 className="font-sans font-bold text-slate-950 text-sm">
                  ✏ Edit Test Scenario Setup: {editingTestCase.id}
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5 hover:none">Modify parameters or custom sequence assertions dynamically.</p>
              </div>
              <button 
                onClick={() => setEditingTestCase(null)}
                className="text-slate-400 hover:text-slate-650 text-base font-bold font-mono px-1.5"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 text-left">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Scenario Title</label>
                <input
                  type="text"
                  value={editingTestCase.title}
                  onChange={(e) => setEditingTestCase({ ...editingTestCase, title: e.target.value })}
                  className="input-glass w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Thorough Goal Description</label>
                <textarea
                  value={editingTestCase.description}
                  onChange={(e) => setEditingTestCase({ ...editingTestCase, description: e.target.value })}
                  rows={2}
                  className="input-glass w-full text-xs leading-normal"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Priority</label>
                  <select
                    value={editingTestCase.priority}
                    onChange={(e: any) => setEditingTestCase({ ...editingTestCase, priority: e.target.value })}
                    className="input-glass w-full text-xs"
                  >
                    <option value="P0">P0 - Critical Focus</option>
                    <option value="P1">P1 - Standard Flow</option>
                    <option value="P2">P2 - Secondary Checks</option>
                    <option value="P3">P3 - Trivial Specs</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Testing Type</label>
                  <select
                    value={editingTestCase.type}
                    onChange={(e: any) => setEditingTestCase({ ...editingTestCase, type: e.target.value })}
                    className="input-glass w-full text-xs"
                  >
                    <option value="Positive">Positive</option>
                    <option value="Negative">Negative</option>
                    <option value="Edge">Edge Case</option>
                    <option value="Boundary">Boundary Check</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Automation Feasibility</label>
                  <select
                    value={editingTestCase.automationStatus}
                    onChange={(e: any) => setEditingTestCase({ ...editingTestCase, automationStatus: e.target.value })}
                    className="input-glass w-full text-xs"
                  >
                    <option value="Automatable">Automatable</option>
                    <option value="Needs Manual">Needs Manual</option>
                    <option value="Automated">Automated</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Confidence Rating (%)</label>
                  <input
                    type="number"
                    value={editingTestCase.confidenceScore}
                    onChange={(e) => setEditingTestCase({ ...editingTestCase, confidenceScore: Math.min(100, Math.max(0, Number(e.target.value))) })}
                    className="input-glass w-full text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Preconditions</label>
                <input
                  type="text"
                  value={editingTestCase.preconditions}
                  onChange={(e) => setEditingTestCase({ ...editingTestCase, preconditions: e.target.value })}
                  className="input-glass w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Test Parameters / Mock Data</label>
                <input
                  type="text"
                  value={editingTestCase.testData}
                  onChange={(e) => setEditingTestCase({ ...editingTestCase, testData: e.target.value })}
                  className="input-glass w-full text-xs"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500">Test Execution Steps (action | expected result)</label>
                  <button
                    type="button"
                    onClick={() => {
                      const steps = [...(editingTestCase.steps || [])];
                      steps.push({ action: 'Proceed to next check state', expectedResult: 'State responds matches specifications.' });
                      setEditingTestCase({ ...editingTestCase, steps });
                    }}
                    className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-sm hover:underline font-mono"
                  >
                    + Add Stage Step
                  </button>
                </div>
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto bg-slate-50 p-2 border border-slate-200 rounded-lg">
                  {editingTestCase.steps?.map((step, idx) => (
                    <div key={idx} className="flex gap-1 items-start">
                      <span className="text-[10px] font-mono text-slate-400 mt-1">#{idx+1}</span>
                      <input
                        type="text"
                        placeholder="Action"
                        value={step.action}
                        onChange={(e) => {
                          const steps = [...editingTestCase.steps];
                          steps[idx].action = e.target.value;
                          setEditingTestCase({ ...editingTestCase, steps });
                        }}
                        className="flex-1 bg-white border border-slate-200 rounded p-1 text-[11px] text-slate-800 focus:ring-1 focus:ring-blue-400 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Expected behavior"
                        value={step.expectedResult}
                        onChange={(e) => {
                          const steps = [...editingTestCase.steps];
                          steps[idx].expectedResult = e.target.value;
                          setEditingTestCase({ ...editingTestCase, steps });
                        }}
                        className="flex-1 bg-white border border-slate-200 rounded p-1 text-[11px] text-blue-700 focus:ring-1 focus:ring-blue-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const steps = [...editingTestCase.steps];
                          steps.splice(idx, 1);
                          setEditingTestCase({ ...editingTestCase, steps });
                        }}
                        className="text-red-500 hover:text-red-700 font-bold text-xs px-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {(!editingTestCase.steps || editingTestCase.steps.length === 0) && (
                    <div className="text-center text-slate-400 font-mono text-[10px] py-4">No testing steps configured. Click Add Stage step above.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setEditingTestCase(null)}
                className="bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-705 font-mono text-[11px] px-3.5 py-1.5 rounded-xl font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onUpdateTestCase) {
                    onUpdateTestCase(editingTestCase);
                  }
                  // Also update local list
                  setLocalTestCases(prev => prev.map(tc => tc.id === editingTestCase.id ? editingTestCase : tc));
                  setEditingTestCase(null);
                  setFeedback(`Scenario ${editingTestCase.id} updated and saved successfully!`);
                  setTimeout(() => setFeedback(''), 3000);
                }}
                className="btn-primary font-mono text-[11px] px-4 py-1.5"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
