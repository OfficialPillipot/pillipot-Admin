import { memo } from "react";
import { useParams, Link } from "react-router";
import { useAppSelector } from "../store/hooks";
import { selectOrders } from "../store/ordersSlice";
import { selectProducts } from "../store/productsSlice";
import { Card, Badge } from "../components/ui";
import { formatDateTime, formatCurrency } from "../lib/orderUtils";

function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const allOrders = useAppSelector(selectOrders);
  const currentOrder = allOrders.find((o) => o.id === id);
  const relatedItems = allOrders.filter(
    (o) => currentOrder && o.orderId === currentOrder.orderId
  );
  const products = useAppSelector(selectProducts);

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
          variant={
            currentOrder.status === "delivered"
              ? "success"
              : currentOrder.status === "cancelled"
                ? "error"
                : currentOrder.status === "dispatch"
                  ? "info"
                  : "warning"
          }
          className="px-4 py-1 text-xs font-bold uppercase tracking-wider"
        >
          {currentOrder.status}
        </Badge>
      </div>

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
            </div>
            {currentOrder.trackingId && (
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Tracking Number</span>
                <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded font-mono text-sm font-bold border border-indigo-100">
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
                    <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Phone</dt>
                    <dd className="font-semibold text-gray-700">{currentOrder.phone}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Order Type</dt>
                    <dd className="font-bold text-indigo-600 tracking-wide">{currentOrder.orderType.toUpperCase()}</dd>
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
                    const pName = products.find((p) => p.id === item.productId)?.name ?? item.productId;
                    return (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-800">{pName}</div>
                          {(item.addOnAmount || item.addOnNote) && (
                            <div className="mt-1 text-[10px] text-green-600 font-bold flex items-center gap-1.5 bg-green-50 px-2 py-0.5 rounded w-fit border border-green-100">
                              <span className="uppercase tracking-tighter">Add-on:</span>
                              <span className="font-medium italic">{item.addOnNote || "Extra"} ({formatCurrency(item.addOnAmount || 0)})</span>
                            </div>
                          )}
                          <div className="text-[10px] text-gray-400 font-mono mt-0.5">{item.productId.slice(0, 8)}...</div>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-gray-700">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 text-right font-black tabular-nums text-indigo-700">
                          {formatCurrency(item.sellingAmount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50/60 font-medium">
                  {totalDiscount > 0 && (
                    <tr>
                      <td colSpan={2} className="px-6 py-1.5 text-right text-xs font-bold text-gray-400 uppercase tracking-widest">Total Discount</td>
                      <td className="px-6 py-1.5 text-right text-sm font-bold text-red-500">-{formatCurrency(totalDiscount)}</td>
                    </tr>
                  )}
                  {totalAddOn > 0 && (
                    <tr>
                      <td colSpan={2} className="px-6 py-1.5 text-right text-xs font-bold text-gray-400 uppercase tracking-widest">Add-ons ({relatedItems.find(i=>i.addOnNote)?.addOnNote})</td>
                      <td className="px-6 py-1.5 text-right text-sm font-bold text-green-600">+{formatCurrency(totalAddOn)}</td>
                    </tr>
                  )}
                  <tr className="border-t-2 border-gray-200">
                    <td colSpan={2} className="px-6 py-4 text-right text-sm font-black text-gray-900 uppercase tracking-widest">Grand Total</td>
                    <td className="px-6 py-4 text-right text-2xl font-black tabular-nums text-green-600">
                      {formatCurrency(totalSelling)}
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
