import React from 'react';
import { AlertOctagon, AlertTriangle, AlertCircle, CheckCircle, LucideIcon } from 'lucide-react';
import { ComplaintPriority } from '../../types/complaint';
import { cn } from '../../lib/utils';

interface PriorityBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  priority: ComplaintPriority;
  score?: number;
  showIcon?: boolean;
  className?: string;
}

interface PriorityStyleConfig {
  label: string;
  icon: LucideIcon;
  bg: string;
  border: string;
  text: string;
  dotColor: string;
}

export const PRIORITY_STYLE_MAP: Record<ComplaintPriority, PriorityStyleConfig> = {
  urgent: {
    label: 'Critical',
    icon: AlertOctagon,
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    dotColor: '#DC2626',
  },
  high: {
    label: 'High',
    icon: AlertTriangle,
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    dotColor: '#EA580C',
  },
  medium: {
    label: 'Medium',
    icon: AlertCircle,
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    dotColor: '#D97706',
  },
  low: {
    label: 'Low',
    icon: CheckCircle,
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    dotColor: '#16A34A',
  },
};

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  score,
  showIcon = true,
  className,
  ...props
}) => {
  const config = PRIORITY_STYLE_MAP[priority] || PRIORITY_STYLE_MAP.low;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border tracking-wider uppercase font-mono shadow-2xs select-none',
        config.bg,
        config.border,
        config.text,
        className
      )}
      {...props}
    >
      {priority === 'urgent' ? (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600" />
        </span>
      ) : showIcon ? (
        <Icon className="w-3 h-3 shrink-0 stroke-[2.5]" />
      ) : (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: config.dotColor }}
        />
      )}
      <span>{config.label}</span>
      {score !== undefined && (
        <>
          <span className="opacity-40">·</span>
          <span>{score}</span>
        </>
      )}
    </span>
  );
};
