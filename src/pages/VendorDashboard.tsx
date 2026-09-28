import { useState, useMemo, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router";
import {
  Button,
  Card,
  CardHeader,
  Modal,
  Table,
  type Column,
} from "../components/ui";
import {
  ClockIcon,
  TruckIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  Squares2X2Icon,
  ClipboardDocumentListIcon,
  PhotoIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../context/AuthContext";
import {
  useGetVendorPortalOrdersQuery,
  useGetVendorPortalProductsQuery,
  useGetVendorPortalProfileQuery,
  useUpdateVendorPortalOrderStatusMutation,
} from "../store/api/edenApi";
import { isCompletedOrCodOrder } from "../lib/orderUtils";
import {
  dispatchNotificationsRefresh,
  dispatchSidebarVendorOrdersRefresh,
} from "../lib/header-notifications";
import { toast } from "../lib/toast";
import type { Order } from "../types";

function getPendingTimeRemaining(createdAt: string): { hours: number; mins: number; isExpired: boolean; text: string } {
  const created = new Date(createdAt).getTime();
  const expiresAt = created + 24 * 60 * 60 * 1000;
  const diff = expiresAt - Date.now();
  if (diff <= 0) {
    return { hours: 0, mins: 0, isExpired: true, text: "24h window passed" };
  }
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { hours, mins, isExpired: false, text: `${hours}h ${mins}m left` };
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (isNaN(diff) || diff < 0) return "just now";
  const mins = Math.floor(diff / (1000 * 60));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function VendorDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Queries
  const { data: allOrders = [], isLoading: isLoadingOrders } = useGetVendorPortalOrdersQuery();
  const { data: products = [], isLoading: isLoadingProducts } = useGetVendorPortalProductsQuery();
  const { data: vendorProfile, refetch: refetchProfile } = useGetVendorPortalProfileQuery(undefined, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  });

  // Listen for admin toggle events across browser tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "pillipot_vendor_store_updated") {
        void refetchProfile();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [refetchProfile]);

  // Notify when store is re-enabled by admin while vendor is on the page
  const prevDisabledRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (vendorProfile?.storeDisabledByAdmin !== undefined) {
      if (prevDisabledRef.current === true && !vendorProfile.storeDisabledByAdmin) {
        toast.success("Store Activated! The administrator has re-enabled your store. Your products are back in stock.");
      }
      prevDisabledRef.current = Boolean(vendorProfile.storeDisabledByAdmin);
    }
  }, [vendorProfile?.storeDisabledByAdmin]);

  // Store active status (defaults to true if undefined)
  const isStoreActive = vendorProfile?.isStoreActive !== undefined
    ? vendorProfile.isStoreActive
    : (vendorProfile?.isActive !== false);

  const isStoreDisabledByAdmin = Boolean(vendorProfile?.storeDisabledByAdmin);

  // Valid orders (completed online payment or COD)
  const validOrders = useMemo(() => {
    return allOrders.filter(isCompletedOrCodOrder);
  }, [allOrders]);

  // 1. Pending orders to accept: status === "pending"
  const pendingAcceptOrders = useMemo(() => {
    return validOrders.filter((o) => o.status === "pending");
  }, [validOrders]);

  // 2. Pending orders for pickup: strictly status === "accepted" (as requested)
  const pendingPickupOrders = useMemo(() => {
    return validOrders.filter((o) => o.status === "accepted");
  }, [validOrders]);

  const [updateOrderStatus] = useUpdateVendorPortalOrderStatusMutation();
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);
  const [cancelRemark, setCancelRemark] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  // Store disabled notice modal (after 2 consecutive cancellations)
  const [storeDisabledModalOpen, setStoreDisabledModalOpen] = useState(false);
  const [storeDisabledReason, setStoreDisabledReason] = useState("");

  const handleAcceptOrder = async (id: string, orderId: string) => {
    setUpdatingOrderId(id);
    try {
      await updateOrderStatus({ id, status: "accepted" }).unwrap();
      toast.success(`Order #${orderId} accepted successfully!`);
      dispatchNotificationsRefresh();
      dispatchSidebarVendorOrdersRefresh();
    } catch (err) {
      toast.fromError(err, "Failed to accept order");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const openCancelModal = (order: Order) => {
    setCancelRemark("");
    setCancelModalOrder(order);
  };

  const closeCancelModal = () => {
    if (isCancelling) return;
    setCancelModalOrder(null);
    setCancelRemark("");
  };

  const handleConfirmCancel = async () => {
    if (!cancelModalOrder) return;
    if (!cancelRemark.trim()) {
      toast.error("Please enter a remark to cancel this order.");
      return;
    }
    setIsCancelling(true);
    try {
      const res = await updateOrderStatus({
        id: cancelModalOrder.id,
        status: "cancelled",
        remark: cancelRemark.trim(),
      }).unwrap();

      const cancelledOrderId = cancelModalOrder.orderId;
      setCancelModalOrder(null);
      setCancelRemark("");

      // Check if this cancellation triggered automatic store deactivation (2 consecutive cancellations)
      const wasStoreDisabled =
        Boolean((res as any)?.storeDisabled) ||
        Boolean(res?.notes?.includes("[Store Disabled")) ||
        Boolean(res?.notes?.includes("Store Disabled"));

      // Instantly refetch vendor profile to guarantee zero delay / no refresh needed
      const profileResult = await refetchProfile();
      const isNowDisabled = wasStoreDisabled || Boolean(profileResult?.data?.storeDisabledByAdmin);

      if (isNowDisabled) {
        const reason =
          (res as any)?.storeDisabledReason ||
          profileResult?.data?.storeDisabledReason ||
          "Two consecutive orders were cancelled without accepting an order in between.";
        setStoreDisabledReason(reason);
        setStoreDisabledModalOpen(true);
      } else {
        toast.success(`Order #${cancelledOrderId} cancelled.`);
      }

      dispatchNotificationsRefresh();
      dispatchSidebarVendorOrdersRefresh();
    } catch (err) {
      toast.fromError(err, "Failed to cancel order");
    } finally {
      setIsCancelling(false);
    }
  };

  // Earliest received orders shown first (FIFO: oldest orders at the top, latest orders after)
  const unacceptedOrders = useMemo(() => {
    return [...validOrders]
      .filter((o) => o.status === "pending")
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [validOrders]);

  const productMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const p of products) {
      if (p.id) map.set(p.id, p);
    }
    return map;
  }, [products]);

  const columns: Column<Order>[] = useMemo(
    () => [
      {
        key: "orderId",
        header: "Order ID",
        mobileCardTitle: true,
        className: "whitespace-nowrap w-[130px]",
        render: (row) => (
          <div className="whitespace-nowrap">
            <span className="font-mono font-bold text-text-heading whitespace-nowrap">#{row.orderId}</span>
            <p className="text-[11px] text-text-muted whitespace-nowrap">{timeAgo(row.createdAt)}</p>
          </div>
        ),
      },
      {
        key: "deadline",
        header: "24h Window",
        className: "whitespace-nowrap w-[170px]",
        render: (row) => {
          const timer = getPendingTimeRemaining(row.createdAt);
          return (
            <div className="space-y-1 whitespace-nowrap">
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${timer.isExpired
                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300"
                  : timer.hours <= 4
                    ? "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300 ring-1 ring-amber-400/50"
                    : "bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300"
                  }`}
              >
                <ClockIcon className="h-3.5 w-3.5" />
                {timer.text}
              </span>
              <p className="text-[11px] text-text-muted whitespace-nowrap">
                Received: {new Date(row.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })},{" "}
                {new Date(row.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}
              </p>
            </div>
          );
        },
      },
      {
        key: "productDetails",
        header: "Product Details",
        className: "w-[260px] max-w-[280px]",
        render: (row) => {
          const product = productMap.get(row.productId) || (row as any).product;
          const productName =
            product?.name ||
            (row as any).product?.name ||
            row.productName ||
            (row.productId ? `Product #${row.productId.slice(0, 8)}` : "Product");
          const productImage =
            product?.images?.[0] ||
            product?.imageUrl ||
            (row as any).product?.imageUrl ||
            (row as any).product?.images?.[0] ||
            null;
          const productCode = product?.productCode || (row as any).product?.productCode || null;
          const categoryName = product?.categoryEntity?.name || product?.category || (row as any).product?.category || null;

          return (
            <div className="flex items-start gap-2.5 max-w-[280px]">
              <div className="relative h-11 w-11 shrink-0 rounded-lg overflow-hidden border border-border bg-surface-alt flex items-center justify-center">
                {productImage ? (
                  <img
                    src={productImage}
                    alt={productName}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <ShoppingBagIcon className="h-5 w-5 text-text-muted/60" />
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="font-semibold text-text-heading text-sm line-clamp-1" title={productName}>
                  {productName}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-text-muted flex-wrap">
                  {productCode && (
                    <span className="font-mono bg-surface-alt px-1.5 py-0.2 rounded border border-border text-[10px]">
                      {productCode}
                    </span>
                  )}
                  {categoryName && (
                    <span className="truncate max-w-[120px]">{categoryName}</span>
                  )}
                </div>
                {(row.customText || row.customPhotoUrl || row.notes) && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-purple-100 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      ✨ Custom
                    </span>
                    {row.customText && (
                      <span className="text-[11px] text-purple-900 dark:text-purple-200 italic font-medium truncate max-w-[160px]" title={row.customText}>
                        &ldquo;{row.customText}&rdquo;
                      </span>
                    )}
                    {row.customPhotoUrl && (
                      <a
                        href={row.customPhotoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] text-purple-700 dark:text-purple-300 font-bold underline inline-flex items-center gap-0.5 hover:text-purple-900"
                        title="View customer photo"
                      >
                        <PhotoIcon className="h-3 w-3" /> Photo
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        },
      },
      {
        key: "amount",
        header: "Amount & Payment",
        className: "whitespace-nowrap w-[160px]",
        render: (row) => (
          <div className="space-y-1 whitespace-nowrap">
            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="font-bold text-text-heading text-sm whitespace-nowrap">
                ₹{row.sellingAmount?.toLocaleString("en-IN")}
              </span>
              <span className="text-xs text-text-muted whitespace-nowrap">
                ({row.quantity} {row.quantity === 1 ? "item" : "items"})
              </span>
            </div>
            <div>
              <span
                className={`font-semibold uppercase text-[10px] px-1.5 py-0.5 rounded ${row.paymentMethod === "cod"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-900"
                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900"
                  }`}
              >
                {row.paymentMethod === "cod" ? "COD" : "Online Paid"}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: "actions",
        header: "Action",
        mobileHeaderEnd: true,
        className: "text-right whitespace-nowrap",
        render: (row) => (
          <div className="flex items-center gap-2 justify-end whitespace-nowrap">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void handleAcceptOrder(row.id, row.orderId);
              }}
              disabled={updatingOrderId === row.id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              title="Accept order"
            >
              <CheckCircleIcon className="h-4 w-4" />
              {updatingOrderId === row.id ? "Accepting..." : "Accept"}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openCancelModal(row);
              }}
              disabled={updatingOrderId === row.id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              title="Cancel order with remark"
            >
              <XCircleIcon className="h-4 w-4" />
              Cancel
            </button>
          </div>
        ),
      },
    ],
    [updatingOrderId, productMap],
  );

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div>
        <p className="text-sm font-medium text-text-muted">Welcome Back to your store,</p>
        <div className="flex items-center gap-2.5 mt-0.5">
          <h2 className="text-2xl font-bold text-text-heading capitalize">{user?.name}</h2>
          <span
            className={`inline-block h-3 w-3 rounded-full shrink-0 ${isStoreDisabledByAdmin
              ? "bg-rose-600 ring-2 ring-rose-600/30"
              : isStoreActive
                ? "bg-emerald-500 animate-pulse ring-2 ring-emerald-500/20"
                : "bg-rose-500 ring-2 ring-rose-500/20"
              }`}
            title={
              isStoreDisabledByAdmin
                ? `The store has been disabled${vendorProfile?.storeDisabledReason ? `: ${vendorProfile.storeDisabledReason}` : " by admin"}`
                : isStoreActive
                  ? "Store is Active"
                  : "Store is Inactive"
            }
          />
        </div>

        {/* Inactive store warning alert banner */}
        {isStoreDisabledByAdmin ? (
          <div className="mt-3 p-3.5 rounded-xl border border-rose-300 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-900 flex items-center justify-between text-xs text-rose-900 dark:text-rose-200">
            <div className="flex items-center gap-2 font-medium">
              <ExclamationTriangleIcon className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>
                <strong>Store Disabled:</strong>{" "}
                {vendorProfile?.storeDisabledReason || "The store has been disabled by admin."}{" "}
                Please contact admin to re-enable your store. Your products are currently displayed as{" "}
                <strong>Out of Stock</strong> on the web app.
              </span>
            </div>
          </div>
        ) : !isStoreActive ? (
          <div className="mt-3 p-3.5 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-900 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2 font-medium">
              <ExclamationTriangleIcon className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Store is currently Paused:</strong> Your products are currently displayed as <strong>Out of Stock</strong> on the web app. Turn the switch in the header back on whenever you are ready to resume sales.
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Interactive Metric Boxes (Click to navigate with filter applied) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Box 1: Pending Orders to Accept -> Navigates to /vendor/orders?status=pending */}
        <Link
          to="/vendor/orders?status=pending"
          className="group relative p-5 rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50/50 via-white to-orange-50/20 hover:border-amber-500 hover:shadow-md hover:-translate-y-0.5 transition-all block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
              Orders to Accept
            </span>
            <span className="p-2.5 rounded-xl bg-amber-100 text-amber-700 group-hover:bg-amber-200 group-hover:text-amber-900 transition-colors">
              <ClockIcon className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-text-heading group-hover:text-amber-700 transition-colors">
              {isLoadingOrders ? "..." : pendingAcceptOrders.length}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              Pending
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-amber-100 flex items-center justify-between text-xs font-bold text-amber-700 group-hover:text-amber-900">
            <span>View & accept orders</span>
            <ArrowRightIcon className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Box 2: Pending Orders for Pickup -> Navigates to /vendor/orders?status=accepted */}
        <Link
          to="/vendor/orders?status=accepted"
          className="group relative p-5 rounded-2xl border border-sky-300 bg-gradient-to-br from-sky-50/50 via-white to-blue-50/20 hover:border-sky-500 hover:shadow-md hover:-translate-y-0.5 transition-all block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-800">
              Orders for Pickup
            </span>
            <span className="p-2.5 rounded-xl bg-sky-100 text-sky-700 group-hover:bg-sky-200 group-hover:text-sky-900 transition-colors">
              <TruckIcon className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-text-heading group-hover:text-sky-700 transition-colors">
              {isLoadingOrders ? "..." : pendingPickupOrders.length}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
              Accepted
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-sky-100 flex items-center justify-between text-xs font-bold text-sky-700 group-hover:text-sky-900">
            <span>View pickup orders</span>
            <ArrowRightIcon className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Box 3: My Products -> Navigates to /vendor/products */}
        <Link
          to="/vendor/products"
          className="group relative p-5 rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/20 hover:border-emerald-500 hover:shadow-md hover:-translate-y-0.5 transition-all block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Active Products
            </span>
            <span className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200 group-hover:text-emerald-900 transition-colors">
              <Squares2X2Icon className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-text-heading group-hover:text-emerald-700 transition-colors">
              {isLoadingProducts ? "..." : products.length}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              In Catalog
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-emerald-100 flex items-center justify-between text-xs font-bold text-emerald-700 group-hover:text-emerald-900">
            <span>Manage products</span>
            <ArrowRightIcon className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Box 4: Total Orders -> Navigates to /vendor/orders */}
        <Link
          to="/vendor/orders"
          className="group relative p-5 rounded-2xl border border-purple-300 bg-gradient-to-br from-purple-50/50 via-white to-indigo-50/20 hover:border-purple-500 hover:shadow-md hover:-translate-y-0.5 transition-all block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-800">
              Order History
            </span>
            <span className="p-2.5 rounded-xl bg-purple-100 text-purple-700 group-hover:bg-purple-200 group-hover:text-purple-900 transition-colors">
              <ClipboardDocumentListIcon className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-text-heading group-hover:text-purple-700 transition-colors">
              {isLoadingOrders ? "..." : validOrders.length}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
              Total
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-purple-100 flex items-center justify-between text-xs font-bold text-purple-700 group-hover:text-purple-900">
            <span>View full orders list</span>
            <ArrowRightIcon className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Not Accepted Orders Section (First received orders shown first - Direct Accept & Cancel) */}
      <Card>
        <CardHeader
          title="Pending orders"
          action={
            unacceptedOrders.length > 0 ? (
              <Link
                to="/vendor/orders?status=pending"
                className="inline-flex items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-3 py-1 text-xs font-bold hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors"
                title="View all pending orders"
              >
                {unacceptedOrders.length} pending
              </Link>
            ) : null
          }
        />
        <div
          onClick={(e) => {
            const target = e.target as HTMLElement | null;
            if (target?.closest("button") || target?.closest("a")) {
              return;
            }
            navigate("/vendor/orders?status=pending");
          }}
          className="cursor-pointer"
          title="Click to view pending orders in Orders page"
        >
          <Table<Order>
            columns={columns}
            data={unacceptedOrders}
            keyExtractor={(o) => o.id}
            emptyMessage="No unaccepted orders. All received orders have been processed."
            isLoading={isLoadingOrders}
          />
        </div>
      </Card>

      {/* Cancel Order Modal */}
      <Modal
        isOpen={Boolean(cancelModalOrder)}
        onClose={closeCancelModal}
        title={`Cancel Order #${cancelModalOrder?.orderId}`}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="secondary"
              onClick={closeCancelModal}
              disabled={isCancelling}
            >
              Back
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmCancel}
              loading={isCancelling}
            >
              Confirm Cancel
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-text-muted">
            Please enter a reason for cancelling order{" "}
            <strong className="text-text-heading">#{cancelModalOrder?.orderId}</strong>.
            This remark will be recorded on the order.
          </p>
          <div>
            <label className="block text-xs font-medium text-text-heading mb-1.5">
              Cancellation Remark <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={cancelRemark}
              onChange={(e) => setCancelRemark(e.target.value)}
              placeholder="e.g. Item out of stock, unable to fulfill..."
              rows={3}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-heading placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </Modal>



      {/* Informational Modal for Automatic Store Deactivation (2 consecutive cancellations) */}
      <Modal
        isOpen={storeDisabledModalOpen}
        onClose={() => setStoreDisabledModalOpen(false)}
        title="Store Deactivated"
        size="md"
        footer={
          <div className="flex items-center justify-end">
            <Button
              variant="primary"
              className="px-6 py-2"
              onClick={() => setStoreDisabledModalOpen(false)}
            >
              OK
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-rose-100 dark:bg-rose-950/60 rounded-full text-rose-600 dark:text-rose-400 shrink-0">
              <ExclamationTriangleIcon className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-text-heading">
                Store Automatically Set to Inactive
              </h4>
              <p className="text-xs text-text-muted leading-relaxed">
                Your store has been deactivated because{" "}
                <span className="font-semibold text-rose-600 dark:text-rose-400">
                  {storeDisabledReason || "two consecutive orders were cancelled without accepting an order in between."}
                </span>
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/80 dark:bg-rose-950/30 p-3.5 space-y-2 text-xs text-rose-900 dark:text-rose-200">
            <div className="font-semibold">⚠️ Notice:</div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-800 dark:text-rose-300">
              <li>All products in your catalog are now marked as <strong>Out of Stock</strong> on the web app.</li>
              <li>Customers can no longer place orders with your store.</li>
              <li>The store status switch is disabled until re-enabled by admin.</li>
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-surface-alt p-3.5 space-y-1 text-xs text-text-heading">
            <p className="font-semibold text-primary">How to reactivate your store:</p>
            <p className="text-[11px] text-text-muted leading-relaxed">
              Please <strong>contact admin for active your store back</strong>. Once reviewed and approved by the admin team, your store and products will be restored to active status.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default VendorDashboardPage;
