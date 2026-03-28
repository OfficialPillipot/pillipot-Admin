/**
 * API path constants. For real backend, ensure these match your server routes.
 * Base URL is configured in client.ts (e.g. env VITE_API_BASE_URL).
 */
const V1 = "/v1/api";

export const endpoints = {
  authLogin: `${V1}/auth/login`,
  authForgotPassword: `${V1}/auth/forgot-password`,
  authMe: `${V1}/auth/me`,
  authChangePassword: `${V1}/auth/change-password`,
  products: `${V1}/products`,
  productById: (id: string) => `${V1}/products/${id}`,
  categories: `${V1}/categories`,
  categoryById: (id: string) => `${V1}/categories/${id}`,
  customers: `${V1}/customers`,
  customerLookupPhone: (phone: string) =>
    `${V1}/customers/lookup-phone?phone=${encodeURIComponent(phone)}`,
  orders: `${V1}/orders`,
  orderById: (id: string) => `${V1}/orders/${id}`,
  orderPdf: (id: string) => `${V1}/orders/${id}/pdf`,
  staff: `${V1}/staff`,
  staffMe: `${V1}/staff/me`,
  staffById: (id: string) => `${V1}/staff/${id}`,
  staffResetPassword: (id: string) => `${V1}/staff/${id}/reset-password`,
  staffRequestPasswordReset: `${V1}/staff/request-password-reset`,
  staffPasswordResetRequestFulfill: (requestId: string) =>
    `${V1}/staff/password-reset-requests/${requestId}/reset`,
} as const;
