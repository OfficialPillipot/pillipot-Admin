/**
 * Shared logic for staff “Orders” and “Recent orders”: filter lines, group by display order id, sort.
 */

import type { SelectOption } from "../components/ui/Select";
import type { Order, OrderStatus, Product } from "../types";
import { orderLineProductLabel, uniformOrderGroupStatus } from "./orderUtils";

export const ORDER_STATUS_FILTER_OPTIONS: SelectOption[] = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "packed", label: "Packed" },
  { value: "dispatch", label: "Dispatch" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "returned", label: "Returned" },
];

export type OrdersListGroupedRow = Order & {
  _lineCount: number;
  _products: string[];
  _uniformStatus: OrderStatus | "mixed";
};

type LineFilterInput = {
  staffId: string | null | undefined;
  productId: string;
  orderType: string;
  status: string;
  fromDate: string;
  toDate: string;
};

/** Narrow the flat order line list before grouping (same rules as the Orders page). */
export function filterOrderLinesForList(
  orders: Order[],
  f: LineFilterInput,
): Order[] {
  let list = f.staffId
    ? orders.filter((o) => o.staffId === f.staffId)
    : [...orders];

  if (f.productId) {
    list = list.filter((o) => o.productId === f.productId);
  }
  if (f.orderType) {
    list = list.filter((o) => o.orderType === f.orderType);
  }
  if (f.status) {
    list = list.filter((o) => o.status === (f.status as OrderStatus));
  }
  if (f.fromDate) {
    list = list.filter((o) => o.createdAt >= f.fromDate);
  }
  if (f.toDate) {
    list = list.filter((o) => o.createdAt <= `${f.toDate}T23:59:59.999Z`);
  }
  return list;
}

function bucketLinesByDisplayId(lines: Order[]): Map<string, Order[]> {
  const map = new Map<string, Order[]>();
  for (const line of lines) {
    const bucket = map.get(line.orderId);
    if (bucket) bucket.push(line);
    else map.set(line.orderId, [line]);
  }
  return map;
}

function sortByRepresentativeNewestFirst<T extends { createdAt: string }>(
  rows: T[],
): T[] {
  return [...rows].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/** One table row per display order (multi-line orders aggregated). */
export function buildGroupedOrderRows(
  lines: Order[],
  products: Pick<Product, "id" | "name">[],
): OrdersListGroupedRow[] {
  const bucket = bucketLinesByDisplayId(lines);
  const rows: OrdersListGroupedRow[] = [];

  for (const items of bucket.values()) {
    const head = items[0];
    const totalSelling = items.reduce((s, i) => s + Number(i.sellingAmount), 0);
    const totalDelivery = items.reduce(
      (s, i) => s + (i.deliveryFee ? Number(i.deliveryFee) : 0),
      0,
    );
    const totalDiscount = items.reduce(
      (s, i) => s + (i.discountAmount ? Number(i.discountAmount) : 0),
      0,
    );

    rows.push({
      ...head,
      id: head.id,
      sellingAmount: totalSelling + totalDelivery,
      discountAmount: totalDiscount,
      _lineCount: items.length,
      _products: items.map((i) => orderLineProductLabel(i, products)),
      _uniformStatus: uniformOrderGroupStatus(items),
    });
  }

  return sortByRepresentativeNewestFirst(rows);
}

/** Recent page: newest display orders first, then take the first `limit` groups. */
export function takeRecentOrderGroups(
  lines: Order[],
  limit: number,
): Order[][] {
  const bucket = bucketLinesByDisplayId(lines);
  const groups = Array.from(bucket.values());
  const newestFirst = [...groups].sort((a, b) => {
    const newestMs = (items: Order[]) =>
      Math.max(...items.map((x) => new Date(x.createdAt).getTime()));
    return newestMs(b) - newestMs(a);
  });
  return newestFirst.slice(0, limit);
}
