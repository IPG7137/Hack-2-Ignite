import React, { useState } from 'react';
import {
  Award,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  TreePine,
  ExternalLink,
  Sparkles,
  Info,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import {
  CivicOccasion,
  CivicCertificate,
  CivicRedemption,
  RecognitionEligibilityResult,
} from '../../types/civicRecognition';
import { CIVIC_OCCASIONS_CATALOG, civicRecognitionService } from '../../services/civicRecognitionService';
import { CitizenCivicProfile } from '../../types/civicRewards';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface CivicOccasionRecognitionSectionProps {
  profile: CitizenCivicProfile | null;
  certificates: CivicCertificate[];
  redemptions: CivicRedemption[];
  districtName: string;
  onViewCertificate: (cert: CivicCertificate) => void;
  onOpenPlantRedemption: (cert: CivicCertificate) => void;
  onRefresh: () => void;
}

export const CivicOccasionRecognitionSection: React.FC<CivicOccasionRecognitionSectionProps> = ({
  profile,
  certificates,
  redemptions,
  districtName,
  onViewCertificate,
  onOpenPlantRedemption,
  onRefresh,
}) => {
  const [claimingOccasionId, setClaimingOccasionId] = useState<string | null>(null);
  const [claimFeedback, setClaimFeedback] = useState<{ message: string; isError: boolean } | null>(null);

  // Evaluate eligibility for each occasion
  const occasionsWithEligibility = CIVIC_OCCASIONS_CATALOG.map((occ) => {
    const existingCert = certificates.find((c) => c.occasionId === occ.id);
    const existingRedemption = redemptions.find((r) => r.certificateId === existingCert?.id);
    const eligibility: RecognitionEligibilityResult = civicRecognitionService.evaluateEligibility({
      profile: profile || undefined,
      occasionId: occ.id,
    });

    return {
      occasion: occ,
      existingCert,
      existingRedemption,
      eligibility,
    };
  });

  const handleClaimCertificate = async (occasion: CivicOccasion) => {
    setClaimingOccasionId(occasion.id);
    setClaimFeedback(null);
    try {
      const res = await civicRecognitionService.issueCertificate({
        userId: profile?.userId,
        userName: profile?.displayName || 'Citizen Contributor',
        districtId: profile?.districtId || 'solapur',
        districtName: districtName || 'Solapur',
        occasionId: occasion.id,
      });

      if (res.success && res.certificate) {
        setClaimFeedback({
          message: `Official ${res.certificate.occasionName} Certificate generated (${res.certificate.certificateNumber})!`,
          isError: false,
        });
        onRefresh();
        onViewCertificate(res.certificate);
      } else {
        setClaimFeedback({
          message: res.error || 'Could not issue certificate.',
          isError: true,
        });
      }
    } catch (err: any) {
      setClaimFeedback({
        message: err?.message || 'Error processing certificate claim.',
        isError: true,
      });
    } finally {
      setClaimingOccasionId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-600" />
          <h2 className="text-base font-bold text-[#123B6D] tracking-tight">
            Special Civic Occasions & Digital Recognition
          </h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold">
            Verified Civic Merits
          </span>
        </div>
        <span className="text-xs text-[#526581]">
          Conferred on national & civic milestones for quality contributions
        </span>
      </div>

      {claimFeedback && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
            claimFeedback.isError
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          {claimFeedback.isError ? (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          )}
          <span>{claimFeedback.message}</span>
        </div>
      )}

      {/* Occasions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {occasionsWithEligibility.map(({ occasion, existingCert, existingRedemption, eligibility }) => {
          const isClaimed = !!existingCert;
          const isEligible = eligibility.isEligible;

          return (
            <Card
              key={occasion.id}
              className={`p-4 bg-white border flex flex-col justify-between transition-all ${
                isClaimed
                  ? 'border-emerald-300 shadow-sm bg-gradient-to-b from-emerald-50/20 to-white'
                  : isEligible
                  ? 'border-amber-300 shadow-xs ring-1 ring-amber-200'
                  : 'border-[#D9E2EC]'
              }`}
            >
              <div className="space-y-3">
                {/* Occasion Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#718096] font-bold block">
                      {occasion.calendarDate}
                    </span>
                    <h3 className="text-sm font-bold text-[#123B6D]">{occasion.name}</h3>
                  </div>
                  <span
                    className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase border ${
                      isClaimed
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : isEligible
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {isClaimed ? 'Conferred' : isEligible ? 'Eligible' : 'In Progress'}
                  </span>
                </div>

                <p className="text-xs text-[#526581] leading-relaxed">{occasion.description}</p>

                {/* Eligibility Criteria Checklist */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5 text-[11px]">
                  <div className="font-bold text-[#123B6D] text-[10px] uppercase font-mono">
                    Occasion Requirements:
                  </div>
                  <div className="flex items-center justify-between text-[#526581]">
                    <span>Civic Score Target:</span>
                    <strong className={eligibility.scoreTargetMet ? 'text-emerald-700' : 'text-slate-600'}>
                      {profile?.civicScore || 0} / {occasion.minimumScore} pts
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-[#526581]">
                    <span>Verified Reports:</span>
                    <strong className={eligibility.verifiedReportsTargetMet ? 'text-emerald-700' : 'text-slate-600'}>
                      {profile?.verifiedReportsCount || 0} / {occasion.minVerifiedReports}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-[#526581]">
                    <span>Resolution Audits:</span>
                    <strong className={eligibility.verifiedResolutionsTargetMet ? 'text-emerald-700' : 'text-slate-600'}>
                      {profile?.verifiedResolutionsCount || 0} / {occasion.minVerifiedResolutions}
                    </strong>
                  </div>
                </div>

                {/* Certificate info if already claimed */}
                {existingCert && (
                  <div className="p-2.5 bg-emerald-50/80 rounded-lg border border-emerald-200 text-xs space-y-1">
                    <div className="text-[10px] font-mono text-emerald-800 font-bold">
                      Cert ID: {existingCert.certificateNumber}
                    </div>
                    <div className="text-[11px] text-emerald-900">
                      Conferred: {new Date(existingCert.issuedAt).toLocaleDateString('en-IN')}
                    </div>
                    {existingRedemption && (
                      <div className="text-[10px] font-mono text-teal-800 font-semibold flex items-center gap-1">
                        <TreePine className="w-3 h-3" />
                        <span>Sapling Voucher: {existingRedemption.voucherCode}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 mt-3 border-t border-[#E8EEF5] space-y-2">
                {isClaimed && existingCert ? (
                  <div className="space-y-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewCertificate(existingCert)}
                      className="w-full h-7 text-xs font-semibold text-[#1769D2] border-blue-200 hover:bg-blue-50 gap-1"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>View Official Certificate</span>
                    </Button>
                    {existingCert.plantRedeemable && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenPlantRedemption(existingCert)}
                        className="w-full h-7 text-xs font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50 gap-1"
                      >
                        <TreePine className="w-3.5 h-3.5" />
                        <span>{existingRedemption ? 'View Plant Voucher' : 'Claim Plant Sapling Voucher'}</span>
                      </Button>
                    )}
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!isEligible || claimingOccasionId === occasion.id}
                    onClick={() => handleClaimCertificate(occasion)}
                    className={`w-full h-7 text-xs font-semibold gap-1 ${
                      isEligible
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {claimingOccasionId === occasion.id
                        ? 'Generating...'
                        : isEligible
                        ? 'Claim Recognition Certificate'
                        : 'Requirements Pending'}
                    </span>
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Verified Rules Disclaimer */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 text-xs text-[#526581]">
        <Info className="w-4 h-4 text-[#1769D2] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-[#123B6D] block">CivicResolve Recognition Integrity Principles:</strong>
          <p className="text-[11px] leading-relaxed">
            Certificates and municipal plant vouchers are awarded exclusively for <strong>quality-verified civic contributions</strong> (inspected by on-site field officers or authenticated community audits). Submitting bulk complaints or duplicate spam yields zero points. Pending reviews do not penalize users, while confirmed fraud blocks certificate issuance.
          </p>
        </div>
      </div>
    </div>
  );
};
