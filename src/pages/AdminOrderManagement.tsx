import { memo, useMemo, useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { selectOrders } from "../store/ordersSlice";
import { updateOrder, deleteOrder } from "../store/ordersSlice";
import { selectStaff } from "../store/staffSlice";
import { selectProducts } from "../store/productsSlice";
import { Card, CardHeader, Button, Table, Badge, Modal } from "../components/ui";
import { toast } from "../lib/toast";
import type { Order } from "../types";
import { formatDate } from "../lib/orderUtils";

function AdminOrderManagementPage() {
  const dispatch = useAppDispatch();
  const orders = useAppSelector(selectOrders);
  const staff = useAppSelector(selectStaff);
  const products = useAppSelector(selectProducts);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [productFilter, setProductFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const filteredOrders = useMemo(() => {
    let list = [...orders].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (productFilter) list = list.filter((o) => o.productId === productFilter);
    if (typeFilter) list = list.filter((o) => o.orderType === typeFilter);
    return list;
  }, [orders, productFilter, typeFilter]);

  const orderDetail = useMemo(
    () => (detailId ? orders.find((o) => o.id === detailId) : null),
    [orders, detailId]
  );

  const handleStatusChange = useCallback(
    async (orderId: string, status: Order["status"]) => {
      try {
        await dispatch(updateOrder({ id: orderId, patch: { status } })).unwrap();
        toast.success(`Order ${status}`);
        if (status === "cancelled" || status === "delivered") setDetailId(null);
      } catch {
        toast.error("Failed to update order");
      }
    },
    [dispatch]
  );

  const handleDelete = useCallback(
    async (orderId: string) => {
      if (!window.confirm("Delete this order? This cannot be undone.")) return;
      try {
        await dispatch(deleteOrder(orderId)).unwrap();
        setDetailId(null);
        toast.success("Order deleted");
      } catch {
        toast.error("Failed to delete order");
      }
    },
    [dispatch]
  );

  const productOptions = useMemo(
    () => [
      { value: "", label: "All products" },
      ...products.map((p) => ({ value: p.id, label: p.name })),
    ],
    [products]
  );

  const typeOptions = useMemo(
    () => [
      { value: "", label: "All" },
      { value: "cod", label: "COD" },
      { value: "prepaid", label: "Prepaid" },
    ],
    []
  );

  const columns = useMemo(
    () => [
      {
        key: "orderId",
        header: "Order ID",
        render: (row: Order) => (
          <button
            type="button"
            onClick={() => setDetailId(row.id)}
            className="font-medium text-primary hover:underline"
          >
            {row.orderId}
          </button>
        ),
      },
      {
        key: "createdAt",
        header: "Date",
        render: (row: Order) => formatDate(row.createdAt),
      },
      { key: "customerName", header: "Customer" },
      {
        key: "productId",
        header: "Product",
        render: (row: Order) => products.find((p) => p.id === row.productId)?.name ?? row.productId,
      },
      {
        key: "staffId",
        header: "Staff",
        render: (row: Order) =>
          staff.find((s) => s.id === row.staffId)?.name ?? row.staffId,
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
    [staff, products]
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Order Management" subtitle="Edit status or delete orders." />
        <div className="mb-4 flex flex-wrap gap-3">
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          >
            {productOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          >
            {typeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <Table
          columns={columns}
          data={filteredOrders}
          keyExtractor={(o) => o.id}
          emptyMessage="No orders."
        />
      </Card>

      <Modal
        isOpen={!!orderDetail}
        onClose={() => setDetailId(null)}
        title={orderDetail?.orderId ?? "Order"}
        size="lg"
      >
        {orderDetail && (
          <div className="space-y-4">
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-text-muted">Customer</dt>
                <dd>{orderDetail.customerName}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Phone</dt>
                <dd>{orderDetail.phone}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Product</dt>
                <dd>{products.find((p) => p.id === orderDetail.productId)?.name}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Status</dt>
                <dd>{orderDetail.status}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleStatusChange(orderDetail.id, "pending")}
                disabled={orderDetail.status === "pending"}
              >
                Pending
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleStatusChange(orderDetail.id, "delivered")}
                disabled={orderDetail.status === "delivered"}
              >
                Delivered
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleStatusChange(orderDetail.id, "cancelled")}
                disabled={orderDetail.status === "cancelled"}
              >
                Cancel order
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDelete(orderDetail.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default memo(AdminOrderManagementPage);
