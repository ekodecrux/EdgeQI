/**
 * TmsSyncBar — reusable TMS pull/push banner for every module.
 *
 * Usage:
 *   <TmsSyncBar
 *     module="requirements"           // requirements | testcases | defects | regression | results
 *     ops={['pull']}                  // which operations are available
 *     onPull={(items) => ...}         // called with pulled items
 *     onPush={() => ...}              // called to trigger push (optional)
 *     pushLabel="Push Generated TCs"  // custom push button label
 *     pushDisabled={false}
 *     projectId={currentProjectId}
 *   />
 */
import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Upload, Download, CheckCircle2, AlertCircle, Settings, ExternalLink, X, ChevronDown, ChevronUp } from 'lucide-react';
import { apiUrl } from '@/src/config/api';

const TOOL_META: Record<string, { icon: string; color: string; bg: string; border: string }> = {
  jira:        { icon: '🔵', color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  xray:        { icon: '🔷', color: 'text-blue-800',   bg: 'bg-blue-50',   border: 'border-blue-300' },
  zephyr:      { icon: '🌀', color: 'text-cyan-700',   bg: 'bg-cyan-50',   border: 'border-cyan-200' },
  testrail:    { icon: '🟢', color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200' },
  azuredevops: { icon: '🔷', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  qtest:       { icon: '🟣', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  hpalm:       { icon: '🔶', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  default:     { icon: '🔗', color: 'text-slate-700',  bg: 'bg-slate-50',  border: 'border-slate-200' },
};

const MODULE_LABELS: Record<string, string> = {
  requirements: 'Requirements',
  testcases:    'Test Cases',
  defects:      'Defect Dump',
  regression:   'Regression Suite',
  results:      'Execution Results',
  performance:  'Perf Results',
  security:     'Security Vulns',
  scripts:      'Automation Scripts',
  testplans:    'Test Plans',
  scheduler:    'Scheduled Runs',
  analytics:    'KPI Snapshot',
};

const PULL_ENDPOINT: Record<string, string> = {
  requirements: '/api/tms/pull/requirements',
  testcases:    '/api/tms/pull/testcases',
  defects:      '/api/tms/pull/defects',
  regression:   '/api/tms/pull/regression',
  testplans:    '/api/tms/pull/testplans',
};
const PUSH_ENDPOINT: Record<string, string> = {
  testcases:    '/api/tms/push/testcases',
  results:      '/api/tms/push/results',
  performance:  '/api/tms/push/performance',
  security:     '/api/tms/push/security',
  scripts:      '/api/tms/push/scripts',
  testplans:    '/api/tms/push/testplans',
  scheduler:    '/api/tms/push/scheduler',
  analytics:    '/api/tms/push/analytics',
};

interface TmsSyncBarProps {
  module: 'requirements' | 'testcases' | 'defects' | 'regression' | 'results' | 'performance' | 'security' | 'scripts' | 'testplans' | 'scheduler' | 'analytics';
  ops?: ('pull' | 'push')[];
  onPull?: (items: any[]) => void;
  onPush?: () => Promise<any>;  // caller provides push data via callback
  pushLabel?: string;
  pushDisabled?: boolean;
  pushData?: any;               // data to push (testcases array, run result, etc.)
  projectId?: string;
  compact?: boolean;            // smaller inline variant
}

export const TmsSyncBar: React.FC<TmsSyncBarProps> = ({
  module, ops = ['pull', 'push'], onPull, onPush, pushLabel, pushDisabled, pushData, projectId = 'global', compact = false
}) => {
  const [cfg, setCfg] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);
  const [lastPulled, setLastPulled] = useState<number | null>(null);
  const [lastPushed, setLastPushed] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const loadConfig = useCallback(async () => {
    try {
      const r = await fetch(apiUrl(`/api/settings/tms?projectId=${projectId}`));
      const d = await r.json();
      if (d.configured) setCfg(d.config);
      else setCfg(null);
    } catch { setCfg(null); }
  }, [projectId]);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const handlePull = async () => {
    if (!cfg) return;
    setLoading(true);
    setStatus(null);
    try {
      const endpoint = PULL_ENDPOINT[module];
      if (!endpoint) return;
      const r = await fetch(apiUrl(endpoint), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, projectKey: cfg.project_key })
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || 'Pull failed');
      const items = d.items || d.suites || [];
      setLastPulled(items.length);
      setStatus({ type: 'success', msg: `✅ Pulled ${items.length} ${MODULE_LABELS[module]} from ${cfg.tool.toUpperCase()}${d.demo ? ' (demo)' : ''}` });
      onPull?.(items);
    } catch (e: any) {
      setStatus({ type: 'error', msg: `❌ ${e.message}` });
    } finally {
      setLoading(false);
      setTimeout(() => setStatus(null), 8000);
    }
  };

  const handlePush = async () => {
    setPushLoading(true);
    setStatus(null);
    try {
      if (onPush) {
        const result = await onPush();
        setLastPushed(result?.key || 'pushed');
        setStatus({ type: 'success', msg: `✅ ${MODULE_LABELS[module]} pushed to ${cfg?.tool?.toUpperCase() || 'TMS'}${result?.key ? ' → ' + result.key : ''}${result?.demo ? ' (demo)' : ''}` });
      } else if (pushData && cfg) {
        const endpoint = PUSH_ENDPOINT[module];
        if (!endpoint) return;
        const r = await fetch(apiUrl(endpoint), {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, ...pushData })
        });
        const d = await r.json();
        if (!d.success) throw new Error(d.error || 'Push failed');
        setLastPushed(d.key || 'pushed');
        setStatus({ type: 'success', msg: `✅ Pushed to ${cfg.tool.toUpperCase()}${d.key ? ' → ' + d.key : ''}${d.demo ? ' (demo)' : ''}` });
      }
    } catch (e: any) {
      setStatus({ type: 'error', msg: `❌ Push failed: ${e.message}` });
    } finally {
      setPushLoading(false);
      setTimeout(() => setStatus(null), 8000);
    }
  };

  const meta = TOOL_META[cfg?.tool || 'default'];

  // Not configured — show a small "Connect TMS" nudge
  if (!cfg) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 ${compact ? 'text-[10px]' : 'text-xs'}`}>
        <Settings className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="text-slate-500 font-mono">No TMS connected —</span>
        <a href="#" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'settings' })); }}
          className="text-blue-600 hover:underline font-mono font-bold">
          Configure in Settings →
        </a>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${meta.border} ${meta.bg}`}>
        <span className="text-[11px]">{meta.icon}</span>
        <span className={`text-[10px] font-mono font-bold ${meta.color}`}>{cfg.tool.toUpperCase()}</span>
        {ops.includes('pull') && (
          <button onClick={handlePull} disabled={loading}
            className={`flex items-center gap-0.5 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${meta.border} ${meta.color} bg-white hover:opacity-80 disabled:opacity-50`}>
            {loading ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <Download className="w-2.5 h-2.5" />}
            Pull
          </button>
        )}
        {ops.includes('push') && (
          <button onClick={handlePush} disabled={pushLoading || pushDisabled}
            className="flex items-center gap-0.5 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-emerald-300 text-emerald-700 bg-white hover:opacity-80 disabled:opacity-50">
            {pushLoading ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <Upload className="w-2.5 h-2.5" />}
            {pushLabel || 'Push'}
          </button>
        )}
        {status && (
          <span className={`text-[9px] font-mono ${status.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>{status.msg.slice(0, 60)}</span>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border ${meta.border} ${meta.bg} overflow-hidden`}>
      {/* Header row */}
      <div className="flex items-center justify-between px-3 py-2.5 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-base">{meta.icon}</span>
          <div>
            <div className="flex items-center gap-1.5">
              <span className={`text-[11px] font-mono font-bold ${meta.color}`}>{cfg.label || cfg.tool.toUpperCase()}</span>
              <span className="text-[9px] bg-white border border-slate-200 text-slate-500 font-mono px-1.5 py-0 rounded">{cfg.project_key}</span>
              {cfg.last_tested_ok ? (
                <span className="text-[9px] text-emerald-600 font-mono flex items-center gap-0.5"><CheckCircle2 className="w-2.5 h-2.5" /> Connected</span>
              ) : null}
            </div>
            <p className="text-[10px] text-slate-500 font-mono">
              {MODULE_LABELS[module]}
              {lastPulled !== null && <span className="ml-2 text-emerald-600">· {lastPulled} items pulled</span>}
              {lastPushed && <span className="ml-2 text-indigo-600">· pushed → {lastPushed}</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {ops.includes('pull') && (
            <button onClick={handlePull} disabled={loading}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono font-bold rounded-lg border ${meta.border} ${meta.color} bg-white hover:opacity-80 disabled:opacity-50 transition-all`}>
              {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
              Pull {MODULE_LABELS[module]}
            </button>
          )}
          {ops.includes('push') && (
            <button onClick={handlePush} disabled={pushLoading || pushDisabled}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono font-bold rounded-lg border border-emerald-300 text-emerald-700 bg-white hover:opacity-80 disabled:opacity-50 transition-all">
              {pushLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              {pushLabel || `Push to ${cfg.tool.toUpperCase()}`}
            </button>
          )}
          <button onClick={() => setShowDetail(p => !p)} className="text-slate-400 hover:text-slate-600">
            {showDetail ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Status bar */}
      {status && (
        <div className={`px-3 py-1.5 flex items-center gap-2 text-[10px] font-mono border-t ${status.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {status.type === 'success' ? <CheckCircle2 className="w-3 h-3 shrink-0" /> : <AlertCircle className="w-3 h-3 shrink-0" />}
          <span className="flex-1">{status.msg}</span>
          <button onClick={() => setStatus(null)}><X className="w-3 h-3" /></button>
        </div>
      )}

      {/* Expanded detail */}
      {showDetail && (
        <div className="px-3 py-2 border-t border-slate-100 bg-white/60 flex flex-wrap gap-3 text-[10px] text-slate-500 font-mono">
          <span>🔗 {cfg.base_url}</span>
          <span>👤 {cfg.email || 'token auth'}</span>
          {cfg.last_synced_at && <span>🕐 Last sync: {new Date(cfg.last_synced_at).toLocaleString()}</span>}
          <a href="#" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'settings' })); }}
            className="text-blue-600 hover:underline flex items-center gap-0.5">
            <Settings className="w-2.5 h-2.5" /> Reconfigure
          </a>
        </div>
      )}
    </div>
  );
};

export default TmsSyncBar;
