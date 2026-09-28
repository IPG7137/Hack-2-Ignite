import React, { useState } from 'react';
import {
  Image,
  CheckCircle,
  ZoomIn,
  Sliders,
  Columns,
  MapPin,
  Clock,
  Sparkles,
  AlertTriangle,
  X,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { LocationVerificationResult, AIAssistedVisualAnalysis } from '../../types/evidence';

interface BeforeAfterInspectorProps {
  beforeImages: string[];
  afterImages?: string[];
  title?: string;
  originalLocation?: { latitude?: number; longitude?: number };
  resolutionLocation?: { latitude?: number; longitude?: number };
  locationResult?: LocationVerificationResult;
  aiReview?: AIAssistedVisualAnalysis;
  capturedAt?: string;
  uploadedAt?: string;
}

export const BeforeAfterInspector: React.FC<BeforeAfterInspectorProps> = ({
  beforeImages = [],
  afterImages = [],
  title = 'Resolution Photographic Audit',
  locationResult,
  aiReview,
  capturedAt,
  uploadedAt,
}) => {
  const [selectedBefore, setSelectedBefore] = useState(0);
  const [selectedAfter, setSelectedAfter] = useState(0);
  const [viewMode, setViewMode] = useState<'sideBySide' | 'slider'>('sideBySide');
  const [sliderPos, setSliderPos] = useState(50);
  const [zoomModalUrl, setZoomModalUrl] = useState<string | null>(null);

  const currentBeforeImg = beforeImages[selectedBefore] || '';
  const currentAfterImg = afterImages[selectedAfter] || '';

  return (
    <Card className="p-4 border-[#D9E2EC] bg-white shadow-sm space-y-4">
      {/* Header with View Mode Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E8EEF5]">
        <div className="flex items-center gap-2">
          <Image className="w-4 h-4 text-[#1769D2]" />
          <div>
            <h4 className="text-xs font-bold text-[#172B4D] uppercase tracking-wider">
              {title}
            </h4>
            <span className="text-[10px] font-mono text-[#526581]">
              Geotagged & Tamper-Protected Audit Ledger
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setViewMode('sideBySide')}
            className={`px-2.5 py-1 text-xs font-medium rounded flex items-center gap-1 transition-all ${
              viewMode === 'sideBySide'
                ? 'bg-white text-[#172B4D] shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Side-by-Side</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('slider')}
            className={`px-2.5 py-1 text-xs font-medium rounded flex items-center gap-1 transition-all ${
              viewMode === 'slider'
                ? 'bg-white text-[#172B4D] shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Interactive Slider</span>
          </button>
        </div>
      </div>

      {/* Metadata Badges (GPS Distance & Timestamp Verification) */}
      <div className="flex flex-wrap items-center gap-2">
        {locationResult && (
          <div
            className={`px-2.5 py-1 rounded text-xs font-mono flex items-center gap-1.5 border ${
              locationResult.badgeVariant === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : locationResult.badgeVariant === 'warning'
                ? 'bg-amber-50 text-amber-900 border-amber-300'
                : 'bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span>{locationResult.statusLabel}</span>
          </div>
        )}

        {(capturedAt || uploadedAt) && (
          <div className="px-2.5 py-1 rounded text-xs font-mono bg-blue-50 text-blue-900 border border-blue-200 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 shrink-0 text-blue-600" />
            <span>
              {capturedAt ? `Captured: ${new Date(capturedAt).toLocaleTimeString()}` : ''}
              {capturedAt && uploadedAt ? ' · ' : ''}
              {uploadedAt ? `Uploaded: ${new Date(uploadedAt).toLocaleTimeString()}` : ''}
            </span>
          </div>
        )}
      </div>

      {/* AI-Assisted Advisory Visual Assessment Signal */}
      {aiReview && aiReview.isAvailable && (
        <div className="p-3 bg-gradient-to-r from-purple-50/70 to-indigo-50/70 border border-purple-200 rounded-lg text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-purple-950 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              AI-Assisted Evidence Review (Advisory Signal)
            </span>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold border border-purple-300">
              Confidence: {aiReview.confidenceScore}% · Resolution: {aiReview.resolutionIndication.toUpperCase()}
            </span>
          </div>
          <p className="text-purple-900 text-[11px] leading-relaxed">
            {aiReview.summary}
          </p>
          <div className="text-[10px] text-purple-700 italic flex items-center gap-1 pt-0.5">
            <AlertTriangle className="w-3 h-3 text-purple-500" />
            <span>{aiReview.disclaimer}</span>
          </div>
        </div>
      )}

      {/* Main Comparison Area */}
      {viewMode === 'sideBySide' ? (
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
              {currentBeforeImg ? (
                <>
                  <img
                    src={currentBeforeImg}
                    alt="Initial Defect Before"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <button
                    type="button"
                    onClick={() => setZoomModalUrl(currentBeforeImg)}
                    className="absolute top-2 right-2 p-1.5 rounded bg-black/60 text-white hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100"
                    title="Zoom in"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </>
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
                      selectedBefore === i
                        ? 'border-amber-500 ring-2 ring-amber-400/30'
                        : 'border-[#D9E2EC] opacity-70'
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
              {afterImages.length > 0 && currentAfterImg ? (
                <>
                  <img
                    src={currentAfterImg}
                    alt="Resolution Proof After"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <button
                    type="button"
                    onClick={() => setZoomModalUrl(currentAfterImg)}
                    className="absolute top-2 right-2 p-1.5 rounded bg-black/60 text-white hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100"
                    title="Zoom in"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-xs text-[#718096] p-4 text-center">
                  <span className="text-[#526581] font-medium">Awaiting Field Crew Upload</span>
                  <span className="text-[10px] text-[#718096] mt-1">
                    Contractor will upload geotagged resolution photo upon job completion
                  </span>
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
                      selectedAfter === i
                        ? 'border-emerald-500 ring-2 ring-emerald-400/30'
                        : 'border-[#D9E2EC] opacity-70'
                    }`}
                  >
                    <img src={img} alt="thumb" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Interactive Split Image Slider */
        <div className="space-y-3">
          <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-300 bg-slate-100 select-none">
            {currentBeforeImg && currentAfterImg ? (
              <>
                {/* Before Image (Bottom Layer) */}
                <img
                  src={currentBeforeImg}
                  alt="Before"
                  className="absolute inset-0 w-full h-full object-cover"
                />

                {/* After Image (Clipped Top Layer) */}
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${sliderPos}%` }}
                >
                  <img
                    src={currentAfterImg}
                    alt="After"
                    className="absolute inset-0 w-full h-full object-cover max-w-none"
                    style={{ width: '100%', height: '100%' }}
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-emerald-700/80 text-[10px] font-mono text-white font-bold">
                    AFTER REMEDIATION
                  </div>
                </div>

                <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-amber-700/80 text-[10px] font-mono text-white font-bold">
                  BEFORE (CITIZEN REPORT)
                </div>

                {/* Vertical Divider Handle */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize flex items-center justify-center"
                  style={{ left: `${sliderPos}%` }}
                >
                  <div className="w-6 h-6 rounded-full bg-white shadow-md border border-slate-300 flex items-center justify-center text-slate-700 text-xs font-bold">
                    ↔
                  </div>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 p-4 text-center">
                Interactive slider requires both Before and After photographic evidence.
              </div>
            )}
          </div>

          {currentBeforeImg && currentAfterImg && (
            <div className="flex items-center gap-3 px-2">
              <span className="text-[11px] font-mono text-[#526581]">After</span>
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPos}
                onChange={(e) => setSliderPos(Number(e.target.value))}
                className="flex-1 accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
              <span className="text-[11px] font-mono text-[#526581]">Before</span>
            </div>
          )}
        </div>
      )}

      {/* Full-Screen Zoom Modal */}
      {zoomModalUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setZoomModalUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-black rounded-lg overflow-hidden border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setZoomModalUrl(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/70 text-white hover:bg-black transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={zoomModalUrl}
              alt="Zoomed Evidence"
              className="w-full h-full object-contain max-h-[85vh]"
            />
          </div>
        </div>
      )}
    </Card>
  );
};
