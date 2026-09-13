import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Clock,
  MapPin,
  User,
  Send,
  Sparkles,
  ArrowRight,
  FileCheck,
  Phone,
  Building,
  UserCheck,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Flame,
  Activity,
} from 'lucide-react';
import { Complaint, ComplaintStatus } from '../types/complaint';
import { StatusStepper } from '../components/complaints/StatusStepper';
import { BeforeAfterInspector } from '../components/complaints/BeforeAfterInspector';
import { RelatedComplaintsPanel } from '../components/complaints/RelatedComplaintsPanel';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { NEXT_VALID_STATUS, COMPLAINT_STATUS_CONFIG } from '../lib/constants';
import { formatDateTime } from '../lib/utils';
import { supabase } from '../services/supabaseClient';
import { complaintService } from '../services/complaintService';
import { PriorityEngine } from '../services/priorityEngine';
import { IncidentGroupingEngine } from '../services/incidentGroupingEngine';
import { ResolutionVerificationCard } from '../components/complaints/ResolutionVerificationCard';

interface ComplaintDetailsProps {
  complaint: Complaint | null;
  allComplaints?: Complaint[];
  onSelectComplaint?: (id: string) => void;
  onBack: () => void;
  onAdvanceStatus: (
    id: string,
    nextStatus: ComplaintStatus,
    notes?: string,
    proofUrl?: string
  ) => Promise<any>;
  onAssignOfficer?: (
    id: string,
    officerName: string,
    departmentName: string,
    contractorName?: string
  ) => Promise<any>;
  onAddNote: (id: string, text: string) => Promise<any>;
  onRefresh?: () => Promise<void>;
  loading?: boolean;
}

