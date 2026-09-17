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
  // Height sizing: prominent, high-clarity dimensions
  const sizeClasses = {
    xs: 'h-8 sm:h-9',
    sm: 'h-10 sm:h-11 md:h-12',
    md: 'h-14 sm:h-16 md:h-18', // ~56px to 72px - very prominent and clearly readable in header
    lg: 'h-20 sm:h-24 md:h-28',
    xl: 'h-28 sm:h-36 md:h-44',
  }[size] || 'h-14 sm:h-16 md:h-18';

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

