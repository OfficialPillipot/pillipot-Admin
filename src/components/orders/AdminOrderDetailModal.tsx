import { memo, useCallback } from "react";
import { Badge, Button, Modal } from "../ui";
import type { Order, Product, Staff } from "../../types";
import { orderLineProductLabel } from "../../lib/orderUtils";
import type { GroupedAdminOrder } from "./adminOrderManagementUtils";
import { discountDisplay, safeMoney } from "./adminOrderManagementUtils";
import { 
  SparklesIcon, 
  PhotoIcon, 
  DocumentTextIcon, 
  ArrowDownTrayIcon, 
  ArrowTopRightOnSquareIcon 
} from "@heroicons/react/24/outline";
import { toast } from "../../lib/toast";

export type AdminOrderDetailModalProps = {
  orderDetail: GroupedAdminOrder | null;
  onClose: () => void;
  products: Product[];
  staff: Staff[];
  sortedOrderLines: Order[];
  discountEditable: boolean;
  discountDraft: string;
  onDiscountDraftChange: (v: string) => void;
  savingDiscount: boolean;
  onSaveDiscount: () => void;
  trackingDraft: string;
  onTrackingDraftChange: (v: string) => void;
  onTrackingBlur: () => void;
  onCancelOrder: () => void;
  onReturn: () => void;
  onMarkPacked: () => void;
  onMoveToDispatch: () => void;
  onConfirmDelivered: () => void;
  markingPacked: boolean;
  dispatching: boolean;
  returning: boolean;
};

