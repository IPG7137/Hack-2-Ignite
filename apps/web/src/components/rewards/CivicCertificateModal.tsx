import React from 'react';
import {
  Award,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Download,
  Printer,
  Copy,
  Check,
  ExternalLink,
  X,
  Sparkles,
  TreePine,
} from 'lucide-react';
import { CivicCertificate } from '../../types/civicRecognition';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface CivicCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  certificate: CivicCertificate | null;
  onOpenPlantRedemption?: (cert: CivicCertificate) => void;
}

export const CivicCertificateModal: React.FC<CivicCertificateModalProps> = ({
  isOpen,
  onClose,
  certificate,
  onOpenPlantRedemption,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !certificate) return null;

  const handleCopyLink = () => {
    const url = `${window.location.origin}/verify/certificate/${certificate.certificateNumber}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const tierColors = {
    CHAMPION: {
      border: 'border-amber-400',
      badgeBg: 'bg-amber-50 text-amber-800 border-amber-300',
      headerBg: 'from-amber-700 via-amber-600 to-amber-800',
      goldAccent: 'text-amber-600',
      ribbon: 'Civic Champion of Maharashtra',
    },
    SUPPORTER: {
      border: 'border-blue-400',
      badgeBg: 'bg-blue-50 text-blue-800 border-blue-300',
      headerBg: 'from-blue-700 via-indigo-600 to-blue-800',
      goldAccent: 'text-blue-600',
      ribbon: 'Civic Supporter of Maharashtra',
    },
    CONTRIBUTOR: {
      border: 'border-emerald-400',
      badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      headerBg: 'from-emerald-700 via-teal-600 to-emerald-800',
      goldAccent: 'text-emerald-600',
      ribbon: 'Civic Contributor of Maharashtra',
    },
  }[certificate.recognitionTier] || {
    border: 'border-blue-400',
    badgeBg: 'bg-blue-50 text-blue-800 border-blue-300',
    headerBg: 'from-blue-700 via-indigo-600 to-blue-800',
    goldAccent: 'text-blue-600',
    ribbon: 'Civic Recognition',
  };

  const issueDateFormatted = new Date(certificate.issuedAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-8">
        {/* Top Control Bar (Non-Printable) */}
        <div className="no-print p-3 sm:p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <span className="text-xs sm:text-sm font-bold tracking-wide">
              Official Digital Civic Certificate
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-7 text-xs bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print / Save PDF</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="h-7 text-xs bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Link Copied' : 'Share Link'}</span>
            </Button>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ==================================================
            OFFICIAL DIGITAL CERTIFICATE CANVAS
            ================================================== */}
        <div className="p-5 sm:p-8 bg-gradient-to-b from-amber-50/40 via-white to-amber-50/30">
          {/* Certificate Ornate Double Border */}
          <div className={`p-6 sm:p-8 rounded-xl border-4 ${tierColors.border} bg-white shadow-md relative overflow-hidden`}>
            {/* Watermark Background Seal */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
              <ShieldCheck className="w-96 h-96 text-slate-900" />
            </div>

            {/* Corner Decorative Ornaments */}
            <div className="absolute top-2 left-2 text-xs text-amber-500 font-serif">✦</div>
            <div className="absolute top-2 right-2 text-xs text-amber-500 font-serif">✦</div>
            <div className="absolute bottom-2 left-2 text-xs text-amber-500 font-serif">✦</div>
            <div className="absolute bottom-2 right-2 text-xs text-amber-500 font-serif">✦</div>

            {/* Header / Seal */}
            <div className="text-center space-y-2 mb-6">
              <div className="inline-flex items-center justify-center p-2 rounded-full bg-amber-100/70 border border-amber-300 text-amber-800 mb-1">
                <Award className="w-8 h-8 text-amber-600" />
              </div>

              <div className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-widest text-[#526581]">
                GOVERNMENT OF MAHARASHTRA • URBAN & RURAL CIVIC OVERSIGHT
              </div>
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#123B6D] tracking-tight">
                Certificate of Civic Recognition
              </h1>
              <div className="inline-block px-3 py-1 rounded-full text-xs font-mono font-bold uppercase border bg-slate-50 text-slate-700 border-slate-300">
                {certificate.occasionName}
              </div>
            </div>

            {/* Certificate Body */}
            <div className="text-center space-y-4 my-6">
              <p className="text-xs sm:text-sm text-[#526581] italic font-serif">
                This certificate of municipal merit is proudly conferred upon
              </p>

              <div className="text-xl sm:text-2xl font-bold text-[#123B6D] font-serif border-b-2 border-amber-300 pb-1 inline-block px-6">
                {certificate.recipientName}
              </div>

              <div className="text-xs sm:text-sm text-[#526581] font-sans max-w-lg mx-auto leading-relaxed">
                {certificate.citationText ||
                  `In distinguished recognition of verified civic engagement, active issue verification, and constructive municipal participation in ${certificate.districtName} District.`}
              </div>

              {/* Verified Metrics Summary Banner */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-3 gap-2 text-center max-w-md mx-auto">
                <div>
                  <div className="text-xs font-bold text-emerald-700">
                    {certificate.verifiedContributionsSummary.verifiedReportsCount}
                  </div>
                  <div className="text-[9px] text-[#718096] uppercase font-mono">Verified Reports</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-teal-700">
                    {certificate.verifiedContributionsSummary.verifiedResolutionsCount}
                  </div>
                  <div className="text-[9px] text-[#718096] uppercase font-mono">Audited Fixes</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-blue-700">
                    {certificate.verifiedContributionsSummary.totalCivicScore}
                  </div>
                  <div className="text-[9px] text-[#718096] uppercase font-mono">Civic Points</div>
                </div>
              </div>
            </div>

            {/* Certificate Footer / Signatures & ID */}
            <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-4 items-end text-xs">
              <div className="text-left space-y-1">
                <div className="font-mono text-[10px] text-[#718096]">Certificate ID:</div>
                <div className="font-mono font-bold text-slate-800 text-xs sm:text-sm tracking-wide">
                  {certificate.certificateNumber}
                </div>
                <div className="text-[10px] text-emerald-700 flex items-center gap-1 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Digitally Signed & Tamper-Verified</span>
                </div>
              </div>

              <div className="text-right space-y-1">
                <div className="font-mono text-[10px] text-[#718096]">Date of Conferment:</div>
                <div className="font-bold text-slate-800 text-xs sm:text-sm">{issueDateFormatted}</div>
                <div className="text-[10px] font-mono text-[#526581]">
                  {certificate.districtName} District Administration
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions (Non-Printable) */}
        <div className="no-print p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-[#718096] text-center sm:text-left">
            <span>Verifiable public link contains <strong>zero PII</strong> (no phone/Aadhaar exposed).</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {certificate.plantRedeemable && !certificate.plantRedeemed && onOpenPlantRedemption && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onOpenPlantRedemption(certificate)}
                className="w-full sm:w-auto h-8 text-xs bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5"
              >
                <TreePine className="w-3.5 h-3.5" />
                <span>Redeem Govt Nursery Sapling</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="w-full sm:w-auto h-8 text-xs text-slate-700 border-slate-300"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
