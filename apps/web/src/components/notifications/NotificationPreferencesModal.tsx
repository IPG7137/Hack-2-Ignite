import React, { useState, useEffect } from 'react';
import { Settings, X, CheckCircle2, Bell, Smartphone, Mail, MessageSquare, ShieldAlert } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { UserNotificationPreferences } from '../../types/notification';
import { NotificationService } from '../../services/notificationService';
import { useAuth } from '../../hooks/useAuth';

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationPreferencesModal: React.FC<NotificationPreferencesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const userId = user?.id || 'officer-pune-01';
  const userRole = user?.role || 'officer';

  const [preferences, setPreferences] = useState<UserNotificationPreferences | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const prefs = NotificationService.getUserPreferences(userId, userRole);
      setPreferences(JSON.parse(JSON.stringify(prefs)));
      setSavedSuccess(false);
    }
  }, [isOpen, userId, userRole]);

  if (!isOpen || !preferences) return null;

  const handleToggle = (
    section: 'complaintUpdates' | 'civicUpdates' | 'operationalAlerts',
    channel: 'inApp' | 'push' | 'email' | 'sms'
  ) => {
    setPreferences((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [channel]: !prev[section][channel],
        },
      };
    });
  };

  const handleSave = () => {
    if (preferences) {
      NotificationService.updateUserPreferences(userId, preferences);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1200);
    }
  };

  const isStaff = userRole !== 'citizen';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">
              Notification Channel Preferences
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Notification preferences updated successfully!</span>
            </div>
          )}

          {/* Section 1: Complaint Lifecycle Updates */}
          <div className="space-y-3">
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                1. Complaint Lifecycle Updates
              </h4>
              <p className="text-[11px] text-slate-500">
                Receive instant status transitions, assignment alerts, and resolution notices.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <label className="p-2.5 rounded-lg border border-slate-200 flex items-center gap-2 text-xs font-medium cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={preferences.complaintUpdates.inApp}
                  onChange={() => handleToggle('complaintUpdates', 'inApp')}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <Bell className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>In-App</span>
              </label>

              <label className="p-2.5 rounded-lg border border-slate-200 flex items-center gap-2 text-xs font-medium cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={preferences.complaintUpdates.push}
                  onChange={() => handleToggle('complaintUpdates', 'push')}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <Smartphone className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>Mobile Push</span>
              </label>

              <label className="p-2.5 rounded-lg border border-slate-200 flex items-center gap-2 text-xs font-medium cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={preferences.complaintUpdates.email}
                  onChange={() => handleToggle('complaintUpdates', 'email')}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <Mail className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Email</span>
              </label>

              <label className="p-2.5 rounded-lg border border-slate-200 flex items-center gap-2 text-xs font-medium cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={preferences.complaintUpdates.sms}
                  onChange={() => handleToggle('complaintUpdates', 'sms')}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>SMS</span>
              </label>
            </div>
          </div>

          {/* Section 2: Civic Points & Badges */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                2. Civic Champion & Rewards Updates
              </h4>
              <p className="text-[11px] text-slate-500">
                Notifications for score increases, badges unlocked, and district leaderboards.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <label className="p-2.5 rounded-lg border border-slate-200 flex items-center gap-2 text-xs font-medium cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={preferences.civicUpdates.inApp}
                  onChange={() => handleToggle('civicUpdates', 'inApp')}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <Bell className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>In-App</span>
              </label>

              <label className="p-2.5 rounded-lg border border-slate-200 flex items-center gap-2 text-xs font-medium cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={preferences.civicUpdates.push}
                  onChange={() => handleToggle('civicUpdates', 'push')}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <Smartphone className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>Mobile Push</span>
              </label>
            </div>
          </div>

          {/* Section 3: Operational & SLA Alerts (Authorized Staff Only) */}
          {isStaff && (
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  <span>3. Operational & SLA Alerts (Staff Only)</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Critical priority escalations, approaching statutory deadlines, and geographic spikes.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <label className="p-2.5 rounded-lg border border-slate-200 flex items-center gap-2 text-xs font-medium cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={preferences.operationalAlerts.inApp}
                    onChange={() => handleToggle('operationalAlerts', 'inApp')}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <Bell className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>In-App</span>
                </label>

                <label className="p-2.5 rounded-lg border border-slate-200 flex items-center gap-2 text-xs font-medium cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={preferences.operationalAlerts.push}
                    onChange={() => handleToggle('operationalAlerts', 'push')}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <Smartphone className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span>Mobile Push</span>
                </label>

                <label className="p-2.5 rounded-lg border border-slate-200 flex items-center gap-2 text-xs font-medium cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={preferences.operationalAlerts.email}
                    onChange={() => handleToggle('operationalAlerts', 'email')}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <Mail className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Email Digest</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
            Save Preferences
          </Button>
        </div>
      </div>
    </div>
  );
};
