import { memo, useMemo } from "react";
import { Link } from "react-router";
import { useAppSelector } from "../store/hooks";
import { selectOrders } from "../store/ordersSlice";
import { selectStaff } from "../store/staffSlice";
import { selectProducts } from "../store/productsSlice";
import { Card, CardHeader, Button, Table } from "../components/ui";
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

  const { start: weekStart, end: weekEnd } = useMemo(
    () => getWeekRange(new Date()),
    []
  );

  const totalOrders = useMemo(
    () => orders.filter((o) => o.status !== "cancelled").length,
    [orders]
  );

  const totalSalaryPayable = useMemo(() => {
    return staff
      .filter((s) => s.isActive)
      .reduce((sum, s) => {
        const { total } = computeEarningsForStaff(orders, s, { weekOnly: true });
        return sum + total;
      }, 0);
  }, [orders, staff]);

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 10),
    [orders]
  );

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
      { key: "orderCount", header: "Orders (week)" },
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
        subtitle={`Week: ${formatDate(weekStart.toISOString())} – ${formatDate(weekEnd.toISOString())}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-sm text-text-muted">Total Orders (all time)</p>
          <p className="mt-1 text-2xl font-semibold text-text-heading">
            {totalOrders}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-text-muted">Active Staff</p>
          <p className="mt-1 text-2xl font-semibold text-text-heading">
            {staff.filter((s) => s.isActive).length}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-text-muted">Total Salary (this week)</p>
          <p className="mt-1 text-2xl font-semibold text-earnings">
            {formatCurrency(totalSalaryPayable)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-text-muted">Pending Delivery</p>
          <p className="mt-1 text-2xl font-semibold text-warning">
            {orders.filter((o) => o.status === "pending").length}
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
            { key: "createdAt", header: "Date", render: (o: { createdAt: string }) => formatDate(o.createdAt) },
            { key: "customerName", header: "Customer" },
            {
              key: "productId",
              header: "Product",
              render: (o: { productId: string }) => products.find((p) => p.id === o.productId)?.name ?? o.productId,
            },
            {
              key: "status",
              header: "Status",
              render: (o: { status: string }) => (
                <span className="capitalize">{o.status}</span>
              ),
            },
          ]}
          data={recentOrders}
          keyExtractor={(o) => o.id}
          emptyMessage="No orders."
        />
      </Card>
    </div>
  );
}

export default memo(AdminDashboardPage);
