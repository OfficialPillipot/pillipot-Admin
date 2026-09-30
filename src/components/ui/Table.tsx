import { memo, type ReactNode, useRef, useState, useLayoutEffect, useEffect } from "react";
import { cn } from "../../lib/utils";

export interface Column<T> {
  key: string;
  header: ReactNode;
  render?: (row: T) => React.ReactNode;
  className?: string;
  /** Shorter label in mobile key–value rows (defaults to string `header`, else `key`). */
  mobileLabel?: ReactNode;
  /** This column is the bold title in the mobile card header (only one should use this). */
  mobileCardTitle?: boolean;
  /** Checkbox / bulk controls: shown at the start of the mobile card header. */
  mobileHeaderStart?: boolean;
  /** Actions (icons, buttons): shown at the end of the mobile card header. */
  mobileHeaderEnd?: boolean;
  /** Omit from the mobile card entirely. */
  mobileHide?: boolean;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
  className?: string;
  /** When false, only the horizontal table is shown (all breakpoints). */
  mobileCards?: boolean;
  isLoading?: boolean;
  /**
   * If true (or number of items, defaults to 10), sets the maximum height of the container
   * to match the exact size of 10 items, making the content scrollable for 20, 50, etc. items.
   * There is no minimum height constraint.
   * Defaults to true (10 items).
   */
  maxHeightForItems?: number | boolean;
  fixedHeightForItems?: number | boolean;
}

function cellContent<T>(row: T, col: Column<T>): ReactNode {
  return col.render
    ? col.render(row)
    : ((row as Record<string, unknown>)[col.key] as ReactNode);
}

function isHeaderEndColumn<T>(col: Column<T>): boolean {
  return Boolean(
    col.mobileHeaderEnd ||
      col.key === "actions" ||
      col.key === "pdf",
  );
}

function isHeaderStartColumn<T>(col: Column<T>): boolean {
  return Boolean(col.mobileHeaderStart);
}

function columnLabel<T>(col: Column<T>): ReactNode {
  if (col.mobileLabel !== undefined) return col.mobileLabel;
  if (typeof col.header === "string" && col.header.trim()) return col.header;
  return col.key;
}

function pickTitleColumn<T>(columns: Column<T>[]): Column<T> {
  const titled = columns.find((c) => c.mobileCardTitle && !c.mobileHide);
  if (titled) return titled;
  const fallback = columns.find(
    (c) =>
      !c.mobileHide &&
      !isHeaderStartColumn(c) &&
      !isHeaderEndColumn(c),
  );
  return fallback ?? columns[0];
}

