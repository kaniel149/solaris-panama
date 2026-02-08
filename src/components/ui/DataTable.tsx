import React, { useState, useMemo, useCallback } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const cn = (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(' ');

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  pageSize?: number;
  emptyMessage?: string;
  loading?: boolean;
  onRowClick?: (row: T) => void;
  getRowKey?: (row: T, index: number) => string;
  className?: string;
}

type SortDir = 'asc' | 'desc' | null;

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  pageSize = 10,
  emptyMessage = 'No data found',
  loading = false,
  onRowClick,
  getRowKey,
  className,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(0);

  const handleSort = useCallback(
    (key: string) => {
      if (sortKey === key) {
        if (sortDir === 'asc') setSortDir('desc');
        else if (sortDir === 'desc') {
          setSortKey(null);
          setSortDir(null);
        }
      } else {
        setSortKey(key);
        setSortDir('asc');
      }
      setPage(0);
    },
    [sortKey, sortDir]
  );

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDir) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      if (sortDir === 'asc') return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
      return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
    });
  }, [data, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const pagedData = sortedData.slice(page * pageSize, (page + 1) * pageSize);

  const alignClass = (align?: string) =>
    align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';

  if (loading) {
    return (
      <div className={cn('rounded-xl bg-[#12121a]/80 border border-white/[0.06] overflow-hidden', className)}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {columns.map((col) => (
                  <th key={col.key} className="px-4 py-3 text-left">
                    <div className="h-3 w-20 bg-white/[0.04] rounded animate-pulse" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-white/[0.03]">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="h-3 bg-white/[0.04] rounded animate-pulse" style={{ width: `${50 + Math.random() * 40}%` }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={cn('rounded-xl bg-[#12121a]/80 border border-white/[0.06] p-12 text-center', className)}>
        <p className="text-sm text-[#555566]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl bg-[#12121a]/80 border border-white/[0.06] overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 text-xs font-medium text-[#8888a0] uppercase tracking-wider',
                    alignClass(col.align),
                    col.sortable && 'cursor-pointer select-none hover:text-[#f0f0f5] transition-colors'
                  )}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortKey === col.key && (
                      sortDir === 'asc' ? (
                        <ChevronUp className="w-3.5 h-3.5 text-[#00ffcc]" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-[#00ffcc]" />
                      )
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedData.map((row, i) => {
              const rowIndex = page * pageSize + i;
              const key = getRowKey ? getRowKey(row, rowIndex) : rowIndex;
              return (
                <tr
                  key={key}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    'border-b border-white/[0.03] transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-white/[0.02]'
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn('px-4 py-3 text-sm text-[#f0f0f5]', alignClass(col.align))}
                    >
                      {col.render ? col.render(row, rowIndex) : row[col.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
          <span className="text-xs text-[#555566]">
            {page * pageSize + 1}-{Math.min((page + 1) * pageSize, sortedData.length)} of {sortedData.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(0)}
              disabled={page === 0}
              className="p-1.5 rounded-md text-[#555566] hover:text-[#f0f0f5] hover:bg-white/[0.04] transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-md text-[#555566] hover:text-[#f0f0f5] hover:bg-white/[0.04] transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, idx) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = idx;
              } else if (page < 3) {
                pageNum = idx;
              } else if (page > totalPages - 4) {
                pageNum = totalPages - 5 + idx;
              } else {
                pageNum = page - 2 + idx;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={cn(
                    'w-7 h-7 rounded-md text-xs font-medium transition-colors',
                    pageNum === page
                      ? 'bg-[#00ffcc]/10 text-[#00ffcc]'
                      : 'text-[#555566] hover:text-[#f0f0f5] hover:bg-white/[0.04]'
                  )}
                >
                  {pageNum + 1}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-md text-[#555566] hover:text-[#f0f0f5] hover:bg-white/[0.04] transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPage(totalPages - 1)}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-md text-[#555566] hover:text-[#f0f0f5] hover:bg-white/[0.04] transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
