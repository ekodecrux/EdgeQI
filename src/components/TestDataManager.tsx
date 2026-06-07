import React, { useState, useEffect, useCallback } from 'react';
import {
  Database, Plus, RefreshCw, Download, Trash2, Save, Play,
  CheckCircle, XCircle, Clock, Eye, Copy, ChevronRight, X,
  Filter, Search, Globe, FileText, Zap, Shield, Package,
  Info, Layers, Code, Server, BarChart2, AlertCircle
} from 'lucide-react';

const API = (window as any).__API_BASE__ || '';

const STRATEGIES = [
  { id: 'anonymize',      label: 'Anonymize Production',  icon: Shield,   color: 'blue',   desc: 'Mask & anonymize real production data' },
  { id: 'api-definition', label: 'API Definition',        icon: Code,     color: 'purple', desc: 'Generate from OpenAPI/Swagger/Postman spec' },
  { id: 'synthetic',      label: 'Synthetic Data',        icon: Zap,      color: 'amber',  desc: 'AI-generated realistic synthetic records' },
  { id: 'conditions',     label: 'Rule-Based Conditions', icon: Filter,   color: 'green',  desc: 'Define rules and constraints for data' },
  { id: 'rag',            label: 'RAG / Knowledge Base',  icon: Layers,   color: 'indigo', desc: 'Generate from your uploaded KB documents' },
  { id: 'url-scrape',     label: 'URL Scraper',           icon: Globe,    color: 'teal',   desc: 'Scrape app/URL and suggest test data' },
  { id: 'erp',            label: 'ERP Integration',       icon: Server,   color: 'rose',   desc: 'Pull data from SAP, Salesforce, Oracle, etc.' },
];

const ENVIRONMENTS = ['dev', 'test', 'pre-prod', 'uat', 'performance', 'staging', 'production'];

const ENV_COLORS: Record<string, string> = {
  dev: 'bg-blue-100 text-blue-700',
  test: 'bg-purple-100 text-purple-700',
  'pre-prod': 'bg-amber-100 text-amber-700',
  uat: 'bg-green-100 text-green-700',
  performance: 'bg-orange-100 text-orange-700',
  staging: 'bg-indigo-100 text-indigo-700',
  production: 'bg-red-100 text-red-700',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  pending_approval: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  linked: 'bg-blue-100 text-blue-700',
};

interface DataSet {
  id: number;
  name: string;
  description: string;
  strategy: string;
  environment: string;
  status: string;
  record_count: number;
  created_at: string;
}

interface Props {
  currentProjectId: string;
  token: string;
}

