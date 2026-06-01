import React, { useState, useEffect } from 'react';
import { Cpu, CheckCircle, XCircle, AlertCircle, RefreshCw, Settings, Zap, ExternalLink, Server, Play, List } from 'lucide-react';

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

      {/* Fallback chain */}
      <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4">
        <h4 className="text-indigo-300 font-semibold text-sm mb-2 flex items-center gap-2">
          <Zap className="w-4 h-4" /> Auto-Fallback Chain (REQ-80)
        </h4>
        <div className="flex items-center gap-2 flex-wrap">
          {['Gemini 2.0 Flash', '→', 'Groq Llama 3.3-70B', '→', 'OpenAI GPT-4o', '→', 'Custom Endpoint', '→', 'Static Fallback'].map((item, i) => (
            item === '→'
              ? <span key={i} className="text-slate-500 text-xs">→</span>
              : <span key={i} className="bg-slate-800 border border-slate-600 text-slate-300 text-xs px-2 py-1 rounded-lg font-mono">{item}</span>
          ))}
        </div>
        <p className="text-slate-500 text-xs mt-2">When the primary provider fails, iQStudio automatically tries the next configured provider. Gemini → Groq is active now.</p>
      </div>
    </div>
  );
}
