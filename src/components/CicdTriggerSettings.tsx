/**
 * CicdTriggerSettings — Manual Kickstart + Auto-Trigger Policy
 *
 * Two-panel section rendered inside CicdConfigSettings.tsx:
 *
 *  ① Manual Kickstart
 *     • Suite selector (all / smoke / regression / sanity / custom)
 *     • Branch input + custom pattern input (when suite = custom)
 *     • "Run Now" button → POST /api/settings/cicd/manual-kickstart
 *     • Live result card (run ID, passed/failed, duration)
 *     • Trigger log table (GET /api/settings/cicd/trigger-log)
 *
 *  ② Auto-Trigger Policy
 *     • Trigger mode toggle: Manual-only / Auto / Both
 *     • Event checkboxes: On Push / On Pull-Request / On Merge
 *     • Watch branches (comma-separated)
 *     • Test suite selector
 *     • Notification toggles + Slack webhook URL input
 *     • Save Policy button → POST /api/settings/cicd/trigger-policy
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play, Zap, RefreshCw, CheckCircle2, XCircle, Clock, ChevronDown,
  ChevronUp, Save, Bell, BellOff, AlertTriangle, GitBranch, GitMerge,
  GitPullRequest, Terminal, Settings2, Activity, ExternalLink, Info,
  Check, Loader2,
} from 'lucide-react';
import { apiUrl } from '@/src/config/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type Suite = 'all' | 'smoke' | 'regression' | 'sanity' | 'custom';
type TriggerMode = 'manual' | 'auto' | 'both';

interface KickstartResult {
  success: boolean;
  runId: string;
  passed: number;
  failed: number;
  total: number;
  durationMs: number;
  test_suite: string;
  demo?: boolean;
  error?: string;
}

interface TriggerLog {
  id: string;
  trigger_source: string;   // manual | webhook | schedule
  trigger_event: string;    // push | pr | merge | manual
  branch: string;
  commit?: string;
  author?: string;
  test_suite: string;
  status: string;           // queued | running | passed | failed | skipped
  passed: number;
  failed: number;
  duration_ms: number;
  detail: string;
  created_at: string;
}

interface TriggerPolicy {
  trigger_mode: TriggerMode;
  trigger_on_push: boolean;
  trigger_on_pr: boolean;
  trigger_on_merge: boolean;
  watch_branches: string;
  test_suite: Suite;
  custom_test_pattern: string;
  notify_on_complete: boolean;
  notify_on_fail: boolean;
  notify_slack_url: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SUITES: { value: Suite; label: string; count: string; color: string }[] = [
  { value: 'all',        label: 'All Tests',         count: '~45 TCs',   color: 'bg-slate-600' },
  { value: 'smoke',      label: 'Smoke Suite',        count: '~15 TCs',   color: 'bg-green-600' },
  { value: 'regression', label: 'Regression Suite',   count: '~120 TCs',  color: 'bg-blue-600'  },
  { value: 'sanity',     label: 'Sanity Suite',       count: '~8 TCs',    color: 'bg-yellow-600'},
  { value: 'custom',     label: 'Custom Pattern',     count: 'filtered',  color: 'bg-purple-600'},
];

const TRIGGER_MODES: { value: TriggerMode; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: 'manual', label: 'Manual Only',  icon: <Play className="w-3.5 h-3.5" />,    desc: 'Run tests only when you click "Run Now". Webhooks are ignored.' },
  { value: 'auto',   label: 'Auto Only',    icon: <Zap className="w-3.5 h-3.5" />,     desc: 'Tests fire automatically on CI/CD events. Manual Run Now is disabled.' },
  { value: 'both',   label: 'Both',         icon: <Activity className="w-3.5 h-3.5" />, desc: 'Manual and auto-trigger are both active simultaneously.' },
];

const STATUS_STYLES: Record<string, string> = {
  passed:  'bg-green-100 text-green-700 border-green-200',
  failed:  'bg-red-100   text-red-700   border-red-200',
  running: 'bg-blue-100  text-blue-700  border-blue-200',
  queued:  'bg-slate-100 text-slate-600 border-slate-200',
  skipped: 'bg-amber-100 text-amber-700 border-amber-200',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  passed:  <CheckCircle2 className="w-3 h-3" />,
  failed:  <XCircle      className="w-3 h-3" />,
  running: <Loader2      className="w-3 h-3 animate-spin" />,
  queued:  <Clock        className="w-3 h-3" />,
  skipped: <AlertTriangle className="w-3 h-3" />,
};

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  manual:   <Terminal        className="w-3.5 h-3.5 text-slate-500" />,
  webhook:  <Zap            className="w-3.5 h-3.5 text-amber-500" />,
  schedule: <Clock           className="w-3.5 h-3.5 text-blue-500" />,
};

const EVENT_ICONS: Record<string, React.ReactNode> = {
  push:   <GitBranch    className="w-3.5 h-3.5 text-slate-400" />,
  pr:     <GitPullRequest className="w-3.5 h-3.5 text-blue-400" />,
  merge:  <GitMerge      className="w-3.5 h-3.5 text-green-500" />,
  manual: <Play          className="w-3.5 h-3.5 text-purple-400" />,
};

function fmtDuration(ms: number): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function fmtRelTime(iso: string): string {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 60000)  return 'just now';
  if (diffMs < 3600000) return `${Math.floor(diffMs/60000)}m ago`;
  if (diffMs < 86400000) return `${Math.floor(diffMs/3600000)}h ago`;
  return new Date(iso).toLocaleDateString();
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  /** If false, Manual Kickstart "Run Now" and Auto-trigger saving are disabled */
  hasActiveConfig: boolean;
  /** Provider name shown in tooltips, e.g. "GitHub Actions" */
  providerLabel?: string;
}

