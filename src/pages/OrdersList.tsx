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

const getTodayStr = () => {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

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
  const [fromDate, setFromDate] = useState(
    () => searchParams.get("from") ?? getTodayStr()
  );
  const [toDate, setToDate] = useState(
    () => searchParams.get("to") ?? getTodayStr()
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
    if (fromDate) {
      list = list.filter((o) => o.createdAt >= fromDate);
    }
    if (toDate) {
      list = list.filter((o) => o.createdAt <= `${toDate}T23:59:59.999Z`);
    }
    return list.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [orders, staffId, productFilter, typeFilter, fromDate, toDate]);

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
    if (fromDate) p.set("from", fromDate);
    if (toDate) p.set("to", toDate);
    setSearchParams(p, { replace: true });
  }, [productFilter, typeFilter, fromDate, toDate, setSearchParams]);

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
        key: "discountAmount",
        header: "Discount",
        render: (row: Order) =>
          row.discountAmount != null && row.discountAmount > 0
            ? `₹${Number(row.discountAmount).toFixed(2)}`
            : "—",
      },
      {
        key: "sellingAmount",
        header: "Total",
        render: (row: Order) => `₹${Number(row.sellingAmount).toFixed(2)}`,
      },
      {
        key: "trackingId",
        header: "Tracking ID",
        render: (row: Order) => {
          const t = row.trackingId?.trim();
          return t ? (
            <span className="font-mono text-xs">{t}</span>
          ) : (
            "—"
          );
        },
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
        <div className="mb-4 flex flex-wrap gap-3 items-center">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            title="From Date"
          />
          <span className="text-text-muted text-sm font-medium">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            title="To Date"
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
