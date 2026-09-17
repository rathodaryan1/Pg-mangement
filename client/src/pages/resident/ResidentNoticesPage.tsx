import React, { useState, useEffect } from 'react';
import { Bell, Sparkles, AlertTriangle, RefreshCw, Calendar, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { residentApi } from '../../services/residentApi';

export const ResidentNoticesPage: React.FC = () => {
  const [notices, setNotices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotices = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await residentApi.getNotices();
      setNotices(data || []);
    } catch (err: any) {
      console.error('Failed to load notices:', err.message);
      setError(err.message || 'Failed to load property announcements.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-60 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#18231F]">
            PG Announcements & Notices
          </h1>
          <p className="text-xs text-[#68736D]">
            Official property announcements, maintenance windows, community events, and rule updates
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={fetchNotices} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
          Refresh Board
        </Button>
      </div>

      {/* Notices List */}
      {notices.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white border border-[#DDE2DD] text-center space-y-3 max-w-md mx-auto shadow-xs">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
          <h3 className="text-base font-bold text-[#18231F]">No New Notices</h3>
          <p className="text-xs text-[#68736D]">
            There are no active notices published for your PG branch currently.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {notices.map((n) => (
            <Card
              key={n.id}
              className={`p-6 space-y-3 transition-all bg-white border border-[#DDE2DD] shadow-xs ${
                n.isImportant
                  ? 'border-red-300 bg-red-50/20'
                  : 'hover:border-[#0B4036]/40'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#DDE2DD]/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`p-2 rounded-xl ${
                      n.isImportant
                        ? 'bg-red-100 text-red-700'
                        : 'bg-[#EAF2EE] text-[#0B4036] border border-[#0B4036]/15'
                    }`}
                  >
                    <Bell className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-sm sm:text-base text-[#18231F]">{n.title}</h3>
                </div>

                <div className="flex items-center gap-2">
                  {n.isImportant && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 border border-red-200">
                      URGENT
                    </span>
                  )}
                  <Badge variant="secondary">{n.category}</Badge>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-[#18231F] leading-relaxed">
                {n.content}
              </p>

              <div className="text-[11px] text-[#8A928D] pt-2 border-t border-[#DDE2DD]/60 flex items-center justify-between">
                <span>Published by: <strong className="text-[#18231F]">{n.publisherName || 'Urban Nest Management'}</strong></span>
                <span>{new Date(n.publishedAt).toLocaleDateString()}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
