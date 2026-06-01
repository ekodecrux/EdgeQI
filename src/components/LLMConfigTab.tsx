import React, { useState, useEffect } from 'react';
import { Cpu, CheckCircle, XCircle, AlertCircle, RefreshCw, Settings, Zap, ExternalLink, Server, Play, List, Database, Trash2, ToggleLeft, ToggleRight, ArrowUp, ArrowDown, User, BookOpen } from 'lucide-react';

interface Provider {
  id: string;
  name: string;
  model: string;
  status: 'active' | 'unconfigured' | 'error';
  latencyMs: number;
  costPer1k: number;
}

export default function LLMConfigTab() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [activeProvider, setActiveProvider] = useState('gemini');
  const [testResult, setTestResult] = useState<Record<string, { success: boolean; response: string; latencyMs: number }>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [customUrl, setCustomUrl] = useState('');
  const [customKey, setCustomKey] = useState('');
  const [customModel, setCustomModel] = useState('');

  // REQ-80/81: LLM fallback chain config
  const [fallbackChain, setFallbackChain] = useState<Array<{ provider: string; model: string; enabled: boolean; priority: number }>>([]);
  const [chainSaving, setChainSaving] = useState(false);
  const [chainMsg, setChainMsg] = useState('');

  const loadFallbackChain = async () => {
    const token = localStorage.getItem('iq_token');
    const res = await fetch('/api/quality/llm/fallback-chain', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { const d = await res.json(); setFallbackChain(d.chain || []); }
  };

  const saveFallbackChain = async (updates: Array<{ provider: string; enabled?: boolean; priority?: number }>) => {
    setChainSaving(true);
    const token = localStorage.getItem('iq_token');
    const res = await fetch('/api/quality/llm/fallback-chain', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ updates })
    });
    if (res.ok) { const d = await res.json(); setFallbackChain(d.chain || []); setChainMsg('Saved ✓'); setTimeout(() => setChainMsg(''), 2000); }
    setChainSaving(false);
  };

  const toggleProvider = (provider: string) => {
    const entry = fallbackChain.find(e => e.provider === provider);
    if (!entry) return;
    saveFallbackChain([{ provider, enabled: !entry.enabled }]);
  };

  const moveProvider = (provider: string, direction: 'up' | 'down') => {
    const sorted = [...fallbackChain].sort((a, b) => a.priority - b.priority);
    const idx = sorted.findIndex(e => e.provider === provider);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const updates = [
      { provider: sorted[idx].provider, priority: sorted[swapIdx].priority },
      { provider: sorted[swapIdx].provider, priority: sorted[idx].priority },
    ];
    saveFallbackChain(updates);
  };

  useEffect(() => { loadFallbackChain(); }, []);

  // REQ-98: LLM cache stats
  const [cacheStats, setCacheStats] = useState<{ size: number; ttlMs: number } | null>(null);
  const [cacheClearMsg, setCacheClearMsg] = useState('');
  const [cacheLoading, setCacheLoading] = useState(false);

  const loadCacheStats = async () => {
    setCacheLoading(true);
    try {
      const res = await fetch('/api/quality/llm/cache/stats');
      if (res.ok) setCacheStats(await res.json());
    } finally { setCacheLoading(false); }
  };

  const clearCache = async () => {
    const res = await fetch('/api/quality/llm/cache', { method: 'DELETE' });
    const data = await res.json();
    setCacheStats(prev => prev ? { ...prev, size: 0 } : prev);
    setCacheClearMsg(data.message || 'Cache cleared');
    setTimeout(() => setCacheClearMsg(''), 3000);
  };

  useEffect(() => { loadCacheStats(); }, []);

  // Ollama state (REQ-96)
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState('llama3');
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [ollamaTestResult, setOllamaTestResult] = useState<{ success: boolean; response: string; latencyMs: number } | null>(null);
  const [ollamaTesting, setOllamaTesting] = useState(false);
  const [ollamaLoadingModels, setOllamaLoadingModels] = useState(false);
  const [ollamaModelsError, setOllamaModelsError] = useState('');

  useEffect(() => {
    fetch('/api/quality/llm/providers').then(r => r.json()).then(d => {
      setProviders(d.providers || []);
      setActiveProvider(d.activeProvider || 'gemini');
    });
  }, []);

  const testOllama = async () => {
    setOllamaTesting(true);
    setOllamaTestResult(null);
    try {
      const res = await fetch('/api/quality/llm/ollama-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ollamaUrl, model: ollamaModel })
      });
      const data = await res.json();
      setOllamaTestResult(data);
    } catch (e: any) {
      setOllamaTestResult({ success: false, response: e.message, latencyMs: 0 });
    } finally {
      setOllamaTesting(false);
    }
  };

  const loadOllamaModels = async () => {
    setOllamaLoadingModels(true);
    setOllamaModelsError('');
    setOllamaModels([]);
    try {
      const res = await fetch(`/api/quality/llm/ollama-models?ollamaUrl=${encodeURIComponent(ollamaUrl)}`);
      const data = await res.json();
      if (data.models) {
        setOllamaModels(data.models);
      } else {
        setOllamaModelsError(data.error || 'No models returned');
      }
    } catch (e: any) {
      setOllamaModelsError(e.message);
    } finally {
      setOllamaLoadingModels(false);
    }
  };

  const testProvider = async (providerId: string, apiKey?: string) => {
    setTesting(providerId);
    try {
      const res = await fetch('/api/quality/llm/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId, apiKey: apiKey || customKey, customUrl, model: customModel }),
      });
      const data = await res.json();
      setTestResult(prev => ({ ...prev, [providerId]: data }));
    } catch (e: any) {
      setTestResult(prev => ({ ...prev, [providerId]: { success: false, response: e.message, latencyMs: 0 } }));
    } finally {
      setTesting(null);
    }
  };

  const statusIcon = (p: Provider) => {
    const result = testResult[p.id];
    if (result) return result.success
      ? <CheckCircle className="w-4 h-4 text-emerald-400" />
      : <XCircle className="w-4 h-4 text-red-400" />;
    if (p.status === 'active') return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    if (p.status === 'unconfigured') return <AlertCircle className="w-4 h-4 text-amber-400" />;
    return <XCircle className="w-4 h-4 text-red-400" />;
  };

  const statusLabel = (p: Provider) => {
    const result = testResult[p.id];
    if (result) return result.success ? 'Test Passed' : 'Test Failed';
    if (p.status === 'active') return 'Configured';
    return 'Not Configured';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
          <Cpu className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h2 className="text-white font-bold text-lg">LLM Provider Configuration</h2>
          <p className="text-slate-400 text-xs">Configure and test AI model providers (REQ-76/77/78/79)</p>
        </div>
      </div>

      {/* Providers Grid */}
      <div className="grid grid-cols-1 gap-4">
        {providers.map(p => (
          <div key={p.id} className={`bg-slate-800/50 border rounded-xl p-4 ${p.status === 'active' ? 'border-emerald-500/30' : 'border-slate-700/50'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {statusIcon(p)}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-semibold text-sm">{p.name}</span>
                    {p.id === activeProvider && (
                      <span className="bg-indigo-500/20 text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-500/30">PRIMARY</span>
                    )}
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      p.status === 'active' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                    }`}>{statusLabel(p)}</span>
                  </div>
                  <p className="text-slate-400 text-xs mt-0.5 font-mono">{p.model}</p>
                  {testResult[p.id] && (
                    <p className={`text-xs mt-1 ${testResult[p.id].success ? 'text-emerald-400' : 'text-red-400'}`}>
                      {testResult[p.id].response?.slice(0, 80)} · {testResult[p.id].latencyMs}ms
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-right shrink-0">
                <div className="hidden sm:block">
                  <p className="text-slate-500 text-[10px]">Latency</p>
                  <p className="text-slate-300 text-xs font-mono">{p.latencyMs.toLocaleString()}ms</p>
                </div>
                <div className="hidden sm:block">
                  <p className="text-slate-500 text-[10px]">Cost/1K</p>
                  <p className="text-slate-300 text-xs font-mono">${p.costPer1k.toFixed(5)}</p>
                </div>
                <button
                  onClick={() => testProvider(p.id)}
                  disabled={testing === p.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-400 text-xs font-medium rounded-lg transition-all disabled:opacity-50"
                >
                  {testing === p.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                  Test
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Custom Endpoint */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-4 h-4 text-slate-400" />
          <h3 className="text-white font-semibold text-sm">Custom OpenAI-Compatible Endpoint (REQ-79)</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Base URL</label>
            <input value={customUrl} onChange={e => setCustomUrl(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
              placeholder="https://your-llm-endpoint/v1" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">API Key</label>
            <input type="password" value={customKey} onChange={e => setCustomKey(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
              placeholder="sk-..." />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Model Name</label>
            <input value={customModel} onChange={e => setCustomModel(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
              placeholder="ollama/llama3, mistral, etc." />
          </div>
        </div>
        <button
          onClick={() => testProvider('custom')}
          disabled={!customUrl || testing === 'custom'}
          className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-all flex items-center gap-2"
        >
          {testing === 'custom' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          Test Custom Endpoint
        </button>
        {testResult['custom'] && (
          <p className={`mt-2 text-xs ${testResult['custom'].success ? 'text-emerald-400' : 'text-red-400'}`}>
            {testResult['custom'].success ? '✓ ' : '✗ '}{testResult['custom'].response?.slice(0, 100)}
          </p>
        )}
      </div>

      {/* Ollama Direct Integration (REQ-96) */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-4 h-4 text-emerald-400" />
          <h3 className="text-white font-semibold text-sm">Ollama Local LLM (REQ-96)</h3>
          <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">Direct API</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Ollama Server URL</label>
            <input
              value={ollamaUrl}
              onChange={e => setOllamaUrl(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
              placeholder="http://localhost:11434"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Model Name</label>
            <div className="flex gap-2">
              <input
                value={ollamaModel}
                onChange={e => setOllamaModel(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                placeholder="llama3, mistral, codellama..."
              />
              {ollamaModels.length > 0 && (
                <select
                  onChange={e => setOllamaModel(e.target.value)}
                  className="bg-slate-900 border border-slate-600 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Select</option>
                  {ollamaModels.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={testOllama}
            disabled={ollamaTesting || !ollamaUrl}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-400 text-xs font-medium rounded-lg transition-all disabled:opacity-50"
          >
            {ollamaTesting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
            Test Connection
          </button>
          <button
            onClick={loadOllamaModels}
            disabled={ollamaLoadingModels || !ollamaUrl}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 text-slate-300 text-xs font-medium rounded-lg transition-all disabled:opacity-50"
          >
            {ollamaLoadingModels ? <RefreshCw className="w-3 h-3 animate-spin" /> : <List className="w-3 h-3" />}
            List Models
          </button>
          <a href="https://ollama.com" target="_blank" rel="noopener" className="flex items-center gap-1 text-slate-400 text-xs hover:text-slate-300">
            <ExternalLink className="w-3 h-3" /> ollama.com
          </a>
        </div>
        {ollamaTestResult && (
          <div className={`mt-3 p-3 rounded-lg text-xs font-mono ${
            ollamaTestResult.success
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              : 'bg-red-500/10 border border-red-500/20 text-red-300'
          }`}>
            {ollamaTestResult.success ? '✓ ' : '✗ '}
            {ollamaTestResult.response?.slice(0, 120)}
            {ollamaTestResult.latencyMs > 0 && (
              <span className="ml-2 text-slate-400">{ollamaTestResult.latencyMs}ms</span>
            )}
          </div>
        )}
        {ollamaModels.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-slate-400 mb-2">Available models ({ollamaModels.length}):</p>
            <div className="flex flex-wrap gap-1.5">
              {ollamaModels.map(m => (
                <button
                  key={m}
                  onClick={() => setOllamaModel(m)}
                  className={`text-[11px] font-mono px-2 py-1 rounded-md border transition-all ${
                    ollamaModel === m
                      ? 'bg-emerald-600/30 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-700/40 border-slate-600 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}
        {ollamaModelsError && (
          <p className="mt-2 text-xs text-red-400 font-mono">{ollamaModelsError}</p>
        )}
        <div className="mt-3 pt-3 border-t border-slate-700/50">
          <p className="text-slate-500 text-xs leading-relaxed">
            Ollama, vLLM, LocalAI, and LM Studio can also connect via the custom endpoint below using URL
            <code className="bg-slate-700 px-1 rounded mx-1 text-slate-300">{ollamaUrl}/v1</code>.
            Pull models with: <code className="bg-slate-700 px-1 rounded text-slate-300">ollama pull llama3</code>
          </p>
        </div>
      </div>

      {/* Local LLMs Note */}
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-300 font-semibold text-sm mb-1">Local / Self-Hosted LLMs (REQ-77/78)</p>
            <p className="text-amber-200/70 text-xs leading-relaxed">
              Ollama, vLLM, LocalAI, LM Studio and other OpenAI-compatible local servers can be connected via the custom endpoint above.
              Example: <code className="bg-amber-500/10 px-1 rounded font-mono">http://localhost:11434/v1</code> for Ollama.
              Set the model name to <code className="bg-amber-500/10 px-1 rounded font-mono">ollama/llama3</code> or any model you have pulled.
            </p>
            <a href="https://ollama.com/download" target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-amber-400 text-xs mt-2 hover:text-amber-300">
              <ExternalLink className="w-3 h-3" /> Get Ollama
            </a>
          </div>
        </div>
      </div>

      {/* REQ-98: LLM Response Cache */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-violet-400" />
            <h3 className="text-white font-semibold text-sm">LLM Response Cache (REQ-98)</h3>
          </div>
          <button
            onClick={loadCacheStats}
            disabled={cacheLoading}
            aria-label="Refresh cache stats"
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 text-xs transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${cacheLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="bg-slate-900/50 rounded-lg p-3 text-center border border-slate-700">
            <div className="text-2xl font-bold text-violet-400">{cacheStats?.size ?? '—'}</div>
            <div className="text-[10px] text-slate-500 uppercase font-mono mt-0.5">Cached Entries</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 text-center border border-slate-700">
            <div className="text-2xl font-bold text-blue-400">{cacheStats ? Math.round(cacheStats.ttlMs / 60000) : '—'}m</div>
            <div className="text-[10px] text-slate-500 uppercase font-mono mt-0.5">TTL</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 text-center border border-slate-700">
            <div className="text-2xl font-bold text-emerald-400">{cacheStats && cacheStats.size > 0 ? 'Active' : 'Empty'}</div>
            <div className="text-[10px] text-slate-500 uppercase font-mono mt-0.5">Status</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={clearCache}
            disabled={!cacheStats || cacheStats.size === 0}
            aria-label="Clear LLM response cache"
            className="flex items-center gap-2 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 text-xs font-medium rounded-lg transition-all disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear Cache
          </button>
          {cacheClearMsg && (
            <span className="text-xs text-emerald-400 font-mono">{cacheClearMsg}</span>
          )}
        </div>
        <p className="text-slate-500 text-xs mt-3 leading-relaxed">
          Identical LLM prompts are served from cache for {cacheStats ? Math.round((cacheStats?.ttlMs ?? 300000) / 60000) : 5} minutes — reducing API cost and latency.
        </p>
      </div>

      {/* REQ-80/81: Live Fallback Chain Config */}
      <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-indigo-300 font-semibold text-sm flex items-center gap-2">
            <Zap className="w-4 h-4" /> Auto-Fallback Chain (REQ-80/81)
          </h4>
          <div className="flex items-center gap-2">
            {chainMsg && <span className="text-xs text-emerald-400 font-mono">{chainMsg}</span>}
            <button onClick={loadFallbackChain} disabled={chainSaving} className="p-1.5 rounded-lg hover:bg-white/10 transition-all">
              <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${chainSaving ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        {fallbackChain.length === 0 ? (
          <p className="text-slate-500 text-xs">Loading fallback chain…</p>
        ) : (
          <div className="space-y-2">
            {[...fallbackChain].sort((a, b) => a.priority - b.priority).map((entry, idx, arr) => (
              <div key={entry.provider} className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${entry.enabled ? 'bg-white/5 border-indigo-500/30' : 'bg-slate-800/30 border-slate-700/30 opacity-60'}`}>
                <span className="text-slate-500 font-mono text-[10px] w-4 text-center font-bold">{entry.priority}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-slate-200 text-xs font-mono font-bold capitalize">{entry.provider}</span>
                  <span className="text-slate-500 text-[10px] font-mono ml-2">{entry.model}</span>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded border font-mono font-bold ${entry.enabled ? 'bg-emerald-900/30 border-emerald-500/40 text-emerald-400' : 'bg-slate-800 border-slate-600 text-slate-500'}`}>
                  {entry.enabled ? 'ON' : 'OFF'}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => moveProvider(entry.provider, 'up')} disabled={idx === 0 || chainSaving} title="Move up in priority" className="p-1 rounded hover:bg-white/10 disabled:opacity-30 transition-all">
                    <ArrowUp className="w-3 h-3 text-slate-400" />
                  </button>
                  <button onClick={() => moveProvider(entry.provider, 'down')} disabled={idx === arr.length - 1 || chainSaving} title="Move down in priority" className="p-1 rounded hover:bg-white/10 disabled:opacity-30 transition-all">
                    <ArrowDown className="w-3 h-3 text-slate-400" />
                  </button>
                  <button onClick={() => toggleProvider(entry.provider)} disabled={chainSaving} title={entry.enabled ? 'Disable provider' : 'Enable provider'} className="p-1 rounded hover:bg-white/10 transition-all">
                    {entry.enabled
                      ? <ToggleRight className="w-4 h-4 text-emerald-400" />
                      : <ToggleLeft className="w-4 h-4 text-slate-500" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-slate-500 text-xs leading-relaxed">
          When the primary provider fails, iQStudio automatically tries the next <span className="text-emerald-400 font-mono">ON</span> provider in priority order. Drag rows or use arrows to reorder.
        </p>
      </div>

      {/* REQ-101: User Preferences Panel */}
      <UserPreferencesPanel />

      {/* NFR-03: API Documentation Viewer */}
      <ApiDocsPanel />
    </div>
  );
}

// ── REQ-101: USER PREFERENCE PERSISTENCE ─────────────────────────────────────
function UserPreferencesPanel() {
  const [prefs, setPrefs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const token = () => localStorage.getItem('iqstudio_token');
  const authH = () => ({ 'Content-Type': 'application/json', ...(token() ? { Authorization: `Bearer ${token()}` } : {}) });

  useEffect(() => {
    setLoading(true);
    fetch('/api/auth/me/preferences', { headers: authH() })
      .then(r => r.json()).then(d => { if (d.preferences) setPrefs(d.preferences); })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await fetch('/api/auth/me/preferences', { method: 'PUT', headers: authH(), body: JSON.stringify({ preferences: prefs }) });
      setMsg('Preferences saved!'); setTimeout(() => setMsg(''), 3000);
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const prefFields = [
    { key: 'theme', label: 'UI Theme', type: 'select', options: ['system', 'light', 'dark'] },
    { key: 'defaultProjectId', label: 'Default Project', type: 'text', placeholder: 'ALL' },
    { key: 'notificationsEnabled', label: 'Email Notifications', type: 'checkbox' },
    { key: 'aiModel', label: 'Preferred AI Model', type: 'select', options: ['gemini', 'groq', 'auto'] },
    { key: 'resultsPerPage', label: 'Results per page', type: 'number' },
  ];

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <User className="w-4 h-4 text-sky-400" /> User Preferences <span className="text-[10px] font-mono text-slate-400 ml-1">(REQ-101)</span>
        </h3>
        {msg && <span className="text-xs font-mono text-emerald-400">{msg}</span>}
      </div>
      {loading ? <p className="text-slate-500 text-xs font-mono">Loading preferences…</p> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {prefFields.map(f => (
            <div key={f.key}>
              <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">{f.label}</label>
              {f.type === 'select' ? (
                <select value={prefs[f.key] ?? f.options![0]}
                  onChange={e => setPrefs(p => ({...p, [f.key]: e.target.value}))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-sky-500">
                  {f.options!.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : f.type === 'checkbox' ? (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!prefs[f.key]}
                    onChange={e => setPrefs(p => ({...p, [f.key]: e.target.checked}))}
                    className="accent-sky-500 w-4 h-4" />
                  <span className="text-slate-300 text-xs">{prefs[f.key] ? 'Enabled' : 'Disabled'}</span>
                </label>
              ) : (
                <input type={f.type} value={prefs[f.key] ?? ''}
                  onChange={e => setPrefs(p => ({...p, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value}))}
                  placeholder={f.placeholder || ''}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-sky-500" />
              )}
            </div>
          ))}
        </div>
      )}
      <button onClick={save} disabled={saving}
        className="flex items-center gap-1.5 px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
        {saving ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving…</> : 'Save Preferences'}
      </button>
    </div>
  );
}

// ── NFR-03: API DOCUMENTATION VIEWER ─────────────────────────────────────────
function ApiDocsPanel() {
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState(false);

  const loadDocs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('iqstudio_token');
      const res = await fetch('/api/quality/docs', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const data = await res.json();
      if (data.routes) setRoutes(data.routes);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const filtered = routes.filter(r =>
    !filter || r.path?.toLowerCase().includes(filter.toLowerCase()) || r.method?.toLowerCase().includes(filter.toLowerCase())
  );

  const methodColors: Record<string,string> = { GET:'bg-emerald-900/40 text-emerald-400 border-emerald-700/50', POST:'bg-blue-900/40 text-blue-400 border-blue-700/50', PATCH:'bg-amber-900/40 text-amber-400 border-amber-700/50', DELETE:'bg-rose-900/40 text-rose-400 border-rose-700/50', PUT:'bg-violet-900/40 text-violet-400 border-violet-700/50' };

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-violet-400" /> API Documentation <span className="text-[10px] font-mono text-slate-400 ml-1">(NFR-03)</span>
        </h3>
        <button onClick={() => { if (!expanded) { loadDocs(); } setExpanded(v => !v); }}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-700">
          {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
          {expanded ? 'Hide' : 'Show Routes'}
        </button>
      </div>
      {expanded && (
        <div className="space-y-3">
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter by path or method…"
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-violet-500" />
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-slate-500 text-xs font-mono text-center py-3">{loading ? 'Loading routes…' : 'No routes match filter.'}</p>
            ) : filtered.map((r: any, i: number) => (
              <div key={i} className="flex items-center gap-2.5 bg-slate-900/60 rounded-lg px-3 py-1.5">
                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${methodColors[r.method] || 'bg-slate-800 text-slate-400 border-slate-700'}`}>{r.method}</span>
                <span className="text-xs font-mono text-slate-300 flex-1 truncate">{r.path}</span>
                {r.auth && <span className="text-[9px] font-mono text-amber-400 shrink-0">🔒 auth</span>}
              </div>
            ))}
          </div>
          {filtered.length > 0 && (
            <p className="text-[10px] font-mono text-slate-500 text-right">{filtered.length} route{filtered.length !== 1 ? 's' : ''} registered</p>
          )}
        </div>
      )}
    </div>
  );
}
