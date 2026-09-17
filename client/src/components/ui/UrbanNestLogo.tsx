import React from 'react';

export interface UrbanNestLogoProps {
  variant?: 'full' | 'horizontal' | 'compact' | 'mark';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  dark?: boolean;
}

export const UrbanNestMark: React.FC<{ size?: number; className?: string }> = ({ size = 36, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      <defs>
        {/* Forest Green Gradient */}
        <linearGradient id="unForestGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1B5548" />
          <stop offset="60%" stopColor="#0B4036" />
          <stop offset="100%" stopColor="#072C25" />
        </linearGradient>

        {/* Champagne Gold Gradient */}
        <linearGradient id="unGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E8D7A8" />
          <stop offset="35%" stopColor="#D7BD7A" />
          <stop offset="70%" stopColor="#C8A45D" />
          <stop offset="100%" stopColor="#B9954E" />
        </linearGradient>

        {/* Soft Drop Shadow for dimensionality */}
        <filter id="unMarkShadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.15" />
        </filter>
      </defs>

      <g filter="url(#unMarkShadow)">
        {/* Left 'U' + House Left Wall in Forest Green */}
        <path
          d="M26 38 C26 36 28 34 30 33 L54 18 C56 16.5 58 17.5 58 20 L58 36 C58 37 57 38 56 38.5 L44 46 L44 76 C44 80 47 83 51 83 L63 83 C67 83 70 80 70 76 L70 38 C70 36 71.5 34 73.5 34 L77 34 L77 78 C77 88 69 96 59 96 L47 96 C35 96 26 87 26 75 Z"
          fill="url(#unForestGrad)"
        />

        {/* Right 'N' + House Right Roof in Champagne Gold */}
        <path
          d="M58 20 L84 45 C86 47 89 45.5 89 43 L89 36 C89 34 90.5 32.5 92.5 32.5 L102 32.5 C104 32.5 106 34.5 106 36.5 L106 91 C106 93.5 104 95.5 101.5 95.5 L93.5 95.5 C91 95.5 89 93.5 89 91 L89 57 L63 32 L58 27 C57 26 57 24 58 20 Z"
          fill="url(#unGoldGrad)"
        />

        {/* 4 Window Panes in Forest Green */}
        <g fill="#0B4036">
          <rect x="47" y="52" width="6" height="6" rx="1" />
          <rect x="56" y="52" width="6" height="6" rx="1" />
          <rect x="47" y="61" width="6" height="6" rx="1" />
          <rect x="56" y="61" width="6" height="6" rx="1" />
        </g>
      </g>
    </svg>
  );
};

export const UrbanNestLogo: React.FC<UrbanNestLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  className = '',
  dark = false,
}) => {
  if (variant === 'mark') {
    const sizeMap = { sm: 24, md: 32, lg: 44, xl: 64 };
    return <UrbanNestMark size={sizeMap[size]} className={className} />;
  }

  if (variant === 'compact') {
    const iconSize = size === 'sm' ? 22 : size === 'md' ? 28 : size === 'lg' ? 36 : 48;
    const textSize = size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : size === 'lg' ? 'text-base' : 'text-xl';

    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <UrbanNestMark size={iconSize} />
        <span className={`font-black tracking-tight ${textSize}`}>
          <span className={dark ? 'text-white' : 'text-[#0B4036]'}>URBAN</span>{' '}
          <span className="text-[#C8A45D]">NEST</span>
        </span>
      </div>
    );
  }

  if (variant === 'horizontal') {
    const iconSize = size === 'sm' ? 26 : size === 'md' ? 34 : size === 'lg' ? 44 : 56;
    const titleSize = size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : size === 'lg' ? 'text-base' : 'text-xl';
    const subSize = size === 'sm' ? 'text-[8px]' : size === 'md' ? 'text-[9px]' : size === 'lg' ? 'text-[10px]' : 'text-xs';

    return (
      <div className={`inline-flex items-center gap-2.5 text-left ${className}`}>
        <UrbanNestMark size={iconSize} />
        <div>
          <div className={`font-black tracking-tight leading-none ${titleSize}`}>
            <span className={dark ? 'text-white' : 'text-[#0B4036]'}>URBAN</span>{' '}
            <span className="text-[#C8A45D]">NEST</span>
          </div>
          <div
            className={`font-semibold tracking-widest uppercase mt-0.5 leading-none ${subSize} ${
              dark ? 'text-slate-300' : 'text-[#18231F]/80'
            }`}
          >
            SMART PG MANAGEMENT
          </div>
        </div>
      </div>
    );
  }

  // Full Brand Logo Presentation
  return (
    <div className={`flex flex-col items-center text-center select-none ${className}`}>
      <UrbanNestMark size={size === 'xl' ? 96 : size === 'lg' ? 76 : 56} />

      {/* Main Brand Title */}
      <h1
        className={`font-black tracking-tight mt-3 leading-none ${
          size === 'xl' ? 'text-3xl' : size === 'lg' ? 'text-2xl' : 'text-xl'
        }`}
      >
        <span className={dark ? 'text-white' : 'text-[#0B4036]'}>URBAN</span>{' '}
        <span className="text-[#C8A45D]">NEST</span>
      </h1>

      {/* Descriptor */}
      <p
        className={`font-bold tracking-[0.22em] uppercase mt-1 text-[#18231F] ${
          size === 'xl' ? 'text-xs' : 'text-[10px]'
        }`}
      >
        SMART PG MANAGEMENT
      </p>

      {/* Subtle Gold Divider with Botanical Leaf */}
      <div className="flex items-center justify-center gap-2 mt-2.5 w-full max-w-[200px]">
        <div className="h-[1px] flex-1 bg-[#C8A45D]/60" />
        <svg width="14" height="12" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M8 13 C8 13 8 7 14 3 C14 8 10 12 8 13 Z"
            fill="#0B4036"
          />
          <path
            d="M8 13 C8 13 8 6 2 4 C2 9 6 12 8 13 Z"
            fill="#1B5548"
          />
        </svg>
        <div className="h-[1px] flex-1 bg-[#C8A45D]/60" />
      </div>

      {/* Brand Tagline */}
      <p
        className={`font-medium tracking-[0.25em] uppercase text-[#68736D] mt-1.5 ${
          size === 'xl' ? 'text-[10px]' : 'text-[9px]'
        }`}
      >
        PEOPLE • PLACES • BETTER LIVING
      </p>
    </div>
  );
};
