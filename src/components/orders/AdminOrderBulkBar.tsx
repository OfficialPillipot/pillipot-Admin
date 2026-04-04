import { memo } from "react";
import { Button } from "../ui";
import type { OrderStatus } from "../../types";

export type AdminBulkAdvanceAction =
  | null
  | { kind: "blocked"; message: string }
  | {
      kind: "action";
      current: OrderStatus;
      next: OrderStatus;
      label: string;
      hint?: string;
    };

export type AdminOrderBulkBarProps = {
  selectedCount: number;
  bulkAdvanceAction: AdminBulkAdvanceAction;
  bulkStatusLoading: boolean;
  bulkPdfLoading: boolean;
  onBulkAdvance: (next: OrderStatus) => void;
  onDownloadSelectedPdf: () => void;
  onClearSelection: () => void;
};

function AdminOrderBulkBarComponent({
  selectedCount,
  bulkAdvanceAction,
  bulkStatusLoading,
  bulkPdfLoading,
  onBulkAdvance,
  onDownloadSelectedPdf,
  onClearSelection,
}: AdminOrderBulkBarProps) {
  if (selectedCount <= 0) return null;

  return (
    <div className="mb-2 flex flex-col gap-2 rounded-[var(--radius-md)] border border-border bg-surface-alt/50 p-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
      <span className="text-sm font-medium text-text-heading">
        {selectedCount} order{selectedCount === 1 ? "" : "s"} selected
      </span>
      {bulkAdvanceAction?.kind === "blocked" && (
        <p className="max-w-xl text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-[var(--radius-sm)] px-2 py-1.5">
          {bulkAdvanceAction.message}
        </p>
      )}
      {bulkAdvanceAction?.kind === "action" && (
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
          <Button
            type="button"
            size="sm"
            loading={bulkStatusLoading}
            onClick={() => onBulkAdvance(bulkAdvanceAction.next)}
          >
            {bulkAdvanceAction.label}
          </Button>
          <span className="text-xs text-text-muted capitalize">
            All selected: {bulkAdvanceAction.current}
          </span>
          {bulkAdvanceAction.hint ? (
            <span className="text-[11px] text-text-muted max-w-md">
              {bulkAdvanceAction.hint}
            </span>
          ) : null}
        </div>
      )}
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => void onDownloadSelectedPdf()}
        loading={bulkPdfLoading}
        className="sm:ml-auto"
      >
        Download selected PDF
      </Button>
      <button
        type="button"
        className="text-sm font-medium text-primary underline hover:no-underline"
        onClick={onClearSelection}
      >
        Clear selection
      </button>
    </div>
  );
}

export const AdminOrderBulkBar = memo(AdminOrderBulkBarComponent);
