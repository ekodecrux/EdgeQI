import React, { useState } from 'react';
import { Link, RefreshCw, CheckCircle, XCircle, ExternalLink, Settings, Database, Upload } from 'lucide-react';

interface SyncResult { jiraKey?: string; testrailId?: number; summary?: string; status?: string; priority?: string; mappedTcId?: string; title?: string; tcId?: string; }

export default function IntegrationsTab() {
  const [activeInt, setActiveInt] = useState<'jira' | 'testrail' | 'azuredevops'>('jira');
  const [jiraUrl, setJiraUrl] = useState('');
  const [jiraEmail, setJiraEmail] = useState('');
  const [jiraToken, setJiraToken] = useState('');
  const [jiraProject, setJiraProject] = useState('');
  const [trUrl, setTrUrl] = useState('');
  const [trEmail, setTrEmail] = useState('');
  const [trToken, setTrToken] = useState('');
  const [trProject, setTrProject] = useState('1');
  const [syncing, setSyncing] = useState(false);
  const [results, setResults] = useState<SyncResult[]>([]);
  const [syncSource, setSyncSource] = useState('');
  const [error, setError] = useState('');

  const syncJira = async () => {
    if (!jiraProject) { setError('Project key is required'); return; }
    setSyncing(true); setError(''); setResults([]);
    try {
      const res = await fetch('/api/quality/integrations/jira/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jiraUrl: jiraUrl || 'https://demo.atlassian.net', email: jiraEmail, token: jiraToken, projectKey: jiraProject }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data.results || []);
      setSyncSource(data.source || '');
    } catch (e: any) { setError(e.message); } finally { setSyncing(false); }
  };

  const syncTestRail = async () => {
    setSyncing(true); setError(''); setResults([]);
    try {
      const res = await fetch('/api/quality/integrations/testrail/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testrailUrl: trUrl || 'https://demo.testrail.io', email: trEmail, token: trToken, projectId: trProject }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data.cases || []);
      setSyncSource(data.source || '');
    } catch (e: any) { setError(e.message); } finally { setSyncing(false); }
  };

  const integrations = [
    { id: 'jira', label: 'Jira', logo: '🟦', desc: 'Xray / Zephyr · Sync test cases to Jira issues' },
    { id: 'testrail', label: 'TestRail', logo: '🟧', desc: 'Two-way sync with TestRail test cases' },
    { id: 'azuredevops', label: 'Azure DevOps', logo: '🟪', desc: 'Azure Test Plans · Work item sync' },
  ];

  const tmsFeatures = ['Jira (Xray/Zephyr)', 'TestRail', 'QTest', 'Azure DevOps', 'PractiTest', 'HP ALM'];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center">
          <Link className="w-5 h-5 text-sky-400" />
        </div>
        <div>
          <h2 className="text-white font-bold text-lg">TMS Integrations</h2>
          <p className="text-slate-400 text-xs">Two-way sync with test management systems (REQ-08)</p>
        </div>
      </div>

      {/* Platform Tabs */}
      <div className="flex gap-2 flex-wrap">
        {integrations.map(i => (
          <button key={i.id} onClick={() => { setActiveInt(i.id as any); setResults([]); setError(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${activeInt === i.id ? 'bg-sky-600/20 border-sky-500/50 text-sky-300' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
            <span>{i.logo}</span> {i.label}
          </button>
        ))}
      </div>

      {/* Jira Form */}
      {activeInt === 'jira' && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🟦</span>
            <h3 className="text-white font-semibold">Jira Integration</h3>
            <span className="text-xs bg-sky-500/15 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded-full">Live or Demo</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Jira Instance URL</label>
              <input value={jiraUrl} onChange={e => setJiraUrl(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500"
                placeholder="https://yourcompany.atlassian.net" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Project Key <span className="text-red-400">*</span></label>
              <input value={jiraProject} onChange={e => setJiraProject(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500"
                placeholder="PROJ" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Email</label>
              <input type="email" value={jiraEmail} onChange={e => setJiraEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500"
                placeholder="you@company.com" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">API Token</label>
              <input type="password" value={jiraToken} onChange={e => setJiraToken(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500"
                placeholder="Atlassian API token" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={syncJira} disabled={syncing || !jiraProject}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-all">
              {syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Sync with Jira
            </button>
            <p className="text-xs text-slate-500">Leave URL/credentials empty to run in demo mode</p>
          </div>
        </div>
      )}

      {/* TestRail Form */}
      {activeInt === 'testrail' && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🟧</span>
            <h3 className="text-white font-semibold">TestRail Integration</h3>
            <span className="text-xs bg-sky-500/15 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded-full">Live or Demo</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">TestRail URL</label>
              <input value={trUrl} onChange={e => setTrUrl(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500"
                placeholder="https://yourcompany.testrail.io" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Project ID</label>
              <input value={trProject} onChange={e => setTrProject(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500"
                placeholder="1" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Email</label>
              <input value={trEmail} onChange={e => setTrEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500"
                placeholder="you@company.com" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">API Key / Password</label>
              <input type="password" value={trToken} onChange={e => setTrToken(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500"
                placeholder="TestRail API key" />
            </div>
          </div>
          <button onClick={syncTestRail} disabled={syncing}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-all">
            {syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sync with TestRail
          </button>
        </div>
      )}

      {/* Azure DevOps */}
      {activeInt === 'azuredevops' && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🟪</span>
            <h3 className="text-white font-semibold">Azure DevOps Integration</h3>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-sm text-amber-300">
            Azure DevOps sync is available via the CI/CD Webhook integration. Configure a service hook in Azure DevOps to send events to your iQStudio webhook URL.
          </div>
          <div className="mt-4 space-y-2 text-xs text-slate-400">
            <p className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Azure Pipelines CI/CD config generator → CI/CD tab</p>
            <p className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Azure DevOps webhook receiver → CI/CD tab</p>
            <p className="flex items-center gap-2"><Settings className="w-3.5 h-3.5 text-amber-400" /> Azure Test Plans API sync → coming soon</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-2 text-red-400 text-sm">
          <XCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" /> Sync Results ({results.length} items)
            </h3>
            <span className={`text-xs px-2 py-1 rounded-full ${syncSource === 'demo' ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
              {syncSource === 'demo' ? '🎭 Demo Mode' : '✅ Live Sync'}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-700">
                  <th className="text-left py-2 pr-4">{activeInt === 'jira' ? 'Jira Key' : 'TestRail ID'}</th>
                  <th className="text-left py-2 pr-4">Title / Summary</th>
                  <th className="text-left py-2 pr-4">Status</th>
                  <th className="text-left py-2">Mapped TC</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/30">
                    <td className="py-2 pr-4 font-mono text-sky-400">{r.jiraKey || r.testrailId}</td>
                    <td className="py-2 pr-4 text-slate-300">{(r.summary || r.title || '—').slice(0, 60)}</td>
                    <td className="py-2 pr-4">
                      <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-[10px]">{r.status || 'active'}</span>
                    </td>
                    <td className="py-2 font-mono text-indigo-400">{r.mappedTcId || r.tcId || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Supported TMS list */}
      <div className="bg-slate-800/30 border border-dashed border-slate-700 rounded-xl p-5">
        <h3 className="text-slate-300 font-semibold text-sm mb-3 flex items-center gap-2">
          <Database className="w-4 h-4 text-slate-400" /> Supported Test Management Systems (REQ-08)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {tmsFeatures.map(t => (
            <div key={t} className="flex items-center gap-1.5 text-xs text-slate-400">
              <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" /> {t}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
