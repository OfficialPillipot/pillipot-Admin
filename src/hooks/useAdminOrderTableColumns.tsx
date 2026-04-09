import { useMemo, type RefObject } from "react";
import { Link } from "react-router";
import { ArrowDownTrayIcon, PencilIcon } from "@heroicons/react/24/outline";
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
  /**
   * When set, show an Edit link for eligible single-line orders (pending / scheduled / packed).
   * Column is still rendered when omitted (cells show —).
   */
  getAdminOrderEditHref?: (
    row: Order & { items?: Order[] },
  ) => string | null;
  /** When false, omit the Edit column entirely (default: true). */
  showAdminEditColumn?: boolean;
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
  showAdminEditColumn = true,
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
      ...(showAdminEditColumn
        ? [
            {
              key: "edit",
              header: "Edit",
              className: "w-14",
              mobileHeaderEnd: true,
              mobileLabel: "Edit",
              render: (row: Order & { items?: Order[] }) => {
                const href = getAdminOrderEditHref?.(row);
                if (!href) {
                  return (
                    <span className="text-text-muted" title="Not editable">
                      —
                    </span>
                  );
                }
                return (
                  <Link
                    to={href}
                    className="inline-flex items-center justify-center rounded-[var(--radius-sm)] p-1.5 text-primary hover:bg-primary-muted"
                    title="Edit order"
                    aria-label={`Edit order ${row.orderId}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <PencilIcon className="h-5 w-5" aria-hidden />
                  </Link>
                );
              },
            } as Column<Order>,
          ]
        : []),
      {
        key: "createdAt",
        header: "Date",
        render: (row: Order) => formatDate(row.createdAt),
      },
      { key: "customerName", header: "Customer" },
      {
        key: "productId",
        header: "Products",
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
        key: "staffId",
        header: "Staff",
        render: (row: Order) =>
          staff.find((s) => s.id === row.staffId)?.name ?? row.staffId,
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
        key: "pdf",
        header: "PDF",
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
      showAdminEditColumn,
    ],
  );
}
