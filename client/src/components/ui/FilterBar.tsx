import React from 'react';
import { SearchInput } from './SearchInput';

export interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

export interface FilterBarProps {
  search?: {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
  };
  filterPills?: {
    active: string;
    onChange: (val: string) => void;
    options: FilterOption[];
  };
  children?: React.ReactNode;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  search,
  filterPills,
  children,
  className = '',
}) => {
  return (
    <div className={`mb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 bg-white border border-[#DDE2DD] rounded-xl shadow-xs ${className}`}>
      <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
        {search && (
          <div className="w-full sm:w-64 md:w-72">
            <SearchInput
              value={search.value}
              onChange={search.onChange}
              placeholder={search.placeholder || 'Search...'}
            />
          </div>
        )}

        {filterPills && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
            {filterPills.options.map((opt) => {
              const isActive = filterPills.active === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => filterPills.onChange(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#0B4036] text-white shadow-xs'
                      : 'bg-[#F8F7F3] hover:bg-[#EAF2EE] text-[#68736D] hover:text-[#0B4036] border border-[#DDE2DD]/60'
                  }`}
                >
                  <span>{opt.label}</span>
                  {opt.count !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-white/20 text-white' : 'bg-[#DDE2DD] text-[#18231F]'
                      }`}
                    >
                      {opt.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
    </div>
  );
};
