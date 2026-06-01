import { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Sparkles, X, Terminal, ArrowRight, User, HelpCircle, ThumbsUp, ThumbsDown, Database, TrendingUp, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatbotProps {
  onSendMessage: (msg: string) => Promise<string>;
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatbotSlideout({
  onSendMessage,
  isOpen,
  onClose,
}: ChatbotProps) {
  const [votedMsgs, setVotedMsgs] = useState<Record<number, 'up' | 'down'>>({});

  // REQ-92: KB analytics state
  const [showKbAnalytics, setShowKbAnalytics] = useState(false);
  const [kbAnalytics, setKbAnalytics] = useState<any>(null);
  const [kbLoading, setKbLoading] = useState(false);

  const loadKbAnalytics = async () => {
    setKbLoading(true);
    try {
      const res = await fetch('/api/quality/rag/analytics');
      if (res.ok) setKbAnalytics(await res.json());
    } finally { setKbLoading(false); }
  };

  const toggleKbAnalytics = () => {
    const next = !showKbAnalytics;
    setShowKbAnalytics(next);
    if (next && !kbAnalytics) loadKbAnalytics();
  };

  const sendFeedback = async (idx: number, vote: 'up' | 'down', content: string) => {
    setVotedMsgs(prev => ({ ...prev, [idx]: vote }));
    fetch('/api/quality/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityType: 'chat_response', entityId: `msg-${idx}`, vote, comment: content.slice(0, 100) }),
    }).catch(() => {});
  };

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hello! I am your lead Autonomous QA Specialist. I can compile custom test configurations, trigger self-healing locators, write k6 performance load matrices, and apply SQL parameter remediation. How can I help secure your pipeline today?"
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (textToSend?: string) => {
    const prompt = textToSend || inputText;
    if (!prompt.trim()) return;

    if (!textToSend) setInputText('');

    const newMsgs = [...messages, { role: 'user' as const, content: prompt }];
    setMessages(newMsgs);
    setIsTyping(true);

    try {
      const result = await onSendMessage(prompt);
      setMessages([...newMsgs, { role: 'assistant' as const, content: result }]);
    } catch (e: any) {
      setMessages([...newMsgs, { role: 'assistant' as const, content: "My active execution gateway errored. Fallback simulation active. Details: " + e.message }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handlePreset = (preset: string) => {
    handleSend(preset);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col justify-between">
      {/* Header bar controls */}
      <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <div>
            <h4 className="text-xs font-semibold font-sans tracking-wide text-slate-900 uppercase">Platform Agent Lead</h4>
            <span className="text-[9px] text-emerald-600 font-sans flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online telemetry
            </span>
          </div>
        </div>

        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Thread panel */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-slate-200 bg-slate-50">
        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          return (
            <div key={idx} className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
              <div className={`p-1.5 h-7 w-7 rounded-lg flex items-center justify-center ${
                isUser ? 'bg-purple-600 text-white' : 'bg-purple-50 border border-purple-200 text-purple-705'
              }`}>
                {isUser ? <User className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
              </div>

              <div className={`p-3 rounded-2xl text-xs leading-relaxed shadow-xs ${
                isUser 
                  ? 'bg-purple-600 text-white rounded-tr-none' 
                  : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none font-sans font-normal'
              }`}>
                <div className="whitespace-pre-wrap select-text">{m.content}</div>
                {!isUser && idx > 0 && (
                  <div className="flex gap-1 mt-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => sendFeedback(idx, 'up', m.content)}
                      className={`p-1 rounded transition-all ${votedMsgs[idx] === 'up' ? 'text-emerald-500 bg-emerald-50' : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-50'}`}
                      title="Good response"
                    >
                      <ThumbsUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => sendFeedback(idx, 'down', m.content)}
                      className={`p-1 rounded transition-all ${votedMsgs[idx] === 'down' ? 'text-red-500 bg-red-50' : 'text-slate-400 hover:text-red-400 hover:bg-red-50'}`}
                      title="Poor response"
                    >
                      <ThumbsDown className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex gap-3 max-w-[50%] mr-auto">
            <div className="p-1.5 h-7 w-7 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4 animate-spin text-purple-600" />
            </div>
            <div className="bg-white border border-slate-200 p-2.5 rounded-2xl rounded-tl-none flex items-center gap-1 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-305 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-purple-305 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-purple-305 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Preset Fast Actions Command Panel */}
      <div className="px-4 py-3 bg-slate-50 flex flex-col gap-1.5 border-t border-slate-200">
        <label className="text-[9px] font-sans font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
          <Terminal className="w-3 h-3 text-slate-400" /> Quick Command Presets Matrix
        </label>
        <div className="grid grid-cols-1 gap-1">
          <button
            onClick={() => handlePreset('Explain the auto self-healing process')}
            className="text-left text-[10px] text-slate-600 hover:text-purple-700 hover:bg-white border border-transparent hover:border-slate-200 p-1.5 rounded font-mono transition-all flex items-center justify-between"
          >
            <span>- Trace locator self-healing sequence</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
          </button>
          <button
            onClick={() => handlePreset('Expose OWASP Top 10 SQL Injection vulnerability')}
            className="text-left text-[10px] text-slate-600 hover:text-purple-700 hover:bg-white border border-transparent hover:border-slate-200 p-1.5 rounded font-mono transition-all flex items-center justify-between"
          >
            <span>- Audit Stripe SQL inputs</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
          </button>
          <button
            onClick={() => handlePreset('How do I run a k6 performance stress loop?')}
            className="text-left text-[10px] text-slate-600 hover:text-purple-700 hover:bg-white border border-transparent hover:border-slate-200 p-1.5 rounded font-mono transition-all flex items-center justify-between"
          >
            <span>- Write k6 performance stress matrix</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
          </button>
        </div>
      </div>

      {/* REQ-92: KB Analytics Panel */}
      <div className="border-t border-slate-200 bg-white">
        <button
          onClick={toggleKbAnalytics}
          className="w-full flex items-center justify-between px-4 py-2 text-[10px] font-mono text-slate-500 hover:bg-slate-50 transition-all"
          aria-label="Toggle KB analytics panel"
        >
          <span className="flex items-center gap-1.5">
            <Database className="w-3 h-3 text-purple-500" />
            Knowledge Base Analytics
          </span>
          <div className="flex items-center gap-2">
            {kbAnalytics && (
              <span className="text-emerald-600 font-bold">{kbAnalytics.docCount} docs</span>
            )}
            {showKbAnalytics ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </div>
        </button>

        {showKbAnalytics && (
          <div className="px-4 pb-3 space-y-3 bg-slate-50 border-t border-slate-100">
            {kbLoading && (
              <p className="text-[10px] text-slate-400 text-center py-2">Loading analytics...</p>
            )}
            {!kbLoading && kbAnalytics && (
              <>
                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-1.5 pt-2">
                  <div className="bg-white rounded-lg border border-slate-200 p-2 text-center">
                    <div className="text-base font-bold text-purple-700">{kbAnalytics.docCount}</div>
                    <div className="text-[9px] text-slate-500 font-mono uppercase">Docs</div>
                  </div>
                  <div className="bg-white rounded-lg border border-slate-200 p-2 text-center">
                    <div className="text-base font-bold text-blue-700">{kbAnalytics.searchActivity?.totalSearches ?? 0}</div>
                    <div className="text-[9px] text-slate-500 font-mono uppercase">Searches</div>
                  </div>
                  <div className="bg-white rounded-lg border border-slate-200 p-2 text-center">
                    <div className="text-base font-bold text-emerald-700">{kbAnalytics.searchActivity?.avgLatencyMs ?? 0}ms</div>
                    <div className="text-[9px] text-slate-500 font-mono uppercase">Avg Latency</div>
                  </div>
                </div>

                {/* Doc status breakdown */}
                {kbAnalytics.statusBreakdown?.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono uppercase text-slate-400">Doc Status</span>
                    {kbAnalytics.statusBreakdown.map((s: any) => (
                      <div key={s.status} className="flex items-center justify-between text-[10px]">
                        <span className="font-mono text-slate-600 capitalize">{s.status || 'indexed'}</span>
                        <span className="font-bold text-slate-800">{s.cnt}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Top queries */}
                {kbAnalytics.topQueries?.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono uppercase text-slate-400 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> Top Queries
                    </span>
                    {kbAnalytics.topQueries.slice(0, 5).map((q: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-[9px] font-mono">
                        <span className="text-slate-600 truncate max-w-[75%]">{q.query}</span>
                        <span className="text-purple-600 font-bold">{q.hits}x</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Refresh button */}
                <button
                  onClick={loadKbAnalytics}
                  className="flex items-center gap-1 text-[9px] font-mono text-slate-400 hover:text-slate-600 mx-auto"
                  aria-label="Refresh KB analytics"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </>
            )}
            {!kbLoading && !kbAnalytics && (
              <p className="text-[10px] text-slate-400 text-center py-2">No data yet. Upload documents to the KB.</p>
            )}
          </div>
        )}
      </div>

      {/* Input textbox bar */}
      <div className="p-4 bg-white border-t border-slate-200 flex gap-2 items-center">
        <input
          type="text"
          placeholder="Ask QA assistant..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-400 focus:bg-white shadow-xs font-sans"
        />
        <button
          onClick={() => handleSend()}
          className="p-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white shadow-sm transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
