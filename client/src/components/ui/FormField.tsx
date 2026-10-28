import React from 'react';

export interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required = false,
  error,
  helperText,
  children,
  className = '',
  id,
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={id} className="block text-xs font-semibold text-[#18231F]">
        {label}
        {required && <span className="text-rose-500 ml-1 font-bold">*</span>}
      </label>

      {children}

      {error ? (
        <p className="text-[11px] font-medium text-rose-600 animate-fade-in">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-[#8A928D]">{helperText}</p>
      ) : null}
    </div>
  );
};
