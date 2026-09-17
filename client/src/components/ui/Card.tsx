import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'flat' | 'bordered';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  className = '',
  ...props
}) => {
  const variants = {
    default: 'bg-white border border-[#DDE2DD] rounded-xl shadow-xs',
    flat: 'bg-[#F8F7F3] border border-[#DDE2DD]/80 rounded-xl',
    bordered: 'bg-transparent border border-[#DDE2DD] rounded-xl',
  };

  return (
    <div className={`${variants[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
};

export interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color?: 'forest' | 'gold' | 'amber' | 'rose' | 'slate';
  onClick?: () => void;
  className?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'forest',
  onClick,
  className = '',
}) => {
  const iconColorMap = {
    forest: 'bg-[#EAF2EE] text-[#0B4036] border-[#0B4036]/15',
    gold: 'bg-[#FAF5EB] text-[#B9954E] border-[#C8A45D]/25',
    amber: 'bg-amber-50 text-amber-700 border-amber-200/60',
    rose: 'bg-rose-50 text-rose-600 border-rose-200/60',
    slate: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  return (
    <div
      onClick={onClick}
      className={`p-5 bg-white border border-[#DDE2DD] rounded-xl shadow-xs transition-all ${
        onClick
          ? 'cursor-pointer hover:border-[#0B4036]/40 hover:shadow-sm'
          : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[#68736D] uppercase tracking-wider">
          {title}
        </span>
        <div className={`p-2 rounded-lg border ${iconColorMap[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <h3 className="text-2xl font-bold tracking-tight text-[#18231F] truncate">
          {value}
        </h3>

        {trend && (
          <span
            className={`inline-flex items-center text-xs font-semibold px-1.5 py-0.5 rounded-md ${
              trend.isPositive
                ? 'bg-[#EAF2EE] text-[#0B4036]'
                : 'bg-rose-50 text-rose-700'
            }`}
          >
            {trend.isPositive ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
            {trend.value}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1.5 text-xs text-[#8A928D] truncate">
          {subtitle}
        </p>
      )}
    </div>
  );
};
