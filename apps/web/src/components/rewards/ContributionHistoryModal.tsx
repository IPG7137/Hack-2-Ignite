import React from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  MapPin,
  Camera,
  AlertTriangle,
  X,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { CivicContribution } from '../../types/civicRewards';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface ContributionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  contributions: CivicContribution[];
  citizenName?: string;
  civicScore?: number;
  districtName?: string;
}

export const ContributionHistoryModal: React.FC<ContributionHistoryModalProps> = ({
  isOpen,
  onClose,
  contributions = [],
  citizenName = 'Verified Citizen',
  civicScore = 0,
  districtName = 'Maharashtra',
}) => {
  if (!isOpen) return null;

  const totalPoints = contributions.reduce((acc, c) => acc + c.points, 0);

  const getContributionIcon = (type: string) => {
    switch (type) {
      case 'verified_report':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'accurate_location':
        return <MapPin className="w-4 h-4 text-blue-600" />;
      case 'useful_evidence':
        return <Camera className="w-4 h-4 text-purple-600" />;
      case 'critical_issue_bonus':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'resolution_verification':
        return <ShieldCheck className="w-4 h-4 text-teal-600" />;
      default:
        return <Award className="w-4 h-4 text-amber-600" />;
    }
  };

  const formatContributionType = (type: string) => {
    switch (type) {
      case 'verified_report':
        return 'Verified Civic Grievance';
      case 'accurate_location':
        return 'Precise GIS Coordinate Audit';
      case 'useful_evidence':
        return 'Geotagged Photographic Proof';
      case 'critical_issue_bonus':
        return 'Critical Safety Priority Bonus';
      case 'resolution_verification':
        return 'On-Site Resolution Verification';
      case 'resolution_upvote':
        return 'Community Verification Consensus';
      default:
        return 'Civic Contribution';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-white border-[#D9E2EC] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#123B6D] to-[#1E4E8C] px-5 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
              <Award className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
                <span>Civic Contribution Audit Log</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/30 text-blue-100 border border-blue-400/30">
                  {districtName} District
                </span>
              </h3>
              <p className="text-[11px] text-blue-100 font-mono mt-0.5">
                Transparent verification breakdown for {citizenName} • Total Score: {civicScore} Pts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Audit Trail Summary Banner */}
        <div className="bg-slate-50 border-b border-[#E8EEF5] px-5 py-3 grid grid-cols-3 gap-3 text-center shrink-0">
          <div className="bg-white p-2 rounded-lg border border-[#E8EEF5]">
            <div className="text-[10px] text-[#718096] uppercase font-bold">Total Verified Actions</div>
            <div className="text-base font-bold text-[#172B4D] mt-0.5">{contributions.length}</div>
          </div>
          <div className="bg-white p-2 rounded-lg border border-[#E8EEF5]">
            <div className="text-[10px] text-[#718096] uppercase font-bold">Points Audited</div>
            <div className="text-base font-bold text-[#16803C] mt-0.5">+{totalPoints}</div>
          </div>
          <div className="bg-white p-2 rounded-lg border border-[#E8EEF5]">
            <div className="text-[10px] text-[#718096] uppercase font-bold">Anti-Spam Verification</div>
            <div className="text-xs font-bold text-emerald-700 mt-1 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>100% Verified</span>
            </div>
          </div>
        </div>

        {/* Audit History List */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1 text-xs">
          {contributions.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <div className="font-semibold text-slate-600">No verified contribution records yet.</div>
              <p className="text-[11px] mt-1">Submit verified reports or confirm resolutions to build your Civic Score.</p>
            </div>
          ) : (
            contributions.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-lg border border-[#E8EEF5] bg-white hover:border-blue-200 transition-all flex items-start justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                    {getContributionIcon(item.contributionType)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[#172B4D]">
                        {formatContributionType(item.contributionType)}
                      </span>
                      {item.complaintId && (
                        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-[#526581] border border-slate-200">
                          {item.complaintId}
                        </span>
                      )}
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-bold">
                        VERIFIED
                      </span>
                    </div>
                    <p className="text-[11px] text-[#526581] mt-1 leading-relaxed">{item.description}</p>
                    <div className="text-[10px] text-[#9CA3AF] font-mono mt-1.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(item.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full font-mono text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    +{item.points} pts
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E8EEF5] bg-slate-50/80 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-[#718096]">
            Every point is backed by an auditable civic record in the district registry.
          </span>
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs font-semibold">
            Close Audit Log
          </Button>
        </div>
      </Card>
    </div>
  );
};
