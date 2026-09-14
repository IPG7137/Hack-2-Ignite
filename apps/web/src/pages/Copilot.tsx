import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Sparkles,
  Send,
  Shield,
  FileText,
  Cpu,
  AlertCircle,
  AlertTriangle,
  Flame,
  Layers,
  FileCheck2,
  Clock,
  Compass,
  ArrowRight,
  RefreshCw,
  HelpCircle,
  MessageSquare,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Complaint } from '../types/complaint';
import { CopilotMessage } from '../types/ai';
import { CopilotService } from '../services/copilotService';

import { useAuthContext } from '../context/AuthContext';

interface CopilotStudioProps {
  complaints: Complaint[];
  onSelectComplaint?: (id: string) => void;
}

export const Copilot: React.FC<CopilotStudioProps> = ({ complaints = [], onSelectComplaint }) => {
  const { user } = useAuthContext();
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'MSG-INIT-1',
      sender: 'assistant',
      content: `### 🏛️ Municipal AI Copilot Operational Desk

I am your evidence-grounded Municipal Intelligence Copilot. I analyze live grievance telemetry using deterministic **Phases 3A–3E Civic Intelligence Engines**:

- **Phase 3A:** Similarity & Duplicate Analysis (200m spatial + text embeddings)
- **Phase 3B:** Smart Civic Priority (5 weighted signals: Severity, Safety, Clusters, Age, Category)
- **Phase 3C:** Emerging Problems & Hotspots (500m localized surge detection)
- **Phase 3D:** Potential Common Incidents (Multi-report work order grouping)
- **Phase 3E:** Resolution Verification (Before/after proof & citizen feedback sentiment)

Currently evaluating **${complaints.length} live municipal reports**. Select a quick operational query below or ask any custom question.`,
      timestamp: new Date().toISOString(),
      referencedComplaintIds: [],
      suggestedPrompts: [
        "What are today's highest-priority complaints in Solapur?",
        'Where are the emerging hotspots in Solapur?',
        'Which complaints may belong to the same incident?',
        'Which resolved cases need verification?',
        'Give me a briefing for the Solapur Municipal Commissioner',
      ],
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleAsk = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: CopilotMessage = {
      id: `chat-msg-${Date.now()}`,
      sender: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const securityContext = {
        userId: user?.id,
        role: user?.role,
        isStaff: user?.role !== 'citizen',
        departmentId: user?.departmentId,
      };
      const resp = await CopilotService.answerOfficerQuery(text, complaints, securityContext);
      setMessages((prev) => [...prev, resp]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `MSG-ERR-${Date.now()}`,
          sender: 'assistant',
          content: `### ⚠️ Telemetry Exception\n\nUnable to complete intelligence query. Please verify that live Supabase complaints are loaded.`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const operationalShortcuts = [
    {
      icon: <AlertTriangle className="w-3.5 h-3.5 text-[#D92D20]" />,
      label: 'Critical Dispatch Cases',
      prompt: "What are today's highest-priority complaints?",
      tag: 'Phase 3B',
    },
    {
      icon: <Flame className="w-3.5 h-3.5 text-[#EA580C]" />,
      label: 'Emerging Hotspots (500m)',
      prompt: 'Where are the emerging hotspots?',
      tag: 'Phase 3C',
    },
    {
      icon: <Layers className="w-3.5 h-3.5 text-[#D99A00]" />,
      label: 'Common Incident Clusters',
      prompt: 'Which complaints may belong to the same incident?',
      tag: 'Phase 3D',
    },
    {
      icon: <FileCheck2 className="w-3.5 h-3.5 text-[#16803C]" />,
      label: 'Resolution Audit Flags',
      prompt: 'Which resolved cases need verification?',
      tag: 'Phase 3E',
    },
    {
      icon: <Clock className="w-3.5 h-3.5 text-red-600" />,
      label: 'SLA Breaches & Overdue',
      prompt: 'Which complaints are overdue?',
      tag: 'SLA',
    },
    {
      icon: <Cpu className="w-3.5 h-3.5 text-[#1769D2]" />,
      label: 'Commissioner Briefing',
      prompt: 'Give me a briefing for the municipal commissioner',
      tag: 'Executive',
    },
    {
      icon: <FileText className="w-3.5 h-3.5 text-slate-600" />,
      label: 'Roads Dept Summary',
      prompt: 'Summarize the situation for the roads department',
      tag: 'Ward',
    },
    {
      icon: <FileText className="w-3.5 h-3.5 text-blue-600" />,
      label: 'Water & Sewage Summary',
      prompt: 'Summarize the situation for the water supply department',
      tag: 'Ward',
    },
  ];

  return (
    <div className="space-y-4 max-w-7xl mx-auto h-[calc(100vh-6.5rem)] flex flex-col pb-2">
      {/* Header Banner */}
      <div className="pb-2 border-b border-[#D9E2EC] flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-[#1769D2]/10 text-[#1769D2]">
              <Compass className="w-5 h-5" />
            </span>
            <h1 className="text-base font-bold uppercase tracking-wider text-[#172B4D]">
              Municipal AI Copilot Command Studio
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-[#16803C] border border-emerald-200">
              Grounded 3A–3E Telemetry
            </span>
          </div>
          <p className="text-xs text-[#526581] mt-0.5">
            Evidence-constrained natural language synthesis over {complaints.length} live Supabase records.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-[#526581]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 live-pulse-dot" />
          <span>Deterministic Source of Truth: <strong>Active</strong></span>
        </div>
      </div>

      {/* Main Studio Split */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Left: Interactive Chat Stream (8 cols) */}
        <Card className="lg:col-span-8 flex flex-col h-full border-[#D9E2EC] bg-white shadow-sm overflow-hidden">
          {/* Scrollable Conversation Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#F8FAFC]/40">
            {messages.map((m) => {
              const isUser = m.sender === 'user';

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[92%] rounded-lg p-4 text-xs leading-relaxed ${
                      isUser
                        ? 'bg-[#1769D2] text-white font-medium shadow-xs'
                        : 'bg-white border border-[#D9E2EC] text-[#172B4D] shadow-xs'
                    }`}
                  >
                    <div className="whitespace-pre-wrap font-sans space-y-2">
                      {m.content.split('\n\n').map((para, pIdx) => {
                        if (para.startsWith('### ')) {
                          return (
                            <h3
                              key={pIdx}
                              className={`text-sm font-bold ${
                                isUser ? 'text-white' : 'text-[#172B4D]'
                              } pb-1 border-b ${isUser ? 'border-white/20' : 'border-slate-100'}`}
                            >
                              {para.replace('### ', '')}
                            </h3>
                          );
                        }
                        if (para.startsWith('#### ')) {
                          return (
                            <h4
                              key={pIdx}
                              className={`text-xs font-bold uppercase tracking-wider ${
                                isUser ? 'text-white' : 'text-[#1769D2]'
                              } pt-1`}
                            >
                              {para.replace('#### ', '')}
                            </h4>
                          );
                        }
                        return <p key={pIdx}>{para}</p>;
                      })}
                    </div>

                    {/* Grounded Citation Badges */}
                    {!isUser && m.referencedComplaintIds && m.referencedComplaintIds.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-[#E8EEF5] flex flex-wrap gap-1.5 items-center">
                        <span className="text-[10px] font-mono font-bold uppercase text-[#526581]">
                          Grounded Citations:
                        </span>
                        {m.referencedComplaintIds.map((id) => (
                          <button
                            key={id}
                            onClick={() => onSelectComplaint?.(id)}
                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-[#1769D2] hover:bg-blue-100 font-bold transition-colors flex items-center gap-1"
                          >
                            <span>#{id}</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Suggested follow-up prompt chips */}
                    {!isUser && m.suggestedPrompts && m.suggestedPrompts.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-[#E8EEF5]/60 space-y-1.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#718096]">
                          Suggested Follow-up Inquiries:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {m.suggestedPrompts.map((sPrompt, sIdx) => (
                            <button
                              key={sIdx}
                              onClick={() => handleAsk(sPrompt)}
                              className="text-[10px] px-2 py-1 rounded bg-slate-100 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-[#526581] hover:text-[#1769D2] transition-colors text-left"
                            >
                              💬 {sPrompt}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <span className="text-[10px] text-[#718096] font-mono px-1 mt-1">
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 p-3 bg-blue-50/80 border border-blue-200 rounded-lg text-xs text-[#1769D2] animate-pulse">
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Evaluating Phase 3A–3E deterministic engines & synthesizing grounded briefing...</span>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="p-3 border-t border-[#D9E2EC] bg-[#F8FAFC]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAsk(input);
              }}
              className="flex items-center gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Copilot: 'Why is complaint #comp-101 high priority?' or 'Where are the emerging hotspots?'..."
                className="text-xs bg-white border-[#D9E2EC] text-[#172B4D] focus:border-[#1769D2]"
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={loading}
                className="px-4 shrink-0 bg-[#1769D2] hover:bg-[#1457B0] text-white"
              >
                <Send className="w-3.5 h-3.5 mr-1" />
                <span>Ask</span>
              </Button>
            </form>
          </div>
        </Card>

        {/* Right: Operational Macros & Engine Architecture (4 cols) */}
        <div className="lg:col-span-4 space-y-3 flex flex-col min-h-0 overflow-y-auto">
          {/* Quick Shortcuts */}
          <Card className="p-3.5 border-[#D9E2EC] bg-white shadow-sm space-y-2.5 shrink-0">
            <div className="text-xs font-bold uppercase tracking-wider text-[#172B4D] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#1769D2]" />
                <span>Operational Inquiries</span>
              </span>
              <span className="text-[10px] font-mono text-[#526581]">1-Click</span>
            </div>
            <p className="text-[11px] text-[#526581]">
              Instant queries evaluated across live grievance telemetry:
            </p>

            <div className="space-y-1.5">
              {operationalShortcuts.map((sc, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAsk(sc.prompt)}
                  className="w-full text-left p-2 rounded-md bg-white hover:bg-blue-50/60 border border-[#D9E2EC] hover:border-[#1769D2]/40 text-xs text-[#172B4D] hover:text-[#1769D2] transition-colors flex items-center justify-between shadow-2xs group"
                >
                  <span className="flex items-center gap-2 truncate">
                    {sc.icon}
                    <span className="truncate font-medium">{sc.label}</span>
                  </span>
                  <span className="text-[10px] font-mono text-[#718096] group-hover:text-[#1769D2] shrink-0 ml-1">
                    {sc.tag} ➔
                  </span>
                </button>
              ))}
            </div>
          </Card>

          {/* Engine Grounding Architecture Metadata */}
          <Card className="p-3.5 border-[#D9E2EC] bg-white shadow-sm space-y-2.5 flex-1">
            <div className="text-xs font-bold uppercase tracking-wider text-[#172B4D] flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#16803C]" />
              <span>Grounded Architecture</span>
            </div>

            <div className="space-y-2 text-xs text-[#526581]">
              <div className="p-2 rounded bg-slate-50 border border-slate-200 space-y-1">
                <div className="text-[10px] font-bold uppercase text-[#172B4D]">Source of Truth</div>
                <div className="text-[11px]">Deterministic 3A–3E Engines calculate all scores and clusters.</div>
              </div>

              <div className="p-2 rounded bg-slate-50 border border-slate-200 space-y-1">
                <div className="text-[10px] font-bold uppercase text-[#172B4D]">GenAI Role</div>
                <div className="text-[11px]">Natural-language explanation & decision-support synthesis only.</div>
              </div>

              <div className="p-2 rounded bg-slate-50 border border-slate-200 space-y-1">
                <div className="text-[10px] font-bold uppercase text-[#172B4D]">Hallucination Guard</div>
                <div className="text-[11px]">Rejects unverified or absent records with safe fallback messages.</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Copilot;
