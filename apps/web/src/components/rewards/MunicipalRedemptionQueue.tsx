import React, { useState } from 'react';
import {
  TreePine,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  ShieldCheck,
  Building2,
  AlertCircle,
  RefreshCw,
  QrCode,
  User,
} from 'lucide-react';
import { CivicRedemption } from '../../types/civicRecognition';
import { civicRecognitionService } from '../../services/civicRecognitionService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface MunicipalRedemptionQueueProps {
  districtId: string;
  districtName: string;
  isStaff: boolean;
  redemptions: CivicRedemption[];
  onRefresh: () => void;
}

export const MunicipalRedemptionQueue: React.FC<MunicipalRedemptionQueueProps> = ({
  districtId,
  districtName,
  isStaff,
  redemptions,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; isError: boolean } | null>(null);

  const filteredRedemptions = redemptions.filter((r) => {
    const matchesSearch =
      r.voucherCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.preferredPlantType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.userName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleAdjudicate = async (
    redemptionId: string,
    action: 'APPROVE' | 'REDEEM' | 'CANCEL'
  ) => {
    setProcessingId(redemptionId);
    setFeedback(null);
    try {
      const res = await civicRecognitionService.adjudicateRedemption({
        redemptionId,
        action,
        reviewedBy: 'MUNICIPAL_FORESTRY_OFFICER_SOLAPUR',
      });

      if (res.success) {
        setFeedback({
          message: `Voucher successfully updated to ${res.redemption?.status}.`,
          isError: false,
        });
        onRefresh();
      } else {
        setFeedback({
          message: res.error || 'Failed to update voucher.',
          isError: true,
        });
      }
    } catch (err: any) {
      setFeedback({
        message: err?.message || 'Error adjudicating voucher.',
        isError: true,
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Card className="bg-white border-[#D9E2EC] shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#E8EEF5] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
            <TreePine className="w-4 h-4 text-emerald-700" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#123B6D] uppercase tracking-wider">
              Municipal Social Forestry Sapling Redemption Desk
            </h3>
            <p className="text-[11px] text-[#718096]">
              Physical voucher collection queue for {districtName} District
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="h-7 text-xs text-[#1769D2] border-blue-200 hover:bg-blue-50 gap-1 font-semibold"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh Queue</span>
          </Button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 mx-4 mt-3 rounded-lg text-xs flex items-center gap-2 ${
            feedback.isError
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          {feedback.isError ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="p-4 border-b border-[#E8EEF5] flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-[#718096] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Voucher Code, Citizen Name, Plant Type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#D9E2EC] rounded-lg focus:outline-hidden focus:border-[#1769D2]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[#718096]" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-[#F8FAFC] border border-[#D9E2EC] rounded-lg px-2.5 py-1.5 font-medium text-[#172B4D] focus:outline-hidden focus:border-[#1769D2]"
          >
            <option value="ALL">All Statuses ({redemptions.length})</option>
            <option value="REQUESTED">Requested</option>
            <option value="APPROVED">Approved for Pickup</option>
            <option value="REDEEMED">Collected / Redeemed</option>
          </select>
        </div>
      </div>

      {/* Redemptions Table / List */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#F8FAFC] text-[#526581] border-b border-[#E8EEF5] font-mono text-[10px] uppercase">
              <th className="py-2.5 px-4">Voucher Token</th>
              <th className="py-2.5 px-4">Citizen / Recipient</th>
              <th className="py-2.5 px-4">Requested Sapling</th>
              <th className="py-2.5 px-4">Status</th>
              <th className="py-2.5 px-4">Requested Date</th>
              <th className="py-2.5 px-4 text-right">Municipal Adjudication</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8EEF5]">
            {filteredRedemptions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#718096] text-xs">
                  No plant redemption vouchers found matching the current filters.
                </td>
              </tr>
            ) : (
              filteredRedemptions.map((redemption) => {
                const isProcessing = processingId === redemption.id;

                return (
                  <tr key={redemption.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#123B6D]">
                      {redemption.voucherCode}
                    </td>

                    <td className="py-3 px-4 text-[#172B4D]">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <User className="w-3.5 h-3.5 text-[#718096]" />
                        <span>{redemption.userName || 'Citizen Contributor'}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-emerald-900 font-medium">
                      {redemption.preferredPlantType}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          redemption.status === 'REDEEMED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : redemption.status === 'APPROVED'
                            ? 'bg-teal-100 text-teal-800 border border-teal-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {redemption.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-[#718096] font-mono text-[11px]">
                      {new Date(redemption.createdAt).toLocaleDateString('en-IN')}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {redemption.status === 'REQUESTED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isProcessing}
                          onClick={() => handleAdjudicate(redemption.id, 'APPROVE')}
                          className="h-6 text-[11px] font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50 gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Approve Voucher</span>
                        </Button>
                      )}

                      {redemption.status === 'APPROVED' && (
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={isProcessing}
                          onClick={() => handleAdjudicate(redemption.id, 'REDEEM')}
                          className="h-6 text-[11px] font-semibold bg-emerald-700 hover:bg-emerald-800 text-white gap-1"
                        >
                          <TreePine className="w-3 h-3" />
                          <span>Mark Collected</span>
                        </Button>
                      )}

                      {redemption.status === 'REDEEMED' && (
                        <span className="text-[10px] font-mono text-emerald-700 font-semibold flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Handed Over</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
