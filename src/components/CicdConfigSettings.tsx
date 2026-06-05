/**
 * CicdConfigSettings — Global CI/CD Pipeline Provider Configuration Panel
 *
 * Supports: GitHub Actions · Jenkins · GitLab CI · Azure Pipelines ·
 *           CircleCI · TeamCity · Bitbucket Pipelines
 *
 * Lives in the "Settings" tab alongside TmsConfigSettings.
 * CICDTab links here when no provider is configured.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  GitBranch, Plus, Trash2, CheckCircle2, AlertCircle, RefreshCw,
  ExternalLink, Eye, EyeOff, ChevronDown, ChevronUp, Save, Zap,
  Info, Key, Globe, X, Check, Play, Clock, CheckCircle, XCircle,
  Settings2, Activity,
} from 'lucide-react';
import { apiUrl } from '@/src/config/api';

// ── Provider definitions ──────────────────────────────────────────────────────

const CICD_PROVIDERS = [
  {
    id: 'github',
    name: 'GitHub Actions',
    icon: '⚡',
    color: 'text-slate-800',
    bg: 'bg-slate-50',
    border: 'border-slate-300',
    badgeBg: 'bg-slate-100',
    description: 'GitHub-hosted or self-hosted runners via workflow dispatch',
    placeholder_url: '',
    fields: ['token', 'org', 'repo', 'pipeline_id', 'branch'],
    docs: 'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens',
    fieldHelp: { token: 'GitHub PAT with repo + workflow scopes', org: 'GitHub org or username', repo: 'Repository name', pipeline_id: 'Workflow file name (e.g. ci.yml)', branch: 'Default branch to dispatch on' },
  },
  {
    id: 'gitlab',
    name: 'GitLab CI/CD',
    icon: '🦊',
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    badgeBg: 'bg-orange-100',
    description: 'GitLab.com or self-hosted GitLab pipelines',
    placeholder_url: 'https://gitlab.com',
    fields: ['base_url', 'token', 'org', 'repo', 'pipeline_id', 'branch'],
    docs: 'https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html',
    fieldHelp: { base_url: 'GitLab instance URL (leave blank for gitlab.com)', token: 'Personal Access Token with api scope', org: 'Namespace/group', repo: 'Project name or ID', pipeline_id: 'Pipeline ID (optional)', branch: 'Target branch' },
  },
  {
    id: 'jenkins',
    name: 'Jenkins',
    icon: '🔧',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badgeBg: 'bg-blue-100',
    description: 'Self-hosted Jenkins with API token authentication',
    placeholder_url: 'http://jenkins.yourcompany.com:8080',
    fields: ['base_url', 'token', 'pipeline_id', 'branch'],
    docs: 'https://www.jenkins.io/doc/book/system-administration/authenticating-scripted-clients/',
    fieldHelp: { base_url: 'Jenkins server URL', token: 'Jenkins API token (User → Configure → Add new Token)', org: '', repo: '', pipeline_id: 'Jenkins job name or folder/job path', branch: 'Branch to build' },
  },
  {
    id: 'azure',
    name: 'Azure Pipelines',
    icon: '☁️',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    badgeBg: 'bg-indigo-100',
    description: 'Azure DevOps Pipelines with PAT authentication',
    placeholder_url: '',
    fields: ['token', 'org', 'repo', 'pipeline_id', 'branch'],
    docs: 'https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate',
    fieldHelp: { token: 'Azure DevOps PAT with Build read & execute scope', org: 'Azure DevOps organization name', repo: 'Azure DevOps project name', pipeline_id: 'Pipeline definition ID (numeric)', branch: 'Target branch (e.g. refs/heads/main)' },
  },
  {
    id: 'circleci',
    name: 'CircleCI',
    icon: '🔵',
    color: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-200',
    badgeBg: 'bg-green-100',
    description: 'CircleCI cloud or server with API token',
    placeholder_url: '',
    fields: ['token', 'org', 'repo', 'branch'],
    docs: 'https://circleci.com/docs/managing-api-tokens/',
    fieldHelp: { token: 'CircleCI personal API token', org: 'GitHub/Bitbucket org connected to CircleCI', repo: 'Repository name', pipeline_id: '', branch: 'Branch to trigger' },
  },
  {
    id: 'teamcity',
    name: 'TeamCity',
    icon: '🏙️',
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    badgeBg: 'bg-purple-100',
    description: 'JetBrains TeamCity CI server',
    placeholder_url: 'https://teamcity.yourcompany.com',
    fields: ['base_url', 'token', 'pipeline_id', 'branch'],
    docs: 'https://www.jetbrains.com/help/teamcity/rest/get-started-with-teamcity-rest-api.html',
    fieldHelp: { base_url: 'TeamCity server URL', token: 'TeamCity access token or username:password', org: '', repo: '', pipeline_id: 'Build type ID (e.g. ProjectName_BuildConfig)', branch: 'Branch specification' },
  },
  {
    id: 'bitbucket',
    name: 'Bitbucket Pipelines',
    icon: '🪣',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badgeBg: 'bg-blue-100',
    description: 'Atlassian Bitbucket Cloud pipelines',
    placeholder_url: '',
    fields: ['token', 'org', 'repo', 'branch'],
    docs: 'https://support.atlassian.com/bitbucket-cloud/docs/create-a-repository-access-token/',
    fieldHelp: { token: 'Bitbucket repository access token or app password', org: 'Workspace slug', repo: 'Repository slug', pipeline_id: '', branch: 'Default branch' },
  },
];

const FIELD_DEFS: Record<string, { label: string; placeholder: string; icon: React.ElementType; secret?: boolean }> = {
  base_url:    { label: 'Server URL',      placeholder: 'https://...',           icon: Globe },
  token:       { label: 'API Token / PAT', placeholder: 'Paste token here',      icon: Key, secret: true },
  org:         { label: 'Org / Workspace', placeholder: 'org-name',              icon: GitBranch },
  repo:        { label: 'Repo / Project',  placeholder: 'my-repo',               icon: GitBranch },
  pipeline_id: { label: 'Pipeline / Job',  placeholder: 'ci.yml or job-name',    icon: Play },
  branch:      { label: 'Default Branch',  placeholder: 'main',                  icon: GitBranch },
};

// ── Helper: run status display ────────────────────────────────────────────────

function RunStatusBadge({ status, conclusion }: { status: string; conclusion: string | null }) {
  if (status === 'in_progress') return <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200"><RefreshCw className="w-2 h-2 animate-spin" /> running</span>;
  if (conclusion === 'success')  return <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200"><CheckCircle className="w-2 h-2" /> success</span>;
  if (conclusion === 'failure')  return <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200"><XCircle className="w-2 h-2" /> failed</span>;
  return <span className="text-[9px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{conclusion || status}</span>;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function CicdConfigSettings() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('github');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [formLabel, setFormLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [recentRuns, setRecentRuns] = useState<any[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 7000);
  };

  const loadConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(apiUrl('/api/settings/cicd/all?projectId=global'));
      const d = await r.json();
      setConfigs(d.configs || []);
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  const loadRecentRuns = async () => {
    setRunsLoading(true);
    try {
      const r = await fetch(apiUrl('/api/settings/cicd/runs?projectId=global'));
      const d = await r.json();
      setRecentRuns(d.runs || []);
    } catch { /* silent */ } finally { setRunsLoading(false); }
  };

  useEffect(() => { loadConfigs(); loadRecentRuns(); }, [loadConfigs]);

  const provider = CICD_PROVIDERS.find(p => p.id === selectedProvider)!;

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await fetch(apiUrl('/api/settings/cicd/test'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: selectedProvider, ...formData }),
      });
      const d = await r.json();
      setTestResult({ ok: d.ok, msg: d.message || (d.ok ? 'Connection successful!' : 'Connection failed') });
    } catch (e: any) { setTestResult({ ok: false, msg: e.message }); }
    finally { setTesting(false); }
  };

  const handleSave = async () => {
    if (!formData.token) { showFeedback('error', 'API Token is required.'); return; }
    setSaving(true);
    try {
      const r = await fetch(apiUrl('/api/settings/cicd'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: selectedProvider, label: formLabel || provider.name, project_id: 'global', is_active: 1, ...formData }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || 'Save failed');
      showFeedback('success', `✅ ${provider.name} saved and activated!`);
      setShowForm(false); setFormData({}); setFormLabel(''); setTestResult(null);
      loadConfigs(); loadRecentRuns();
    } catch (e: any) { showFeedback('error', `❌ ${e.message}`); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(apiUrl(`/api/settings/cicd/${id}`), { method: 'DELETE' });
      showFeedback('success', 'Configuration deleted.');
      setDeleteConfirm(null); loadConfigs();
    } catch (e: any) { showFeedback('error', e.message); }
  };

  const handleActivate = async (cfg: any) => {
    try {
      await fetch(apiUrl('/api/settings/cicd'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...cfg, is_active: 1 }),
      });
      showFeedback('success', `${cfg.label || cfg.provider} is now active.`);
      loadConfigs();
    } catch (e: any) { showFeedback('error', e.message); }
  };

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      const r = await fetch(apiUrl('/api/settings/cicd/trigger'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: 'global' }),
      });
      const d = await r.json();
      showFeedback(d.success ? 'success' : 'error', d.message || d.error || 'Trigger sent');
      if (d.success) setTimeout(loadRecentRuns, 3000);
    } catch (e: any) { showFeedback('error', e.message); }
    finally { setTriggering(false); }
  };

  const activeCfg = configs.find(c => c.is_active);
  const activeProvider = CICD_PROVIDERS.find(p => p.id === activeCfg?.provider);

  return (
    <div className="space-y-5 animate-fadeInUp">

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="glass-card p-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="panel-title flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-blue-500" />
              CI/CD Pipeline Integration Settings
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Connect your CI/CD provider once here — EdgeQI will automatically trigger quality-gate
              pipelines, pull recent run history, and push test results back to the pipeline.
              Supports <strong className="text-slate-700">GitHub Actions · Jenkins · GitLab CI ·
              Azure Pipelines · CircleCI · TeamCity · Bitbucket</strong>.
            </p>
          </div>
          <div className="flex gap-2">
            {activeCfg && (
              <button onClick={handleTrigger} disabled={triggering}
                className="btn-primary text-xs flex items-center gap-1.5 disabled:opacity-50">
                {triggering ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Trigger Pipeline
              </button>
            )}
            <button onClick={() => { setShowForm(true); setSelectedProvider('github'); setFormData({}); setFormLabel(''); setTestResult(null); }}
              className="btn-primary text-xs flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Add Provider
            </button>
          </div>
        </div>

        {/* Active provider status bar */}
        {activeCfg && activeProvider ? (
          <div className={`mt-4 flex items-center gap-3 px-3 py-2.5 rounded-xl border ${activeProvider.border} ${activeProvider.bg}`}>
            <span className="text-xl">{activeProvider.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-mono font-bold ${activeProvider.color}`}>{activeCfg.label || activeProvider.name}</span>
                <span className="badge badge-green text-[9px]">● ACTIVE</span>
                {activeCfg.last_tested_ok ? (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-mono"><CheckCircle2 className="w-3 h-3" /> Verified</span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-amber-500 font-mono"><AlertCircle className="w-3 h-3" /> Unverified</span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                {[activeCfg.org && `org: ${activeCfg.org}`, activeCfg.repo && `repo: ${activeCfg.repo}`, activeCfg.branch && `branch: ${activeCfg.branch}`].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={loadRecentRuns} disabled={runsLoading}
                className="btn-ghost text-[10px] flex items-center gap-1">
                <RefreshCw className={`w-3 h-3 ${runsLoading ? 'animate-spin' : ''}`} /> Refresh Runs
              </button>
            </div>
          </div>
        ) : !loading && (
          <div className="mt-4 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-xs text-slate-500">No CI/CD provider connected. Add one to enable pipeline triggers and run history.</span>
          </div>
        )}
      </div>

      {/* ── Feedback bar ─────────────────────────────────────────────────────── */}
      {feedback && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono border ${feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          <span className="flex-1">{feedback.msg}</span>
          <button onClick={() => setFeedback(null)}><X className="w-3 h-3" /></button>
        </div>
      )}

      {/* ── Recent pipeline runs ──────────────────────────────────────────────── */}
      {recentRuns.length > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="panel-title flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" />
              Recent Pipeline Runs
              {recentRuns[0]?.demo && <span className="text-[9px] font-mono text-slate-400 ml-1">(demo data)</span>}
            </h3>
            <button onClick={loadRecentRuns} disabled={runsLoading} className="btn-ghost text-xs flex items-center gap-1">
              <RefreshCw className={`w-3 h-3 ${runsLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
          <div className="space-y-1.5">
            {recentRuns.slice(0, 8).map((run: any) => (
              <div key={run.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 hover:bg-white transition-all">
                <div className={`w-2 h-2 rounded-full shrink-0 ${run.status === 'in_progress' ? 'bg-blue-400 animate-pulse' : run.conclusion === 'success' ? 'bg-emerald-400' : run.conclusion === 'failure' ? 'bg-red-400' : 'bg-slate-400'}`} />
                <span className="text-[11px] font-mono font-bold text-slate-700 flex-1 min-w-0 truncate">{run.name}</span>
                <span className="text-[10px] font-mono text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded shrink-0">{run.branch}</span>
                <RunStatusBadge status={run.status} conclusion={run.conclusion} />
                {run.durationMs && (
                  <span className="text-[9px] font-mono text-slate-400 flex items-center gap-0.5 shrink-0">
                    <Clock className="w-2.5 h-2.5" />{(run.durationMs / 1000).toFixed(0)}s
                  </span>
                )}
                <span className="text-[9px] text-slate-400 font-mono shrink-0">{new Date(run.createdAt).toLocaleString()}</span>
                {run.url && run.url !== '#' && (
                  <a href={run.url} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700 shrink-0">
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Add / Edit Form ───────────────────────────────────────────────────── */}
      {showForm && (
        <div className="glass-card p-5 border-2 border-blue-200">
          <div className="flex items-center justify-between mb-5">
            <h3 className="panel-title flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-500" />
              New CI/CD Provider Connection
            </h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>

          {/* Provider tiles */}
          <div className="mb-5">
            <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-2 block">Select Provider</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {CICD_PROVIDERS.map(p => (
                <button key={p.id}
                  onClick={() => { setSelectedProvider(p.id); setFormData({}); setTestResult(null); }}
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all text-center ${selectedProvider === p.id ? `${p.border} ${p.bg} ring-2 ring-offset-1 ring-blue-400` : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                  <span className="text-xl">{p.icon}</span>
                  <span className={`text-[9px] font-mono font-bold leading-tight ${selectedProvider === p.id ? p.color : 'text-slate-600'}`}>{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Provider description + docs */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${provider.border} ${provider.bg} mb-4`}>
            <span>{provider.icon}</span>
            <span className={`text-xs font-mono ${provider.color}`}>{provider.description}</span>
            <a href={provider.docs} target="_blank" rel="noreferrer"
              className={`ml-auto flex items-center gap-1 text-[10px] font-mono ${provider.color} hover:underline shrink-0`}>
              <ExternalLink className="w-2.5 h-2.5" /> Token docs
            </a>
          </div>

          {/* Label */}
          <div className="mb-4">
            <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1 block">Label (optional)</label>
            <input type="text" value={formLabel} onChange={e => setFormLabel(e.target.value)}
              placeholder={`e.g. ${provider.name} — Production`}
              className="input-field text-xs w-full" />
          </div>

          {/* Dynamic fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            {provider.fields.map(field => {
              const fd = FIELD_DEFS[field];
              if (!fd) return null;
              const isSecret = !!fd.secret;
              const visible = showSecrets[field];
              const help = provider.fieldHelp?.[field as keyof typeof provider.fieldHelp] || '';
              return (
                <div key={field}>
                  <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <fd.icon className="w-2.5 h-2.5" />
                    {fd.label}
                    {field === 'token' && <span className="text-red-400">*</span>}
                  </label>
                  <div className="relative">
                    <input
                      type={isSecret && !visible ? 'password' : 'text'}
                      value={formData[field] || ''}
                      onChange={e => setFormData(p => ({ ...p, [field]: e.target.value }))}
                      placeholder={fd.placeholder}
                      className="input-field text-xs w-full pr-8"
                    />
                    {isSecret && (
                      <button type="button" onClick={() => setShowSecrets(p => ({ ...p, [field]: !visible }))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {visible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                  {help && <p className="text-[9px] text-slate-400 font-mono mt-0.5">{help}</p>}
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

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={handleTest} disabled={testing || !formData.token}
              className="btn-ghost text-xs flex items-center gap-1.5 disabled:opacity-50">
              {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              Test Connection
            </button>
            <button onClick={handleSave} disabled={saving || !formData.token}
              className="btn-primary text-xs flex items-center gap-1.5 disabled:opacity-50">
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save & Activate
            </button>
            <button onClick={() => setShowForm(false)} className="btn-ghost text-xs">Cancel</button>
          </div>
        </div>
      )}

      {/* ── Saved configs list ────────────────────────────────────────────────── */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="panel-title flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-slate-500" />
            Saved Provider Connections
            {configs.length > 0 && <span className="ml-1 badge">{configs.length}</span>}
          </h3>
          {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />}
        </div>

        {configs.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
              <GitBranch className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500">No CI/CD providers configured yet.</p>
            <p className="text-xs text-slate-400">Add a provider to enable pipeline triggers, run history, and quality gate reporting.</p>
            <button onClick={() => setShowForm(true)} className="btn-primary text-xs flex items-center gap-1.5 mt-2">
              <Plus className="w-3.5 h-3.5" /> Add First Provider
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {configs.map(cfg => {
              const prov = CICD_PROVIDERS.find(p => p.id === cfg.provider);
              if (!prov) return null;
              const isExpanded = expandedId === cfg.id;
              return (
                <div key={cfg.id}
                  className={`rounded-xl border-2 transition-all ${cfg.is_active ? `${prov.border} ${prov.bg}` : 'border-slate-200 bg-white'}`}>
                  <div className="flex items-center gap-3 px-4 py-3 flex-wrap">
                    <span className="text-xl shrink-0">{prov.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-mono font-bold ${cfg.is_active ? prov.color : 'text-slate-700'}`}>{cfg.label || prov.name}</span>
                        {cfg.is_active && <span className="badge badge-green text-[9px]">● ACTIVE</span>}
                        {cfg.last_tested_ok
                          ? <span className="flex items-center gap-0.5 text-[9px] text-emerald-600 font-mono"><CheckCircle2 className="w-2.5 h-2.5" /> Verified</span>
                          : <span className="flex items-center gap-0.5 text-[9px] text-amber-500 font-mono"><AlertCircle className="w-2.5 h-2.5" /> Unverified</span>}
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {[cfg.org && `org: ${cfg.org}`, cfg.repo && `repo: ${cfg.repo}`, cfg.branch && `branch: ${cfg.branch}`, cfg.base_url && cfg.base_url].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!cfg.is_active && (
                        <button onClick={() => handleActivate(cfg)}
                          className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg border border-blue-300 text-blue-700 bg-white hover:bg-blue-50">
                          Set Active
                        </button>
                      )}
                      <button onClick={() => setExpandedId(isExpanded ? null : cfg.id)} className="text-slate-400 hover:text-slate-600 p-1">
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                      {deleteConfirm === cfg.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDelete(cfg.id)} className="text-[9px] font-mono px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200">Confirm</button>
                          <button onClick={() => setDeleteConfirm(null)} className="text-[9px] font-mono px-2 py-1 rounded bg-slate-100 text-slate-600">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirm(cfg.id)} className="text-slate-400 hover:text-red-500 p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-4 py-3 border-t border-slate-100 bg-white/60">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px] font-mono">
                        {[['Provider', cfg.provider], ['Branch', cfg.branch || '—'], ['Org', cfg.org || '—'], ['Repo', cfg.repo || '—'],
                          ['Pipeline/Job', cfg.pipeline_id || '—'], ['Token', '••••••••••••••••'], ['Last Tested', cfg.last_tested_at ? new Date(cfg.last_tested_at).toLocaleString() : 'Never'], ['Server URL', cfg.base_url || '(cloud)']].map(([k, v]) => (
                          <div key={k as string}>
                            <span className="text-slate-400 block mb-0.5">{k as string}</span>
                            <span className="text-slate-700 break-all">{v as string}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Quality gate integration info ─────────────────────────────────────── */}
      <div className="glass-card p-5 border border-blue-100 bg-blue-50/30">
        <h3 className="panel-title flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-blue-500" />
          How CI/CD Integration Works in EdgeQI
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: '🔗', title: 'Webhook Ingest', desc: 'Your CI/CD platform sends push/PR events to EdgeQI webhook endpoint automatically' },
            { icon: '▶️', title: 'Pipeline Trigger', desc: 'After AI test generation or execution, EdgeQI can dispatch a workflow/pipeline run on the configured provider' },
            { icon: '📊', title: 'Run History', desc: 'Live pipeline run status pulled from GitHub/GitLab API and displayed in CI/CD tab and Settings' },
            { icon: '📤', title: 'Quality Gate Report', desc: 'Execution results and pass/fail counts are sent back to the pipeline via webhook or status API' },
          ].map(item => (
            <div key={item.title} className="p-3 rounded-xl bg-white border border-blue-100">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-lg">{item.icon}</span>
                <span className="text-[11px] font-bold text-slate-700">{item.title}</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 px-3 py-2 rounded-lg bg-white border border-blue-200 text-[10px] font-mono text-slate-600">
          <span className="font-bold text-blue-700">Webhook URL:</span>{' '}
          <span className="text-slate-500">{typeof window !== 'undefined' ? window.location.origin : 'https://edgeqi.parimi-prasad.workers.dev'}/api/quality/cicd/webhook</span>
          <span className="ml-2 text-slate-400">— accepts GitHub, GitLab, Bitbucket push events</span>
        </div>
      </div>
    </div>
  );
}
