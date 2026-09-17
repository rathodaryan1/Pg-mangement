import React from 'react';

export interface UrbanNestLogoProps {
  variant?: 'full' | 'horizontal' | 'compact' | 'mark';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  dark?: boolean;
}

export const UrbanNestMark: React.FC<{ size?: number; className?: string }> = ({ size = 36, className = '' }) => {
  return (
    <img
      src="/urban-nest-logo.png"
      alt="Urban Nest Mark"
      style={{ height: `${size}px`, width: 'auto', maxHeight: `${size}px` }}
      className={`shrink-0 object-contain ${className}`}
    />
  );
};

export const UrbanNestLogo: React.FC<UrbanNestLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  className = '',
  dark = false,
}) => {
  // Height sizing: scaled up so tagline "PEOPLE • PLACES • BETTER LIVING" and descriptor are clearly legible
  const sizeClasses = {
    xs: 'h-9 sm:h-10',
    sm: 'h-12 sm:h-14',
    md: 'h-20 sm:h-22 md:h-26', // ~80px to 104px - tagline & descriptor prominently visible
    lg: 'h-26 sm:h-30 md:h-36',
    xl: 'h-36 sm:h-44 md:h-52',
  }[size] || 'h-20 sm:h-22 md:h-26';

  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      <img
        src="/urban-nest-logo.png"
        alt="Urban Nest - Smart PG Management"
        className={`${sizeClasses} w-auto object-contain transition-transform`}
        style={{ aspectRatio: 'auto' }}
      />
    </div>
  );
};

