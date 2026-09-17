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
  // Height sizing mapped accurately to prompt specifications:
  // Desktop: 42–52px, Mobile: 34–42px for header (size="md")
  const sizeClasses = {
    sm: 'h-8 sm:h-9 md:h-10',
    md: 'h-10 sm:h-11 md:h-12',
    lg: 'h-16 sm:h-20',
    xl: 'h-24 sm:h-28 md:h-32',
  }[size] || 'h-10 sm:h-11 md:h-12';

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

