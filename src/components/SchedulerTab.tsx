import React, { useState, useEffect } from 'react';
import { Clock, Plus, Play, Pause, Trash2, RefreshCw, CheckCircle, XCircle, AlertCircle, Calendar, Settings2, Bell, X } from 'lucide-react';

interface Schedule {
  id: string;
  name: string;
  cron: string;
  testCaseIds: string[];
  framework: string;
  browser: string;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  lastStatus?: 'success' | 'failed' | 'running';
  createdAt: string;
}

const CRON_PRESETS = [
  { label: 'Every 15 min', value: 'every_15m' },
  { label: 'Every 30 min', value: 'every_30m' },
  { label: 'Every hour', value: '@hourly' },
  { label: 'Every 2 hours', value: 'every_2h' },
  { label: 'Every 6 hours', value: 'every_6h' },
  { label: 'Daily (midnight)', value: '@daily' },
];

export default function SchedulerTab() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState<'success' | 'error'>('success');

  // REQ-54: Notification modal state
  const [showNotifModal, setShowNotifModal] = useState<string | null>(null);
  const [notifWebhook, setNotifWebhook] = useState('');
  const [notifEmail, setNotifEmail] = useState('');
  const [notifOnSuccess, setNotifOnSuccess] = useState(true);
  const [notifOnFailure, setNotifOnFailure] = useState(true);
  const [notifSaving, setNotifSaving] = useState(false);

  // New schedule form state — uses 'cron' field (matches server API)
  const [formName, setFormName] = useState('');
  const [formCron, setFormCron] = useState('@hourly');
  const [formFramework, setFormFramework] = useState('Playwright');
  const [formBrowser, setFormBrowser] = useState('Chromium');
  const [formEnabled, setFormEnabled] = useState(true);
  const [formSaving, setFormSaving] = useState(false);

  const showMsg = (msg: string, type: 'success' | 'error' = 'success') => {
    setFeedback(msg);
    setFeedbackType(type);
    setTimeout(() => setFeedback(''), 4000);
  };

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/quality/schedules');
      const data = await res.json();
      setSchedules(data.schedules || []);
    } catch (e: any) {
      showMsg(`Failed to load schedules: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSchedules(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCron.trim()) return;
    setFormSaving(true);
    try {
      const res = await fetch('/api/quality/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          cron: formCron,
          testCaseIds: [],
          framework: formFramework,
          browser: formBrowser,
          enabled: formEnabled
        })
      });
      const data = await res.json();
      if (data.schedule) {
        setSchedules(prev => [data.schedule, ...prev]);
        setShowCreateForm(false);
        setFormName('');
        setFormCron('@hourly');
        showMsg(`Schedule "${data.schedule.name}" created successfully!`);
      } else {
        throw new Error(data.error || 'Create failed');
      }
    } catch (e: any) {
      showMsg(`Failed to create: ${e.message}`, 'error');
    } finally {
      setFormSaving(false);
    }
  };

  const toggleSchedule = async (s: Schedule) => {
    try {
      const res = await fetch(`/api/quality/schedules/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !s.enabled })
      });
      const data = await res.json();
      if (data.schedule) {
        setSchedules(prev => prev.map(sc => sc.id === s.id ? data.schedule : sc));
        showMsg(`Schedule "${s.name}" ${!s.enabled ? 'enabled' : 'paused'}.`);
      }
    } catch (e: any) {
      showMsg(`Toggle failed: ${e.message}`, 'error');
    }
  };

  const deleteSchedule = async (s: Schedule) => {
    if (!confirm(`Delete schedule "${s.name}"?`)) return;
    try {
      const res = await fetch(`/api/quality/schedules/${s.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setSchedules(prev => prev.filter(sc => sc.id !== s.id));
        showMsg(`Schedule "${s.name}" deleted.`);
      }
    } catch (e: any) {
      showMsg(`Delete failed: ${e.message}`, 'error');
    }
  };

  // REQ-54: Save notification config
  const saveNotification = async (scheduleId: string) => {
    setNotifSaving(true);
    try {
      const res = await fetch(`/api/quality/schedules/${scheduleId}/notifications`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: notifWebhook, emailTo: notifEmail, onSuccess: notifOnSuccess, onFailure: notifOnFailure }),
      });
      const data = await res.json();
      if (data.success) {
        showMsg('Notification settings saved.');
        setShowNotifModal(null);
      }
    } catch (e: any) { showMsg(`Failed: ${e.message}`, 'error'); }
    finally { setNotifSaving(false); }
  };

  const statusIcon = (status?: string) => {
    if (status === 'success') return <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />;
    if (status === 'failed') return <XCircle className="w-3.5 h-3.5 text-red-500" />;
    if (status === 'running') return <RefreshCw className="w-3.5 h-3.5 text-indigo-500 animate-spin" />;
    return <AlertCircle className="w-3.5 h-3.5 text-slate-400" />;
  };

  const cronLabel = (expr: string) => {
    const preset = CRON_PRESETS.find(p => p.value === expr);
    return preset ? preset.label : expr;
  };

  return (
    <div className="space-y-6">

      {/* REQ-54: Notification modal */}
      {showNotifModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-600" /> Completion Notifications
              </h3>
              <button onClick={() => setShowNotifModal(null)}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-xs text-slate-500">Configure notifications for schedule: <span className="font-mono font-bold">{schedules.find(s => s.id === showNotifModal)?.name}</span></p>
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Webhook URL (POST on completion)</label>
                <input type="text" placeholder="https://hooks.slack.com/services/..." value={notifWebhook}
                  onChange={e => setNotifWebhook(e.target.value)} aria-label="Notification webhook URL"
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono" />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Email To</label>
                <input type="email" placeholder="qa-team@company.com" value={notifEmail}
                  onChange={e => setNotifEmail(e.target.value)} aria-label="Notification email"
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={notifOnSuccess} onChange={e => setNotifOnSuccess(e.target.checked)} aria-label="Notify on success" className="rounded text-indigo-600" />
                  Notify on success
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={notifOnFailure} onChange={e => setNotifOnFailure(e.target.checked)} aria-label="Notify on failure" className="rounded text-indigo-600" />
                  Notify on failure
                </label>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowNotifModal(null)} className="px-4 py-2 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</button>
                <button
                  onClick={() => saveNotification(showNotifModal!)}
                  disabled={notifSaving}
                  aria-label="Save notification settings"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {notifSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />} Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingBottom:20,marginBottom:4,borderBottom:'1px solid #dbe2ea'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:40,height:40,borderRadius:10,background:'linear-gradient(135deg,#093158 0%,#1e96df 100%)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <Clock style={{width:20,height:20,color:'#ffffff'}} />
          </div>
          <div>
            <h1 style={{fontFamily:'"Lato",Arial,sans-serif',fontSize:20,fontWeight:700,color:'#1f3965',lineHeight:1,margin:0}}>Test Scheduler</h1>
            <p style={{fontFamily:'"Lato",Arial,sans-serif',fontSize:13,color:'#6b82ab',margin:'3px 0 0'}}>Schedule and automate suite runs</p>
          </div>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div className={`p-3 rounded-xl border text-sm font-mono animate-fade-in ${
          feedbackType === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {feedback}
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Schedule
          </button>
          <button
            onClick={loadSchedules}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        <span className="text-xs font-mono text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1 rounded-lg">
          {schedules.length} schedule{schedules.length !== 1 ? 's' : ''} total
        </span>
      </div>

      {/* Create Schedule Form */}
      {showCreateForm && (
        <div className="bg-white border border-indigo-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Plus className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Create New Schedule</h3>
          </div>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Schedule Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. Nightly Smoke Tests"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Cron Expression *</label>
                <div className="flex gap-2">
                  <select
                    value={formCron}
                    onChange={e => setFormCron(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none"
                  >
                    {CRON_PRESETS.map(p => (
                      <option key={p.value} value={p.value}>{p.label} ({p.value})</option>
                    ))}
                    <option value="custom">Custom...</option>
                  </select>
                </div>
                {formCron === 'custom' && (
                  <input
                    type="text"
                    placeholder="e.g. every_45m"
                    onChange={e => setFormCron(e.target.value)}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none font-mono"
                  />
                )}
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Framework</label>
                <select
                  value={formFramework}
                  onChange={e => setFormFramework(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800"
                >
                  <option>Playwright</option>
                  <option>Selenium</option>
                  <option>Cypress</option>
                  <option>Robot</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Browser</label>
                <select
                  value={formBrowser}
                  onChange={e => setFormBrowser(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800"
                >
                  <option>Chromium</option>
                  <option>Firefox</option>
                  <option>WebKit</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formEnabled}
                  onChange={e => setFormEnabled(e.target.checked)}
                  className="rounded accent-indigo-600"
                />
                Enable immediately after creation
              </label>
            </div>
            <div className="flex gap-2 justify-end border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 font-mono text-xs rounded-xl font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formSaving}
                className="px-5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-xs rounded-xl font-bold transition-all disabled:opacity-60 flex items-center gap-1.5"
              >
                {formSaving ? <><RefreshCw className="w-3 h-3 animate-spin" /> Saving...</> : 'Create Schedule'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Schedules List */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
          <p className="text-xs font-mono text-slate-500">Loading schedules...</p>
        </div>
      ) : schedules.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center space-y-3">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No Schedules Configured</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Click "New Schedule" to set up recurring automated test suite runs.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map(s => (
            <div
              key={s.id}
              className={`bg-white border rounded-2xl p-5 shadow-sm transition-all ${
                s.enabled ? 'border-slate-200 hover:border-indigo-200' : 'border-slate-200 opacity-70'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`w-2 h-2 rounded-full ${s.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                    <h4 className="text-sm font-bold text-slate-900">{s.name}</h4>
                    <span className="text-[10px] font-mono bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                      {cronLabel(s.cron)}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      s.enabled
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-slate-100 border-slate-200 text-slate-500'
                    }`}>
                      {s.enabled ? 'ACTIVE' : 'PAUSED'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-slate-500">
                    <span className="flex items-center gap-1">
                      <Settings2 className="w-3 h-3" />
                      {s.framework} / {s.browser}
                    </span>
                    {s.lastRun && (
                      <span className="flex items-center gap-1">
                        {statusIcon(s.lastStatus)}
                        Last: {new Date(s.lastRun).toLocaleString()}
                      </span>
                    )}
                    {s.nextRun && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-indigo-400" />
                        Next: {new Date(s.nextRun).toLocaleString()}
                      </span>
                    )}
                    <span className="text-slate-400">
                      Created: {new Date(s.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleSchedule(s)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all ${
                      s.enabled
                        ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                    }`}
                    title={s.enabled ? 'Pause schedule' : 'Enable schedule'}
                  >
                    {s.enabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {s.enabled ? 'Pause' : 'Enable'}
                  </button>
                  {/* REQ-54: Notification config button */}
                  <button
                    onClick={() => { setShowNotifModal(s.id); setNotifWebhook(''); setNotifEmail(''); setNotifOnSuccess(true); setNotifOnFailure(true); }}
                    className="p-1.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-500 hover:bg-indigo-100 transition-all"
                    title="Configure completion notifications" aria-label={`Configure notifications for ${s.name}`}
                  >
                    <Bell className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteSchedule(s)}
                    className="p-1.5 rounded-xl border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 transition-all"
                    title="Delete schedule" aria-label={`Delete schedule ${s.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info card */}
      <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 text-[11px] text-indigo-900 leading-relaxed flex items-start gap-3">
        <Clock className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <strong>Scheduler Mechanics (REQ-51):</strong> Schedules are stored in an in-memory Map with a 60-second tick.
          Supported cron expressions: <code className="bg-indigo-100 px-1 rounded font-mono">@hourly</code>,{' '}
          <code className="bg-indigo-100 px-1 rounded font-mono">@daily</code>,{' '}
          <code className="bg-indigo-100 px-1 rounded font-mono">every_15m</code>,{' '}
          <code className="bg-indigo-100 px-1 rounded font-mono">every_2h</code>.
          On each tick, enabled schedules are checked against their last-run timestamp and fired if due.
          Note: In-memory only — schedules reset on server restart.
        </div>
      </div>
    </div>
  );
}
