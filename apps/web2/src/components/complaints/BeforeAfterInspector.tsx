import React, { useState } from 'react';
import { Image, CheckCircle, ZoomIn } from 'lucide-react';
import { Card } from '../ui/Card';

interface BeforeAfterInspectorProps {
  beforeImages: string[];
  afterImages?: string[];
  title?: string;
}

export const BeforeAfterInspector: React.FC<BeforeAfterInspectorProps> = ({
  beforeImages,
  afterImages = [],
  title = 'Resolution Photographic Audit',
}) => {
  const [selectedBefore, setSelectedBefore] = useState(0);
  const [selectedAfter, setSelectedAfter] = useState(0);

  return (
    <Card className="p-4 border-[#D9E2EC] bg-white shadow-sm">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E8EEF5]">
        <div className="flex items-center gap-2">
          <Image className="w-4 h-4 text-[#1769D2]" />
          <h4 className="text-xs font-bold text-[#172B4D] uppercase tracking-wider">
            {title}
          </h4>
        </div>
        <span className="text-[10px] font-mono text-[#526581]">
          Geotagged & Tamper-Protected Audit Ledger
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Citizen Report Proof ("BEFORE") */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#B45309] uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#D99A00]" />
              Initial Citizen Submission (Before)
            </span>
            <span className="text-[10px] text-[#526581] font-mono">
              {beforeImages.length} Photo{beforeImages.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="relative aspect-video rounded-lg overflow-hidden border border-amber-300/80 bg-slate-100 group">
            {beforeImages[selectedBefore] ? (
              <img
                src={beforeImages[selectedBefore]}
                alt="Initial Defect Before"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-[#718096]">
                No initial image captured
              </div>
            )}
            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/75 backdrop-blur text-[10px] font-mono text-white">
              ORIGINAL CITIZEN PROOF
            </div>
          </div>

          {/* Thumbnails */}
          {beforeImages.length > 1 && (
            <div className="flex gap-2 pt-1">
              {beforeImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedBefore(i)}
                  className={`w-14 h-10 rounded overflow-hidden border ${
                    selectedBefore === i ? 'border-amber-500 ring-2 ring-amber-400/30' : 'border-[#D9E2EC] opacity-70'
                  }`}
                >
                  <img src={img} alt="thumb" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Contractor Rectification Proof ("AFTER") */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#16803C] uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#16803C]" />
              Field Remediation Verification (After)
            </span>
            <span className="text-[10px] text-[#526581] font-mono">
              {afterImages.length > 0 ? `${afterImages.length} Proof Photo(s)` : 'Pending Remediation'}
            </span>
          </div>

          <div className="relative aspect-video rounded-lg overflow-hidden border border-emerald-300/80 bg-slate-100 group">
            {afterImages.length > 0 && afterImages[selectedAfter] ? (
              <img
                src={afterImages[selectedAfter]}
                alt="Resolution Proof After"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-xs text-[#718096] p-4 text-center">
                <span className="text-[#526581] font-medium">Awaiting Field Crew Upload</span>
                <span className="text-[10px] text-[#718096] mt-1">Contractor will upload geotagged resolution photo upon job completion</span>
              </div>
            )}
            {afterImages.length > 0 && (
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/75 backdrop-blur text-[10px] font-mono text-emerald-200 flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-emerald-400" />
                <span>OFFICIAL REMEDIATION AUDIT</span>
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {afterImages.length > 1 && (
            <div className="flex gap-2 pt-1">
              {afterImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedAfter(i)}
                  className={`w-14 h-10 rounded overflow-hidden border ${
                    selectedAfter === i ? 'border-emerald-500 ring-2 ring-emerald-400/30' : 'border-[#D9E2EC] opacity-70'
                  }`}
                >
                  <img src={img} alt="thumb" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
