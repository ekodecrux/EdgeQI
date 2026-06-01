import { useState } from 'react';
import { AreaChart, TrendingUp, Cpu, Server, Play, ShieldAlert, CheckCircle2, Sliders, HelpCircle } from 'lucide-react';
import { PerformanceConfig } from '../types';

interface PerformanceProps {
  configs: PerformanceConfig[];
  onExecutePerformanceTest: (
    testType: 'Browser' | 'API',
    endpointOrJourney: string,
    virtualUsers: number,
    durationSeconds: number,
    rampUpTimeSeconds: number,
    rpsLimit?: number
  ) => Promise<void>;
  isExecuting: boolean;
}

export default function PerformanceTab({
  configs,
  onExecutePerformanceTest,
  isExecuting,
}: PerformanceProps) {
  const [testType, setTestType] = useState<'Browser' | 'API'>('API');
  const [endpointOrJourney, setEndpointOrJourney] = useState('POST /api/v1/checkout/charge');
  const [virtualUsers, setVirtualUsers] = useState(250);
  const [durationSeconds, setDurationSeconds] = useState(60);
  const [rampUpTimeSeconds, setRampUpTimeSeconds] = useState(10);
  const [rpsLimit, setRpsLimit] = useState(100);

  const activeMetric = configs[0] || {
    testType: 'API',
    endpointOrJourney: 'POST /api/v1/checkout/charge',
    virtualUsers: 250,
    durationSeconds: 60,
    rampUpTimeSeconds: 10,
    metrics: {
      avgResponseTimeMs: 142,
      p90Ms: 230,
      p95Ms: 298,
      p99Ms: 460,
      throughputTps: 84.5,
      errorRate: 0.12,
      cpuUtilization: 42,
      memoryUtilization: 68,
    },
    aiRecommendations: [
      "Database pool size limit reached during checkout transactions. Increase pg connection count to 150.",
      "Add Redis cache index on Stripe country lookup metadata to shave 30ms from transit time."
    ]
  };

  const handleRun = async () => {
    await onExecutePerformanceTest(testType, endpointOrJourney, virtualUsers, durationSeconds, rampUpTimeSeconds, rpsLimit);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Configure stress sliders panel */}
      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-sm">
        <div>
          <h3 className="font-sans font-semibold text-lg text-slate-900 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-purple-600" />
            Load Generator Parameters
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Design virtual user journeys and simulate intensive stress loops to identify bottleneck parameters.
          </p>
        </div>

        <div className="space-y-4">
          {/* Stress mode type toggle */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1.5">Load Target Method</label>
            <div className="flex gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => { setTestType('API'); setEndpointOrJourney('POST /api/v1/checkout/charge'); }}
                className={`flex-1 py-1.5 rounded-md text-xs font-mono font-medium transition-all ${
                  testType === 'API' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-505 hover:text-slate-800'
                }`}
              >
                REST API Endpoint
              </button>
              <button
                type="button"
                onClick={() => { setTestType('Browser'); setEndpointOrJourney('Checkout billing flow recording'); }}
                className={`flex-1 py-1.5 rounded-md text-xs font-mono font-medium transition-all ${
                  testType === 'Browser' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-505 hover:text-slate-800'
                }`}
              >
                Browser Record Flow
              </button>
            </div>
          </div>

          {/* Endpoint journey info */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1.5">
              {testType === 'API' ? 'REST API Destination' : 'Simulated User Recording Path'}
            </label>
            <input
              type="text"
              value={endpointOrJourney}
              onChange={(e) => setEndpointOrJourney(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-400 font-sans shadow-xs"
            />
          </div>

          {/* Slasher: VUs quantity slider */}
          <div>
            <div className="flex justify-between text-xs font-mono uppercase text-slate-550 mb-1">
              <span>Concurrent Virtual Users</span>
              <span className="text-purple-600 font-bold">{virtualUsers.toLocaleString()} VUs</span>
            </div>
            <input
              type="range"
              min={10}
              max={1000}
              step={10}
              value={virtualUsers}
              onChange={(e) => setVirtualUsers(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-600 border border-slate-200"
            />
          </div>

          {/* Slasher: RPS limit slider */}
          <div>
            <div className="flex justify-between text-xs font-mono uppercase text-slate-550 mb-1">
              <span>RPS Threshold Boundary</span>
              <span className="text-indigo-605 font-bold">{rpsLimit} RPS</span>
            </div>
            <input
              type="range"
              min={10}
              max={500}
              step={10}
              value={rpsLimit}
              onChange={(e) => setRpsLimit(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 border border-slate-200"
            />
          </div>

          {/* Slasher: Duration of test run */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-505 mb-1">Run Duration (Sec)</label>
              <input
                type="number"
                min={10}
                max={600}
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-505 mb-1">Ramp Up Pacing (Sec)</label>
              <input
                type="number"
                min={0}
                max={120}
                value={rampUpTimeSeconds}
                onChange={(e) => setRampUpTimeSeconds(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none font-mono"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleRun}
          disabled={isExecuting}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-mono font-bold transition-all shadow-sm ${
            isExecuting
              ? 'bg-purple-50 text-purple-700 border border-purple-200'
              : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500'
          }`}
        >
          {isExecuting ? (
            <>
              <Server className="w-4 h-4 animate-spin" />
              Saturating Connection Sockets...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Inject Concurrent Connections
            </>
          )}
        </button>
      </div>

      {/* Real-time Response Times Charts & Diagnostics */}
      <div className="lg:col-span-7 space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-sans font-semibold text-lg text-slate-900">Stress Load Telemetry</h3>
              <p className="text-xs text-slate-500 mt-0.5">Real-time socket latencies recorded at target scale boundaries</p>
            </div>
            <span className="text-xs font-mono text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              {activeMetric.virtualUsers} VUs
            </span>
          </div>

          {/* Raw Metrics grid */}
          {activeMetric.metrics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center shadow-xs">
                <span className="text-[10px] text-slate-500 block uppercase font-mono">AVG Latency</span>
                <span className="text-base font-bold text-slate-900 font-mono">{activeMetric.metrics.avgResponseTimeMs} ms</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center shadow-xs">
                <span className="text-[10px] text-slate-500 block uppercase font-mono">P90 / P95 / P99</span>
                <span className="text-sm font-bold text-slate-800 font-mono">
                  {activeMetric.metrics.p90Ms} / {activeMetric.metrics.p95Ms} / {activeMetric.metrics.p99Ms}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center shadow-xs">
                <span className="text-[10px] text-slate-500 block uppercase font-mono">TPS Speed</span>
                <span className="text-base font-bold text-purple-700 font-mono">{activeMetric.metrics.throughputTps} /s</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center shadow-xs">
                <span className="text-[10px] text-slate-500 block uppercase font-mono">Socket Error</span>
                <span className={`text-base font-bold font-mono ${
                  activeMetric.metrics.errorRate > 1.0 ? 'text-rose-600 animate-pulse' : 'text-emerald-700'
                }`}>{activeMetric.metrics.errorRate}%</span>
              </div>
            </div>
          )}

          {/* Interactive SVG graphical response metrics */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 shadow-inner">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                {activeMetric.timeSeries?.length ? 'Live Latency & RPS curve (real data)' : 'TPS & Latency curve'}
              </span>
              <span className="text-[9px] font-mono text-slate-400">Duration: {activeMetric.durationSeconds}s</span>
            </div>

            {/* Real time series SVG chart */}
            {activeMetric.timeSeries && activeMetric.timeSeries.length > 1 ? (() => {
              const ts = activeMetric.timeSeries!;
              const maxLatency = Math.max(...ts.map(p => p.latencyMs));
              const maxRps = Math.max(...ts.map(p => p.rps));
              const W = 100, H = 30;
              const latencyPts = ts.map((p, i) => `${(i / (ts.length - 1)) * W},${H - (p.latencyMs / maxLatency) * H}`).join(' ');
              const rpsPts = ts.map((p, i) => `${(i / (ts.length - 1)) * W},${H - (p.rps / maxRps) * H}`).join(' ');
              const latencyFill = `${latencyPts} ${W},${H} 0,${H}`;
              return (
                <div className="space-y-1">
                  <div className="h-28 w-full relative">
                    <svg className="w-full h-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="latGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="rpsGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {/* Latency fill area */}
                      <polygon points={latencyFill} fill="url(#latGrad)" />
                      {/* Latency line */}
                      <polyline points={latencyPts} fill="none" stroke="#8b5cf6" strokeWidth="1.5" />
                      {/* RPS line */}
                      <polyline points={rpsPts} fill="none" stroke="#06b6d4" strokeWidth="1" strokeDasharray="2,1" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-4 text-[9px] font-mono text-slate-400">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-0.5 bg-purple-500 inline-block" /> Latency (ms) — peak {maxLatency}ms
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-0.5 bg-cyan-500 inline-block border-dashed" /> RPS — peak {maxRps.toFixed(0)}/s
                    </span>
                  </div>

                  {/* Mini data table: first/mid/last datapoints */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {[ts[0], ts[Math.floor(ts.length / 2)], ts[ts.length - 1]].map((p, i) => (
                      <div key={i} className="bg-white border border-slate-200 rounded-lg p-2 text-[10px] font-mono text-center">
                        <span className="text-slate-400 block text-[9px]">t={p.time}s</span>
                        <span className="text-purple-700 font-bold block">{p.latencyMs}ms</span>
                        <span className="text-cyan-600 font-bold">{p.rps.toFixed(1)} rps</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })() : (
              /* Fallback static chart when no real data yet */
              <div className="h-28 w-full relative flex items-end">
                <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                  <path d="M 0 30 Q 15 24 30 18 T 50 12 T 75 8 T 100 4" fill="none" stroke="#8b5cf6" strokeWidth="1.5" />
                  <path d="M 0 30 Q 15 24 30 18 T 50 12 T 75 8 T 100 4 L 100 30 L 0 30 Z" fill="url(#performanceGradient)" opacity="0.1" />
                  <defs>
                    <linearGradient id="performanceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono text-slate-400">Run a test to see real data</span>
              </div>
            )}
          </div>

          {/* Active AI Tuning diagnostics recommendations */}
          {activeMetric.aiRecommendations && (
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <h4 className="text-xs font-mono font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-purple-600" />
                AI Bottleneck diagnostics
              </h4>

              <div className="space-y-2">
                {activeMetric.aiRecommendations.map((tip, idx) => (
                  <div key={idx} className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-xs text-slate-800 leading-relaxed shadow-xs">
                    <span className="font-bold text-purple-750 mr-1">R-{idx + 1}:</span>
                    {tip}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
