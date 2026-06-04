import { useState, useEffect } from 'react';
import { AreaChart, TrendingUp, Cpu, Server, Play, ShieldAlert, CheckCircle2, Sliders, HelpCircle, RefreshCw, History, ArrowRight, CheckCircle, TableProperties, Download, Sparkles, Zap, FileCode } from 'lucide-react';
import { PerformanceConfig, TestCase } from '../types';

interface PerformanceProps {
  configs: PerformanceConfig[];
  testCases?: TestCase[];
  onExecutePerformanceTest: (
    testType: 'Browser' | 'API',
    endpointOrJourney: string,
    virtualUsers: number,
    durationSeconds: number,
    rampUpTimeSeconds: number,
    rpsLimit?: number
  ) => Promise<void>;
  isExecuting: boolean;
  onNavigateToDashboard?: () => void;
}

export default function PerformanceTab({
  configs,
  testCases = [],
  onExecutePerformanceTest,
  isExecuting,
  onNavigateToDashboard,
}: PerformanceProps) {
  const [testType, setTestType] = useState<'Browser' | 'API'>('API');
  const [endpointOrJourney, setEndpointOrJourney] = useState('POST /api/v1/checkout/charge');
  const [virtualUsers, setVirtualUsers] = useState(250);
  const [durationSeconds, setDurationSeconds] = useState(60);
  // Open source performance tool selector
  const [perfTool, setPerfTool] = useState<'k6' | 'locust' | 'artillery'>('k6');
  const [perfToolRunning, setPerfToolRunning] = useState(false);
  const [perfToolResult, setPerfToolResult] = useState<any>(null);
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

  // GAP-11/12: AI Perf Recommendations from API
  const [aiRecs, setAiRecs] = useState<string[]>(activeMetric.aiRecommendations || []);
  const [aiRecsLoading, setAiRecsLoading] = useState(false);
  const [aiRecsError, setAiRecsError] = useState<string | null>(null);

  const loadAiRecommendations = async () => {
    setAiRecsLoading(true);
    setAiRecsError(null);
    try {
      const token = localStorage.getItem('iq_token');
      const metrics = activeMetric.metrics || {};
      const res = await fetch(apiUrl('/api/quality/performance/ai-recommendations'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          endpoint: activeMetric.endpointOrJourney,
          virtualUsers: activeMetric.virtualUsers,
          metrics,
          testType: activeMetric.testType
        })
      });
      const data = await res.json();
      if (data.recommendations && data.recommendations.length > 0) {
        setAiRecs(data.recommendations);
      } else if (data.error) {
        setAiRecsError(data.error);
      }
    } catch (e: any) {
      setAiRecsError('Failed to load AI recommendations: ' + e.message);
      // Fall back to hardcoded
      setAiRecs(activeMetric.aiRecommendations || []);
    } finally {
      setAiRecsLoading(false);
    }
  };

  // Load AI recs on mount
  useEffect(() => { loadAiRecommendations(); }, []);

  // REQ-69: Performance history trend
  const [perfHistory, setPerfHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const loadPerfHistory = async () => {
    setHistoryLoading(true);
    try {
      const token = localStorage.getItem('iq_token');
      const res = await fetch(apiUrl('/api/quality/performance/history'), { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const data = await res.json();
      if (data.history) setPerfHistory(data.history);
    } catch { /* silent */ } finally { setHistoryLoading(false); }
  };
  useEffect(() => { loadPerfHistory(); }, []);

  const handleRun = async () => {
    await onExecutePerformanceTest(testType, endpointOrJourney, virtualUsers, durationSeconds, rampUpTimeSeconds, rpsLimit);
  };

  const handlePerfToolRun = async () => {
    if (perfToolRunning) return;
    setPerfToolRunning(true);
    setPerfToolResult(null);
    const t = localStorage.getItem('iq_token') || '';
    try {
      const res = await fetch(apiUrl('/api/quality/performance/tool-run'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) },
        body: JSON.stringify({
          tool: perfTool,
          targetUrl: endpointOrJourney.startsWith('http') ? endpointOrJourney : `http://localhost:3000`,
          virtualUsers: Math.min(virtualUsers, 50), // cap for sandbox
          durationSeconds: Math.min(durationSeconds, 30),
          rampUpSeconds: Math.min(rampUpTimeSeconds, 10)
        })
      });
      const data = await res.json();
      setPerfToolResult(data);
    } catch (e: any) {
      setPerfToolResult({ error: e.message });
    } finally {
      setPerfToolRunning(false);
    }
  };

  // GAP-13/14: JMeter / k6 script export
  const [exportFormat, setExportFormat] = useState<'jmeter' | 'k6'>('k6');
  const [exportScript, setExportScript] = useState('');
  const [exportVisible, setExportVisible] = useState(false);

  const generateJMeterXml = () => {
    return `<?xml version="1.0" encoding="UTF-8"?>
<jmeterTestPlan version="1.2" properties="5.0" jmeter="5.6.3">
  <hashTree>
    <TestPlan guiclass="TestPlanGui" testclass="TestPlan" testname="${endpointOrJourney}" enabled="true">
      <boolProp name="TestPlan.functional_mode">false</boolProp>
      <boolProp name="TestPlan.serialize_threadgroups">false</boolProp>
    </TestPlan>
    <hashTree>
      <!-- Thread Group: ${virtualUsers} VUs, ${durationSeconds}s -->
      <ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="Load Test - ${endpointOrJourney}" enabled="true">
        <intProp name="ThreadGroup.num_threads">${virtualUsers}</intProp>
        <intProp name="ThreadGroup.ramp_time">${rampUpTimeSeconds}</intProp>
        <longProp name="ThreadGroup.duration">${durationSeconds}</longProp>
        <boolProp name="ThreadGroup.scheduler">true</boolProp>
        <stringProp name="ThreadGroup.on_sample_error">continue</stringProp>
        <elementProp name="ThreadGroup.main_controller" elementType="LoopController">
          <boolProp name="LoopController.continue_forever">true</boolProp>
          <intProp name="LoopController.loops">-1</intProp>
        </elementProp>
      </ThreadGroup>
      <hashTree>
        <HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="${endpointOrJourney}" enabled="true">
          <stringProp name="HTTPSampler.domain">staging.api.io</stringProp>
          <stringProp name="HTTPSampler.port">443</stringProp>
          <stringProp name="HTTPSampler.protocol">https</stringProp>
          <stringProp name="HTTPSampler.path">${endpointOrJourney.replace(/^(GET|POST|PUT|DELETE|PATCH)\s+/, '')}</stringProp>
          <stringProp name="HTTPSampler.method">${endpointOrJourney.split(' ')[0] || 'GET'}</stringProp>
          <boolProp name="HTTPSampler.follow_redirects">true</boolProp>
          <boolProp name="HTTPSampler.use_keepalive">true</boolProp>
        </HTTPSamplerProxy>
        <hashTree>
          <HeaderManager guiclass="HeaderPanel" testclass="HeaderManager" testname="HTTP Headers" enabled="true">
            <collectionProp name="HeaderManager.headers">
              <elementProp name="Content-Type" elementType="Header">
                <stringProp name="Header.name">Content-Type</stringProp>
                <stringProp name="Header.value">application/json</stringProp>
              </elementProp>
              <elementProp name="Authorization" elementType="Header">
                <stringProp name="Header.name">Authorization</stringProp>
                <stringProp name="Header.value">Bearer \${TEST_TOKEN}</stringProp>
              </elementProp>
            </collectionProp>
          </HeaderManager>
          <hashTree/>
          <!-- Assertions -->
          <ResponseAssertion guiclass="AssertionGui" testclass="ResponseAssertion" testname="Status 200" enabled="true">
            <collectionProp name="Asserion.test_strings">
              <stringProp>200</stringProp>
            </collectionProp>
            <stringProp name="Assertion.test_field">Assertion.response_code</stringProp>
          </ResponseAssertion>
          <hashTree/>
        </hashTree>
        <!-- Summary Report -->
        <ResultCollector guiclass="SummaryReport" testclass="ResultCollector" testname="Summary Report" enabled="true"/>
        <hashTree/>
      </hashTree>
    </hashTree>
  </hashTree>
</jmeterTestPlan>`;
  };

  const generateK6Script = () => {
    const method = endpointOrJourney.split(' ')[0] || 'GET';
    const path = endpointOrJourney.replace(/^(GET|POST|PUT|DELETE|PATCH)\s+/, '');
    return `import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { apiUrl } from '@/src/config/api';

/**
 * k6 Load Test Script — Generated by IQ Studio
 * Target: ${endpointOrJourney}
 * Generated: ${new Date().toLocaleDateString()}
 */

// Custom metrics
const errorRate = new Rate('error_rate');
const reqDuration = new Trend('req_duration', true);
const requestCount = new Counter('requests_total');

export const options = {
  stages: [
    // Ramp-up: 0 → ${virtualUsers} VUs in ${rampUpTimeSeconds}s
    { duration: '${rampUpTimeSeconds}s', target: ${virtualUsers} },
    // Sustained load: ${virtualUsers} VUs for ${Math.max(durationSeconds - rampUpTimeSeconds * 2, 10)}s
    { duration: '${Math.max(durationSeconds - rampUpTimeSeconds * 2, 10)}s', target: ${virtualUsers} },
    // Ramp-down: ${virtualUsers} → 0 VUs in ${rampUpTimeSeconds}s
    { duration: '${rampUpTimeSeconds}s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.05'],
    error_rate: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://staging.api.io';
const TOKEN = __ENV.TEST_TOKEN || '';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': \`Bearer \${TOKEN}\`,
};

export default function () {
  group('${endpointOrJourney}', () => {
    const res = http.${method.toLowerCase() === 'post' ? 'post' : method.toLowerCase() === 'put' ? 'put' : method.toLowerCase() === 'delete' ? 'del' : 'get'}(
      \`\${BASE_URL}${path}\`,
      ${method === 'POST' || method === 'PUT' ? "JSON.stringify({ /* payload */ })," : "null,"}
      { headers }
    );

    const ok = check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
      'has response body': (r) => r.body && r.body.length > 0,
    });

    errorRate.add(!ok);
    reqDuration.add(res.timings.duration);
    requestCount.add(1);

    if (!ok) {
      console.error(\`[FAIL] \${res.status} - \${res.body?.slice(0, 200)}\`);
    }
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': JSON.stringify({
      avg_duration: data.metrics.http_req_duration?.values?.avg,
      p95_duration: data.metrics.http_req_duration?.values?.['p(95)'],
      error_rate: data.metrics.http_req_failed?.values?.rate,
      requests_total: data.metrics.http_reqs?.values?.count,
    }, null, 2),
  };
}`;
  };

  const handleExport = (fmt: 'jmeter' | 'k6') => {
    setExportFormat(fmt);
    const script = fmt === 'jmeter' ? generateJMeterXml() : generateK6Script();
    setExportScript(script);
    setExportVisible(true);
  };

  const downloadExport = () => {
    const filename = exportFormat === 'jmeter' ? 'load-test.jmx' : 'load-test.k6.js';
    const blob = new Blob([exportScript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const hasRunBefore = configs.length > 0;

  return (
    <div className="space-y-4">

    {/* Page Header */}
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingBottom:16,borderBottom:'1px solid #E2E8F0'}}>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <div style={{width:40,height:40,borderRadius:10,background:'linear-gradient(135deg,#0F172A 0%,#5B6CFF 100%)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <Sliders style={{width:20,height:20,color:'#ffffff'}} />
        </div>
        <div>
          <h1 style={{fontFamily:'"Inter",Arial,sans-serif',fontSize:20,fontWeight:700,color:'#0F172A',lineHeight:1,margin:0}}>Performance Testing</h1>
          <p style={{fontFamily:'"Inter",Arial,sans-serif',fontSize:13,color:'#475569',margin:'3px 0 0'}}>Load test your API endpoints and browser journeys</p>
        </div>
      </div>
      {/* GAP-13/14: Export buttons */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-mono text-slate-400">Export:</span>
        <button
          onClick={() => handleExport('jmeter')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200 text-orange-700 rounded-lg text-xs font-bold hover:bg-orange-100 transition-all"
          title="Export as Apache JMeter .jmx"
        >
          <FileCode className="w-3.5 h-3.5" /> JMeter
        </button>
        <button
          onClick={() => handleExport('k6')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 border border-purple-200 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-100 transition-all"
          title="Export as k6 script"
        >
          <Zap className="w-3.5 h-3.5" /> k6
        </button>
      </div>
    </div>

    {/* GAP-13/14: Export Script Panel */}
    {exportVisible && exportScript && (
      <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
        <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-mono font-bold text-slate-200">
              {exportFormat === 'jmeter' ? 'load-test.jmx' : 'load-test.k6.js'}
            </span>
            <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
              {exportFormat === 'jmeter' ? 'Apache JMeter' : 'Grafana k6'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={downloadExport}
              className="flex items-center gap-1 text-slate-400 hover:text-slate-200 text-xs font-mono bg-slate-800 px-2 py-1 rounded border border-slate-700">
              <Download className="w-3.5 h-3.5" /> Download
            </button>
            <button onClick={() => setExportVisible(false)}
              className="text-slate-500 hover:text-slate-300 text-xs font-mono px-2 py-1">
              ✕ Close
            </button>
          </div>
        </div>
        <div className="p-4 font-mono text-[11px] text-slate-300 overflow-auto max-h-[280px] leading-relaxed text-left">
          <pre><code>{exportScript}</code></pre>
        </div>
      </div>
    )}

    {/* Test case quick-pick */}
    {testCases.length > 0 && (
      <div style={{background:'#f8fafc',border:'1px solid #E2E8F0',borderRadius:10,padding:'10px 14px',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
        <TableProperties style={{width:15,height:15,color:'#5B6CFF',flexShrink:0}} />
        <span style={{fontFamily:'"Inter",Arial,sans-serif',fontSize:12,fontWeight:700,color:'#0F172A'}}>From test cases:</span>
        {testCases.slice(0, 6).map(tc => (
          <button
            key={tc.id}
            onClick={() => {
              setTestType('API');
              setEndpointOrJourney(`GET /api/${tc.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40)}`);
            }}
            style={{background:'#eaf5fd',border:'1px solid #b0d9f5',borderRadius:6,padding:'3px 10px',fontFamily:'"Inter",Arial,sans-serif',fontSize:11,color:'#5B6CFF',fontWeight:600,cursor:'pointer',whiteSpace:'nowrap',maxWidth:180,overflow:'hidden',textOverflow:'ellipsis'}}
            title={tc.title}
          >
            {tc.id}
          </button>
        ))}
      </div>
    )}

    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Configure stress sliders panel */}
      <div className="lg:col-span-5 glass-card p-6 space-y-5">
        <div>
          <h3 className="font-sans font-semibold text-lg text-slate-900 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-500" />
            Load Generator Parameters
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Configure virtual users, duration and target endpoint.
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
                  testType === 'API' ? 'btn-primary' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                REST API Endpoint
              </button>
              <button
                type="button"
                onClick={() => { setTestType('Browser'); setEndpointOrJourney('Checkout billing flow recording'); }}
                className={`flex-1 py-1.5 rounded-md text-xs font-mono font-medium transition-all ${
                  testType === 'Browser' ? 'btn-primary' : 'text-slate-500 hover:text-slate-800'
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
              className="input-glass w-full text-xs font-sans"
            />
          </div>

          {/* VUs slider */}
          <div>
            <div className="flex justify-between text-xs font-mono uppercase text-slate-550 mb-1">
              <span>Concurrent Virtual Users</span>
              <span className="text-blue-600 font-bold">{virtualUsers.toLocaleString()} VUs</span>
            </div>
            <input
              type="range"
              min={10}
              max={1000}
              step={10}
              value={virtualUsers}
              onChange={(e) => setVirtualUsers(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 border border-slate-200"
            />
          </div>

          {/* RPS limit slider */}
          <div>
            <div className="flex justify-between text-xs font-mono uppercase text-slate-550 mb-1">
              <span>RPS Threshold Boundary</span>
              <span className="text-blue-600 font-bold">{rpsLimit} RPS</span>
            </div>
            <input
              type="range"
              min={10}
              max={500}
              step={10}
              value={rpsLimit}
              onChange={(e) => setRpsLimit(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 border border-slate-200"
            />
          </div>

          {/* Duration/ramp */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-505 mb-1">Run Duration (Sec)</label>
              <input
                type="number"
                min={10}
                max={600}
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(Number(e.target.value))}
                className="input-glass w-full text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Ramp Up Pacing (Sec)</label>
              <input
                type="number"
                min={0}
                max={120}
                value={rampUpTimeSeconds}
                onChange={(e) => setRampUpTimeSeconds(Number(e.target.value))}
                className="input-glass w-full text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* ── Open Source Performance Tool Selector ── */}
        <div className="bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-500" />
            <span className="text-[11px] font-mono font-bold text-slate-700 uppercase tracking-wider">Open Source Load Testing Tools</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {([
              { id: 'k6', label: 'k6', badge: 'v0.55', desc: 'Go-based, Grafana native', color: 'bg-purple-50 border-purple-200 text-purple-800' },
              { id: 'locust', label: 'Locust', badge: 'v2.44', desc: 'Python, distributed', color: 'bg-green-50 border-green-200 text-green-800' },
              { id: 'artillery', label: 'Artillery', badge: 'npm', desc: 'YAML config, Node.js', color: 'bg-orange-50 border-orange-200 text-orange-800' },
            ] as const).map(tool => (
              <button
                key={tool.id}
                onClick={() => setPerfTool(tool.id)}
                className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border text-[11px] font-mono font-bold transition-all ${
                  perfTool === tool.id ? 'ring-2 ring-offset-1 ring-blue-500 ' + tool.color : 'border-slate-200 text-slate-500 bg-white hover:border-slate-300'
                }`}
              >
                <span className="font-extrabold">{tool.label}</span>
                <span className="text-[9px] opacity-70">{tool.badge}</span>
                <span className="text-[8px] opacity-50 text-center">{tool.desc}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePerfToolRun}
              disabled={perfToolRunning || isExecuting}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-mono font-bold transition-all ${perfToolRunning ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'} disabled:opacity-60`}
            >
              {perfToolRunning ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Running {perfTool}...</> : <><Play className="w-3.5 h-3.5" /> Run {perfTool.toUpperCase()} Load Test</>}
            </button>
          </div>
          {perfToolResult && !perfToolResult.error && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                <span className="bg-white border border-slate-200 rounded-lg px-2 py-1">⚡ {perfToolResult.toolVersion}</span>
                <span className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-2 py-1">avg {perfToolResult.metrics?.avgResponseTimeMs}ms</span>
                <span className="bg-blue-50 border border-blue-200 text-blue-700 rounded-lg px-2 py-1">p95 {perfToolResult.metrics?.p95Ms}ms</span>
                <span className="bg-purple-50 border border-purple-200 text-purple-700 rounded-lg px-2 py-1">{perfToolResult.metrics?.throughputTps} TPS</span>
                <span className={`rounded-lg px-2 py-1 border ${(perfToolResult.metrics?.errorRate || 0) > 1 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>{perfToolResult.metrics?.errorRate}% err</span>
              </div>
              <div className="bg-slate-900 rounded-lg p-2 max-h-28 overflow-y-auto">
                {(perfToolResult.logs || []).slice(-15).map((log: string, i: number) => (
                  <div key={i} className="text-[9px] font-mono text-slate-300 leading-relaxed">{log}</div>
                ))}
              </div>
            </div>
          )}
          {perfToolResult?.error && <p className="text-xs text-red-600 font-mono bg-red-50 border border-red-200 rounded-lg p-2">Error: {perfToolResult.error}</p>}
        </div>

        <button
          onClick={handleRun}
          disabled={isExecuting}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-mono font-bold transition-all shadow-sm ${
            isExecuting
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'btn-primary'
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
              Inject Concurrent Connections (AI Model)
            </>
          )}
        </button>

        {/* Quick export buttons (also in header, duplicated here for convenience) */}
        <div className="flex gap-2 pt-1">
          <button onClick={() => handleExport('jmeter')}
            className="flex-1 flex items-center justify-center gap-1 text-xs font-mono py-1.5 bg-orange-50 border border-orange-200 text-orange-700 rounded-lg hover:bg-orange-100 transition-all font-bold">
            <Download className="w-3 h-3" /> JMeter .jmx
          </button>
          <button onClick={() => handleExport('k6')}
            className="flex-1 flex items-center justify-center gap-1 text-xs font-mono py-1.5 bg-purple-50 border border-purple-200 text-purple-700 rounded-lg hover:bg-purple-100 transition-all font-bold">
            <Download className="w-3 h-3" /> k6 script
          </button>
        </div>
      </div>

      {/* Real-time Response Times Charts & Diagnostics */}
      <div className="lg:col-span-7 space-y-6">
        <div className="glass-card p-6 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-sans font-semibold text-lg text-slate-900">Stress Load Telemetry</h3>
              <p className="text-xs text-slate-500 mt-0.5">Real-time socket latencies recorded at target scale boundaries</p>
            </div>
            <span className="badge badge-blue text-xs font-mono">
              {activeMetric.virtualUsers} VUs
            </span>
          </div>

          {/* Raw Metrics grid */}
          {activeMetric.metrics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="stat-card text-center">
                <span className="stat-label">AVG Latency</span>
                <span className="stat-value">{activeMetric.metrics.avgResponseTimeMs} ms</span>
              </div>
              <div className="stat-card text-center">
                <span className="stat-label">P90 / P95 / P99</span>
                <span className="text-sm font-bold text-slate-700 font-mono">
                  {activeMetric.metrics.p90Ms} / {activeMetric.metrics.p95Ms} / {activeMetric.metrics.p99Ms}
                </span>
              </div>
              <div className="stat-card text-center">
                <span className="stat-label">TPS Speed</span>
                <span className="stat-value text-blue-600">{activeMetric.metrics.throughputTps} /s</span>
              </div>
              <div className="stat-card text-center">
                <span className="text-[10px] text-slate-500 block uppercase font-mono">Socket Error</span>
                <span className={`stat-value ${
                  activeMetric.metrics.errorRate > 1.0 ? 'text-rose-600 animate-pulse' : 'text-green-600'
                }`}>{activeMetric.metrics.errorRate}%</span>
              </div>
            </div>
          )}

          {/* SVG graphical response metrics */}
          <div className="metal-surface rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                {activeMetric.timeSeries?.length ? 'Live Latency & RPS curve (real data)' : 'TPS & Latency curve'}
              </span>
              <span className="text-[9px] font-mono text-slate-400">Duration: {activeMetric.durationSeconds}s</span>
            </div>

            {activeMetric.timeSeries && activeMetric.timeSeries.length > 1 ? (() => {
              const ts = activeMetric.timeSeries!;
              const maxLatency = Math.max(...ts.map((p: any) => p.latencyMs));
              const maxRps = Math.max(...ts.map((p: any) => p.rps));
              const W = 100, H = 30;
              const latencyPts = ts.map((p: any, i: number) => `${(i / (ts.length - 1)) * W},${H - (p.latencyMs / maxLatency) * H}`).join(' ');
              const rpsPts = ts.map((p: any, i: number) => `${(i / (ts.length - 1)) * W},${H - (p.rps / maxRps) * H}`).join(' ');
              const latencyFill = `${latencyPts} ${W},${H} 0,${H}`;
              return (
                <div className="space-y-1">
                  <div className="h-28 w-full relative">
                    <svg className="w-full h-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="latGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <polygon points={latencyFill} fill="url(#latGrad)" />
                      <polyline points={latencyPts} fill="none" stroke="#2563eb" strokeWidth="1.5" />
                      <polyline points={rpsPts} fill="none" stroke="#1d4ed8" strokeWidth="1" strokeDasharray="2,1" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-4 text-[9px] font-mono text-slate-400">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-0.5 bg-blue-500 inline-block" /> Latency (ms) — peak {maxLatency}ms
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-0.5 bg-blue-800 inline-block border-dashed" /> RPS — peak {maxRps.toFixed(0)}/s
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {[ts[0], ts[Math.floor(ts.length / 2)], ts[ts.length - 1]].map((p: any, i: number) => (
                      <div key={i} className="bg-white border border-slate-200 rounded-lg p-2 text-[10px] font-mono text-center">
                        <span className="text-slate-400 block text-[9px]">t={p.time}s</span>
                        <span className="text-blue-600 font-bold block">{p.latencyMs}ms</span>
                        <span className="text-blue-800 font-bold">{p.rps.toFixed(1)} rps</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })() : (
              <div className="h-28 w-full relative flex items-end">
                <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                  <path d="M 0 30 Q 15 24 30 18 T 50 12 T 75 8 T 100 4" fill="none" stroke="#2563eb" strokeWidth="1.5" />
                  <path d="M 0 30 Q 15 24 30 18 T 50 12 T 75 8 T 100 4 L 100 30 L 0 30 Z" fill="url(#performanceGradient)" opacity="0.1" />
                  <defs>
                    <linearGradient id="performanceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#2563eb" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono text-slate-400">Run a test to see real data</span>
              </div>
            )}
          </div>

          {/* REQ-69: Performance History Trend Panel */}
          <div className="border-t border-slate-200 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-mono font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-blue-500" /> Performance Trend History
              </h4>
              <button onClick={loadPerfHistory} disabled={historyLoading}
                className="flex items-center gap-1 text-[10px] font-mono text-slate-500 hover:text-blue-600 border border-slate-200 hover:border-blue-300 px-2 py-0.5 rounded-lg transition-all disabled:opacity-50">
                <RefreshCw className={`w-3 h-3 ${historyLoading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
            {perfHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-[10px] font-mono border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border border-slate-200">
                      {['Target', 'Avg (ms)', 'p95 (ms)', 'TPS', 'Err%', 'VUs', 'Date'].map(h => (
                        <th key={h} className="px-2 py-1.5 text-left text-slate-500 uppercase border-b border-slate-200 font-bold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {perfHistory.slice(0, 8).map((row: any, i: number) => (
                      <tr key={i} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                        <td className="px-2 py-1.5 text-slate-700 max-w-[120px] truncate">{row.endpointOrJourney || '—'}</td>
                        <td className="px-2 py-1.5 text-blue-600 font-bold">{row.metrics?.avgResponseTimeMs ?? '—'}</td>
                        <td className={`px-2 py-1.5 font-bold ${(row.metrics?.p95Ms ?? 0) > 2000 ? 'text-rose-600' : 'text-green-600'}`}>{row.metrics?.p95Ms ?? '—'}</td>
                        <td className="px-2 py-1.5 text-blue-600">{row.metrics?.throughputTps ?? '—'}</td>
                        <td className={`px-2 py-1.5 font-bold ${(row.metrics?.errorRate ?? 0) > 1 ? 'text-rose-600' : 'text-slate-600'}`}>{row.metrics?.errorRate ?? '—'}%</td>
                        <td className="px-2 py-1.5 text-slate-500">{row.virtualUsers ?? '—'}</td>
                        <td className="px-2 py-1.5 text-slate-400">{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 font-mono text-center py-3 bg-slate-50 rounded-lg border border-slate-200">
                No performance history yet. Run a load test to build the trend dataset.
              </p>
            )}
          </div>

          {/* GAP-11/12: AI Perf Recommendations Panel (API-driven) */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-mono font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-500" />
                AI Performance Recommendations
              </h4>
              <button
                onClick={loadAiRecommendations}
                disabled={aiRecsLoading}
                className="flex items-center gap-1 text-[10px] font-mono text-slate-500 hover:text-blue-600 border border-slate-200 hover:border-blue-300 px-2 py-0.5 rounded-lg transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${aiRecsLoading ? 'animate-spin' : ''}`} />
                {aiRecsLoading ? 'Analyzing...' : 'Refresh'}
              </button>
            </div>

            {aiRecsError && (
              <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 font-mono">
                ⚠ {aiRecsError} — Showing cached recommendations.
              </div>
            )}

            {aiRecsLoading ? (
              <div className="flex items-center gap-2 py-4 justify-center text-slate-400 text-xs font-mono">
                <RefreshCw className="w-4 h-4 animate-spin" /> Calling AI to analyze bottlenecks…
              </div>
            ) : (
              <div className="space-y-2">
                {aiRecs.map((tip, idx) => (
                  <div key={idx} className="metal-surface rounded-xl p-3 text-xs text-slate-700 leading-relaxed flex items-start gap-2">
                    <span className="font-bold text-blue-600 flex-shrink-0">R-{idx + 1}:</span>
                    <span>{tip}</span>
                  </div>
                ))}
                {aiRecs.length === 0 && (
                  <p className="text-[11px] text-slate-400 font-mono text-center py-3">No recommendations. Run a load test to generate AI insights.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* ── NEXT STEP: View Dashboard after run ── */}
    {hasRunBefore && (
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'#eaf5fd',border:'1px solid #b0d9f5',borderRadius:10,padding:'12px 18px'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <CheckCircle style={{width:18,height:18,color:'#5B6CFF',flexShrink:0}} />
          <div>
            <span style={{fontFamily:'"Inter",Arial,sans-serif',fontSize:13,fontWeight:700,color:'#0F172A'}}>
              {configs.length} performance run{configs.length !== 1 ? 's' : ''} recorded
            </span>
            <span style={{fontFamily:'"Inter",Arial,sans-serif',fontSize:12,color:'#475569',marginLeft:8}}>
              View results in the QA Dashboard.
            </span>
          </div>
        </div>
        <button
          onClick={onNavigateToDashboard}
          style={{background:'#5B6CFF',color:'#fff',border:'none',borderRadius:8,padding:'8px 18px',fontFamily:'"Inter",Arial,sans-serif',fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:6,whiteSpace:'nowrap'}}
        >
          QA Dashboard <ArrowRight style={{width:14,height:14}} />
        </button>
      </div>
    )}
    </div>
  );
}
