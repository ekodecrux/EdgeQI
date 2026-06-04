import { useState, useEffect, useRef, useCallback } from 'react';
import { apiUrl } from '@/src/config/api';
import {
  Brain, Upload, Search, FileText, Trash2, CheckCircle, AlertCircle,
  Loader2, Database, Settings, ChevronDown, ChevronRight, X, Plus,
  BookOpen, Zap, Globe, Server, Key, RefreshCw, MessageSquare, Send,
  Tag, Clock, BarChart2, HardDrive, FileCode, FileImage, Archive
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface RAGDoc {
  id: string;
  project_id: string | null;
  name: string;
  file_type: string;
  size_bytes: number;
  char_count: number;
  chunk_count: number;
  status: 'processing' | 'ready' | 'error';
  summary: string;
  topics: string[];
  llm_provider: string;
  vector_store: string;
  embedded: number;
  created_at: string;
}

interface LLMConfig {
  id: string;
  project_id: string | null;
  provider: string;
  model: string;
  api_key_hint: string;
  base_url: string;
  temperature: number;
  max_tokens: number;
  is_active: number;
  is_internal: number;
  notes: string;
}

interface SearchResult {
  id: string;
  name: string;
  project_id: string | null;
  score: number;
  excerpts: string[];
  summary: string;
}

interface RAGKnowledgeBaseProps {
  currentProjectId: string;
  onNavigateTo?: (tab: string) => void;
}

// ─── LLM Provider presets ────────────────────────────────────────────────────
const LLM_PROVIDERS = [
  { id: 'openai',    label: 'OpenAI',        models: ['gpt-4o','gpt-4o-mini','gpt-4-turbo','gpt-3.5-turbo'], internal: false, icon: '🤖' },
  { id: 'anthropic', label: 'Anthropic',     models: ['claude-3-5-sonnet-20241022','claude-3-haiku-20240307','claude-3-opus-20240229'], internal: false, icon: '🧠' },
  { id: 'gemini',    label: 'Google Gemini', models: ['gemini-1.5-pro','gemini-1.5-flash','gemini-pro'], internal: false, icon: '✨' },
  { id: 'ollama',    label: 'Ollama (Local)', models: ['llama3.2','mistral','codellama','phi3'], internal: true, icon: '🏠' },
  { id: 'azure',     label: 'Azure OpenAI',  models: ['gpt-4','gpt-4-32k','gpt-35-turbo'], internal: true, icon: '☁️' },
  { id: 'custom',    label: 'Custom / Internal LLM', models: ['custom-model'], internal: true, icon: '🔧' },
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(type: string) {
  if (type.includes('pdf')) return <FileText className="w-4 h-4 text-red-500" />;
  if (type.includes('code') || type.includes('json') || type.includes('ts') || type.includes('js')) return <FileCode className="w-4 h-4 text-blue-500" />;
  if (type.includes('image')) return <FileImage className="w-4 h-4 text-purple-500" />;
  if (type.includes('zip') || type.includes('archive')) return <Archive className="w-4 h-4 text-amber-500" />;
  return <FileText className="w-4 h-4 text-slate-500" />;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RAGKnowledgeBase({ currentProjectId, onNavigateTo }: RAGKnowledgeBaseProps) {
  const [activeView, setActiveView] = useState<'docs' | 'query' | 'llm-config'>('docs');
  const [docs, setDocs] = useState<RAGDoc[]>([]);
  const [llmConfigs, setLLMConfigs] = useState<LLMConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Upload state
  const [uploadMode, setUploadMode] = useState<'text' | 'file'>('text');
  const [uploadText, setUploadText] = useState('');
  const [uploadName, setUploadName] = useState('');
  const [uploadFileType, setUploadFileType] = useState('text');
  const [uploadProvider, setUploadProvider] = useState('openai');
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

  // KB Query state
  const [kbQuestion, setKbQuestion] = useState('');
  const [kbAnswer, setKbAnswer] = useState('');
  const [kbSources, setKbSources] = useState<string[]>([]);
  const [kbQuerying, setKbQuerying] = useState(false);
  const [kbHistory, setKbHistory] = useState<{ q: string; a: string; sources: string[]; time: string }[]>([]);

  // LLM Config state
  const [showLLMForm, setShowLLMForm] = useState(false);
  const [llmForm, setLLMForm] = useState({
    provider: 'openai', model: 'gpt-4o-mini', api_key: '', base_url: '',
    temperature: 0.3, max_tokens: 4096, is_active: true, is_internal: false, notes: ''
  });
  const [savingLLM, setSavingLLM] = useState(false);

  const authToken = localStorage.getItem('iq_token') || '';
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` };
  const scopedProjectId = currentProjectId === 'ALL' ? undefined : currentProjectId;

  // ── Fetch data ────────────────────────────────────────────────────────────
  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const url = scopedProjectId ? `/api/quality/rag-kb?project_id=${scopedProjectId}` : `/api/quality/rag-kb`;
      const r = await fetch(url, { headers });
      if (r.ok) setDocs(await r.json());
    } catch {}
    setLoading(false);
  }, [currentProjectId]);

  const fetchLLMConfigs = useCallback(async () => {
    try {
      const url = scopedProjectId ? `/api/quality/llm-configs?project_id=${scopedProjectId}` : `/api/quality/llm-configs`;
      const r = await fetch(url, { headers });
      if (r.ok) setLLMConfigs(await r.json());
    } catch {}
  }, [currentProjectId]);

  useEffect(() => { fetchDocs(); fetchLLMConfigs(); }, [currentProjectId]);

  // ── Upload: text paste ────────────────────────────────────────────────────
  const handleTextUpload = async () => {
    if (!uploadText.trim() || !uploadName.trim()) return;
    setUploading(true);
    setUploadProgress(10);
    try {
      // Simulate chunked progress for large texts
      const totalLen = uploadText.length;
      if (totalLen > 50000) {
        for (let p = 10; p < 80; p += 15) {
          await new Promise(r => setTimeout(r, 200));
          setUploadProgress(p);
        }
      }
      const r = await fetch(apiUrl('/api/quality/rag-kb/upload'), {
        method: 'POST', headers,
        body: JSON.stringify({ project_id: scopedProjectId, name: uploadName, content: uploadText, file_type: uploadFileType, llm_provider: uploadProvider })
      });
      setUploadProgress(95);
      if (r.ok) {
        setUploadText(''); setUploadName(''); setShowUploadPanel(false);
        await fetchDocs();
      }
    } catch {}
    setUploadProgress(100);
    setTimeout(() => setUploading(false), 500);
  };

  // ── Upload: file ──────────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadProgress(5);
    const name = uploadName || file.name;
    try {
      // Read file as text (for all text-based file types)
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
        setUploadProgress(30);
      });
      setUploadProgress(60);
      const ext = file.name.split('.').pop()?.toLowerCase() || 'txt';
      const r = await fetch(apiUrl('/api/quality/rag-kb/upload'), {
        method: 'POST', headers,
        body: JSON.stringify({ project_id: scopedProjectId, name, content, file_type: ext, llm_provider: uploadProvider })
      });
      setUploadProgress(90);
      if (r.ok) { setUploadName(''); setShowUploadPanel(false); await fetchDocs(); }
    } catch {}
    setUploadProgress(100);
    setTimeout(() => setUploading(false), 500);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Search ────────────────────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const params = new URLSearchParams({ q: searchQuery, limit: '8' });
      if (scopedProjectId) params.append('project_id', scopedProjectId);
      const r = await fetch(apiUrl(`/api/quality/rag-kb/search?${params}`), { headers });
      if (r.ok) { const data = await r.json(); setSearchResults(data.results || []); }
    } catch {}
    setSearching(false);
  };

  // ── KB Query ──────────────────────────────────────────────────────────────
  const handleKBQuery = async () => {
    if (!kbQuestion.trim()) return;
    setKbQuerying(true);
    setKbAnswer(''); setKbSources([]);
    try {
      const r = await fetch(apiUrl('/api/quality/rag-kb/query'), {
        method: 'POST', headers,
        body: JSON.stringify({ question: kbQuestion, project_id: scopedProjectId, module: 'rag-kb' })
      });
      if (r.ok) {
        const data = await r.json();
        setKbAnswer(data.answer);
        setKbSources(data.sources || []);
        setKbHistory(prev => [{ q: kbQuestion, a: data.answer, sources: data.sources || [], time: new Date().toLocaleTimeString() }, ...prev.slice(0, 9)]);
        setKbQuestion('');
      }
    } catch {}
    setKbQuerying(false);
  };

  // ── Delete doc ────────────────────────────────────────────────────────────
  const handleDeleteDoc = async (id: string) => {
    if (!confirm('Remove this document from the knowledge base?')) return;
    await fetch(apiUrl(`/api/quality/rag-kb/${id}`), { method: 'DELETE', headers });
    setDocs(prev => prev.filter(d => d.id !== id));
  };

  // ── Save LLM Config ───────────────────────────────────────────────────────
  const handleSaveLLM = async () => {
    if (!llmForm.provider || !llmForm.model) return;
    setSavingLLM(true);
    try {
      const r = await fetch(apiUrl('/api/quality/llm-configs'), {
        method: 'POST', headers,
        body: JSON.stringify({ ...llmForm, project_id: scopedProjectId, is_active: llmForm.is_active ? 1 : 0, is_internal: llmForm.is_internal ? 1 : 0 })
      });
      if (r.ok) {
        setShowLLMForm(false);
        setLLMForm({ provider: 'openai', model: 'gpt-4o-mini', api_key: '', base_url: '', temperature: 0.3, max_tokens: 4096, is_active: true, is_internal: false, notes: '' });
        await fetchLLMConfigs();
      }
    } catch {}
    setSavingLLM(false);
  };

  const handleActivateLLM = async (id: string) => {
    await fetch(apiUrl(`/api/quality/llm-configs/${id}`), { method: 'PATCH', headers, body: JSON.stringify({ is_active: 1 }) });
    await fetchLLMConfigs();
  };

  const handleDeleteLLM = async (id: string) => {
    await fetch(apiUrl(`/api/quality/llm-configs/${id}`), { method: 'DELETE', headers });
    setLLMConfigs(prev => prev.filter(c => c.id !== id));
  };

  const selectedProvider = LLM_PROVIDERS.find(p => p.id === llmForm.provider);
  const totalDocs = docs.length;
  const totalChars = docs.reduce((s, d) => s + d.char_count, 0);
  const totalChunks = docs.reduce((s, d) => s + d.chunk_count, 0);
  const activeLLM = llmConfigs.find(c => c.is_active === 1);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 animate-fadeInUp">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg,#0F172A,#5B6CFF)' }}>
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 style={{ fontFamily: '"Inter",Arial,sans-serif', fontSize: 17, fontWeight: 800, color: '#0F172A', letterSpacing: '0.02em' }}>
              RAG Knowledge Base
            </h2>
            <p style={{ fontFamily: '"Inter",Arial,sans-serif', fontSize: 12, color: '#475569' }}>
              Project-scoped document intelligence · Any-size uploads · LLM-agnostic vector search
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs" style={{ background: '#eaf5fd', color: '#5B6CFF', border: '1px solid #b3ddf7' }}>
            {activeLLM ? (
              <><CheckCircle className="w-3.5 h-3.5" /><span>LLM: {activeLLM.provider}/{activeLLM.model}</span></>
            ) : (
              <><AlertCircle className="w-3.5 h-3.5 text-amber-500" /><span className="text-amber-600">No Active LLM</span></>
            )}
          </div>
          <button onClick={() => setShowUploadPanel(!showUploadPanel)} className="btn-primary flex items-center gap-2">
            <Upload className="w-3.5 h-3.5" />
            Add Document
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Documents', value: totalDocs, icon: BookOpen, color: '#5B6CFF' },
          { label: 'Total Content', value: formatBytes(docs.reduce((s,d) => s+d.size_bytes,0)), icon: HardDrive, color: '#7c3aed' },
          { label: 'Text Chunks', value: totalChunks.toLocaleString(), icon: Database, color: '#059669' },
          { label: 'LLM Providers', value: llmConfigs.length, icon: Brain, color: '#d97706' },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${stat.color}18` }}>
              <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
            </div>
            <div>
              <div className="text-lg font-bold" style={{ color: '#0F172A' }}>{stat.value}</div>
              <div className="text-xs text-slate-500">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* View Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {[
          { id: 'docs', label: 'Documents', icon: BookOpen },
          { id: 'query', label: 'Query KB', icon: MessageSquare },
          { id: 'llm-config', label: 'LLM Providers', icon: Settings },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveView(tab.id as any)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${activeView === tab.id ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}>
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Upload Panel (collapsible) ──────────────────────────────────────── */}
      {showUploadPanel && (
        <div className="bg-white border border-blue-200 rounded-xl p-5 shadow-sm space-y-4 animate-fadeInUp" style={{ borderColor: '#b3ddf7' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4" style={{ color: '#5B6CFF' }} />
              <span className="font-semibold text-sm" style={{ color: '#0F172A' }}>Add to Knowledge Base</span>
              <span className="text-xs text-slate-500">— supports any document size</span>
            </div>
            <button onClick={() => setShowUploadPanel(false)} className="p-1 hover:bg-slate-100 rounded"><X className="w-4 h-4 text-slate-400" /></button>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-2">
            {[{ id: 'text', label: 'Paste Text / URL' }, { id: 'file', label: 'Upload File' }].map(m => (
              <button key={m.id} onClick={() => setUploadMode(m.id as any)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all ${uploadMode === m.id ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-slate-200 text-slate-600'}`}>
                {m.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 space-y-3">
              <input
                placeholder="Document name (e.g. 'API Spec v2', 'User Stories Q1')"
                value={uploadName}
                onChange={e => setUploadName(e.target.value)}
                className="input-glass w-full text-sm"
              />
              {uploadMode === 'text' ? (
                <textarea
                  placeholder="Paste any document content here — requirements, user stories, API docs, architecture docs, test plans, defect reports, release notes, meeting notes... no size limit."
                  value={uploadText}
                  onChange={e => setUploadText(e.target.value)}
                  rows={8}
                  className="input-glass w-full text-sm font-mono resize-y"
                />
              ) : (
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-blue-300 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Click to select file or drag &amp; drop</p>
                  <p className="text-xs text-slate-400 mt-1">TXT, PDF, MD, JSON, CSV, DOCX, XML, YAML, TSV, LOG</p>
                  <input ref={fileInputRef} type="file" className="hidden"
                    accept=".txt,.pdf,.md,.json,.csv,.docx,.xml,.yaml,.yml,.tsv,.log,.rst,.tex"
                    onChange={handleFileUpload} />
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">File Type / Category</label>
                <select value={uploadFileType} onChange={e => setUploadFileType(e.target.value)} className="input-glass w-full text-sm">
                  <option value="text">Plain Text / Docs</option>
                  <option value="requirements">Requirements</option>
                  <option value="test-cases">Test Cases</option>
                  <option value="architecture">Architecture</option>
                  <option value="api-spec">API Specification</option>
                  <option value="defect-report">Defect Report</option>
                  <option value="release-notes">Release Notes</option>
                  <option value="meeting-notes">Meeting Notes</option>
                  <option value="json">JSON</option>
                  <option value="yaml">YAML / Config</option>
                  <option value="csv">CSV / Data</option>
                  <option value="code">Source Code</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">LLM Provider</label>
                <select value={uploadProvider} onChange={e => setUploadProvider(e.target.value)} className="input-glass w-full text-sm">
                  {LLM_PROVIDERS.map(p => (
                    <option key={p.id} value={p.id}>{p.icon} {p.label}</option>
                  ))}
                </select>
              </div>
              {uploading && (
                <div className="space-y-1">
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <p className="text-xs text-blue-600">Indexing... {uploadProgress}%</p>
                </div>
              )}
              {uploadMode === 'text' && (
                <button onClick={handleTextUpload} disabled={uploading || !uploadText.trim() || !uploadName.trim()}
                  className="btn-primary w-full flex items-center justify-center gap-2">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                  {uploading ? 'Indexing...' : 'Index Document'}
                </button>
              )}
              <p className="text-xs text-slate-400 text-center">
                {currentProjectId === 'ALL' ? '⚠ Select a project to scope this doc' : `📁 Scoped to: ${currentProjectId}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── DOCUMENTS VIEW ─────────────────────────────────────────────────── */}
      {activeView === 'docs' && (
        <div className="space-y-3">
          {/* Search bar */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                placeholder="Search across all documents (keyword, topic, content)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="input-glass w-full pl-9 text-sm"
              />
            </div>
            <button onClick={handleSearch} disabled={searching} className="btn-primary flex items-center gap-2">
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </button>
            <button onClick={fetchDocs} className="btn-ghost flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3" style={{ borderColor: '#b3ddf7' }}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold" style={{ color: '#0F172A' }}>
                  <Search className="w-3.5 h-3.5 inline mr-1" />
                  {searchResults.length} results for "{searchQuery}"
                </span>
                <button onClick={() => setSearchResults([])} className="text-xs text-slate-500 hover:text-slate-800">Clear</button>
              </div>
              {searchResults.map(r => (
                <div key={r.id} className="bg-white rounded-lg p-3 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold" style={{ color: '#0F172A' }}>{r.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Score: {r.score}</span>
                  </div>
                  {r.excerpts.map((ex, i) => (
                    <p key={i} className="text-xs text-slate-600 bg-slate-50 rounded p-2 font-mono">{ex}</p>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Document Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : docs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <Brain className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-700 mb-1">Knowledge Base is Empty</h3>
              <p className="text-xs text-slate-500 mb-4">Upload requirements, test cases, architecture docs, API specs — anything the AI should know about your project.</p>
              <button onClick={() => setShowUploadPanel(true)} className="btn-primary inline-flex items-center gap-2">
                <Upload className="w-3.5 h-3.5" /> Add First Document
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {docs.map(doc => (
                <div key={doc.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {fileIcon(doc.file_type)}
                        <span className="text-sm font-semibold text-slate-800 truncate">{doc.name}</span>
                      </div>
                      <button onClick={() => handleDeleteDoc(doc.id)} className="p-1 hover:bg-red-50 rounded shrink-0 ml-1">
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>

                    {/* Status badge */}
                    <div className="flex items-center gap-2 mb-3">
                      {doc.status === 'ready' ? (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                          <CheckCircle className="w-3 h-3" /> Ready
                        </span>
                      ) : doc.status === 'processing' ? (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                          <Loader2 className="w-3 h-3 animate-spin" /> Processing
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700">
                          <AlertCircle className="w-3 h-3" /> Error
                        </span>
                      )}
                      <span className="text-xs text-slate-400 uppercase font-mono">{doc.file_type}</span>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {[
                        { label: 'Size', value: formatBytes(doc.size_bytes) },
                        { label: 'Chars', value: doc.char_count.toLocaleString() },
                        { label: 'Chunks', value: doc.chunk_count },
                      ].map(s => (
                        <div key={s.label} className="text-center p-1.5 bg-slate-50 rounded-lg">
                          <div className="text-xs font-bold text-slate-700">{s.value}</div>
                          <div className="text-[10px] text-slate-400">{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Summary */}
                    {doc.summary && (
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 mb-2">{doc.summary}</p>
                    )}

                    {/* Topics */}
                    {doc.topics.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {doc.topics.slice(0, 5).map(t => (
                          <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 flex items-center gap-0.5">
                            <Tag className="w-2.5 h-2.5" />{t}
                          </span>
                        ))}
                        {doc.topics.length > 5 && (
                          <span className="text-[10px] text-slate-400">+{doc.topics.length - 5} more</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {doc.llm_provider} · {doc.vector_store}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── QUERY KB VIEW ──────────────────────────────────────────────────── */}
      {activeView === 'query' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
            {/* Query Panel */}
            <div className="xl:col-span-3 space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-4 h-4" style={{ color: '#5B6CFF' }} />
                  <span className="font-semibold text-sm" style={{ color: '#0F172A' }}>Ask the Knowledge Base</span>
                </div>
                {!activeLLM && (
                  <div className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2 text-xs text-amber-700">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    No active LLM provider configured. Answers will use keyword-matched context. 
                    <button onClick={() => setActiveView('llm-config')} className="underline font-semibold ml-1">Configure LLM →</button>
                  </div>
                )}
                <textarea
                  placeholder="Ask anything about your project... e.g. 'What are the login requirements?', 'Generate test cases for payment flow', 'Summarize known defects in checkout module'"
                  value={kbQuestion}
                  onChange={e => setKbQuestion(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleKBQuery(); }}
                  rows={4}
                  className="input-glass w-full text-sm resize-none mb-3"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Ctrl+Enter to submit · {docs.length} docs in KB</span>
                  <button onClick={handleKBQuery} disabled={kbQuerying || !kbQuestion.trim()} className="btn-primary flex items-center gap-2">
                    {kbQuerying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {kbQuerying ? 'Searching...' : 'Ask'}
                  </button>
                </div>
              </div>

              {/* Answer Panel */}
              {kbAnswer && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm animate-fadeInUp space-y-3">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4" style={{ color: '#5B6CFF' }} />
                    <span className="font-semibold text-sm" style={{ color: '#0F172A' }}>Answer</span>
                    {kbSources.length > 0 && (
                      <div className="flex gap-1 ml-auto flex-wrap">
                        {kbSources.map(s => (
                          <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                            📄 {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-lg p-4 font-mono text-xs">{kbAnswer}</div>
                </div>
              )}

              {/* Suggested queries */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-600 mb-3">💡 Suggested Queries</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'What are the main functional requirements?',
                    'Summarize known defects and their severity',
                    'Generate test cases for the login flow',
                    'What APIs are documented in this project?',
                    'What are the performance requirements?',
                    'List all user roles and their permissions',
                    'What are the security requirements?',
                    'Summarize sprint goals and outcomes',
                  ].map(q => (
                    <button key={q} onClick={() => setKbQuestion(q)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all text-left">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Query History */}
            <div className="xl:col-span-2 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-700">Query History</span>
                <span className="text-xs text-slate-400 ml-auto">{kbHistory.length} queries</span>
              </div>
              {kbHistory.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No queries yet. Ask the KB something!</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {kbHistory.map((h, i) => (
                    <div key={i} className="border border-slate-100 rounded-lg p-3 hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => { setKbQuestion(h.q); setKbAnswer(h.a); setKbSources(h.sources); }}>
                      <p className="text-xs font-semibold text-slate-700 mb-1 line-clamp-2">❓ {h.q}</p>
                      <p className="text-[10px] text-slate-500 line-clamp-3">{h.a}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-slate-400">{h.time}</span>
                        {h.sources.length > 0 && <span className="text-[10px] text-blue-500">{h.sources.length} source(s)</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── LLM CONFIG VIEW ────────────────────────────────────────────────── */}
      {activeView === 'llm-config' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">Configure LLM providers for AI-powered KB queries and test generation. Supports public APIs and customer-hosted internal LLMs.</p>
            <button onClick={() => setShowLLMForm(!showLLMForm)} className="btn-primary flex items-center gap-2">
              <Plus className="w-3.5 h-3.5" /> Add LLM Provider
            </button>
          </div>

          {/* Add LLM Form */}
          {showLLMForm && (
            <div className="bg-white border border-blue-200 rounded-xl p-5 shadow-sm space-y-4 animate-fadeInUp" style={{ borderColor: '#b3ddf7' }}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm" style={{ color: '#0F172A' }}>New LLM Provider Configuration</span>
                <button onClick={() => setShowLLMForm(false)}><X className="w-4 h-4 text-slate-400" /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Provider</label>
                  <select value={llmForm.provider} onChange={e => {
                    const prov = LLM_PROVIDERS.find(p => p.id === e.target.value);
                    setLLMForm(f => ({ ...f, provider: e.target.value, model: prov?.models[0] || '', is_internal: prov?.internal || false }));
                  }} className="input-glass w-full text-sm">
                    {LLM_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.icon} {p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Model</label>
                  <select value={llmForm.model} onChange={e => setLLMForm(f => ({ ...f, model: e.target.value }))} className="input-glass w-full text-sm">
                    {(selectedProvider?.models || []).map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">API Key <span className="text-slate-400">(encrypted at rest)</span></label>
                  <input type="password" placeholder={llmForm.is_internal ? 'Optional for internal LLMs' : 'sk-...'} value={llmForm.api_key}
                    onChange={e => setLLMForm(f => ({ ...f, api_key: e.target.value }))} className="input-glass w-full text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">
                    Base URL <span className="text-slate-400">(for internal/Ollama LLMs)</span>
                  </label>
                  <input placeholder="http://your-internal-llm-server:11434/v1" value={llmForm.base_url}
                    onChange={e => setLLMForm(f => ({ ...f, base_url: e.target.value }))} className="input-glass w-full text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Temperature ({llmForm.temperature})</label>
                  <input type="range" min={0} max={1} step={0.1} value={llmForm.temperature}
                    onChange={e => setLLMForm(f => ({ ...f, temperature: parseFloat(e.target.value) }))} className="w-full" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Max Tokens</label>
                  <input type="number" value={llmForm.max_tokens} onChange={e => setLLMForm(f => ({ ...f, max_tokens: parseInt(e.target.value) }))} className="input-glass w-full text-sm" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Notes</label>
                  <input placeholder="e.g. 'Production LLM for QA team', 'Internal Ollama for data privacy'" value={llmForm.notes}
                    onChange={e => setLLMForm(f => ({ ...f, notes: e.target.value }))} className="input-glass w-full text-sm" />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                    <input type="checkbox" checked={llmForm.is_active} onChange={e => setLLMForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
                    Set as Active Provider
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                    <input type="checkbox" checked={llmForm.is_internal} onChange={e => setLLMForm(f => ({ ...f, is_internal: e.target.checked }))} className="rounded" />
                    Customer-Hosted / Internal
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowLLMForm(false)} className="btn-ghost">Cancel</button>
                <button onClick={handleSaveLLM} disabled={savingLLM} className="btn-primary flex items-center gap-2">
                  {savingLLM ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                  Save Provider
                </button>
              </div>
            </div>
          )}

          {/* Provider Cards */}
          {llmConfigs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <Brain className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-700 mb-1">No LLM Providers Configured</h3>
              <p className="text-xs text-slate-500 mb-4">Add OpenAI, Anthropic, Google Gemini, or your internal/Ollama LLM for AI-powered queries.</p>
              <button onClick={() => setShowLLMForm(true)} className="btn-primary inline-flex items-center gap-2">
                <Plus className="w-3.5 h-3.5" /> Add First LLM Provider
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {llmConfigs.map(cfg => {
                const prov = LLM_PROVIDERS.find(p => p.id === cfg.provider);
                return (
                  <div key={cfg.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${cfg.is_active ? 'border-blue-300' : 'border-slate-200'}`}>
                    <div className={`p-1 text-center text-xs font-semibold ${cfg.is_active ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {cfg.is_active ? '✓ ACTIVE PROVIDER' : 'Inactive'}
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl">{prov?.icon || '🤖'}</span>
                        <div>
                          <div className="font-semibold text-sm text-slate-800">{prov?.label || cfg.provider}</div>
                          <div className="text-xs text-slate-500 font-mono">{cfg.model}</div>
                        </div>
                        {cfg.is_internal === 1 && (
                          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100 flex items-center gap-1">
                            <Server className="w-2.5 h-2.5" /> Internal
                          </span>
                        )}
                      </div>
                      {cfg.base_url && (
                        <div className="text-[10px] text-slate-500 font-mono bg-slate-50 rounded p-2 mb-2 truncate">
                          🔗 {cfg.base_url}
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                        <span>Temp: {cfg.temperature}</span>
                        <span>Max tokens: {cfg.max_tokens}</span>
                      </div>
                      {cfg.notes && <p className="text-xs text-slate-500 italic mb-3">{cfg.notes}</p>}
                      <div className="flex gap-2">
                        {!cfg.is_active && (
                          <button onClick={() => handleActivateLLM(cfg.id)} className="flex-1 btn-primary text-xs py-1.5">
                            Set Active
                          </button>
                        )}
                        <button onClick={() => handleDeleteLLM(cfg.id)} className="p-1.5 hover:bg-red-50 rounded border border-slate-200">
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Info box about internal LLMs */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3" style={{ borderColor: '#b3ddf7' }}>
            <Globe className="w-5 h-5 shrink-0" style={{ color: '#5B6CFF' }} />
            <div>
              <p className="text-xs font-semibold" style={{ color: '#0F172A' }}>Customer-Deployable Vector Store</p>
              <p className="text-xs text-slate-600 mt-1">
                EDGE QI supports both public LLMs (OpenAI, Anthropic, Google) and customer-internal LLMs (Ollama, Azure OpenAI, any OpenAI-compatible endpoint).
                Set <code className="bg-white px-1 rounded">base_url</code> to your internal server for full data privacy — no data leaves your network.
                Compatible with Ollama, LM Studio, vLLM, LocalAI, and any OpenAI-compatible API.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
