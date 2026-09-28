import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  CheckCheck,
  Filter,
  Search,
  Settings,
  Sparkles,
  RefreshCw,
  FileText,
  Clock,
  ShieldAlert,
  Award,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { NotificationService } from '../services/notificationService';
import {
  NotificationRecord,
  NotificationCategory,
  NotificationSeverity,
  NotificationStatsSummary,
} from '../types/notification';
import { useAuth } from '../hooks/useAuth';
import { useOrganization } from '../context/OrganizationContext';
import { NotificationItem } from '../components/notifications/NotificationItem';
import { NotificationPreferencesModal } from '../components/notifications/NotificationPreferencesModal';

interface NotificationsPageProps {
  onNavigateToComplaint?: (complaintId: string) => void;
  onNavigateToAlerts?: () => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
  onNavigateToComplaint,
  onNavigateToAlerts,
}) => {
  const { user } = useAuth();
  const { district, municipalCorporationName } = useOrganization();

  const userId = user?.id || 'officer-pune-01';
  const userRole = user?.role || 'officer';
  const userDistrict = district?.toLowerCase() || 'pune';

  const [activeTab, setActiveTab] = useState<'all' | 'unread' | NotificationCategory>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<NotificationSeverity | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [stats, setStats] = useState<NotificationStatsSummary>({
    totalCount: 0,
    unreadCount: 0,
    criticalCount: 0,
    complaintsCount: 0,
    slaCount: 0,
    alertsCount: 0,
    civicCount: 0,
  });
  const [showPreferences, setShowPreferences] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadData = () => {
    NotificationService.init();
    // If store empty, seed baseline factual data
    const existing = NotificationService.getNotifications(userId, userRole, userDistrict);
    if (existing.length === 0) {
      NotificationService.seedDemonstrationNotifications();
    }

    const filters = {
      category: activeTab === 'all' || activeTab === 'unread' ? undefined : activeTab,
      isRead: activeTab === 'unread' ? false : undefined,
      severity: selectedSeverity === 'all' ? undefined : selectedSeverity,
      searchQuery: searchQuery.trim() || undefined,
    };

    const records = NotificationService.getNotifications(userId, userRole, userDistrict, filters);
    const summary = NotificationService.getStatsSummary(userId, userRole, userDistrict);

    setNotifications(records);
    setStats(summary);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, [userId, userRole, userDistrict, activeTab, selectedSeverity, searchQuery]);

  const handleMarkAllRead = () => {
    NotificationService.markAllAsRead(userId, userDistrict, userRole);
    loadData();
  };

  const handleSelectNotification = (notif: NotificationRecord) => {
    NotificationService.markAsRead(notif.id, userId);
    loadData();

    if (notif.complaintId && onNavigateToComplaint) {
      onNavigateToComplaint(notif.complaintId);
    } else if (notif.category === 'alerts' || notif.category === 'sla') {
      onNavigateToAlerts?.();
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-blue-600 uppercase font-bold tracking-wider">
              {municipalCorporationName || 'Maharashtra Municipal'} Command
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-mono text-slate-500 uppercase font-bold">
              District: {userDistrict}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-600" />
            <span>Operational Notification Center</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time multi-channel incident telemetry, statutory SLA alerts, and citizen sign-off events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {stats.unreadCount > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              className="text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-1.5"
            >
              <CheckCheck className="w-4 h-4 text-blue-600" />
              <span>Mark All Read</span>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPreferences(true)}
            className="text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-1.5"
          >
            <Settings className="w-4 h-4 text-slate-600" />
            <span>Preferences</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadData}
            className="text-xs bg-white hover:bg-slate-50 p-2"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-slate-600" />
          </Button>
        </div>
      </div>

      {/* Summary KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3.5 border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500">
            <span>Total Logged</span>
            <Bell className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">{stats.totalCount}</div>
        </Card>

        <Card className="p-3.5 border-blue-200 bg-blue-50/40 shadow-xs">
          <div className="flex items-center justify-between text-xs font-mono text-blue-700">
            <span>Unread Active</span>
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          </div>
          <div className="text-xl font-bold text-blue-950 mt-1">{stats.unreadCount}</div>
        </Card>

        <Card className="p-3.5 border-red-200 bg-red-50/40 shadow-xs">
          <div className="flex items-center justify-between text-xs font-mono text-red-700">
            <span>Critical Urgent</span>
            <ShieldAlert className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-xl font-bold text-red-950 mt-1">{stats.criticalCount}</div>
        </Card>

        <Card className="p-3.5 border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500">
            <span>Complaints</span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">{stats.complaintsCount}</div>
        </Card>

        <Card className="p-3.5 border-amber-200 bg-amber-50/30 shadow-xs">
          <div className="flex items-center justify-between text-xs font-mono text-amber-700">
            <span>SLA & Alerts</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-amber-950 mt-1">{stats.slaCount + stats.alertsCount}</div>
        </Card>

        <Card className="p-3.5 border-emerald-200 bg-emerald-50/30 shadow-xs">
          <div className="flex items-center justify-between text-xs font-mono text-emerald-700">
            <span>Civic Rewards</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-950 mt-1">{stats.civicCount}</div>
        </Card>
      </div>

      {/* Filter Tabs & Search Bar */}
      <Card className="p-4 border-slate-200 bg-white shadow-sm space-y-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100 scrollbar-none">
          {[
            { id: 'all', label: 'All Notifications', count: stats.totalCount },
            { id: 'unread', label: 'Unread Only', count: stats.unreadCount },
            { id: 'complaints', label: 'Complaints', count: stats.complaintsCount },
            { id: 'sla', label: 'SLA Urgency', count: stats.slaCount },
            { id: 'alerts', label: 'Smart Alerts', count: stats.alertsCount },
            { id: 'civic', label: 'Civic Rewards', count: stats.civicCount },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  activeTab === tab.id ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Severity Filter Inputs */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search notifications by title, message, or complaint ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs bg-slate-50 border-slate-200 w-full"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value as any)}
              className="p-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 outline-hidden w-full sm:w-auto"
            >
              <option value="all">All Severities</option>
              <option value="critical">🔴 Critical</option>
              <option value="high">🟠 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">🔵 Low</option>
              <option value="info">⚪ Info</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Notifications List */}
      <div className="space-y-2.5">
        {notifications.length === 0 ? (
          <Card className="p-12 text-center border-slate-200 bg-white">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Bell className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              {activeTab === 'unread' ? 'No unread notifications' : "You're all caught up"}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {activeTab === 'unread'
                ? 'All incoming municipal incident alerts and lifecycle notifications have been reviewed.'
                : 'No notification records match your current filter selection.'}
            </p>
          </Card>
        ) : (
          notifications.map((notif) => (
            <NotificationItem
              key={notif.id}
              notification={notif}
              onSelect={handleSelectNotification}
            />
          ))
        )}
      </div>

      {/* Channel Preferences Modal */}
      <NotificationPreferencesModal
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
      />
    </div>
  );
};
