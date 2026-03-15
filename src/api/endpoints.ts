/**
 * API path constants. For real backend, ensure these match your server routes.
 * Base URL is configured in client.ts (e.g. env VITE_API_BASE_URL).
 */
const V1 = "/v1/api";

export const endpoints = {
  products: `${V1}/products`,
  productById: (id: string) => `${V1}/products/${id}`,
  orders: `${V1}/orders`,
  orderById: (id: string) => `${V1}/orders/${id}`,
  staff: `${V1}/staff`,
  staffById: (id: string) => `${V1}/staff/${id}`,
} as const;
