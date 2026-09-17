import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  className?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyMessage = 'No records found',
  className = '',
}: TableProps<T>) {
  if (isLoading) {
    return (
      <div className="w-full p-8 text-center bg-white rounded-xl border border-[#DDE2DD]">
        <div className="w-6 h-6 mx-auto border-2 border-[#0B4036]/20 border-t-[#0B4036] rounded-full animate-spin" />
        <p className="mt-3 text-xs text-[#68736D]">Loading records...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full p-10 text-center bg-white rounded-xl border border-[#DDE2DD]">
        <p className="text-xs text-[#68736D] font-medium">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`w-full overflow-x-auto rounded-xl border border-[#DDE2DD] bg-white shadow-xs ${className}`}>
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-[#F8F7F3] border-b border-[#DDE2DD]">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                className={`px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-[#68736D] ${
                  col.className || ''
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              className="hover:bg-[#F8F7F3]/70 transition-colors"
            >
              {columns.map((col, idx) => (
                <td key={idx} className={`px-4 py-3 text-[#18231F] ${col.className || ''}`}>
                  {col.cell
                    ? col.cell(item)
                    : col.accessorKey
                    ? String(item[col.accessorKey] ?? '')
                    : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const Pagination: React.FC<{
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#DDE2DD] bg-white rounded-b-xl text-xs text-[#68736D]">
      <span>
        Page {currentPage} of {totalPages}
      </span>
      <div className="flex items-center gap-1">
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="p-1 rounded-md border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <button
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="p-1 rounded-md border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
          aria-label="Next page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
