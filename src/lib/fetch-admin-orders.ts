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
  return store
    .dispatch(
      edenApi.endpoints.getOrders.initiate(filters, {
        subscribe: false,
        forceRefetch: true,
      }),
    )
    .unwrap();
}

export const ADMIN_ORDERS_PAGE_SIZE = DEFAULT_PAGE_SIZE;
