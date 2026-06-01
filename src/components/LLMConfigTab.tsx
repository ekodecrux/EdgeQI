import React, { useState, useEffect } from 'react';
import { Cpu, CheckCircle, XCircle, AlertCircle, RefreshCw, Settings, Zap, ExternalLink } from 'lucide-react';

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

  useEffect(() => {
    fetch('/api/quality/llm/providers').then(r => r.json()).then(d => {
      setProviders(d.providers || []);
      setActiveProvider(d.activeProvider || 'gemini');
    });
  }, []);

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
