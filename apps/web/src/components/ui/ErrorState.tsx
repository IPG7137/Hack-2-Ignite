import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

interface ErrorStateProps {
  title?: string;
  message?: string | null;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Operational Communication Interrupted',
  message,
  onRetry,
  className,
}) => {
  return (
    <div
      className={cn(
        'p-6 sm:p-8 rounded-xl bg-white border border-red-200 text-center max-w-lg mx-auto my-6 shadow-sm',
        className
      )}
    >
      <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto mb-3.5 shadow-xs">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h3>
      {message && (
        <p className="text-xs text-red-600/90 mt-1 max-w-md mx-auto leading-relaxed">
          {message}
        </p>
      )}
      {onRetry && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="text-xs font-semibold border-red-200 bg-red-50/50 text-red-700 hover:bg-red-100/60"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            <span>Retry Operation</span>
          </Button>
        </div>
      )}
    </div>
  );
};
