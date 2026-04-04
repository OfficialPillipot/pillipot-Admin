import { api } from "../api/client";
import { endpoints } from "../api/endpoints";
import type { Order } from "../types";

export type AdminOrdersQuery = {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  orderId?: string;
};

const DEFAULT_PAGE_SIZE = 15;

/**
 * GET /orders with optional pagination. Omit `page` to fetch the full list (used when table filters are on).
 * Server also returns the full list when date or orderId filters apply.
 */
export async function fetchOrdersList(
  q: AdminOrdersQuery,
): Promise<{ items: Order[]; total: number }> {
  const params = new URLSearchParams();
  if (q.dateFrom) params.set("dateFrom", q.dateFrom);
  if (q.dateTo) params.set("dateTo", q.dateTo);
  const oid = q.orderId?.trim();
  if (oid) params.set("orderId", oid);

  const narrowed = !!(q.dateFrom || q.dateTo || oid);
  if (!narrowed && q.page != null) {
    params.set("page", String(q.page));
    params.set("limit", String(q.limit ?? DEFAULT_PAGE_SIZE));
  }

  const qs = params.toString();
  const path = qs ? `${endpoints.orders}?${qs}` : endpoints.orders;
  return api.get<{ items: Order[]; total: number }>(path);
}

export const ADMIN_ORDERS_PAGE_SIZE = DEFAULT_PAGE_SIZE;
