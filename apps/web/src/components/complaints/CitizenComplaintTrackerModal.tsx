import React, { useState } from 'react';
import { Complaint, ComplaintStatus } from '../../types/complaint';
import { COMPLAINT_STATUS_CONFIG, PRIORITY_CONFIG } from '../../lib/constants';
import { formatDateTime } from '../../lib/utils';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { PriorityBadge } from '../ui/PriorityBadge';
import { BeforeAfterInspector } from './BeforeAfterInspector';
import { CitizenVerificationActionBox } from './CitizenVerificationActionBox';
import {
  X,
  MapPin,
  Clock,
  Building2,
  User,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  CircleDot,
  Circle,
  AlertCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface CitizenComplaintTrackerModalProps {
  complaint: Complaint | null;
  isOpen: boolean;
  onClose: () => void;
  onVerifyResolution?: (
    satisfied: boolean,
    comment?: string,
    reopenReason?: string,
    proofPhotoUrl?: string
  ) => Promise<void>;
  onRefresh?: () => Promise<void>;
}

export const CitizenComplaintTrackerModal: React.FC<CitizenComplaintTrackerModalProps> = ({
  complaint,
  isOpen,
  onClose,
  onVerifyResolution,
  onRefresh,
}) => {
  if (!isOpen || !complaint) return null;

  const currentStatusConfig = COMPLAINT_STATUS_CONFIG[complaint.status] || {
    label: complaint.status,
    color: '#1769D2',
    stepIndex: 1,
  };

  const priorityConfig = PRIORITY_CONFIG[complaint.priority] || {
    label: complaint.priority,
    slaHours: 48,
  };

  // 7-Stage Detailed Tracking Pipeline
  const lifecycleStages = [
    {
      key: 'submitted',
      label: 'Complaint Submitted',
      description: 'Registered in municipal grievance intake queue',
      targetStatus: 'submitted',
    },
    {
      key: 'under_review',
      label: 'AI / System Verification',
      description: 'Multimodal duplicate check & SLA priority triage',
      targetStatus: 'under_review',
    },
    {
      key: 'assigned',
      label: 'Assigned to Department',
      description: complaint.assignment?.departmentName
        ? `Dispatched to ${complaint.assignment.departmentName}`
        : 'Assigned to municipal department & ward junior engineer',
      targetStatus: 'assigned',
    },
    {
      key: 'in_progress',
      label: 'In Progress',
      description: 'Field crew mobilized on-site for remediation',
      targetStatus: 'in_progress',
    },
    {
      key: 'resolution_submitted',
      label: 'Resolution Evidence',
      description: 'Remediation completed; after-photographs & note submitted',
      targetStatus: 'resolution_submitted',
    },
    {
      key: 'citizen_verification',
      label: 'Citizen Verification',
      description: 'Citizen confirms work completion and provides feedback',
      targetStatus: 'citizen_verification',
    },
    {
      key: 'closed',
      label: 'Grievance Closed',
      description: 'Case formally resolved and recorded in municipal archive',
      targetStatus: 'closed',
    },
  ];

  const getStageState = (stageKey: string, index: number) => {
    const statusOrder: ComplaintStatus[] = [
      'submitted',
      'under_review',
      'assigned',
      'in_progress',
      'resolution_submitted',
      'citizen_verification',
      'closed',
    ];

    let effectiveStatus: ComplaintStatus = complaint.status;
    if (complaint.status === 'resolved') effectiveStatus = 'resolution_submitted';
    if (complaint.status === 'reopened') effectiveStatus = 'in_progress';

    const currentIdx = statusOrder.indexOf(effectiveStatus);

    if (index < currentIdx || complaint.status === 'closed') {
      return 'completed';
    }
    if (index === currentIdx) {
      return 'active';
    }
    return 'pending';
  };

  // Find latest update from status history or notes
  const latestStatusHistory = complaint.statusHistory && complaint.statusHistory.length > 0
    ? complaint.statusHistory[complaint.statusHistory.length - 1]
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-[#D9E2EC] rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#123B6D] to-[#1E4E8C] px-5 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-lg shadow-xs backdrop-blur-xs">
              🏛️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold tracking-wide">
                  Complaint #{complaint.id}
                </span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/20 text-white font-semibold">
                  Citizen Tracker
                </span>
              </div>
              <h2 className="text-sm font-bold text-blue-50 mt-0.5">
                {complaint.categoryLabel}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Top Status & Location Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-[#F8FAFC] border border-[#D9E2EC]">
            <div>
              <div className="text-[10px] font-mono text-[#526581] uppercase font-bold">
                Current Status
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <StatusBadge status={complaint.status} />
              </div>
            </div>

            <div>
              <div className="text-[10px] font-mono text-[#526581] uppercase font-bold">
                Grievance Location
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-[#172B4D] truncate">
                <MapPin className="w-3.5 h-3.5 text-[#1769D2] shrink-0" />
                <span className="truncate">{complaint.location.address}</span>
              </div>
            </div>

            <div>
              <div className="text-[10px] font-mono text-[#526581] uppercase font-bold">
                Expected SLA / Clock
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <PriorityBadge priority={complaint.priority} />
                <span className="text-xs font-mono font-bold text-[#172B4D]">
                  {complaint.sla.isOverdue
                    ? 'OVERDUE'
                    : `${complaint.sla.hoursRemaining}h remaining`}
                </span>
              </div>
            </div>
          </div>

          {/* Citizen Verification Action (If awaiting or active) */}
          {onVerifyResolution && (
            <CitizenVerificationActionBox
              complaint={complaint}
              onVerify={async (sat, com, reop, photo) => {
                await onVerifyResolution(sat, com, reop, photo);
                if (onRefresh) await onRefresh();
              }}
            />
          )}

          {/* Detailed Step-by-Step Vertical Timeline */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#123B6D] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#1769D2]" />
              <span>Official Lifecycle Timeline</span>
            </h3>

            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {lifecycleStages.map((stage, idx) => {
                const state = getStageState(stage.key, idx);
                const isCompleted = state === 'completed';
                const isActive = state === 'active';
                const isPending = state === 'pending';

                // Find timestamp if available
                const historyMatch = complaint.statusHistory.find(
                  (h) => h.toStatus === stage.key || (stage.key === 'resolution_submitted' && h.toStatus === 'resolved')
                );

                return (
                  <div key={stage.key} className="relative group">
                    {/* Node */}
                    <div
                      className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${
                        isCompleted
                          ? 'bg-[#16803C] border-[#16803C] text-white shadow-xs'
                          : isActive
                          ? complaint.status === 'reopened'
                            ? 'bg-rose-600 border-rose-600 text-white ring-4 ring-rose-100 scale-110'
                            : 'bg-[#1769D2] border-[#1769D2] text-white ring-4 ring-blue-100 scale-110'
                          : 'bg-white border-slate-300 text-slate-400'
                      }`}
                    >
                      {isCompleted ? (
                        '✓'
                      ) : isActive ? (
                        '●'
                      ) : (
                        '○'
                      )}
                    </div>

                    {/* Content */}
                    <div className="pl-2">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span
                          className={`text-xs font-bold ${
                            isActive
                              ? complaint.status === 'reopened'
                                ? 'text-rose-700'
                                : 'text-[#1769D2]'
                              : isCompleted
                              ? 'text-[#172B4D]'
                              : 'text-[#718096]'
                          }`}
                        >
                          {stage.label}
                        </span>

                        {historyMatch && (
                          <span className="text-[10px] font-mono text-[#526581]">
                            {formatDateTime(historyMatch.timestamp)}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-[#526581] mt-0.5">
                        {stage.description}
                      </p>

                      {isActive && historyMatch?.notes && (
                        <div className="mt-1 p-2 rounded bg-slate-50 border border-slate-200 text-[11px] text-[#172B4D]">
                          <strong>Latest Update:</strong> {historyMatch.notes}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Before & After Photographic Evidence */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#123B6D]">
              Photographic Evidence
            </h3>
            <BeforeAfterInspector
              beforeImages={complaint.evidence.before}
              afterImages={complaint.evidence.after}
            />
          </div>

          {/* Grievance Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#D9E2EC] text-xs">
            <div className="space-y-2">
              <h4 className="font-bold text-[#123B6D] uppercase text-[10px] tracking-wider">
                Grievance Particulars
              </h4>
              <div className="space-y-1 text-[#172B4D]">
                <div>
                  <span className="text-[#526581]">Title: </span>
                  <strong>{complaint.title}</strong>
                </div>
                <div>
                  <span className="text-[#526581]">Description: </span>
                  <p className="mt-0.5 text-[#526581] leading-relaxed">{complaint.description}</p>
                </div>
                <div>
                  <span className="text-[#526581]">Submitted On: </span>
                  <span>{formatDateTime(complaint.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-[#123B6D] uppercase text-[10px] tracking-wider">
                Departmental Allocation
              </h4>
              <div className="space-y-1 text-[#172B4D]">
                <div>
                  <span className="text-[#526581]">Assigned Dept: </span>
                  <strong>{complaint.assignment?.departmentName || complaint.categoryLabel}</strong>
                </div>
                <div>
                  <span className="text-[#526581]">Field Duty Officer: </span>
                  <span>{complaint.assignment?.officerName || 'Municipal Field Engineer (Dispatched)'}</span>
                </div>
                {complaint.assignment?.contractorName && (
                  <div>
                    <span className="text-[#526581]">Executing Contractor: </span>
                    <span className="text-[#1769D2] font-semibold">{complaint.assignment.contractorName}</span>
                  </div>
                )}
                <div>
                  <span className="text-[#526581]">Ward / Zone: </span>
                  <span>{complaint.location.ward || 'Municipal Ward Area'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#F8FAFC] border-t border-[#D9E2EC] flex items-center justify-between shrink-0">
          <span className="text-[11px] text-[#526581] font-mono">
            Government of Maharashtra · Urban Grievance Redressal
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs bg-white border-[#D9E2EC] text-[#172B4D] hover:bg-slate-50"
          >
            Close Tracker
          </Button>
        </div>
      </div>
    </div>
  );
};
