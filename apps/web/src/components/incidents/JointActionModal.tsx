import React, { useState } from 'react';
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Building2,
  FileText,
  MapPin,
  Clock,
  ShieldCheck,
  ArrowRight,
  Info,
  Loader2,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Complaint } from '../../types/complaint';
import {
  PotentialIncidentResult,
  JointActionRequest,
  JointActionResult,
  IncidentGroupingEngine,
} from '../../services/incidentGroupingEngine';
import { IncidentGroupingInsight } from '../../services/aiInsightsService';
import { useAuthContext } from '../../context/AuthContext';

interface JointActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  incident: PotentialIncidentResult | IncidentGroupingInsight | null;
  allComplaints: Complaint[];
  onSubmitJointAction: (req: JointActionRequest) => Promise<JointActionResult>;
}

const DEFAULT_DEPARTMENTS = [
  'Roads & Infrastructure (PWD)',
  'Water Works & Pipeline Maintenance',
  'Drainage & Sewerage Board',
  'Electrical Engineering & Streetlights',
  'Public Health & Sanitation',
  'Disaster Management & Public Safety',
];

const DEFAULT_CREWS = [
  'Officer Sunil Jadhav (Zone 2 Rapid Response)',
  'Duty Officer Ramesh Patil (Zone 2 PWD)',
  'Officer Vinayak Shinde (Water Operations)',
  'Officer Anand Kulkarni (Drainage & Sewage)',
  'Emergency Municipal Task Force A',
  'Apex Civic Infra Contracting Crew',
];

