import React from 'react';
import {
  FileText,
  Clock,
  ShieldAlert,
  Award,
  Bell,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { NotificationRecord, NotificationCategory, NotificationSeverity } from '../../types/notification';

interface NotificationItemProps {
  notification: NotificationRecord;
  onSelect: (notification: NotificationRecord) => void;
  onMarkRead?: (id: string) => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onSelect,
  onMarkRead,
}) => {
  const getCategoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case 'complaints':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'sla':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'alerts':
        return <ShieldAlert className="w-4 h-4 text-rose-600" />;
      case 'civic':
        return <Award className="w-4 h-4 text-emerald-600" />;
      case 'system':
      default:
        return <Bell className="w-4 h-4 text-slate-600" />;
    }
  };

  const getSeverityBadge = (severity: NotificationSeverity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'info':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const formatRelativeTime = (isoString: string) => {
    const diff = Math.max(0, Date.now() - new Date(isoString).getTime());
    const mins = Math.floor(diff / (1000 * 60));
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div
      onClick={() => onSelect(notification)}
      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 relative group ${
        notification.isRead
          ? 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50'
          : 'bg-blue-50/40 border-blue-200 hover:border-blue-300 shadow-xs'
      }`}
    >
      {/* Category Icon */}
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
          notification.isRead
            ? 'bg-slate-50 border-slate-200'
            : 'bg-white border-blue-200 shadow-xs'
        }`}
      >
        {getCategoryIcon(notification.category)}
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`text-xs font-bold ${
                notification.isRead ? 'text-slate-800' : 'text-blue-950'
              }`}
            >
              {notification.title}
            </span>
            <span
              className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase border ${getSeverityBadge(
                notification.severity
              )}`}
            >
              {notification.severity}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-mono text-slate-400">
              {formatRelativeTime(notification.createdAt)}
            </span>
            {!notification.isRead && (
              <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" title="Unread" />
            )}
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
          {notification.message}
        </p>

        {/* Footer Meta & Deep Link Indicator */}
        <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 text-[11px] font-mono text-slate-500">
          <div className="flex items-center gap-2">
            {notification.complaintId && (
              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                #{notification.complaintId}
              </span>
            )}
            <span className="capitalize">{notification.districtId}</span>
          </div>

          <div className="flex items-center gap-1 text-blue-600 font-sans font-semibold group-hover:translate-x-0.5 transition-transform">
            <span>View Details</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
};
