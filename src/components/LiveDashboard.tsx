import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity, CheckCircle2, AlertTriangle, Bug, TrendingUp, TrendingDown,
  FileText, Code2, Zap, Shield, BarChart2, RefreshCw, Clock, Target,
  Layers, Users, ArrowRight, ExternalLink, Circle, Play, AlertOctagon,
  Cpu, ChevronUp, ChevronDown, Loader2, Star, Award, Flame
} from 'lucide-react';

interface Props {
  currentProjectId: string;
  currentSprintId?: string;
  onNavigateTo?: (tab: string) => void;
}

const COLORS = {
  blue:   '#1e96df', navy: '#1f3965', green: '#27ae60', red: '#e74c3c',
  orange: '#e67e22', yellow: '#f1c40f', purple: '#8b5cf6', teal: '#14b8a6',
};

function Metric({ label, value, sub, color, icon: Icon, onClick, trend, badge }: any) {
  return (
    <div onClick={onClick}
      style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', border: '1px solid #dbe2ea', cursor: onClick ? 'pointer' : 'default', transition: 'all 0.15s', position: 'relative', overflow: 'hidden' }}
      onMouseEnter={e => { if (onClick) { (e.currentTarget as HTMLElement).style.borderColor = color || COLORS.blue; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px ${color || COLORS.blue}20`; }}}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#dbe2ea'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}>
      {/* background accent */}
      <div style={{ position: 'absolute', right: -10, top: -10, width: 60, height: 60, borderRadius: '50%', background: `${color || COLORS.blue}10` }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: '#6b82ab', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        {Icon && <Icon style={{ width: 18, height: 18, color: color || COLORS.blue }} />}
      </div>
      <div style={{ fontSize: 30, fontWeight: 900, color: color || COLORS.navy, lineHeight: 1, marginBottom: 4 }}>{value ?? '—'}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {trend !== undefined && (
          <span style={{ fontSize: 10, fontWeight: 700, color: trend >= 0 ? COLORS.green : COLORS.red, display: 'flex', alignItems: 'center', gap: 2 }}>
            {trend >= 0 ? <ChevronUp style={{ width: 12, height: 12 }} /> : <ChevronDown style={{ width: 12, height: 12 }} />}
            {Math.abs(trend)}%
          </span>
        )}
        {sub && <span style={{ fontSize: 11, color: '#a6b4cd' }}>{sub}</span>}
      </div>
      {badge && <div style={{ position: 'absolute', top: 10, right: 10, background: badge.color, color: '#fff', borderRadius: 20, padding: '2px 8px', fontSize: 9, fontWeight: 800 }}>{badge.text}</div>}
      {onClick && <div style={{ position: 'absolute', bottom: 12, right: 14, color: '#a6b4cd' }}><ArrowRight style={{ width: 12, height: 12 }} /></div>}
    </div>
  );
}

function SparkBar({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 32 }}>
      {values.map((v, i) => (
        <div key={i} style={{ flex: 1, background: i === values.length - 1 ? color : `${color}60`, borderRadius: '2px 2px 0 0', height: `${(v / max) * 100}%`, minHeight: 2 }} />
      ))}
    </div>
  );
}

function GaugeRing({ pct, color, size = 80, label }: { pct: number; color: string; size?: number; label: string }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={8} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.8s ease' }} />
        <text x={size/2} y={size/2+5} fill={color} fontSize={14} fontWeight={800} textAnchor="middle" style={{ transform: 'rotate(90deg)', transformOrigin: `${size/2}px ${size/2}px` }}>
          {pct}%
        </text>
      </svg>
      <span style={{ fontSize: 10, color: '#6b82ab', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
    </div>
  );
}

export default function LiveDashboard({ currentProjectId, currentSprintId, onNavigateTo }: Props) {
  const tok = () => localStorage.getItem('iq_token') || '';
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [persona, setPersona] = useState<'lead' | 'engineer' | 'director'>('lead');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const pid = currentProjectId && currentProjectId !== 'ALL' ? currentProjectId : '';
      const res = await fetch(`/api/quality/dashboard/live?project_id=${pid}`, { headers: { Authorization: `Bearer ${tok()}` } });
      if (res.ok) { const d = await res.json(); setData(d); setLastRefresh(new Date()); }
    } catch {}
    setLoading(false);
  }, [currentProjectId]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [autoRefresh, load]);

  const passRate = data?.execution?.avg_pass_rate ?? 0;
  const autoCoverage = data?.test_cases?.automation_coverage ?? 0;
  const defectRate = data?.test_cases?.total > 0
    ? Math.round((data?.defects?.open / Math.max(data?.test_cases?.total, 1)) * 100)
    : 0;
  const trendValues = (data?.execution?.trend || []).map((t: any) => t.pass_rate || 0);
  const defectTrend = (data?.defect_trend || []).map((t: any) => t.c || 0);
  const sprintName = data?.sprint?.name;

  // Health score (0-100)
  const healthScore = Math.round(
    (passRate * 0.4) + (autoCoverage * 0.3) + (Math.max(0, 100 - defectRate * 5) * 0.3)
  );
  const healthColor = healthScore >= 80 ? COLORS.green : healthScore >= 60 ? COLORS.orange : COLORS.red;
  const healthLabel = healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Needs Attention' : 'Critical';

  const navigate = (tab: string) => onNavigateTo?.(tab);

  return (
    <div style={{ padding: '0 0 48px', fontFamily: '"Lato", Arial, sans-serif' }}>

      {/* ─── Header ─── */}
      <div style={{ background: 'linear-gradient(135deg, #1f3965 0%, #1e3a8a 60%, #1e96df 100%)', borderRadius: 16, padding: '24px 28px', marginBottom: 24, color: '#fff', position: 'relative', overflow: 'hidden' }}>
        {/* Background pattern */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 80% 50%, rgba(30,150,223,0.3) 0%, transparent 50%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <Activity style={{ width: 22, height: 22 }} />
                <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Quality Dashboard</h2>
                {loading && <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite', opacity: 0.7 }} />}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, opacity: 0.8 }}>
                {sprintName && <span>📅 {sprintName}</span>}
                <span>🔄 {autoRefresh ? 'Live' : 'Manual'} · {lastRefresh.toLocaleTimeString()}</span>
                {currentProjectId !== 'ALL' && <span>📁 Project active</span>}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Persona switcher */}
              <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: 3, display: 'flex', gap: 2 }}>
                {([['lead', '🎯 Test Lead'], ['engineer', '⚙️ Engineer'], ['director', '📊 Director']] as const).map(([p, l]) => (
                  <button key={p} onClick={() => setPersona(p)}
                    style={{ padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                      background: persona === p ? '#fff' : 'transparent', color: persona === p ? '#1f3965' : 'rgba(255,255,255,0.8)' }}>
                    {l}
                  </button>
                ))}
              </div>
              <button onClick={() => setAutoRefresh(a => !a)}
                style={{ padding: '7px 14px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Activity style={{ width: 13, height: 13 }} /> {autoRefresh ? 'Live' : 'Paused'}
              </button>
              <button onClick={load}
                style={{ padding: '7px 14px', background: '#fff', color: '#1f3965', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <RefreshCw style={{ width: 13, height: 13 }} /> Refresh
              </button>
            </div>
          </div>

          {/* Health Score Banner */}
          {data && (
            <div style={{ marginTop: 20, background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: `${healthColor}20`, border: `3px solid ${healthColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: '#fff' }}>
                  {healthScore}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>Quality Health: {healthLabel}</div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>Pass rate · Automation coverage · Defect density</div>
                </div>
              </div>
              <div style={{ height: 32, width: 1, background: 'rgba(255,255,255,0.2)' }} />
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                {[
                  { label: 'Pass Rate', value: `${passRate}%`, ok: passRate >= 80 },
                  { label: 'Auto Coverage', value: `${autoCoverage}%`, ok: autoCoverage >= 60 },
                  { label: 'Open Defects', value: data.defects.open, ok: data.defects.open < 5 },
                  { label: 'Critical Bugs', value: data.defects.critical, ok: data.defects.critical === 0 },
                ].map(m => (
                  <div key={m.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: m.ok ? '#7effd5' : '#ffd580' }}>{m.value}</div>
                    <div style={{ fontSize: 10, opacity: 0.7 }}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {loading && !data && (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <Loader2 style={{ width: 32, height: 32, color: COLORS.blue, margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: '#6b82ab', fontSize: 13 }}>Loading live metrics…</p>
        </div>
      )}

      {data && (
        <>
          {/* ─── METRICS GRID ─── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 14, marginBottom: 24 }}>
            <Metric label="Requirements" value={data.requirements.total} sub="Defined" color={COLORS.navy} icon={FileText} onClick={() => navigate('requirements')} />
            <Metric label="Test Cases" value={data.test_cases.total} sub={`${data.test_cases.automated} automated`} color={COLORS.blue} icon={CheckCircle2} onClick={() => navigate('testcases')} />
            <Metric label="Automation %" value={`${autoCoverage}%`} sub="Coverage" color={autoCoverage >= 70 ? COLORS.green : COLORS.orange} icon={Cpu}
              badge={autoCoverage >= 80 ? { text: '✓ Good', color: COLORS.green } : autoCoverage < 40 ? { text: '↑ Low', color: COLORS.orange } : undefined} />
            <Metric label="Pass Rate" value={`${passRate}%`} sub={`${data.execution.runs_count} runs`} color={passRate >= 90 ? COLORS.green : passRate >= 70 ? COLORS.orange : COLORS.red} icon={Target}
              trend={trendValues.length >= 2 ? trendValues[trendValues.length-1] - trendValues[trendValues.length-2] : undefined} />
            <Metric label="Open Defects" value={data.defects.open} sub={`${data.defects.critical} critical`} color={data.defects.open === 0 ? COLORS.green : data.defects.critical > 0 ? COLORS.red : COLORS.orange} icon={Bug} onClick={() => navigate('defects')} />
            <Metric label="Scripts" value={data.scripts.total} sub="Automation scripts" color={COLORS.purple} icon={Code2} onClick={() => navigate('scripts')} />
          </div>

          {/* ─── PERSONA VIEWS ─── */}

          {/* TEST LEAD VIEW */}
          {persona === 'lead' && (
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
              {/* Pass Rate Trend */}
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #dbe2ea', padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h4 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: COLORS.navy }}>📈 Pass Rate Trend</h4>
                  <button onClick={() => navigate('execution')} style={{ fontSize: 11, color: COLORS.blue, background: '#eaf5fd', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 700 }}>
                    View Executions →
                  </button>
                </div>
                {trendValues.length > 0 ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100, marginBottom: 10 }}>
                      {data.execution.trend.map((t: any, i: number) => {
                        const max = Math.max(...data.execution.trend.map((x: any) => x.pass_rate || 0), 1);
                        const isLast = i === data.execution.trend.length - 1;
                        return (
                          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            <div style={{ width: '100%', background: isLast ? COLORS.blue : `${COLORS.blue}50`, borderRadius: '4px 4px 0 0', height: `${Math.max(4, ((t.pass_rate||0)/100)*90)}px`, position: 'relative' }}
                              title={`${t.label}: ${t.pass_rate}% pass rate`} />
                            <span style={{ fontSize: 9, color: '#a6b4cd', transform: 'rotate(-45deg)', transformOrigin: 'right', whiteSpace: 'nowrap' }}>{t.label?.slice(-6)}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#6b82ab' }}>
                      <span>Total tests: {data.execution.last_run?.total_tests ?? 0}</span>
                      <span style={{ color: COLORS.green }}>✓ Passed: {data.execution.last_run?.passed ?? 0}</span>
                      <span style={{ color: COLORS.red }}>✗ Failed: {data.execution.last_run?.failed ?? 0}</span>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '30px 0', textAlign: 'center' }}>
                    <Play style={{ width: 28, height: 28, color: '#dbe2ea', margin: '0 auto 8px' }} />
                    <p style={{ color: '#a6b4cd', fontSize: 13 }}>No execution runs yet. Run tests to see pass rate trend.</p>
                    <button onClick={() => navigate('execution')} style={{ marginTop: 8, fontSize: 12, background: COLORS.blue, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 700 }}>
                      Start Execution →
                    </button>
                  </div>
                )}
              </div>

              {/* Coverage Gauges */}
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #dbe2ea', padding: '20px 24px' }}>
                <h4 style={{ margin: '0 0 20px', fontSize: 13, fontWeight: 800, color: COLORS.navy }}>🎯 Coverage</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
                  <GaugeRing pct={autoCoverage} color={autoCoverage >= 70 ? COLORS.green : COLORS.orange} label="Automated" />
                  <GaugeRing pct={passRate} color={passRate >= 80 ? COLORS.green : passRate >= 60 ? COLORS.orange : COLORS.red} label="Pass Rate" />
                </div>
              </div>
            </div>
          )}

          {/* ENGINEER VIEW */}
          {persona === 'engineer' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              {/* Last Run Details */}
              {data.execution.last_run ? (
                <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #dbe2ea', padding: '20px 24px' }}>
                  <h4 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 800, color: COLORS.navy }}>⚡ Latest Test Run</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { l: 'Run ID', v: data.execution.last_run.run_label || data.execution.last_run.id?.slice(-8) },
                      { l: 'Pass Rate', v: `${data.execution.last_run.pass_rate || 0}%` },
                      { l: 'Total Tests', v: data.execution.last_run.total_tests },
                      { l: 'Passed', v: data.execution.last_run.passed, color: COLORS.green },
                      { l: 'Failed', v: data.execution.last_run.failed, color: COLORS.red },
                      { l: 'Healed', v: data.execution.last_run.healed || 0, color: COLORS.blue },
                      { l: 'Environment', v: data.execution.last_run.environment },
                      { l: 'Branch', v: data.execution.last_run.branch },
                    ].map(f => (
                      <div key={f.l} style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 12px' }}>
                        <div style={{ fontSize: 9, color: '#a6b4cd', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>{f.l}</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: (f as any).color || COLORS.navy }}>{f.v ?? '—'}</div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => navigate('execution')} style={{ marginTop: 12, width: '100%', padding: '8px', background: '#f0f7ff', color: COLORS.blue, border: '1px solid #bee3f8', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    View Full Execution Report →
                  </button>
                </div>
              ) : (
                <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #dbe2ea', padding: '40px 24px', textAlign: 'center' }}>
                  <Play style={{ width: 32, height: 32, color: '#dbe2ea', margin: '0 auto 12px' }} />
                  <p style={{ color: '#a6b4cd', fontSize: 13 }}>No runs yet</p>
                  <button onClick={() => navigate('execution')} style={{ marginTop: 8, fontSize: 12, background: COLORS.blue, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 700 }}>
                    Run Tests →
                  </button>
                </div>
              )}

              {/* Open Defects by Severity */}
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #dbe2ea', padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h4 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: COLORS.navy }}>🐛 Open Defects</h4>
                  <button onClick={() => navigate('defects')} style={{ fontSize: 11, color: COLORS.blue, background: '#eaf5fd', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 700 }}>Manage →</button>
                </div>
                {[
                  { sev: 'Critical', count: data.defects.critical, color: COLORS.red },
                  { sev: 'High',     count: data.defects.high,     color: COLORS.orange },
                  { sev: 'Open Total', count: data.defects.open,   color: COLORS.navy },
                ].map(s => (
                  <div key={s.sev} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12, color: COLORS.navy, fontWeight: 600 }}>{s.sev}</span>
                    <div style={{ flex: 2, background: '#f1f5f9', borderRadius: 4, height: 8 }}>
                      <div style={{ background: s.color, height: 8, borderRadius: 4, width: `${Math.min(100, (s.count / Math.max(data.defects.total, 1)) * 100 * 3)}%`, transition: 'width 0.5s ease' }} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: s.color, minWidth: 24, textAlign: 'right' }}>{s.count}</span>
                  </div>
                ))}
                {data.defects.open === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: COLORS.green }}>
                    <CheckCircle2 style={{ width: 28, height: 28, margin: '0 auto 8px' }} />
                    <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>No open defects!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DIRECTOR VIEW */}
          {persona === 'director' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
              {/* Quality KPIs */}
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #dbe2ea', padding: '20px 24px' }}>
                <h4 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 800, color: COLORS.navy }}>🏆 Quality KPIs</h4>
                {[
                  { label: 'Release Readiness', value: passRate >= 90 && data.defects.critical === 0 ? '✅ Ready' : '⚠️ Not Ready', color: passRate >= 90 && data.defects.critical === 0 ? COLORS.green : COLORS.orange },
                  { label: 'Test Coverage', value: `${autoCoverage}%`, color: autoCoverage >= 70 ? COLORS.green : COLORS.orange },
                  { label: 'Defect Escape Rate', value: `${defectRate}%`, color: defectRate < 5 ? COLORS.green : COLORS.red },
                  { label: 'Requirements Covered', value: `${data.requirements.total} REQs`, color: COLORS.navy },
                  { label: 'Total Test Assets', value: data.test_cases.total, color: COLORS.blue },
                ].map(k => (
                  <div key={k.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: 12, color: '#6b82ab' }}>{k.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: k.color }}>{k.value}</span>
                  </div>
                ))}
              </div>

              {/* Defect Trend */}
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #dbe2ea', padding: '20px 24px' }}>
                <h4 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 800, color: COLORS.navy }}>📉 Defect Trend (14d)</h4>
                {defectTrend.length > 0 ? (
                  <>
                    <SparkBar values={defectTrend} color={COLORS.red} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: '#a6b4cd' }}>
                      <span>14 days ago</span><span>Today</span>
                    </div>
                    <div style={{ marginTop: 12, fontSize: 12, color: '#6b82ab' }}>
                      Avg defects/day: <strong style={{ color: COLORS.navy }}>{(defectTrend.reduce((a, b) => a + b, 0) / Math.max(defectTrend.length, 1)).toFixed(1)}</strong>
                    </div>
                  </>
                ) : <p style={{ color: '#a6b4cd', fontSize: 12 }}>No defect trend data yet</p>}
              </div>

              {/* Sprint Status */}
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #dbe2ea', padding: '20px 24px' }}>
                <h4 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 800, color: COLORS.navy }}>🏃 Sprint Status</h4>
                {data.sprint ? (
                  <>
                    <div style={{ fontSize: 15, fontWeight: 800, color: COLORS.navy, marginBottom: 8 }}>{data.sprint.name}</div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {[
                        { l: 'Status', v: data.sprint.status, c: data.sprint.status === 'active' ? COLORS.green : COLORS.orange },
                        { l: 'Velocity', v: `${data.sprint.velocity || 0}%`, c: COLORS.blue },
                      ].map(f => (
                        <div key={f.l} style={{ flex: 1, background: '#f8fafc', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                          <div style={{ fontSize: 16, fontWeight: 800, color: f.c }}>{f.v}</div>
                          <div style={{ fontSize: 9, color: '#a6b4cd', textTransform: 'uppercase', fontWeight: 700 }}>{f.l}</div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <p style={{ color: '#a6b4cd', fontSize: 12 }}>No active sprint</p>
                    <button onClick={() => navigate('projects')} style={{ fontSize: 12, color: COLORS.blue, background: '#eaf5fd', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontWeight: 700 }}>
                      Create Sprint →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── WORKFLOW STATUS ROW ─── */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #dbe2ea', padding: '20px 24px', marginBottom: 16 }}>
            <h4 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 800, color: COLORS.navy }}>🔄 STLC Progress</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto' }}>
              {[
                { label: 'Requirements', count: data.requirements.total, tab: 'requirements', icon: '📋', done: data.requirements.total > 0 },
                { label: 'Test Cases', count: data.test_cases.total, tab: 'testcases', icon: '✅', done: data.test_cases.total > 0 },
                { label: 'Test Scripts', count: data.scripts.total, tab: 'scripts', icon: '⚙️', done: data.scripts.total > 0 },
                { label: 'Execution', count: data.execution.runs_count, tab: 'execution', icon: '▶️', done: data.execution.runs_count > 0 },
                { label: 'Defects', count: data.defects.total, tab: 'defects', icon: '🐛', done: true },
              ].map((step, i, arr) => (
                <React.Fragment key={step.label}>
                  <div onClick={() => navigate(step.tab)}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '8px 16px', cursor: 'pointer', flexShrink: 0, minWidth: 100 }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                      background: step.done ? (step.count > 0 ? COLORS.blue : '#f1f5f9') : '#f1f5f9',
                      border: `2px solid ${step.done && step.count > 0 ? COLORS.blue : '#dbe2ea'}`,
                      boxShadow: step.done && step.count > 0 ? `0 0 0 4px ${COLORS.blue}20` : 'none' }}>
                      {step.icon}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: step.count > 0 ? COLORS.navy : '#a6b4cd' }}>{step.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 900, color: step.count > 0 ? COLORS.blue : '#a6b4cd' }}>{step.count}</div>
                    </div>
                  </div>
                  {i < arr.length - 1 && (
                    <div style={{ flex: 1, height: 2, background: arr[i].count > 0 && arr[i+1].count > 0 ? COLORS.blue : '#dbe2ea', minWidth: 20, alignSelf: 'flex-start', marginTop: 28 }} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* ─── QUICK ACTIONS ─── */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #dbe2ea', padding: '20px 24px' }}>
            <h4 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 800, color: COLORS.navy }}>⚡ Quick Actions</h4>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                { label: 'Add Requirements', tab: 'requirements', icon: '📋', color: COLORS.navy },
                { label: 'Generate Test Cases', tab: 'testcases', icon: '🤖', color: COLORS.blue },
                { label: 'Run Tests', tab: 'execution', icon: '▶️', color: COLORS.green },
                { label: 'Analyze Failures', tab: 'defects', icon: '🔍', color: COLORS.orange },
                { label: 'View Traceability', tab: 'traceability', icon: '🔗', color: COLORS.purple },
                { label: 'Security Scan', tab: 'security', icon: '🛡️', color: COLORS.teal },
              ].map(a => (
                <button key={a.label} onClick={() => navigate(a.tab)}
                  style={{ padding: '9px 16px', background: '#f8fafc', border: `1px solid #dbe2ea`, borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: COLORS.navy, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${a.color}15`; (e.currentTarget as HTMLElement).style.borderColor = a.color; (e.currentTarget as HTMLElement).style.color = a.color; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#f8fafc'; (e.currentTarget as HTMLElement).style.borderColor = '#dbe2ea'; (e.currentTarget as HTMLElement).style.color = COLORS.navy; }}>
                  <span>{a.icon}</span> {a.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
