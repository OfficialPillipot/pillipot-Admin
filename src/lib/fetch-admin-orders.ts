import type { Order } from "../types";
import { store } from "../store";
import { edenApi } from "../store/api/edenApi";
import type { OrderListFilters } from "../store/api/edenApi";

export type AdminOrdersQuery = {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  orderId?: string;
  /** API `search`: order id, name, phone, or pincode. */
  search?: string;
  isVendorOrder?: boolean;
  onlineOrderMode?: 'main' | 'pending_failed';
};

const DEFAULT_PAGE_SIZE = 15;

function toOrderListFilters(q: AdminOrdersQuery): OrderListFilters {
  const oid = q.orderId?.trim();
  const search = q.search?.trim();
  const narrowed = !!(q.dateFrom || q.dateTo || oid || search);
  const filters: OrderListFilters = {
    dateFrom: q.dateFrom,
    dateTo: q.dateTo,
    orderId: q.orderId,
    search: q.search,
    isVendorOrder: q.isVendorOrder,
    onlineOrderMode: q.onlineOrderMode,
  };
  if (!narrowed && q.page != null) {
    filters.page = q.page;
    filters.limit = q.limit ?? DEFAULT_PAGE_SIZE;
  }
  return filters;
}

/**
 * GET /orders with optional pagination. Omit `page` to fetch the full list (used when table filters are on).
 * Server also returns the full list when date or orderId filters apply.
 */
export async function fetchOrdersList(
  q: AdminOrdersQuery,
): Promise<{ items: Order[]; total: number }> {
  const filters = toOrderListFilters(q);
  const [ordersResult, vendorResult] = await Promise.all([
    store
      .dispatch(
        edenApi.endpoints.getOrders.initiate(filters, {
          subscribe: false,
          forceRefetch: true,
        }),
      )
      .unwrap()
      .catch(() => ({ items: [], total: 0 })),
    store
      .dispatch(
        edenApi.endpoints.getAdminVendorOrders.initiate(undefined, {
          subscribe: false,
          forceRefetch: true,
        }),
      )
      .unwrap()
      .catch(() => ({ items: [], total: 0 })),
  ]);

  let vendorItems = (vendorResult?.items ?? []) as Order[];
  const regularItems = (ordersResult?.items ?? []) as Order[];

  // Apply server-level narrowing filters to vendor items
  if (q.dateFrom) {
    const from = new Date(`${q.dateFrom}T00:00:00.000Z`);
    vendorItems = vendorItems.filter((o) => new Date(o.createdAt) >= from);
  }
  if (q.dateTo) {
    const to = new Date(`${q.dateTo}T23:59:59.999Z`);
    vendorItems = vendorItems.filter((o) => new Date(o.createdAt) <= to);
  }
  if (q.orderId?.trim()) {
    const oid = q.orderId.trim().toLowerCase();
    vendorItems = vendorItems.filter((o) => o.orderId?.toLowerCase().includes(oid));
  }
  if (q.search?.trim()) {
    const s = q.search.trim().toLowerCase();
    vendorItems = vendorItems.filter(
      (o) =>
        o.orderId?.toLowerCase().includes(s) ||
        o.customerName?.toLowerCase().includes(s) ||
        o.phone?.includes(s) ||
        o.pincode?.includes(s),
    );
  }

  // Deduplicate by order line id
  const map = new Map<string, Order>();
  for (const item of regularItems) {
    map.set(item.id, item);
  }
  for (const item of vendorItems) {
    map.set(item.id, item);
  }

  const allItems = Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return { items: allItems, total: allItems.length };
}

export const ADMIN_ORDERS_PAGE_SIZE = DEFAULT_PAGE_SIZE;
