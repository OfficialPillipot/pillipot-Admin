import { memo, useState } from "react";
import { useParams, Link } from "react-router";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { selectOrders, updateOrder } from "../store/ordersSlice";
import { selectProducts } from "../store/productsSlice";
import { Card, Badge, Button } from "../components/ui";
import {
  formatDateTime,
  formatCurrency,
  formatOrderStatusLabel,
  orderLineProductLabel,
  orderStatusToBadgeVariant,
} from "../lib/orderUtils";
import { toast } from "../lib/toast";

function OrderDetailPage() {
  const dispatch = useAppDispatch();
  const { id } = useParams<{ id: string }>();
  const allOrders = useAppSelector(selectOrders);
  const currentOrder = allOrders.find((o) => o.id === id);
  const relatedItems = allOrders.filter(
    (o) => currentOrder && o.orderId === currentOrder.orderId
  );
  const products = useAppSelector(selectProducts);
  const [cancelling, setCancelling] = useState(false);

  if (!currentOrder || relatedItems.length === 0) {
    return (
      <div className="py-12 text-center text-text-muted">
        <p className="text-lg font-medium">Order not found.</p>
        <Link
          to="/orders"
          className="mt-4 inline-block rounded-lg bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/20"
        >
          Back to orders
        </Link>
      </div>
    );
  }

  const totalSelling = relatedItems.reduce((sum, item) => sum + Number(item.sellingAmount), 0);
  const totalDiscount = relatedItems.reduce(
    (sum, item) => sum + (item.discountAmount ? Number(item.discountAmount) : 0),
    0
  );
  const totalAddOn = relatedItems.reduce(
    (sum, item) => sum + (item.addOnAmount ? Number(item.addOnAmount) : 0),
    0
  );
  const totalDelivery = relatedItems.reduce(
    (sum, item) => sum + (item.deliveryFee ? Number(item.deliveryFee) : 0),
    0
  );
  const grandTotal = totalSelling + totalDelivery;
  const canCancel =
    currentOrder.status === "pending" || currentOrder.status === "scheduled";

  const cancelOrder = async () => {
    if (!canCancel || relatedItems.length === 0) return;
    setCancelling(true);
    try {
      const pendingLineIds = relatedItems
        .filter(
          (item) =>
            item.status === "pending" || item.status === "scheduled",
        )
        .map((item) => item.id);
      await Promise.all(
        pendingLineIds.map((lineId) =>
          dispatch(updateOrder({ id: lineId, patch: { status: "cancelled" } })).unwrap()
        )
      );
      toast.success("Order cancelled");
    } catch (err) {
      toast.fromError(err, "Failed to cancel order");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <Link
          to="/orders"
          className="flex items-center text-sm font-semibold text-primary hover:text-primary-dark"
        >
          <span className="mr-2 text-lg">←</span> Back to orders
        </Link>
        <Badge
          variant={orderStatusToBadgeVariant(currentOrder.status)}
          className="px-4 py-1 text-xs font-bold uppercase tracking-wider"
        >
          {formatOrderStatusLabel(currentOrder.status)}
        </Badge>
      </div>
      {canCancel ? (
        <div className="flex justify-end">
          <Button
            variant="danger"
            size="sm"
            loading={cancelling}
            onClick={() => void cancelOrder()}
          >
            Cancel Order
          </Button>
        </div>
      ) : null}

      <Card className="overflow-hidden border-none shadow-xl ring-1 ring-gray-200">
        <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-8 border-b border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-black tracking-tight text-gray-900 leading-none">
                {currentOrder.orderId}
              </h1>
              <p className="mt-2 text-sm font-medium text-gray-500 uppercase tracking-widest">
                Placed on {formatDateTime(currentOrder.createdAt)}
              </p>
              {relatedItems.some((i) => i.status === "scheduled") &&
              (currentOrder.scheduledFor ?? relatedItems.find((i) => i.scheduledFor)?.scheduledFor) ? (
                <p className="mt-1 text-sm font-semibold text-primary-dark">
                  Scheduled for{" "}
                  {(
                    currentOrder.scheduledFor ??
                    relatedItems.find((i) => i.scheduledFor)?.scheduledFor ??
                    ""
                  ).slice(0, 10)}
                </p>
              ) : null}
            </div>
            {currentOrder.trackingId && (
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Tracking Number</span>
                <span className="bg-primary-muted text-primary-dark px-3 py-1 rounded font-mono text-sm font-bold border border-border">
                  {currentOrder.trackingId}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Customer Info */}
          <div className="grid gap-8 sm:grid-cols-2">
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 border-b pb-2">Customer Details</h3>
              <div className="space-y-3">
                <div>
                  <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Full Name</dt>
                  <dd className="text-lg font-bold text-gray-800">{currentOrder.customerName}</dd>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Primary Phone</dt>
                    <dd className="font-semibold text-gray-700">{currentOrder.phone}</dd>
                  </div>
                  {currentOrder.secondaryPhone && (
                    <div>
                      <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Secondary Phone</dt>
                      <dd className="font-semibold text-gray-700">{currentOrder.secondaryPhone}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Order Type</dt>
                    <dd className="font-bold text-primary tracking-wide">{currentOrder.orderType.toUpperCase()}</dd>
                  </div>
                </div>
                {currentOrder.email && (
                  <div>
                    <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Email Address</dt>
                    <dd className="text-sm font-medium text-gray-600">{currentOrder.email}</dd>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 border-b pb-2">Shipping Landmark</h3>
              <div>
                <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Delivery Address</dt>
                <dd className="mt-1 text-sm font-medium text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100 italic">
                  {currentOrder.deliveryAddress}, {currentOrder.district}, {currentOrder.state} -{" "}
                  {currentOrder.pincode}.
                  <div className="mt-1 text-gray-500 not-italic font-bold">Post: {currentOrder.postOffice}</div>
                </dd>
              </div>
            </div>
          </div>

          {/* Order Items Table */}
          <div className="mt-10 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 border-b pb-2">Order Items</h3>
            <div className="overflow-hidden rounded-xl border border-gray-100 shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-6 py-3">Product</th>
                    <th className="px-6 py-3 text-center">Qty</th>
                    <th className="px-6 py-3 text-right">Selling Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {relatedItems.map((item) => {
                    const pName = orderLineProductLabel(item, products);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-800">{pName}</div>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-gray-700">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 text-right font-black tabular-nums text-primary-dark">
                          {formatCurrency(item.sellingAmount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="font-medium">
                  {totalDiscount > 0 && (
                    <tr className="bg-gray-50/90">
                      <td colSpan={2} className="px-6 py-2 text-right text-xs font-bold text-gray-500 uppercase tracking-widest">
                        Total discount
                      </td>
                      <td className="px-6 py-2 text-right text-sm font-bold text-red-600">
                        -{formatCurrency(totalDiscount)}
                      </td>
                    </tr>
                  )}
                  {totalAddOn > 0 && (
                    <tr className="bg-emerald-50 border-y border-emerald-100">
                      <td colSpan={2} className="px-6 py-2.5 text-right text-xs font-extrabold uppercase tracking-widest text-emerald-900">
                        Add-ons ({relatedItems.find((i) => i.addOnNote)?.addOnNote ?? "extra"})
                      </td>
                      <td className="px-6 py-2.5 text-right text-sm font-black tabular-nums text-emerald-700">
                        +{formatCurrency(totalAddOn)}
                      </td>
                    </tr>
                  )}
                  {relatedItems.some((i) => i.deliveryMethodId || i.deliveryMethodName) && (
                    <tr className="bg-teal-50 border-b border-teal-100">
                      <td colSpan={2} className="px-6 py-2.5 text-right text-xs font-extrabold uppercase tracking-widest text-teal-900">
                        Delivery (
                        {relatedItems.find((i) => i.deliveryMethodName)?.deliveryMethodName ??
                          "carrier"}
                        )
                      </td>
                      <td className="px-6 py-2.5 text-right text-sm font-black tabular-nums text-teal-800">
                        +{formatCurrency(totalDelivery)}
                      </td>
                    </tr>
                  )}
                  <tr className="border-t-2 border-gray-200 bg-white">
                    <td colSpan={2} className="px-6 py-4 text-right text-sm font-black text-gray-900 uppercase tracking-widest">
                      Grand total
                    </td>
                    <td className="px-6 py-4 text-right text-2xl font-black tabular-nums text-green-600">
                      {formatCurrency(grandTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {currentOrder.notes && (
            <div className="mt-6 p-4 rounded-lg bg-amber-50 border border-amber-100">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-1">Customer Note</h4>
              <p className="text-sm font-medium text-amber-900 italic">"{currentOrder.notes}"</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export default memo(OrderDetailPage);
