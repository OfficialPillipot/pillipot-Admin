import { memo, type ReactNode } from "react";

/** Native `<select>` / `<input type="date">` — full width, consistent height with `Select` / `Input`. */
export const MANAGEMENT_NATIVE_CONTROL_CLASS =
  "w-full min-h-[2.5rem] rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm text-text-heading shadow-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary";

const panelClass =
  "rounded-[var(--radius-xl)] border border-border bg-surface-alt/40 p-4 dark:bg-surface-alt/20 md:p-5";

const gridClass =
  "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 [&>*]:min-w-0";

interface ManagementFilterPanelProps {
  children: ReactNode;
  className?: string;
}

/** Bordered filter region with a responsive grid for aligned labels and controls. */
export const ManagementFilterPanel = memo(function ManagementFilterPanel({
  children,
  className = "",
}: ManagementFilterPanelProps) {
  return (
    <div className={`${panelClass} ${className}`.trim()}>
      <div className={gridClass}>{children}</div>
    </div>
  );
});

interface ManagementFilterFieldProps {
  label: string;
  children: ReactNode;
  /** e.g. `lg:col-span-full` for full-width preset buttons */
  className?: string;
}

/** One labeled filter cell; keep control height aligned across the row. */
export const ManagementFilterField = memo(function ManagementFilterField({
  label,
  children,
  className = "",
}: ManagementFilterFieldProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`.trim()}>
      <span className="text-xs font-medium leading-tight text-text-muted">{label}</span>
      <div className="flex min-h-[2.5rem] min-w-0 w-full flex-wrap items-center gap-2 [&_input]:w-full [&_select]:w-full [&_.w-full]:min-w-0">
        {children}
      </div>
    </div>
  );
});
