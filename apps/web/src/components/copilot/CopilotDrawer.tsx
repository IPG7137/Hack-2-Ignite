import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Bot, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { CopilotMessage } from '../../types/ai';
import { Complaint } from '../../types/complaint';
import { aiService } from '../../services/aiService';
import { CopilotMarkdown } from './CopilotMarkdown';

interface CopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  complaints: Complaint[];
  onSelectComplaint?: (id: string) => void;
}

export const CopilotDrawer: React.FC<CopilotDrawerProps> = ({
  isOpen,
  onClose,
  complaints,
  onSelectComplaint,
}) => {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'MSG-INIT',
      sender: 'assistant',
      content: `### 🏛️ Municipal Operations Intelligence Online
Hello Officer! I am your **AI Copilot**, grounded in the **${complaints.length} active incidents** in your command matrix.

You can click any prompt chip below or type an inquiry regarding road safety clusters, SLA breach countdowns, or shift handover briefings.`,
      timestamp: new Date().toISOString(),
      suggestedPrompts: [
        'Give me a briefing for the municipal commissioner',
        'What are today\'s highest-priority complaints?',
        'Where are the emerging hotspots?',
        'Which complaints are currently overdue?',
      ],
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing]);

  const handleSend = async (query: string) => {
    if (!query.trim() || isProcessing) return;

    const userMsg: CopilotMessage = {
      id: `chat-msg-${Date.now()}`,
      sender: 'user',
      content: query,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsProcessing(true);

    try {
      const response = await aiService.askCopilot(query, complaints);
      setMessages((prev) => [...prev, response]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ERR-${Date.now()}`,
          sender: 'assistant',
          content: `⚠️ Failed to generate AI analysis: ${err.message}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-lg bg-white border-l border-[#D9E2EC] shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#D9E2EC] bg-[#F8FAFC]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-[#1769D2]">
              <Sparkles className="w-4 h-4 text-[#1769D2]" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#123B6D] uppercase tracking-wider flex items-center gap-1.5">
                AI Municipal Copilot
                <span className="text-[9px] font-mono px-1.5 py-0.5 bg-emerald-50 text-[#16803C] border border-emerald-200 rounded font-semibold">
                  GROUNDED
                </span>
              </h3>
              <p className="text-[10px] text-[#526581]">Gemini 1.5 Flash • Active Feed Context</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 text-[#718096] hover:text-[#172B4D]">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Quick Prompt Chips */}
        <div className="p-3 border-b border-[#E8EEF5] bg-[#F8FAFC]/50">
          <div className="text-[10px] uppercase font-mono tracking-wider text-[#526581] font-bold mb-1.5">
            Command Quick Actions
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              '🚨 High-priority this week',
              '⏳ Overdue complaints',
              '🗑️ Waste recurring issues',
              '📋 Daily handover report',
            ].map((chip) => (
              <button
                key={chip}
                onClick={() => handleSend(chip)}
                className="text-[11px] px-2.5 py-1 rounded bg-white hover:bg-blue-50 border border-[#D9E2EC] hover:border-[#1769D2]/40 text-[#172B4D] hover:text-[#1769D2] shadow-xs transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Message Stream */}
        <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#F8FAFC]/30">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[92%] rounded-lg p-3 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-[#1769D2] text-white font-medium shadow-sm'
                    : 'bg-white border border-[#D9E2EC] text-[#172B4D] shadow-sm'
                }`}
              >
                <CopilotMarkdown
                  content={msg.content}
                  isUser={msg.sender === 'user'}
                  onSelectComplaint={(id) => {
                    onSelectComplaint?.(id);
                    onClose();
                  }}
                />

                {/* Cited tickets if any */}
                {msg.referencedComplaintIds && msg.referencedComplaintIds.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-[#E8EEF5] flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] uppercase font-mono text-[#526581]">Referenced:</span>
                    {msg.referencedComplaintIds.map((id) => (
                      <button
                        key={id}
                        onClick={() => {
                          onSelectComplaint?.(id);
                          onClose();
                        }}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-[#1769D2] hover:bg-blue-100 font-medium"
                      >
                        #{id}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-[#718096] px-1 mt-1 font-mono">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}

          {isProcessing && (
            <div className="flex items-center gap-2 p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-[#1769D2]">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Analyzing complaint telemetry and synthesizing response...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-[#D9E2EC] bg-[#F8FAFC]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(inputValue);
            }}
            className="flex items-center gap-2"
          >
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask Copilot about active municipal complaints..."
              className="bg-white border-[#D9E2EC] text-[#172B4D] text-xs"
            />
            <Button type="submit" variant="primary" size="sm" loading={isProcessing} className="px-3 shrink-0">
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
