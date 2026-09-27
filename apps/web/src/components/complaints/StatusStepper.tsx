import React from 'react';
import { Check, AlertCircle } from 'lucide-react';
import { ComplaintStatus, StatusHistoryItem } from '../../types/complaint';
import { COMPLAINT_STATUS_CONFIG } from '../../lib/constants';
import { formatDateTime } from '../../lib/utils';

interface StatusStepperProps {
  currentStatus: ComplaintStatus;
  history?: StatusHistoryItem[];
  compact?: boolean;
}

export const StatusStepper: React.FC<StatusStepperProps> = ({
  currentStatus,
  history = [],
  compact = false,
}) => {
  const steps: ComplaintStatus[] = [
    'submitted',
    'under_review',
    'assigned',
    'in_progress',
    'resolution_submitted',
    'citizen_verification',
    'closed',
  ];

  // Map equivalent statuses for step calculation
  const getNormalizedStep = (status: ComplaintStatus): ComplaintStatus => {
    if (status === 'resolved') return 'resolution_submitted';
    if (status === 'reopened') return 'in_progress';
    return status;
  };

  const normalizedCurrent = getNormalizedStep(currentStatus);
  const currentIndex = steps.indexOf(normalizedCurrent);
  const isReopened = currentStatus === 'reopened';

  return (
    <div className="w-full py-2">
      {isReopened && (
        <div className="mb-2 p-1.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-semibold flex items-center justify-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span>Case Reopened by Citizen — In Progress for Additional Remediation</span>
        </div>
      )}

      <div className="flex items-center justify-between relative">
        {/* Background connector line */}
        <div className="absolute top-3.5 left-4 right-4 h-0.5 bg-slate-200 -z-0" />

        {steps.map((step, idx) => {
          const isPassed = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const config = COMPLAINT_STATUS_CONFIG[step];

          const historyEntry = history.find(
            (h) => h.toStatus === step || (step === 'resolution_submitted' && h.toStatus === 'resolved')
          );

          let stepDisplayLabel = config.label;
          if (step === 'under_review') stepDisplayLabel = 'AI / System Verified';
          if (step === 'resolution_submitted') stepDisplayLabel = 'Resolution Evidence';
          if (step === 'in_progress' && isReopened) stepDisplayLabel = 'Reopened';

          return (
            <div key={step} className="flex flex-col items-center relative z-10 flex-1">
              {/* Step Circle Node */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                  isPassed
                    ? 'bg-[#16803C] border-[#16803C] text-white shadow-xs'
                    : isCurrent
                    ? isReopened
                      ? 'bg-red-600 border-red-600 text-white shadow-md ring-4 ring-red-100 scale-105'
                      : 'bg-[#1769D2] border-[#1769D2] text-white shadow-md ring-4 ring-blue-100 scale-105'
                    : 'bg-white border-slate-300 text-[#718096]'
                }`}
              >
                {isPassed ? (
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                ) : isCurrent ? (
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                ) : (
                  <span className="text-[10px]">{idx + 1}</span>
                )}
              </div>

              {/* Step Label */}
              <div className="text-center mt-2 px-1">
                <div
                  className={`text-[11px] font-bold tracking-tight ${
                    isCurrent
                      ? isReopened
                        ? 'text-red-700'
                        : 'text-[#1769D2]'
                      : isPassed
                      ? 'text-[#172B4D]'
                      : 'text-[#718096]'
                  }`}
                >
                  {stepDisplayLabel}
                </div>

                {!compact && historyEntry && (
                  <div className="text-[9px] font-mono text-[#718096] mt-0.5 leading-tight">
                    {formatDateTime(historyEntry.timestamp).split(',')[1]}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

