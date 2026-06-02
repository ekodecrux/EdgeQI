import React, { useState } from 'react';
import {
  Link, RefreshCw, CheckCircle, XCircle, ArrowDown, ArrowUp, ArrowRight,
  Settings, Database, Download, Upload, Clock, AlertTriangle, ExternalLink,
  Layers, ShieldAlert, FileText, ClipboardList
} from 'lucide-react';
import { TestCase, RequirementDoc, DefectHotspot } from '../types';

// ── Types ────────────────────────────────────────────────────────────────────
type TmsTool = 'jira' | 'testrail' | 'azuredevops' | 'qtest' | 'hpalm';
type SyncOp = 'pull-reqs' | 'pull-tcs' | 'push-tcs' | 'push-defects';

interface SyncRecord {
  op: SyncOp;
  tool: TmsTool;
  count: number;
  source: string;
  timestamp: string;
}

interface IntegrationsProps {
  requirements?: RequirementDoc[];
  testCases?: TestCase[];
  defectHotspots?: DefectHotspot[];
  onAddRequirement?: (reqs: RequirementDoc[]) => void;
  onAddTestCases?: (tcs: TestCase[]) => void;
}

// ── Tool Config ───────────────────────────────────────────────────────────────
const TOOLS: { id: TmsTool; label: string; logo: string; color: string; demo: boolean; ops: SyncOp[] }[] = [
  { id: 'jira',        label: 'Jira',         logo: '🟦', color: '#0052cc', demo: true,  ops: ['pull-reqs', 'pull-tcs', 'push-tcs', 'push-defects'] },
  { id: 'testrail',    label: 'TestRail',      logo: '🟧', color: '#e07b39', demo: true,  ops: ['pull-tcs', 'push-tcs'] },
  { id: 'azuredevops', label: 'Azure DevOps',  logo: '🟪', color: '#0078d4', demo: true,  ops: ['pull-reqs', 'pull-tcs', 'push-tcs', 'push-defects'] },
  { id: 'qtest',       label: 'qTest',         logo: '🟩', color: '#00963f', demo: true,  ops: ['pull-tcs'] },
  { id: 'hpalm',       label: 'HP ALM',        logo: '🟥', color: '#cf2124', demo: true,  ops: ['pull-tcs'] },
];

