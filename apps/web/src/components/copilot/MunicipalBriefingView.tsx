import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  Cpu,
  Clock,
  AlertTriangle,
  Flame,
  Layers,
  ShieldCheck,
  Copy,
  Check,
  Printer,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BarChart3,
} from 'lucide-react';
import { GroundedMunicipalBriefing } from '../../types/ai';
import { Complaint } from '../../types/complaint';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface MunicipalBriefingViewProps {
  briefing: GroundedMunicipalBriefing;
  allComplaints: Complaint[];
  onSelectComplaint?: (id: string) => void;
  onRegenerate?: () => Promise<void>;
  loading?: boolean;
}

export const MunicipalBriefingView: React.FC<MunicipalBriefingViewProps> = ({
  briefing,
  allComplaints,
  onSelectComplaint,
  onRegenerate,
  loading = false,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(briefing.markdownContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const m = briefing.metrics;

  return (
    <Card className="p-4 md:p-6 border-[#D9E2EC] bg-white shadow-sm space-y-4">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-[#E8EEF5]">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1 rounded bg-blue-50 text-[#1769D2] border border-blue-200">
              <FileText className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-[#172B4D] tracking-tight">
              Municipal Commissioner Executive Briefing
            </h2>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border flex items-center gap-1 ${
                briefing.isAiGenerated
                  ? 'bg-purple-50 text-purple-800 border-purple-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              {briefing.isAiGenerated ? (
                <>
                  <Sparkles className="w-3 h-3 text-purple-600" />
                  <span>{briefing.modelName}</span>
                </>
              ) : (
                <>
                  <Cpu className="w-3 h-3 text-emerald-600" />
                  <span>{briefing.modelName}</span>
                </>
              )}
            </span>
          </div>
          <p className="text-xs text-[#526581] mt-1 flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#718096]" />
              <span>Generated: {new Date(briefing.timestamp).toLocaleTimeString()}</span>
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Grounded on {briefing.datasetSize} Authorized Municipal Records</span>
            </span>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="h-8 text-xs bg-white border-[#D9E2EC] text-[#172B4D] hover:bg-slate-50 gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#526581]" />}
            <span>{copied ? 'Copied' : 'Copy Briefing'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-8 text-xs bg-white border-[#D9E2EC] text-[#172B4D] hover:bg-slate-50 gap-1.5"
          >
            <Printer className="w-3.5 h-3.5 text-[#526581]" />
            <span>Print / PDF</span>
          </Button>

          {onRegenerate && (
            <Button
              variant="primary"
              size="sm"
              onClick={onRegenerate}
              disabled={loading}
              className="h-8 text-xs bg-[#1769D2] hover:bg-[#123B6D] text-white gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Telemetry</span>
            </Button>
          )}
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs font-mono">
        <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#E8EEF5]">
          <div className="text-[10px] text-[#526581]">Active Workload</div>
          <div className="text-base font-bold text-[#172B4D] mt-0.5">
            {m.activeComplaints}{' '}
            <span className="text-[10px] font-normal text-[#526581]">/ {m.totalComplaints} total</span>
          </div>
        </div>

        <div className="p-2.5 rounded bg-red-50/50 border border-red-200">
          <div className="text-[10px] text-red-700 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-red-600" />
            <span>Critical Priority</span>
          </div>
          <div className="text-base font-bold text-red-700 mt-0.5">
            {m.criticalPriorityCount} <span className="text-[10px] font-normal">cases</span>
          </div>
        </div>

        <div className="p-2.5 rounded bg-amber-50/50 border border-amber-200">
          <div className="text-[10px] text-amber-800 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>SLA Overdue</span>
          </div>
          <div className="text-base font-bold text-amber-900 mt-0.5">
            {m.overdueComplaints} <span className="text-[10px] font-normal">breaches</span>
          </div>
        </div>

        <div className="p-2.5 rounded bg-orange-50/50 border border-orange-200">
          <div className="text-[10px] text-orange-800 flex items-center gap-1">
            <Flame className="w-3 h-3 text-orange-600" />
            <span>3C Hotspots</span>
          </div>
          <div className="text-base font-bold text-orange-900 mt-0.5">
            {m.emergingHotspotsCount} <span className="text-[10px] font-normal">zones</span>
          </div>
        </div>

        <div className="p-2.5 rounded bg-purple-50/50 border border-purple-200">
          <div className="text-[10px] text-purple-800 flex items-center gap-1">
            <Layers className="w-3 h-3 text-purple-600" />
            <span>3D Clusters</span>
          </div>
          <div className="text-base font-bold text-purple-900 mt-0.5">
            {m.potentialIncidentsCount} <span className="text-[10px] font-normal">groups</span>
          </div>
        </div>
      </div>

      {/* Grounded Markdown Document Content */}
      <div className="prose prose-slate max-w-none text-xs leading-relaxed border border-[#E8EEF5] bg-[#F8FAFC] p-4 md:p-5 rounded-lg overflow-x-auto space-y-3 font-sans">
        <div className="whitespace-pre-wrap font-sans text-xs text-[#172B4D] leading-relaxed">
          {briefing.markdownContent}
        </div>
      </div>

      {/* Referenced Complaints Bar */}
      {briefing.referencedComplaintIds.length > 0 && onSelectComplaint && (
        <div className="pt-2 border-t border-[#E8EEF5] space-y-1.5 print:hidden">
          <div className="text-[10px] font-mono font-bold uppercase text-[#526581] flex items-center gap-1">
            <Eye className="w-3 h-3 text-[#1769D2]" />
            <span>Directly Referenced Case Dossiers ({briefing.referencedComplaintIds.length})</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {briefing.referencedComplaintIds.map((id) => {
              const comp = allComplaints.find((c) => c.id === id || String(c.dbId) === id);
              return (
                <button
                  key={id}
                  onClick={() => onSelectComplaint(id)}
                  className="px-2.5 py-1 rounded bg-white hover:bg-blue-50 border border-[#D9E2EC] hover:border-blue-300 text-[11px] font-mono font-medium text-[#1769D2] transition-colors flex items-center gap-1.5 shadow-2xs group"
                >
                  <span className="font-bold">#{id}</span>
                  {comp && <span className="text-[#526581] text-[10px] truncate max-w-[120px]">{comp.title}</span>}
                  <Badge priority={comp?.priority || 'medium'} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
};
