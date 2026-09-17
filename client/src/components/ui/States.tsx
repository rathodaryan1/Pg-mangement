import React from 'react';
import { FolderOpen, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export const EmptyState: React.FC<{
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}> = ({ title, description, actionLabel, onAction, icon }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mb-3.5">
        {icon || <FolderOpen className="w-6 h-6" />}
      </div>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export const LoadingState: React.FC<{ message?: string }> = ({ message = 'Loading system data...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="w-7 h-7 border-2 border-[#0B4036]/20 border-t-[#0B4036] dark:border-[#C8A45D]/30 dark:border-t-[#C8A45D] rounded-full animate-spin" />
      <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
};

export const ErrorState: React.FC<{ message?: string; onRetry?: () => void }> = ({
  message = 'An unexpected error occurred while loading this section.',
  onRetry,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl">
      <AlertCircle className="w-8 h-8 text-rose-600 dark:text-rose-400 mb-2.5" />
      <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200 uppercase tracking-wider">System Notice</h4>
      <p className="mt-1 text-xs text-rose-700 dark:text-rose-300 max-w-md">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          className="mt-3.5 border-rose-300 text-rose-700 hover:bg-rose-100/50"
          onClick={onRetry}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Try again
        </Button>
      )}
    </div>
  );
};

export const Skeleton: React.FC<{ className?: string }> = ({ className = 'h-4 w-full' }) => {
  return <div className={`bg-slate-200/80 dark:bg-slate-800 animate-pulse rounded-md ${className}`} />;
};

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 4 }) => {
  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-3.5 flex gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const KPISkeleton: React.FC = () => {
  return (
    <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-3">
      <div className="flex justify-between items-center">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-7 w-7 rounded-lg" />
      </div>
      <Skeleton className="h-7 w-28" />
      <Skeleton className="h-3 w-36" />
    </div>
  );
};
