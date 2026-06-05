import React, { useState, useEffect } from 'react';
import { GitBranch, Webhook, Play, CheckCircle, Copy, Download, Settings, Zap, RefreshCw, Terminal, AlertCircle, Bell, BellOff, Layers, Plus, X, ExternalLink, CheckCircle2 } from 'lucide-react';
import { apiUrl } from '@/src/config/api';

export default function CICDTab() {
  // CI/CD provider config state
  const [cicdCfg, setCicdCfg] = useState<any>(null);
  const [cicdCfgLoaded, setCicdCfgLoaded] = useState(false);

  useEffect(() => {
    fetch(apiUrl('/api/settings/cicd?projectId=global'))
      .then(r => r.json())
      .then(d => { setCicdCfg(d.configured ? d.config : null); setCicdCfgLoaded(true); })
      .catch(() => setCicdCfgLoaded(true));
  }, []);

  // REQ-87: Pipeline status state
  const [pipelineStatus, setPipelineStatus] = useState<any[]>([]);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [newPipeline, setNewPipeline] = useState({ name: '', stage: 'build', status: 'running' });

  const loadPipelines = async () => {
    setPipelineLoading(true);
    try {
      const token = localStorage.getItem('iq_token');
      const res = await fetch(apiUrl('/api/quality/cicd/pipeline-status'), { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const data = await res.json();
      if (data.pipelines) setPipelineStatus(data.pipelines);
    } catch { /* silent */ } finally { setPipelineLoading(false); }
  };

  const addPipeline = async () => {
    if (!newPipeline.name.trim()) return;
    try {
      const token = localStorage.getItem('iq_token');
      const res = await fetch(apiUrl('/api/quality/cicd/pipeline-status'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(newPipeline)
      });
      const data = await res.json();
      if (data.pipeline) { setPipelineStatus(prev => [data.pipeline, ...prev]); setNewPipeline({ name: '', stage: 'build', status: 'running' }); }
    } catch { /* silent */ }
  };

  // REQ-88: Notification config state
  const [notifConfigs, setNotifConfigs] = useState<any[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [newNotif, setNewNotif] = useState({ label: '', url: '', events: 'run_complete' });

  const loadNotifConfigs = async () => {
    setNotifLoading(true);
    try {
      const token = localStorage.getItem('iq_token');
      const res = await fetch(apiUrl('/api/quality/notifications/config'), { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const data = await res.json();
      if (data.configs) setNotifConfigs(data.configs);
    } catch { /* silent */ } finally { setNotifLoading(false); }
  };

  const addNotifConfig = async () => {
    if (!newNotif.url.trim()) return;
    try {
      const token = localStorage.getItem('iq_token');
      const res = await fetch(apiUrl('/api/quality/notifications/config'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ ...newNotif, events: [newNotif.events] })
      });
      const data = await res.json();
      if (data.config) { setNotifConfigs(prev => [data.config, ...prev]); setNewNotif({ label: '', url: '', events: 'run_complete' }); }
    } catch { /* silent */ }
  };

  const toggleNotif = async (id: string, enabled: boolean) => {
    try {
      const token = localStorage.getItem('iq_token');
      await fetch(apiUrl(`/api/quality/notifications/config/${id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ enabled })
      });
      setNotifConfigs(prev => prev.map(c => c.id === id ? { ...c, enabled } : c));
    } catch { /* silent */ }
  };

  const [platform, setPlatform] = useState('github-actions');
  const [projectName, setProjectName] = useState('my-project');
  const [testCommand, setTestCommand] = useState('npx playwright test');
  const [branches, setBranches] = useState('main,develop');
  const [generatedConfig, setGeneratedConfig] = useState('');
  const [allConfigs, setAllConfigs] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');

  useEffect(() => {
    fetch(apiUrl('/api/quality/cicd/integrations')).then(r => r.json()).then(d => setIntegrations(d.integrations || []));
    setWebhookUrl(`${window.location.origin}/api/quality/cicd/webhook`);
    loadPipelines();
    loadNotifConfigs();
  }, []);

  const generateConfig = async () => {
    setGenerating(true);
    try {
      const res = await fetch(apiUrl('/api/quality/cicd/generate-config'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform, projectName, testCommand,
          branches: branches.split(',').map(b => b.trim()),
        }),
      });
      const data = await res.json();
      setGeneratedConfig(data.config || '');
      setAllConfigs(data.allConfigs || {});
    } finally {
      setGenerating(false);
    }
  };

  const copyConfig = () => {
    navigator.clipboard.writeText(generatedConfig);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadConfig = () => {
    const filenames: Record<string, string> = {
      'github-actions': '.github/workflows/iq-quality-gate.yml',
      'jenkins': 'Jenkinsfile',
      'gitlab-ci': '.gitlab-ci.yml',
      'azure-pipelines': 'azure-pipelines.yml',
    };
    const blob = new Blob([generatedConfig], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filenames[platform] || 'ci-config.yml';
    a.click();
  };

  const platforms = [
    { id: 'github-actions', label: 'GitHub Actions', icon: '⚡' },
    { id: 'jenkins', label: 'Jenkins', icon: '🔧' },
    { id: 'gitlab-ci', label: 'GitLab CI', icon: '🦊' },
    { id: 'azure-pipelines', label: 'Azure Pipelines', icon: '☁️' },
  ];

  const PROVIDER_META: Record<string, { icon: string; color: string; bg: string; border: string }> = {
    github:    { icon: '⚡', color: 'text-slate-800',   bg: 'bg-slate-50',   border: 'border-slate-300' },
    gitlab:    { icon: '🦊', color: 'text-orange-700', bg: 'bg-orange-50',  border: 'border-orange-200' },
    jenkins:   { icon: '🔧', color: 'text-blue-700',   bg: 'bg-blue-50',    border: 'border-blue-200' },
    azure:     { icon: '☁️', color: 'text-indigo-700', bg: 'bg-indigo-50',  border: 'border-indigo-200' },
    circleci:  { icon: '🔵', color: 'text-green-700',  bg: 'bg-green-50',   border: 'border-green-200' },
    teamcity:  { icon: '🏠', color: 'text-purple-700', bg: 'bg-purple-50',  border: 'border-purple-200' },
    bitbucket: { icon: '🪣', color: 'text-blue-600',   bg: 'bg-blue-50',    border: 'border-blue-200' },
    default:   { icon: '🔗', color: 'text-slate-700',  bg: 'bg-slate-50',   border: 'border-slate-200' },
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="glass-card p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center">
          <GitBranch className="w-5 h-5 text-blue-500" />
        </div>
        <div className="flex-1">
          <h2 className="panel-title">CI/CD Integration</h2>
          <p className="text-slate-500 text-xs">Webhooks, quality gates and pipeline triggers</p>
        </div>
        {/* Provider config status badge */}
        {cicdCfgLoaded && (
          cicdCfg ? (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${(PROVIDER_META[cicdCfg.provider] || PROVIDER_META.default).border} ${(PROVIDER_META[cicdCfg.provider] || PROVIDER_META.default).bg}`}>
              <span className="text-sm">{(PROVIDER_META[cicdCfg.provider] || PROVIDER_META.default).icon}</span>
              <span className={`text-[10px] font-mono font-bold ${(PROVIDER_META[cicdCfg.provider] || PROVIDER_META.default).color}`}>{cicdCfg.label || cicdCfg.provider?.toUpperCase()}</span>
              <span className="badge badge-green text-[9px]">● Active</span>
              {cicdCfg.last_tested_ok && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
              <button onClick={() => window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'cicd-settings' }))}
                className="text-[9px] font-mono text-blue-600 hover:underline flex items-center gap-0.5 ml-1">
                <Settings className="w-2.5 h-2.5" /> Configure
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-dashed border-slate-300 bg-slate-50">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[10px] font-mono text-slate-500">No CI/CD provider —</span>
              <button onClick={() => window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'cicd-settings' }))}
                className="text-[10px] font-mono font-bold text-blue-600 hover:underline">
                Configure in Settings →
              </button>
            </div>
          )
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Config Generator */}
        <div className="glass-card p-5">
          <h3 className="panel-title text-sm mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4 text-blue-500" /> Config File Generator
          </h3>

          {/* Platform selector */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {platforms.map(p => (
              <button
                key={p.id}
                onClick={() => { setPlatform(p.id); if (allConfigs[p.id]) setGeneratedConfig(allConfigs[p.id]); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                  platform === p.id ? 'btn-primary' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300 hover:bg-blue-50/30'
                }`}
              >
                <span>{p.icon}</span>
                {p.label}
              </button>
            ))}
          </div>

          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Project Name</label>
              <input value={projectName} onChange={e => setProjectName(e.target.value)}
                className="input-glass w-full text-sm"
                placeholder="my-project" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Test Command</label>
              <input value={testCommand} onChange={e => setTestCommand(e.target.value)}
                className="input-glass w-full text-sm font-mono"
                placeholder="npx playwright test" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Branches (comma-separated)</label>
              <input value={branches} onChange={e => setBranches(e.target.value)}
                className="input-glass w-full text-sm font-mono"
                placeholder="main, develop" />
            </div>
          </div>

          <button
            onClick={generateConfig}
            disabled={generating}
            className="btn-primary w-full py-2 text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Generate Config
          </button>

          {generatedConfig && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 font-medium">Generated Config</span>
                <div className="flex gap-2">
                  <button onClick={copyConfig} className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 border border-slate-200">
                    {copied ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button onClick={downloadConfig} className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 border border-slate-200">
                    <Download className="w-3 h-3" /> Download
                  </button>
                </div>
              </div>
              <pre className="bg-slate-950 border border-slate-700/50 rounded-lg p-3 text-xs text-slate-300 font-mono overflow-x-auto max-h-64 whitespace-pre-wrap">{generatedConfig}</pre>
            </div>
          )}
        </div>

        {/* Webhook Receiver */}
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="panel-title text-sm mb-4 flex items-center gap-2">
              <Webhook className="w-4 h-4 text-blue-500" /> Webhook Receiver (REQ-38)
            </h3>
            <div className="metal-surface rounded-lg p-3 mb-3">
              <p className="text-xs text-slate-500 mb-1">Your webhook URL:</p>
              <p className="text-blue-600 font-mono text-xs break-all">{webhookUrl}</p>
            </div>
            <div className="space-y-2 text-xs text-slate-500">
              <p className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                Accepts GitHub, GitLab, Bitbucket webhook payloads
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                Auto-triggers execution on push/PR events
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                Logs all events in webhook history below
              </p>
            </div>

            <div className="mt-4 bg-slate-950 rounded-lg p-3 border border-slate-700/50">
              <p className="text-xs text-slate-500 mb-1 font-medium">Test webhook curl:</p>
              <code className="text-[11px] text-cyan-300 font-mono break-all leading-relaxed">
                {`curl -X POST ${webhookUrl} \
  -H 'Content-Type: application/json' \
  -H 'X-GitHub-Event: push' \
  -d '{"ref":"refs/heads/main","pusher":{"name":"dev"},"head_commit":{"message":"feat: new feature"}}'`}
              </code>
            </div>
          </div>

          {/* Supported Platforms */}
          <div className="glass-card p-4">
            <h3 className="panel-title text-sm mb-3 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-blue-500" /> Supported CI/CD Platforms (REQ-39)
            </h3>
            <div className="grid grid-cols-2 gap-1.5">
              {['Jenkins', 'GitHub Actions', 'GitLab CI', 'CircleCI', 'Azure Pipelines', 'Bamboo', 'TeamCity', 'ArgoCD'].map(p => (
                <div key={p} className="flex items-center gap-1.5 text-xs text-slate-600">
                  <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
                  {p}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Webhook Events */}
      {integrations.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="panel-title text-sm mb-4 flex items-center gap-2">
            <Play className="w-4 h-4 text-blue-500" /> Recent Webhook Events
          </h3>
          <div className="space-y-2">
            {integrations.slice(0, 10).map((evt: any) => (
              <div key={evt.id} className="flex items-center gap-3 metal-surface rounded-lg px-3 py-2">
                <div className={`w-2 h-2 rounded-full ${evt.active ? 'bg-green-400' : 'bg-slate-400'}`} />
                <span className="text-xs text-slate-600 font-mono">{evt.id}</span>
                <span className="text-xs text-slate-500">{evt.name}</span>
                <span className="text-xs bg-blue-50 border border-blue-200 text-blue-600 px-2 py-0.5 rounded font-mono">{evt.type}</span>
                <span className="text-xs text-slate-400 ml-auto">{new Date(evt.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {integrations.length === 0 && (
        <div className="glass-card border-dashed p-8 text-center">
          <Webhook className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-medium">No webhook events yet</p>
          <p className="text-slate-400 text-xs mt-1">Configure your CI/CD platform to send webhooks to the URL above</p>
        </div>
      )}

      {/* REQ-87: Pipeline Status Panel */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="panel-title text-sm flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-500" /> Pipeline Status Tracker <span className="text-[10px] font-mono text-slate-400 ml-1">(REQ-87)</span>
          </h3>
          <button onClick={loadPipelines} disabled={pipelineLoading}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 border border-slate-200">
            <RefreshCw className={`w-3 h-3 ${pipelineLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
        {/* Add pipeline form */}
        <div className="flex gap-2 flex-wrap">
          <input value={newPipeline.name} onChange={e => setNewPipeline(p => ({...p, name: e.target.value}))}
            placeholder="Pipeline name" className="input-glass flex-1 min-w-[140px] text-xs" />
          <select value={newPipeline.stage} onChange={e => setNewPipeline(p => ({...p, stage: e.target.value}))}
            className="input-glass px-2 py-1.5 text-xs">
            {['build','test','deploy','scan'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={newPipeline.status} onChange={e => setNewPipeline(p => ({...p, status: e.target.value}))}
            className="input-glass px-2 py-1.5 text-xs">
            {['running','passed','failed','pending'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={addPipeline} className="btn-primary flex items-center gap-1 px-3 py-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
        {pipelineStatus.length > 0 ? (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {pipelineStatus.map((p: any) => {
              const statusColors: Record<string,string> = { running:'text-blue-500', passed:'text-green-600', failed:'text-red-500', pending:'text-amber-500' };
              const dotColors: Record<string,string> = { running:'bg-blue-400 animate-pulse', passed:'bg-green-400', failed:'bg-red-400', pending:'bg-amber-400' };
              return (
                <div key={p.id} className="flex items-center gap-3 metal-surface rounded-lg px-3 py-2">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${dotColors[p.status] || 'bg-slate-400'}`} />
                  <span className="text-xs text-slate-700 font-medium flex-1 truncate">{p.name}</span>
                  <span className="text-[10px] font-mono text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">{p.stage}</span>
                  <span className={`text-[10px] font-mono font-bold ${statusColors[p.status] || 'text-slate-500'}`}>{p.status}</span>
                  <span className="text-[9px] text-slate-600 ml-1">{new Date(p.updatedAt).toLocaleTimeString()}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-500 font-mono text-center py-2">No pipelines tracked yet. Add one above.</p>
        )}
      </div>

      {/* REQ-88: Notification Config Panel */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="panel-title text-sm flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-500" /> Slack / Webhook Notifications <span className="text-[10px] font-mono text-slate-400 ml-1">(REQ-88)</span>
          </h3>
          <button onClick={loadNotifConfigs} disabled={notifLoading}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 border border-slate-200">
            <RefreshCw className={`w-3 h-3 ${notifLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input value={newNotif.label} onChange={e => setNewNotif(n => ({...n, label: e.target.value}))}
            placeholder="Label (e.g. Slack #qa)" className="input-glass flex-1 min-w-[120px] text-xs" />
          <input value={newNotif.url} onChange={e => setNewNotif(n => ({...n, url: e.target.value}))}
            placeholder="Webhook URL https://..." className="input-glass flex-1 min-w-[180px] text-xs font-mono" />
          <select value={newNotif.events} onChange={e => setNewNotif(n => ({...n, events: e.target.value}))}
            className="input-glass px-2 py-1.5 text-xs">
            <option value="run_complete">run_complete</option>
            <option value="run_failed">run_failed</option>
            <option value="all">all</option>
          </select>
          <button onClick={addNotifConfig} className="btn-primary flex items-center gap-1 px-3 py-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
        {notifConfigs.length > 0 ? (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {notifConfigs.map((cfg: any) => (
              <div key={cfg.id} className="flex items-center gap-3 metal-surface rounded-lg px-3 py-2">
                <button onClick={() => toggleNotif(cfg.id, !cfg.enabled)} title={cfg.enabled ? 'Disable' : 'Enable'}
                  className={`shrink-0 ${cfg.enabled ? 'text-green-500' : 'text-slate-400'} hover:opacity-80 transition-opacity`}>
                  {cfg.enabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                </button>
                <span className="text-xs text-slate-700 font-medium shrink-0">{cfg.label || 'Unnamed'}</span>
                <span className="text-[10px] font-mono text-slate-400 flex-1 truncate">{cfg.url}</span>
                <span className="text-[9px] font-mono bg-blue-50 border border-blue-200 text-blue-600 px-1.5 py-0.5 rounded">{Array.isArray(cfg.events) ? cfg.events.join(', ') : cfg.events}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 font-mono text-center py-2">No notification endpoints configured yet.</p>
        )}
      </div>
    </div>
  );
}
