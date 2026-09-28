import React, { useState } from 'react';
import {
  TreePine,
  MapPin,
  CheckCircle2,
  Clock,
  ShieldAlert,
  AlertCircle,
  QrCode,
  Sparkles,
  X,
  Info,
} from 'lucide-react';
import { CivicCertificate, CivicRedemption } from '../../types/civicRecognition';
import { civicRecognitionService } from '../../services/civicRecognitionService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface PlantRedemptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  certificate: CivicCertificate | null;
  existingRedemption?: CivicRedemption | null;
  onRedemptionCreated?: (redemption: CivicRedemption) => void;
}

const INDIGENOUS_PLANTS = [
  { id: 'neem', name: 'Neem (Azadirachta indica)', benefit: 'Air purifying, medicinal, high drought tolerance', emoji: '🌿' },
  { id: 'peepal', name: 'Peepal (Ficus religiosa)', benefit: '24-hour oxygen provider, ecological keystone', emoji: '🌳' },
  { id: 'banyan', name: 'Banyan (Ficus benghalensis)', benefit: 'National tree, dense shade canopy, bird shelter', emoji: '🌲' },
  { id: 'tulsi', name: 'Holy Basil / Tulsi (Ocimum sanctum)', benefit: 'Urban balcony friendly, immunity booster', emoji: '🌱' },
  { id: 'gulmohar', name: 'Gulmohar (Delonix regia)', benefit: 'Avenue shading, vibrant flowering', emoji: '🌺' },
  { id: 'jamun', name: 'Indian Blackberry / Jamun (Syzygium cumini)', benefit: 'Native fruit tree, groundwater recharge', emoji: '🍃' },
];

export const PlantRedemptionModal: React.FC<PlantRedemptionModalProps> = ({
  isOpen,
  onClose,
  certificate,
  existingRedemption,
  onRedemptionCreated,
}) => {
  const [selectedPlant, setSelectedPlant] = useState<string>('neem');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeRedemption, setActiveRedemption] = useState<CivicRedemption | null>(
    existingRedemption || null
  );

  React.useEffect(() => {
    setActiveRedemption(existingRedemption || null);
    setError(null);
  }, [existingRedemption, isOpen]);

  if (!isOpen || !certificate) return null;

  const nurseryLocation = `${certificate.districtName} Municipal Social Forestry Nursery, Maharashtra`;

  const handleRequestVoucher = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const plantObj = INDIGENOUS_PLANTS.find((p) => p.id === selectedPlant);
      const res = await civicRecognitionService.requestPlantRedemption({
        certificateId: certificate.id,
        preferredPlantType: plantObj ? `${plantObj.name}` : selectedPlant,
        collectionNurseryName: nurseryLocation,
      });

      if (res.success && res.redemption) {
        setActiveRedemption(res.redemption);
        if (onRedemptionCreated) {
          onRedemptionCreated(res.redemption);
        }
      } else {
        setError(res.error || 'Failed to request plant redemption voucher.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error creating plant voucher request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-8">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-800 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 border border-white/20">
              <TreePine className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="text-[10px] font-mono tracking-widest text-emerald-200 uppercase font-bold">
                CIVIC INCENTIVE & SUSTAINABILITY
              </div>
              <h2 className="text-base font-bold tracking-tight">
                Government Nursery Plant Voucher
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Certificate Citation */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] font-mono text-emerald-800 uppercase font-bold block">
                Eligible Certificate
              </span>
              <strong className="text-emerald-950">{certificate.occasionName} ({certificate.certificateNumber})</strong>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              {certificate.recognitionTier}
            </span>
          </div>

          {activeRedemption ? (
            /* Active Voucher Display */
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border-2 border-dashed border-emerald-400 rounded-xl text-center space-y-3">
                <div className="inline-flex items-center justify-center p-3 rounded-full bg-emerald-100 text-emerald-700">
                  <QrCode className="w-8 h-8" />
                </div>

                <div>
                  <div className="text-[10px] font-mono text-[#718096] uppercase font-bold">
                    Official Municipal Voucher Token
                  </div>
                  <div className="text-lg font-mono font-extrabold text-[#123B6D] tracking-wider mt-0.5">
                    {activeRedemption.voucherCode}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-left text-xs bg-white p-3 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-[10px] text-[#718096] block">Allocated Sapling:</span>
                    <strong className="text-slate-800">{activeRedemption.preferredPlantType}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#718096] block">Voucher Status:</span>
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      activeRedemption.status === 'REDEEMED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : activeRedemption.status === 'APPROVED'
                        ? 'bg-teal-100 text-teal-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {activeRedemption.status}
                    </span>
                  </div>
                </div>

                <div className="text-left text-xs text-[#526581] flex items-start gap-2 bg-blue-50/70 p-2.5 rounded-lg border border-blue-200">
                  <MapPin className="w-4 h-4 text-[#1769D2] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#123B6D] block">Physical Pickup Center:</strong>
                    <span>{activeRedemption.collectionNurseryName}</span>
                  </div>
                </div>
              </div>

              {/* Status explanation */}
              <div className="text-xs text-[#718096] space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Present this voucher code at the municipal nursery counter for sapling collection.</span>
                </div>
              </div>
            </div>
          ) : (
            /* Voucher Request Form */
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#123B6D] block">
                  Select Desired Native Tree Sapling:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {INDIGENOUS_PLANTS.map((plant) => (
                    <button
                      key={plant.id}
                      type="button"
                      onClick={() => setSelectedPlant(plant.id)}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        selectedPlant === plant.id
                          ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-400'
                          : 'border-slate-200 bg-white hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                        <span>{plant.emoji}</span>
                        <span className="truncate">{plant.name.split(' (')[0]}</span>
                      </div>
                      <div className="text-[10px] text-[#718096] mt-0.5 leading-tight line-clamp-2">
                        {plant.benefit}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Collection location summary */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[#123B6D]">
                  <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Designated Municipal Nursery:</span>
                </div>
                <div className="text-[#526581] font-mono text-[11px] pl-5">
                  {nurseryLocation}
                </div>
              </div>

              {/* Transparency Notice */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg flex items-start gap-2 text-xs text-amber-900">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong>Municipal Nursery Collection:</strong> This voucher facilitates physical sapling pickup from designated Social Forestry nurseries. CivicResolve does not claim automated courier shipping.
                </div>
              </div>

              {error && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8 text-xs text-slate-700 border-slate-300"
          >
            Close
          </Button>

          {!activeRedemption && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleRequestVoucher}
              disabled={isSubmitting}
              className="h-8 text-xs bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5"
            >
              <TreePine className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Generating Voucher...' : 'Generate Sapling Voucher'}</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