export default function TestDataManager({ currentProjectId, token }: Props) {
  const [activeTab, setActiveTab] = useState<'dashboard'|'generate'|'sets'|'approvals'|'environments'|'erp'>('dashboard');
  const [sets, setSets] = useState<DataSet[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState('anonymize');
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<any>(null);
  const [genError, setGenError] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveEnv, setSaveEnv] = useState('test');
  const [saveDesc, setSaveDesc] = useState('');
  const [filterEnv, setFilterEnv] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [approvalComment, setApprovalComment] = useState('');
  const [erpConfigs, setErpConfigs] = useState<any[]>([]);
  const [showErpForm, setShowErpForm] = useState(false);
  const [erpForm, setErpForm] = useState({ name: '', system_type: 'sap', base_url: '', username: '', api_key: '' });
  const [feedback, setFeedback] = useState('');

  // Strategy form state
  const [anonInput, setAnonInput] = useState('');
  const [anonFields, setAnonFields] = useState('email,phone,name,ssn');
  const [apiSpec, setApiSpec] = useState('');
  const [apiFormat, setApiFormat] = useState('openapi');
  const [synthSchema, setSynthSchema] = useState('');
  const [synthCount, setSynthCount] = useState(10);
  const [condRules, setCondRules] = useState('');
  const [ragQuery, setRagQuery] = useState('');
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [erpConfigId, setErpConfigId] = useState('');
  const [erpEntity, setErpEntity] = useState('');

  const authH = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }), [token]);

  const showFb = (msg: string) => { setFeedback(msg); setTimeout(() => setFeedback(''), 3500); };

  const loadStats = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/test-data/stats?projectId=${currentProjectId}`, { headers: authH() });
      const d = await r.json();
      if (d.stats) setStats(d.stats);
    } catch {}
  }, [currentProjectId, authH]);

  const loadSets = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ projectId: currentProjectId });
      if (filterEnv) p.set('environment', filterEnv);
      if (filterStatus) p.set('status', filterStatus);
      const r = await fetch(`${API}/api/test-data/sets?${p}`, { headers: authH() });
      const d = await r.json();
      if (d.sets) setSets(d.sets);
    } catch {} finally { setLoading(false); }
  }, [currentProjectId, filterEnv, filterStatus, authH]);

  const loadErp = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/test-data/erp-configs`, { headers: authH() });
      const d = await r.json();
      if (d.configs) setErpConfigs(d.configs);
    } catch {}
  }, [authH]);

  useEffect(() => { loadStats(); loadSets(); loadErp(); }, [loadStats, loadSets, loadErp]);

  const generate = async () => {
    setGenerating(true); setGenResult(null); setGenError('');
    try {
      let body: any = { projectId: currentProjectId };
      if (selectedStrategy === 'anonymize') body = { ...body, productionData: anonInput, fieldsToMask: anonFields.split(',').map(f => f.trim()) };
      else if (selectedStrategy === 'api-definition') body = { ...body, apiSpec, format: apiFormat };
      else if (selectedStrategy === 'synthetic') body = { ...body, schema: synthSchema, count: synthCount };
      else if (selectedStrategy === 'conditions') body = { ...body, rules: condRules };
      else if (selectedStrategy === 'rag') body = { ...body, query: ragQuery };
      else if (selectedStrategy === 'url-scrape') body = { ...body, url: scrapeUrl };
      else if (selectedStrategy === 'erp') body = { ...body, erpConfigId, entity: erpEntity };

      const r = await fetch(`${API}/api/test-data/generate/${selectedStrategy}`, {
        method: 'POST', headers: authH(), body: JSON.stringify(body)
      });
      const d = await r.json();
      if (d.records) { setGenResult(d); setSaveName(`${selectedStrategy}-${new Date().toISOString().slice(0,10)}`); setShowSaveModal(true); }
      else setGenError(d.error || 'Generation failed');
    } catch (e: any) { setGenError(e.message); } finally { setGenerating(false); }
  };

  const saveSet = async () => {
    if (!saveName.trim() || !genResult) return;
    try {
      const r = await fetch(`${API}/api/test-data/sets`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ name: saveName, description: saveDesc, strategy: selectedStrategy, environment: saveEnv, projectId: currentProjectId, records: genResult.records, metadata: genResult.metadata || {} })
      });
      const d = await r.json();
      if (d.set) { setSets(prev => [d.set, ...prev]); setShowSaveModal(false); setGenResult(null); showFb(`✅ "${saveName}" saved with ${d.set.record_count} records`); loadStats(); }
    } catch {}
  };

  const submitForApproval = async (id: number) => {
    const r = await fetch(`${API}/api/test-data/sets/${id}/submit`, { method: 'POST', headers: authH() });
    const d = await r.json();
    if (d.set) { setSets(prev => prev.map(s => s.id === id ? d.set : s)); showFb('Submitted for approval'); }
  };

  const approveSet = async (id: number, action: 'approve'|'reject') => {
    const r = await fetch(`${API}/api/test-data/sets/${id}/${action}`, { method: 'POST', headers: authH(), body: JSON.stringify({ comment: approvalComment }) });
    const d = await r.json();
    if (d.set) { setSets(prev => prev.map(s => s.id === id ? d.set : s)); setApprovalComment(''); showFb(`Set ${action}d`); }
  };

  const cloneSet = async (id: number, env: string) => {
    const r = await fetch(`${API}/api/test-data/sets/${id}/clone`, { method: 'POST', headers: authH(), body: JSON.stringify({ targetEnvironment: env }) });
    const d = await r.json();
    if (d.set) { setSets(prev => [d.set, ...prev]); showFb(`Cloned to ${env}`); loadStats(); }
  };

  const deleteSet = async (id: number) => {
    if (!confirm('Delete this data set?')) return;
    await fetch(`${API}/api/test-data/sets/${id}`, { method: 'DELETE', headers: authH() });
    setSets(prev => prev.filter(s => s.id !== id)); showFb('Deleted'); loadStats();
  };

  const exportSet = (id: number, fmt: 'json'|'csv') => window.open(`${API}/api/test-data/sets/${id}/export?format=${fmt}&token=${token}`, '_blank');

  const addErpConfig = async () => {
    const r = await fetch(`${API}/api/test-data/erp-configs`, { method: 'POST', headers: authH(), body: JSON.stringify(erpForm) });
    const d = await r.json();
    if (d.config) { setErpConfigs(prev => [d.config, ...prev]); setShowErpForm(false); showFb('ERP config saved'); }
  };

  const testErpConfig = async (id: number) => {
    const r = await fetch(`${API}/api/test-data/erp-configs/${id}/test`, { method: 'POST', headers: authH() });
    const d = await r.json();
    showFb(d.success ? '✅ ERP connection successful' : `❌ ${d.error}`);
  };

  const filteredSets = sets.filter(s => !searchQ || s.name.toLowerCase().includes(searchQ.toLowerCase()));
  const pendingSets = sets.filter(s => s.status === 'pending_approval');

  const TABS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'generate', label: 'Generate' },
    { id: 'sets', label: `Data Sets (${sets.length})` },
    { id: 'approvals', label: `Approvals (${pendingSets.length})` },
    { id: 'environments', label: 'Environments' },
    { id: 'erp', label: 'ERP Config' },
  ] as const;

  return (
    <div className="space-y-4 animate-fadeInUp">
      {/* Header */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="panel-title flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-500" />
              Test Data Manager
            </h2>
            <p className="text-xs text-slate-500 mt-1">Generate, manage, approve, and deploy test data across all environments using 7 intelligent strategies.</p>
          </div>
          <button onClick={() => { loadStats(); loadSets(); }} className="btn-ghost flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
        {feedback && <div className="mt-3 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 font-mono">{feedback}</div>}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === t.id ? 'bg-blue-600 text-white shadow-sm' : 'bg-white/60 text-slate-600 border border-slate-200 hover:border-blue-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Total Sets', value: stats.total_sets || 0, color: 'blue', Icon: Database },
              { label: 'Approved', value: stats.approved_sets || 0, color: 'green', Icon: CheckCircle },
              { label: 'Pending Approval', value: stats.pending_sets || 0, color: 'amber', Icon: Clock },
              { label: 'Total Records', value: (stats.total_records || 0).toLocaleString(), color: 'purple', Icon: Package },
            ].map(kpi => (
              <div key={kpi.label} className="glass-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <kpi.Icon className={`w-4 h-4 text-${kpi.color}-500`} />
                  <span className="text-xs text-slate-500">{kpi.label}</span>
                </div>
                <p className={`text-2xl font-bold text-${kpi.color}-600`}>{kpi.value}</p>
              </div>
            ))}
          </div>
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Sets by Environment</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {ENVIRONMENTS.map(env => {
                const count = sets.filter(s => s.environment === env).length;
                return (
                  <div key={env} className={`rounded-xl p-3 text-center ${ENV_COLORS[env] || 'bg-slate-100 text-slate-600'}`}>
                    <p className="text-lg font-bold">{count}</p>
                    <p className="text-[10px] font-mono uppercase">{env}</p>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Sets by Strategy</h3>
            <div className="space-y-2">
              {STRATEGIES.map(s => {
                const count = sets.filter(ds => ds.strategy === s.id).length;
                const pct = sets.length ? Math.round((count / sets.length) * 100) : 0;
                return (
                  <div key={s.id} className="flex items-center gap-3">
                    <s.icon className={`w-3.5 h-3.5 text-${s.color}-500 shrink-0`} />
                    <span className="text-xs text-slate-600 w-36 shrink-0">{s.label}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2">
                      <div className={`h-2 rounded-full bg-${s.color}-400`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-mono text-slate-500 w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
          {sets.slice(0, 5).length > 0 && (
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Recent Data Sets</h3>
              <div className="space-y-2">
                {sets.slice(0, 5).map(s => (
                  <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg border border-slate-200/80 bg-white/50">
                    <Database className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{s.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{s.record_count} records · {s.strategy}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ENV_COLORS[s.environment] || ''}`}>{s.environment}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[s.status] || ''}`}>{s.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* GENERATE */}
      {activeTab === 'generate' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4">
            <div className="glass-card p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Select Strategy</h3>
              {STRATEGIES.map(s => (
                <button key={s.id} onClick={() => setSelectedStrategy(s.id)}
                  className={`w-full text-left p-3 rounded-xl border mb-2 transition-all flex items-start gap-3 ${selectedStrategy === s.id ? `border-${s.color}-400 bg-${s.color}-50 shadow-sm` : 'border-slate-200 bg-white/50 hover:border-slate-300'}`}>
                  <s.icon className={`w-4 h-4 text-${s.color}-500 mt-0.5 shrink-0`} />
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{s.label}</p>
                    <p className="text-[10px] text-slate-500">{s.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="lg:col-span-8 space-y-4">
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">{STRATEGIES.find(s => s.id === selectedStrategy)?.label} Configuration</h3>

              {selectedStrategy === 'anonymize' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Production Data (JSON)</label>
                    <textarea value={anonInput} onChange={e => setAnonInput(e.target.value)} rows={8}
                      placeholder={'[\n  {"name": "John Doe", "email": "john@company.com", "phone": "555-1234"}\n]'}
                      className="input-glass w-full font-mono text-xs" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Fields to Mask</label>
                    <input value={anonFields} onChange={e => setAnonFields(e.target.value)} placeholder="email,phone,name,ssn" className="input-glass w-full" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['email','phone','name','ssn','credit_card','dob','address','ip_address'].map(f => (
                      <button key={f} onClick={() => {
                        const fs = anonFields.split(',').map(x => x.trim()).filter(Boolean);
                        setAnonFields(fs.includes(f) ? fs.filter(x => x !== f).join(',') : [...fs, f].join(','));
                      }} className={`text-[10px] px-2 py-1 rounded-lg border transition-all ${anonFields.includes(f) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>{f}</button>
                    ))}
                  </div>
                </div>
              )}

              {selectedStrategy === 'api-definition' && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {['openapi','swagger','postman','graphql'].map(f => (
                      <button key={f} onClick={() => setApiFormat(f)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${apiFormat === f ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                        {f.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <textarea value={apiSpec} onChange={e => setApiSpec(e.target.value)} rows={10}
                    placeholder="Paste your OpenAPI/Swagger YAML or JSON spec here..."
                    className="input-glass w-full font-mono text-xs" />
                </div>
              )}

              {selectedStrategy === 'synthetic' && (
                <div className="space-y-3">
                  <textarea value={synthSchema} onChange={e => setSynthSchema(e.target.value)} rows={6}
                    placeholder={'Describe your schema:\n{"user": {"name": "string", "age": "number 18-65", "email": "email", "role": "admin|user|guest"}}'}
                    className="input-glass w-full font-mono text-xs" />
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-slate-600">Number of Records:</label>
                    <input type="number" value={synthCount} onChange={e => setSynthCount(Number(e.target.value))} min={1} max={1000} className="input-glass w-24" />
                  </div>
                </div>
              )}

              {selectedStrategy === 'conditions' && (
                <textarea value={condRules} onChange={e => setCondRules(e.target.value)} rows={10}
                  placeholder={'Define your data rules:\n- age must be between 18 and 65\n- email must be valid format\n- status must be one of: active, inactive, pending\n- generate 20 records'}
                  className="input-glass w-full font-mono text-xs" />
              )}

              {selectedStrategy === 'rag' && (
                <div className="space-y-3">
                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-700">
                    <Info className="w-3.5 h-3.5 inline mr-1" />Searches your uploaded knowledge base documents to suggest relevant test data.
                  </div>
                  <textarea value={ragQuery} onChange={e => setRagQuery(e.target.value)} rows={6}
                    placeholder="Describe the test scenario or test case you need data for..."
                    className="input-glass w-full" />
                </div>
              )}

              {selectedStrategy === 'url-scrape' && (
                <div className="space-y-3">
                  <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-700">
                    <Globe className="w-3.5 h-3.5 inline mr-1" />Scrapes the target URL and suggests test data based on forms and fields found.
                  </div>
                  <input value={scrapeUrl} onChange={e => setScrapeUrl(e.target.value)} placeholder="https://your-app.com/login" className="input-glass w-full" />
                </div>
              )}

              {selectedStrategy === 'erp' && (
                <div className="space-y-3">
                  <select value={erpConfigId} onChange={e => setErpConfigId(e.target.value)} className="input-glass w-full">
                    <option value="">Select ERP connection...</option>
                    {erpConfigs.map(c => <option key={c.id} value={c.id}>{c.name} ({c.system_type})</option>)}
                  </select>
                  {erpConfigs.length === 0 && (
                    <p className="text-xs text-amber-600">No ERP configs yet. <button onClick={() => setActiveTab('erp')} className="underline">Add one →</button></p>
                  )}
                  <input value={erpEntity} onChange={e => setErpEntity(e.target.value)} placeholder="Entity to extract (e.g. Customer, SalesOrder)" className="input-glass w-full" />
                </div>
              )}

              {genError && <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-mono"><XCircle className="w-3.5 h-3.5 inline mr-1" />{genError}</div>}

              <div className="mt-4">
                <button onClick={generate} disabled={generating} className="btn-primary flex items-center gap-2">
                  {generating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  {generating ? 'Generating...' : 'Generate Test Data'}
                </button>
              </div>
            </div>

            {genResult && (
              <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />Generated {genResult.records?.length} records
                  </h3>
                  <button onClick={() => setShowSaveModal(true)} className="btn-primary flex items-center gap-1.5">
                    <Save className="w-3.5 h-3.5" /> Save as Data Set
                  </button>
                </div>
                <pre className="text-[10px] font-mono bg-slate-900 text-green-400 rounded-xl p-4 overflow-auto max-h-64">
                  {JSON.stringify(genResult.records?.slice(0, 3), null, 2)}
                  {genResult.records?.length > 3 ? `\n... and ${genResult.records.length - 3} more records` : ''}
                </pre>
                {genResult.suggestions && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
                    <strong>AI Suggestions:</strong> {genResult.suggestions}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DATA SETS */}
      {activeTab === 'sets' && (
        <div className="space-y-4">
          <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search sets..." className="input-glass w-full pl-8" />
            </div>
            <select value={filterEnv} onChange={e => setFilterEnv(e.target.value)} className="input-glass">
              <option value="">All Environments</option>
              {ENVIRONMENTS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-glass">
              <option value="">All Statuses</option>
              {['draft','pending_approval','approved','rejected','linked'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={loadSets} className="btn-ghost flex items-center gap-1.5"><Filter className="w-3.5 h-3.5" /> Apply</button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-400 text-sm font-mono">Loading data sets...</div>
          ) : filteredSets.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Database className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-medium text-slate-500">No data sets yet</p>
              <button onClick={() => setActiveTab('generate')} className="btn-primary mt-4">Generate Test Data</button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSets.map(s => (
                <div key={s.id} className="glass-card p-4">
                  <div className="flex items-start gap-3">
                    <Database className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-800 text-sm">{s.name}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ENV_COLORS[s.environment] || ''}`}>{s.environment}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[s.status] || ''}`}>{s.status.replace('_',' ')}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{s.record_count} records</span>
                      </div>
                      {s.description && <p className="text-xs text-slate-500 mt-0.5">{s.description}</p>}
                      <p className="text-[10px] text-slate-400 font-mono mt-1">Strategy: {s.strategy} · {new Date(s.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {s.status === 'draft' && <button onClick={() => submitForApproval(s.id)} className="btn-ghost text-[10px]">Submit</button>}
                      <button onClick={() => exportSet(s.id, 'json')} className="btn-ghost text-[10px]" title="Export JSON"><Download className="w-3 h-3" /></button>
                      <button onClick={() => exportSet(s.id, 'csv')} className="btn-ghost text-[10px]">CSV</button>
                      <div className="relative group">
                        <button className="btn-ghost text-[10px]" title="Clone"><Copy className="w-3 h-3" /></button>
                        <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-10 hidden group-hover:block min-w-32">
                          {ENVIRONMENTS.filter(e => e !== s.environment).map(env => (
                            <button key={env} onClick={() => cloneSet(s.id, env)} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 first:rounded-t-xl last:rounded-b-xl">Clone to {env}</button>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => deleteSet(s.id)} className="btn-ghost text-[10px] text-red-500 hover:text-red-700"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* APPROVALS */}
      {activeTab === 'approvals' && (
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">Approval Queue</h3>
            <p className="text-xs text-slate-500">Review and approve or reject test data sets before they can be used in executions.</p>
          </div>
          {pendingSets.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-300" />
              <p className="text-sm font-medium text-slate-500">No pending approvals</p>
            </div>
          ) : pendingSets.map(s => (
            <div key={s.id} className="glass-card p-5">
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-slate-800">{s.name}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ENV_COLORS[s.environment] || ''}`}>{s.environment}</span>
                  </div>
                  <p className="text-xs text-slate-500">{s.description || 'No description'}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">{s.record_count} records · {s.strategy} · {new Date(s.created_at).toLocaleDateString()}</p>
                  <div className="mt-3 space-y-2">
                    <textarea value={approvalComment} onChange={e => setApprovalComment(e.target.value)} placeholder="Add comment (optional)..." rows={2} className="input-glass w-full text-xs" />
                    <div className="flex gap-2">
                      <button onClick={() => approveSet(s.id, 'approve')} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors">
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button onClick={() => approveSet(s.id, 'reject')} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors">
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                      <button onClick={() => exportSet(s.id, 'json')} className="btn-ghost text-xs flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> Preview</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {sets.filter(s => s.status === 'approved' || s.status === 'rejected').length > 0 && (
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Approval History</h3>
              <div className="space-y-2">
                {sets.filter(s => s.status === 'approved' || s.status === 'rejected').map(s => (
                  <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg border border-slate-200/80 bg-white/50">
                    {s.status === 'approved' ? <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{s.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{s.environment} · {s.record_count} records</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[s.status] || ''}`}>{s.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ENVIRONMENTS */}
      {activeTab === 'environments' && (
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">Environment Management</h3>
            <p className="text-xs text-slate-500">Manage separate test data sets for each deployment environment.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {ENVIRONMENTS.map(env => {
              const envSets = sets.filter(s => s.environment === env);
              const approved = envSets.filter(s => s.status === 'approved').length;
              const pending = envSets.filter(s => s.status === 'pending_approval').length;
              return (
                <div key={env} className="glass-card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${env==='production'?'bg-red-500':env==='uat'?'bg-green-500':env==='performance'?'bg-orange-500':env==='pre-prod'?'bg-amber-500':env==='staging'?'bg-indigo-500':env==='test'?'bg-purple-500':'bg-blue-500'}`} />
                    <h4 className="font-semibold text-slate-800 capitalize">{env}</h4>
                  </div>
                  <div className="space-y-1 mb-3">
                    {[['Total Sets', envSets.length, 'slate'], ['Approved', approved, 'green'], ['Pending', pending, 'amber'], ['Records', envSets.reduce((a,s)=>a+s.record_count,0).toLocaleString(), 'slate']].map(([l,v,c]) => (
                      <div key={l as string} className="flex justify-between text-xs">
                        <span className="text-slate-500">{l}</span>
                        <span className={`font-semibold text-${c}-600`}>{v}</span>
                      </div>
                    ))}
                  </div>
                  {envSets.slice(0,3).map(s => <div key={s.id} className="text-[10px] text-slate-500 truncate font-mono">• {s.name}</div>)}
                  {envSets.length > 3 && <p className="text-[10px] text-slate-400 font-mono">+{envSets.length-3} more</p>}
                  <button onClick={() => { setFilterEnv(env); setActiveTab('sets'); }} className="mt-3 w-full btn-ghost text-xs flex items-center justify-center gap-1">
                    View Sets <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ERP CONFIG */}
      {activeTab === 'erp' && (
        <div className="space-y-4">
          <div className="glass-card p-5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">ERP System Connections</h3>
              <p className="text-xs text-slate-500 mt-1">Connect to SAP, Salesforce, Oracle, MS Dynamics, Workday, NetSuite and other ERP systems.</p>
            </div>
            <button onClick={() => setShowErpForm(true)} className="btn-primary flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Add ERP</button>
          </div>
          {showErpForm && (
            <div className="glass-card p-5 space-y-3">
              <h4 className="text-sm font-semibold text-slate-700">New ERP Connection</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Connection Name</label>
                  <input value={erpForm.name} onChange={e => setErpForm(f=>({...f,name:e.target.value}))} placeholder="e.g. SAP Production" className="input-glass w-full" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">ERP System</label>
                  <select value={erpForm.system_type} onChange={e => setErpForm(f=>({...f,system_type:e.target.value}))} className="input-glass w-full">
                    {['sap','salesforce','oracle','ms_dynamics','workday','netsuite','custom'].map(s => <option key={s} value={s}>{s.replace('_',' ').toUpperCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Base URL</label>
                  <input value={erpForm.base_url} onChange={e => setErpForm(f=>({...f,base_url:e.target.value}))} placeholder="https://your-erp.company.com" className="input-glass w-full" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Username</label>
                  <input value={erpForm.username} onChange={e => setErpForm(f=>({...f,username:e.target.value}))} placeholder="service_account" className="input-glass w-full" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-600 block mb-1">API Key / Token</label>
                  <input type="password" value={erpForm.api_key} onChange={e => setErpForm(f=>({...f,api_key:e.target.value}))} placeholder="API key or OAuth token" className="input-glass w-full" />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowErpForm(false)} className="btn-ghost">Cancel</button>
                <button onClick={addErpConfig} className="btn-primary flex items-center gap-1.5"><Save className="w-3.5 h-3.5" /> Save Connection</button>
              </div>
            </div>
          )}
          {erpConfigs.length === 0 && !showErpForm ? (
            <div className="glass-card p-12 text-center">
              <Server className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-medium text-slate-500">No ERP connections configured</p>
            </div>
          ) : (
            <div className="space-y-2">
              {erpConfigs.map(c => (
                <div key={c.id} className="glass-card p-4 flex items-center gap-3">
                  <Server className="w-4 h-4 text-rose-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">{c.name}</p>
                    <p className="text-xs text-slate-500 font-mono">{c.system_type.toUpperCase()} · {c.base_url}</p>
                  </div>
                  <button onClick={() => testErpConfig(c.id)} className="btn-ghost text-xs flex items-center gap-1"><Play className="w-3 h-3" /> Test</button>
                  <button onClick={async () => { await fetch(`${API}/api/test-data/erp-configs/${c.id}`, {method:'DELETE',headers:authH()}); setErpConfigs(prev=>prev.filter(x=>x.id!==c.id)); }} className="btn-ghost text-xs text-red-500"><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SAVE MODAL */}
      {showSaveModal && genResult && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Save Data Set</h3>
              <button onClick={() => setShowSaveModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Set Name *</label>
                <input value={saveName} onChange={e => setSaveName(e.target.value)} className="input-glass w-full" placeholder="My Test Data Set" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Environment</label>
                <select value={saveEnv} onChange={e => setSaveEnv(e.target.value)} className="input-glass w-full">
                  {ENVIRONMENTS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Description</label>
                <textarea value={saveDesc} onChange={e => setSaveDesc(e.target.value)} rows={2} className="input-glass w-full" placeholder="Optional description..." />
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
                <strong>{genResult.records?.length} records</strong> will be saved using the <strong>{selectedStrategy}</strong> strategy.
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowSaveModal(false)} className="btn-ghost">Cancel</button>
              <button onClick={saveSet} disabled={!saveName.trim()} className="btn-primary flex items-center gap-1.5"><Save className="w-3.5 h-3.5" /> Save Data Set</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
