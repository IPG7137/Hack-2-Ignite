import React from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
  borderAccent?: 'default' | 'urgent' | 'warning' | 'resolved' | 'info';
}

export const Card: React.FC<CardProps> = ({
  glow = false,
  borderAccent = 'default',
  className,
  children,
  ...props
}) => {
  const accentStyles = {
    default: 'border-[#D9E2EC] bg-white hover:border-slate-300',
    urgent: 'border-red-200 bg-red-50/30 hover:border-red-300',
    warning: 'border-amber-200 bg-amber-50/30 hover:border-amber-300',
    resolved: 'border-emerald-200 bg-emerald-50/30 hover:border-emerald-300',
    info: 'border-blue-200 bg-blue-50/30 hover:border-blue-300',
  };

  return (
    <div
      className={cn(
        'rounded-lg border shadow-sm transition-all duration-200 text-[#172B4D]',
        accentStyles[borderAccent],
        glow && 'ring-1 ring-red-200 shadow-sm',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
