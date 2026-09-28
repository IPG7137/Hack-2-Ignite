import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, ExternalLink, ChevronRight, X, Sparkles } from 'lucide-react';
import { NotificationService } from '../../services/notificationService';
import { NotificationRecord } from '../../types/notification';
import { useAuth } from '../../hooks/useAuth';
import { useOrganization } from '../../context/OrganizationContext';
import { NotificationItem } from './NotificationItem';

interface NotificationBellProps {
  onNavigateToNotifications?: () => void;
  onSelectNotification?: (notification: NotificationRecord) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  onNavigateToNotifications,
  onSelectNotification,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { user } = useAuth();
  const { district } = useOrganization();

  const userId = user?.id || 'officer-pune-01';
  const userRole = user?.role || 'officer';
  const userDistrict = district?.toLowerCase() || 'pune';

  const loadNotifications = () => {
    NotificationService.init();
    const list = NotificationService.getNotifications(userId, userRole, userDistrict, { limit: 5 });
    const count = NotificationService.getUnreadCount(userId, userDistrict, userRole);
    setNotifications(list);
    setUnreadCount(count);
  };

  useEffect(() => {
    loadNotifications();

    // Auto-refresh interval (5 seconds)
    const timer = setInterval(loadNotifications, 5000);
    return () => clearInterval(timer);
  }, [userId, userRole, userDistrict]);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMarkAllRead = () => {
    NotificationService.markAllAsRead(userId, userDistrict, userRole);
    loadNotifications();
  };

  const handleSelect = (notif: NotificationRecord) => {
    NotificationService.markAsRead(notif.id, userId);
    loadNotifications();
    setIsOpen(false);
    if (onSelectNotification) {
      onSelectNotification(notif);
    } else if (onNavigateToNotifications) {
      onNavigateToNotifications();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        id="btn-notification-bell"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer flex items-center justify-center"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-red-600 text-white font-mono text-[10px] font-bold rounded-full flex items-center justify-center animate-in zoom-in-75">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-red-100 text-red-700 border border-red-200">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark Read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick List Body */}
          <div className="max-h-80 overflow-y-auto p-2 space-y-2">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                You're all caught up. No notifications.
              </div>
            ) : (
              notifications.map((notif) => (
                <NotificationItem
                  key={notif.id}
                  notification={notif}
                  onSelect={handleSelect}
                />
              ))
            )}
          </div>

          {/* Footer Direct Link */}
          <div className="p-2.5 border-t border-slate-100 bg-slate-50 text-center">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigateToNotifications?.();
              }}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 w-full py-1.5 flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>View All Notifications & Preferences</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
