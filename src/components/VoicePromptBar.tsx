/**
 * VoicePromptBar — Universal voice + text prompt input for every EDGE QI module
 *
 * Features:
 * - Voice input via SpeechRecognition API (browser native, no external dep)
 * - Text prompt input with "Apply to module" action
 * - RAG KB context injection — searches KB and prepends relevant context
 * - Saves every prompt to prompt_history table (per project/module)
 * - Collapsible — shows as a slim bar, expands on click
 * - Callback: onPromptSubmit(promptText, ragContext?) so each module can act on it
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic, MicOff, Send, Brain, ChevronDown, ChevronUp,
  Loader2, BookOpen, X, Sparkles, History, Clock
} from 'lucide-react';

// Augment Window type for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface PromptHistoryEntry {
  id: string;
  module: string;
  prompt_text: string;
  input_type: 'text' | 'voice';
  response_summary: string;
  applied: number;
  created_at: string;
}

export interface VoicePromptBarProps {
  module: string;                               // which STLC module (e.g. 'requirements', 'testcases')
  currentProjectId?: string;
  currentSprintId?: string;
  placeholder?: string;                         // custom placeholder text
  onPromptSubmit: (text: string, ragContext?: string) => void; // callback with prompt + optional KB context
  compact?: boolean;                            // ultra-slim mode for embedding in toolbars
  className?: string;
}

const MODULE_PLACEHOLDERS: Record<string, string> = {
  requirements:  'Describe new requirements, ask to refine existing ones, or query the knowledge base...',
  testcases:     'Generate test cases from a description, ask about coverage, or pull relevant TCs from KB...',
  scripts:       'Generate automation scripts, describe a test scenario, or ask about framework best practices...',
  execution:     'Describe what to execute, query run history, or ask about test environment setup...',
  performance:   'Describe performance scenarios, set thresholds, or ask about past performance results...',
  security:      'Describe security test scope, ask about vulnerabilities, or pull OWASP test cases from KB...',
  defects:       'Describe a defect pattern, ask about hotspot analysis, or query past defect history...',
  dashboard:     'Ask for a QA summary, compare sprints, or get AI insights on test metrics...',
  'rag-kb':      'Ask anything about your project documentation...',
  default:       'Type a prompt or use voice input to interact with this module...',
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function VoicePromptBar({
  module, currentProjectId, currentSprintId, placeholder,
  onPromptSubmit, compact = false, className = ''
}: VoicePromptBarProps) {
  const [expanded, setExpanded] = useState(!compact);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [ragEnabled, setRagEnabled] = useState(true);
  const [ragSearching, setRagSearching] = useState(false);
  const [ragContext, setRagContext] = useState('');
  const [ragSources, setRagSources] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<PromptHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const authToken = localStorage.getItem('iq_token') || '';
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` };

  // ── Voice setup ───────────────────────────────────────────────────────────
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setVoiceSupported(!!SR);
    if (!SR) return;
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event: any) => {
      const result = Array.from(event.results as SpeechRecognitionResultList)
        .map((r: SpeechRecognitionResult) => r[0].transcript)
        .join('');
      setTranscript(result);
      setInputText(result);
    };
    recognition.onend = () => {
      setIsListening(false);
      setTranscript('');
    };
    recognition.onerror = () => { setIsListening(false); };
    recognitionRef.current = recognition;
    return () => { try { recognition.abort(); } catch {} };
  }, []);

  // ── Toggle voice ──────────────────────────────────────────────────────────
  const toggleVoice = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setInputText('');
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  // ── RAG context fetch ─────────────────────────────────────────────────────
  const fetchRagContext = useCallback(async (query: string): Promise<{ context: string; sources: string[] }> => {
    if (!query.trim() || !ragEnabled) return { context: '', sources: [] };
    setRagSearching(true);
    try {
      const params = new URLSearchParams({ q: query, limit: '3' });
      if (currentProjectId && currentProjectId !== 'ALL') params.append('project_id', currentProjectId);
      const r = await fetch(`/api/quality/rag-kb/search?${params}`, { headers });
      if (!r.ok) return { context: '', sources: [] };
      const data = await r.json();
      const results = data.results || [];
      if (results.length === 0) return { context: '', sources: [] };
      const ctx = results.map((r: any) => `[${r.name}]: ${r.excerpts[0] || r.summary}`).join('\n\n');
      return { context: ctx, sources: results.map((r: any) => r.name) };
    } catch { return { context: '', sources: [] }; }
    finally { setRagSearching(false); }
  }, [currentProjectId, ragEnabled]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!inputText.trim()) return;
    setSubmitting(true);

    // Optionally enrich with RAG context
    let ctxText = '';
    let sources: string[] = [];
    if (ragEnabled && inputText.length > 5) {
      const { context, sources: s } = await fetchRagContext(inputText);
      ctxText = context;
      sources = s;
    }
    setRagContext(ctxText);
    setRagSources(sources);

    // Save to prompt_history
    const inputType = isListening ? 'voice' : 'text';
    fetch('/api/quality/prompt-history', {
      method: 'POST', headers,
      body: JSON.stringify({
        project_id: currentProjectId || null,
        sprint_id: currentSprintId || null,
        module,
        prompt_text: inputText,
        input_type: inputType,
        response_summary: ctxText ? `RAG context from: ${sources.join(', ')}` : '',
        applied: 1
      })
    }).catch(() => {});

    // Call parent callback
    onPromptSubmit(inputText, ctxText || undefined);

    setInputText('');
    setRagContext('');
    setRagSources([]);
    setSubmitting(false);
  };

  // ── Load history ──────────────────────────────────────────────────────────
  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const params = new URLSearchParams({ module, limit: '20' });
      if (currentProjectId && currentProjectId !== 'ALL') params.append('project_id', currentProjectId);
      const r = await fetch(`/api/quality/prompt-history?${params}`, { headers });
      if (r.ok) setHistory(await r.json());
    } catch {}
    setLoadingHistory(false);
  };

  const handleShowHistory = () => {
    const next = !showHistory;
    setShowHistory(next);
    if (next && history.length === 0) loadHistory();
  };

  const ph = placeholder || MODULE_PLACEHOLDERS[module] || MODULE_PLACEHOLDERS.default;

  // ─── Compact mode (inline pill for toolbars) ───────────────────────────────
  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <button
          onClick={() => setExpanded(!expanded)}
          title="Voice / Prompt Input"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
            expanded ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-200'
          }`}
        >
          <Sparkles className="w-3 h-3" />
          AI Prompt
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        {expanded && (
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <input
              ref={inputRef as any}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              placeholder={ph}
              className="input-glass flex-1 text-xs py-1.5"
            />
            {voiceSupported && (
              <button onClick={toggleVoice} title={isListening ? 'Stop recording' : 'Voice input'}
                className={`p-1.5 rounded-lg border ${isListening ? 'bg-red-50 border-red-300 text-red-600 animate-pulse' : 'border-slate-200 text-slate-500 hover:border-blue-200'}`}>
                {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
            )}
            <button onClick={handleSubmit} disabled={submitting || !inputText.trim()}
              className="p-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40">
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── Full mode ────────────────────────────────────────────────────────────
  return (
    <div className={`bg-white border rounded-xl shadow-sm overflow-hidden transition-all ${className}`}
      style={{ borderColor: expanded ? '#b3ddf7' : '#E2E8F0' }}>

      {/* Header bar */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors"
        style={{ background: expanded ? '#eaf5fd' : 'transparent' }}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: '#5B6CFF' }} />
          <span className="text-xs font-semibold" style={{ color: '#0F172A' }}>AI Prompt & Voice Input</span>
          {isListening && (
            <span className="flex items-center gap-1 text-[10px] text-red-600 animate-pulse font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
              Recording...
            </span>
          )}
          {ragEnabled && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100">
              🧠 KB Active
            </span>
          )}
        </div>
        <button onClick={e => { e.stopPropagation(); handleShowHistory(); }}
          title="View prompt history"
          className="p-1 hover:bg-white rounded text-slate-400 hover:text-slate-600">
          <History className="w-3.5 h-3.5" />
        </button>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t" style={{ borderColor: '#b3ddf7' }}>
          {/* Prompt input row */}
          <div className="flex gap-2 items-start">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
                }}
                placeholder={isListening ? '🎙 Listening — speak now...' : ph}
                rows={2}
                className="input-glass w-full text-sm resize-none pr-3"
              />
              {isListening && transcript && (
                <div className="absolute bottom-full left-0 mb-1 w-full bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 italic">
                  🎙 "{transcript}"
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              {voiceSupported && (
                <button
                  onClick={toggleVoice}
                  title={isListening ? 'Stop voice input' : 'Start voice input'}
                  className={`p-2 rounded-lg border font-medium transition-all ${
                    isListening
                      ? 'bg-red-50 border-red-300 text-red-600 animate-pulse'
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600'
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              )}
              <button
                onClick={handleSubmit}
                disabled={submitting || !inputText.trim()}
                title="Submit prompt (Enter)"
                className="p-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white border border-blue-500 disabled:opacity-40 transition-all"
              >
                {submitting || ragSearching
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Options row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-600 select-none">
                <input
                  type="checkbox"
                  checked={ragEnabled}
                  onChange={e => setRagEnabled(e.target.checked)}
                  className="rounded w-3 h-3"
                />
                <Brain className="w-3 h-3 text-purple-500" />
                Search Knowledge Base
              </label>
              {ragSources.length > 0 && (
                <div className="flex items-center gap-1">
                  <BookOpen className="w-3 h-3 text-blue-500" />
                  <span className="text-[10px] text-blue-600">Context from: {ragSources.join(', ')}</span>
                </div>
              )}
            </div>
            <span className="text-[10px] text-slate-400">
              {voiceSupported ? 'Voice supported · ' : ''}Enter to send · Shift+Enter for newline
            </span>
          </div>

          {/* RAG context preview */}
          {ragContext && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 relative">
              <button onClick={() => { setRagContext(''); setRagSources([]); }}
                className="absolute top-2 right-2 p-0.5 hover:bg-purple-100 rounded">
                <X className="w-3 h-3 text-purple-400" />
              </button>
              <p className="text-[10px] font-semibold text-purple-700 mb-1">📚 KB Context Injected:</p>
              <p className="text-[10px] text-purple-600 line-clamp-4 font-mono">{ragContext}</p>
            </div>
          )}

          {/* Prompt history panel */}
          {showHistory && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-slate-600 flex items-center gap-1">
                  <History className="w-3 h-3" /> Recent Prompts
                </span>
                <button onClick={() => setShowHistory(false)} className="p-0.5 hover:bg-slate-200 rounded">
                  <X className="w-3 h-3 text-slate-400" />
                </button>
              </div>
              {loadingHistory ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                </div>
              ) : history.length === 0 ? (
                <p className="text-[10px] text-slate-400 text-center py-4">No prompt history for this module yet.</p>
              ) : (
                history.map(h => (
                  <button key={h.id} onClick={() => { setInputText(h.prompt_text); setShowHistory(false); }}
                    className="w-full text-left hover:bg-white rounded p-2 border border-transparent hover:border-slate-200 transition-all group">
                    <div className="flex items-center gap-1 mb-0.5">
                      {h.input_type === 'voice' ? <Mic className="w-2.5 h-2.5 text-red-400" /> : <Send className="w-2.5 h-2.5 text-blue-400" />}
                      <span className="text-[10px] text-slate-700 font-semibold truncate">{h.prompt_text}</span>
                    </div>
                    <span className="text-[9px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-2 h-2" />
                      {new Date(h.created_at).toLocaleString()}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
