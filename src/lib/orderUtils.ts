import type { Order, Product, Staff } from "../types";

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

/** Calendar week immediately after the week containing `date` (Mon–Sun). */
export function getNextWeekRange(date: Date): { start: Date; end: Date } {
  const thisWeek = getWeekRange(date);
  const anchor = new Date(thisWeek.end);
  anchor.setDate(anchor.getDate() + 1);
  anchor.setHours(12, 0, 0, 0);
  return getWeekRange(anchor);
}

export function isInWeek(orderDate: string, weekStart: Date, weekEnd: Date): boolean {
  const d = new Date(orderDate);
  return d >= weekStart && d <= weekEnd;
}

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
  let bonus = 0;
  const milestones = [...staff.bonusMilestones].sort((a, b) => a.orders - b.orders);
  for (const m of milestones) {
    if (orderCount >= m.orders) bonus += m.bonus;
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

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
