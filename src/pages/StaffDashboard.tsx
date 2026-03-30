import { memo, useMemo } from "react";
import { Link } from "react-router";
import { useAppSelector } from "../store/hooks";
import { selectOrders } from "../store/ordersSlice";
import { selectStaffMe, selectStaffMeLoading } from "../store/staffSlice";
import { selectProducts } from "../store/productsSlice";
import type { Order } from "../types";
import {
  Card,
  CardHeader,
  Button,
  ProgressBar,
  Badge,
} from "../components/ui";
import {
  computeEarningsForStaff,
  getNextMilestone,
  formatCurrency,
  formatDate,
} from "../lib/orderUtils";

const todayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

function StaffDashboardPage() {
  const orders = useAppSelector(selectOrders);
  const staffProfile = useAppSelector(selectStaffMe);
  const meLoading = useAppSelector(selectStaffMeLoading);
  const products = useAppSelector(selectProducts);

  const staffId = staffProfile?.id ?? null;

  const stats = useMemo(() => {
    if (!staffProfile || !staffId) return null;
    const todayOrders = orders.filter(
      (o) => o.staffId === staffId && o.createdAt >= todayStart()
    ).length;
    const undelivered = orders.filter(
      (o) =>
        o.staffId === staffId &&
        (o.status === "pending" ||
          o.status === "packed" ||
          o.status === "dispatch")
    ).length;
    const { total, orderCount } = computeEarningsForStaff(orders, staffProfile);
    const weekly = computeEarningsForStaff(orders, staffProfile, {
      weekOnly: true,
    }).total;
    return {
      todayOrders,
      totalEarnings: total,
      undelivered,
      weeklyEarnings: weekly,
      orderCount,
    };
  }, [orders, staffProfile, staffId]);

  const nextMilestone = useMemo(() => {
    if (!staffProfile || !stats) return null;
    return getNextMilestone(staffProfile, stats.orderCount);
  }, [staffProfile, stats]);

  if (meLoading) {
    return <div className="text-text-muted">Loading…</div>;
  }

  if (!staffProfile || !stats) {
    return (
      <div className="text-text-muted">
        Could not load your profile. Please contact admin.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CardHeader
        title="Dashboard"
        subtitle={`Hello, ${staffProfile.name}`}
        action={
          <Link to="/orders/create">
            <Button>Create Order</Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-sm text-text-muted">Today&apos;s Orders</p>
          <p className="mt-1 text-2xl font-semibold text-text-heading">
            {stats.todayOrders}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-text-muted">This Week</p>
          <p className="mt-1 text-2xl font-semibold text-primary">
            {formatCurrency(stats.weeklyEarnings)}
          </p>
        </Card>
      </div>

      {nextMilestone && (
        <Card>
          <CardHeader title="Bonus Progress" />
          <div className="flex justify-between">
            <p className="mb-2 text-sm text-text-muted">
              Quantity: {stats.orderCount}
            </p>
            <p className="mb-2 text-sm text-text-muted">
              Today&apos;s Earnings: {formatCurrency(stats.totalEarnings)}
            </p>
          </div>
          <div className="mb-3 rounded-lg bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-500 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm">
            Reach {nextMilestone.orders} quantity for ₹{nextMilestone.bonus} bonus
          </div>

          <ProgressBar
            value={stats.orderCount}
            max={nextMilestone.orders}
            label="Quantity"
          />
        </Card>
      )}

      <Card>
        <CardHeader
          title="Recent Orders"
          action={
            <Link to="/orders">
              <Button variant="outline" size="sm">
                View all
              </Button>
            </Link>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-text-muted">
                <th className="pb-2 pr-4">Order ID</th>
                <th className="pb-2 pr-4">Date</th>
                <th className="pb-2 pr-4">Customer</th>
                <th className="pb-2 pr-4">Product</th>
                <th className="pb-2 pr-4">Type</th>
                <th className="pb-2">Tracking ID</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const myOrders = orders.filter((o) => o.staffId === staffId);
                const groups = new Map<string, Order[]>();
                for (const o of myOrders) {
                  if (!groups.has(o.orderId)) groups.set(o.orderId, []);
                  groups.get(o.orderId)!.push(o);
                }
                return Array.from(groups.values())
                  .slice(-5)
                  .reverse()
                  .map((items) => {
                    const o = items[0];
                    return (
                      <tr key={o.id} className="border-b border-border last:border-0">
                        <td className="py-2 pr-4">
                          <Link
                            to={`/orders/${o.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {o.orderId}
                          </Link>
                        </td>
                        <td className="py-2 pr-4">{formatDate(o.createdAt)}</td>
                        <td className="py-2 pr-4">{o.customerName}</td>
                        <td className="py-2 pr-4 italic">
                          {items.length > 1 ? (
                            <span className="font-bold text-primary">{items.length} items</span>
                          ) : (
                            products.find((p) => p.id === o.productId)?.name ?? o.productId
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          <Badge variant="default">{o.orderType.toUpperCase()}</Badge>
                        </td>
                        <td className="py-2 font-mono text-xs">
                          {o.trackingId?.trim() ?? "—"}
                        </td>
                      </tr>
                    );
                  });
              })()}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default memo(StaffDashboardPage);