const OP_META: Record<SyncOp, { label: string; icon: React.FC<any>; dir: 'in' | 'out'; desc: string; color: string }> = {
  'pull-reqs':    { label: 'Pull Requirements', icon: ArrowDown,    dir: 'in',  desc: 'Import Stories/Epics → EDGE QI Requirements', color: '#0ea5e9' },
  'pull-tcs':     { label: 'Pull Test Cases',   icon: ArrowDown,    dir: 'in',  desc: 'Import test cases from TMS → EDGE QI',         color: '#6366f1' },
  'push-tcs':     { label: 'Push Test Cases',   icon: ArrowUp,      dir: 'out', desc: 'Export EDGE QI test cases → TMS',              color: '#10b981' },
  'push-defects': { label: 'Push Defects',      icon: ArrowUp,      dir: 'out', desc: 'Export defect hotspots → TMS as Bug items',    color: '#f59e0b' },
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function IntegrationsTab({
  requirements = [],
  testCases = [],
  defectHotspots = [],
  onAddRequirement,
  onAddTestCases,
}: IntegrationsProps) {
  const [activeTool, setActiveTool] = useState<TmsTool>('jira');
  const [activeOp, setActiveOp] = useState<SyncOp>('pull-reqs');

  // Credentials state per tool
  const [creds, setCreds] = useState<Record<TmsTool, Record<string, string>>>({
    jira:        { url: '', email: '', token: '', projectKey: '' },
    testrail:    { url: '', email: '', token: '', projectId: '1' },
    azuredevops: { orgUrl: '', project: '', pat: '' },
    qtest:       { url: '', token: '', projectId: '' },
    hpalm:       { url: '', username: '', password: '', domain: '', projectId: '' },
  });

  const [syncing, setSyncing] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [syncMode, setSyncMode] = useState('');
  const [syncHistory, setSyncHistory] = useState<SyncRecord[]>([]);
  const [importedCount, setImportedCount] = useState<{ reqs: number; tcs: number }>({ reqs: 0, tcs: 0 });

  const tool = TOOLS.find(t => t.id === activeTool)!;
  const opMeta = OP_META[activeOp];
  const c = creds[activeTool];

  const setCred = (key: string, val: string) =>
    setCreds(prev => ({ ...prev, [activeTool]: { ...prev[activeTool], [key]: val } }));

  // ── Execute Sync ────────────────────────────────────────────────────────────
  const runSync = async () => {
    setSyncing(true); setError(''); setResults([]);

    try {
      let endpoint = '';
      let body: Record<string, any> = {};

      if (activeTool === 'jira') {
        const base = { jiraUrl: c.url, email: c.email, token: c.token, projectKey: c.projectKey };
        if (activeOp === 'pull-reqs')    { endpoint = '/api/quality/integrations/jira/pull-requirements'; body = base; }
        if (activeOp === 'pull-tcs')     { endpoint = '/api/quality/integrations/jira/sync';               body = base; }
        if (activeOp === 'push-tcs')     { endpoint = '/api/quality/integrations/jira/push-testcases';     body = { ...base, testCases }; }
        if (activeOp === 'push-defects') { endpoint = '/api/quality/integrations/jira/push-defects';       body = { ...base, defects: defectHotspots }; }
      } else if (activeTool === 'testrail') {
        const base = { testrailUrl: c.url, email: c.email, token: c.token, projectId: c.projectId };
        if (activeOp === 'pull-tcs')  { endpoint = '/api/quality/integrations/testrail/pull-testcases'; body = base; }
        if (activeOp === 'push-tcs')  { endpoint = '/api/quality/integrations/testrail/push-testcases'; body = { ...base, testCases }; }
      } else if (activeTool === 'azuredevops') {
        const base = { orgUrl: c.orgUrl, project: c.project, pat: c.pat };
        if (activeOp === 'pull-reqs')    { endpoint = '/api/quality/integrations/azure/pull-requirements'; body = base; }
        if (activeOp === 'pull-tcs')     { endpoint = '/api/quality/integrations/azure/sync';               body = base; }
        if (activeOp === 'push-tcs')     { endpoint = '/api/quality/integrations/azure/sync';               body = { ...base, testCaseIds: testCases.map(tc => tc.id) }; }
        if (activeOp === 'push-defects') { endpoint = '/api/quality/integrations/azure/push-defects';       body = { ...base, defects: defectHotspots }; }
      } else if (activeTool === 'qtest') {
        endpoint = '/api/quality/integrations/qtest/pull-testcases';
        body = { qtestUrl: c.url, token: c.token, projectId: c.projectId };
      } else if (activeTool === 'hpalm') {
        endpoint = '/api/quality/integrations/hpalm/pull-testcases';
        body = { almUrl: c.url, username: c.username, password: c.password, domain: c.domain, projectId: c.projectId };
      }

      if (!endpoint) { setError('Operation not supported for this tool'); setSyncing(false); return; }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');

      setSyncMode(data.source || 'demo');

      // Handle results and import into shared state
      if (activeOp === 'pull-reqs' && data.requirements) {
        setResults(data.requirements);
        if (onAddRequirement && data.requirements.length > 0) {
          onAddRequirement(data.requirements);
          setImportedCount(prev => ({ ...prev, reqs: prev.reqs + data.requirements.length }));
        }
      } else if (activeOp === 'pull-tcs' && (data.testCases || data.cases)) {
        const tcs = data.testCases || data.cases || [];
        setResults(tcs);
        if (onAddTestCases && tcs.length > 0) {
          onAddTestCases(tcs);
          setImportedCount(prev => ({ ...prev, tcs: prev.tcs + tcs.length }));
        }
      } else {
        setResults(data.results || data.items || []);
      }

      // Record history
      const count = data.count || data.pushed || data.synced || data.requirements?.length || data.testCases?.length || data.cases?.length || data.results?.length || 0;
      setSyncHistory(prev => [{
        op: activeOp, tool: activeTool, count, source: data.source || 'demo',
        timestamp: new Date().toLocaleTimeString(),
      }, ...prev.slice(0, 9)]);

    } catch (e: any) {
      setError(e.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  // ── Defect Dump Download ────────────────────────────────────────────────────
  const downloadDefectDump = async (format: 'json' | 'csv' | 'jira-bulk') => {
    const url = `/api/quality/integrations/defects/dump?format=${format}`;
    if (format === 'csv') {
      const a = document.createElement('a');
      a.href = url; a.download = 'defect-dump.csv'; a.click();
    } else {
      const res = await fetch(url);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `defect-dump-${format}.json`; a.click();
    }
  };

  // ── Credential Form ─────────────────────────────────────────────────────────
  const renderCredForm = () => {
    const inp = (label: string, key: string, ph: string, type = 'text') => (
      <div key={key}>
        <label style={{ display: 'block', fontSize: 11, color: '#6b82ab', marginBottom: 4, fontWeight: 600 }}>{label}</label>
        <input
          type={type}
          value={c[key] || ''}
          onChange={e => setCred(key, e.target.value)}
          placeholder={ph}
          style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 7, padding: '7px 10px', color: '#e2e8f0', fontSize: 12, boxSizing: 'border-box' }}
        />
      </div>
    );

    if (activeTool === 'jira') return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {inp('Jira Instance URL', 'url', 'https://yourcompany.atlassian.net')}
        {inp('Project Key *', 'projectKey', 'PROJ')}
        {inp('Email', 'email', 'you@company.com')}
        {inp('API Token', 'token', 'Atlassian API token', 'password')}
      </div>
    );

    if (activeTool === 'testrail') return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {inp('TestRail URL', 'url', 'https://yourcompany.testrail.io')}
        {inp('Project ID', 'projectId', '1')}
        {inp('Email', 'email', 'you@company.com')}
        {inp('API Key / Password', 'token', 'TestRail API key', 'password')}
      </div>
    );

    if (activeTool === 'azuredevops') return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {inp('Organization URL', 'orgUrl', 'https://dev.azure.com/your-org')}
        {inp('Project Name', 'project', 'MyProject')}
        {inp('Personal Access Token (PAT)', 'pat', 'PAT token...', 'password')}
      </div>
    );

    if (activeTool === 'qtest') return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {inp('qTest Manager URL', 'url', 'https://yourcompany.qtestnet.com')}
        {inp('Project ID', 'projectId', '12345')}
        {inp('API Token', 'token', 'Bearer token...', 'password')}
      </div>
    );

    if (activeTool === 'hpalm') return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {inp('ALM Server URL', 'url', 'http://alm-server:8080/qcbin')}
        {inp('Domain', 'domain', 'DEFAULT')}
        {inp('Project', 'projectId', 'MyProject')}
        {inp('Username', 'username', 'admin')}
        {inp('Password', 'password', '••••••••', 'password')}
      </div>
    );

    return null;
  };

  // ── Results Table ───────────────────────────────────────────────────────────
  const renderResultsTable = () => {
    if (results.length === 0) return null;
    const isIn = OP_META[activeOp].dir === 'in';
    const isPushDefects = activeOp === 'push-defects';
    const isPullReqs = activeOp === 'pull-reqs';

    return (
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle style={{ width: 15, height: 15, color: '#10b981' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>
              {results.length} {activeOp === 'pull-reqs' ? 'Requirements' : activeOp === 'pull-tcs' ? 'Test Cases' : activeOp === 'push-tcs' ? 'TCs Pushed' : 'Defects Pushed'}
            </span>
            {isIn && onAddRequirement && activeOp === 'pull-reqs' && (
              <span style={{ fontSize: 11, color: '#10b981', background: '#10b98120', border: '1px solid #10b98140', borderRadius: 20, padding: '2px 8px' }}>✓ Added to Requirements</span>
            )}
            {isIn && onAddTestCases && activeOp === 'pull-tcs' && (
              <span style={{ fontSize: 11, color: '#6366f1', background: '#6366f120', border: '1px solid #6366f140', borderRadius: 20, padding: '2px 8px' }}>✓ Added to Test Cases</span>
            )}
          </div>
          <span style={{ fontSize: 11, color: syncMode === 'demo' ? '#f59e0b' : '#10b981', background: syncMode === 'demo' ? '#f59e0b15' : '#10b98115', border: `1px solid ${syncMode === 'demo' ? '#f59e0b40' : '#10b98140'}`, borderRadius: 20, padding: '2px 8px' }}>
            {syncMode === 'demo' ? '🎭 Demo Mode' : '✅ Live Sync'}
          </span>
        </div>
        <div style={{ overflowX: 'auto', maxHeight: 280, overflowY: 'auto' }}>
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: '#64748b', borderBottom: '1px solid #1e293b' }}>
                {isPullReqs && <><th style={{ textAlign: 'left', padding: '6px 10px 6px 0' }}>ID / Key</th><th style={{ textAlign: 'left', padding: '6px 10px 6px 0' }}>Title</th><th style={{ textAlign: 'left', padding: '6px 0' }}>Type</th><th style={{ textAlign: 'left', padding: '6px 0' }}>Status</th></>}
                {activeOp === 'pull-tcs' && <><th style={{ textAlign: 'left', padding: '6px 10px 6px 0' }}>ID</th><th style={{ textAlign: 'left', padding: '6px 10px 6px 0' }}>Title</th><th style={{ textAlign: 'left', padding: '6px 10px 6px 0' }}>Priority</th><th style={{ textAlign: 'left', padding: '6px 0' }}>Automation</th></>}
                {activeOp === 'push-tcs' && <><th style={{ textAlign: 'left', padding: '6px 10px 6px 0' }}>EDGE QI ID</th><th style={{ textAlign: 'left', padding: '6px 10px 6px 0' }}>TMS Key/ID</th><th style={{ textAlign: 'left', padding: '6px 10px 6px 0' }}>Title</th><th style={{ textAlign: 'left', padding: '6px 0' }}>Status</th></>}
                {isPushDefects && <><th style={{ textAlign: 'left', padding: '6px 10px 6px 0' }}>Module</th><th style={{ textAlign: 'left', padding: '6px 10px 6px 0' }}>TMS Issue</th><th style={{ textAlign: 'left', padding: '6px 0' }}>Risk Score</th><th style={{ textAlign: 'left', padding: '6px 0' }}>Status</th></>}
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #0f172a' }}>
                  {isPullReqs && (
                    <>
                      <td style={{ padding: '7px 10px 7px 0', color: '#38bdf8', fontFamily: 'monospace' }}>{r.jiraKey || r.azureId || r.id?.split('-').slice(-1)[0] || '—'}</td>
                      <td style={{ padding: '7px 10px 7px 0', color: '#e2e8f0' }}>{(r.title || '').slice(0, 55)}{r.title?.length > 55 ? '…' : ''}</td>
                      <td style={{ padding: '7px 10px 7px 0' }}><span style={{ fontSize: 10, color: '#a78bfa', background: '#a78bfa15', borderRadius: 4, padding: '2px 6px' }}>{r.issueType || r.workItemType || 'Story'}</span></td>
                      <td style={{ padding: '7px 0', color: '#94a3b8' }}>{r.status || 'To Do'}</td>
                    </>
                  )}
                  {activeOp === 'pull-tcs' && (
                    <>
                      <td style={{ padding: '7px 10px 7px 0', color: '#38bdf8', fontFamily: 'monospace' }}>{r.trId || r.jiraKey || r.id?.split('-').slice(-1)[0] || '—'}</td>
                      <td style={{ padding: '7px 10px 7px 0', color: '#e2e8f0' }}>{(r.title || '').slice(0, 55)}{r.title?.length > 55 ? '…' : ''}</td>
                      <td style={{ padding: '7px 10px 7px 0' }}><span style={{ fontSize: 10, background: r.priority === 'P0' ? '#ef444420' : r.priority === 'P1' ? '#f59e0b20' : '#64748b20', color: r.priority === 'P0' ? '#ef4444' : r.priority === 'P1' ? '#f59e0b' : '#94a3b8', borderRadius: 4, padding: '2px 6px' }}>{r.priority || 'P2'}</span></td>
                      <td style={{ padding: '7px 0' }}><span style={{ fontSize: 10, color: '#10b981', background: '#10b98115', borderRadius: 4, padding: '2px 6px' }}>{r.automationStatus || 'Automatable'}</span></td>
                    </>
                  )}
                  {activeOp === 'push-tcs' && (
                    <>
                      <td style={{ padding: '7px 10px 7px 0', color: '#94a3b8', fontFamily: 'monospace', fontSize: 10 }}>{r.tcId || '—'}</td>
                      <td style={{ padding: '7px 10px 7px 0', color: '#38bdf8', fontFamily: 'monospace' }}>{r.jiraKey || r.trId || r.azureId || r.iqStudioId || '—'}</td>
                      <td style={{ padding: '7px 10px 7px 0', color: '#e2e8f0' }}>{(r.title || '').slice(0, 45)}{(r.title || '').length > 45 ? '…' : ''}</td>
                      <td style={{ padding: '7px 0' }}><span style={{ fontSize: 10, color: r.status === 'created' ? '#10b981' : '#ef4444', background: r.status === 'created' ? '#10b98115' : '#ef444415', borderRadius: 4, padding: '2px 6px' }}>{r.status === 'created' ? '✓ Created' : '✗ Failed'}</span></td>
                    </>
                  )}
                  {isPushDefects && (
                    <>
                      <td style={{ padding: '7px 10px 7px 0', color: '#e2e8f0' }}>{r.module || '—'}</td>
                      <td style={{ padding: '7px 10px 7px 0', color: '#38bdf8', fontFamily: 'monospace' }}>{r.jiraKey || `#${r.azureId}` || '—'}</td>
                      <td style={{ padding: '7px 10px 7px 0' }}>{r.riskScore != null ? <span style={{ fontSize: 10, color: r.riskScore >= 80 ? '#ef4444' : r.riskScore >= 60 ? '#f59e0b' : '#94a3b8' }}>{r.riskScore}%</span> : '—'}</td>
                      <td style={{ padding: '7px 0' }}><span style={{ fontSize: 10, color: r.status === 'created' ? '#10b981' : '#ef4444', background: r.status === 'created' ? '#10b98115' : '#ef444415', borderRadius: 4, padding: '2px 6px' }}>{r.status === 'created' ? '✓ Created' : '✗ Failed'}</span></td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px solid #1e293b', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#0052cc 0%,#00b4d8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Link style={{ width: 20, height: 20, color: '#fff' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>TMS Integrations</h1>
            <p style={{ fontSize: 12, color: '#6b82ab', margin: 0 }}>Bidirectional sync with Jira, TestRail, Azure DevOps, qTest, HP ALM</p>
          </div>
        </div>
        {/* Live stats */}
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: 'Requirements', count: requirements.length, icon: FileText, color: '#0ea5e9' },
            { label: 'Test Cases', count: testCases.length, icon: ClipboardList, color: '#6366f1' },
            { label: 'Defect Hotspots', count: defectHotspots.length, icon: ShieldAlert, color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: '8px 14px', textAlign: 'center', minWidth: 90 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.count}</div>
              <div style={{ fontSize: 10, color: '#64748b' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20 }}>

        {/* Left: Tool Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Select Tool</p>
          {TOOLS.map(t => (
            <button
              key={t.id}
              onClick={() => { setActiveTool(t.id); setResults([]); setError(''); setActiveOp(t.ops[0]); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                borderRadius: 10, border: `1px solid ${activeTool === t.id ? t.color + '80' : '#1e293b'}`,
                background: activeTool === t.id ? t.color + '18' : '#0f172a',
                cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 20 }}>{t.logo}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: activeTool === t.id ? '#f1f5f9' : '#94a3b8' }}>{t.label}</div>
                <div style={{ fontSize: 10, color: '#64748b' }}>
                  {t.ops.length} operation{t.ops.length !== 1 ? 's' : ''} · {t.demo ? 'Demo ✓' : 'Live only'}
                </div>
              </div>
              {activeTool === t.id && <ArrowRight style={{ width: 14, height: 14, color: t.color }} />}
            </button>
          ))}

          {/* Sync History */}
          {syncHistory.length > 0 && (
            <div style={{ marginTop: 16, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock style={{ width: 11, height: 11 }} /> Recent Syncs
              </p>
              {syncHistory.map((h, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', borderBottom: i < syncHistory.length - 1 ? '1px solid #1e293b' : 'none' }}>
                  {OP_META[h.op].dir === 'in'
                    ? <ArrowDown style={{ width: 10, height: 10, color: '#0ea5e9', flexShrink: 0 }} />
                    : <ArrowUp style={{ width: 10, height: 10, color: '#10b981', flexShrink: 0 }} />}
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{TOOLS.find(t => t.id === h.tool)?.label} · {h.count} items</div>
                    <div style={{ fontSize: 9, color: '#475569' }}>{h.timestamp} · {h.source === 'demo' ? '🎭' : '✅'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Main Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Operation Tabs */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {tool.ops.map(op => {
              const meta = OP_META[op];
              const active = activeOp === op;
              return (
                <button
                  key={op}
                  onClick={() => { setActiveOp(op); setResults([]); setError(''); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px',
                    borderRadius: 8, border: `1px solid ${active ? (meta.dir === 'in' ? '#0ea5e9' : '#10b981') + '80' : '#1e293b'}`,
                    background: active ? (meta.dir === 'in' ? '#0ea5e9' : '#10b981') + '18' : '#0f172a',
                    cursor: 'pointer', fontSize: 12, fontWeight: active ? 700 : 500,
                    color: active ? '#f1f5f9' : '#64748b', transition: 'all 0.15s',
                  }}
                >
                  {meta.dir === 'in'
                    ? <ArrowDown style={{ width: 13, height: 13, color: active ? '#0ea5e9' : '#475569' }} />
                    : <ArrowUp style={{ width: 13, height: 13, color: active ? '#10b981' : '#475569' }} />}
                  {meta.label}
                </button>
              );
            })}
          </div>

          {/* Op Description */}
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: opMeta.dir === 'in' ? '#0ea5e920' : '#10b98120', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {opMeta.dir === 'in'
                ? <ArrowDown style={{ width: 18, height: 18, color: '#0ea5e9' }} />
                : <ArrowUp style={{ width: 18, height: 18, color: '#10b981' }} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 }}>{opMeta.label}</div>
              <div style={{ fontSize: 12, color: '#6b82ab' }}>{opMeta.desc}</div>
            </div>
            {/* Context counts for push operations */}
            {activeOp === 'push-tcs' && (
              <div style={{ fontSize: 11, color: '#6366f1', background: '#6366f115', border: '1px solid #6366f130', borderRadius: 6, padding: '4px 10px', textAlign: 'center' }}>
                <div style={{ fontWeight: 700 }}>{testCases.length}</div>
                <div style={{ color: '#64748b' }}>TCs ready</div>
              </div>
            )}
            {activeOp === 'push-defects' && (
              <div style={{ fontSize: 11, color: '#f59e0b', background: '#f59e0b15', border: '1px solid #f59e0b30', borderRadius: 6, padding: '4px 10px', textAlign: 'center' }}>
                <div style={{ fontWeight: 700 }}>{defectHotspots.length}</div>
                <div style={{ color: '#64748b' }}>Defects ready</div>
              </div>
            )}
          </div>

          {/* Credentials */}
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 22 }}>{tool.logo}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{tool.label} Credentials</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Leave empty to use Demo Mode with sample data</div>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: '#f59e0b', background: '#f59e0b15', border: '1px solid #f59e0b30', borderRadius: 20, padding: '3px 10px' }}>Live or Demo</span>
            </div>

            {renderCredForm()}

            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={runSync}
                disabled={syncing}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '9px 20px',
                  borderRadius: 9, border: 'none', cursor: syncing ? 'not-allowed' : 'pointer',
                  background: opMeta.dir === 'in' ? 'linear-gradient(135deg,#0369a1,#0ea5e9)' : 'linear-gradient(135deg,#047857,#10b981)',
                  color: '#fff', fontSize: 13, fontWeight: 700, opacity: syncing ? 0.7 : 1, transition: 'opacity 0.15s',
                }}
              >
                {syncing
                  ? <><RefreshCw style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> Syncing…</>
                  : <><>{opMeta.dir === 'in' ? <ArrowDown style={{ width: 14, height: 14 }} /> : <ArrowUp style={{ width: 14, height: 14 }} />}</> {opMeta.label} ({tool.label})</>
                }
              </button>
              <p style={{ fontSize: 11, color: '#475569', margin: 0 }}>Leave credentials empty for demo mode</p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: '#ef444415', border: '1px solid #ef444440', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444', fontSize: 12 }}>
              <XCircle style={{ width: 15, height: 15, flexShrink: 0 }} /> {error}
            </div>
          )}

          {/* Results */}
          {renderResultsTable()}

          {/* Import summary banner */}
          {(importedCount.reqs > 0 || importedCount.tcs > 0) && (
            <div style={{ background: '#10b98115', border: '1px solid #10b98140', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <CheckCircle style={{ width: 18, height: 18, color: '#10b981', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>Data imported into EDGE QI</div>
                <div style={{ fontSize: 11, color: '#6b82ab', marginTop: 2 }}>
                  {importedCount.reqs > 0 && `${importedCount.reqs} requirement${importedCount.reqs !== 1 ? 's' : ''} added to Requirements tab`}
                  {importedCount.reqs > 0 && importedCount.tcs > 0 && ' · '}
                  {importedCount.tcs > 0 && `${importedCount.tcs} test case${importedCount.tcs !== 1 ? 's' : ''} added to Test Cases tab`}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Defect Dump Section */}
      <div style={{ marginTop: 28, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f59e0b18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Download style={{ width: 18, height: 18, color: '#f59e0b' }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>Defect Dump Export</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Export all defect hotspots in TMS-ready formats for bulk import</div>
            </div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>{defectHotspots.length || '—'} hotspots</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { format: 'json' as const,       label: 'JSON Export',      icon: '{ }',  desc: 'Full structured export for custom integrations', color: '#6366f1' },
            { format: 'csv' as const,        label: 'CSV Download',     icon: '📊',  desc: 'Spreadsheet-ready defect dump for all TMS tools',  color: '#0ea5e9' },
            { format: 'jira-bulk' as const,  label: 'Jira Bulk JSON',   icon: '🟦',  desc: 'Jira bulk-create format — ready to import',       color: '#0052cc' },
          ].map(opt => (
            <button
              key={opt.format}
              onClick={() => downloadDefectDump(opt.format)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
                padding: '14px 16px', borderRadius: 10, border: `1px solid ${opt.color}30`,
                background: opt.color + '0f', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>{opt.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{opt.label}</span>
              </div>
              <p style={{ fontSize: 11, color: '#64748b', margin: 0, lineHeight: 1.4 }}>{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Supported Platforms */}
      <div style={{ marginTop: 20, background: '#0f172a', border: '1px dashed #1e293b', borderRadius: 12, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Database style={{ width: 15, height: 15, color: '#475569' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Integration Coverage</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {TOOLS.map(t => (
            <div key={t.id} style={{ background: '#0a0f1a', border: `1px solid ${t.color}30`, borderRadius: 10, padding: '12px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{t.logo}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>{t.label}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {t.ops.map(op => (
                  <div key={op} style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
                    <CheckCircle style={{ width: 10, height: 10, color: OP_META[op].dir === 'in' ? '#0ea5e9' : '#10b981', flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>{OP_META[op].label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
