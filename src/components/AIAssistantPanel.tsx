import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, RefreshCw, ChevronDown, ChevronUp, Sparkles, Minimize2, Maximize2, MessageCircle, Copy, Check, Zap } from 'lucide-react';
import { apiUrl } from '@/src/config/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIAssistantPanelProps {
  currentModule?: string;
  currentProjectId?: string;
  currentSprintId?: string;
  contextData?: Record<string, any>;
}

// Module-specific suggestion prompts
const MODULE_PROMPTS: Record<string, string[]> = {
  dashboard: [
    'Summarize the current quality health of this project',
    'What are the top 3 risks I should address today?',
    'Which test cases have the lowest pass rate this sprint?',
  ],
  requirements: [
    'Review my latest requirement for testability gaps',
    'What acceptance criteria am I missing for this feature?',
    'Generate edge cases for this user story',
  ],
  testcases: [
    'Suggest additional negative test cases',
    'Which test cases can be merged or are redundant?',
    'What is the best priority order for these test cases?',
  ],
  scripts: [
    'How do I fix a flaky selector in Robot Framework?',
    'Generate a Page Object Model for a login form',
    'What is the best way to handle async waits in Playwright?',
  ],
  execution: [
    'Why might these test cases be failing intermittently?',
    'Analyze my test execution trend and suggest fixes',
    'What environment issues could cause these failures?',
  ],
  defects: [
    'Classify these defects by root cause pattern',
    'Which defects are most likely to block the release?',
    'Suggest regression tests for the top 5 critical bugs',
  ],
  performance: [
    'Analyze my p95 latency and suggest optimizations',
    'What database indexes should I add to reduce response time?',
    'How do I configure a soak test for my checkout endpoint?',
  ],
  security: [
    'Explain how to fix an SQL injection vulnerability',
    'What OWASP Top 10 risks should I prioritize for PCI-DSS?',
    'How do I configure authenticated DAST scanning?',
  ],
  reports: [
    'Write an executive summary of this sprint\'s quality metrics',
    'What KPIs should I track for STLC health?',
    'Generate a release readiness assessment',
  ],
};

const DEFAULT_PROMPTS = [
  'Summarize the quality status of this project',
  'What should I focus on to improve test coverage?',
  'Give me a release readiness assessment',
];

