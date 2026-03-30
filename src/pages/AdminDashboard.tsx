import { memo, useMemo, useState } from "react";
import { Link } from "react-router";
import { useAppSelector } from "../store/hooks";
import { selectOrders } from "../store/ordersSlice";
import { selectStaff } from "../store/staffSlice";
import { selectProducts } from "../store/productsSlice";
import { Card, CardHeader, Button, Table } from "../components/ui";
import type { Order } from "../types";
import {
  computeEarningsForStaff,
  getWeekRange,
  formatCurrency,
  formatDate,
} from "../lib/orderUtils";

function AdminDashboardPage() {
  const orders = useAppSelector(selectOrders);
  const staff = useAppSelector(selectStaff);
  const products = useAppSelector(selectProducts);

  const [dateFilter, setDateFilter] = useState<"week" | "month" | "year" | "custom">("week");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");

  const { start: activeStart, end: activeEnd } = useMemo(() => {
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);

    if (dateFilter === "week") {
      const r = getWeekRange(now);
      start = r.start;
      end = r.end;
    } else if (dateFilter === "month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
    } else if (dateFilter === "year") {
      start = new Date(now.getFullYear(), 0, 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(now.getFullYear(), 11, 31);
      end.setHours(23, 59, 59, 999);
    } else if (dateFilter === "custom") {
      if (customStart) {
        const [y, m, d] = customStart.split("-").map(Number);
        start = new Date(y, m - 1, d);
        start.setHours(0, 0, 0, 0);
      } else {
        start = new Date(0);
      }
      if (customEnd) {
        const [y, m, d] = customEnd.split("-").map(Number);
        end = new Date(y, m - 1, d);
        end.setHours(23, 59, 59, 999);
      } else {
        end = new Date(8640000000000000);
      }
    }
    return { start, end };
  }, [dateFilter, customStart, customEnd]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const d = new Date(o.createdAt);
      return d >= activeStart && d <= activeEnd;
    });
  }, [orders, activeStart, activeEnd]);

  const totalOrders = useMemo(() => {
    const validOrders = filteredOrders.filter((o) => o.status !== "cancelled");
    const uniqueIds = new Set(validOrders.map((o) => o.orderId));
    return uniqueIds.size;
  }, [filteredOrders]);

  const totalSalaryPayable = useMemo(() => {
    return staff
      .filter((s) => s.isActive)
      .reduce((sum, s) => {
        const { total } = computeEarningsForStaff(orders, s, { weekOnly: true });
        return sum + total;
      }, 0);
  }, [orders, staff]);

  const recentOrders = useMemo(() => {
    const sorted = [...orders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const groups = new Map<string, Order[]>();
    for (const o of sorted) {
      if (!groups.has(o.orderId)) groups.set(o.orderId, []);
      groups.get(o.orderId)!.push(o);
    }

    return Array.from(groups.values())
      .slice(0, 10)
      .map((items) => {
        const o = items[0];
        const totalSelling = items.reduce(
          (sum, i) => sum + Number(i.sellingAmount),
          0
        );
        const totalDiscount = items.reduce(
          (sum, i) => sum + (i.discountAmount ? Number(i.discountAmount) : 0),
          0
        );

        return {
          ...o,
          sellingAmount: totalSelling,
          discountAmount: totalDiscount > 0 ? totalDiscount : null,
          _items: items,
        };
      });
  }, [orders]);

  const staffSummary = useMemo(
    () =>
      staff.map((s) => {
        const { total, orderCount } = computeEarningsForStaff(orders, s, {
          weekOnly: true,
        });
        return {
          id: s.id,
          name: s.name,
          joinedDate: s.joinedDate,
          orderCount,
          weeklyEarnings: total,
          isActive: s.isActive,
        };
      }),
    [orders, staff]
  );

  const columns = useMemo(
    () => [
      { key: "name", header: "Staff" },
      { key: "joinedDate", header: "Joined", render: (r: { joinedDate: string }) => formatDate(r.joinedDate) },
      { key: "orderCount", header: "Quantity (week)" },
      {
        key: "weeklyEarnings",
        header: "Weekly earnings",
        render: (r: { weeklyEarnings: number }) => formatCurrency(r.weeklyEarnings),
      },
      {
        key: "action",
        header: "",
        render: (r: { id: string }) => (
          <Link to={`/admin/staff/${r.id}`}>
            <Button variant="ghost" size="sm">
              View
            </Button>
          </Link>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <CardHeader
        title="Admin Dashboard"
        subtitle={
          dateFilter === "custom"
            ? `Period: ${customStart ? formatDate(activeStart.toISOString()) : "Start"} – ${customEnd ? formatDate(activeEnd.toISOString()) : "End"}`
            : `Period: ${formatDate(activeStart.toISOString())} – ${formatDate(activeEnd.toISOString())}`
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-md border border-border overflow-hidden bg-surface">
              <button
                onClick={() => setDateFilter("week")}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  dateFilter === "week"
                    ? "bg-primary text-white font-medium"
                    : "text-text-muted hover:text-text-heading"
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setDateFilter("month")}
                className={`px-3 py-1.5 text-sm border-l border-border transition-colors ${
                  dateFilter === "month"
                    ? "bg-primary text-white font-medium"
                    : "text-text-muted hover:text-text-heading"
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setDateFilter("year")}
                className={`px-3 py-1.5 text-sm border-l border-border transition-colors ${
                  dateFilter === "year"
                    ? "bg-primary text-white font-medium"
                    : "text-text-muted hover:text-text-heading"
                }`}
              >
                Year
              </button>
              <button
                onClick={() => setDateFilter("custom")}
                className={`px-3 py-1.5 text-sm border-l border-border transition-colors ${
                  dateFilter === "custom"
                    ? "bg-primary text-white font-medium"
                    : "text-text-muted hover:text-text-heading"
                }`}
              >
                Custom
              </button>
            </div>
            {dateFilter === "custom" && (
              <div className="flex flex-wrap items-center gap-2 ml-1">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-text-heading outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <span className="text-text-muted text-sm">-</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-text-heading outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            )}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-sm text-text-muted">Total Orders</p>
          <p className="mt-1 text-2xl font-semibold text-text-heading">
            {totalOrders}
          </p>
        </Card>
        {/* <Card>
          <p className="text-sm text-text-muted">Active Staff</p>
          <p className="mt-1 text-2xl font-semibold text-text-heading">
            {staff.filter((s) => s.isActive).length}
          </p>
        </Card> */}
        <Card>
          <p className="text-sm text-text-muted">Total Salary (this week)</p>
          <p className="mt-1 text-2xl font-semibold text-earnings">
            {formatCurrency(totalSalaryPayable)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-text-muted">Pending orders</p>
          <p className="mt-1 text-2xl font-semibold text-warning">
            {filteredOrders.filter((o) => o.status === "pending").length}
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Staff summary (this week)"
          action={
            <Link to="/admin/staff">
              <Button variant="outline" size="sm">
                Manage staff
              </Button>
            </Link>
          }
        />
        <Table
          columns={columns}
          data={staffSummary}
          keyExtractor={(r) => r.id}
          emptyMessage="No staff."
        />
      </Card>

      <Card>
        <CardHeader
          title="Recent orders"
          action={
            <Link to="/admin/orders">
              <Button variant="outline" size="sm">
                View all
              </Button>
            </Link>
          }
        />
        <Table
          columns={[
            { key: "orderId", header: "Order ID" },
            {
              key: "createdAt",
              header: "Date",
              render: (o: any) => formatDate(o.createdAt),
            },
            { key: "customerName", header: "Customer" },
            {
              key: "productId",
              header: "Product",
              render: (o: any) => {
                const items = o._items as Order[];
                if (items && items.length > 1) {
                  return (
                    <span className="font-bold text-primary">
                      {items.length} items
                    </span>
                  );
                }
                return (
                  products.find((p) => p.id === o.productId)?.name ??
                  o.productId
                );
              },
            },
            {
              key: "staffId",
              header: "Assigned To",
              render: (o: any) =>
                o.staffId
                  ? staff.find((s) => s.id === o.staffId)?.name ?? "Unknown"
                  : "Unassigned",
            },
            {
              key: "status",
              header: "Status",
              render: (o: any) => (
                <span className="capitalize">{o.status}</span>
              ),
            },
          ]}
          data={recentOrders}
          keyExtractor={(o: any) => o.id}
          emptyMessage="No orders."
        />
      </Card>
    </div>
  );
}

export default memo(AdminDashboardPage);