function AdminOrderDetailModalComponent({
  orderDetail,
  onClose,
  products,
  staff,
  sortedOrderLines,
  discountEditable,
  discountDraft,
  onDiscountDraftChange,
  savingDiscount,
  onSaveDiscount,
  trackingDraft,
  onTrackingDraftChange,
  onTrackingBlur,
  onCancelOrder,
  onReturn,
  onMarkPacked,
  onMoveToDispatch,
  onConfirmDelivered,
  markingPacked,
  dispatching,
  returning,
}: AdminOrderDetailModalProps) {
  const isOpen = !!orderDetail;

  const handleDownloadCustomerImage = useCallback(async (imageUrl: string, orderId: string) => {
    try {
      toast.info("Downloading customer photo...");
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `customer_photo_${orderId}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Photo downloaded successfully");
    } catch {
      window.open(imageUrl, "_blank");
    }
  }, []);

  const personalizedLines = sortedOrderLines.filter(
    (l) => l.customPhotoUrl || l.customText || l.notes
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={orderDetail?.orderId ?? "Order"}
      size="lg"
    >
      {orderDetail && (
        <div className="space-y-4">
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">
                Customer Name
              </dt>
              <dd className="font-medium">{orderDetail.customerName}</dd>
            </div>
            <div>
              <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">
                Phone Number
              </dt>
              <dd>{orderDetail.phone}</dd>
            </div>
            {orderDetail.secondaryPhone && (
              <div>
                <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">
                  Secondary Phone
                </dt>
                <dd>{orderDetail.secondaryPhone}</dd>
              </div>
            )}
            <div>
              <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">
                Building/Street
              </dt>
              <dd>{orderDetail.deliveryAddress}</dd>
            </div>
            <div>
              <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">
                Post Office
              </dt>
              <dd>{orderDetail.postOffice}</dd>
            </div>
            <div>
              <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">
                District
              </dt>
              <dd>{orderDetail.district}</dd>
            </div>
            <div>
              <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">
                State
              </dt>
              <dd>{orderDetail.state}</dd>
            </div>
            <div>
              <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">
                Pincode
              </dt>
              <dd>{orderDetail.pincode}</dd>
            </div>
            {/* Customer Personalization Details Section */}
            {personalizedLines.length > 0 && (
              <div className="sm:col-span-2 rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50/50 via-white to-indigo-50/30 p-4 sm:p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-purple-100 pb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-600 text-white shadow-xs">
                      <SparklesIcon className="h-4 w-4" />
                    </span>
                    <div>
                      <h4 className="text-sm font-black text-purple-950">Customer Personalization Details</h4>
                      <p className="text-[11px] text-purple-700 font-medium">Customer-submitted customization for this order</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-purple-300 bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-800">
                    Personalized Order
                  </span>
                </div>

                <div className="space-y-4">
                  {personalizedLines.map((line, idx) => (
                    <div key={line.id || idx} className="space-y-3 p-3 bg-white/80 rounded-xl border border-purple-100">
                      {personalizedLines.length > 1 && (
                        <div className="text-xs font-bold text-purple-900 border-b border-purple-50 pb-1">
                          Line #{idx + 1}: {orderLineProductLabel(line, products)}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {line.customText && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1">
                              <DocumentTextIcon className="h-3.5 w-3.5 text-purple-600" />
                              Custom Inscription / Text
                            </span>
                            <div className="p-2.5 bg-purple-50/50 rounded-lg border border-purple-200 font-serif text-sm font-bold text-purple-950 italic break-words">
                              &ldquo;{line.customText}&rdquo;
                            </div>
                          </div>
                        )}

                        {line.notes && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1">
                              <DocumentTextIcon className="h-3.5 w-3.5 text-purple-600" />
                              Customer Note / Special Instructions
                            </span>
                            <div className="p-2.5 bg-amber-50/50 rounded-lg border border-amber-200 text-xs text-slate-800 font-medium whitespace-pre-wrap break-words">
                              {line.notes}
                            </div>
                          </div>
                        )}
                      </div>

                      {line.customPhotoUrl && (
                        <div className="space-y-2 pt-2 border-t border-purple-50">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1">
                            <PhotoIcon className="h-3.5 w-3.5 text-purple-600" />
                            Uploaded Customer Image
                          </span>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-50 p-3 rounded-xl border border-purple-200">
                            <div className="relative h-24 w-24 shrink-0 rounded-lg overflow-hidden border-2 border-purple-300 bg-white">
                              <img
                                src={line.customPhotoUrl}
                                alt="Customer Personalization"
                                className="h-full w-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => window.open(line.customPhotoUrl!, "_blank")}
                                title="Click to view full image"
                              />
                            </div>
                            <div className="flex-1 space-y-2">
                              <p className="text-xs text-slate-500">
                                Download the customer photo for printing, engraving, or crafting.
                              </p>
                              <div className="flex flex-wrap items-center gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="primary"
                                  icon={<ArrowDownTrayIcon className="h-3.5 w-3.5" />}
                                  onClick={() => handleDownloadCustomerImage(line.customPhotoUrl!, orderDetail?.orderId || "order")}
                                >
                                  Download Image
                                </Button>
                                <a
                                  href={line.customPhotoUrl}
                                  download={`customer_photo_${orderDetail?.orderId || "order"}.jpg`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors"
                                >
                                  <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                                  Direct Link / View Full
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="sm:col-span-2 border-t pt-4 mt-2">
              <dt className="text-text-muted mb-2 text-xs uppercase tracking-wider font-bold">
                Order Items
              </dt>
              <dd className="space-y-2">
                {(() => {
                  const od = orderDetail as (Order & {
                    items?: {
                      id: string;
                      productId: string;
                      quantity: number;
                      sellingAmount: unknown;
                    }[];
                  }) | null;
                  const itemRows =
                    od?.items?.length ?
                      od.items
                    : od ?
                      [
                        {
                          id: od.id,
                          productId: od.productId,
                          quantity: od.quantity,
                          sellingAmount: od.sellingAmount,
                        },
                      ]
                    : [];
                  return (
                    <div className="space-y-2 sm:hidden">
                      {itemRows.map((item) => {
                        const nm = orderLineProductLabel(
                          item as Order,
                          products,
                        );
                        return (
                          <div
                            key={item.id}
                            className="rounded-xl border border-border bg-surface px-3 py-2.5 shadow-[var(--shadow-card)]"
                          >
                            <div className="font-semibold text-text-heading">
                              {nm}
                            </div>
                            <dl className="mt-2 space-y-1.5 text-xs">
                              <div className="flex justify-between gap-2">
                                <dt className="text-text-muted">Qty</dt>
                                <dd className="font-mono font-semibold">
                                  {item.quantity}
                                </dd>
                              </div>
                              <div className="flex justify-between gap-2">
                                <dt className="text-text-muted">Price</dt>
                                <dd className="font-semibold text-primary">
                                  ₹{safeMoney(item.sellingAmount).toFixed(2)}
                                </dd>
                              </div>
                            </dl>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
                <div className="hidden sm:block overflow-hidden rounded-lg border border-gray-100 shadow-sm">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-gray-500 font-bold">
                      <tr>
                        <th className="px-3 py-2 text-left">Product</th>
                        <th className="px-3 py-2 text-center">Qty</th>
                        <th className="px-3 py-2 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {orderDetail?.items?.map((item) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2 font-medium">
                            <div>
                              {orderLineProductLabel(item as Order, products)}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-gray-600">
                            {item.quantity}
                          </td>
                          <td className="px-3 py-2 text-right font-black text-primary">
                            ₹{safeMoney(item.sellingAmount).toFixed(2)}
                          </td>
                        </tr>
                      )) ?? (
                        <tr>
                          <td className="px-3 py-2 font-medium">
                            <div>
                              {orderDetail ? orderLineProductLabel(
                                orderDetail as Order,
                                products,
                              ) : "—"}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-gray-600">
                            {orderDetail.quantity}
                          </td>
                          <td className="px-3 py-2 text-right font-black text-primary">
                            ₹{safeMoney(orderDetail.sellingAmount).toFixed(2)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="border-t border-gray-100">
                      <tr className="bg-gray-50/90">
                        <td
                          colSpan={2}
                          className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-gray-500"
                        >
                          Items subtotal
                        </td>
                        <td className="px-3 py-2 text-right font-black text-primary-dark">
                          ₹{safeMoney(orderDetail.sellingAmount).toFixed(2)}
                        </td>
                      </tr>
                      {sortedOrderLines.some(
                        (l) => l.deliveryMethodId || l.deliveryMethodName,
                      ) ? (
                        <tr className="bg-teal-50 border-y border-teal-100">
                          <td
                            colSpan={2}
                            className="px-3 py-2.5 text-right text-[10px] font-extrabold uppercase tracking-wider text-teal-900"
                          >
                            Delivery (
                            {sortedOrderLines.find((l) => l.deliveryMethodName)
                              ?.deliveryMethodName ?? "carrier"}
                            )
                          </td>
                          <td className="px-3 py-2.5 text-right text-sm font-black tabular-nums text-teal-800">
                            ₹
                            {safeMoney(orderDetail.deliveryFeesTotal).toFixed(
                              2,
                            )}
                          </td>
                        </tr>
                      ) : null}
                      <tr className="border-t-2 border-gray-200 bg-white">
                        <td
                          colSpan={2}
                          className="px-3 py-2.5 text-right text-[10px] font-black uppercase tracking-wider text-gray-900"
                        >
                          Grand total
                        </td>
                        <td className="px-3 py-2.5 text-right font-black text-earnings">
                          ₹
                          {safeMoney(
                            orderDetail.grandTotal ?? orderDetail.sellingAmount,
                          ).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </dd>
            </div>
            <div>
              <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">
                Order Type
              </dt>
              <dd>
                <Badge variant="default">
                  {orderDetail.orderType.toUpperCase()}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">
                Discount
              </dt>
              <dd>{discountDisplay(orderDetail.discountAmount) ?? "—"}</dd>
            </div>
            {sortedOrderLines.some(
              (l) => l.deliveryMethodId || l.deliveryMethodName,
            ) ? (
              <div>
                <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">
                  Delivery
                </dt>
                <dd className="font-medium text-teal-800">
                  {sortedOrderLines.find((l) => l.deliveryMethodName)
                    ?.deliveryMethodName ?? "—"}{" "}
                  — ₹
                  {sortedOrderLines
                    .reduce((s, l) => s + safeMoney(l.deliveryFee), 0)
                    .toFixed(2)}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">
                Total Amount
              </dt>
              <dd className="font-medium text-earnings">
                ₹
                {safeMoney(
                  orderDetail.grandTotal ?? orderDetail.sellingAmount,
                ).toFixed(2)}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">
                Payment Info
              </dt>
              <dd className="flex flex-col gap-1">
                <Badge variant="default">
                  {(orderDetail.paymentMethod || "cod").toUpperCase()}
                </Badge>
                <Badge 
                  variant={
                    orderDetail.paymentStatus === "paid" ? "success" 
                    : orderDetail.paymentStatus === "failed" ? "error" 
                    : "warning"
                  }
                >
                  {(orderDetail.paymentStatus || "pending").toUpperCase()}
                </Badge>
              </dd>
            </div>
            {discountEditable ? (
              <div className="sm:col-span-2 rounded-[var(--radius-md)] border border-border bg-surface-alt p-3">
                <dt className="text-text-muted mb-2 text-xs uppercase tracking-wider">
                  Edit discount (admin)
                </dt>
                <dd className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-text-muted">₹</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="w-32 rounded-[var(--radius-sm)] border border-border px-2 py-1.5 text-sm"
                      value={discountDraft}
                      onChange={(e) => onDiscountDraftChange(e.target.value)}
                      placeholder="0"
                      aria-label="Discount amount"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void onSaveDiscount()}
                    loading={savingDiscount}
                  >
                    Apply discount
                  </Button>
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">
                Current Status
              </dt>
              <dd>
                <span className="capitalize font-medium">
                  {orderDetail.status}
                </span>
              </dd>
            </div>
            {(orderDetail.status === "delivered" ||
              orderDetail.status === "cancelled" ||
              orderDetail.status === "returned") &&
            orderDetail.trackingId?.trim() ? (
              <div>
                <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">
                  Tracking ID
                </dt>
                <dd className="font-mono text-sm">
                  {orderDetail.trackingId.trim()}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">
                Assigned #
              </dt>
              <dd className="font-mono text-sm">
                {orderDetail.staffAssignedNumber?.trim() || "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">
                Staff Details
              </dt>
              <dd>
                {staff.find((s) => s.id === orderDetail.staffId)?.name ??
                  orderDetail.staffId}
              </dd>
            </div>
            {orderDetail.notes ? (
              <div className="sm:col-span-2">
                <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">
                  Notes
                </dt>
                <dd className="bg-surface-alt p-2 rounded-[var(--radius-sm)] border border-border text-text-muted">
                  {orderDetail.notes}
                </dd>
              </div>
            ) : null}
          </dl>
          {orderDetail.status === "pending" ||
          orderDetail.status === "scheduled" ||
          orderDetail.status === "packed" ? (
            <div className="rounded-[var(--radius-md)] border border-border bg-surface-alt p-3">
              <label
                htmlFor="order-tracking-id"
                className="text-text-muted mb-2 block text-xs font-medium uppercase tracking-wider"
              >
                Tracking ID
              </label>
              <input
                id="order-tracking-id"
                type="text"
                value={trackingDraft}
                onChange={(e) => onTrackingDraftChange(e.target.value)}
                onBlur={() => void onTrackingBlur()}
                placeholder="Enter courier tracking number"
                maxLength={255}
                autoComplete="off"
                className="w-full max-w-md rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-sm"
              />
            </div>
          ) : null}
          {orderDetail.status === "dispatch" &&
          orderDetail.trackingId?.trim() ? (
            <div className="rounded-[var(--radius-md)] border border-border bg-surface-alt p-3">
              <p className="text-text-muted mb-1 text-xs font-medium uppercase tracking-wider">
                Tracking ID
              </p>
              <p className="font-mono text-sm">
                {orderDetail.trackingId.trim()}
              </p>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2 border-t border-border mt-4 pt-4 justify-end">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
            {orderDetail.status === "pending" ||
            orderDetail.status === "scheduled" ||
            orderDetail.status === "packed" ? (
              <Button
                variant="danger"
                size="sm"
                onClick={() => void onCancelOrder()}
              >
                Cancel Order
              </Button>
            ) : null}
            {orderDetail.status === "dispatch" ||
            orderDetail.status === "delivered" ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void onReturn()}
                loading={returning}
              >
                Return
              </Button>
            ) : null}
            {orderDetail.status === "pending" ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => void onMarkPacked()}
                loading={markingPacked}
              >
                Packed
              </Button>
            ) : null}
            {orderDetail.status === "packed" ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => void onMoveToDispatch()}
                loading={dispatching}
              >
                Mark dispatched
              </Button>
            ) : null}
            {orderDetail.status === "dispatch" ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => void onConfirmDelivered()}
                loading={dispatching}
              >
                Mark delivered
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </Modal>
  );
}

export const AdminOrderDetailModal = memo(AdminOrderDetailModalComponent);
