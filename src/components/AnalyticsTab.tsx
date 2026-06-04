import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Cpu, Clock, DollarSign, RefreshCw, Zap, AlertCircle, CheckCircle } from 'lucide-react';
import { apiUrl } from '@/src/config/api';

interface TrendEntry {
  date: string;
  calls: number;
  avgLatency: number;
  cost: number;
}

interface EntityEntry {
  entity: string;
  count: number;
}

interface ServerAnalytics {
  summary: {
    totalCalls: number;
    avgLatency: number;
    totalCost: number;
    days: number;
  };
  trend: TrendEntry[];
  byEntity: EntityEntry[];
}

// Simple bar chart renderer using divs
function BarChart({
  data,
  valueKey,
  labelKey,
  color = 'bg-indigo-500',
  label,
  formatter = (v: number) => v.toString()
}: {
  data: any[];
  valueKey: string;
  labelKey: string;
  color?: string;
  label: string;
  formatter?: (v: number) => string;
}) {
  const max = Math.max(...data.map(d => d[valueKey] || 0), 1);
  return (
    <div className="space-y-2">
      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">{label}</span>
      <div className="space-y-1.5">
        {data.map((d, i) => {
          const pct = ((d[valueKey] || 0) / max) * 100;
          return (
            <div key={i} className="flex items-center gap-2 text-[11px] font-mono">
              <span className="w-14 text-slate-500 text-right shrink-0 truncate">{d[labelKey]}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                <div
                  className={`h-full ${color} rounded-full transition-all duration-500`}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>
              <span className="w-20 text-slate-700 font-bold shrink-0 text-right">{formatter(d[valueKey] || 0)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AnalyticsTab() {
  const [data, setData] = useState<ServerAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = async (d: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(apiUrl(`/api/quality/analytics/ai-usage?days=${d}`));
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(days); }, [days]);

  const formatCost = (v: number) => `$${v.toFixed(4)}`;
  const formatMs = (v: number) => `${Math.round(v)}ms`;
  const formatK = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toString());

  // Sort trend oldest-first, keep last N days
  const dailyData = (data?.trend || [])
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({
      ...d,
      label: (() => {
        const dt = new Date(d.date);
        return `${dt.getMonth() + 1}/${dt.getDate()}`;
      })()
    }));

  // Top-10 entities for provider breakdown
  const entityData = (data?.byEntity || []).slice(0, 8);
  const maxEntity = Math.max(...entityData.map(e => e.count), 1);

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingBottom:20,marginBottom:4,borderBottom:'1px solid #E2E8F0'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:40,height:40,borderRadius:10,background:'linear-gradient(135deg,#0F172A 0%,#5B6CFF 100%)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <BarChart3 style={{width:20,height:20,color:'#ffffff'}} />
          </div>
          <div>
            <h1 style={{fontFamily:'"Inter",Arial,sans-serif',fontSize:20,fontWeight:700,color:'#0F172A',lineHeight:1,margin:0}}>AI Analytics</h1>
            <p style={{fontFamily:'"Inter",Arial,sans-serif',fontSize:13,color:'#475569',margin:'3px 0 0'}}>Token usage, cost and latency trends</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-600 font-bold">Time Range:</span>
          {[7, 14, 30].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 text-xs font-mono rounded-lg border transition-all ${
                days === d
                  ? 'bg-violet-600 text-white border-violet-600 font-bold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-[10px] font-mono text-slate-400">
              Refreshed: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => load(days)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-xs text-red-800">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !data && (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-violet-400 animate-spin mx-auto" />
          <p className="text-xs font-mono text-slate-500">Loading analytics data...</p>
        </div>
      )}

      {/* Data loaded */}
      {data && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total AI Calls', value: data.summary.totalCalls.toLocaleString(), icon: Zap, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' },
              { label: `Avg Latency`, value: formatMs(data.summary.avgLatency), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
              { label: 'Est. Total Cost', value: formatCost(data.summary.totalCost), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
              { label: 'Active Period', value: `${data.summary.days} days`, icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
            ].map(card => {
              const Icon = card.icon;
              return (
                <div key={card.label} className={`bg-white border ${card.border} rounded-2xl p-4 space-y-2`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">{card.label}</span>
                    <div className={`p-1.5 ${card.bg} rounded-lg`}>
                      <Icon className={`w-3.5 h-3.5 ${card.color}`} />
                    </div>
                  </div>
                  <p className="text-xl font-extrabold font-mono text-slate-900">{card.value}</p>
                  <p className="text-[10px] text-slate-400 font-mono">from audit_logs</p>
                </div>
              );
            })}
          </div>

          {/* Two-column: entity breakdown + daily calls */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Top entities (agent/provider breakdown) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Cpu className="w-4 h-4 text-violet-500" />
                <h3 className="font-bold text-slate-900 text-sm">Top Agent / Provider Activities</h3>
              </div>
              {entityData.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs font-mono">No activity data for this period</div>
              ) : (
                <div className="space-y-2">
                  {entityData.map(e => {
                    const pct = (e.count / maxEntity) * 100;
                    return (
                      <div key={e.entity} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-slate-700 font-bold truncate max-w-[60%]">{e.entity}</span>
                          <span className="text-indigo-700 font-bold">{e.count} calls</span>
                        </div>
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-violet-400 rounded-full transition-all duration-700"
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Daily calls chart */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
                <h3 className="font-bold text-slate-900 text-sm">Daily Call Volume</h3>
              </div>
              {dailyData.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs font-mono">No daily data for this period</div>
              ) : (
                <BarChart
                  data={dailyData}
                  valueKey="calls"
                  labelKey="label"
                  color="bg-indigo-400"
                  label="API Calls per Day"
                  formatter={v => v.toString()}
                />
              )}
            </div>
          </div>

          {/* Daily cost + latency charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                <h3 className="font-bold text-slate-900 text-sm">Daily Estimated Cost ($)</h3>
              </div>
              {dailyData.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs font-mono">No cost data</div>
              ) : (
                <BarChart
                  data={dailyData}
                  valueKey="cost"
                  labelKey="label"
                  color="bg-emerald-400"
                  label="Cost per Day"
                  formatter={formatCost}
                />
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Clock className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-slate-900 text-sm">Daily Avg Latency (ms)</h3>
              </div>
              {dailyData.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs font-mono">No latency data</div>
              ) : (
                <BarChart
                  data={dailyData}
                  valueKey="avgLatency"
                  labelKey="label"
                  color="bg-amber-400"
                  label="Avg Latency per Day"
                  formatter={formatMs}
                />
              )}
            </div>
          </div>

          {/* Trend table */}
          {dailyData.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-slate-500" />
                <h3 className="font-bold text-slate-900 text-sm">Daily Usage Detail</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 text-[10px] text-slate-400 uppercase font-bold">
                      <th className="p-3 text-left">Date</th>
                      <th className="p-3 text-right">AI Calls</th>
                      <th className="p-3 text-right">Avg Latency</th>
                      <th className="p-3 text-right">Est. Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dailyData.slice().reverse().map((d, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-slate-600">{d.date}</td>
                        <td className="p-3 text-right text-indigo-700 font-bold">{d.calls}</td>
                        <td className="p-3 text-right text-amber-700">{formatMs(d.avgLatency)}</td>
                        <td className="p-3 text-right text-emerald-700 font-bold">{formatCost(d.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Zero state */}
          {data.summary.totalCalls === 0 && (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-10 text-center space-y-3">
              <CheckCircle className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-600">No AI Activity Recorded Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                AI analytics aggregate from the <code className="bg-slate-200 px-1 rounded">audit_logs</code> table.
                Generate requirements, run tests, or use the chatbot to produce usage data.
              </p>
            </div>
          )}
        </>
      )}

      {/* Info footer */}
      <div className="bg-violet-50/50 border border-violet-100 rounded-2xl p-4 text-[11px] text-violet-900 leading-relaxed flex items-start gap-3">
        <BarChart3 className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
        <div>
          <strong>Analytics Source (REQ-99/100):</strong> Data is aggregated directly from the{' '}
          <code className="bg-violet-100 px-1 rounded font-mono">audit_logs</code> SQLite table,
          grouping records by day. Cost estimates use the <code className="bg-violet-100 px-1 rounded font-mono">cost_estimate</code> column
          logged during requirement analysis, test generation, script compilation, and chatbot interactions.
          The "Top Activities" panel shows which agent/provider generated the most API calls.
        </div>
      </div>
    </div>
  );
}