export const JointActionModal: React.FC<JointActionModalProps> = ({
  isOpen,
  onClose,
  incident,
  allComplaints,
  onSubmitJointAction,
}) => {
  const { user } = useAuthContext();

  const [selectedDepartment, setSelectedDepartment] = useState(DEFAULT_DEPARTMENTS[0]);
  const [selectedOfficer, setSelectedOfficer] = useState(DEFAULT_CREWS[0]);
  const [actionNotes, setActionNotes] = useState('');
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<JointActionResult | null>(null);

  // Initialize form when incident changes
  React.useEffect(() => {
    if (incident) {
      setSelectedReportIds(incident.memberComplaintIds);
      setActionNotes(
        `Coordinated Joint Action created for ${incident.complaintCount} related grievances. Primary drivers: ${incident.explainableReasons.slice(0, 2).join('; ')}.`
      );
      setSubmitError(null);
      setSuccessResult(null);

      // Auto-suggest department based on category
      const cat = incident.primaryCategory.toLowerCase();
      if (cat.includes('road')) setSelectedDepartment(DEFAULT_DEPARTMENTS[0]);
      else if (cat.includes('water')) setSelectedDepartment(DEFAULT_DEPARTMENTS[1]);
      else if (cat.includes('drain')) setSelectedDepartment(DEFAULT_DEPARTMENTS[2]);
      else if (cat.includes('electr') || cat.includes('light')) setSelectedDepartment(DEFAULT_DEPARTMENTS[3]);
      else if (cat.includes('waste') || cat.includes('garb')) setSelectedDepartment(DEFAULT_DEPARTMENTS[4]);
      else setSelectedDepartment(DEFAULT_DEPARTMENTS[5]);
    }
  }, [incident]);

  if (!incident) return null;

  const memberComplaints = allComplaints.filter((c) =>
    incident.memberComplaintIds.includes(c.id)
  );

  const toggleReportSelection = (id: string) => {
    setSelectedReportIds((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const handleConfirm = async () => {
    if (isSubmitting) return; // Prevent double-clicks
    if (selectedReportIds.length === 0) {
      setSubmitError('Please select at least one complaint to include in this Joint Action work package.');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const request: JointActionRequest = {
        incidentId: incident.incidentId,
        title: incident.incidentLabel,
        summary: `Consolidated work package covering ${selectedReportIds.length} complaints in ~${Math.round(incident.affectedRadiusMeters)}m radius.`,
        category: incident.primaryCategory,
        reportIds: selectedReportIds,
        assignedDepartment: selectedDepartment,
        assignedOfficer: selectedOfficer,
        actionNotes: actionNotes.trim(),
        confidenceScore: (incident as any).confidenceScore ?? (incident as any).incidentConfidence ?? 85.0,
        centerLatitude: (incident as any).centerLatitude,
        centerLongitude: (incident as any).centerLongitude,
        radiusMeters: incident.affectedRadiusMeters,
        explainableReasons: incident.explainableReasons,
        createdBy: user?.fullName || 'Executive Duty Officer',
      };

      const result = await onSubmitJointAction(request);
      setSuccessResult(result);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to create Joint Action work package.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) {
          onClose();
          setSuccessResult(null);
        }
      }}
      title="Create Coordinated Joint Action"
      subtitle="Operationalize 3D Potential Incident into a single coordinated work order"
      maxWidth="2xl"
    >
      {successResult ? (
        <div className="space-y-4 py-4 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border-2 border-emerald-200">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#172B4D]">Joint Action Work Package Created!</h3>
            <p className="text-xs text-[#526581] max-w-md mx-auto">
              <strong className="text-emerald-700">{successResult.reportsUpdated} citizen complaints</strong> have been consolidated and transitioned to <span className="font-semibold text-[#172B4D]">Assigned</span> status.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-[#E2E8F0] text-left text-xs max-w-md mx-auto space-y-2">
            <div className="flex justify-between">
              <span className="text-[#718096]">Incident ID:</span>
              <span className="font-mono font-bold text-[#172B4D]">#{successResult.incidentId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#718096]">Assigned Department:</span>
              <span className="font-medium text-[#172B4D]">{successResult.assignedDepartment}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#718096]">Assigned Officer / Crew:</span>
              <span className="font-medium text-[#172B4D]">{successResult.assignedOfficer}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#718096]">Operational Status:</span>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Action Created / Dispatched
              </span>
            </div>
          </div>

          <div className="pt-2 flex justify-center">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setSuccessResult(null);
                onClose();
              }}
              className="bg-[#1769D2] text-white hover:bg-blue-700 px-6 text-xs"
            >
              Done & Return to Insights
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5 text-xs text-[#172B4D]">
          {/* Incident Cluster Header Card */}
          <Card className="p-3.5 bg-amber-50/60 border-amber-200 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono bg-amber-100 text-amber-900 border border-amber-300">
                    #{incident.incidentId}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                    Confidence {incident.confidenceDisplay}
                  </span>
                  <span className="text-[10px] font-medium text-[#526581]">
                    {incident.primaryCategoryLabel}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-[#172B4D] mt-1">{incident.incidentLabel}</h4>
              </div>

              <span className="text-[11px] font-bold text-[#92400E] bg-white/80 px-2.5 py-1 rounded border border-amber-200">
                {incident.complaintCount} Complaints Grouped
              </span>
            </div>

            {/* Explainable Drivers */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {((incident as any).topDrivers || incident.explainableReasons || []).slice(0, 4).map((driver: string, idx: number) => (
                <span
                  key={idx}
                  className="text-[10px] font-medium bg-white border border-amber-200 text-amber-900 px-2 py-0.5 rounded"
                >
                  • {driver}
                </span>
              ))}
            </div>
          </Card>

          {/* Member Complaints Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#526581]">
                Consolidated Grievance Members ({selectedReportIds.length} of {incident.memberComplaintIds.length} selected):
              </span>
              <button
                type="button"
                onClick={() =>
                  setSelectedReportIds(
                    selectedReportIds.length === incident.memberComplaintIds.length
                      ? []
                      : incident.memberComplaintIds
                  )
                }
                className="text-[11px] text-[#1769D2] hover:underline font-semibold"
              >
                {selectedReportIds.length === incident.memberComplaintIds.length
                  ? 'Deselect All'
                  : 'Select All'}
              </button>
            </div>

            <div className="max-h-44 overflow-y-auto space-y-1.5 border border-[#E2E8F0] rounded-lg p-2 bg-slate-50">
              {memberComplaints.length > 0 ? (
                memberComplaints.map((c) => {
                  const isChecked = selectedReportIds.includes(c.id);
                  return (
                    <div
                      key={c.id}
                      onClick={() => toggleReportSelection(c.id)}
                      className={`flex items-center justify-between p-2 rounded border text-xs cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-white border-blue-300 shadow-xs'
                          : 'bg-slate-100/60 border-transparent opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 pointer-events-none"
                        />
                        <div>
                          <div className="font-semibold text-[#172B4D] flex items-center gap-2">
                            <span className="font-mono text-[11px] text-blue-700 font-bold">#{c.id}</span>
                            <span>{c.title}</span>
                          </div>
                          <div className="text-[10px] text-[#718096] flex items-center gap-3 mt-0.5">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {c.location.address || c.location.ward}
                            </span>
                            <span>Status: <strong className="capitalize">{c.status}</strong></span>
                            <span>Priority: <strong className="capitalize">{c.priority}</strong></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                incident.memberComplaintIds.map((cid) => (
                  <div key={cid} className="p-2 rounded bg-white border border-[#E2E8F0] flex items-center justify-between">
                    <span className="font-mono font-bold text-blue-700">#{cid}</span>
                    <span className="text-[10px] text-[#718096]">Member Report</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Operational Assignment Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#526581] flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-[#1769D2]" />
                <span>Assigned Department *</span>
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full text-xs rounded border border-[#CBD5E1] p-2 bg-white text-[#172B4D] focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DEFAULT_DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#526581] flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-[#1769D2]" />
                <span>Duty Officer / Field Crew *</span>
              </label>
              <select
                value={selectedOfficer}
                onChange={(e) => setSelectedOfficer(e.target.value)}
                className="w-full text-xs rounded border border-[#CBD5E1] p-2 bg-white text-[#172B4D] focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DEFAULT_CREWS.map((crew) => (
                  <option key={crew} value={crew}>
                    {crew}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Notes */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#526581] flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-[#1769D2]" />
              <span>Operational Work Package Notes / Dispatch Directive</span>
            </label>
            <textarea
              rows={2}
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              placeholder="Enter specific instructions for the assigned field officer..."
              className="w-full text-xs rounded border border-[#CBD5E1] p-2 bg-white text-[#172B4D] focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Error Banner */}
          {submitError && (
            <div className="p-2.5 rounded bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Governance Notice */}
          <div className="p-2.5 rounded bg-blue-50/60 border border-blue-200 text-[11px] text-[#526581] flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-[#1769D2] shrink-0 mt-0.5" />
            <p leading-relaxed>
              <strong>Municipal Workflow Governance:</strong> Executing this action sets all {selectedReportIds.length} member complaints to <span className="font-semibold text-[#172B4D]">Assigned</span> and records an immutable audit log entry. The complaints will continue through standard field execution and final 3E resolution verification.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-[#E8EEF5] flex items-center justify-end gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirm}
              disabled={isSubmitting || selectedReportIds.length === 0}
              className="bg-[#1769D2] hover:bg-blue-700 text-white text-xs font-bold gap-1.5 px-4"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating Joint Action...</span>
                </>
              ) : (
                <>
                  <Layers className="w-3.5 h-3.5" />
                  <span>Confirm & Create Joint Action</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
