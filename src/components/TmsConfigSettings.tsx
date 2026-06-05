/**
 * TmsConfigSettings — Global TMS Configuration Panel
 *
 * Supports: Jira · Xray · Zephyr Scale · TestRail · Azure DevOps · qTest · HP ALM
 * Lives in the "Settings" tab. TmsSyncBar in every module links here when unconfigured.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings2, Plus, Trash2, CheckCircle2, AlertCircle, RefreshCw,
  ExternalLink, Eye, EyeOff, ChevronDown, ChevronUp, Save, Zap,
  Info, Link, Shield, Database, Key, Globe, BookOpen, X, Check,
} from 'lucide-react';
import { apiUrl } from '@/src/config/api';

// ── Tool definitions ──────────────────────────────────────────────────────────

const TMS_TOOLS = [
  {
    id: 'jira',
    name: 'Jira + Xray',
    icon: '🔵',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badgeBg: 'bg-blue-100',
    description: 'Atlassian Jira with Xray test management',
    placeholder_url: 'https://yourcompany.atlassian.net',
    fields: ['base_url', 'email', 'token', 'project_key'],
    docs: 'https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/',
  },
  {
    id: 'xray',
    name: 'Xray (standalone)',
    icon: '🔷',
    color: 'text-blue-800',
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    badgeBg: 'bg-blue-100',
    description: 'Xray for Jira — dedicated test management',
    placeholder_url: 'https://yourcompany.atlassian.net',
    fields: ['base_url', 'email', 'token', 'project_key'],
    docs: 'https://docs.getxray.app/display/XRAY/REST+API',
  },
  {
    id: 'zephyr',
    name: 'Zephyr Scale',
    icon: '🌀',
    color: 'text-cyan-700',
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
    badgeBg: 'bg-cyan-100',
    description: 'SmartBear Zephyr Scale (Jira Cloud)',
    placeholder_url: 'https://yourcompany.atlassian.net',
    fields: ['base_url', 'email', 'token', 'project_key', 'zephyr_token'],
    docs: 'https://support.smartbear.com/zephyr-scale-cloud/docs/api-overview.html',
  },
  {
    id: 'testrail',
    name: 'TestRail',
    icon: '🟢',
    color: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-200',
    badgeBg: 'bg-green-100',
    description: 'Gurock TestRail — test case management',
    placeholder_url: 'https://yourcompany.testrail.io',
    fields: ['base_url', 'email', 'token', 'project_key'],
    docs: 'https://support.testrail.com/hc/en-us/articles/7077039506196-TestRail-API',
  },
  {
    id: 'azuredevops',
    name: 'Azure DevOps',
    icon: '🔷',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    badgeBg: 'bg-indigo-100',
    description: 'Microsoft Azure DevOps — work items & test plans',
    placeholder_url: 'https://dev.azure.com/yourorganization',
    fields: ['base_url', 'token', 'project_key'],
    docs: 'https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate',
  },
  {
    id: 'qtest',
    name: 'qTest',
    icon: '🟣',
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    badgeBg: 'bg-purple-100',
    description: 'Tricentis qTest — enterprise test management',
    placeholder_url: 'https://yourcompany.qtestnet.com',
    fields: ['base_url', 'email', 'token', 'project_key'],
    docs: 'https://support.tricentis.com/community/manuals_detail.do?id=9532',
  },
  {
    id: 'hpalm',
    name: 'HP ALM / Quality Center',
    icon: '🔶',
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    badgeBg: 'bg-orange-100',
    description: 'Micro Focus HP ALM / Quality Center',
    placeholder_url: 'https://alm.yourcompany.com',
    fields: ['base_url', 'email', 'token', 'project_key'],
    docs: 'https://admhelp.microfocus.com/alm/en/latest/online_help/Content/API/AlmAPIOverview.htm',
  },
];

// ── Field labels & helpers ────────────────────────────────────────────────────

const FIELD_LABELS: Record<string, { label: string; placeholder: string; icon: React.ElementType; help: string }> = {
  base_url:      { label: 'Instance URL',    placeholder: 'https://yourcompany.atlassian.net', icon: Globe,    help: 'Full URL of your TMS instance' },
  email:         { label: 'Email / Username',placeholder: 'you@company.com',                   icon: Shield,   help: 'Account email or username' },
  token:         { label: 'API Token',       placeholder: 'Paste API token here',              icon: Key,      help: 'Personal access token or API key' },
  project_key:   { label: 'Project Key',     placeholder: 'e.g. MYPROJ or 12345',              icon: Database, help: 'Project key or ID in the TMS' },
  zephyr_token:  { label: 'Zephyr API Token',placeholder: 'Zephyr Scale bearer token',         icon: Key,      help: 'Zephyr Scale-specific token (different from Jira)' },
};

const INTEGRATION_TOUCH_POINTS = [
  { module: 'Requirements',   icon: '📋', ops: ['Pull requirements from TMS', 'Import Epics/Stories/Work Items'] },
  { module: 'Test Cases',     icon: '✅', ops: ['Pull existing TCs from TMS', 'Push AI-generated TCs to TMS'] },
  { module: 'Defect & Impact',icon: '🐛', ops: ['Pull defect dump for AI prediction', 'Push classified defects back'] },
  { module: 'Traceability',   icon: '🔗', ops: ['Pull regression suites', 'View impacted test coverage'] },
  { module: 'Execution',      icon: '▶️', ops: ['Push execution results', 'Create test cycles/runs in TMS'] },
  { module: 'QA Dashboard',   icon: '📊', ops: ['Reflect TMS sync status', 'Show last sync timestamps'] },
];

// ── Main Component ─────────────────────────────────────────────────────────────

export default function TmsConfigSettings() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTool, setSelectedTool] = useState('jira');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [formLabel, setFormLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [syncLog, setSyncLog] = useState<any[]>([]);
  const [showSyncLog, setShowSyncLog] = useState(false);
  const [showTouchPoints, setShowTouchPoints] = useState(false);

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 6000);
  };

  const loadConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(apiUrl('/api/settings/tms/all?projectId=global'));
      const d = await r.json();
      setConfigs(d.configs || []);
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  const loadSyncLog = async () => {
    try {
      const r = await fetch(apiUrl('/api/settings/tms/sync-log?limit=30'));
      const d = await r.json();
      setSyncLog(d.logs || []);
    } catch { /* silent */ }
  };

  useEffect(() => { loadConfigs(); }, [loadConfigs]);

  const toolMeta = TMS_TOOLS.find(t => t.id === selectedTool)!;

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const payload = { tool: selectedTool, ...formData };
      const r = await fetch(apiUrl('/api/settings/tms/test'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      setTestResult({ ok: d.ok, msg: d.message || (d.ok ? 'Connection successful!' : 'Connection failed') });
    } catch (e: any) {
      setTestResult({ ok: false, msg: e.message });
    } finally { setTesting(false); }
  };

  const handleSave = async () => {
    if (!formData.base_url || !formData.token) {
      showFeedback('error', 'Instance URL and API Token are required.');
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(apiUrl('/api/settings/tms'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: selectedTool,
          label: formLabel || toolMeta.name,
          projectId: 'global',
          is_active: 1,
          ...formData,
        }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || 'Save failed');
      showFeedback('success', `✅ ${toolMeta.name} configuration saved and activated!`);
      setShowForm(false);
      setFormData({});
      setFormLabel('');
      setTestResult(null);
      loadConfigs();
    } catch (e: any) {
      showFeedback('error', `❌ Save failed: ${e.message}`);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(apiUrl(`/api/settings/tms/${id}`), { method: 'DELETE' });
      showFeedback('success', 'Configuration deleted.');
      setDeleteConfirm(null);
      loadConfigs();
    } catch (e: any) { showFeedback('error', e.message); }
  };

  const handleActivate = async (cfg: any) => {
    try {
      await fetch(apiUrl('/api/settings/tms'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...cfg, is_active: 1 }),
      });
      showFeedback('success', `${cfg.label || cfg.tool} is now the active TMS connection.`);
      loadConfigs();
    } catch (e: any) { showFeedback('error', e.message); }
  };

  const activeCfg = configs.find(c => c.is_active);
  const toolOfActive = TMS_TOOLS.find(t => t.id === activeCfg?.tool);

  return (
    <div className="space-y-5 animate-fadeInUp">

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="glass-card p-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="panel-title flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-indigo-500" />
              Test Management System (TMS) Integration
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Connect your TMS once here — the integration will appear automatically in
              <strong className="text-slate-700"> Requirements</strong>,
              <strong className="text-slate-700"> Test Cases</strong>,
              <strong className="text-slate-700"> Defects</strong>,
              <strong className="text-slate-700"> Traceability</strong>,
              <strong className="text-slate-700"> Execution</strong>, and
              <strong className="text-slate-700"> QA Dashboard</strong>.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setShowTouchPoints(p => !p); }}
              className="btn-ghost text-xs flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              Integration Touchpoints
            </button>
            <button onClick={() => { setShowSyncLog(true); loadSyncLog(); }}
              className="btn-ghost text-xs flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              Sync Log
            </button>
            <button onClick={() => { setShowForm(true); setSelectedTool('jira'); setFormData({}); setFormLabel(''); setTestResult(null); }}
              className="btn-primary text-xs flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Add TMS Connection
            </button>
          </div>
        </div>

        {/* Active connection status bar */}
        {activeCfg && toolOfActive && (
          <div className={`mt-4 flex items-center gap-3 px-3 py-2.5 rounded-xl border ${toolOfActive.border} ${toolOfActive.bg}`}>
            <span className="text-lg">{toolOfActive.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-mono font-bold ${toolOfActive.color}`}>{activeCfg.label || toolOfActive.name}</span>
                <span className="badge badge-green text-[9px]">● ACTIVE</span>
                {activeCfg.last_tested_ok ? (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-mono">
                    <CheckCircle2 className="w-3 h-3" /> Verified
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-amber-600 font-mono">
                    <AlertCircle className="w-3 h-3" /> Not tested
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                {activeCfg.base_url} · Project: {activeCfg.project_key || '—'}
                {activeCfg.last_synced_at && ` · Last sync: ${new Date(activeCfg.last_synced_at).toLocaleString()}`}
              </p>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-mono shrink-0">
              {INTEGRATION_TOUCH_POINTS.map(tp => (
                <span key={tp.module} title={tp.module} className="text-sm">{tp.icon}</span>
              ))}
              <span className="ml-1 text-slate-500">seamlessly connected</span>
            </div>
          </div>
        )}
        {!activeCfg && !loading && (
          <div className="mt-4 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-xs text-slate-500">No TMS connected. Add a connection to enable pull/push across all modules.</span>
          </div>
        )}
      </div>

      {/* ── Integration touchpoints info panel ───────────────────────────────── */}
      {showTouchPoints && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="panel-title flex items-center gap-2">
              <Link className="w-4 h-4 text-indigo-500" />
              Where TMS Integration Appears
            </h3>
            <button onClick={() => setShowTouchPoints(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {INTEGRATION_TOUCH_POINTS.map(tp => (
              <div key={tp.module} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{tp.icon}</span>
                  <span className="text-xs font-bold text-slate-700">{tp.module}</span>
                </div>
                <ul className="space-y-1">
                  {tp.ops.map(op => (
                    <li key={op} className="flex items-start gap-1.5 text-[10px] text-slate-600 font-mono">
                      <Check className="w-2.5 h-2.5 text-emerald-500 mt-0.5 shrink-0" />
                      {op}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Feedback bar ─────────────────────────────────────────────────────── */}
      {feedback && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono border ${feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          <span className="flex-1">{feedback.msg}</span>
          <button onClick={() => setFeedback(null)}><X className="w-3 h-3" /></button>
        </div>
      )}

      {/* ── Add / Edit Form ───────────────────────────────────────────────────── */}
      {showForm && (
        <div className="glass-card p-5 border-2 border-indigo-200">
          <div className="flex items-center justify-between mb-5">
            <h3 className="panel-title flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-500" />
              New TMS Connection
            </h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tool selector tiles */}
          <div className="mb-5">
            <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-2 block">
              Select TMS Tool
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
              {TMS_TOOLS.map(t => (
                <button key={t.id}
                  onClick={() => { setSelectedTool(t.id); setFormData({}); setTestResult(null); }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center ${selectedTool === t.id ? `${t.border} ${t.bg} ring-2 ring-offset-1 ring-indigo-400` : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                  <span className="text-xl">{t.icon}</span>
                  <span className={`text-[9px] font-mono font-bold leading-tight ${selectedTool === t.id ? t.color : 'text-slate-600'}`}>{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Selected tool description + docs link */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${toolMeta.border} ${toolMeta.bg} mb-4`}>
            <span>{toolMeta.icon}</span>
            <span className={`text-xs font-mono ${toolMeta.color}`}>{toolMeta.description}</span>
            <a href={toolMeta.docs} target="_blank" rel="noreferrer"
              className={`ml-auto flex items-center gap-1 text-[10px] font-mono ${toolMeta.color} hover:underline`}>
              <ExternalLink className="w-2.5 h-2.5" /> API Docs
            </a>
          </div>

          {/* Config label */}
          <div className="mb-4">
            <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1 block">
              Label (optional)
            </label>
            <input
              type="text"
              value={formLabel}
              onChange={e => setFormLabel(e.target.value)}
              placeholder={`e.g. ${toolMeta.name} — Production`}
              className="input-field text-xs w-full"
            />
          </div>

          {/* Dynamic form fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            {toolMeta.fields.map(field => {
              const fm = FIELD_LABELS[field];
              const isSecret = field === 'token' || field === 'zephyr_token';
              const visible = showTokens[field];
              return (
                <div key={field}>
                  <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <fm.icon className="w-2.5 h-2.5" />
                    {fm.label}
                    {(field === 'base_url' || field === 'token') && <span className="text-red-400">*</span>}
                  </label>
                  <div className="relative">
                    <input
                      type={isSecret && !visible ? 'password' : 'text'}
                      value={formData[field] || ''}
                      onChange={e => setFormData(prev => ({ ...prev, [field]: e.target.value }))}
                      placeholder={fm.placeholder}
                      className="input-field text-xs w-full pr-8"
                    />
                    {isSecret && (
                      <button type="button" onClick={() => setShowTokens(p => ({ ...p, [field]: !visible }))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {visible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                  <p className="text-[9px] text-slate-400 font-mono mt-0.5">{fm.help}</p>
                </div>
              );
            })}
          </div>

          {/* Test result */}
          {testResult && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-mono mb-4 ${testResult.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
              {testResult.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              {testResult.msg}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={handleTest} disabled={testing || !formData.base_url || !formData.token}
              className="btn-ghost text-xs flex items-center gap-1.5 disabled:opacity-50">
              {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              Test Connection
            </button>
            <button onClick={handleSave} disabled={saving || !formData.base_url || !formData.token}
              className="btn-primary text-xs flex items-center gap-1.5 disabled:opacity-50">
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save & Activate
            </button>
            <button onClick={() => setShowForm(false)} className="btn-ghost text-xs">Cancel</button>
          </div>
        </div>
      )}

      {/* ── Existing configs list ─────────────────────────────────────────────── */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="panel-title flex items-center gap-2">
            <Database className="w-4 h-4 text-slate-500" />
            Saved Connections
            {configs.length > 0 && (
              <span className="ml-1 badge">{configs.length}</span>
            )}
          </h3>
          {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />}
        </div>

        {configs.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
              <Settings2 className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500">No TMS connections configured yet.</p>
            <p className="text-xs text-slate-400">Add your first connection to enable seamless integration across all modules.</p>
            <button onClick={() => setShowForm(true)} className="btn-primary text-xs flex items-center gap-1.5 mt-2">
              <Plus className="w-3.5 h-3.5" /> Add First Connection
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {configs.map(cfg => {
              const tool = TMS_TOOLS.find(t => t.id === cfg.tool);
              if (!tool) return null;
              const isExpanded = expandedId === cfg.id;
              return (
                <div key={cfg.id}
                  className={`rounded-xl border-2 transition-all ${cfg.is_active ? `${tool.border} ${tool.bg}` : 'border-slate-200 bg-white'}`}>
                  <div className="flex items-center gap-3 px-4 py-3 flex-wrap">
                    <span className="text-lg shrink-0">{tool.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-mono font-bold ${cfg.is_active ? tool.color : 'text-slate-700'}`}>
                          {cfg.label || tool.name}
                        </span>
                        {cfg.is_active && <span className="badge badge-green text-[9px]">● ACTIVE</span>}
                        {cfg.last_tested_ok ? (
                          <span className="flex items-center gap-0.5 text-[9px] text-emerald-600 font-mono">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5 text-[9px] text-amber-500 font-mono">
                            <AlertCircle className="w-2.5 h-2.5" /> Unverified
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                        {cfg.base_url} · Project: {cfg.project_key || '—'}
                        {cfg.email && ` · ${cfg.email}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!cfg.is_active && (
                        <button onClick={() => handleActivate(cfg)}
                          className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg border border-indigo-300 text-indigo-700 bg-white hover:bg-indigo-50 transition-all">
                          Set Active
                        </button>
                      )}
                      <button onClick={() => setExpandedId(isExpanded ? null : cfg.id)}
                        className="text-slate-400 hover:text-slate-600 p-1">
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                      {deleteConfirm === cfg.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDelete(cfg.id)}
                            className="text-[9px] font-mono px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200">
                            Confirm
                          </button>
                          <button onClick={() => setDeleteConfirm(null)}
                            className="text-[9px] font-mono px-2 py-1 rounded bg-slate-100 text-slate-600">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirm(cfg.id)}
                          className="text-slate-400 hover:text-red-500 p-1 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-4 py-3 border-t border-slate-100 bg-white/60 space-y-2">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[10px] font-mono">
                        <div>
                          <span className="text-slate-400 block mb-0.5">Instance URL</span>
                          <span className="text-slate-700 break-all">{cfg.base_url}</span>
                        </div>
                        {cfg.email && (
                          <div>
                            <span className="text-slate-400 block mb-0.5">Email</span>
                            <span className="text-slate-700">{cfg.email}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-slate-400 block mb-0.5">Project Key</span>
                          <span className="text-slate-700">{cfg.project_key || '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">API Token</span>
                          <span className="text-slate-700">{'•'.repeat(16)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Last Tested</span>
                          <span className="text-slate-700">{cfg.last_tested_at ? new Date(cfg.last_tested_at).toLocaleString() : 'Never'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Last Synced</span>
                          <span className="text-slate-700">{cfg.last_synced_at ? new Date(cfg.last_synced_at).toLocaleString() : 'Never'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Sync Log Modal ────────────────────────────────────────────────────── */}
      {showSyncLog && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="glass-card w-full max-w-3xl p-5 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="panel-title flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                TMS Sync Log (last 30)
              </h3>
              <button onClick={() => setShowSyncLog(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            {syncLog.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8 font-mono">No sync operations recorded yet.</p>
            ) : (
              <table className="w-full text-[10px] font-mono border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    {['When', 'Module', 'Operation', 'Status', 'Items', 'Detail'].map(h => (
                      <th key={h} className="text-left py-1.5 px-2 text-slate-500 font-bold uppercase tracking-wider text-[9px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {syncLog.map(row => (
                    <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-1.5 px-2 text-slate-500">{new Date(row.created_at).toLocaleString()}</td>
                      <td className="py-1.5 px-2 text-indigo-600 font-bold">{row.module}</td>
                      <td className="py-1.5 px-2">{row.operation}</td>
                      <td className="py-1.5 px-2">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${row.status === 'ok' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-slate-700">{row.item_count}</td>
                      <td className="py-1.5 px-2 text-slate-500 max-w-[200px] truncate" title={row.detail}>{row.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
