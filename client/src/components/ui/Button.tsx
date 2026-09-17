import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'gold';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none select-none';

  const variants = {
    primary:
      'bg-[#0B4036] hover:bg-[#123F36] active:bg-[#072C25] text-white shadow-xs focus-visible:ring-[#0B4036]',
    secondary:
      'bg-[#18231F] hover:bg-[#25332E] text-white shadow-xs focus-visible:ring-[#18231F]',
    outline:
      'border border-[#DDE2DD] dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-[#F8F7F3] dark:hover:bg-slate-800 text-[#18231F] dark:text-slate-200 focus-visible:ring-[#0B4036]',
    ghost:
      'hover:bg-[#EAF2EE] dark:hover:bg-slate-800 text-[#18231F] dark:text-slate-300 focus-visible:ring-[#0B4036]',
    gold:
      'bg-[#C8A45D] hover:bg-[#B9954E] active:bg-[#A8843F] text-[#18231F] font-semibold shadow-xs focus-visible:ring-[#C8A45D]',
    danger:
      'bg-rose-600 hover:bg-rose-700 text-white shadow-xs focus-visible:ring-rose-500 active:bg-rose-800',
    success:
      'bg-[#0B4036] hover:bg-[#123F36] text-white shadow-xs focus-visible:ring-[#0B4036] active:bg-[#072C25]',
  };

  const sizes = {
    xs: 'text-xs px-2.5 py-1 gap-1',
    sm: 'text-xs px-3 py-1.5 gap-1.5 font-medium',
    md: 'text-sm px-3.5 py-2 gap-2 font-medium',
    lg: 'text-sm px-5 py-2.5 gap-2 font-semibold',
    icon: 'p-2 w-9 h-9',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
