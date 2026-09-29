import type { Order, AdminReviewRow } from "../types";
import { isCompletedOrCodOrder } from "./orderUtils";

/** localStorage keys for header notifications and sidebar order badges (independent tracking). */

export const LS_STAFF_BLOG_LAST_SEEN = "eden_header_staff_blog_last_seen";
export const LS_ADMIN_ENQUIRY_LAST_SEEN = "eden_header_admin_enquiry_last_seen";

// Header notifications (for notification bell dropdown only)
export const LS_VENDOR_HEADER_NOTIF_LAST_SEEN = "eden_header_vendor_notif_last_seen";
export const HEADER_NOTIFICATIONS_REFRESH = "eden-notifications-refresh";

export function dispatchNotificationsRefresh(): void {
  window.dispatchEvent(new Event(HEADER_NOTIFICATIONS_REFRESH));
}

export function markVendorNotificationsSeen(): void {
  const now = new Date().toISOString();
  const existing = localStorage.getItem(LS_VENDOR_HEADER_NOTIF_LAST_SEEN);
  if (!existing || new Date(now).getTime() > new Date(existing).getTime()) {
    localStorage.setItem(LS_VENDOR_HEADER_NOTIF_LAST_SEEN, now);
  }
}

// Sidebar "Product Orders" badge (cleared only when /vendor/orders page is opened)
export const LS_VENDOR_SIDEBAR_ORDERS_LAST_SEEN = "eden_sidebar_vendor_orders_last_seen";
export const SIDEBAR_VENDOR_ORDERS_REFRESH = "eden-sidebar-vendor-orders-refresh";

export function dispatchSidebarVendorOrdersRefresh(): void {
  window.dispatchEvent(new Event(SIDEBAR_VENDOR_ORDERS_REFRESH));
}

export function markVendorSidebarOrdersSeen(): void {
  const now = new Date().toISOString();
  const existing = localStorage.getItem(LS_VENDOR_SIDEBAR_ORDERS_LAST_SEEN);
  if (!existing || new Date(now).getTime() > new Date(existing).getTime()) {
    localStorage.setItem(LS_VENDOR_SIDEBAR_ORDERS_LAST_SEEN, now);
  }
}

// Sidebar "Reviews" badge (cleared only when /vendor/reviews page is opened)
export const LS_VENDOR_SIDEBAR_REVIEWS_LAST_SEEN = "eden_sidebar_vendor_reviews_last_seen";
export const SIDEBAR_VENDOR_REVIEWS_REFRESH = "eden-sidebar-vendor-reviews-refresh";

export function dispatchSidebarVendorReviewsRefresh(): void {
  window.dispatchEvent(new Event(SIDEBAR_VENDOR_REVIEWS_REFRESH));
}

export function markVendorSidebarReviewsSeen(): void {
  const now = new Date().toISOString();
  const existing = localStorage.getItem(LS_VENDOR_SIDEBAR_REVIEWS_LAST_SEEN);
  if (!existing || new Date(now).getTime() > new Date(existing).getTime()) {
    localStorage.setItem(LS_VENDOR_SIDEBAR_REVIEWS_LAST_SEEN, now);
  }
}

export function calculateVendorSidebarReviewsCount(reviews: AdminReviewRow[]): number {
  const last = localStorage.getItem(LS_VENDOR_SIDEBAR_REVIEWS_LAST_SEEN);
  if (!last) {
    return reviews.length;
  }
  const lastSeenMs = new Date(last).getTime();
  if (!Number.isFinite(lastSeenMs)) return 0;
  return reviews.filter((r) => {
    const t = new Date(r.createdAt).getTime();
    return Number.isFinite(t) && t > lastSeenMs;
  }).length;
}

export const REMINDER_HOURS = [23, 22, 20, 18, 12] as const;

export function getPendingReminderLevel(order: Order): number | null {
  if (order.status !== "pending") return null;
  const createdMs = new Date(order.createdAt).getTime();
  if (!Number.isFinite(createdMs)) return null;
  const elapsedMs = Date.now() - createdMs;
  for (const h of REMINDER_HOURS) {
    if (elapsedMs >= h * 60 * 60 * 1000) {
      return h;
    }
  }
  return null;
}

export function isVendorOrderUnread(order: Order, lastSeenMs: number): boolean {
  if (lastSeenMs <= 0) {
    return order.status === "pending";
  }

  const createdMs = new Date(order.createdAt).getTime();
  if (createdMs > lastSeenMs) {
    return true;
  }

  // Reminder milestones (12h, 18h, 20h, 22h, 23h) for unaccepted pending orders
  if (order.status === "pending") {
    for (const h of REMINDER_HOURS) {
      const milestoneMs = createdMs + h * 60 * 60 * 1000;
      if (Date.now() >= milestoneMs && milestoneMs > lastSeenMs) {
        return true;
      }
    }
  }

  return false;
}

export function calculateVendorSidebarOrdersCount(orders: Order[]): number {
  const valid = orders.filter(isCompletedOrCodOrder);
  const last = localStorage.getItem(LS_VENDOR_SIDEBAR_ORDERS_LAST_SEEN);
  const lastSeenMs = last ? new Date(last).getTime() : 0;
  return valid.filter((o) => isVendorOrderUnread(o, lastSeenMs)).length;
}

export function isVendorReviewUnread(review: AdminReviewRow, lastSeenMs: number): boolean {
  if (lastSeenMs <= 0) {
    return true;
  }
  const createdMs = new Date(review.createdAt).getTime();
  return Number.isFinite(createdMs) && createdMs > lastSeenMs;
}

