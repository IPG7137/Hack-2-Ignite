import React from 'react';
import { Compass, ArrowLeft, Home, FileQuestion } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

interface NotFoundProps {
  onGoHome: () => void;
}

export const NotFound: React.FC<NotFoundProps> = ({ onGoHome }) => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center bg-white border-slate-200 shadow-lg space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#1769D2] mx-auto">
          <FileQuestion className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <div className="text-3xl font-extrabold font-mono text-[#123B6D]">404</div>
          <h1 className="text-base font-bold text-slate-900">
            Page or Civic Resource Not Found
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
            The requested municipal module or route does not exist or has been relocated within the administrative hierarchy.
          </p>
        </div>

        <div className="pt-2 flex justify-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={onGoHome}
            className="h-8 text-xs bg-[#1769D2] hover:bg-[#123B6D] text-white font-semibold gap-1.5 shadow-xs"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return to Command Center</span>
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default NotFound;
