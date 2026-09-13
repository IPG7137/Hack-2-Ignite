import React from 'react';
import { cn } from '../../lib/utils';
import { ComplaintPriority, ComplaintStatus } from '../../types/complaint';
import { COMPLAINT_STATUS_CONFIG, PRIORITY_CONFIG } from '../../lib/constants';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'status' | 'priority' | 'default' | 'outline' | 'critical' | 'sla';
  status?: ComplaintStatus;
  priority?: ComplaintPriority;
  children?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  status,
  priority,
  className,
  children,
  ...props
}) => {
  if (status && COMPLAINT_STATUS_CONFIG[status]) {
    const config = COMPLAINT_STATUS_CONFIG[status];
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold border uppercase tracking-wider',
          config.badgeBg,
          config.badgeBorder,
          config.badgeText,
          className
        )}
        {...props}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: config.color }}
        />
        {children || config.label}
      </span>
    );
  }

  if (priority && PRIORITY_CONFIG[priority]) {
    const config = PRIORITY_CONFIG[priority];
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold border uppercase tracking-wider',
          config.badgeBg,
          config.badgeBorder,
          config.badgeText,
          className
        )}
        {...props}
      >
        {priority === 'urgent' && <span className="w-1.5 h-1.5 rounded-full bg-red-600 live-pulse-dot" />}
        {children || config.label}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border bg-slate-100 border-[#D9E2EC] text-[#172B4D]',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
