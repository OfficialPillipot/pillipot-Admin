import type { Order, OrderStatus } from "../../types";

/** Select value for "lines with no delivery method" in admin order filters. */
export const ADMIN_DELIVERY_FILTER_NONE = "__none__";

export function safeMoney(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

export function discountDisplay(v: unknown): string | null {
  const n = safeMoney(v);
  return n > 0 ? `₹${n.toFixed(2)}` : null;
}

export function orderListPaginationSlots(
  currentPage: number,
  totalPages: number,
): (number | "ellipsis")[] {
  if (totalPages <= 1) return [];
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);
  for (const d of [-1, 0, 1]) {
    const p = currentPage + d;
    if (p >= 1 && p <= totalPages) pages.add(p);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | "ellipsis")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev > 0 && p - prev > 1) out.push("ellipsis");
    out.push(p);
    prev = p;
  }
  return out;
}

export function orderLineIds(detail: { id: string; items?: Order[] }): string[] {
  const items = detail.items;
  if (Array.isArray(items) && items.length > 0) {
    return items.map((i) => i.id);
  }
  return [detail.id];
}

export function rowUniformStatus(
  row: Order & { items?: Order[] },
): OrderStatus | "mixed" {
  const items = row.items;
  if (items && items.length > 0) {
    const s0 = items[0].status;
    return items.every((i) => i.status === s0) ? s0 : "mixed";
  }
  return row.status;
}

/**
 * Bulk toolbar: no action while pending (use order detail to mark packed).
 * Packed → dispatch; dispatch → delivered.
 */
export function nextBulkStep(
  current: OrderStatus,
): { next: OrderStatus; label: string } | null {
  switch (current) {
    case "scheduled":
    case "pending":
      return null;
    case "packed":
      return { next: "dispatch", label: "Mark as dispatch" };
    case "dispatch":
      return { next: "delivered", label: "Mark delivered" };
    default:
      return null;
  }
}

export type GroupedAdminOrder = Order & {
  items: Order[];
  grandTotal: number;
  deliveryFeesTotal: number;
};

export function groupOrdersForAdminList(
  listLines: Order[],
  filters: {
    productId: string;
    staffId: string;
    status: string;
    orderType: string;
    deliveryMethodId: string;
    platform: string;
  },
): GroupedAdminOrder[] {
  let list = [...listLines].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  if (filters.productId) {
    list = list.filter((o) => o.productId === filters.productId);
  }
  if (filters.staffId) {
    list = list.filter((o) => o.staffId === filters.staffId);
  }
  if (filters.status) {
    list = list.filter((o) => o.status === filters.status);
  }
  if (filters.orderType) {
    list = list.filter((o) => o.orderType === filters.orderType);
  }
  if (filters.platform) {
    list = list.filter((o) => o.platform === filters.platform);
  }
  if (filters.deliveryMethodId) {
    if (filters.deliveryMethodId === ADMIN_DELIVERY_FILTER_NONE) {
      list = list.filter((o) => !o.deliveryMethodId);
    } else {
      list = list.filter(
        (o) => o.deliveryMethodId === filters.deliveryMethodId,
      );
    }
  }

  const groups = new Map<string, Order[]>();
  for (const o of list) {
    if (!groups.has(o.orderId)) groups.set(o.orderId, []);
    groups.get(o.orderId)!.push(o);
  }

  return Array.from(groups.values()).map((items) => {
    const o = items[0];
    const totalSelling = items.reduce(
      (sum, item) => sum + safeMoney(item.sellingAmount),
      0,
    );
    const totalDiscount = items.reduce(
      (sum, item) =>
        sum + (item.discountAmount ? safeMoney(item.discountAmount) : 0),
      0,
    );
    const deliveryFeesTotal = items.reduce(
      (sum, item) => sum + safeMoney(item.deliveryFee),
      0,
    );

    return {
      ...o,
      sellingAmount: totalSelling,
      discountAmount: totalDiscount > 0 ? totalDiscount : null,
      grandTotal: totalSelling + deliveryFeesTotal,
      deliveryFeesTotal,
      items,
    };
  });
}
