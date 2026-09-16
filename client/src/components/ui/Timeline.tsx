import React from 'react';
import { StatusBadge } from './Badge';

export interface TimelineItem {
  id: string;
  title: string;
  timestamp: string;
  actor?: string;
  comment?: string;
  status?: string;
}

export const Timeline: React.FC<{ items: TimelineItem[] }> = ({ items }) => {
  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
      {items.map((item, idx) => (
        <div key={item.id || idx} className="relative group">
          <span className="absolute -left-[23px] top-1 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 bg-blue-600 ring-4 ring-blue-50 dark:ring-blue-950/50" />
          <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white">{item.title}</span>
              <span className="text-[11px] text-slate-400">{item.timestamp}</span>
            </div>
            {item.actor && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">By: {item.actor}</p>
            )}
            {item.status && (
              <div className="mt-2">
                <StatusBadge status={item.status} />
              </div>
            )}
            {item.comment && (
              <p className="mt-2 text-xs italic text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                "{item.comment}"
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
