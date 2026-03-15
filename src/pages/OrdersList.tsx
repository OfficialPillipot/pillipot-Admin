import { memo, useMemo, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useAppSelector } from "../store/hooks";
import { selectOrders } from "../store/ordersSlice";
import { selectProducts } from "../store/productsSlice";
import { Card, CardHeader, Button, Table, Badge, Select } from "../components/ui";
import type { Order } from "../types";
import { formatDate } from "../lib/orderUtils";
import type { SelectOption } from "../components/ui/Select";

function OrdersListPage() {
  const { user } = useAuth();
  const orders = useAppSelector(selectOrders);
  const products = useAppSelector(selectProducts);
  const [searchParams, setSearchParams] = useSearchParams();
  const [productFilter, setProductFilter] = useState(
    () => searchParams.get("product") ?? ""
  );
  const [typeFilter, setTypeFilter] = useState(
    () => searchParams.get("type") ?? ""
  );
  const [dateFilter, setDateFilter] = useState(
    () => searchParams.get("date") ?? ""
  );

  const staffId = user?.role === "staff" ? user.staffId : null;

  const filteredOrders = useMemo(() => {
    let list = staffId
      ? orders.filter((o) => o.staffId === staffId)
      : [...orders];
    if (productFilter) {
      list = list.filter((o) => o.productId === productFilter);
    }
    if (typeFilter) {
      list = list.filter((o) => o.orderType === typeFilter);
    }
    if (dateFilter) {
      list = list.filter((o) => o.createdAt.startsWith(dateFilter));
    }
    return list.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [orders, staffId, productFilter, typeFilter, dateFilter]);

  const productOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: "All products" },
      ...products.map((p) => ({ value: p.id, label: p.name })),
    ],
    [products]
  );

  const typeOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: "All types" },
      { value: "cod", label: "COD" },
      { value: "prepaid", label: "Prepaid" },
    ],
    []
  );

  const applyFilters = useCallback(() => {
    const p = new URLSearchParams();
    if (productFilter) p.set("product", productFilter);
    if (typeFilter) p.set("type", typeFilter);
    if (dateFilter) p.set("date", dateFilter);
    setSearchParams(p, { replace: true });
  }, [productFilter, typeFilter, dateFilter, setSearchParams]);

  const columns = useMemo(
    () => [
      {
        key: "orderId",
        header: "Order ID",
        render: (row: Order) => (
          <Link
            to={`/orders/${row.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.orderId}
          </Link>
        ),
      },
      { key: "createdAt", header: "Date", render: (row: Order) => formatDate(row.createdAt) },
      { key: "customerName", header: "Customer" },
      {
        key: "product",
        header: "Product",
        render: (row: Order) => products.find((p) => p.id === row.productId)?.name ?? row.productId,
      },
      {
        key: "orderType",
        header: "Type",
        render: (row: Order) => (
          <Badge variant="default">{row.orderType.toUpperCase()}</Badge>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (row: Order) => (
          <Badge
            variant={
              row.status === "delivered"
                ? "success"
                : row.status === "cancelled"
                  ? "error"
                  : "warning"
            }
          >
            {row.status}
          </Badge>
        ),
      },
    ],
    [products]
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Orders"
          subtitle="Filter by date, product, or payment type."
          action={
            user?.role === "staff" && (
              <Link to="/orders/create">
                <Button>Create Order</Button>
              </Link>
            )
          }
        />
        <div className="mb-4 flex flex-wrap gap-3">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <Select
            options={productOptions}
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="w-40"
          />
          <Select
            options={typeOptions}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-32"
          />
          <Button variant="secondary" size="sm" onClick={applyFilters}>
            Apply
          </Button>
        </div>
        <Table
          columns={columns}
          data={filteredOrders}
          keyExtractor={(row) => row.id}
          emptyMessage="No orders found."
        />
      </Card>
    </div>
  );
}

export default memo(OrdersListPage);
