import { memo, useMemo, useState } from "react";
import { Link } from "react-router";
import { useAppSelector } from "../store/hooks";
import { selectOrders } from "../store/ordersSlice";
import { selectStaff } from "../store/staffSlice";
import { selectProducts } from "../store/productsSlice";
import { selectSettings } from "../store/settingsSlice";
import { Card, CardHeader, Button, Table, Badge } from "../components/ui";
import {
  isAtOrBelowStockThreshold,
  stockStatusLabel,
} from "../lib/stockUtils";
import type { Order } from "../types";
import {
  computeEarningsForStaff,
  getWeekRange,
  getNextWeekRange,
  formatCurrency,
  formatDate,
  orderLineProductLabel,
} from "../lib/orderUtils";

function AdminDashboardPage() {
  const orders = useAppSelector(selectOrders);
  const staff = useAppSelector(selectStaff);
  const products = useAppSelector(selectProducts);
  const settings = useAppSelector(selectSettings);

  const lowStockThreshold = settings?.lowStockThreshold ?? 0;

  const lowOrOutProducts = useMemo(() => {
    return products
      .filter((p) => p.isActive !== false)
      .filter((p) => isAtOrBelowStockThreshold(p.stockQuantity ?? 0, lowStockThreshold))
      .sort((a, b) => (a.stockQuantity ?? 0) - (b.stockQuantity ?? 0) || a.name.localeCompare(b.name));
  }, [products, lowStockThreshold]);

  const [dateFilter, setDateFilter] = useState<
    "today" | "week" | "next_week" | "month" | "year" | "custom"
  >("week");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");

  const { start: activeStart, end: activeEnd } = useMemo(() => {
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);

    if (dateFilter === "today") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      start.setHours(0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end.setHours(23, 59, 59, 999);
    } else if (dateFilter === "week") {
      const r = getWeekRange(now);
      start = r.start;
      end = r.end;
    } else if (dateFilter === "next_week") {
      const r = getNextWeekRange(now);
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

  const periodRange = useMemo(
    () => ({ start: activeStart, end: activeEnd }),
    [activeStart, activeEnd],
  );

  const totalSalaryPayable = useMemo(() => {
    return staff
      .filter((s) => s.isActive)
      .reduce((sum, s) => {
        const { total } = computeEarningsForStaff(orders, s, { range: periodRange });
        return sum + total;
      }, 0);
  }, [orders, staff, periodRange]);

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
          range: periodRange,
        });
        return {
          id: s.id,
          name: s.name,
          joinedDate: s.joinedDate,
          orderCount,
          periodEarnings: total,
          isActive: s.isActive,
        };
      }),
    [orders, staff, periodRange],
  );

  const columns = useMemo(
    () => [
      { key: "name", header: "Staff" },
      { key: "joinedDate", header: "Joined", render: (r: { joinedDate: string }) => formatDate(r.joinedDate) },
      { key: "orderCount", header: "Quantity" },
      {
        key: "periodEarnings",
        header: "Earnings",
        render: (r: { periodEarnings: number }) => formatCurrency(r.periodEarnings),
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
            <div className="flex flex-wrap items-center rounded-md border border-border overflow-hidden bg-surface">
              <button
                type="button"
                onClick={() => setDateFilter("today")}
                className={`px-2.5 py-1.5 text-sm transition-colors md:px-3 ${
                  dateFilter === "today"
                    ? "bg-primary text-white font-medium"
                    : "text-text-muted hover:text-text-heading"
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setDateFilter("week")}
                className={`px-2.5 py-1.5 text-sm border-l border-border transition-colors md:px-3 ${
                  dateFilter === "week"
                    ? "bg-primary text-white font-medium"
                    : "text-text-muted hover:text-text-heading"
                }`}
              >
                Week
              </button>
              <button
                type="button"
                onClick={() => setDateFilter("next_week")}
                className={`px-2.5 py-1.5 text-sm border-l border-border transition-colors md:px-3 ${
                  dateFilter === "next_week"
                    ? "bg-primary text-white font-medium"
                    : "text-text-muted hover:text-text-heading"
                }`}
              >
                Next week
              </button>
              <button
                type="button"
                onClick={() => setDateFilter("month")}
                className={`px-2.5 py-1.5 text-sm border-l border-border transition-colors md:px-3 ${
                  dateFilter === "month"
                    ? "bg-primary text-white font-medium"
                    : "text-text-muted hover:text-text-heading"
                }`}
              >
                Month
              </button>
              <button
                type="button"
                onClick={() => setDateFilter("year")}
                className={`px-2.5 py-1.5 text-sm border-l border-border transition-colors md:px-3 ${
                  dateFilter === "year"
                    ? "bg-primary text-white font-medium"
                    : "text-text-muted hover:text-text-heading"
                }`}
              >
                Year
              </button>
              <button
                type="button"
                onClick={() => setDateFilter("custom")}
                className={`px-2.5 py-1.5 text-sm border-l border-border transition-colors md:px-3 ${
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
          <p className="text-sm text-text-muted">Total salary (period)</p>
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
        <Card>
          <p className="text-sm text-text-muted">Low / out of stock</p>
          <p className="mt-1 text-2xl font-semibold text-error">
            {lowOrOutProducts.length}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Stock ≤ {lowStockThreshold} (set in Settings)
          </p>
        </Card>
      </div>

      {lowOrOutProducts.length > 0 && (
        <Card>
          <CardHeader
            title="Products to restock"
            subtitle={`Showing items with stock at or below ${lowStockThreshold}. Change the threshold in Settings.`}
            action={
              <Link to="/admin/settings">
                <Button variant="outline" size="sm">
                  Stock threshold
                </Button>
              </Link>
            }
          />
          <Table
            columns={[
              { key: "name", header: "Product" },
              {
                key: "categoryName",
                header: "Category",
                render: (p: (typeof products)[0]) => p.categoryName ?? "—",
              },
              {
                key: "buyingPrice",
                header: "Buying (₹)",
                render: (p: (typeof products)[0]) =>
                  p.buyingPrice != null
                    ? `₹${Number(p.buyingPrice).toFixed(2)}`
                    : "—",
              },
              {
                key: "price",
                header: "Selling (₹)",
                render: (p: (typeof products)[0]) =>
                  `₹${Number(p.price).toFixed(2)}`,
              },
              {
                key: "stockQuantity",
                header: "Stock",
                render: (p: (typeof products)[0]) => (
                  <span className="font-mono font-semibold tabular-nums">
                    {p.stockQuantity ?? 0}
                  </span>
                ),
              },
              {
                key: "status",
                header: "Status",
                render: (p: (typeof products)[0]) => {
                  const s = stockStatusLabel(p.stockQuantity ?? 0, lowStockThreshold);
                  if (s === "out")
                    return <Badge variant="error">Out of stock</Badge>;
                  if (s === "low")
                    return <Badge variant="warning">Low stock</Badge>;
                  return <Badge variant="error">Out of stock</Badge>;
                },
              },
            ]}
            data={lowOrOutProducts}
            keyExtractor={(p) => p.id}
            emptyMessage="None."
          />
        </Card>
      )}

      <Card>
        <CardHeader
          title="Staff summary"
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
                const items = o._items as Order[] | undefined;
                const list =
                  items && items.length > 0 ? items : [o as Order];
                if (list.length > 1) {
                  return (
                    <span className="font-bold text-primary">
                      {list.length} items
                    </span>
                  );
                }
                return orderLineProductLabel(list[0], products);
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
