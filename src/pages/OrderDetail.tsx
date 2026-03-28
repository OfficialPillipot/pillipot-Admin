import { memo } from "react";
import { useParams, Link } from "react-router";
import { useAppSelector } from "../store/hooks";
import { selectOrders } from "../store/ordersSlice";
import { selectProductById } from "../store/productsSlice";
import { Card, CardHeader, Badge } from "../components/ui";
import { formatDateTime, formatCurrency } from "../lib/orderUtils";

function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const orders = useAppSelector(selectOrders);
  const order = orders.find((o) => o.id === id);
  const product = useAppSelector((s) => (order ? selectProductById(s, order.productId) : undefined));

  if (!order) {
    return (
      <div className="text-center text-text-muted">
        <p>Order not found.</p>
        <Link to="/orders" className="mt-2 inline-block text-primary hover:underline">
          Back to orders
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <Link to="/orders" className="text-primary hover:underline">
          ← Back to orders
        </Link>
        <Badge
          variant={
            order.status === "delivered"
              ? "success"
              : order.status === "cancelled"
                ? "error"
                : order.status === "dispatch"
                  ? "info"
                  : order.status === "returned"
                    ? "default"
                    : order.status === "packed"
                      ? "default"
                      : "warning"
          }
        >
          {order.status}
        </Badge>
      </div>
      <Card>
        <CardHeader
          title={order.orderId}
          subtitle={`Created ${formatDateTime(order.createdAt)}`}
        />
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-text-muted">Customer Name</dt>
            <dd className="font-medium text-text-heading">{order.customerName}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-muted">Phone</dt>
            <dd>{order.phone}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-muted">Email</dt>
            <dd>{order.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-muted">Order Type</dt>
            <dd>{order.orderType.toUpperCase()}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm text-text-muted">Delivery Address</dt>
            <dd>
              {order.deliveryAddress}, {order.district}, {order.state} -{" "}
              {order.pincode}. Post: {order.postOffice}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-muted">Product</dt>
            <dd>{product?.name ?? order.productId}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-muted">Quantity</dt>
            <dd>{order.quantity}</dd>
          </div>
          {order.status !== "dispatch" &&
            order.discountAmount != null &&
            order.discountAmount > 0 && (
            <div>
              <dt className="text-sm text-text-muted">Discount</dt>
              <dd>{formatCurrency(order.discountAmount)}</dd>
            </div>
          )}
          <div>
            <dt className="text-sm text-text-muted">Total</dt>
            <dd className="font-medium text-earnings">
              {formatCurrency(order.sellingAmount)}
            </dd>
          </div>
          {order.trackingId?.trim() ? (
            <div className="sm:col-span-2">
              <dt className="text-sm text-text-muted">Tracking ID</dt>
              <dd className="font-mono text-sm font-medium text-text-heading">
                {order.trackingId.trim()}
              </dd>
            </div>
          ) : null}
          {order.notes && (
            <div className="sm:col-span-2">
              <dt className="text-sm text-text-muted">Notes</dt>
              <dd>{order.notes}</dd>
            </div>
          )}
        </dl>
      </Card>
    </div>
  );
}

export default memo(OrderDetailPage);