export const ComplaintDetails: React.FC<ComplaintDetailsProps> = ({
  complaint: initialComplaint,
  allComplaints = [],
  onSelectComplaint,
  onBack,
  onAdvanceStatus,
  onAssignOfficer,
  onAddNote,
  onRefresh,
  loading = false,
}) => {
  const [activeComplaint, setActiveComplaint] = useState<Complaint | null>(initialComplaint);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [dossierError, setDossierError] = useState<string | null>(null);

  const [noteText, setNoteText] = useState('');
  const [transitionNotes, setTransitionNotes] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [selectedNextStatus, setSelectedNextStatus] = useState<ComplaintStatus | null>(null);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  // Assignment form state
  const [officerName, setOfficerName] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [contractorName, setContractorName] = useState('');

  // Action feedback states
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadFullDossier = React.useCallback(async (id: string) => {
    try {
      setDossierLoading(true);
      setDossierError(null);
      const full = await complaintService.getComplaintById(id);
      if (full) {
        setActiveComplaint(full);
      }
    } catch (err: any) {
      console.error('❌ Error fetching full complaint dossier:', err);
      setDossierError(err.message || 'Failed to load full complaint dossier');
    } finally {
      setDossierLoading(false);
    }
  }, []);

  useEffect(() => {
    setActiveComplaint(initialComplaint);
    if (initialComplaint?.id) {
      loadFullDossier(initialComplaint.id);
    }
  }, [initialComplaint, loadFullDossier]);

  // Realtime subscription for this specific complaint
  useEffect(() => {
    if (!activeComplaint?.dbId) return;

    const channelName = `complaint-detail-${activeComplaint.dbId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reports',
          filter: `id=eq.${activeComplaint.dbId}`,
        },
        () => {
          console.log(`📡 Realtime update on active report #${activeComplaint.id}`);
          loadFullDossier(activeComplaint.id);
          if (onRefresh) onRefresh();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'report_status_history',
          filter: `report_id=eq.${activeComplaint.dbId}`,
        },
        () => {
          console.log(`📡 Realtime status history added for #${activeComplaint.id}`);
          loadFullDossier(activeComplaint.id);
          if (onRefresh) onRefresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeComplaint?.dbId, activeComplaint?.id, loadFullDossier, onRefresh]);

  if (loading || (dossierLoading && !activeComplaint)) {
    return (
      <div className="p-16 text-center text-[#526581]">
        <div className="flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-[#1769D2]" />
          <span className="text-sm font-semibold text-[#172B4D]">Loading complaint dossier from Supabase...</span>
        </div>
      </div>
    );
  }

  if (dossierError && !activeComplaint) {
    return (
      <div className="p-12 text-center bg-white rounded-lg border border-red-200 max-w-lg mx-auto mt-8">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-[#172B4D]">Failed to Load Complaint</h3>
        <p className="text-xs text-red-600 mt-1">{dossierError}</p>
        <div className="flex justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            Back to Queue
          </Button>
          {initialComplaint?.id && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => loadFullDossier(initialComplaint.id)}
              className="bg-[#1769D2] text-white"
            >
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  }

  const complaint = activeComplaint;

  if (!complaint) {
    return (
      <div className="p-12 text-center bg-white rounded-lg border border-[#D9E2EC] max-w-lg mx-auto mt-8">
        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-[#172B4D]">Complaint Not Found</h3>
        <p className="text-xs text-[#526581] mt-1">
          The requested complaint record does not exist or has been removed from the database.
        </p>
        <Button variant="outline" size="sm" onClick={onBack} className="mt-4">
          Back to Queue
        </Button>
      </div>
    );
  }

  const defaultNext = NEXT_VALID_STATUS[complaint.status];

  const handleOpenAdvanceModal = (targetStatus?: ComplaintStatus) => {
    setSelectedNextStatus(targetStatus || defaultNext || 'in_progress');
    setTransitionNotes('');
    setProofUrl('');
    setShowAdvanceModal(true);
  };

  const handleAdvanceConfirm = async () => {
    if (!selectedNextStatus) return;
    try {
      setActionLoading(true);
      setFeedbackMessage(null);
      await onAdvanceStatus(complaint.id, selectedNextStatus, transitionNotes, proofUrl);
      setShowAdvanceModal(false);
      setFeedbackMessage({
        type: 'success',
        text: `Status updated to ${COMPLAINT_STATUS_CONFIG[selectedNextStatus]?.label || selectedNextStatus}`,
      });
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Failed to update status',
      });
    } finally {
      setActionLoading(false);
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  const handleAssignConfirm = async () => {
    if (!officerName.trim() || !departmentName.trim()) {
      alert('Please specify both an officer name and department.');
      return;
    }
    try {
      setActionLoading(true);
      setFeedbackMessage(null);
      if (onAssignOfficer) {
        await onAssignOfficer(complaint.id, officerName.trim(), departmentName.trim(), contractorName.trim() || undefined);
      }
      setShowAssignModal(false);
      setFeedbackMessage({
        type: 'success',
        text: `Successfully assigned to ${officerName} (${departmentName})`,
      });
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Failed to assign officer',
      });
    } finally {
      setActionLoading(false);
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  const handleLogNote = async () => {
    if (!noteText.trim()) return;
    try {
      setActionLoading(true);
      await onAddNote(complaint.id, noteText.trim());
      setNoteText('');
      setFeedbackMessage({
        type: 'success',
        text: 'Internal administrative note logged successfully.',
      });
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Failed to save note',
      });
    } finally {
      setActionLoading(false);
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Action Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`p-3 rounded-lg flex items-center gap-2 text-xs font-semibold ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Top Bar: Back & Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-[#D9E2EC]">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="h-8 bg-white border-[#D9E2EC] text-[#172B4D] hover:bg-slate-50 shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1 text-[#526581]" />
            <span>Back to Queue</span>
          </Button>

          <div className="flex items-center gap-2 ml-2">
            <span className="font-mono text-base font-bold text-[#1769D2]">
              #{complaint.id}
            </span>
            {(() => {
              const priorityAnalysis = PriorityEngine.evaluateComplaintPriority(complaint, allComplaints);
              return (
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-bold border uppercase tracking-wider ${priorityAnalysis.badgeBg} ${priorityAnalysis.badgeBorder} ${priorityAnalysis.badgeText}`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: priorityAnalysis.badgeColor }}
                  />
                  <span>Priority: {priorityAnalysis.levelLabel} ({priorityAnalysis.scoreDisplay})</span>
                </span>
              );
            })()}
            <Badge status={complaint.status} />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setOfficerName(complaint.assignment?.officerName || '');
              setDepartmentName(complaint.assignment?.departmentName || complaint.categoryLabel || '');
              setContractorName(complaint.assignment?.contractorName || '');
              setShowAssignModal(true);
            }}
            className="h-8 text-xs bg-white border-[#D9E2EC] text-[#172B4D] hover:bg-slate-50"
          >
            <UserCheck className="w-3.5 h-3.5 mr-1 text-[#526581]" />
            <span>{complaint.assignment ? 'Reassign' : 'Assign Officer'}</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => handleOpenAdvanceModal()}
            className="h-8 bg-[#1769D2] hover:bg-[#123B6D] text-white font-semibold gap-1.5 shadow-xs"
          >
            <span>
              {defaultNext
                ? `Advance to ${COMPLAINT_STATUS_CONFIG[defaultNext]?.label || defaultNext}`
                : 'Change Status'}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* 7-Step Linear Progression Tracker */}
      <Card className="p-4 border-[#D9E2EC] bg-white shadow-sm">
        <div className="text-[10px] font-mono text-[#526581] uppercase font-bold tracking-wider mb-2">
          Statutory 7-Stage Incident Progression
        </div>
        <StatusStepper currentStatus={complaint.status} history={complaint.statusHistory} />
      </Card>

      {/* Main Dossier Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column (8 cols): Title, Description, Evidence, Audit Trail */}
        <div className="lg:col-span-8 space-y-4">
          {/* Incident Summary Card */}
          <Card className="p-4 border-[#D9E2EC] bg-white shadow-sm space-y-3">
            <div>
              <div className="text-xs font-mono text-[#1769D2] font-semibold mb-1">
                {complaint.categoryLabel}
              </div>
              <h1 className="text-lg font-bold text-[#172B4D]">{complaint.title}</h1>
              <p className="text-xs text-[#526581] mt-2 leading-relaxed whitespace-pre-wrap">
                {complaint.description}
              </p>
            </div>

            <div className="flex flex-wrap gap-4 pt-3 border-t border-[#E8EEF5] text-xs">
              <div className="flex items-center gap-1.5 text-[#172B4D]">
                <MapPin className="w-3.5 h-3.5 text-[#1769D2]" />
                <span>{complaint.location.address}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#526581] font-mono">
                <span>Ward:</span>
                <strong className="text-[#172B4D]">{complaint.location.ward}</strong>
              </div>
              <div className="flex items-center gap-1.5 text-[#526581] font-mono">
                <span>GPS:</span>
                <span className="text-[#172B4D]">
                  {complaint.location.latitude.toFixed(4)}, {complaint.location.longitude.toFixed(4)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[#526581] font-mono">
                <span>Registered:</span>
                <span className="text-[#172B4D]">{formatDateTime(complaint.createdAt)}</span>
              </div>
            </div>
          </Card>

          {/* Before & After Photographic Evidence Inspector */}
          <BeforeAfterInspector
            beforeImages={complaint.evidence.before}
            afterImages={complaint.evidence.after}
          />

          {/* Phase 3D: Potential Common Incident Grouping Panel */}
          {(() => {
            const detectedIncidents = IncidentGroupingEngine.groupComplaintsIntoIncidents(allComplaints);
            const parentIncident = detectedIncidents.find((inc) =>
              inc.memberComplaintIds.includes(complaint.id)
            );

            if (!parentIncident) return null;

            const otherMemberIds = parentIncident.memberComplaintIds.filter(
              (id) => id !== complaint.id
            );

            return (
              <Card className="p-4 border-purple-200 bg-purple-50/30 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-2 pb-2 border-b border-purple-200/80">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse" />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-purple-900">
                          {parentIncident.incidentId}
                        </span>
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${parentIncident.badgeBg} ${parentIncident.badgeBorder} ${parentIncident.badgeText}`}
                        >
                          {parentIncident.levelLabel.toUpperCase()} · {parentIncident.confidenceDisplay}
                        </span>
                        {parentIncident.hasActiveHotspot && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 font-bold">
                            🔥 Hotspot Overlap
                          </span>
                        )}
                      </div>
                      <h3 className="text-xs font-bold text-[#172B4D] mt-1">
                        {parentIncident.incidentLabel}
                      </h3>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-purple-800 border border-purple-200 font-bold shrink-0">
                    PHASE 3D INCIDENT
                  </span>
                </div>

                <p className="text-xs text-[#526581] leading-relaxed">
                  This complaint is identified as part of a potential common municipal incident grouping <strong>{parentIncident.complaintCount} citizen reports</strong> concentrated within ~{Math.round(parentIncident.affectedRadiusMeters)}m radius.
                </p>

                {parentIncident.explainableReasons.length > 0 && (
                  <div className="p-2.5 rounded bg-white border border-purple-100 space-y-1">
                    <span className="text-[10px] font-mono uppercase font-bold text-[#718096] block mb-0.5">
                      Grouping Evidence:
                    </span>
                    {parentIncident.explainableReasons.slice(0, 3).map((r, idx) => (
                      <div key={idx} className="text-[11px] text-[#172B4D] flex items-start gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-1 shrink-0" />
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                )}

                {otherMemberIds.length > 0 && (
                  <div className="pt-2 border-t border-purple-200/60 flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-medium text-[#172B4D]">
                      Other Reports in Incident ({otherMemberIds.length}):
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {otherMemberIds.map((cid) => (
                        <button
                          key={cid}
                          onClick={() => onSelectComplaint?.(cid)}
                          className="px-2 py-0.5 rounded text-[11px] font-mono bg-white border border-purple-300 text-purple-800 hover:bg-purple-600 hover:text-white transition-colors font-semibold"
                        >
                          #{cid}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })()}

          {/* Phase 3A: Multi-Signal Related Complaint & Duplicate Intelligence */}
          <RelatedComplaintsPanel
            targetComplaint={complaint}
            allComplaints={allComplaints}
            onSelectComplaint={onSelectComplaint}
          />

          {/* Audit History & Admin Notes */}
          <Card className="p-4 border-[#D9E2EC] bg-white shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#172B4D] mb-3 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-[#1769D2]" />
              <span>Official Lifecycle Audit History</span>
            </h3>

            <div className="space-y-3">
              {complaint.statusHistory.length === 0 ? (
                <div className="text-xs text-[#718096] italic p-3 text-center bg-[#F8FAFC] rounded border border-[#E8EEF5]">
                  No lifecycle transitions recorded yet.
                </div>
              ) : (
                complaint.statusHistory.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs p-2.5 rounded bg-[#F8FAFC] border border-[#E8EEF5]">
                    <div className="w-2 h-2 rounded-full bg-[#1769D2] mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#172B4D]">
                          {item.fromStatus ? `${COMPLAINT_STATUS_CONFIG[item.fromStatus]?.label || item.fromStatus} ➔ ` : ''}
                          {COMPLAINT_STATUS_CONFIG[item.toStatus]?.label || item.toStatus}
                        </span>
                        <span className="text-[10px] font-mono text-[#526581]">
                          {formatDateTime(item.timestamp)}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#526581] mt-0.5">
                        By: <span className="text-[#172B4D] font-medium">{item.changedBy}</span>
                      </div>
                      {item.notes && (
                        <div className="text-[11px] text-[#172B4D] mt-1 p-2 rounded bg-white border border-[#D9E2EC]">
                          {item.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Internal Admin Notes Display */}
            {complaint.adminNotes.length > 0 && (
              <div className="mt-4 pt-3 border-t border-[#E8EEF5]">
                <h4 className="text-[11px] font-mono uppercase font-bold text-[#526581] mb-2">
                  Recorded Administrative Notes ({complaint.adminNotes.length})
                </h4>
                <div className="space-y-2">
                  {complaint.adminNotes.map((note) => (
                    <div key={note.id} className="p-2.5 rounded bg-blue-50/50 border border-blue-100 text-xs">
                      <div className="flex justify-between text-[10px] text-[#526581] font-mono mb-1">
                        <span className="font-semibold text-[#1769D2]">{note.author}</span>
                        <span>{formatDateTime(note.createdAt)}</span>
                      </div>
                      <div className="text-[#172B4D]">{note.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Internal Administrative Note Form */}
            <div className="mt-4 pt-4 border-t border-[#E8EEF5]">
              <label className="text-[11px] font-mono text-[#526581] uppercase font-semibold block mb-1.5">
                Append Internal Administrative Note
              </label>
              <div className="flex gap-2">
                <Input
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Record contractor instructions, police alerts, or inspection findings..."
                  className="text-xs bg-white border-[#D9E2EC] text-[#172B4D]"
                  disabled={actionLoading}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleLogNote}
                  disabled={actionLoading || !noteText.trim()}
                  className="shrink-0 bg-white border-[#D9E2EC] text-[#172B4D] hover:bg-slate-50"
                >
                  <Send className="w-3.5 h-3.5 mr-1 text-[#526581]" />
                  <span>Log Note</span>
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column (4 cols): AI Classification, Smart Priority, Reporter, SLA, Field Assignment */}
        <div className="lg:col-span-4 space-y-4">
          {/* Phase 3B: Smart Civic Priority Intelligence Card */}
          {(() => {
            const priorityAnalysis = PriorityEngine.evaluateComplaintPriority(complaint, allComplaints);
            return (
              <Card className="p-4 border-[#D9E2EC] bg-white shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#E8EEF5]">
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-orange-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#172B4D]">
                      Smart Civic Priority (Phase 3B)
                    </h3>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${priorityAnalysis.badgeBg} ${priorityAnalysis.badgeBorder} ${priorityAnalysis.badgeText}`}
                  >
                    {priorityAnalysis.levelLabel.toUpperCase()} · {priorityAnalysis.scoreDisplay}
                  </span>
                </div>

                {/* 5-Signal Contribution Breakdown */}
                <div className="space-y-2 text-xs">
                  <div>
                    <div className="flex justify-between text-[11px] font-mono text-[#526581] mb-0.5">
                      <span>Severity (30%)</span>
                      <strong className="text-[#172B4D]">{Math.round(priorityAnalysis.signalBreakdown.severity)}/100</strong>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-600 rounded-full"
                        style={{ width: `${priorityAnalysis.signalBreakdown.severity}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-mono text-[#526581] mb-0.5">
                      <span>Public Safety Impact (25%)</span>
                      <strong className="text-[#172B4D]">{Math.round(priorityAnalysis.signalBreakdown.publicSafety)}/100</strong>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-600 rounded-full"
                        style={{ width: `${priorityAnalysis.signalBreakdown.publicSafety}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-mono text-[#526581] mb-0.5">
                      <span>Clustered Reports (20%)</span>
                      <strong className="text-[#172B4D]">{Math.round(priorityAnalysis.signalBreakdown.relatedComplaints)}/100</strong>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-600 rounded-full"
                        style={{ width: `${priorityAnalysis.signalBreakdown.relatedComplaints}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-mono text-[#526581] mb-0.5">
                      <span>Age Escalation (15%)</span>
                      <strong className="text-[#172B4D]">{Math.round(priorityAnalysis.signalBreakdown.ageEscalation)}/100</strong>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-600 rounded-full"
                        style={{ width: `${priorityAnalysis.signalBreakdown.ageEscalation}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-mono text-[#526581] mb-0.5">
                      <span>Category Baseline (10%)</span>
                      <strong className="text-[#172B4D]">{Math.round(priorityAnalysis.signalBreakdown.categoryBaseline)}/100</strong>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#1769D2] rounded-full"
                        style={{ width: `${priorityAnalysis.signalBreakdown.categoryBaseline}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Priority Drivers List */}
                <div className="pt-2 border-t border-[#E8EEF5]">
                  <span className="text-[10px] font-mono uppercase font-bold text-[#718096] block mb-1">
                    Priority Drivers:
                  </span>
                  <div className="space-y-1">
                    {priorityAnalysis.explainableReasons.map((reason, idx) => (
                      <div
                        key={idx}
                        className="text-[11px] text-[#172B4D] p-1.5 rounded bg-slate-50 border border-slate-200 flex items-start gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-600 mt-1 shrink-0" />
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })()}

          {/* Phase 3E: Resolution Verification & Evidence Intelligence Card */}
          {(complaint.status === 'resolution_submitted' ||
            complaint.status === 'resolved' ||
            complaint.status === 'verified' ||
            complaint.status === 'closed' ||
            (complaint.evidence.after && complaint.evidence.after.length > 0)) && (
            <ResolutionVerificationCard complaint={complaint} />
          )}

          {/* AI Multimodal Triage Box */}
          {complaint.aiClassification && (
            <Card borderAccent="urgent" className="p-3.5 space-y-2 bg-amber-50/40 border-amber-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#B45309] uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Civic AI Triage</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-[#B45309] border border-amber-300 font-semibold">
                  {(complaint.aiClassification.confidenceScore * 100).toFixed(0)}% Match
                </span>
              </div>

              <p className="text-xs text-[#172B4D] leading-relaxed">
                {complaint.aiClassification.summary}
              </p>

              <div className="pt-2 border-t border-amber-200/80">
                <span className="text-[10px] font-mono uppercase text-[#718096] block mb-1">
                  Detected Hazard Keywords:
                </span>
                <div className="flex flex-wrap gap-1">
                  {complaint.aiClassification.hazardKeywords.map((kw, i) => (
                    <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white text-[#172B4D] border border-amber-200 shadow-xs">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* SLA Tracking Card */}
          <Card className="p-3.5 border-[#D9E2EC] bg-white shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#172B4D] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#1769D2]" />
                <span>SLA Clock</span>
              </span>
              <span className="font-mono text-xs font-bold text-[#526581]">
                Target: {complaint.sla.targetHours}h
              </span>
            </div>

            <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#E8EEF5] flex items-center justify-between">
              <div>
                <div className="text-[10px] text-[#526581] uppercase font-mono">Status</div>
                <div
                  className={`text-sm font-bold font-mono ${
                    complaint.sla.isOverdue
                      ? 'text-[#D92D20]'
                      : complaint.sla.hoursRemaining <= 4
                      ? 'text-[#EA580C]'
                      : 'text-[#16803C]'
                  }`}
                >
                  {complaint.sla.isOverdue
                    ? `${Math.abs(complaint.sla.hoursRemaining)}h OVERDUE`
                    : `${complaint.sla.hoursRemaining}h Remaining`}
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] text-[#526581] uppercase font-mono">Deadline</div>
                <div className="text-xs font-mono text-[#172B4D] font-medium">
                  {formatDateTime(complaint.sla.deadline).split(',')[1] || formatDateTime(complaint.sla.deadline)}
                </div>
              </div>
            </div>
          </Card>

          {/* Field Assignment Card */}
          <Card className="p-3.5 border-[#D9E2EC] bg-white shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#172B4D] flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-[#1769D2]" />
                <span>Assignment & Contractor</span>
              </span>
            </div>

            {complaint.assignment ? (
              <div className="space-y-1 text-xs text-[#172B4D]">
                <div>
                  <span className="text-[#526581]">Assigned Officer: </span>
                  <strong className="text-[#172B4D]">{complaint.assignment.officerName}</strong>
                </div>
                <div>
                  <span className="text-[#526581]">Department: </span>
                  <span>{complaint.assignment.departmentName}</span>
                </div>
                {complaint.assignment.contractorName && (
                  <div>
                    <span className="text-[#526581]">Field Contractor: </span>
                    <span className="text-[#1769D2] font-semibold">{complaint.assignment.contractorName}</span>
                  </div>
                )}
                <div className="text-[10px] text-[#526581] pt-1 font-mono">
                  Assigned at: {formatDateTime(complaint.assignment.assignedAt)}
                </div>
              </div>
            ) : (
              <div className="text-xs text-[#B45309] p-2 rounded bg-amber-50 border border-amber-200">
                ⚠️ Not yet assigned to a field contractor or ward engineer.
              </div>
            )}
          </Card>

          {/* Citizen Reporter Information Card */}
          <Card className="p-3.5 border-[#D9E2EC] bg-white shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#172B4D] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#1769D2]" />
                <span>Citizen Reporter</span>
              </span>
              {complaint.reporter.verifiedCitizen && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-emerald-50 text-[#16803C] border border-emerald-200 rounded font-semibold">
                  VERIFIED CITIZEN
                </span>
              )}
            </div>

            <div className="space-y-1 text-xs text-[#172B4D]">
              <div>
                <span className="text-[#526581]">User ID / Name: </span>
                <strong className="text-[#172B4D]">{complaint.reporter.name}</strong>
              </div>
              <div className="flex items-center gap-1.5">
                <Phone className="w-3 h-3 text-[#526581]" />
                <span className="text-[#526581]">{complaint.reporter.phone}</span>
              </div>
              <div className="font-mono text-[11px] text-[#526581]">
                UID: {complaint.reporter.aadharMasked}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Advance Status Modal */}
      {showAdvanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-[#D9E2EC] rounded-lg p-5 max-w-md w-full space-y-4 shadow-2xl">
            <div>
              <h3 className="text-sm font-bold text-[#123B6D] uppercase tracking-wider">
                Update Complaint Status
              </h3>
              <p className="text-xs text-[#526581] mt-1">
                Move #{complaint.id} from <strong>{COMPLAINT_STATUS_CONFIG[complaint.status]?.label || complaint.status}</strong> to:
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-mono text-[#526581] uppercase font-semibold block mb-1">
                  Target Status Stage
                </label>
                <select
                  value={selectedNextStatus || ''}
                  onChange={(e) => setSelectedNextStatus(e.target.value as ComplaintStatus)}
                  className="w-full p-2 rounded border border-[#D9E2EC] bg-white text-xs font-semibold text-[#172B4D]"
                >
                  <option value="under_review">Under Review</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolution_submitted">Resolution Submitted</option>
                  <option value="verified">Verified / Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono text-[#526581] uppercase font-semibold block mb-1">
                  Transition Remarks / Directive
                </label>
                <Input
                  value={transitionNotes}
                  onChange={(e) => setTransitionNotes(e.target.value)}
                  placeholder="e.g. Field crew dispatched; cold-mix patch cured..."
                  className="bg-white border-[#D9E2EC] text-[#172B4D]"
                />
              </div>

              {(selectedNextStatus === 'resolution_submitted' || selectedNextStatus === 'verified') && (
                <div>
                  <label className="text-[10px] font-mono text-[#526581] uppercase font-semibold block mb-1">
                    Remediation Proof Image URL (After)
                  </label>
                  <Input
                    value={proofUrl}
                    onChange={(e) => setProofUrl(e.target.value)}
                    placeholder="https://... photo link of completed remediation"
                    className="bg-white border-[#D9E2EC] text-[#172B4D]"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8EEF5]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanceModal(false)}
                disabled={actionLoading}
                className="text-[#526581] hover:text-[#172B4D]"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAdvanceConfirm}
                disabled={actionLoading}
                className="bg-[#1769D2] hover:bg-[#123B6D] text-white"
              >
                {actionLoading ? 'Updating Supabase...' : 'Confirm Transition'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Officer Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-[#D9E2EC] rounded-lg p-5 max-w-md w-full space-y-4 shadow-2xl">
            <div>
              <h3 className="text-sm font-bold text-[#123B6D] uppercase tracking-wider">
                Assign Municipal Officer / Contractor
              </h3>
              <p className="text-xs text-[#526581] mt-1">
                Dispatch an official municipal engineer or registered field contractor to grievance #{complaint.id}.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-mono text-[#526581] uppercase font-semibold block mb-1">
                  Department
                </label>
                <select
                  value={departmentName}
                  onChange={(e) => setDepartmentName(e.target.value)}
                  className="w-full p-2 rounded border border-[#D9E2EC] bg-white text-xs text-[#172B4D]"
                >
                  <option value="Roads & Infrastructure">Roads & Infrastructure</option>
                  <option value="Water Works Dept">Water Works Dept</option>
                  <option value="Sewerage & Drainage">Sewerage & Drainage</option>
                  <option value="Electrical Engineering">Electrical Engineering</option>
                  <option value="Public Health & Sanitation">Public Health & Sanitation</option>
                  <option value="Disaster Management">Disaster Management</option>
                  <option value="Horticulture Dept">Horticulture Dept</option>
                  <option value="General Municipal Operations">General Municipal Operations</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono text-[#526581] uppercase font-semibold block mb-1">
                  Officer / Junior Engineer Name
                </label>
                <Input
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                  placeholder="e.g. Er. S. Patil (Ward 08)"
                  className="bg-white border-[#D9E2EC] text-[#172B4D]"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-[#526581] uppercase font-semibold block mb-1">
                  Contractor Firm (Optional)
                </label>
                <Input
                  value={contractorName}
                  onChange={(e) => setContractorName(e.target.value)}
                  placeholder="e.g. Apex Civil Infra Ltd"
                  className="bg-white border-[#D9E2EC] text-[#172B4D]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8EEF5]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAssignModal(false)}
                disabled={actionLoading}
                className="text-[#526581] hover:text-[#172B4D]"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAssignConfirm}
                disabled={actionLoading || !officerName.trim()}
                className="bg-[#1769D2] hover:bg-[#123B6D] text-white"
              >
                {actionLoading ? 'Assigning...' : 'Confirm Assignment'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
