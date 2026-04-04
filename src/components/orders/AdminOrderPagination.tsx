import { memo } from "react";
import { Button } from "../ui";
import { orderListPaginationSlots } from "./adminOrderManagementUtils";

export type AdminOrderPaginationProps = {
  visible: boolean;
  listTotal: number;
  listPage: number;
  totalPages: number;
  loading: boolean;
  onGoToPage: (page: number) => void;
};

function AdminOrderPaginationComponent({
  visible,
  listTotal,
  listPage,
  totalPages,
  loading,
  onGoToPage,
}: AdminOrderPaginationProps) {
  if (!visible) return null;

  const slots = orderListPaginationSlots(listPage, totalPages);

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <p className="text-center text-sm text-text-muted sm:text-left">
        {listTotal.toLocaleString()} customer order
        {listTotal === 1 ? "" : "s"} total (by order)
      </p>
      <nav
        className="flex flex-wrap items-center justify-center gap-1 sm:justify-end"
        aria-label="Orders list pages"
      >
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={listPage <= 1 || loading}
          onClick={() => onGoToPage(listPage - 1)}
        >
          Previous
        </Button>
        {slots.map((slot, i) =>
          slot === "ellipsis" ? (
            <span
              key={`ellipsis-${i}`}
              className="px-2 text-sm text-text-muted select-none"
              aria-hidden
            >
              …
            </span>
          ) : (
            <Button
              key={slot}
              type="button"
              variant={slot === listPage ? "primary" : "secondary"}
              size="sm"
              className="min-w-9 tabular-nums"
              disabled={loading}
              aria-label={`Page ${slot}`}
              aria-current={slot === listPage ? "page" : undefined}
              onClick={() => onGoToPage(slot)}
            >
              {slot}
            </Button>
          ),
        )}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={listPage >= totalPages || loading}
          onClick={() => onGoToPage(listPage + 1)}
        >
          Next
        </Button>
      </nav>
    </div>
  );
}

export const AdminOrderPagination = memo(AdminOrderPaginationComponent);