export default function AIAssistantPanel({
  currentModule = 'dashboard',
  currentProjectId,
  currentSprintId,
  contextData = {},
}: AIAssistantPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const moduleKey = currentModule?.toLowerCase().replace(/[^a-z]/g, '') || 'dashboard';
  const suggestions = MODULE_PROMPTS[moduleKey] || DEFAULT_PROMPTS;

  const moduleName = currentModule
    ?.replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim() || 'Dashboard';

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  // Greet when opened for the first time in a module
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `👋 Hi! I'm your AI Quality Copilot.\n\nI can see you're in **${moduleName}**${currentProjectId && currentProjectId !== 'ALL' ? ` for project **${currentProjectId}**` : ''}.\n\nHow can I help you right now? You can ask me anything about testing strategy, defect analysis, quality metrics, or use one of the suggestions below.`,
        timestamp: new Date(),
      }]);
    }
  }, [isOpen]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Message = { role: 'user', content: text.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('iq_token');
      const res = await fetch(apiUrl('/api/quality/ai/assistant'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          message: text.trim(),
          module: currentModule,
          projectId: currentProjectId,
          sprintId: currentSprintId,
          history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
          context: contextData,
        })
      });

      const data = await res.json();
      const reply = data.reply || data.message || data.content || generateFallbackReply(text, currentModule, contextData);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: generateFallbackReply(text, currentModule, contextData),
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyMessage = (idx: number, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const clearHistory = () => {
    setMessages([]);
    setTimeout(() => {
      setMessages([{
        role: 'assistant',
        content: `Context cleared. I'm still here to help with **${moduleName}**. What would you like to explore?`,
        timestamp: new Date(),
      }]);
    }, 100);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl shadow-xl transition-all hover:shadow-2xl hover:scale-105 active:scale-95"
        title="Open AI Quality Copilot"
      >
        <Bot className="w-5 h-5" />
        <span className="text-sm font-bold">AI Copilot</span>
        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex flex-col bg-white border border-slate-200 rounded-2xl shadow-2xl transition-all duration-300 ${
        isMinimized ? 'w-72 h-14' : 'w-[400px] h-[580px]'
      }`}
      style={{ maxHeight: 'calc(100vh - 80px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-2xl flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Bot className="w-5 h-5 text-white" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full border border-white" />
          </div>
          <div>
            <span className="text-sm font-bold text-white">AI Copilot</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-purple-200 font-mono">
                {moduleName}
                {currentProjectId && currentProjectId !== 'ALL' ? ` · ${currentProjectId}` : ''}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsMinimized(v => !v)}
            className="text-purple-200 hover:text-white transition-colors p-1 rounded"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="text-purple-200 hover:text-white transition-colors p-1 rounded"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`group relative max-w-[85%] ${msg.role === 'user' ? 'order-2' : 'order-1'}`}>
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-1 mb-1">
                      <Bot className="w-3 h-3 text-purple-500" />
                      <span className="text-[9px] font-mono text-purple-500 font-bold">AI Copilot</span>
                    </div>
                  )}
                  <div className={`rounded-2xl px-3 py-2.5 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-br-md'
                      : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-bl-md'
                  }`}>
                    {msg.content.split('\n').map((line, i) => {
                      const boldLine = line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
                      return (
                        <span key={i} className="block">
                          <span dangerouslySetInnerHTML={{ __html: boldLine || '&nbsp;' }} />
                        </span>
                      );
                    })}
                  </div>
                  {/* Copy button on hover */}
                  {msg.role === 'assistant' && (
                    <button
                      onClick={() => copyMessage(idx, msg.content)}
                      className="absolute top-5 -right-6 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-slate-600 transition-all"
                      title="Copy response"
                    >
                      {copiedIdx === idx ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                  <div className="mt-0.5 text-[9px] text-slate-400 font-mono text-right">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {messages.length <= 1 && !isLoading && (
            <div className="px-4 py-2 border-t border-slate-100 space-y-1.5 flex-shrink-0">
              <span className="text-[9px] font-mono uppercase text-slate-400 tracking-wider flex items-center gap-1">
                <Zap className="w-3 h-3 text-purple-400" /> Suggestions for {moduleName}
              </span>
              <div className="flex flex-col gap-1">
                {suggestions.slice(0, 3).map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s)}
                    className="text-left text-[11px] text-slate-600 hover:text-purple-700 bg-purple-50/50 hover:bg-purple-50 border border-purple-100 hover:border-purple-200 rounded-lg px-2.5 py-1.5 transition-all font-mono leading-snug"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="px-4 py-3 border-t border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(inputText); } }}
                placeholder={`Ask anything about ${moduleName}...`}
                disabled={isLoading}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-300 transition-all disabled:opacity-60 font-sans"
              />
              <button
                onClick={() => sendMessage(inputText)}
                disabled={!inputText.trim() || isLoading}
                className="flex-shrink-0 p-2 bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[9px] text-slate-400 font-mono">Enter to send · Context: {moduleName}</span>
              {messages.length > 1 && (
                <button onClick={clearHistory} className="text-[9px] text-slate-400 hover:text-rose-500 font-mono transition-colors">
                  Clear history
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Fallback AI reply generator when API is unavailable
function generateFallbackReply(message: string, module: string, context: Record<string, any>): string {
  const msg = message.toLowerCase();

  if (msg.includes('summary') || msg.includes('status') || msg.includes('health')) {
    return `📊 **Quality Health Summary**\n\nBased on your current project data:\n\n- **Test Coverage**: Review your test cases to ensure all requirements have at least 1 mapped test.\n- **Defect Trend**: Monitor your open defect count — aim for less than 5 critical/high issues before release.\n- **Automation**: Increase your automatable test case percentage above 70% for faster regression cycles.\n\n💡 Tip: Use the Live Dashboard to see real-time STLC progress across all personas.`;
  }

  if (msg.includes('risk') || msg.includes('priorit')) {
    return `⚠️ **Risk Prioritization Advice**\n\nFocus on these areas first:\n\n1. **Critical defects** — Any open critical defect should block release until fixed.\n2. **Untested requirements** — Requirements with 0 test cases are a coverage blind spot.\n3. **Failing automations** — Investigate flaky tests that reduce confidence in your regression suite.\n\nWould you like me to drill into a specific risk area?`;
  }

  if (msg.includes('robot') || msg.includes('.robot') || msg.includes('keyword')) {
    return `🤖 **Robot Framework Guidance**\n\nFor robust .robot test files:\n\n\`\`\`robot\n*** Settings ***\nLibrary    SeleniumLibrary\nSuite Setup    Open Browser    \${URL}    chrome\nSuite Teardown    Close All Browsers\n\n*** Keywords ***\nVerify Element Visible\n    [Arguments]    \${locator}\n    Wait Until Element Is Visible    \${locator}    timeout=15s\n\`\`\`\n\nKey tips:\n- Use **data-testid** attributes for stable locators\n- Always use Suite Setup/Teardown for browser lifecycle\n- Extract reusable steps into Keywords`;
  }

  if (msg.includes('performance') || msg.includes('latency') || msg.includes('p95') || msg.includes('slow')) {
    return `⚡ **Performance Optimization Advice**\n\nTo reduce latency:\n\n1. **Database queries** — Add indexes on frequently filtered columns (user_id, created_at)\n2. **Connection pooling** — Ensure DB pool size matches your VU count × 0.3\n3. **Caching** — Cache frequent read-only responses (TTL: 60-300s) in Redis\n4. **k6 insight** — If p95 > 500ms at 250 VUs, you likely have a blocking I/O bottleneck\n\nWould you like a specific optimization recommendation for your current endpoint?`;
  }

  if (msg.includes('security') || msg.includes('vulnerab') || msg.includes('owasp')) {
    return `🔒 **Security Guidance**\n\nTop OWASP-aligned fixes:\n\n1. **SQL Injection** — Use parameterized queries, never string concatenation\n2. **XSS** — Sanitize all user input, use Content-Security-Policy headers\n3. **Auth** — Implement JWT expiry + refresh token rotation\n4. **CORS** — Restrict origins to known domains only\n\nFor DAST scanning of authenticated pages, use the "Authenticated DAST Credentials" panel in Security Testing.`;
  }

  return `I'm your AI Quality Copilot for **${module || 'this module'}**.\n\nI can help with:\n- Test strategy and coverage analysis\n- Defect pattern recognition\n- Test automation code generation\n- Performance bottleneck analysis\n- Security vulnerability remediation\n- Compliance reporting\n\nPlease ask me anything specific — or try one of the suggestion prompts below the chat.`;
}
