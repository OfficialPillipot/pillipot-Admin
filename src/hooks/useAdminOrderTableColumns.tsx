import { useMemo, type RefObject } from "react";
import {
  ArrowDownTrayIcon,
  ArrowUturnLeftIcon,
} from "@heroicons/react/24/outline";
import type { Column } from "../components/ui/Table";
import { OrderStatusBadge } from "../components/orders/OrderStatusBadge";
import type { Order, Product, Staff, Vendor } from "../types";
import { formatDate, orderLineProductLabel, uniformOrderGroupStatus } from "../lib/orderUtils";
import {
  safeMoney,
} from "../components/orders/adminOrderManagementUtils";

function getOrderShopName(order: Order, products: Product[], vendors?: Vendor[]): string {
  if (order.shopName?.trim()) return order.shopName.trim();
  const prod = products.find((p) => p.id === order.productId);
  if (prod?.vendorId && vendors) {
    const v = vendors.find((vend) => vend.id === prod.vendorId);
    if (v?.businessName?.trim()) return v.businessName.trim();
  }
  return "—";
}

function getOrderVendorName(order: Order, products: Product[], vendors?: Vendor[]): string {
  if (order.vendorName?.trim()) return order.vendorName.trim();
  const prod = products.find((p) => p.id === order.productId);
  if (prod?.vendorId && vendors) {
    const v = vendors.find((vend) => vend.id === prod.vendorId);
    if (v?.ownerName?.trim()) return v.ownerName.trim();
  }
  return "—";
}

export type UseAdminOrderTableColumnsParams = {
  selectAllHeaderRef: RefObject<HTMLInputElement | null>;
  staff: Staff[];
  products: Product[];
  vendors?: Vendor[];
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
  staff: _staff,
  products,
  vendors,
  pdfLoadingId,
  selectedIds,
  allVisibleSelected,
  toggleRowSelected,
  toggleAllVisibleSelected,
  downloadPdf,
  onOpenDetail,
  getAdminOrderEditHref: _getAdminOrderEditHref,
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
        key: "shopName",
        header: "Shop Name",
        className: "md:min-w-[11rem]",
        render: (row: Order & { items?: Order[] }) => {
          const lines = row.items && row.items.length > 0 ? row.items : [row];
          const shops = [
            ...new Set(
              lines
                .map((i) => getOrderShopName(i, products, vendors))
                .filter((s) => s && s !== "—"),
            ),
          ];
          if (shops.length === 0) return <span className="text-text-muted">—</span>;
          if (shops.length === 1) {
            return (
              <span className="font-semibold text-text-heading">
                {shops[0]}
              </span>
            );
          }
          return (
            <div>
              <span className="font-semibold text-text-heading">
                {shops[0]}
              </span>
              <span className="ml-1 text-xs text-text-muted">
                +{shops.length - 1} more
              </span>
            </div>
          );
        },
      },
      {
        key: "vendorName",
        header: "Vendor Name",
        className: "md:min-w-[11rem]",
        render: (row: Order & { items?: Order[] }) => {
          const lines = row.items && row.items.length > 0 ? row.items : [row];
          const names = [
            ...new Set(
              lines
                .map((i) => getOrderVendorName(i, products, vendors))
                .filter((s) => s && s !== "—"),
            ),
          ];
          if (names.length === 0) return <span className="text-text-muted">—</span>;
          if (names.length === 1) {
            return <span className="font-medium text-text-heading">{names[0]}</span>;
          }
          return (
            <div>
              <span className="font-medium text-text-heading">{names[0]}</span>
              <span className="ml-1 text-xs text-text-muted">
                +{names.length - 1} more
              </span>
            </div>
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
        key: "paymentMethod",
        header: "Payment",
        className: "md:min-w-[6rem]",
        render: (row: Order) => {
          const method = row.paymentMethod ?? "cod";
          const isOnline = method === "razorpay";
          return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider w-fit ${
              isOnline
                ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
                : "bg-amber-100 text-amber-700 border border-amber-200"
            }`}>
              {isOnline ? "Online" : "COD"}
            </span>
          );
        },
      },
      {
        key: "paymentStatus",
        header: "Payment Status",
        className: "md:min-w-[8rem]",
        render: (row: Order) => {
          const status = row.paymentStatus ?? "pending";
          const isPaid = status === "paid";
          const isFailed = status === "failed";
          return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider w-fit ${
              isPaid ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
              : isFailed ? "bg-red-100 text-red-700 border border-red-200"
              : "bg-slate-100 text-slate-500 border border-slate-200"
            }`}>
              {isPaid ? "✓ Paid" : isFailed ? "✗ Failed" : "Pending"}
            </span>
          );
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
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5 whitespace-nowrap">
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
      _staff,
      products,
      vendors,
      pdfLoadingId,
      selectedIds,
      allVisibleSelected,
      toggleRowSelected,
      toggleAllVisibleSelected,
      downloadPdf,
      onOpenDetail,
      _getAdminOrderEditHref,
      onRevokePacked,
      revokePackedLoadingId,
    ],
  );
}
