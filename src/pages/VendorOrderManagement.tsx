import { memo, useMemo, useState, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import {
  Card,
  Table,
  TablePagination,
  Badge,
  Button,
  Modal,
  Select,
  Input,
  Tooltip,
} from "../components/ui";
import {
  AdminOrderFilters,
  type MultiSelectOption,
  type SelectOption
} from "../components/orders/AdminOrderFilters";
import { OrderStatusBadge } from "../components/orders/OrderStatusBadge";
import { formatDate } from "../lib/orderUtils";
import { downloadOrderPdf } from "../lib/download-order-pdf";
import {
  useGetVendorPortalOrdersPaginatedQuery,
  useUpdateVendorPortalOrderStatusMutation,
  useGetVendorPortalProductsQuery,
  useGetVendorPortalProfileQuery,
} from "../store/api/edenApi";
import { toast } from "../lib/toast";
import {
  markVendorSidebarOrdersSeen,
  dispatchSidebarVendorOrdersRefresh,
  dispatchNotificationsRefresh,
} from "../lib/header-notifications";
import type { Order, OrderStatus } from "../types";
import {
  ArrowDownTrayIcon,
  SparklesIcon,
  PhotoIcon,
  DocumentTextIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

function getPendingTimeRemaining(createdAt: string): { hours: number; mins: number; isExpired: boolean; text: string } {
  const created = new Date(createdAt).getTime();
  const expiresAt = created + 24 * 60 * 60 * 1000;
  const diff = expiresAt - Date.now();
  if (diff <= 0) {
    return { hours: 0, mins: 0, isExpired: true, text: "24h window passed (Auto-cancelling)" };
  }
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { hours, mins, isExpired: false, text: `${hours}h ${mins}m remaining` };
}

function VendorOrderManagement() {
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Draft filter states (updated in UI controls, applied on clicking Apply or Enter) ──
  const [searchDraft, setSearchDraft] = useState(() => searchParams.get("search") || "");
  const [dateFromDraft, setDateFromDraft] = useState("");
  const [dateToDraft, setDateToDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState<string[]>(() => {
    const s = searchParams.get("status");
    return s ? [s] : [];
  });
  const [productDraft, setProductDraft] = useState<string[]>(() => {
    const pid = searchParams.get("productId");
    return pid ? [pid] : [];
  });
  const [typeDraft, setTypeDraft] = useState("");

  // ── Applied filter states (used for querying server and filtering list) ──
  const [appliedSearch, setAppliedSearch] = useState(() => searchParams.get("search") || "");
  const [appliedDateFrom, setAppliedDateFrom] = useState("");
  const [appliedDateTo, setAppliedDateTo] = useState("");
  const [appliedStatus, setAppliedStatus] = useState<string[]>(() => {
    const s = searchParams.get("status");
    return s ? [s] : [];
  });
  const [appliedProduct, setAppliedProduct] = useState<string[]>(() => {
    const pid = searchParams.get("productId");
    return pid ? [pid] : [];
  });
  const [appliedType, setAppliedType] = useState("");

  // Pagination state (default: 10 items)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const s = searchParams.get("status");
    if (s !== null) {
      const arr = s ? [s] : [];
      setStatusDraft(arr);
      setAppliedStatus(arr);
    }
    const pid = searchParams.get("productId");
    if (pid !== null) {
      const arr = pid ? [pid] : [];
      setProductDraft(arr);
      setAppliedProduct(arr);
    }
    const q = searchParams.get("search");
    if (q !== null) {
      setSearchDraft(q);
      setAppliedSearch(q);
    }
  }, [searchParams]);

  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);

  const queryParams = useMemo(() => {
    const p: Record<string, string | number> = {
      page: currentPage,
      limit: pageSize,
    };
    if (appliedSearch) p.search = appliedSearch;
    if (appliedDateFrom) p.dateFrom = appliedDateFrom;
    if (appliedDateTo) p.dateTo = appliedDateTo;
    if (appliedStatus.length > 0) p.status = appliedStatus.join(",");
    if (appliedProduct.length > 0) p.productId = appliedProduct.join(",");
    if (appliedType) p.type = appliedType;
    return p;
  }, [currentPage, pageSize, appliedSearch, appliedDateFrom, appliedDateTo, appliedStatus, appliedProduct, appliedType]);

  const { data: paginatedData, isLoading } = useGetVendorPortalOrdersPaginatedQuery(queryParams);
  const orders = useMemo(() => paginatedData?.items ?? [], [paginatedData]);
  const totalItems = paginatedData?.total ?? 0;
  const totalPages = paginatedData?.totalPages ?? 1;

  useEffect(() => {
    markVendorSidebarOrdersSeen();
    dispatchSidebarVendorOrdersRefresh();
  }, []);

  useEffect(() => {
    if (orders.length > 0) {
      markVendorSidebarOrdersSeen();
      dispatchSidebarVendorOrdersRefresh();
    }
  }, [orders.length]);

  const { data: products = [] } = useGetVendorPortalProductsQuery();
  const { refetch: refetchProfile } = useGetVendorPortalProfileQuery(undefined, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  });
  const [updateStatus] = useUpdateVendorPortalOrderStatusMutation();

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);
  const [cancelRemark, setCancelRemark] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  // Store disabled notice modal (after 2 consecutive cancellations)
  const [storeDisabledModalOpen, setStoreDisabledModalOpen] = useState(false);
  const [storeDisabledReason, setStoreDisabledReason] = useState("");

  const paginatedOrders = orders;

  // ── Checkbox selection logic ──
  const allVisibleSelected = paginatedOrders.length > 0 && paginatedOrders.every(o => selectedIds.has(o.id));
  const someVisibleSelected = paginatedOrders.some(o => selectedIds.has(o.id));
  const selectedVisibleCount = paginatedOrders.filter(o => selectedIds.has(o.id)).length;

  useLayoutEffect(() => {
    const el = selectAllRef.current;
    if (!el) return;
    el.indeterminate = someVisibleSelected && !allVisibleSelected;
  }, [someVisibleSelected, allVisibleSelected]);

  // Prune stale selections
  const filteredIdSet = useMemo(() => new Set(orders.map(o => o.id)), [orders]);
  useEffect(() => {
    setSelectedIds(prev => {
      const next = new Set<string>();
      for (const id of prev) {
        if (filteredIdSet.has(id)) next.add(id);
      }
      return next.size === prev.size ? prev : next;
    });
  }, [filteredIdSet]);

  const toggleRowSelected = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAllVisibleSelected = useCallback(() => {
    const ids = paginatedOrders.map(o => o.id);
    setSelectedIds(prev => {
      const allOn = ids.length > 0 && ids.every(id => prev.has(id));
      const next = new Set(prev);
      if (allOn) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });
  }, [paginatedOrders]);

  // ── Server & table filter handlers ──
  const handleApplyFilters = useCallback(() => {
    setAppliedSearch(searchDraft.trim());
    setAppliedDateFrom(dateFromDraft);
    setAppliedDateTo(dateToDraft);
    setAppliedStatus(statusDraft);
    setAppliedProduct(productDraft);
    setAppliedType(typeDraft);
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [searchDraft, dateFromDraft, dateToDraft, statusDraft, productDraft, typeDraft]);

  const handleResetFilters = useCallback(() => {
    setSearchDraft(appliedSearch);
    setDateFromDraft(appliedDateFrom);
    setDateToDraft(appliedDateTo);
    setStatusDraft(appliedStatus);
    setProductDraft(appliedProduct);
    setTypeDraft(appliedType);
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [appliedSearch, appliedDateFrom, appliedDateTo, appliedStatus, appliedProduct, appliedType]);

  const handleClearFilters = useCallback(() => {
    setSearchDraft("");
    setDateFromDraft("");
    setDateToDraft("");
    setStatusDraft([]);
    setProductDraft([]);
    setTypeDraft("");

    setAppliedSearch("");
    setAppliedDateFrom("");
    setAppliedDateTo("");
    setAppliedStatus([]);
    setAppliedProduct([]);
    setAppliedType("");
    setCurrentPage(1);
    setSelectedIds(new Set());

    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  // ── Options ──
  const productOptions: MultiSelectOption[] = useMemo(() =>
    products.map(p => ({ value: p.id, label: p.name })),
    [products]
  );

  const statusOptions: MultiSelectOption[] = useMemo(() => [
    { value: "pending", label: "Pending" },
    { value: "accepted", label: "Accepted" },
    { value: "packed", label: "Packed" },
    { value: "dispatch", label: "Dispatch" },
    { value: "delivered", label: "Delivered" },
    { value: "cancelled", label: "Cancelled" },
    { value: "returned", label: "Returned" },
  ], []);

  const typeOptions: SelectOption[] = useMemo(() => [
    { value: "", label: "All types" },
    { value: "cod", label: "COD" },
    { value: "prepaid", label: "Prepaid" },
  ], []);

  // ── Handlers ──
  const handleDownloadPdf = useCallback(async (id: string, orderId: string) => {
    setPdfLoadingId(id);
    try {
      await downloadOrderPdf(id, `${orderId}.pdf`, { size: "thermal" });
      toast.success("PDF downloaded");
    } catch (err) {
      toast.fromError(err, "Failed to download PDF");
    } finally {
      setPdfLoadingId(null);
    }
  }, []);

  const handleAcceptOrder = useCallback(async (id: string, orderDisplayId?: string) => {
    setUpdatingStatus(id);
    try {
      await updateStatus({ id, status: "accepted" }).unwrap();
      toast.success(`Order ${orderDisplayId ? `#${orderDisplayId} ` : ""}accepted successfully!`);
      if (selectedOrder?.id === id) {
        setSelectedOrder(prev => prev ? { ...prev, status: "accepted" } : null);
      }
      dispatchNotificationsRefresh();
    } catch (err) {
      toast.fromError(err, "Failed to accept order");
    } finally {
      setUpdatingStatus(null);
    }
  }, [updateStatus, selectedOrder]);

  const handleStatusChange = useCallback(async (id: string, newStatus: OrderStatus) => {
    setUpdatingStatus(id);
    try {
      await updateStatus({ id, status: newStatus }).unwrap();
      toast.success(`Order status updated to ${newStatus}`);
      if (selectedOrder?.id === id) {
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
      }
      dispatchNotificationsRefresh();
    } catch (err) {
      toast.fromError(err, "Failed to update status");
    } finally {
      setUpdatingStatus(null);
    }
  }, [updateStatus, selectedOrder]);

  const handleTrackingUpdate = useCallback(async (id: string, trackingId: string) => {
    try {
      await updateStatus({ id, trackingId }).unwrap();
      toast.success("Tracking ID updated");
    } catch (err) {
      toast.fromError(err, "Failed to update tracking ID");
    }
  }, [updateStatus]);

  const openCancelModal = useCallback((order: Order) => {
    setCancelRemark("");
    setCancelModalOrder(order);
  }, []);

  const closeCancelModal = useCallback(() => {
    if (isCancelling) return;
    setCancelModalOrder(null);
    setCancelRemark("");
  }, [isCancelling]);

  const handleConfirmCancel = useCallback(async () => {
    if (!cancelModalOrder) return;
    if (!cancelRemark.trim()) {
      toast.error("Please enter a remark to cancel this order.");
      return;
    }

    setIsCancelling(true);
    try {
      const res = await updateStatus({
        id: cancelModalOrder.id,
        status: "cancelled",
        remark: cancelRemark.trim(),
      }).unwrap();

      const cancelledOrderId = cancelModalOrder.orderId;
      const cancelledId = cancelModalOrder.id;

      if (selectedOrder?.id === cancelledId) {
        setSelectedOrder(prev => prev ? { ...prev, status: "cancelled" } : null);
      }
      setCancelModalOrder(null);
      setCancelRemark("");

      // Check if this cancellation triggered automatic store deactivation (2 consecutive cancellations)
      const wasStoreDisabled =
        Boolean((res as any)?.storeDisabled) ||
        Boolean(res?.notes?.includes("[Store Disabled")) ||
        Boolean(res?.notes?.includes("Store Disabled"));

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
        toast.success(`Order #${cancelledOrderId} cancelled with remark.`);
      }

      dispatchNotificationsRefresh();
    } catch (err) {
      toast.fromError(err, "Failed to cancel order");
    } finally {
      setIsCancelling(false);
    }
  }, [cancelModalOrder, cancelRemark, updateStatus, selectedOrder, refetchProfile]);

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

  // ── Table columns (same spec as admin) ──
  const columns = useMemo(() => [
    {
      key: "select",
      header: (
        <input
          ref={selectAllRef}
          type="checkbox"
          checked={allVisibleSelected}
          onChange={toggleAllVisibleSelected}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
          aria-label="Select all visible orders"
        />
      ),
      render: (row: Order) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.id)}
          onChange={() => toggleRowSelected(row.id)}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
          aria-label={`Select order ${row.orderId}`}
        />
      ),
    },
    {
      key: "orderId",
      header: "Order ID",
      className: "whitespace-nowrap min-w-[7.5rem]",
      render: (row: Order) => (
        <button
          type="button"
          onClick={() => setSelectedOrder(row)}
          className="font-medium text-primary hover:underline whitespace-nowrap"
        >
          {row.orderId}
        </button>
      )
    },
    {
      key: "createdAt",
      header: "Date",
      render: (row: Order) => (
        <span className="text-xs whitespace-nowrap">{formatDate(row.createdAt)}</span>
      )
    },
    {
      key: "customer",
      header: "Customer",
      className: "whitespace-nowrap min-w-[8rem] max-w-[12rem]",
      render: (row: Order) => {
        const name = row.customerName || "—";
        return (
          <div className="min-w-0 max-w-[160px]">
            <Tooltip content={name} side="top" className="max-w-full min-w-0">
              <span
                className="truncate block font-medium text-sm text-text-heading whitespace-nowrap cursor-default"
                title={name}
              >
                {name}
              </span>
            </Tooltip>
            {row.phone && (
              <div className="text-[10px] text-text-muted whitespace-nowrap">
                {row.phone}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "product", header: "Product", render: (row: any) => (
        <div className="space-y-1">
          <div className="max-w-[150px] truncate font-medium" title={row.product?.name || row.productName || row.productId}>
            {row.product?.name || row.productName || row.productId}
          </div>
          {(row.customText || row.customPhotoUrl || row.notes) && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
                ✨ Personalized
              </span>
              {row.customPhotoUrl && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadCustomerImage(row.customPhotoUrl, row.orderId);
                  }}
                  className="text-purple-700 hover:text-purple-900 text-[10px] font-bold underline inline-flex items-center gap-0.5"
                  title="Download Customer Photo"
                >
                  <ArrowDownTrayIcon className="h-3 w-3" /> Photo
                </button>
              )}
            </div>
          )}
        </div>
      )
    },
    { key: "quantity", header: "Qty", render: (row: Order) => row.quantity },
    {
      key: "amount",
      header: "Total",
      render: (row: Order) => `₹${Number(row.sellingAmount).toFixed(2)}`
    },
    {
      key: "paymentMethod",
      header: "Payment",
      render: (row: Order) => {
        const method = row.paymentMethod ?? "cod";
        const isOnline = method === "razorpay";
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider w-fit ${isOnline
            ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
            : "bg-amber-100 text-amber-700 border border-amber-200"
            }`}>
            {isOnline ? "Online" : "COD"}
          </span>
        );
      }
    },
    {
      key: "paymentStatus",
      header: "Payment Status",
      render: (row: Order) => {
        const status = row.paymentStatus ?? "pending";
        const isPaid = status === "paid";
        const isFailed = status === "failed";
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider w-fit ${isPaid ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
            : isFailed ? "bg-red-100 text-red-700 border border-red-200"
              : "bg-slate-100 text-slate-500 border border-slate-200"
            }`}>
            {isPaid ? "✓ Paid" : isFailed ? "✗ Failed" : "Pending"}
          </span>
        );
      }
    },
    {
      key: "status",
      header: "Status",
      render: (row: Order) => {
        const isPending = row.status === "pending" || row.status === "scheduled";
        const timer = isPending ? getPendingTimeRemaining(row.createdAt) : null;
        return (
          <div className="space-y-1.5 py-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <OrderStatusBadge uniform={row.status} />
              {isPending && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleAcceptOrder(row.id, row.orderId);
                    }}
                    disabled={updatingStatus === row.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                    title="Click to accept this order"
                  >
                    <CheckCircleIcon className="h-3.5 w-3.5" />
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openCancelModal(row);
                    }}
                    disabled={updatingStatus === row.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                    title="Click to cancel this order with remark"
                  >
                    <XCircleIcon className="h-3.5 w-3.5" />
                    Cancel
                  </button>
                </div>
              )}
            </div>
            {isPending && timer && (
              <div className={`text-[10px] font-semibold flex items-center gap-1 ${timer.isExpired ? "text-red-600 font-bold" : "text-amber-700"
                }`}>
                <ClockIcon className="h-3 w-3 shrink-0" />
                <span>{timer.text}</span>
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: "actions",
      header: "PDF",
      render: (row: Order) => (
        <button
          onClick={(e) => { e.stopPropagation(); handleDownloadPdf(row.id, row.orderId); }}
          disabled={pdfLoadingId === row.id}
          className="p-1.5 text-primary hover:bg-primary/10 rounded-md disabled:opacity-50"
          title="Download PDF"
        >
          <ArrowDownTrayIcon className="h-5 w-5" />
        </button>
      )
    }
  ], [handleDownloadPdf, handleAcceptOrder, updatingStatus, pdfLoadingId, selectedIds, allVisibleSelected, toggleRowSelected, toggleAllVisibleSelected]);

  return (
    <div className="space-y-4">
      <Card>
        <AdminOrderFilters
          search={searchDraft}
          onSearchChange={setSearchDraft}
          dateFrom={dateFromDraft}
          onDateFromChange={setDateFromDraft}
          dateTo={dateToDraft}
          onDateToChange={setDateToDraft}
          hideVendor={true}
          statusFilter={statusDraft}
          onStatusFilterChange={setStatusDraft}
          statusOptions={statusOptions}
          productFilter={productDraft}
          onProductFilterChange={setProductDraft}
          productOptions={productOptions}
          typeFilter={typeDraft}
          onTypeFilterChange={setTypeDraft}
          typeOptions={typeOptions}
          filtersLoading={isLoading}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
          onClearAll={handleClearFilters}
          appliedSearch={appliedSearch}
          appliedDateFrom={appliedDateFrom}
          appliedDateTo={appliedDateTo}
          appliedStatus={appliedStatus}
          appliedProduct={appliedProduct}
          appliedType={appliedType}
        />

        {/* Selection bar */}
        {selectedVisibleCount > 0 && (
          <div className="mx-4 mb-3 flex items-center gap-3 rounded-lg bg-primary/5 px-4 py-2 border border-primary/20">
            <span className="text-sm font-medium text-primary">
              {selectedVisibleCount} order{selectedVisibleCount !== 1 ? "s" : ""} selected
            </span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </Button>
          </div>
        )}

        {/* Mobile select-all */}
        <div className="flex items-center gap-2 px-4 py-2 md:hidden border-b border-border">
          <input
            type="checkbox"
            checked={allVisibleSelected}
            onChange={toggleAllVisibleSelected}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
            aria-label="Select all visible orders"
          />
          <span className="text-xs text-text-muted">Select all</span>
        </div>

        <Table
          isLoading={isLoading}
          columns={columns}
          data={paginatedOrders}
          keyExtractor={(o) => o.id}
          emptyMessage="No orders found for your products."
        />

        <TablePagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={totalItems}
          totalPages={totalPages}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          pageSizeOptions={[10, 20, 50, 80, 100]}
          itemLabel="orders"
          disabled={isLoading}
        />
      </Card>

      <Modal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={`Order Details: ${selectedOrder?.orderId}`}
        size="lg"
      >
        {selectedOrder && (
          <div className="space-y-6">
            {/* 24-Hour Acceptance Alert for Pending Orders */}
            {(selectedOrder.status === "pending" || selectedOrder.status === "scheduled") && (
              <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50/50 to-amber-50 p-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white text-xs font-black shadow-xs">
                        !
                      </span>
                      <h4 className="text-sm font-black text-amber-950">Action Required: Accept or Cancel Order</h4>
                    </div>
                    <p className="text-xs text-amber-800">
                      Orders must be accepted within 24 hours of placement, or they will be automatically cancelled.
                    </p>
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-300/60">
                      <ClockIcon className="h-3.5 w-3.5 text-amber-700" />
                      <span>{getPendingTimeRemaining(selectedOrder.createdAt).text}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      className="!bg-emerald-600 hover:!bg-emerald-700 !text-white font-black px-4 py-2 shadow-xs flex items-center gap-1.5"
                      loading={updatingStatus === selectedOrder.id}
                      onClick={() => void handleAcceptOrder(selectedOrder.id, selectedOrder.orderId)}
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                      Accept Order
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      className="font-black px-3.5 py-2 shadow-xs flex items-center gap-1.5"
                      onClick={() => openCancelModal(selectedOrder)}
                    >
                      <XCircleIcon className="h-4 w-4" />
                      Cancel Order
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">Customer Name</dt>
                <dd className="font-medium">{selectedOrder.customerName}</dd>
              </div>
              <div>
                <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">Phone Number</dt>
                <dd className="font-medium">{selectedOrder.phone}</dd>
              </div>
              <div>
                <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">Building/Street</dt>
                <dd>{selectedOrder.deliveryAddress}</dd>
              </div>
              <div>
                <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">Post Office</dt>
                <dd>{selectedOrder.postOffice}</dd>
              </div>
              <div>
                <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">District</dt>
                <dd>{selectedOrder.district}</dd>
              </div>
              <div>
                <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">State</dt>
                <dd>{selectedOrder.state}</dd>
              </div>
              <div>
                <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">Pincode</dt>
                <dd>{selectedOrder.pincode}</dd>
              </div>
              <div>
                <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">Order Type</dt>
                <dd>
                  <Badge variant="default">{selectedOrder.orderType.toUpperCase()}</Badge>
                </dd>
              </div>

              {/* Customer Personalization Details Section */}
              {(selectedOrder.customPhotoUrl || selectedOrder.customText || selectedOrder.notes) && (
                <div className="sm:col-span-2 rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50/50 via-white to-indigo-50/30 p-4 sm:p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-purple-100 pb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-600 text-white shadow-xs">
                        <SparklesIcon className="h-4 w-4" />
                      </span>
                      <div>
                        <h4 className="text-sm font-black text-purple-950">Customer Personalization Details</h4>
                        <p className="text-[11px] text-purple-700 font-medium">Customer-submitted customization for this order line</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-purple-300 bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-800">
                      Personalized Order
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Custom Text / Inscription */}
                    {selectedOrder.customText && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-purple-900 block flex items-center gap-1.5">
                          <DocumentTextIcon className="h-4 w-4 text-purple-600" />
                          Custom Inscription / Text
                        </span>
                        <div className="p-3 bg-white rounded-xl border border-purple-200 shadow-2xs font-serif text-sm font-bold text-purple-950 italic break-words">
                          &ldquo;{selectedOrder.customText}&rdquo;
                        </div>
                      </div>
                    )}

                    {/* Customer Notes / Special Instructions */}
                    {selectedOrder.notes && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-purple-900 block flex items-center gap-1.5">
                          <DocumentTextIcon className="h-4 w-4 text-purple-600" />
                          Customer Note / Special Instructions
                        </span>
                        <div className="p-3 bg-white rounded-xl border border-purple-200 shadow-2xs text-xs text-slate-800 font-medium whitespace-pre-wrap break-words">
                          {selectedOrder.notes}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Customer Uploaded Image */}
                  {selectedOrder.customPhotoUrl && (
                    <div className="space-y-2 pt-2 border-t border-purple-100">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-purple-900 block flex items-center gap-1.5">
                        <PhotoIcon className="h-4 w-4 text-purple-600" />
                        Uploaded Customer Image
                      </span>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white p-3.5 rounded-xl border border-purple-200 shadow-2xs">
                        <div className="relative h-28 w-28 shrink-0 rounded-lg overflow-hidden border-2 border-purple-300 bg-slate-100">
                          <img
                            src={selectedOrder.customPhotoUrl}
                            alt="Customer Personalization"
                            className="h-full w-full object-cover cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => window.open(selectedOrder.customPhotoUrl!, "_blank")}
                            title="Click to view full image"
                          />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                              ✓ High-Resolution Upload Ready
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            Download the original customer photo file to use for printing, engraving, or product crafting.
                          </p>
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="primary"
                              icon={<ArrowDownTrayIcon className="h-4 w-4" />}
                              onClick={() => handleDownloadCustomerImage(selectedOrder.customPhotoUrl!, selectedOrder.orderId)}
                            >
                              Download Image
                            </Button>
                            <a
                              href={selectedOrder.customPhotoUrl}
                              download={`customer_photo_${selectedOrder.orderId}.jpg`}
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
              )}

              <div className="sm:col-span-2 border-t pt-4 mt-2">
                <dt className="text-text-muted mb-2 text-xs uppercase tracking-wider font-bold">Order Item</dt>
                <dd className="overflow-hidden rounded-lg border border-gray-100 shadow-sm">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-gray-500 font-bold">
                      <tr>
                        <th className="px-3 py-2 text-left">Product</th>
                        <th className="px-3 py-2 text-center">Qty</th>
                        <th className="px-3 py-2 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      <tr>
                        <td className="px-3 py-2 font-medium">
                          {(selectedOrder as any).product?.name || (selectedOrder as any).productName || selectedOrder.productId}
                        </td>
                        <td className="px-3 py-2 text-center font-bold text-gray-600">
                          {selectedOrder.quantity}
                        </td>
                        <td className="px-3 py-2 text-right font-black text-primary">
                          ₹{Number(selectedOrder.sellingAmount).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                    <tfoot className="border-t border-gray-100 bg-gray-50/90 font-bold">
                      <tr>
                        <td colSpan={2} className="px-3 py-2 text-right text-[10px] uppercase text-gray-500">Subtotal</td>
                        <td className="px-3 py-2 text-right text-primary">₹{Number(selectedOrder.sellingAmount).toFixed(2)}</td>
                      </tr>
                      {selectedOrder.discountAmount && Number(selectedOrder.discountAmount) > 0 && (
                        <tr>
                          <td colSpan={2} className="px-3 py-2 text-right text-[10px] uppercase text-gray-500">Discount</td>
                          <td className="px-3 py-2 text-right text-red-600">- ₹{Number(selectedOrder.discountAmount).toFixed(2)}</td>
                        </tr>
                      )}
                      <tr className="border-t-2 border-gray-200 bg-white">
                        <td colSpan={2} className="px-3 py-2.5 text-right text-[10px] font-black uppercase text-gray-900">Grand Total</td>
                        <td className="px-3 py-2.5 text-right font-black text-earnings text-sm">₹{Number(selectedOrder.sellingAmount).toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </dd>
              </div>

              <div>
                <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">Assigned #</dt>
                <dd className="font-mono text-sm">{selectedOrder.staffAssignedNumber || "—"}</dd>
              </div>
              <div>
                <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">Tracking ID</dt>
                <dd>
                  <Input
                    placeholder="Enter Tracking ID"
                    defaultValue={selectedOrder.trackingId || ""}
                    onBlur={(e) => handleTrackingUpdate(selectedOrder.id, e.target.value)}
                    className="h-8 text-sm"
                  />
                </dd>
              </div>
            </dl>

            <div className="border-t pt-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-3">Manage Order</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-text-muted mb-1">Update Status</label>
                  <Select
                    options={statusOptions.filter(o => o.value !== "")}
                    value={selectedOrder.status}
                    onChange={(e) => handleStatusChange(selectedOrder.id, e.target.value as OrderStatus)}
                    disabled={updatingStatus === selectedOrder.id}
                  />
                </div>
              </div>
              <p className="mt-2 text-[10px] text-text-muted italic">
                Status updates are synced with admin in real-time.
              </p>
            </div>

            <div className="flex justify-between items-center pt-2 border-t">
              <Button
                variant="danger"
                size="sm"
                onClick={() => openCancelModal(selectedOrder)}
                disabled={selectedOrder.status === "cancelled" || selectedOrder.status === "delivered"}
              >
                Cancel Order
              </Button>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setSelectedOrder(null)}>Close</Button>
                {(selectedOrder.status === "pending" || selectedOrder.status === "scheduled") && (
                  <Button
                    type="button"
                    variant="primary"
                    className="!bg-emerald-600 hover:!bg-emerald-700 !text-white font-black flex items-center gap-1.5"
                    onClick={() => void handleAcceptOrder(selectedOrder.id, selectedOrder.orderId)}
                    loading={updatingStatus === selectedOrder.id}
                  >
                    <CheckCircleIcon className="h-4 w-4" />
                    Accept Order
                  </Button>
                )}
                <Button
                  variant="primary"
                  icon={<ArrowDownTrayIcon className="h-4 w-4" />}
                  onClick={() => handleDownloadPdf(selectedOrder.id, selectedOrder.orderId)}
                  loading={pdfLoadingId === selectedOrder.id}
                >
                  Download PDF
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Vendor Order Cancellation with Remark Modal */}
      <Modal
        isOpen={!!cancelModalOrder}
        onClose={closeCancelModal}
        title={`Cancel Order #${cancelModalOrder?.orderId}`}
        size="md"
      >
        {cancelModalOrder && (
          <div className="space-y-4">
            <div className="rounded-xl border border-red-200 bg-red-50/70 p-3.5 text-xs text-red-900 space-y-1">
              <p className="font-bold">Are you sure you want to cancel this order?</p>
              <p className="text-red-700">
                A remark/reason is required. Product stock will be automatically restored.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Cancellation Remark / Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={cancelRemark}
                onChange={(e) => setCancelRemark(e.target.value)}
                placeholder="Enter cancellation reason (e.g. Out of stock / Unable to fulfill / Customization not possible)..."
                rows={3}
                className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none resize-none transition-colors"
                autoFocus
              />
              <p className="text-[11px] text-text-muted">
                This remark will be permanently recorded with the cancelled order.
              </p>
            </div>

            <div className="flex justify-end items-center gap-2 pt-3 border-t">
              <Button
                type="button"
                variant="secondary"
                onClick={closeCancelModal}
                disabled={isCancelling}
              >
                Go Back
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleConfirmCancel}
                disabled={!cancelRemark.trim() || isCancelling}
                loading={isCancelling}
                className="font-bold"
              >
                Cancel Order
              </Button>
            </div>
          </div>
        )}
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

export default memo(VendorOrderManagement);
