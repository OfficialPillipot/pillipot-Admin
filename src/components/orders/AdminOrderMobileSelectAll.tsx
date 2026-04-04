import { memo } from "react";

type AdminOrderMobileSelectAllProps = {
  allVisibleSelected: boolean;
  onToggleAll: () => void;
};

function AdminOrderMobileSelectAllComponent({
  allVisibleSelected,
  onToggleAll,
}: AdminOrderMobileSelectAllProps) {
  return (
    <div className="mb-3 flex items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface-alt/50 px-3 py-2 md:hidden">
      <input
        type="checkbox"
        checked={allVisibleSelected}
        onChange={() => onToggleAll()}
        className="h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary"
        aria-label="Select all orders in this list"
      />
      <span className="text-xs text-text-muted">Select all visible</span>
    </div>
  );
}

export const AdminOrderMobileSelectAll = memo(AdminOrderMobileSelectAllComponent);
