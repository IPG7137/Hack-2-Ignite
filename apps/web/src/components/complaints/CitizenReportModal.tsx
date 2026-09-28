import React, { useState, useMemo } from 'react';
import {
  X,
  FilePlus,
  MapPin,
  Camera,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Shield,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { IncidentCategory } from '../../types/complaint';
import { useAuth } from '../../hooks/useAuth';
import { useOrganization } from '../../context/OrganizationContext';
import { MAHARASHTRA_DISTRICTS } from '../../data/maharashtraDistricts';
import { CreateComplaintParams } from '../../services/api.interface';
import { SimilarityEngine } from '../../services/similarityEngine';
import { Complaint } from '../../types/complaint';

interface CitizenReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (params: CreateComplaintParams) => Promise<any>;
  existingComplaints?: Complaint[];
}

const CATEGORIES: { id: IncidentCategory; label: string; icon: string; desc: string }[] = [
  { id: 'roads', label: 'Roads & Potholes', icon: '🛣️', desc: 'Crater, uneven road surface, road divider' },
  { id: 'waste_management', label: 'Solid Waste & Garbage', icon: '🗑️', desc: 'Overflowing bins, uncollected refuse' },
  { id: 'water_sewage', label: 'Water & Sewage', icon: '🚰', desc: 'Pipeline burst, water contamination, sewer blockage' },
  { id: 'streetlights', label: 'Streetlights & Electrical', icon: '💡', desc: 'Dark street, sparking transformer, exposed cable' },
  { id: 'public_safety', label: 'Public Safety & Hazards', icon: '⚠️', desc: 'Open manholes, fallen tree, structural hazard' },
  { id: 'drainage', label: 'Stormwater Drainage', icon: '🌊', desc: 'Flooded drains, storm water blockage' },
  { id: 'parks', label: 'Parks & Public Spaces', icon: '🌳', desc: 'Broken equipment, overgrown shrubs' },
];

