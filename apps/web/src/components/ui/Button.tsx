import React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', loading = false, className, disabled, children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-semibold rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50 disabled:pointer-events-none text-xs uppercase tracking-wider select-none';

    const variants = {
      primary: 'bg-[#1769D2] hover:bg-[#123B6D] text-white shadow-sm border border-[#1769D2]',
      secondary: 'bg-white hover:bg-slate-50 text-[#172B4D] border border-[#D9E2EC] shadow-sm',
      outline: 'border border-[#D9E2EC] hover:bg-slate-50 text-[#526581] hover:text-[#172B4D]',
      danger: 'bg-[#D92D20] hover:bg-red-800 text-white border border-[#D92D20]',
      ghost: 'hover:bg-slate-100 text-[#526581] hover:text-[#172B4D] border-transparent',
      success: 'bg-[#16803C] hover:bg-emerald-800 text-white border border-[#16803C]',
    };

    const sizes = {
      sm: 'h-8 px-2.5 gap-1.5 text-[11px]',
      md: 'h-9 px-4 gap-2 text-xs',
      lg: 'h-11 px-6 gap-2 text-sm',
      icon: 'h-8 w-8 p-0',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-0.5 mr-1.5 h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
