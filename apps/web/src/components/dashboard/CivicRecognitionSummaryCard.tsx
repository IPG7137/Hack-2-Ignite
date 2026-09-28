import React from 'react';
import {
  Award,
  TreePine,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
  Info,
} from 'lucide-react';
import { UnifiedDashboardMetrics } from '../../services/dashboardIntelligenceService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface CivicRecognitionSummaryCardProps {
  recognition: UnifiedDashboardMetrics['recognition'];
  onNavigatePage: (page: string) => void;
}

export const CivicRecognitionSummaryCard: React.FC<CivicRecognitionSummaryCardProps> = ({
  recognition,
  onNavigatePage,
}) => {
  return (
    <Card className="bg-white border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#123B6D] uppercase tracking-wider">
              Verified Civic Recognition & Nursery Redemption
            </h3>
            <p className="text-[11px] text-[#718096]">
              Quality merit milestones & Municipal Social Forestry sapling vouchers
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 font-bold">
          {recognition.totalCertificatesIssued} DIGITAL CERTIFICATES
        </span>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {/* Verified Participation Milestone Distribution (Non-Competitive) */}
        <div>
          <div className="text-[11px] font-bold text-slate-800 mb-2">
            Verified Participation Milestones:
          </div>
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200">
              <div className="text-[10px] font-mono uppercase text-emerald-800 font-bold">
                Contributor
              </div>
              <div className="text-xl font-extrabold font-mono text-emerald-900 mt-0.5">
                {recognition.contributorCount}
              </div>
              <div className="text-[9px] text-emerald-700 font-medium mt-0.5">Entry Merits</div>
            </div>

            <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200">
              <div className="text-[10px] font-mono uppercase text-blue-800 font-bold">
                Supporter
              </div>
              <div className="text-xl font-extrabold font-mono text-blue-900 mt-0.5">
                {recognition.supporterCount}
              </div>
              <div className="text-[9px] text-blue-700 font-medium mt-0.5">Active Audits</div>
            </div>

            <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200">
              <div className="text-[10px] font-mono uppercase text-amber-800 font-bold">
                Champion
              </div>
              <div className="text-xl font-extrabold font-mono text-amber-900 mt-0.5">
                {recognition.championCount}
              </div>
              <div className="text-[9px] text-amber-700 font-medium mt-0.5">Top Stewards</div>
            </div>
          </div>
        </div>

        {/* Municipal Social Forestry Sapling Redemption Block */}
        <div className="p-3.5 bg-gradient-to-r from-emerald-50/80 to-teal-50/80 rounded-xl border border-emerald-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-950">
              <TreePine className="w-4 h-4 text-emerald-700" />
              <span>Municipal Social Forestry Redemption Desk:</span>
            </div>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
              IN-PERSON PICKUP
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-white p-2 rounded-lg border border-emerald-200">
              <div className="text-[10px] text-[#718096]">Requested</div>
              <div className="font-mono font-bold text-slate-800 mt-0.5">
                {recognition.plantVouchersRequested}
              </div>
            </div>
            <div className="bg-white p-2 rounded-lg border border-emerald-200">
              <div className="text-[10px] text-[#718096]">Approved</div>
              <div className="font-mono font-bold text-teal-700 mt-0.5">
                {recognition.plantVouchersApproved}
              </div>
            </div>
            <div className="bg-white p-2 rounded-lg border border-emerald-200">
              <div className="text-[10px] text-[#718096]">Collected</div>
              <div className="font-mono font-bold text-emerald-700 mt-0.5">
                {recognition.plantVouchersRedeemed}
              </div>
            </div>
          </div>

          <div className="text-[10px] text-emerald-800 leading-tight">
            Native saplings (Neem, Peepal, Banyan, Tulsi) collection vouchers issued to verified civic champions.
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
        <span className="text-[11px] text-[#718096]">
          Occasion recognition: <strong>{recognition.activeOccasionName}</strong>
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigatePage('civic_champions')}
          className="h-7 text-xs text-amber-700 border-amber-300 hover:bg-amber-50 gap-1 font-semibold"
        >
          <span>Civic Champions & Nursery Desk</span>
          <ArrowRight className="w-3 h-3" />
        </Button>
      </div>
    </Card>
  );
};
