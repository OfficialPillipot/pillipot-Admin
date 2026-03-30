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

  const groupedOrders = useMemo(() => {
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

    const groups: Record<string, Order[]> = {};
    for (const o of list) {
      if (!groups[o.orderId]) groups[o.orderId] = [];
      groups[o.orderId].push(o);
    }

    return Object.values(groups)
      .map((items) => {
        const representative = items[0];
        const total = items.reduce(
          (sum, i) => sum + Number(i.sellingAmount),
          0
        );
        const totalDiscount = items.reduce(
          (sum, i) => sum + (i.discountAmount ? Number(i.discountAmount) : 0),
          0
        );
        return {
          ...representative,
          id: representative.id, // for keyExtractor
          sellingAmount: total,
          discountAmount: totalDiscount,
          _lineCount: items.length,
          _products: items.map(
            (i) => products.find((p) => p.id === i.productId)?.name || i.productId
          ),
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, staffId, productFilter, typeFilter, fromDate, toDate, products]);

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
        header: "Products",
        render: (row: any) => {
          const names = row._products as string[];
          if (names.length === 1) return names[0];
          return (
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-xs text-indigo-600">{names.length} items</span>
              <span className="text-[10px] text-text-muted truncate max-w-[12rem]">
                {names.join(", ")}
              </span>
            </div>
          );
        },
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
          data={groupedOrders}
          keyExtractor={(row) => row.id}
          emptyMessage="No orders found."
        />
      </Card>
    </div>
  );
}

export default memo(OrdersListPage);
