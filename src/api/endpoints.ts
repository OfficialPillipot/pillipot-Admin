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
  orderNextDisplayId: `${V1}/orders/next-display-id`,
  orderById: (id: string) => `${V1}/orders/${id}`,
  orderPdf: (id: string) => `${V1}/orders/${id}/pdf`,
  ordersPdfBulk: `${V1}/orders/pdf/bulk`,
  senders: `${V1}/senders`,
  senderById: (id: string) => `${V1}/senders/${id}`,
  senderSetDefault: (id: string) => `${V1}/senders/${id}/default`,
  settings: `${V1}/settings`,
  staff: `${V1}/staff`,
  staffEarnings: `${V1}/staff/earnings`,
  staffEarningsById: (id: string) => `${V1}/staff/${id}/earnings`,
  staffMe: `${V1}/staff/me`,
  staffById: (id: string) => `${V1}/staff/${id}`,
  staffResetPassword: (id: string) => `${V1}/staff/${id}/reset-password`,
  staffRequestPasswordReset: `${V1}/staff/request-password-reset`,
  staffPasswordResetRequestFulfill: (requestId: string) =>
    `${V1}/staff/password-reset-requests/${requestId}/reset`,
  staffPositions: `${V1}/staff-positions`,
  staffPositionById: (id: string) => `${V1}/staff-positions/${id}`,
  assignedNumbers: `${V1}/assigned-numbers`,
  assignedNumberById: (id: string) => `${V1}/assigned-numbers/${id}`,
} as const;
