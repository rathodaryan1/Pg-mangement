import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, ExternalLink, X, Clock, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { residentApi } from '../../services/residentApi';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type?: string;
  isRead?: boolean;
  createdAt?: string;
  linkUrl?: string;
}

export const NotificationCenter: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (user.role === 'RESIDENT') {
        const res = await residentApi.getNotifications();
        const list = (Array.isArray(res) ? res : (res as any)?.data || []) as NotificationItem[];
        setNotifications(list);
        setUnreadCount(list.filter((n) => !n.isRead).length);
      } else {
        // Fallback default operational notifications for staff/owner
        const defaultNotices: NotificationItem[] = [
          {
            id: 'sys-1',
            title: 'System Active',
            message: 'All property operational services and gate desk are running normally.',
            type: 'INFO',
            isRead: false,
            createdAt: new Date().toISOString(),
          },
        ];
        setNotifications(defaultNotices);
        setUnreadCount(1);
      }
    } catch {
      // Fail safely without alerting
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    if (user?.role === 'RESIDENT') {
      try {
        await residentApi.markAllNotificationsRead();
      } catch {
        // ignore
      }
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-[#68736D] hover:text-[#0B4036] hover:bg-[#EAF2EE] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0B4036]/20"
        title="View Notifications"
        aria-label="View Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-[#DDE2DD] rounded-xl shadow-lg z-50 overflow-hidden animate-slide-up">
          <div className="p-3.5 bg-[#F8F7F3] border-b border-[#DDE2DD] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#18231F] uppercase tracking-wider">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#0B4036] text-white font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[11px] font-semibold text-[#0B4036] hover:underline flex items-center gap-1"
                >
                  <Check className="w-3 h-3" /> Mark read
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-[#8A928D] hover:text-[#18231F] hover:bg-slate-200/50"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#8A928D]">
                <Clock className="w-6 h-6 mx-auto mb-2 text-[#DDE2DD]" />
                No new notifications
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3.5 hover:bg-[#F8F7F3] transition-colors ${
                    !n.isRead ? 'bg-[#FAF5EB]/40' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-[#18231F]">{n.title}</h4>
                    {!n.isRead && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C8A45D] shrink-0 mt-1" />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-[#68736D] leading-relaxed">{n.message}</p>
                  {n.linkUrl && (
                    <Link
                      to={n.linkUrl}
                      onClick={() => setIsOpen(false)}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#0B4036] hover:underline"
                    >
                      View details <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
