import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-[#18231F]"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-[#68736D] pointer-events-none">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={`w-full px-3 py-2 text-xs sm:text-sm rounded-lg border bg-white border-[#DDE2DD] text-[#18231F] placeholder-[#8A928D] shadow-xs focus:outline-none focus:ring-2 focus:ring-[#0B4036]/20 focus:border-[#0B4036] transition-colors ${
              leftIcon ? 'pl-9' : ''
            } ${rightIcon ? 'pr-9' : ''} ${
              error ? 'border-rose-500 focus:ring-rose-500/30 focus:border-rose-500' : ''
            } ${className}`}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 text-[#68736D] pointer-events-none">
              {rightIcon}
            </div>
          )}
        </div>

        {error ? (
          <p className="text-xs font-medium text-rose-600">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-[#68736D]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-xs font-semibold text-[#18231F]"
          >
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          className={`w-full px-3 py-2 text-xs sm:text-sm rounded-lg border bg-white border-[#DDE2DD] text-[#18231F] placeholder-[#8A928D] shadow-xs focus:outline-none focus:ring-2 focus:ring-[#0B4036]/20 focus:border-[#0B4036] transition-colors ${
            error ? 'border-rose-500 focus:ring-rose-500/30 focus:border-rose-500' : ''
          } ${className}`}
          {...props}
        />

        {error ? (
          <p className="text-xs font-medium text-rose-600">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-[#68736D]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { label: string; value: string | number }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      options,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold text-[#18231F]"
          >
            {label}
          </label>
        )}

        <select
          ref={ref}
          id={selectId}
          className={`w-full px-3 py-2 text-xs sm:text-sm rounded-lg border bg-white border-[#DDE2DD] text-[#18231F] shadow-xs focus:outline-none focus:ring-2 focus:ring-[#0B4036]/20 focus:border-[#0B4036] transition-colors ${
            error ? 'border-rose-500' : ''
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-white text-[#18231F]">
              {opt.label}
            </option>
          ))}
        </select>

        {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';

export const Switch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; label?: string }> = ({
  checked,
  onChange,
  label,
}) => {
  return (
    <label className="inline-flex items-center cursor-pointer gap-2 select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#0B4036] ${
          checked ? 'bg-[#0B4036]' : 'bg-slate-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-150 ease-in-out ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
      {label && <span className="text-xs font-medium text-[#18231F]">{label}</span>}
    </label>
  );
};
