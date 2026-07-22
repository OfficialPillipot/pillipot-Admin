import type { Order, OrderStatus, Product, Staff } from "../types";

const WEEK_START = 1; // Monday

export function getWeekRange(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : WEEK_START);
  const start = new Date(d);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function isInWeek(orderDate: string, weekStart: Date, weekEnd: Date): boolean {
  const d = new Date(orderDate);
  return d >= weekStart && d <= weekEnd;
}

/** UTC calendar day (YYYY-MM-DD), aligned with payroll API DATE(created_at). */
function utcDayFromOrderCreatedAt(createdAt: string): string {
  return new Date(createdAt).toISOString().slice(0, 10);
}

function milestoneBonusForQuantity(
  quantityCount: number,
  milestones: { orders: number; bonus: number }[],
): number {
  const sorted = [...milestones].sort((a, b) => a.orders - b.orders);
  let bonus = 0;
  for (const m of sorted) {
    if (quantityCount >= m.orders) bonus += m.bonus;
  }
  return bonus;
}

/**
 * Base pay uses total quantity in the window; milestone bonuses are evaluated per UTC day
 * (tiers reset each day) and summed — same rules as GET /staff/earnings.
 */
export function computeEarningsForStaff(
  orders: Order[],
  staff: Staff,
  options?: { weekOnly?: boolean; range?: { start: Date; end: Date } }
): { orderEarnings: number; bonus: number; total: number; orderCount: number } {
  const { weekOnly, range } = options ?? {};
  let list = orders.filter(
    (o) =>
      o.staffId === staff.id &&
      o.status !== "cancelled" &&
      o.status !== "returned"
  );
  if (range) {
    list = list.filter((o) => {
      const d = new Date(o.createdAt);
      return d >= range.start && d <= range.end;
    });
  } else if (weekOnly) {
    const { start, end } = getWeekRange(new Date());
    list = list.filter((o) => isInWeek(o.createdAt, start, end));
  }
  const orderCount = list.reduce((sum, o) => sum + Math.max(0, Number(o.quantity) || 0), 0);
  const orderEarnings = orderCount * staff.payoutPerOrder;
  const milestones = staff.bonusMilestones ?? [];
  const qtyByUtcDay = new Map<string, number>();
  for (const o of list) {
    const day = utcDayFromOrderCreatedAt(o.createdAt);
    const q = Math.max(0, Number(o.quantity) || 0);
    qtyByUtcDay.set(day, (qtyByUtcDay.get(day) ?? 0) + q);
  }
  let bonus = 0;
  for (const dayQty of qtyByUtcDay.values()) {
    bonus += milestoneBonusForQuantity(dayQty, milestones);
  }
  return {
    orderEarnings,
    bonus,
    total: orderEarnings + bonus,
    orderCount,
  };
}

export function getNextMilestone(
  staff: Staff,
  currentCount: number
): { orders: number; bonus: number } | null {
  const sorted = [...staff.bonusMilestones].sort((a, b) => a.orders - b.orders);
  for (const m of sorted) {
    if (currentCount < m.orders) return m;
  }
  return null;
}

/** Indian Standard Time for all user-visible dates/times. */
export const APP_TIMEZONE = "Asia/Kolkata";

const dateInIST: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: APP_TIMEZONE,
};

const dateTimeInIST12h: Intl.DateTimeFormatOptions = {
  ...dateInIST,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
};

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", dateInIST);
}

/** e.g. 8 April 2026 — IST calendar date. */
export function formatDateLong(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: APP_TIMEZONE,
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-IN", dateTimeInIST12h);
}

/** Prefer API `productName`, then live catalog; never show raw UUIDs. */
export function orderLineProductLabel(
  line: Pick<Order, "productId" | "productName">,
  products: Pick<Product, "id" | "name">[],
): string {
  const fromApi = line.productName?.trim();
  if (fromApi) return fromApi;
  const p = products.find((x) => x.id === line.productId);
  if (p?.name?.trim()) return p.name.trim();
  return "Product unavailable";
}

/** One status if every line matches; otherwise `"mixed"`. */
export function uniformOrderGroupStatus(items: Order[]): OrderStatus | "mixed" {
  if (items.length === 0) return "pending";
  const s0 = items[0].status;
  return items.every((i) => i.status === s0) ? s0 : "mixed";
}

export type OrderStatusBadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "packed"
  | "muted";

export function orderStatusToBadgeVariant(
  status: OrderStatus | "mixed",
): OrderStatusBadgeVariant {
  if (status === "mixed") return "muted";
  switch (status) {
    case "delivered":
      return "success";
    case "cancelled":
      return "error";
    case "returned":
      return "muted";
    case "dispatch":
      return "info";
    case "packed":
      return "packed";
    case "scheduled":
      return "info";
    default:
      return "warning";
  }
}

export function formatOrderStatusLabel(status: OrderStatus | "mixed"): string {
  if (status === "mixed") return "Mixed";
  if (status === "scheduled") return "Scheduled";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * Returns true if an order was placed via the website / online storefront (includes both online payment & COD website orders).
 */
export function isWebsiteOrder(
  order: Pick<Order, "platform" | "paymentMethod" | "staffId">,
): boolean {
  const p = order.platform?.toLowerCase().trim();
  if (p === "webapp" || p === "website" || p === "online" || p === "web") {
    return true;
  }
  const pm = order.paymentMethod?.toLowerCase().trim();
  if (pm === "razorpay") return true;

  // An order created on the website has no staffId assigned (placed by customer online)
  if (!order.staffId || order.staffId.trim() === "") {
    return true;
  }

  return false;
}

/**
 * Returns true if an order line uses an online payment method (e.g. Razorpay, prepaid, non-COD).
 */
export function isOnlinePaymentOrder(order: Pick<Order, "paymentMethod" | "orderType">): boolean {
  const method = order.paymentMethod?.toLowerCase().trim();
  if (method === "cod" || order.orderType === "cod") return false;
  if (method === "razorpay" || order.orderType === "prepaid") return true;
  return Boolean(method && method !== "cod");
}

/**
 * Returns true if an order should be listed in online order views:
 * - COD orders are always valid (cash collected on delivery).
 * - Online payment orders (Razorpay/prepaid) are listed ONLY if payment was completed (`paymentStatus === "paid"`).
 *   Unpaid online checkout attempts (e.g. customer clicked Buy but went back without paying) are excluded.
 */
export function isCompletedOrCodOrder(
  order: Pick<Order, "paymentMethod" | "orderType" | "paymentStatus">,
): boolean {
  if (isOnlinePaymentOrder(order)) {
    const pStatus = order.paymentStatus?.toLowerCase().trim();
    return pStatus === "paid";
  }
  return true;
}


