import React from 'react';
import { Cpu, Check } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { AIOperationalInsight } from '../../types/ai';

interface HotspotIntelligenceProps {
  insights: AIOperationalInsight[];
  onAcknowledge?: (id: string) => void;
  onSelectWard?: (ward: string) => void;
}

export const HotspotIntelligence: React.FC<HotspotIntelligenceProps> = ({
  insights,
  onAcknowledge,
}) => {
  return (
    <Card className="flex flex-col h-full border-[#D9E2EC] bg-white">
      <div className="px-4 py-3 border-b border-[#D9E2EC] flex items-center justify-between bg-[#F8FAFC]">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-[#1769D2]" />
          <h3 className="text-xs font-bold text-[#172B4D] uppercase tracking-wider">
            AI Hotspot & Anomaly Radar
          </h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-[#1769D2] border border-blue-200 font-bold">
          LIVE PATTERN INFERENCE
        </span>
      </div>

      <div className="divide-y divide-[#E8EEF5] overflow-y-auto flex-1 p-1">
        {insights.slice(0, 4).map((item) => {
          const isCritical = item.severity === 'critical';
          const isWarning = item.severity === 'warning';

          return (
            <div
              key={item.id}
              className={`p-3 rounded transition-colors ${
                item.acknowledged ? 'opacity-70 bg-slate-50/60' : 'hover:bg-slate-50/80'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isCritical
                        ? 'bg-[#D92D20] live-pulse-dot'
                        : isWarning
                        ? 'bg-[#EA580C]'
                        : 'bg-[#1769D2]'
                    }`}
                  />
                  <h4 className="text-xs font-bold text-[#172B4D]">{item.title}</h4>
                </div>

                <span className="text-[10px] font-mono text-[#526581] shrink-0 font-semibold">
                  {item.affectedWard.split('-')[0]}
                </span>
              </div>

              <p className="text-xs text-[#526581] mt-1.5 leading-relaxed">
                {item.description}
              </p>

              {/* Operational Rationale ("WHY") */}
              <div className="mt-2 p-2 rounded bg-blue-50/50 border border-blue-100 text-[11px] text-[#172B4D]">
                <span className="text-[#123B6D] font-bold">Root Cause: </span>
                <span className="text-slate-700">{item.explanationWhy}</span>
              </div>

              {/* Recommendation & Action */}
              <div className="mt-2 flex items-center justify-between pt-1 border-t border-[#E8EEF5]">
                <span className="text-[11px] text-[#D99A00] font-bold truncate mr-2">
                  Directive: {item.recommendedAction}
                </span>

                {!item.acknowledged ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] px-2 bg-white border-[#D9E2EC] text-[#172B4D] hover:bg-slate-50"
                    onClick={() => onAcknowledge?.(item.id)}
                  >
                    <Check className="w-3 h-3 mr-1 text-[#16803C]" />
                    <span>Acknowledge</span>
                  </Button>
                ) : (
                  <span className="text-[10px] text-[#718096] font-mono">Logged</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
