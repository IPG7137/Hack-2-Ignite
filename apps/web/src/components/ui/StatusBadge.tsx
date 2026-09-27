import React from 'react';
import {
  Clock,
  Search,
  UserCheck,
  Hammer,
  FileCheck,
  CheckCircle2,
  XCircle,
  LucideIcon,
} from 'lucide-react';
import { ComplaintStatus } from '../../types/complaint';
import { cn } from '../../lib/utils';

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: ComplaintStatus;
  showIcon?: boolean;
  className?: string;
}

interface StatusStyleConfig {
  label: string;
  icon: LucideIcon;
  bg: string;
  border: string;
  text: string;
  dotColor: string;
}

export const STATUS_STYLE_MAP: Record<ComplaintStatus, StatusStyleConfig> = {
  submitted: {
    label: 'Submitted',
    icon: Clock,
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    dotColor: '#2563EB',
  },
  under_review: {
    label: 'Under Review',
    icon: Search,
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
    dotColor: '#9333EA',
  },
  assigned: {
    label: 'Assigned',
    icon: UserCheck,
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-700',
    dotColor: '#4F46E5',
  },
  in_progress: {
    label: 'In Progress',
    icon: Hammer,
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    dotColor: '#D97706',
  },
  resolution_submitted: {
    label: 'Resolution Submitted',
    icon: FileCheck,
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
    text: 'text-cyan-800',
    dotColor: '#0891B2',
  },
  resolved: {
    label: 'Resolved',
    icon: CheckCircle2,
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    dotColor: '#059669',
  },
  verified: {
    label: 'Verified',
    icon: CheckCircle2,
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    dotColor: '#059669',
  },
  closed: {
    label: 'Closed',
    icon: CheckCircle2,
    bg: 'bg-slate-100',
    border: 'border-slate-300',
    text: 'text-slate-700',
    dotColor: '#64748B',
  },
  rejected: {
    label: 'Rejected',
    icon: XCircle,
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-700',
    dotColor: '#E11D48',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  showIcon = true,
  className,
  ...props
}) => {
  const config = STATUS_STYLE_MAP[status] || STATUS_STYLE_MAP.submitted;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border tracking-wide uppercase font-mono shadow-2xs select-none',
        config.bg,
        config.border,
        config.text,
        className
      )}
      {...props}
    >
      {showIcon ? (
        <Icon className="w-3 h-3 shrink-0 stroke-[2.25]" />
      ) : (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: config.dotColor }}
        />
      )}
      <span className="truncate">{config.label}</span>
    </span>
  );
};
