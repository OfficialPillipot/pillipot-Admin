import { memo, useMemo, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useAppSelector } from "../store/hooks";
import { selectOrders } from "../store/ordersSlice";
import { selectProducts } from "../store/productsSlice";
import {
  Card,
  CardHeader,
  Button,
  Table,
  Badge,
  Select,
  ManagementFilterPanel,
  ManagementFilterField,
  ResponsiveManagementFilters,
  MANAGEMENT_NATIVE_CONTROL_CLASS,
} from "../components/ui";
import { OrderStatusBadge } from "../components/orders/OrderStatusBadge";
import type { Order } from "../types";
import { formatDate } from "../lib/orderUtils";
import type { SelectOption } from "../components/ui/Select";
import {
  ORDER_STATUS_FILTER_OPTIONS,
  buildGroupedOrderRows,
  filterOrderLinesForList,
  type OrdersListGroupedRow,
} from "../lib/ordersList";

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
  const [searchTerm, setSearchTerm] = useState(
    () => searchParams.get("search") ?? ""
  );
  const [fromDate, setFromDate] = useState(
    () => searchParams.get("from") ?? getTodayStr()
  );
  const [toDate, setToDate] = useState(
    () => searchParams.get("to") ?? getTodayStr()
  );
  const [statusFilter, setStatusFilter] = useState(
    () => searchParams.get("status") ?? "",
  );

  const staffId = user?.role === "staff" ? user.staffId : null;

  const groupedOrders = useMemo(() => {
    const lines = filterOrderLinesForList(orders, {
      staffId,
      productId: productFilter,
      orderType: typeFilter,
      status: statusFilter,
      fromDate,
      toDate,
    });

    let rows = buildGroupedOrderRows(lines, products);

    const q = searchTerm.trim().toLowerCase();
    if (q) {
      rows = rows.filter((row) => {
        const customer = (row.customerName ?? "").toLowerCase();
        const phone = String(row.phone ?? "").toLowerCase();
        return customer.includes(q) || phone.includes(q);
      });
    }

    return rows;
  }, [orders, staffId, productFilter, typeFilter, statusFilter, fromDate, toDate, products, searchTerm]);

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
    if (statusFilter) p.set("status", statusFilter);
    if (searchTerm.trim()) p.set("search", searchTerm.trim());
    if (fromDate) p.set("from", fromDate);
    if (toDate) p.set("to", toDate);
    setSearchParams(p, { replace: true });
  }, [productFilter, typeFilter, statusFilter, searchTerm, fromDate, toDate, setSearchParams]);

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
        render: (row: OrdersListGroupedRow) => {
          const names = row._products;
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
        key: "status",
        header: "Status",
        render: (row: OrdersListGroupedRow) => (
          <OrderStatusBadge
            uniform={row._uniformStatus ?? row.status}
          />
        ),
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
    []
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Orders"
          subtitle="Filter by date, status, product, payment type, or search by customer/phone."
          action={
            user?.role === "staff" && (
              <Link to="/orders/create">
                <Button>Create Order</Button>
              </Link>
            )
          }
        />
        <div className="mb-4">
          <ResponsiveManagementFilters modalTitle="Order filters" triggerLabel="Filters">
            <ManagementFilterPanel>
              <ManagementFilterField label="Search" className="lg:col-span-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Customer name or phone"
                  className={MANAGEMENT_NATIVE_CONTROL_CLASS}
                  aria-label="Search by customer name or phone"
                />
              </ManagementFilterField>
              <ManagementFilterField label="From date">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className={MANAGEMENT_NATIVE_CONTROL_CLASS}
                  title="From date"
                  aria-label="From date"
                />
              </ManagementFilterField>
              <ManagementFilterField label="To date">
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className={MANAGEMENT_NATIVE_CONTROL_CLASS}
                  title="To date"
                  aria-label="To date"
                />
              </ManagementFilterField>
              <ManagementFilterField label="Product">
                <Select
                  label=""
                  fullWidth
                  options={productOptions}
                  value={productFilter}
                  onChange={(e) => setProductFilter(e.target.value)}
                  aria-label="Filter by product"
                />
              </ManagementFilterField>
              <ManagementFilterField label="Payment type">
                <Select
                  label=""
                  fullWidth
                  options={typeOptions}
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  aria-label="Filter by payment type"
                />
              </ManagementFilterField>
              <ManagementFilterField label="Status">
                <Select
                  label=""
                  fullWidth
                  options={ORDER_STATUS_FILTER_OPTIONS}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filter by order line status"
                />
              </ManagementFilterField>
              <ManagementFilterField label="Apply">
                <Button variant="secondary" size="sm" type="button" onClick={applyFilters}>
                  Apply
                </Button>
              </ManagementFilterField>
            </ManagementFilterPanel>
          </ResponsiveManagementFilters>
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