export const CitizenReportModal: React.FC<CitizenReportModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  existingComplaints = [],
}) => {
  const { user } = useAuth();
  const { districtId } = useOrganization();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<IncidentCategory>('roads');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [ward, setWard] = useState('Zone 2 Command');
  const [selectedDistrict, setSelectedDistrict] = useState(districtId || 'pune');
  const [imageUrl, setImageUrl] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Proximity / 3A duplicate check advisory
  const duplicateAdvisory = useMemo(() => {
    if (!title || title.length < 4 || existingComplaints.length === 0) return null;
    const tempComplaint: Complaint = {
      id: 'CR-TEMP',
      dbId: 0,
      title,
      description,
      category,
      categoryLabel: category,
      location: {
        address: location,
        landmark: '',
        ward,
        zone: 'Zone 2',
        latitude: 18.5204,
        longitude: 73.8567,
      },
      status: 'submitted',
      priority: 'medium',
      reporter: {
        name: user?.fullName || 'Citizen',
        phone: contactNumber || '',
        aadharMasked: 'XXXX-XXXX-1234',
        verifiedCitizen: true,
      },
      evidence: { before: imageUrl ? [imageUrl] : [] },
      statusHistory: [],
      adminNotes: [],
      sla: {
        targetHours: 48,
        hoursRemaining: 48,
        slaStatus: 'on_track',
        deadline: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
        isOverdue: false,
      },
      upvotesCount: 0,
      isDuplicateCluster: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const matches = SimilarityEngine.findRelatedComplaints(
      tempComplaint,
      existingComplaints,
      { limit: 1, minConfidence: 0.50 }
    );
    return matches.length > 0 ? matches[0] : null;
  }, [title, description, category, location, ward, imageUrl, contactNumber, user, existingComplaints]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !location.trim()) {
      setErrorMsg('Please fill in all mandatory fields (Title, Description, Location).');
      return;
    }

    setErrorMsg(null);
    setSubmitting(true);

    try {
      const created = await onSubmit({
        title: title.trim(),
        description: description.trim(),
        category,
        location: location.trim(),
        ward: ward.trim(),
        districtId: selectedDistrict,
        userId: user?.id || 'anonymous-citizen',
        citizenName: user?.fullName || 'Verified Citizen',
        contactNumber: contactNumber.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
      });

      setSuccessResult(created);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit complaint.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setTitle('');
    setDescription('');
    setLocation('');
    setImageUrl('');
    setContactNumber('');
    setSuccessResult(null);
    setErrorMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white border border-[#D9E2EC] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#123B6D] to-[#1E4E8C] px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <FilePlus className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Lodge Civic Grievance</h2>
              <p className="text-xs text-blue-100 font-medium">
                Public Grievance Redressal & 3A/3B Deterministic Dispatch
              </p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="rounded-lg p-1.5 text-blue-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successResult ? (
            <div className="py-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border-2 border-emerald-300">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#123B6D]">Grievance Registered Successfully</h3>
                <div className="text-xs text-[#526581] mt-1">
                  Complaint Tracking ID: <strong className="font-mono text-[#1769D2]">{successResult.id}</strong>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-left max-w-md mx-auto space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#526581]">Calculated Priority (3B):</span>
                  <span className="font-bold text-[#123B6D] capitalize">{successResult.priority}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#526581]">Status:</span>
                  <span className="font-semibold text-blue-600 uppercase text-[11px] font-mono">Submitted (Queue)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#526581]">Civic Credits Awarded:</span>
                  <span className="font-bold text-emerald-600">+10 Quality Points</span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleReset}
                  className="bg-[#1769D2] hover:bg-[#123B6D] text-white px-6 py-2 text-xs font-bold"
                >
                  Close & View in Queue
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category Selector */}
              <div>
                <label className="block text-xs font-bold text-[#172B4D] mb-1.5 uppercase tracking-wider">
                  Select Grievance Category *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        category === cat.id
                          ? 'border-[#1769D2] bg-blue-50/70 shadow-xs'
                          : 'border-[#D9E2EC] bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{cat.icon}</span>
                        <span className="text-xs font-bold text-[#172B4D] truncate">{cat.label}</span>
                      </div>
                      <span className="text-[10px] text-[#718096] line-clamp-1 mt-1">{cat.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title & 3A Advisory */}
              <div>
                <label className="block text-xs font-bold text-[#172B4D] mb-1">
                  Issue Title / Summary *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Deep pothole near Tilak Road junction causing traffic hazard"
                  className="w-full rounded-lg border border-[#D9E2EC] bg-slate-50/50 px-3 py-2 text-xs text-[#172B4D] placeholder-[#9CA3AF] focus:border-[#1769D2] focus:bg-white focus:outline-hidden"
                />

                {/* 3A Duplicate Advisory */}
                {duplicateAdvisory && (
                  <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/80 p-2.5 text-[11px] text-amber-900 animate-in fade-in">
                    <Sparkles className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                    <div>
                      <span className="font-bold">3A Related Report Detected:</span> A similar grievance (
                      <strong className="text-amber-800">#{duplicateAdvisory.candidateComplaint.id}</strong>) was recently reported nearby.
                      Submitting will automatically link to community clustering.
                    </div>
                  </div>
                )}
              </div>

              {/* Detailed Description */}
              <div>
                <label className="block text-xs font-bold text-[#172B4D] mb-1">
                  Detailed Description *
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide precise details, landmarks, severity, and any immediate safety hazards..."
                  className="w-full rounded-lg border border-[#D9E2EC] bg-slate-50/50 px-3 py-2 text-xs text-[#172B4D] placeholder-[#9CA3AF] focus:border-[#1769D2] focus:bg-white focus:outline-hidden resize-none"
                />
              </div>

              {/* Location & District / Ward Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#172B4D] mb-1">
                    Location / Landmark *
                  </label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-[#718096] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Near SP College Gate, Tilak Road"
                      className="w-full rounded-lg border border-[#D9E2EC] bg-slate-50/50 pl-8 pr-3 py-2 text-xs text-[#172B4D] placeholder-[#9CA3AF] focus:border-[#1769D2] focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#172B4D] mb-1">
                    Jurisdiction District
                  </label>
                  <select
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    className="w-full rounded-lg border border-[#D9E2EC] bg-slate-50/50 px-3 py-2 text-xs text-[#172B4D] focus:border-[#1769D2] focus:bg-white focus:outline-hidden"
                  >
                    {MAHARASHTRA_DISTRICTS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} District
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Optional Photo URL / Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#172B4D] mb-1">
                    Evidence Photo URL (Optional)
                  </label>
                  <div className="relative">
                    <Camera className="w-3.5 h-3.5 text-[#718096] absolute left-3 top-2.5" />
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full rounded-lg border border-[#D9E2EC] bg-slate-50/50 pl-8 pr-3 py-2 text-xs text-[#172B4D] placeholder-[#9CA3AF] focus:border-[#1769D2] focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#172B4D] mb-1">
                    Contact Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="+91 98000 00000"
                    className="w-full rounded-lg border border-[#D9E2EC] bg-slate-50/50 px-3 py-2 text-xs text-[#172B4D] placeholder-[#9CA3AF] focus:border-[#1769D2] focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={submitting}
                  className="bg-[#1769D2] hover:bg-[#123B6D] text-white py-2 px-5 text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <span>Submit Complaint</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default CitizenReportModal;
