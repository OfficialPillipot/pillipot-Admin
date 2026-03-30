import type { Order, Staff } from "../types";

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

export function computeEarningsForStaff(
  orders: Order[],
  staff: Staff,
  options?: { weekOnly?: boolean }
): { orderEarnings: number; bonus: number; total: number; orderCount: number } {
  const { weekOnly } = options ?? {};
  let list = orders.filter(
    (o) =>
      o.staffId === staff.id &&
      o.status !== "cancelled" &&
      o.status !== "returned"
  );
  if (weekOnly) {
    const { start, end } = getWeekRange(new Date());
    list = list.filter((o) => isInWeek(o.createdAt, start, end));
  }
  const uniqueOrderIds = new Set(list.map((o) => o.orderId));
  const orderCount = uniqueOrderIds.size;
  const orderEarnings = orderCount * staff.payoutPerOrder;
  let bonus = 0;
  for (const m of staff.bonusMilestones) {
    if (orderCount >= m.orders) bonus = m.bonus;
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
