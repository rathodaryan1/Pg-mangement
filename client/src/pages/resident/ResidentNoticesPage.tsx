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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            PG Announcements & Notices
          </h1>
          <p className="text-xs text-slate-500">
            Official property announcements, maintenance windows, community events, and rule updates
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={fetchNotices} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
          Refresh Board
        </Button>
      </div>

      {/* Notices List */}
      {notices.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3 max-w-md mx-auto">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No New Notices</h3>
          <p className="text-xs text-slate-500">
            There are no active notices published for your PG branch currently.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {notices.map((n) => (
            <Card
              key={n.id}
              className={`p-6 space-y-3 transition-all ${
                n.isImportant
                  ? 'border-red-300 dark:border-red-900/60 bg-red-50/20 dark:bg-red-950/10'
                  : 'hover:border-purple-200 dark:hover:border-purple-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`p-2 rounded-xl ${
                      n.isImportant
                        ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400'
                        : 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400'
                    }`}
                  >
                    <Bell className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">{n.title}</h3>
                </div>

                <div className="flex items-center gap-2">
                  {n.isImportant && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800">
                      URGENT
                    </span>
                  )}
                  <Badge variant="purple">{n.category}</Badge>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {n.content}
              </p>

              <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span>Published by: <strong>{n.publisherName || 'Urban Nest Management'}</strong></span>
                <span>{new Date(n.publishedAt).toLocaleDateString()}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
