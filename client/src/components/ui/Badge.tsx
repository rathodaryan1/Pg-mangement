import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'gold' | 'outline';
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  className = '',
  dot = false,
}) => {
  const base = 'inline-flex items-center gap-1.5 font-medium rounded-md select-none';

  const variants = {
    primary: 'bg-[#EAF2EE] text-[#0B4036] dark:bg-emerald-950/60 dark:text-emerald-300 border border-[#0B4036]/20',
    secondary: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    success: 'bg-[#EAF2EE] text-[#0B4036] dark:bg-emerald-950/60 dark:text-emerald-300 border border-[#0B4036]/20',
    warning: 'bg-[#FAF5EB] text-[#B9954E] dark:bg-amber-950/60 dark:text-amber-300 border border-[#C8A45D]/30',
    danger: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40',
    gold: 'bg-[#FAF5EB] text-[#B9954E] dark:bg-amber-950/60 dark:text-amber-300 border border-[#C8A45D]/40',
    outline: 'border border-[#DDE2DD] dark:border-slate-700 text-[#18231F] dark:text-slate-300 bg-white dark:bg-slate-900',
  };

  const dotColors = {
    primary: 'bg-[#0B4036]',
    secondary: 'bg-slate-400',
    success: 'bg-[#0B4036]',
    warning: 'bg-[#C8A45D]',
    danger: 'bg-rose-500',
    gold: 'bg-[#C8A45D]',
    outline: 'bg-slate-400',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 leading-tight',
    md: 'text-xs px-2.5 py-1 leading-tight',
  };

  return (
    <span className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]}`} />}
      <span>{children}</span>
    </span>
  );
};

export const StatusBadge: React.FC<{ status: string; className?: string }> = ({ status, className = '' }) => {
  const norm = (status || '').toUpperCase();

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
    case 'IN_STOCK':
    case 'SETTLED':
      return (
        <Badge variant="success" dot className={className}>
          {status.replace(/_/g, ' ')}
        </Badge>
      );

    case 'PENDING':
    case 'REPORTED':
    case 'IN_PROGRESS':
    case 'NOTICE_PERIOD':
    case 'NEEDS_REPAIR':
    case 'MAINTENANCE':
    case 'APPROVAL_PENDING':
    case 'LOW_STOCK':
    case 'PARTIAL':
      return (
        <Badge variant="warning" dot className={className}>
          {status.replace(/_/g, ' ')}
        </Badge>
      );

    case 'OVERDUE':
    case 'REJECTED':
    case 'EXPIRED':
    case 'URGENT':
    case 'HIGH':
    case 'FULL':
    case 'DAMAGED':
    case 'OUT_OF_STOCK':
    case 'CANCELLED':
    case 'CRITICAL':
      return (
        <Badge variant="danger" dot className={className}>
          {status.replace(/_/g, ' ')}
        </Badge>
      );

    case 'MOVED_OUT':
    case 'CHECKED_OUT':
    case 'INACTIVE':
    case 'CLOSED':
    case 'ARCHIVED':
    case 'OCCUPIED':
      return (
        <Badge variant="secondary" className={className}>
          {status.replace(/_/g, ' ')}
        </Badge>
      );

    default:
      return (
        <Badge variant="primary" className={className}>
          {status.replace(/_/g, ' ')}
        </Badge>
      );
  }
};
