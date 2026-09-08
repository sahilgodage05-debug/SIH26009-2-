'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  Bot, 
  User, 
  Maximize2, 
  Minimize2, 
  Trash2, 
  Copy, 
  Check, 
  Sparkles,
  Info,
  ChevronRight
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestedFollowUps?: string[];
}

interface MiningSatelliteRAGStudioProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_QUESTIONS = [
  "How many workers are at Balaghat Mine?",
  "How does rock blasting work?",
  "Show Balaghat satellite data",
  "Why do dump truck tires overheat?",
  "What is the Lilly Blastability Index?",
  "Are the mine slopes stable and safe?"
];

export const MiningSatelliteRAGStudio: React.FC<MiningSatelliteRAGStudioProps> = ({
  isOpen,
  onClose
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Friendly initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: "👋 **Hi! I'm your MOIL Mining Assistant.**\n\nI can answer any questions about our manganese mines in simple language. For example:\n- **HR & Workforce Data**: Personnel headcount (Balaghat: 2,750 workers, Dongri: 900), shifts, and crew roles\n- **Rock Blasting**: Powder factors, Lilly Blastability Index, and ground vibration limits\n- **Ground Stability**: Sentinel-1 InSAR displacement and Sentinel-2 satellite scans\n- **Fleet Operations**: Dump truck speeds, tire TKPH safety, and shovel loading times\n\n**What would you like to explore today?**",
          suggestedFollowUps: [
            "How many workers are at Balaghat Mine?",
            "How does rock blasting work?",
            "Show Balaghat satellite data"
          ]
        }
      ]);
    }
  }, [messages.length]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Auto-focus input
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSend = async (questionText?: string) => {
    const textToSubmit = questionText || inputText;
    if (!textToSubmit.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: 'usr_' + Date.now(),
      sender: 'user',
      text: textToSubmit,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/v1/rag/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: textToSubmit,
          top_k: 5
        })
      });

      if (res.ok) {
        const data = await res.json();
        
        // Context-aware follow-up suggestions
        let followUps: string[] = [];
        const qLow = textToSubmit.toLowerCase();
        if (qLow.includes('worker') || qLow.includes('personnel') || qLow.includes('workforce') || qLow.includes('staff')) {
          followUps = ["How many workers are at Dongri Buzurg?", "What are the shift timings at Balaghat?", "Show total MOIL personnel directory"];
        } else if (qLow.includes('blast') || qLow.includes('lilly')) {
          followUps = ["What is the Kuz-Ram fragment size formula?", "What are safe ground vibration limits?"];
        } else if (qLow.includes('satellite') || qLow.includes('balaghat')) {
          followUps = ["Show Gumgaon satellite data", "How do satellites detect manganese?"];
        } else if (qLow.includes('tire') || qLow.includes('tkph') || qLow.includes('truck')) {
          followUps = ["What are the 4 haul cycle phases?", "How is tare carryback detected?"];
        } else {
          followUps = ["How many workers are at Balaghat Mine?", "Show Balaghat satellite data", "How does rock blasting work?"];
        }

        const aiMsg: ChatMessage = {
          id: 'ai_' + Date.now(),
          sender: 'assistant',
          text: data.answer || "I checked our records, but couldn't find a direct answer. Please try asking in another way!",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedFollowUps: followUps
        };

        setMessages(prev => [...prev, aiMsg]);
      } else {
        const errorMsg: ChatMessage = {
          id: 'err_' + Date.now(),
          sender: 'assistant',
          text: "I'm having trouble connecting to the mining service right now. Please try again in a few seconds.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: 'err_' + Date.now(),
        sender: 'assistant',
        text: "Could not reach the server. Please ensure the backend application is running on port 8000.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'welcome_' + Date.now(),
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: "Conversation cleared! What would you like to ask about our mines or operations?"
      }
    ]);
  };

  // Human-friendly simple text & markdown formatter
  const renderSimpleFormattedText = (rawText: string) => {
    const lines = rawText.split('\n');
    const elements: React.ReactNode[] = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Skip internal debug brackets or technical tags if any remain
      if (trimmed.startsWith('### [MOIL Grounded') || trimmed.startsWith('#### 3. Source Verification')) {
        return;
      }

      // Headers
      if (trimmed.startsWith('### ')) {
        elements.push(
          <h4 key={idx} className="text-xs font-bold text-white mt-2.5 mb-1 flex items-center gap-1.5">
            <span className="w-1 h-3 rounded bg-emerald-400 inline-block" />
            {trimmed.replace('### ', '')}
          </h4>
        );
        return;
      }

      // Bullet points
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const content = trimmed.replace(/^[-*]\s+/, '');
        elements.push(
          <div key={idx} className="flex items-start gap-2 text-xs text-slate-300 my-1 pl-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
            <div className="leading-relaxed">{renderInlineHighlights(content)}</div>
          </div>
        );
        return;
      }

      // Formula or Quote Box
      if (trimmed.startsWith('`') && trimmed.endsWith('`') && trimmed.length > 5) {
        elements.push(
          <div key={idx} className="my-2 p-2 rounded-lg bg-slate-900 border border-slate-700/80 font-mono text-emerald-300 text-xs shadow-inner">
            {trimmed.slice(1, -1)}
          </div>
        );
        return;
      }

      // Regular paragraph
      if (trimmed) {
        elements.push(
          <p key={idx} className="text-xs text-slate-300 leading-relaxed my-1">
            {renderInlineHighlights(trimmed)}
          </p>
        );
      }
    });

    return elements;
  };

  // Inline bold and code styling
  const renderInlineHighlights = (text: string) => {
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-800 text-emerald-300 font-mono text-[11px] border border-slate-700">
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="text-white font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed z-[2500] transition-all duration-200 ease-out ${
      isFullScreen 
        ? 'inset-3 sm:inset-6 flex items-center justify-center' 
        : 'bottom-4 right-4 w-[95vw] sm:w-[480px] md:w-[520px] h-[600px] max-h-[85vh]'
    }`}>
      <div className={`w-full h-full bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl ${
        isFullScreen ? 'max-w-5xl h-[88vh]' : ''
      }`}>
        
        {/* Simple & Clean Chat Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/80 select-none">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-emerald-500/20">
                <Bot className="w-5 h-5 text-slate-900" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-white tracking-wide">MOIL Mining Assistant</h3>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Ready to help
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Ask anything about mines, equipment, or satellite data in simple words
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleClearHistory}
              title="Clear chat history"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              title={isFullScreen ? "Minimize window" : "Expand window"}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClose}
              title="Close chat"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chat Messages Conversation Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 font-sans select-text">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-emerald-400" />
                </div>
              )}

              <div className={`flex flex-col max-w-[85%] ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md rounded-tr-none font-medium'
                      : 'bg-slate-950/80 border border-slate-800 text-slate-200 shadow-sm rounded-tl-none w-full'
                  }`}
                >
                  {msg.sender === 'user' ? (
                    <p>{msg.text}</p>
                  ) : (
                    <div>
                      {renderSimpleFormattedText(msg.text)}

                      {/* Interactive Suggested Follow-Up Chips */}
                      {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                          <span className="text-[10px] text-slate-500 w-full mb-0.5">Suggested follow-ups:</span>
                          {msg.suggestedFollowUps.map((prompt, pIdx) => (
                            <button
                              key={pIdx}
                              onClick={() => handleSend(prompt)}
                              className="px-2.5 py-1 rounded-full text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition-colors flex items-center gap-1"
                            >
                              <span>{prompt}</span>
                              <ChevronRight className="w-2.5 h-2.5 text-slate-500" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Subtle Action Bar */}
                <div className="flex items-center gap-2 mt-1 px-1 text-[10px] text-slate-500 font-mono">
                  <span>{msg.timestamp}</span>
                  {msg.sender === 'assistant' && (
                    <button
                      onClick={() => handleCopyText(msg.id, msg.text)}
                      className="hover:text-slate-300 flex items-center gap-1 transition-colors"
                      title="Copy message"
                    >
                      {copiedId === msg.id ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                      <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                </div>
              </div>

              {msg.sender === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-emerald-600/30 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-1">
                  <User className="w-4 h-4 text-emerald-300" />
                </div>
              )}
            </div>
          ))}

          {/* Simple Human-Friendly Typing Indicator */}
          {isLoading && (
            <div className="flex gap-2.5 justify-start items-center animate-in fade-in duration-150">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="px-4 py-2.5 rounded-2xl rounded-tl-none bg-slate-950/80 border border-slate-800 text-xs text-slate-400 flex items-center gap-2 shadow-sm">
                <span className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                <span className="text-[11px] text-slate-400 ml-1">Thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Pills */}
        <div className="px-3 py-2 border-t border-slate-800/60 bg-slate-950/50 flex items-center gap-1.5 overflow-x-auto no-scrollbar select-none">
          <span className="text-[10px] text-slate-500 whitespace-nowrap pl-1">Ask:</span>
          {QUICK_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              disabled={isLoading}
              className="px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 hover:border-emerald-500/50 transition-colors shrink-0"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Clean Input Bar */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Type your question here... (e.g. What is Balaghat satellite data?)"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            disabled={isLoading}
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 focus:border-emerald-500 text-xs text-white placeholder-slate-500 outline-none transition-all focus:ring-1 focus:ring-emerald-500/30"
          />

          <button
            onClick={() => handleSend()}
            disabled={isLoading || !inputText.trim()}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-900/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 shrink-0"
            title="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
