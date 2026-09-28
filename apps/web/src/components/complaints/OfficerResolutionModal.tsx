import React, { useState } from 'react';
import { Complaint } from '../../types/complaint';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import {
  Camera,
  MapPin,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  X,
  Upload,
  AlertTriangle,
  LocateFixed,
} from 'lucide-react';
import { ResolutionEvidenceService } from '../../services/resolutionEvidenceService';

interface OfficerResolutionModalProps {
  isOpen: boolean;
  complaint: Complaint;
  officerName: string;
  onClose: () => void;
  onSubmit: (params: {
    resolutionNote: string;
    afterImages: string[];
    resolutionLocation?: { latitude: number; longitude: number };
    capturedAt?: string;
  }) => Promise<void>;
  loading?: boolean;
}

export const OfficerResolutionModal: React.FC<OfficerResolutionModalProps> = ({
  isOpen,
  complaint,
  officerName,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const [resolutionNote, setResolutionNote] = useState('');
  const [afterImageUrl, setAfterImageUrl] = useState('');
  const [afterImagesList, setAfterImagesList] = useState<string[]>([]);
  const [latitude, setLatitude] = useState<string>(
    complaint.location?.latitude ? complaint.location.latitude.toString() : ''
  );
  const [longitude, setLongitude] = useState<string>(
    complaint.location?.longitude ? complaint.location.longitude.toString() : ''
  );
  const [capturedAt, setCapturedAt] = useState<string>(new Date().toISOString());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAddPhotoUrl = () => {
    if (!afterImageUrl.trim()) return;
    if (
      !afterImageUrl.startsWith('http://') &&
      !afterImageUrl.startsWith('https://') &&
      !afterImageUrl.startsWith('data:image/')
    ) {
      setErrorMsg('Please provide a valid HTTP/HTTPS or data URL image.');
      return;
    }
    setAfterImagesList((prev) => [...prev, afterImageUrl.trim()]);
    setAfterImageUrl('');
    setErrorMsg(null);
  };

  const handleRemovePhoto = (index: number) => {
    setAfterImagesList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDetectLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude.toFixed(6));
          setLongitude(pos.coords.longitude.toFixed(6));
          setCapturedAt(new Date().toISOString());
        },
        () => {
          setErrorMsg('Unable to retrieve device GPS. Please verify manual coordinates.');
        }
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const imagesToSubmit = [...afterImagesList];
    if (afterImageUrl.trim()) {
      imagesToSubmit.push(afterImageUrl.trim());
    }

    if (!resolutionNote.trim() || resolutionNote.trim().length < 8) {
      setErrorMsg('Resolution note must be at least 8 characters describing the repair.');
      return;
    }

    if (imagesToSubmit.length === 0) {
      setErrorMsg('At least one resolution proof photo (After image) is required.');
      return;
    }

    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);
    const hasCoords = !isNaN(latNum) && !isNaN(lonNum);

    try {
      setSubmitting(true);
      await onSubmit({
        resolutionNote: resolutionNote.trim(),
        afterImages: imagesToSubmit,
        resolutionLocation: hasCoords ? { latitude: latNum, longitude: lonNum } : undefined,
        capturedAt,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit resolution evidence.');
    } finally {
      setSubmitting(false);
    }
  };

  // Real-time location distance preview
  const latNum = parseFloat(latitude);
  const lonNum = parseFloat(longitude);
  const locCheck =
    !isNaN(latNum) && !isNaN(lonNum)
      ? ResolutionEvidenceService.verifyLocationCoordinates(
          complaint.location,
          { latitude: latNum, longitude: lonNum }
        )
      : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Submit Resolution Evidence
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                Complaint #{complaint.id} · {complaint.categoryLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Officer Info Card */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-mono font-bold">
                Assigned Officer / Contractor
              </span>
              <span className="font-bold text-slate-800">{officerName || 'Field Ward Officer'}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block text-[10px] uppercase font-mono font-bold">
                Resolution Timestamp
              </span>
              <span className="font-mono text-slate-700">{new Date().toLocaleTimeString()}</span>
            </div>
          </div>

          {/* Mandatory Resolution Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Resolution Remarks / Work Summary *</span>
              <span className="text-[10px] font-mono text-slate-400 font-normal">
                Min 8 characters
              </span>
            </label>
            <textarea
              required
              rows={3}
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="Describe the exact remediation work performed (e.g., Road pothole filled with cold asphalt mix, leveled, and compacted)."
              className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden leading-relaxed"
            />
          </div>

          {/* After Proof Image URLs */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Resolution Photo Evidence (After) *</span>
              <span className="text-[10px] font-mono text-slate-500">
                {afterImagesList.length} image(s) attached
              </span>
            </label>

            <div className="flex gap-2">
              <Input
                type="url"
                value={afterImageUrl}
                onChange={(e) => setAfterImageUrl(e.target.value)}
                placeholder="Enter After image URL (or sample URL)"
                className="text-xs flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddPhotoUrl}
                className="text-xs"
              >
                Add Photo
              </Button>
            </div>

            {/* Quick Sample Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] font-mono text-slate-400">Quick Test Samples:</span>
              <button
                type="button"
                onClick={() => {
                  setAfterImagesList((prev) => [
                    ...prev,
                    'https://images.unsplash.com/photo-1515260268569-9271009adfdb?w=600&auto=format&fit=crop&q=80',
                  ]);
                }}
                className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                + Clean Road
              </button>
              <button
                type="button"
                onClick={() => {
                  setAfterImagesList((prev) => [
                    ...prev,
                    'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop&q=80',
                  ]);
                }}
                className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                + Repaired Pipe
              </button>
            </div>

            {/* Attached Photo Thumbnails */}
            {afterImagesList.length > 0 && (
              <div className="grid grid-cols-4 gap-2 pt-2">
                {afterImagesList.map((img, i) => (
                  <div
                    key={i}
                    className="relative aspect-video rounded-lg overflow-hidden border border-emerald-300 bg-slate-100 group"
                  >
                    <img src={img} alt="thumb" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(i)}
                      className="absolute top-1 right-1 p-0.5 rounded-full bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* GPS Coordinates & Geotag Verification */}
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                Resolution GPS Coordinates
              </span>
              <button
                type="button"
                onClick={handleDetectLocation}
                className="text-[11px] font-mono text-blue-600 hover:underline flex items-center gap-1"
              >
                <LocateFixed className="w-3 h-3" />
                Detect GPS
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                step="0.000001"
                placeholder="Latitude"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="text-xs"
              />
              <Input
                type="number"
                step="0.000001"
                placeholder="Longitude"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="text-xs"
              />
            </div>

            {locCheck && (
              <div
                className={`p-2 rounded text-[11px] font-mono border ${
                  locCheck.badgeVariant === 'success'
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                    : 'bg-amber-50 text-amber-900 border-amber-300'
                }`}
              >
                {locCheck.statusLabel}
              </div>
            )}
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={submitting || loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={submitting || loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Submit Resolution Evidence</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
