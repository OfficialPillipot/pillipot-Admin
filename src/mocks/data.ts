/**
 * Mutable copy of mock data for MSW. Deep clone so handlers can mutate.
 */
import type { Order, Product, Staff } from "../types";
import { MOCK_ORDERS, MOCK_PRODUCTS, MOCK_STAFF } from "../data/mockData";

export const mockProducts: Product[] = JSON.parse(JSON.stringify(MOCK_PRODUCTS));
export const mockOrders: Order[] = JSON.parse(JSON.stringify(MOCK_ORDERS));
export const mockStaff: Staff[] = JSON.parse(JSON.stringify(MOCK_STAFF));

export function generateOrderId(orders: Order[]): string {
  const max = orders.reduce((acc, o) => {
    const num = parseInt(o.orderId.replace(/\D/g, ""), 10);
    return isNaN(num) ? acc : Math.max(acc, num);
  }, 1000);
  return `ORD-${max + 1}`;
}
