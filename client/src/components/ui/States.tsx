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
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
      <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
        {icon || <FolderOpen className="w-7 h-7" />}
      </div>
      <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" className="mt-5" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export const LoadingState: React.FC<{ message?: string }> = ({ message = 'Loading system data...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-16 text-center">
      <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
      <p className="mt-4 text-xs font-medium text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
};

export const ErrorState: React.FC<{ message?: string; onRetry?: () => void }> = ({
  message = 'An unexpected error occurred while loading this section.',
  onRetry
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-2xl">
      <AlertCircle className="w-10 h-10 text-rose-600 dark:text-rose-400 mb-3" />
      <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">System Error</h4>
      <p className="mt-1 text-xs text-rose-700 dark:text-rose-300 max-w-md">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4 border-rose-300 text-rose-700" onClick={onRetry} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
          Retry Action
        </Button>
      )}
    </div>
  );
};

export const Skeleton: React.FC<{ className?: string }> = ({ className = 'h-4 w-full' }) => {
  return <div className={`bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg ${className}`} />;
};
