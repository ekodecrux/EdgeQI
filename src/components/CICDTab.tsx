import React, { useState, useEffect } from 'react';
import { GitBranch, Webhook, Play, CheckCircle, Copy, Download, Settings, Zap, RefreshCw, Terminal, AlertCircle } from 'lucide-react';

export default function CICDTab() {
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
    fetch('/api/quality/cicd/integrations').then(r => r.json()).then(d => setIntegrations(d.integrations || []));
    // Set webhook URL to current origin
    setWebhookUrl(`${window.location.origin}/api/quality/cicd/webhook`);
  }, []);

  const generateConfig = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/quality/cicd/generate-config', {
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
          <GitBranch className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h2 className="text-white font-bold text-lg">CI/CD Integration</h2>
          <p className="text-slate-400 text-xs">Webhook receiver, config generators, pipeline triggers (REQ-38/39/62)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Config Generator */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4 text-cyan-400" /> Config File Generator
          </h3>

          {/* Platform selector */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {platforms.map(p => (
              <button
                key={p.id}
                onClick={() => { setPlatform(p.id); if (allConfigs[p.id]) setGeneratedConfig(allConfigs[p.id]); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                  platform === p.id ? 'bg-cyan-600/20 border-cyan-500/50 text-cyan-300' : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                <span>{p.icon}</span>
                {p.label}
              </button>
            ))}
          </div>

          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Project Name</label>
              <input value={projectName} onChange={e => setProjectName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                placeholder="my-project" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Test Command</label>
              <input value={testCommand} onChange={e => setTestCommand(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-cyan-500"
                placeholder="npx playwright test" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Branches (comma-separated)</label>
              <input value={branches} onChange={e => setBranches(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-cyan-500"
                placeholder="main, develop" />
            </div>
          </div>

          <button
            onClick={generateConfig}
            disabled={generating}
            className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:opacity-60 text-white font-medium py-2 rounded-lg text-sm transition-all flex items-center justify-center gap-2"
          >
            {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Generate Config
          </button>

          {generatedConfig && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 font-medium">Generated Config</span>
                <div className="flex gap-2">
                  <button onClick={copyConfig} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-700">
                    {copied ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button onClick={downloadConfig} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-700">
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
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
            <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
              <Webhook className="w-4 h-4 text-violet-400" /> Webhook Receiver (REQ-38)
            </h3>
            <div className="bg-slate-900/80 border border-slate-700 rounded-lg p-3 mb-3">
              <p className="text-xs text-slate-500 mb-1">Your webhook URL:</p>
              <p className="text-emerald-400 font-mono text-xs break-all">{webhookUrl}</p>
            </div>
            <div className="space-y-2 text-xs text-slate-400">
              <p className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                Accepts GitHub, GitLab, Bitbucket webhook payloads
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                Auto-triggers execution on push/PR events
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                Logs all events in webhook history below
              </p>
            </div>

            <div className="mt-4 bg-slate-950 rounded-lg p-3 border border-slate-700/50">
              <p className="text-xs text-slate-500 mb-1 font-medium">Test webhook curl:</p>
              <code className="text-[11px] text-cyan-300 font-mono break-all leading-relaxed">
                {`curl -X POST ${webhookUrl} \\
  -H 'Content-Type: application/json' \\
  -H 'X-GitHub-Event: push' \\
  -d '{"ref":"refs/heads/main","pusher":{"name":"dev"},"head_commit":{"message":"feat: new feature"}}'`}
              </code>
            </div>
          </div>

          {/* Supported Platforms */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" /> Supported CI/CD Platforms (REQ-39)
            </h3>
            <div className="grid grid-cols-2 gap-1.5">
              {['Jenkins', 'GitHub Actions', 'GitLab CI', 'CircleCI', 'Azure Pipelines', 'Bamboo', 'TeamCity', 'ArgoCD'].map(p => (
                <div key={p} className="flex items-center gap-1.5 text-xs text-slate-300">
                  <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                  {p}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Webhook Events */}
      {integrations.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
            <Play className="w-4 h-4 text-cyan-400" /> Recent Webhook Events
          </h3>
          <div className="space-y-2">
            {integrations.slice(0, 10).map((evt: any) => (
              <div key={evt.id} className="flex items-center gap-3 bg-slate-900/50 rounded-lg px-3 py-2">
                <div className={`w-2 h-2 rounded-full ${evt.active ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                <span className="text-xs text-slate-300 font-mono">{evt.id}</span>
                <span className="text-xs text-slate-400">{evt.name}</span>
                <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded font-mono">{evt.type}</span>
                <span className="text-xs text-slate-500 ml-auto">{new Date(evt.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {integrations.length === 0 && (
        <div className="bg-slate-800/30 border border-dashed border-slate-700 rounded-xl p-8 text-center">
          <Webhook className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-medium">No webhook events yet</p>
          <p className="text-slate-500 text-xs mt-1">Configure your CI/CD platform to send webhooks to the URL above</p>
        </div>
      )}
    </div>
  );
}
