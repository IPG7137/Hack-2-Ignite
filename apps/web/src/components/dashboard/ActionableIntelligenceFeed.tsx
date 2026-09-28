import React from 'react';
import {
  AlertTriangle,
  Flame,
  ShieldAlert,
  RotateCcw,
  TreePine,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Layers,
  MapPin,
} from 'lucide-react';
import { UnifiedDashboardMetrics } from '../../services/dashboardIntelligenceService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface ActionableIntelligenceFeedProps {
  directives: UnifiedDashboardMetrics['actionableDirectives'];
  onNavigatePage: (page: string) => void;
}

export const ActionableIntelligenceFeed: React.FC<ActionableIntelligenceFeedProps> = ({
  directives,
  onNavigatePage,
}) => {
  const getSeverityStyle = (severity: 'critical' | 'warning' | 'info' | 'success') => {
    switch (severity) {
      case 'critical':
        return {
          cardBg: 'bg-red-50/70 border-red-200',
          icon: <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />,
          badge: 'bg-red-100 text-red-800 border-red-300',
          titleColor: 'text-red-900',
        };
      case 'warning':
        return {
          cardBg: 'bg-amber-50/70 border-amber-200',
          icon: <Flame className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />,
          badge: 'bg-amber-100 text-amber-800 border-amber-300',
          titleColor: 'text-amber-900',
        };
      case 'info':
        return {
          cardBg: 'bg-blue-50/70 border-blue-200',
          icon: <TreePine className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />,
          badge: 'bg-blue-100 text-blue-800 border-blue-300',
          titleColor: 'text-[#123B6D]',
        };
      case 'success':
        return {
          cardBg: 'bg-emerald-50/70 border-emerald-200',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />,
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          titleColor: 'text-emerald-950',
        };
    }
  };

  return (
    <Card className="bg-white border-slate-200 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-800 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#123B6D] uppercase tracking-wider">
              Deterministic Actionable Directives ("Needs Attention")
            </h3>
            <p className="text-[11px] text-[#718096]">
              Real-time operational alerts derived from SLA breach risks, spatial clusters & citizen disputes
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-bold">
          {directives.length} DIRECTIVES
        </span>
      </div>

      {/* Body: Directives List */}
      <div className="p-4 space-y-2.5">
        {directives.map((dir) => {
          const style = getSeverityStyle(dir.severity);

          return (
            <div
              key={dir.id}
              onClick={() => onNavigatePage(dir.targetPage)}
              className={`p-3.5 rounded-xl border ${style.cardBg} flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:shadow-xs transition-all cursor-pointer group`}
            >
              <div className="flex items-start gap-2.5">
                {style.icon}
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className={`text-xs font-bold ${style.titleColor}`}>
                      {dir.title}
                    </h4>
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded uppercase border ${style.badge}`}
                    >
                      {dir.severity}
                    </span>
                  </div>
                  <p className="text-xs text-[#526581] leading-relaxed">
                    {dir.description}
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs bg-white text-[#1769D2] border-blue-200 hover:bg-blue-50 font-semibold gap-1 shrink-0 self-start sm:self-auto"
              >
                <span>Take Action</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
