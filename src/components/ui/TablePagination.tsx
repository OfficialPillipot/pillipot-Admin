import React from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from "@heroicons/react/20/solid";
import { cn } from "../../lib/utils";

export interface TablePaginationProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  disabled?: boolean;
  className?: string;
  itemLabel?: string;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 80, 100],
  disabled = false,
  className,
  itemLabel = "products",
}) => {
  const safeTotalPages = Math.max(1, totalPages || 1);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), safeTotalPages);

  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

  // Generate page numbers to display with smart ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (safeTotalPages <= maxVisiblePages + 2) {
      for (let i = 1; i <= safeTotalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) {
        pages.push("ellipsis-1");
      }

      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(safeTotalPages - 1, safeCurrentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (safeCurrentPage < safeTotalPages - 2) {
        pages.push("ellipsis-2");
      }
      pages.push(safeTotalPages);
    }

    return pages;
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-4 py-4 px-1 sm:flex-row sm:items-center sm:justify-between text-sm text-text-muted select-none",
        className
      )}
    >
      {/* Left side: Rows per page selector and range counter */}
      <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          <label htmlFor="table-page-size" className="whitespace-nowrap font-medium text-text-muted">
            Rows per page:
          </label>
          <select
            id="table-page-size"
            value={pageSize}
            disabled={disabled}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-8 rounded-[var(--radius-md)] border border-border bg-surface px-2.5 py-1 text-xs sm:text-sm text-text font-medium shadow-sm transition-colors hover:border-border-hover focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 cursor-pointer"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div className="text-text-muted">
          Showing{" "}
          <span className="font-semibold text-text">{startItem}</span> to{" "}
          <span className="font-semibold text-text">{endItem}</span> of{" "}
          <span className="font-semibold text-text">{totalItems}</span> {itemLabel}
        </div>
      </div>

      {/* Right side: Navigation buttons */}
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={disabled || safeCurrentPage <= 1}
          aria-label="First page"
          title="First page"
          className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-border bg-surface text-text hover:bg-surface-hover hover:text-text disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronDoubleLeftIcon className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={disabled || safeCurrentPage <= 1}
          aria-label="Previous page"
          title="Previous page"
          className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-border bg-surface text-text hover:bg-surface-hover hover:text-text disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map((p, idx) => {
            if (typeof p === "string") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-1 text-xs text-text-muted/60 select-none"
                >
                  ...
                </span>
              );
            }

            const isCurrent = p === safeCurrentPage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                disabled={disabled}
                className={cn(
                  "inline-flex h-8 min-w-[2rem] px-2 items-center justify-center rounded-[var(--radius-md)] text-xs sm:text-sm font-medium transition-colors",
                  isCurrent
                    ? "bg-primary text-white shadow-sm font-semibold pointer-events-none"
                    : "border border-border bg-surface text-text hover:bg-surface-hover hover:text-text"
                )}
              >
                {p}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={disabled || safeCurrentPage >= safeTotalPages}
          aria-label="Next page"
          title="Next page"
          className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-border bg-surface text-text hover:bg-surface-hover hover:text-text disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => onPageChange(safeTotalPages)}
          disabled={disabled || safeCurrentPage >= safeTotalPages}
          aria-label="Last page"
          title="Last page"
          className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-border bg-surface text-text hover:bg-surface-hover hover:text-text disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronDoubleRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