export default function CicdTriggerSettings({ hasActiveConfig, providerLabel = 'CI/CD' }: Props) {

  // ── Manual Kickstart state ────────────────────────────────────────────────
  const [suite,         setSuite]         = useState<Suite>('smoke');
  const [branch,        setBranch]        = useState('main');
  const [customPattern, setCustomPattern] = useState('');
  const [running,       setRunning]       = useState(false);
  const [kickResult,    setKickResult]    = useState<KickstartResult | null>(null);
  const [logs,          setLogs]          = useState<TriggerLog[]>([]);
  const [logsLoading,   setLogsLoading]   = useState(false);
  const [logsExpanded,  setLogsExpanded]  = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  // ── Auto-Trigger Policy state ─────────────────────────────────────────────
  const [policy, setPolicy] = useState<TriggerPolicy>({
    trigger_mode:     'manual',
    trigger_on_push:  false,
    trigger_on_pr:    false,
    trigger_on_merge: true,
    watch_branches:   'main',
    test_suite:       'smoke',
    custom_test_pattern: '',
    notify_on_complete: true,
    notify_on_fail:   true,
    notify_slack_url: '',
  });
  const [policySaving,  setPolicySaving]  = useState(false);
  const [policySaved,   setPolicySaved]   = useState(false);
  const [policyError,   setPolicyError]   = useState('');
  const [policySection, setPolicySection] = useState(true);  // expanded by default
  const [showSlack,     setShowSlack]     = useState(false);

  // ── Load existing trigger policy + logs on mount ──────────────────────────
  const loadPolicy = useCallback(async () => {
    try {
      const r = await fetch(apiUrl('/api/settings/cicd?projectId=global'));
      const d = await r.json();
      if (d.configured && d.config) {
        const c = d.config;
        setPolicy({
          trigger_mode:        (c.trigger_mode     || 'manual') as TriggerMode,
          trigger_on_push:     !!c.trigger_on_push,
          trigger_on_pr:       !!c.trigger_on_pr,
          trigger_on_merge:    !!c.trigger_on_merge,
          watch_branches:      c.watch_branches     || 'main',
          test_suite:          (c.test_suite        || 'smoke') as Suite,
          custom_test_pattern: c.custom_test_pattern || '',
          notify_on_complete:  c.notify_on_complete !== 0,
          notify_on_fail:      c.notify_on_fail     !== 0,
          notify_slack_url:    c.notify_slack_url    || '',
        });
        if (c.notify_slack_url) setShowSlack(true);
      }
    } catch { /* use defaults */ }
  }, []);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const r = await fetch(apiUrl('/api/settings/cicd/trigger-log?limit=20'));
      const d = await r.json();
      setLogs(d.logs || []);
    } catch { setLogs([]); } finally { setLogsLoading(false); }
  }, []);

  useEffect(() => {
    loadPolicy();
    loadLogs();
  }, [loadPolicy, loadLogs]);

  // ── Manual Kickstart ──────────────────────────────────────────────────────
  const runKickstart = async () => {
    if (!hasActiveConfig || running) return;
    setRunning(true);
    setKickResult(null);

    try {
      const r = await fetch(apiUrl('/api/settings/cicd/manual-kickstart'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: 'global',
          test_suite: suite,
          custom_test_pattern: suite === 'custom' ? customPattern : '',
          branch,
          notify: true,
          label: `Manual Kickstart — ${suite}`,
        }),
      });
      const data = await r.json();
      setKickResult(data);
      // scroll to result
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
      // refresh log
      loadLogs();
    } catch (e: any) {
      setKickResult({ success: false, error: e.message, runId: '', passed: 0, failed: 0, total: 0, durationMs: 0, test_suite: suite });
    } finally {
      setRunning(false);
    }
  };

  // ── Save trigger policy ───────────────────────────────────────────────────
  const savePolicy = async () => {
    if (!hasActiveConfig) return;
    setPolicySaving(true);
    setPolicySaved(false);
    setPolicyError('');

    try {
      const r = await fetch(apiUrl('/api/settings/cicd/trigger-policy'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: 'global',
          trigger_mode:         policy.trigger_mode,
          trigger_on_push:      policy.trigger_on_push  ? 1 : 0,
          trigger_on_pr:        policy.trigger_on_pr    ? 1 : 0,
          trigger_on_merge:     policy.trigger_on_merge ? 1 : 0,
          watch_branches:       policy.watch_branches,
          test_suite:           policy.test_suite,
          custom_test_pattern:  policy.custom_test_pattern,
          notify_on_complete:   policy.notify_on_complete ? 1 : 0,
          notify_on_fail:       policy.notify_on_fail    ? 1 : 0,
          notify_slack_url:     policy.notify_slack_url,
        }),
      });
      const d = await r.json();
      if (d.success) {
        setPolicySaved(true);
        setTimeout(() => setPolicySaved(false), 3000);
      } else {
        setPolicyError(d.error || 'Save failed');
      }
    } catch (e: any) {
      setPolicyError(e.message || 'Network error');
    } finally {
      setPolicySaving(false);
    }
  };

  const policyChange = <K extends keyof TriggerPolicy>(key: K, val: TriggerPolicy[K]) =>
    setPolicy(p => ({ ...p, [key]: val }));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── ① Manual Kickstart ────────────────────────────────────────────── */}
      <div className="glass-card border border-slate-200 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
          <div className="p-2 rounded-xl bg-slate-900 text-white">
            <Play className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Manual Kickstart</h3>
            <p className="text-[11px] text-slate-500">Immediately run a test suite against any branch — no CI/CD trigger required</p>
          </div>
          {!hasActiveConfig && (
            <span className="ml-auto text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-2 py-1 rounded-lg font-medium">
              ⚠ Configure a provider first
            </span>
          )}
        </div>

        <div className="p-5 space-y-4">
          {/* Suite selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Test Suite
            </label>
            <div className="flex flex-wrap gap-2">
              {SUITES.map(s => (
                <button
                  key={s.value}
                  onClick={() => setSuite(s.value)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition-all
                    ${suite === s.value
                      ? `${s.color} text-white border-transparent shadow-sm`
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}
                  `}
                >
                  {s.label}
                  <span className={`text-[10px] font-normal ${suite === s.value ? 'text-white/80' : 'text-slate-400'}`}>
                    {s.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom pattern (only when suite = custom) */}
          {suite === 'custom' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Custom Pattern
              </label>
              <input
                type="text"
                value={customPattern}
                onChange={e => setCustomPattern(e.target.value)}
                placeholder="e.g. **/*.login.spec.ts or @smoke"
                className="w-full px-3 py-2 text-[12px] border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/50 font-mono"
              />
              <p className="mt-1 text-[10px] text-slate-400">Glob pattern or tag filter passed to the test runner</p>
            </div>
          )}

          {/* Branch input + Run Now */}
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Target Branch
              </label>
              <div className="relative">
                <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={branch}
                  onChange={e => setBranch(e.target.value)}
                  placeholder="main"
                  className="w-full pl-9 pr-3 py-2 text-[12px] border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-400/50 font-mono"
                />
              </div>
            </div>

            <button
              onClick={runKickstart}
              disabled={!hasActiveConfig || running}
              className={`
                flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all
                ${!hasActiveConfig
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : running
                    ? 'bg-slate-700 text-white cursor-wait'
                    : 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-md active:scale-95'}
              `}
            >
              {running ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Running…</>
              ) : (
                <><Play className="w-4 h-4" /> Run Now</>
              )}
            </button>
          </div>

          {/* Result card */}
          {kickResult && (
            <div
              ref={resultRef}
              className={`
                rounded-xl border p-4 animate-fade-in
                ${kickResult.failed > 0
                  ? 'bg-red-50 border-red-200'
                  : kickResult.success
                    ? 'bg-green-50 border-green-200'
                    : 'bg-amber-50 border-amber-200'}
              `}
            >
              {kickResult.error ? (
                <p className="text-[12px] text-red-700 font-medium">❌ {kickResult.error}</p>
              ) : (
                <div className="space-y-2">
                  {/* Top row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {kickResult.failed > 0
                        ? <XCircle className="w-4 h-4 text-red-500" />
                        : <CheckCircle2 className="w-4 h-4 text-green-500" />}
                      <span className="text-[12px] font-bold text-slate-700">
                        {kickResult.failed > 0 ? 'Tests Failed' : 'All Tests Passed'}
                      </span>
                      {kickResult.demo && (
                        <span className="text-[9px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-medium">DEMO</span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{kickResult.runId}</span>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-4 text-[11px]">
                    <span className="text-green-700 font-semibold">✅ {kickResult.passed} passed</span>
                    {kickResult.failed > 0 && (
                      <span className="text-red-600 font-semibold">❌ {kickResult.failed} failed</span>
                    )}
                    <span className="text-slate-500">{kickResult.total} total</span>
                    <span className="text-slate-500">⏱ {fmtDuration(kickResult.durationMs)}</span>
                    <span className="text-slate-400 capitalize">{kickResult.test_suite} suite</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Trigger Log table */}
          <div className="border border-slate-100 rounded-xl overflow-hidden">
            <button
              onClick={() => { setLogsExpanded(!logsExpanded); if (!logsExpanded) loadLogs(); }}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[11px] font-semibold text-slate-600">Trigger History</span>
                {logs.length > 0 && (
                  <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 rounded-full">{logs.length}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={e => { e.stopPropagation(); loadLogs(); }}
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className={`w-3 h-3 ${logsLoading ? 'animate-spin' : ''}`} />
                </button>
                {logsExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
              </div>
            </button>

            {logsExpanded && (
              <div className="overflow-x-auto">
                {logs.length === 0 ? (
                  <div className="px-4 py-6 text-center text-[11px] text-slate-400">
                    No trigger history yet. Run a kickstart or trigger via webhook to see logs here.
                  </div>
                ) : (
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Source</th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Suite</th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Branch</th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Result</th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Duration</th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">When</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {logs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Source */}
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              {SOURCE_ICONS[log.trigger_source] || SOURCE_ICONS.manual}
                              <span className="capitalize text-slate-600">{log.trigger_source}</span>
                              {log.trigger_event && log.trigger_event !== log.trigger_source && (
                                <span className="flex items-center gap-0.5 text-slate-400">
                                  {EVENT_ICONS[log.trigger_event]}
                                  <span className="text-[10px]">{log.trigger_event}</span>
                                </span>
                              )}
                            </div>
                          </td>
                          {/* Suite */}
                          <td className="px-3 py-2">
                            <span className="capitalize text-slate-600 font-medium">{log.test_suite || '—'}</span>
                          </td>
                          {/* Branch */}
                          <td className="px-3 py-2">
                            <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                              {log.branch || '—'}
                            </span>
                          </td>
                          {/* Status / counts */}
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-semibold ${STATUS_STYLES[log.status] || STATUS_STYLES.queued}`}>
                                {STATUS_ICONS[log.status]}
                                {log.status}
                              </span>
                              {(log.passed > 0 || log.failed > 0) && (
                                <span className="text-[10px] text-slate-500">
                                  {log.passed}✅ {log.failed > 0 ? `${log.failed}❌` : ''}
                                </span>
                              )}
                            </div>
                          </td>
                          {/* Duration */}
                          <td className="px-3 py-2 text-slate-400 font-mono">{fmtDuration(log.duration_ms)}</td>
                          {/* When */}
                          <td className="px-3 py-2 text-slate-400">{fmtRelTime(log.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── ② Auto-Trigger Policy ──────────────────────────────────────────── */}
      <div className="glass-card border border-slate-200 rounded-2xl overflow-hidden">
        {/* Header (collapsible) */}
        <button
          onClick={() => setPolicySection(!policySection)}
          className="w-full flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-amber-50 to-white border-b border-slate-100 hover:bg-amber-50/50 transition-colors"
        >
          <div className="p-2 rounded-xl bg-amber-500 text-white">
            <Zap className="w-4 h-4" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold text-slate-800">Auto-Trigger Policy</h3>
            <p className="text-[11px] text-slate-500">
              Define when {providerLabel} webhook events automatically kick off test execution
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              policy.trigger_mode === 'manual'
                ? 'bg-slate-100 text-slate-500'
                : policy.trigger_mode === 'auto'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-green-100 text-green-700'
            }`}>
              {policy.trigger_mode === 'manual' ? 'Manual Only' : policy.trigger_mode === 'auto' ? 'Auto Active' : 'Both Active'}
            </span>
            {policySection
              ? <ChevronUp   className="w-4 h-4 text-slate-400" />
              : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </button>

        {policySection && (
          <div className="p-5 space-y-6">

            {/* ── Trigger Mode ──────────────────────────────────────────────── */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Trigger Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {TRIGGER_MODES.map(m => (
                  <button
                    key={m.value}
                    onClick={() => policyChange('trigger_mode', m.value)}
                    className={`
                      flex flex-col gap-1.5 p-3 rounded-xl border text-left transition-all
                      ${policy.trigger_mode === m.value
                        ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-300'
                        : 'border-slate-200 bg-white hover:border-slate-300'}
                    `}
                  >
                    <div className={`flex items-center gap-1.5 text-[11px] font-bold ${
                      policy.trigger_mode === m.value ? 'text-amber-700' : 'text-slate-700'
                    }`}>
                      {m.icon}
                      {m.label}
                      {policy.trigger_mode === m.value && <Check className="w-3 h-3 ml-auto text-amber-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 leading-snug">{m.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Event Triggers (only visible when auto/both) ───────────── */}
            <div className={policy.trigger_mode === 'manual' ? 'opacity-40 pointer-events-none' : ''}>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Fire Execution On…
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'trigger_on_push'  as const, icon: <GitBranch    className="w-3.5 h-3.5" />, label: 'On Push',         desc: 'Every code push to watched branch' },
                  { key: 'trigger_on_pr'    as const, icon: <GitPullRequest className="w-3.5 h-3.5" />, label: 'On Pull Request', desc: 'When a PR is opened or updated' },
                  { key: 'trigger_on_merge' as const, icon: <GitMerge      className="w-3.5 h-3.5" />, label: 'On Merge',        desc: 'When a PR is merged or branch merged' },
                ].map(ev => (
                  <button
                    key={ev.key}
                    onClick={() => policyChange(ev.key, !policy[ev.key])}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all
                      ${policy[ev.key]
                        ? 'border-blue-400 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}
                    `}
                  >
                    {ev.icon}
                    <div>
                      <div className="text-[11px] font-semibold">{ev.label}</div>
                      <div className="text-[10px] text-slate-400">{ev.desc}</div>
                    </div>
                    <div className={`ml-auto w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      policy[ev.key] ? 'bg-blue-500 border-blue-500' : 'border-slate-300'
                    }`}>
                      {policy[ev.key] && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Watch Branches ────────────────────────────────────────────── */}
            <div className={policy.trigger_mode === 'manual' ? 'opacity-40 pointer-events-none' : ''}>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Watch Branches
                <span className="ml-1.5 text-[10px] font-normal text-slate-400 normal-case">(comma-separated, use * for all)</span>
              </label>
              <div className="relative">
                <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={policy.watch_branches}
                  onChange={e => policyChange('watch_branches', e.target.value)}
                  placeholder="main, develop, release/*"
                  className="w-full pl-9 pr-3 py-2 text-[12px] border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/50 font-mono"
                />
              </div>
              {/* Branch pills preview */}
              {policy.watch_branches && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {policy.watch_branches.split(',').map(b => b.trim()).filter(Boolean).map(b => (
                    <span key={b} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono border border-slate-200">
                      {b}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* ── Auto Test Suite ───────────────────────────────────────────── */}
            <div className={policy.trigger_mode === 'manual' ? 'opacity-40 pointer-events-none' : ''}>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Auto-Run Suite
              </label>
              <div className="flex flex-wrap gap-2">
                {SUITES.map(s => (
                  <button
                    key={s.value}
                    onClick={() => policyChange('test_suite', s.value)}
                    className={`
                      flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition-all
                      ${policy.test_suite === s.value
                        ? `${s.color} text-white border-transparent shadow-sm`
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}
                    `}
                  >
                    {s.label}
                    <span className={`text-[10px] font-normal ${policy.test_suite === s.value ? 'text-white/80' : 'text-slate-400'}`}>
                      {s.count}
                    </span>
                  </button>
                ))}
              </div>
              {policy.test_suite === 'custom' && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={policy.custom_test_pattern}
                    onChange={e => policyChange('custom_test_pattern', e.target.value)}
                    placeholder="e.g. **/*.smoke.spec.ts"
                    className="w-full px-3 py-2 text-[12px] border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/50 font-mono"
                  />
                </div>
              )}
            </div>

            {/* ── Notifications ─────────────────────────────────────────────── */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Notifications
              </label>
              <div className="space-y-2">
                {/* On Complete toggle */}
                <div
                  onClick={() => policyChange('notify_on_complete', !policy.notify_on_complete)}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {policy.notify_on_complete
                      ? <Bell    className="w-3.5 h-3.5 text-green-500" />
                      : <BellOff className="w-3.5 h-3.5 text-slate-400" />}
                    <div>
                      <p className="text-[11px] font-semibold text-slate-700">Notify on Complete</p>
                      <p className="text-[10px] text-slate-400">Send Slack message when all tests pass</p>
                    </div>
                  </div>
                  <div className={`w-9 h-5 rounded-full transition-colors flex items-center ${policy.notify_on_complete ? 'bg-green-500' : 'bg-slate-200'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5 ${policy.notify_on_complete ? 'translate-x-4' : ''}`} />
                  </div>
                </div>

                {/* On Fail toggle */}
                <div
                  onClick={() => policyChange('notify_on_fail', !policy.notify_on_fail)}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {policy.notify_on_fail
                      ? <Bell    className="w-3.5 h-3.5 text-red-500" />
                      : <BellOff className="w-3.5 h-3.5 text-slate-400" />}
                    <div>
                      <p className="text-[11px] font-semibold text-slate-700">Notify on Failure</p>
                      <p className="text-[10px] text-slate-400">Send Slack alert when any tests fail</p>
                    </div>
                  </div>
                  <div className={`w-9 h-5 rounded-full transition-colors flex items-center ${policy.notify_on_fail ? 'bg-red-500' : 'bg-slate-200'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5 ${policy.notify_on_fail ? 'translate-x-4' : ''}`} />
                  </div>
                </div>

                {/* Slack URL */}
                {(policy.notify_on_complete || policy.notify_on_fail) && (
                  <div>
                    <div
                      onClick={() => setShowSlack(!showSlack)}
                      className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-700 cursor-pointer mb-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {showSlack ? 'Hide' : 'Set'} Slack Incoming Webhook URL
                      {policy.notify_slack_url && <span className="text-green-500">✓ configured</span>}
                    </div>
                    {showSlack && (
                      <input
                        type="url"
                        value={policy.notify_slack_url}
                        onChange={e => policyChange('notify_slack_url', e.target.value)}
                        placeholder="https://hooks.slack.com/services/…"
                        className="w-full px-3 py-2 text-[12px] border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-green-400/50 font-mono"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Save Policy footer ────────────────────────────────────────── */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <Info className="w-3.5 h-3.5" />
                Policy applies to the currently active {providerLabel} config
              </div>
              <div className="flex items-center gap-2">
                {policyError && (
                  <span className="text-[11px] text-red-600 font-medium">{policyError}</span>
                )}
                {policySaved && (
                  <span className="flex items-center gap-1 text-[11px] text-green-600 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                  </span>
                )}
                <button
                  onClick={savePolicy}
                  disabled={!hasActiveConfig || policySaving}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold shadow-sm transition-all
                    ${!hasActiveConfig
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : policySaving
                        ? 'bg-amber-400 text-white cursor-wait'
                        : 'bg-amber-500 text-white hover:bg-amber-600 hover:shadow-md active:scale-95'}
                  `}
                >
                  {policySaving
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                    : <><Save className="w-3.5 h-3.5" /> Save Policy</>}
                </button>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* ── ③ Webhook Info card ───────────────────────────────────────────── */}
      <div className="glass-card p-4 border border-amber-100 bg-amber-50/40 rounded-2xl">
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-amber-100 mt-0.5">
            <Info className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-slate-700 mb-1">
              How Auto-Trigger Works
            </p>
            <ol className="text-[10px] text-slate-600 leading-relaxed space-y-0.5 list-decimal list-inside">
              <li>Your {providerLabel} sends webhook events to EdgeQI when you push, open a PR, or merge</li>
              <li>EdgeQI checks the Trigger Policy — mode, event type, branch filter</li>
              <li>If all conditions match, it fires the configured test suite immediately</li>
              <li>Results are logged in Trigger History and optionally sent to Slack</li>
            </ol>
            <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-white border border-amber-200 font-mono text-[10px] text-slate-600 flex items-center gap-2 overflow-hidden">
              <span className="text-amber-600 font-bold shrink-0">Webhook URL →</span>
              <span className="truncate text-slate-500">
                {typeof window !== 'undefined' ? window.location.origin : 'https://web-production-db4b5.up.railway.app'}/api/quality/cicd/webhook
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Add this URL as a webhook in your {providerLabel} repository settings.
              Set Content-Type to <code className="bg-white border border-slate-200 px-1 rounded">application/json</code>.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
