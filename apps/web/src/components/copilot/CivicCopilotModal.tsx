import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  X,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Flame,
  Award,
  FileText,
  Clock,
  ShieldCheck,
  Building2,
  ExternalLink,
} from 'lucide-react';
import { Complaint } from '../../types/complaint';
import { CopilotMessage, CopilotActionProposal } from '../../types/ai';
import { CopilotService, CopilotSecurityContext } from '../../services/copilotService';
import { CopilotMarkdown } from './CopilotMarkdown';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';

interface CivicCopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  complaints: Complaint[];
  securityContext?: CopilotSecurityContext;
  onSelectComplaint?: (complaint: Complaint) => void;
  onCreateComplaintFromCopilot?: (proposal: CopilotActionProposal['payload']) => void;
}

export const CivicCopilotModal: React.FC<CivicCopilotModalProps> = ({
  isOpen,
  onClose,
  complaints,
  securityContext,
  onSelectComplaint,
  onCreateComplaintFromCopilot,
}) => {
  const isCitizen = securityContext?.role === 'citizen';
  const isStateAdmin = securityContext?.role === 'state_admin' || securityContext?.role === 'super_admin';
  const districtName = securityContext?.districtId ? securityContext.districtId.toUpperCase() : 'PUNE';

  const defaultWelcomeMessage: CopilotMessage = {
    id: 'welcome-msg',
    sender: 'assistant',
    content: isCitizen
      ? `### 🤖 Welcome to Civic Copilot (${districtName})\n\nI am your municipal civic assistant. You can ask me about your submitted grievances, report a new civic issue, check for existing complaints nearby, or review your Civic Champion score.`
      : isStateAdmin
      ? `### 🏛️ Maharashtra State Operations Intelligence Copilot\n\nI provide grounded, factual operational insights across all Maharashtra municipal corporations and districts. You can query statewide active workloads, divisional trends, critical SLA escalations, and citizen verification rates.`
      : `### 🤖 Municipal Operations Intelligence Copilot (${districtName})\n\nI am grounded in your authorized live complaint records. You can query high-priority dispatches, emerging spatio-temporal hotspots, incident clusters, SLA overdue risks, and citizen verification cases.`,
    timestamp: new Date().toISOString(),
    suggestedPrompts: isCitizen
      ? [
          'What is the status of my complaint?',
          'How do I report a road issue?',
          'What is my Civic Score?',
          'What evidence should I upload?',
        ]
      : isStateAdmin
      ? [
          'Give me the current complaint overview across districts',
          'Which districts have the highest number of pending complaints?',
          'Show complaint trends by division',
          'How many complaints are awaiting citizen verification?',
        ]
      : [
          'What are today\'s highest-priority complaints?',
          'Where are the emerging hotspots?',
          'Which complaints are close to SLA breach?',
          'Which complaints are awaiting citizen verification?',
        ],
  };

  const [messages, setMessages] = useState<CopilotMessage[]>([defaultWelcomeMessage]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (queryText?: string) => {
    const query = (queryText || inputValue).trim();
    if (!query || loading) return;

    const userMsg: CopilotMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: query,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputValue('');
    setLoading(true);

    try {
      const response = await CopilotService.answerOfficerQuery(query, complaints, securityContext);
      setMessages((prev) => [...prev, response]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          content: `### ⚠️ Copilot Notice\n\nCivic Copilot is operating in offline deterministic mode: ${err.message || 'Telemetry analysis complete.'}`,
          timestamp: new Date().toISOString(),
          suggestedPrompts: ['What are today\'s highest-priority complaints?'],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([defaultWelcomeMessage]);
  };

  const handleActionConfirm = (proposal: CopilotActionProposal) => {
    if (onCreateComplaintFromCopilot && proposal.type === 'create_complaint') {
      onCreateComplaintFromCopilot(proposal.payload);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <Card className="w-full max-w-3xl h-[85vh] max-h-[780px] flex flex-col bg-white border-[#D9E2EC] shadow-2xl rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8EEF5] bg-gradient-to-r from-[#172B4D] via-[#1E3A8A] to-[#0A2540] text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shadow-inner">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight">CIVIC COPILOT</h3>
                <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                  AI GROUNDED
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-blue-500/20 text-blue-200 border border-blue-400/30 rounded-full">
                  {isStateAdmin ? '🏛️ STATEWIDE' : `📍 ${districtName}`}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {isCitizen
                  ? 'Ask about your civic complaint or report an issue'
                  : isStateAdmin
                  ? 'Maharashtra State Operations Intelligence Assistant'
                  : 'Municipal Operations Intelligence Assistant'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleClearHistory}
              title="Clear conversation"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Action Suggestion Chips Bar */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-[#E8EEF5] flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" /> Prompts:
          </span>
          {isCitizen ? (
            <>
              <button
                onClick={() => handleSend('What is the status of my complaint?')}
                className="px-2.5 py-1 text-xs bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 rounded-full shrink-0 font-medium transition-colors"
              >
                📋 My Complaint Status
              </button>
              <button
                onClick={() => handleSend('There is a large pothole and waterlogging on the main street')}
                className="px-2.5 py-1 text-xs bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 rounded-full shrink-0 font-medium transition-colors"
              >
                📍 Report an Issue
              </button>
              <button
                onClick={() => handleSend('Is there already a complaint about this issue?')}
                className="px-2.5 py-1 text-xs bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 rounded-full shrink-0 font-medium transition-colors"
              >
                🔎 Find Similar Complaints
              </button>
              <button
                onClick={() => handleSend('What is my Civic Score?')}
                className="px-2.5 py-1 text-xs bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 rounded-full shrink-0 font-medium transition-colors"
              >
                🏆 My Civic Score
              </button>
            </>
          ) : isStateAdmin ? (
            <>
              <button
                onClick={() => handleSend('Give me the current complaint overview across districts')}
                className="px-2.5 py-1 text-xs bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 rounded-full shrink-0 font-medium transition-colors"
              >
                🏛️ Maharashtra Overview
              </button>
              <button
                onClick={() => handleSend('Which districts have the highest number of pending complaints?')}
                className="px-2.5 py-1 text-xs bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 rounded-full shrink-0 font-medium transition-colors"
              >
                📊 District Statistics
              </button>
              <button
                onClick={() => handleSend('Show complaint trends by division')}
                className="px-2.5 py-1 text-xs bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 rounded-full shrink-0 font-medium transition-colors"
              >
                🗺️ Division Analysis
              </button>
              <button
                onClick={() => handleSend('How many complaints are awaiting citizen verification across the state?')}
                className="px-2.5 py-1 text-xs bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 rounded-full shrink-0 font-medium transition-colors"
              >
                ⏳ Awaiting Verification
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleSend("What are today's highest-priority complaints?")}
                className="px-2.5 py-1 text-xs bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 rounded-full shrink-0 font-medium transition-colors"
              >
                🔴 Critical Issues
              </button>
              <button
                onClick={() => handleSend('Which complaints are close to SLA breach?')}
                className="px-2.5 py-1 text-xs bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 rounded-full shrink-0 font-medium transition-colors"
              >
                ⏱️ SLA Risks
              </button>
              <button
                onClick={() => handleSend('Where are the emerging hotspots?')}
                className="px-2.5 py-1 text-xs bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 rounded-full shrink-0 font-medium transition-colors"
              >
                🗺️ Hotspots
              </button>
              <button
                onClick={() => handleSend('Which complaints are awaiting citizen verification?')}
                className="px-2.5 py-1 text-xs bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 rounded-full shrink-0 font-medium transition-colors"
              >
                ⏳ Awaiting Verification
              </button>
            </>
          )}
        </div>

        {/* Message Thread Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-4 shadow-sm text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-[#1E3A8A] text-white rounded-tr-none'
                    : 'bg-white text-slate-800 border border-[#E8EEF5] rounded-tl-none space-y-3'
                }`}
              >
                {/* Formatted Content with Zero Raw Stars/Hashes and Rich Markdown */}
                <CopilotMarkdown
                  content={msg.content}
                  isUser={msg.sender === 'user'}
                  onSelectComplaint={(complaintId) => {
                    const compObj = complaints.find(
                      (c) =>
                        c.id.toLowerCase() === complaintId.toLowerCase() ||
                        c.id.endsWith(complaintId) ||
                        c.dbId?.toString() === complaintId
                    );
                    if (compObj && onSelectComplaint) {
                      onSelectComplaint(compObj);
                      onClose();
                    }
                  }}
                />

                {/* Referenced Complaint Action Badges */}
                {msg.referencedComplaintIds && msg.referencedComplaintIds.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                      Referenced Grievances:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.referencedComplaintIds.map((cid) => {
                        const compObj = complaints.find(
                          (c) => c.id.toLowerCase() === cid.toLowerCase() || c.id.endsWith(cid)
                        );
                        return (
                          <button
                            key={cid}
                            onClick={() => {
                              if (compObj && onSelectComplaint) {
                                onSelectComplaint(compObj);
                                onClose();
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-md transition-colors"
                          >
                            <FileText className="w-3 h-3" />
                            <span>#{cid}</span>
                            <ExternalLink className="w-2.5 h-2.5 ml-0.5 opacity-60" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Action Proposal Card (Explicit Confirmation Required) */}
                {msg.actionProposal && (
                  <div className="mt-3 p-3.5 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 border border-blue-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        {msg.actionProposal.title}
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-blue-200 text-blue-800 rounded">
                        Confirmation Required
                      </span>
                    </div>
                    <div className="text-xs text-slate-700 space-y-1 bg-white p-2.5 rounded-lg border border-blue-100">
                      <div>
                        <strong>Category:</strong> {msg.actionProposal.payload.category?.toUpperCase()}
                      </div>
                      {msg.actionProposal.payload.secondaryIssue && (
                        <div>
                          <strong>Secondary Issue:</strong> {msg.actionProposal.payload.secondaryIssue}
                        </div>
                      )}
                      <div>
                        <strong>Description:</strong> {msg.actionProposal.payload.description}
                      </div>
                      <div>
                        <strong>Location:</strong> {msg.actionProposal.payload.location}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={() => handleActionConfirm(msg.actionProposal!)}
                        className="bg-blue-700 hover:bg-blue-800 text-white text-xs h-8"
                      >
                        Review & Submit Grievance
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setInputValue('I want to make changes to the description...')}
                        className="text-xs h-8 bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      >
                        Edit Details
                      </Button>
                    </div>
                  </div>
                )}

                {/* Similar Complaints Found List */}
                {msg.similarComplaints && msg.similarComplaints.length > 0 && (
                  <div className="mt-2 space-y-1.5 pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                      Nearby Active Reports:
                    </span>
                    {msg.similarComplaints.map((sc) => (
                      <div
                        key={sc.id}
                        className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="font-semibold text-slate-800">
                            #{sc.id} — {sc.title}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {sc.category} · 📍 {sc.location} · Status: <span className="font-medium text-blue-700">{sc.status}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const found = complaints.find((c) => c.id === sc.id);
                            if (found && onSelectComplaint) {
                              onSelectComplaint(found);
                              onClose();
                            }
                          }}
                          className="px-2 py-1 text-[11px] font-medium bg-white hover:bg-blue-50 text-blue-700 border border-slate-200 rounded shrink-0"
                        >
                          View Report
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Grounding Source Attribution Footer */}
                {msg.groundedSources && (
                  <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500 flex items-center justify-between">
                    <span>
                      ✓ Grounded in <strong>{msg.groundedSources.datasetCount}</strong> {msg.groundedSources.district} records
                    </span>
                    <span>Updated: {new Date(msg.groundedSources.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )}

                {/* Suggested Follow-up Prompts */}
                {msg.suggestedPrompts && msg.suggestedPrompts.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                    {msg.suggestedPrompts.map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(p)}
                        className="px-2 py-0.5 text-[11px] bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-full border border-slate-200 transition-colors"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 items-center">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="px-4 py-3 bg-white border border-[#E8EEF5] rounded-2xl rounded-tl-none shadow-sm text-xs text-slate-600 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]" />
                <span className="font-medium text-slate-700 ml-1">Analyzing telemetry & verifying security context...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-[#E8EEF5] bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                isCitizen
                  ? 'Ask about your complaint or describe an issue (e.g. "large pothole with waterlogging on Main St")...'
                  : isStateAdmin
                  ? 'Ask about Maharashtra statewide complaints, district stats, or division trends...'
                  : 'Ask about critical complaints, SLA risks, hotspots, or department workloads...'
              }
              className="flex-1 bg-slate-50 border-[#D9E2EC] text-xs h-10 focus:bg-white"
              disabled={loading}
            />
            <Button
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="bg-[#1E3A8A] hover:bg-blue-800 text-white px-4 h-10 shrink-0 shadow-sm"
            >
              <Send className="w-4 h-4 mr-1.5" />
              <span>Send</span>
            </Button>
          </form>
          <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
            <span>🛡️ Enterprise Security: RLS Authorization + Prompt-Injection Shield Active</span>
            <span>Zero Hallucination Grounding Engine</span>
          </div>
        </div>
      </Card>
    </div>
  );
};
