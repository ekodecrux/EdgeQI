import { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Sparkles, X, Terminal, ArrowRight, User, HelpCircle } from 'lucide-react';

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
