import { memo, type ReactNode } from "react";

interface Column<T> {
  key: string;
  header: ReactNode;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
  className?: string;
}

function TableComponent<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "No data",
  className = "",
}: TableProps<T>) {
  if (data.length === 0) {
    return (
      <div
        className={
          "rounded-[var(--radius-lg)] border border-border bg-surface py-14 text-center text-sm text-text-muted ring-1 ring-slate-900/[0.04] " +
          className
        }
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className={
        "overflow-x-auto overscroll-x-contain rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-card)] ring-1 ring-slate-900/[0.04] [-webkit-overflow-scrolling:touch] " +
        className
      }
    >
      <table className="w-full min-w-[600px] text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-alt/80">
            {columns.map((col) => (
              <th
                key={col.key}
                className={
                  "whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted first:pl-4 last:pr-4 sm:px-4 " +
                  (col.className ?? "")
                }
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((row) => (
            <tr
              key={keyExtractor(row)}
              className="transition-colors hover:bg-surface-alt/60"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={
                    "px-3 py-3 align-middle text-text first:pl-4 last:pr-4 sm:px-4 " +
                    (col.className ?? "")
                  }
                >
                  {col.render
                    ? col.render(row)
                    : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const Table = memo(TableComponent) as typeof TableComponent;