function TableComponent<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "No data",
  className = "",
  mobileCards = true,
  isLoading = false,
  maxHeightForItems = true,
  fixedHeightForItems,
}: TableProps<T>) {
  const heightSetting = fixedHeightForItems !== undefined ? fixedHeightForItems : maxHeightForItems;
  const targetItemCount =
    typeof heightSetting === "number"
      ? heightSetting
      : heightSetting === false
      ? null
      : 10;

  const containerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const [containerMaxHeight, setContainerMaxHeight] = useState<number | null>(null);
  const measuredHeightRef = useRef<number | null>(null);

  const measure10ItemsHeight = () => {
    if (!targetItemCount || !tableRef.current || !containerRef.current) return;
    const table = tableRef.current;
    const thead = table.querySelector("thead");
    const tbody = table.querySelector("tbody");
    if (!thead || !tbody) return;

    const rows = tbody.querySelectorAll("tr");
    if (rows.length === 0) return;

    const tableTop = table.getBoundingClientRect().top;
    let computedHeight = 0;

    if (rows.length >= targetItemCount) {
      const targetRow = rows[targetItemCount - 1];
      computedHeight = targetRow.getBoundingClientRect().bottom - tableTop;
    } else {
      const firstRowTop = rows[0].getBoundingClientRect().top;
      const lastRowBottom = rows[rows.length - 1].getBoundingClientRect().bottom;
      const totalRowsHeight = lastRowBottom - firstRowTop;
      const avgRow = totalRowsHeight / rows.length;
      const theadHeight = thead.getBoundingClientRect().height;
      computedHeight = theadHeight + avgRow * targetItemCount;
    }

    const borderAdjustment = 2; // container border top + bottom
    const isHorizontallyScrollable = table.scrollWidth > containerRef.current.clientWidth;
    const scrollbarAdjustment = isHorizontallyScrollable
      ? Math.max(0, containerRef.current.offsetHeight - containerRef.current.clientHeight)
      : 0;

    const finalHeight = Math.ceil(computedHeight + borderAdjustment + scrollbarAdjustment);

    if (finalHeight > 0 && Math.abs((measuredHeightRef.current ?? 0) - finalHeight) > 2) {
      measuredHeightRef.current = finalHeight;
      setContainerMaxHeight(finalHeight);
    }
  };

  useLayoutEffect(() => {
    measure10ItemsHeight();
  }, [data, columns, targetItemCount]);

  useEffect(() => {
    if (!targetItemCount || !tableRef.current) return;
    let timeoutId: number;

    const ro = new ResizeObserver(() => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        measure10ItemsHeight();
      }, 50);
    });

    ro.observe(tableRef.current);
    return () => {
      window.clearTimeout(timeoutId);
      ro.disconnect();
    };
  }, [targetItemCount]);

  if (isLoading) {
    return (
      <div 
        style={containerMaxHeight ? { maxHeight: `${containerMaxHeight}px` } : undefined}
        className={cn(
          "rounded-[var(--radius-lg)] border border-border bg-surface py-12 flex flex-col items-center justify-center gap-3 md:rounded-[var(--radius-xl)] md:py-16 shadow-[var(--shadow-card)]",
          className
        )}
      >
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-text-muted animate-pulse">Loading data...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        className={cn(
          "rounded-[var(--radius-lg)] border border-border bg-surface py-12 text-center text-sm text-text-muted shadow-[var(--shadow-card)] md:rounded-[var(--radius-xl)] md:py-16 md:text-base",
          className
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  const titleColumn = pickTitleColumn(columns);
  const headerStartColumns = columns.filter(
    (c) => !c.mobileHide && isHeaderStartColumn(c),
  );
  const headerEndColumns = columns.filter(
    (c) => !c.mobileHide && isHeaderEndColumn(c),
  );
  const bodyColumns = columns.filter((c) => {
    if (c.mobileHide) return false;
    if (isHeaderStartColumn(c)) return false;
    if (isHeaderEndColumn(c)) return false;
    if (c.key === titleColumn.key) return false;
    return true;
  });

  const desktopTable = (
    <div
      ref={containerRef}
      style={containerMaxHeight ? { maxHeight: `${containerMaxHeight}px` } : undefined}
      className={cn(
        "overflow-auto overscroll-auto rounded-[var(--radius-lg)] border border-border bg-surface [-webkit-overflow-scrolling:touch] md:rounded-[var(--radius-xl)] shadow-[var(--shadow-card)]",
        mobileCards ? "hidden md:block" : "block"
      )}
    >
      <table ref={tableRef} className="w-full min-w-[600px] text-left text-sm border-separate border-spacing-0">
        <thead>
          <tr className="bg-[var(--color-table-header-bg)]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "sticky top-0 z-10 whitespace-nowrap px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.08em] text-text-muted first:pl-5 last:pr-5 md:px-5 md:py-4 bg-[var(--color-table-header-bg)] border-b border-border shadow-[0_1px_0_0_var(--color-border)]",
                  col.className
                )}
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
              className="transition-colors duration-150 hover:bg-[var(--color-table-row-hover)]"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "border-b border-border px-4 py-3.5 align-top text-sm text-text first:pl-5 last:pr-5 md:px-5 md:py-4",
                    col.className
                  )}
                >
                  {cellContent(row, col)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (!mobileCards) {
    return <div className={className}>{desktopTable}</div>;
  }

  return (
    <div className={className}>
      <div 
        style={containerMaxHeight ? { maxHeight: `${containerMaxHeight}px` } : undefined}
        className="md:hidden space-y-3 pb-1 overflow-y-auto overscroll-auto pr-0.5"
      >
        {data.map((row) => (
          <article
            key={keyExtractor(row)}
            className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-card)] [touch-action:manipulation]"
          >
            <div className="flex items-center gap-1.5 border-b border-border bg-[var(--color-table-header-bg)] px-4 py-3 sm:gap-2 sm:px-5 sm:py-3.5">
              {headerStartColumns.length > 0 ? (
                <div className="flex shrink-0 items-center gap-1">
                  {headerStartColumns.map((col) => (
                    <div key={col.key} className="flex items-center">
                      {cellContent(row, col)}
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="min-w-0 flex-1 text-sm font-semibold leading-snug text-text-heading sm:text-base">
                {cellContent(row, titleColumn)}
              </div>
              {headerEndColumns.length > 0 ? (
                <div className="flex shrink-0 items-center gap-0.5">
                  {headerEndColumns.map((col) => (
                    <div
                      key={col.key}
                      className="flex items-center [&_button]:min-h-[40px] [&_button]:min-w-[40px] [&_button]:items-center [&_button]:justify-center"
                    >
                      {cellContent(row, col)}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <dl className="divide-y divide-border">
              {bodyColumns.map((col) => (
                <div
                  key={col.key}
                  className="flex gap-2 px-4 py-2.5 text-xs leading-snug sm:gap-3 sm:px-5 sm:py-3 sm:text-sm"
                >
                  <dt className="w-[40%] shrink-0 text-xs font-medium tracking-tight text-text-muted sm:w-[38%]">
                    {columnLabel(col)}
                  </dt>
                  <dd className="min-w-0 flex-1 text-right text-xs font-medium text-text-heading [word-break:break-word] sm:text-sm">
                    {cellContent(row, col)}
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
      {desktopTable}
    </div>
  );
}

export const Table = memo(TableComponent) as typeof TableComponent;
