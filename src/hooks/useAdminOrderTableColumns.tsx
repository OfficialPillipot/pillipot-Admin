import { useMemo, type RefObject } from "react";
import { Link } from "react-router";
import {
  ArrowDownTrayIcon,
  ArrowUturnLeftIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";
import type { Column } from "../components/ui/Table";
import { OrderStatusBadge } from "../components/orders/OrderStatusBadge";
import type { Order, Product, Staff } from "../types";
import { formatDate, orderLineProductLabel, uniformOrderGroupStatus } from "../lib/orderUtils";
import {
  discountDisplay,
  safeMoney,
} from "../components/orders/adminOrderManagementUtils";

export type UseAdminOrderTableColumnsParams = {
  selectAllHeaderRef: RefObject<HTMLInputElement | null>;
  staff: Staff[];
  products: Product[];
  pdfLoadingId: string | null;
  selectedIds: Set<string>;
  allVisibleSelected: boolean;
  toggleRowSelected: (id: string) => void;
  toggleAllVisibleSelected: () => void;
  downloadPdf: (
    internalId: string,
    displayOrderId: string,
    sizeOverride?: "thermal" | "a4",
  ) => void;
  onOpenDetail: (id: string) => void;
  /** Returns edit URL for the row, or null. Admin: pending/packed + `orders.update`. */
  getAdminOrderEditHref?: (
    row: Order & { items?: Order[] },
  ) => string | null;
  /** When the whole group is uniformly `packed`, move lines back to `pending` (clears tracking). */
  onRevokePacked?: (row: Order & { items?: Order[] }) => void | Promise<void>;
  revokePackedLoadingId?: string | null;
};

export function useAdminOrderTableColumns({
  selectAllHeaderRef,
  staff,
  products,
  pdfLoadingId,
  selectedIds,
  allVisibleSelected,
  toggleRowSelected,
  toggleAllVisibleSelected,
  downloadPdf,
  onOpenDetail,
  getAdminOrderEditHref,
  onRevokePacked,
  revokePackedLoadingId,
}: UseAdminOrderTableColumnsParams): Column<Order>[] {
  return useMemo(
    () => [
      {
        key: "__select",
        header: (
          <span className="inline-flex items-center justify-center">
            <input
              ref={selectAllHeaderRef}
              type="checkbox"
              checked={allVisibleSelected}
              onChange={() => toggleAllVisibleSelected()}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              aria-label="Select all orders in this table"
            />
          </span>
        ),
        className: "w-12",
        mobileHeaderStart: true,
        render: (row: Order) => (
          <input
            type="checkbox"
            checked={selectedIds.has(row.id)}
            onChange={() => toggleRowSelected(row.id)}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            aria-label={`Select order ${row.orderId}`}
          />
        ),
      },
      {
        key: "orderId",
        header: "Order ID",
        mobileCardTitle: true,
        className: "md:min-w-[9.5rem] md:whitespace-nowrap",
        render: (row: Order) => (
          <button
            type="button"
            onClick={() => onOpenDetail(row.id)}
            className="font-medium text-primary hover:underline"
          >
            {row.orderId}
          </button>
        ),
      },
      {
        key: "adminEdit",
        header: "Edit",
        className: "w-[7.5rem] md:whitespace-nowrap",
        mobileLabel: "Edit",
        mobileHeaderEnd: true,
        render: (row: Order & { items?: Order[] }) => {
          const href = getAdminOrderEditHref ? getAdminOrderEditHref(row) : null;
          if (!href) {
            return (
              <span
                className="text-text-muted text-xs"
                title="Requires orders.update. Edits allowed for Pending or Packed (uniform group status)."
              >
                —
              </span>
            );
          }
          return (
            <Link
              to={href}
              className="inline-flex items-center gap-1 rounded-md border border-primary/50 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
              title="Edit order"
              aria-label={`Edit order ${row.orderId}`}
              onClick={(e) => e.stopPropagation()}
            >
              <PencilIcon className="h-4 w-4 shrink-0" aria-hidden />
              Edit
            </Link>
          );
        },
      },
      {
        key: "createdAt",
        header: "Date",
        className: "whitespace-nowrap md:min-w-[8rem]",
        render: (row: Order) => formatDate(row.createdAt),
      },
      { 
        key: "customerName", 
        header: "Customer",
        className: "md:min-w-[12rem]"
      },
      {
        key: "productId",
        header: "Products",
        className: "md:min-w-[15rem]",
        render: (row: Order & { items?: Order[] }) => {
          const lines: Order[] =
            row.items?.length ? row.items : [];
          const names =
            lines.length > 0
              ? lines.map((i) => orderLineProductLabel(i, products))
              : [orderLineProductLabel(row as Order, products)];

          if (names.length === 1) return names[0];

          return (
            <div>
              <span className="text-xs font-bold text-primary">
                {names.length} items
              </span>
              <div className="text-[10px] text-text-muted mt-0.5 line-clamp-1 italic">
                {names.join(", ")}
              </div>
            </div>
          );
        },
      },
      {
        key: "discountAmount",
        header: "Discount",
        render: (row: Order) => discountDisplay(row.discountAmount) ?? "—",
      },
      {
        key: "staffAssignedNumber",
        header: "Assigned #",
        render: (row: Order) => {
          const n = row.staffAssignedNumber?.trim();
          return n ? (
            <span className="font-mono text-xs">{n}</span>
          ) : (
            "—"
          );
        },
      },
      {
        key: "sellingAmount",
        header: "Total",
        render: (row: Order & { grandTotal?: number }) => {
          const gt = row.grandTotal;
          const n = gt != null ? gt : safeMoney(row.sellingAmount);
          return `₹${n.toFixed(2)}`;
        },
      },
      {
        key: "platform",
        header: "Platform",
        render: (row: Order) => {
          const isWeb = row.platform === "WebApp" || row.platform === "webapp";
          return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              isWeb 
                ? "bg-violet-100 text-violet-700 border border-violet-200" 
                : "bg-blue-100 text-blue-700 border border-blue-200"
            }`}>
              {row.platform || "staff"}
            </span>
          );
        }
      },
      {
        key: "staffId",
        header: "Staff",
        className: "md:min-w-[12rem]",
        render: (row: Order) => {
          const staffName = row.staffId ? (staff.find((s) => s.id === row.staffId)?.name ?? row.staffId) : "—";
          return <span className="font-medium">{staffName}</span>;
        },
      },
      {
        key: "status",
        header: "Status",
        render: (row: Order & { items?: Order[] }) => {
          const lines =
            row.items && row.items.length > 0 ? row.items : [row];
          return (
            <OrderStatusBadge uniform={uniformOrderGroupStatus(lines)} />
          );
        },
      },
      {
        key: "scheduledFor",
        header: "Scheduled For",
        render: (row: Order & { items?: Order[] }) => {
          const lines = row.items && row.items.length > 0 ? row.items : [row];
          const sf = lines.find((i) => i.scheduledFor)?.scheduledFor;
          if (!sf) return <span className="text-text-muted">—</span>;
          return (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 rounded-full px-2.5 py-1 whitespace-nowrap">
              📅 {formatDate(sf)}
            </span>
          );
        },
      },
      {
        key: "trackingId",
        header: "Tracking ID",
        render: (row: Order) => {
          const t = row.trackingId?.trim();
          return t ? (
            <span className="font-mono text-xs">{t}</span>
          ) : (
            "—"
          );
        },
      },
      {
        key: "revoke",
        header: "Revoke",
        className: "w-[4.5rem]",
        render: (row: Order & { items?: Order[] }) => {
          const lines = row.items && row.items.length > 0 ? row.items : [row];
          const uniform = uniformOrderGroupStatus(lines);
          const showRevoke =
            Boolean(onRevokePacked) && uniform === "packed";
          if (!showRevoke) {
            return (
              <span className="text-text-muted" aria-hidden>
                —
              </span>
            );
          }
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void onRevokePacked?.(row);
              }}
              disabled={revokePackedLoadingId === row.id}
              className="inline-flex items-center justify-center rounded-[var(--radius-sm)] p-1.5 text-amber-700 hover:bg-amber-500/15 disabled:opacity-50"
              title="Revoke packed — return to pending (clears tracking)"
              aria-label={`Revoke packed status for ${row.orderId}`}
            >
              <ArrowUturnLeftIcon className="h-5 w-5" aria-hidden />
            </button>
          );
        },
      },
      {
        key: "pdf",
        header: "PDF",
        className: "w-[3.25rem]",
        render: (row: Order) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void downloadPdf(row.id, row.orderId);
            }}
            disabled={pdfLoadingId === row.id}
            className="inline-flex items-center justify-center rounded-[var(--radius-sm)] p-1.5 text-primary hover:bg-primary-muted disabled:opacity-50"
            title="Download PDF"
            aria-label={`Download PDF for ${row.orderId}`}
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
          </button>
        ),
      },
    ],
    [
      selectAllHeaderRef,
      staff,
      products,
      pdfLoadingId,
      selectedIds,
      allVisibleSelected,
      toggleRowSelected,
      toggleAllVisibleSelected,
      downloadPdf,
      onOpenDetail,
      getAdminOrderEditHref,
      onRevokePacked,
      revokePackedLoadingId,
    ],
  );
}
