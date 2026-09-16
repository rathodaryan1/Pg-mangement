import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'purple' | 'outline';
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  className = '',
  dot = false
}) => {
  const base = 'inline-flex items-center gap-1.5 font-medium rounded-full';

  const variants = {
    primary: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40',
    secondary: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40',
    warning: 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40',
    danger: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40',
    purple: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40',
    outline: 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
  };

  const dotColors = {
    primary: 'bg-blue-500',
    secondary: 'bg-slate-400',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    purple: 'bg-purple-500',
    outline: 'bg-slate-400'
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1'
  };

  return (
    <span className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: string; className?: string }> = ({ status, className = '' }) => {
  const norm = status.toUpperCase();

  switch (norm) {
    case 'ACTIVE':
    case 'PAID':
    case 'APPROVED':
    case 'RESOLVED':
    case 'CHECKED_IN':
    case 'COMPLETED':
    case 'VERIFIED':
    case 'AVAILABLE':
    case 'GOOD':
    case 'EXCELLENT':
      return <Badge variant="success" dot className={className}>{status.replace('_', ' ')}</Badge>;

    case 'PENDING':
    case 'REPORTED':
    case 'IN_PROGRESS':
    case 'NOTICE_PERIOD':
    case 'NEEDS_REPAIR':
    case 'MAINTENANCE':
    case 'APPROVAL_PENDING':
      return <Badge variant="warning" dot className={className}>{status.replace('_', ' ')}</Badge>;

    case 'OVERDUE':
    case 'REJECTED':
    case 'EXPIRED':
    case 'URGENT':
    case 'HIGH':
    case 'FULL':
    case 'DAMAGED':
      return <Badge variant="danger" dot className={className}>{status.replace('_', ' ')}</Badge>;

    case 'MOVED_OUT':
    case 'CHECKED_OUT':
    case 'INACTIVE':
    case 'CLOSED':
      return <Badge variant="secondary" className={className}>{status.replace('_', ' ')}</Badge>;

    default:
      return <Badge variant="primary" className={className}>{status.replace('_', ' ')}</Badge>;
  }
};
