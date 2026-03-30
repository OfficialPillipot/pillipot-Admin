import {
  memo,
  useMemo,
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { selectOrders } from "../store/ordersSlice";
import { fetchOrders, updateOrder } from "../store/ordersSlice";
import { selectStaff } from "../store/staffSlice";
import { selectProducts, fetchProducts } from "../store/productsSlice";
import { fetchSettings, selectSettings } from "../store/settingsSlice";
import { Card, CardHeader, Button, Table, Badge, Modal } from "../components/ui";
import { toast } from "../lib/toast";
import { downloadBulkOrdersPdf, downloadOrderPdf } from "../lib/download-order-pdf";
import type { Order } from "../types";
import { formatDate } from "../lib/orderUtils";

function safeMoney(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

function discountDisplay(v: unknown): string | null {
  const n = safeMoney(v);
  return n > 0 ? `₹${n.toFixed(2)}` : null;
}

function AdminOrderManagementPage() {
  const dispatch = useAppDispatch();
  const orders = useAppSelector(selectOrders);
  const staff = useAppSelector(selectStaff);
  const products = useAppSelector(selectProducts);
  const settings = useAppSelector(selectSettings);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [productFilter, setProductFilter] = useState("");
  const [staffFilter, setStaffFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [appliedDateFrom, setAppliedDateFrom] = useState("");
  const [appliedDateTo, setAppliedDateTo] = useState("");
  const [filtersLoading, setFiltersLoading] = useState(false);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);
  const [bulkPdfLoading, setBulkPdfLoading] = useState(false);
  const [discountDraft, setDiscountDraft] = useState("");
  const [savingDiscount, setSavingDiscount] = useState(false);
  const [trackingDraft, setTrackingDraft] = useState("");
  const [dispatching, setDispatching] = useState(false);
  const [markingPacked, setMarkingPacked] = useState(false);
  const [returning, setReturning] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const selectAllHeaderRef = useRef<HTMLInputElement>(null);
  const ordersRef = useRef(orders);
  ordersRef.current = orders;

  const groupedOrders = useMemo(() => {
    let list = [...orders].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (productFilter) list = list.filter((o) => o.productId === productFilter);
    if (staffFilter) list = list.filter((o) => o.staffId === staffFilter);
    if (statusFilter) list = list.filter((o) => o.status === statusFilter);
    if (typeFilter) list = list.filter((o) => o.orderType === typeFilter);

    const groups = new Map<string, Order[]>();
    for (const o of list) {
      if (!groups.has(o.orderId)) groups.set(o.orderId, []);
      groups.get(o.orderId)!.push(o);
    }

    return Array.from(groups.values()).map((items) => {
      const o = items[0];
      const totalSelling = items.reduce((sum, item) => sum + safeMoney(item.sellingAmount), 0);
      const totalDiscount = items.reduce((sum, item) => sum + (item.discountAmount ? safeMoney(item.discountAmount) : 0), 0);

      // Return a "summary" order object
      return {
        ...o,
        sellingAmount: totalSelling,
        discountAmount: totalDiscount > 0 ? totalDiscount : null,
        items, // Keep all items for the details modal
      };
    });
  }, [orders, productFilter, staffFilter, statusFilter, typeFilter]);

  const filteredOrders = groupedOrders;

  const allVisibleSelected =
    filteredOrders.length > 0 &&
    filteredOrders.every((o) => selectedIds.has(o.id));
  const someVisibleSelected = filteredOrders.some((o) => selectedIds.has(o.id));

  useLayoutEffect(() => {
    const el = selectAllHeaderRef.current;
    if (!el) return;
    el.indeterminate = someVisibleSelected && !allVisibleSelected;
  }, [someVisibleSelected, allVisibleSelected]);

  const toggleRowSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAllVisibleSelected = useCallback(() => {
    const ids = filteredOrders.map((o) => o.id);
    setSelectedIds((prev) => {
      const allOn = ids.length > 0 && ids.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allOn) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }, [filteredOrders]);

  const clearRowSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const orderDetail = useMemo(() => {
    if (!detailId) return null;
    return (groupedOrders.find((o) => o.id === detailId) as any) || null;
  }, [groupedOrders, detailId]);

  const discountEditable =
    orderDetail?.status === "pending" || orderDetail?.status === "packed";

  /** Only when switching orders — do not depend on `orders` or the draft resets on every list refresh while typing. */
  useEffect(() => {
    void dispatch(fetchSettings());
  }, [dispatch]);

  useEffect(() => {
    if (!detailId) {
      setDiscountDraft("");
      return;
    }
    // Find the grouped order to get the TOTAL discount
    const groupedOrder = groupedOrders.find((o) => o.id === detailId);
    if (!groupedOrder) return;
    const d = groupedOrder.discountAmount;
    setDiscountDraft(d != null && safeMoney(d) > 0 ? String(safeMoney(d)) : "");
  }, [detailId, groupedOrders]);

  useEffect(() => {
    if (!detailId) {
      setTrackingDraft("");
      return;
    }
    const o = ordersRef.current.find((x) => x.id === detailId);
    if (!o) return;
    const t = (o.trackingId ?? "").trim();
    setTrackingDraft(t);
  }, [detailId, orderDetail?.status, orderDetail?.trackingId]);

  const persistTrackingFromBlur = useCallback(async () => {
    if (!detailId) return;
    const o = ordersRef.current.find((x) => x.id === detailId);
    if (!o || (o.status !== "pending" && o.status !== "packed")) return;
    const localT = trackingDraft.trim();
    const serverT = (o.trackingId ?? "").trim();
    if (localT === serverT) return;
    try {
      await dispatch(
        updateOrder({
          id: detailId,
          patch: { trackingId: localT || null },
        })
      ).unwrap();
    } catch (err) {
      toast.fromError(err, "Failed to save tracking ID");
    }
  }, [detailId, trackingDraft, dispatch]);

  const markPacked = useCallback(async () => {
    if (!orderDetail || orderDetail.status !== "pending") return;
    setMarkingPacked(true);
    try {
      await dispatch(
        updateOrder({ id: orderDetail.id, patch: { status: "packed" } })
      ).unwrap();
      toast.success("Order marked packed");
    } catch (err) {
      toast.fromError(err, "Failed to update status");
    } finally {
      setMarkingPacked(false);
    }
  }, [orderDetail, dispatch]);

  const moveToDispatch = useCallback(async () => {
    if (!orderDetail || orderDetail.status !== "packed") return;
    const tid = trackingDraft.trim();
    if (!tid) {
      toast.error("Enter a tracking ID");
      return;
    }
    setDispatching(true);
    try {
      await dispatch(
        updateOrder({
          id: orderDetail.id,
          patch: { status: "dispatch", trackingId: tid },
        })
      ).unwrap();
      toast.success("Order marked dispatched");
    } catch (err) {
      toast.fromError(err, "Failed to update order");
    } finally {
      setDispatching(false);
    }
  }, [orderDetail, trackingDraft, dispatch]);

  const confirmDelivered = useCallback(async () => {
    if (!orderDetail || orderDetail.status !== "dispatch") return;
    const tid = trackingDraft.trim() || orderDetail.trackingId?.trim() || "";
    if (!tid) {
      toast.error("Enter a tracking ID");
      return;
    }
    setDispatching(true);
    try {
      await dispatch(
        updateOrder({
          id: orderDetail.id,
          patch: { status: "delivered", trackingId: tid },
        })
      ).unwrap();
      toast.success("Order marked delivered");
      setDetailId(null);
    } catch (err) {
      toast.fromError(err, "Failed to update order");
    } finally {
      setDispatching(false);
    }
  }, [orderDetail, trackingDraft, dispatch]);

  const handleReturn = useCallback(async () => {
    if (
      !orderDetail ||
      (orderDetail.status !== "dispatch" && orderDetail.status !== "delivered")
    ) {
      return;
    }
    setReturning(true);
    try {
      await dispatch(
        updateOrder({ id: orderDetail.id, patch: { status: "returned" } })
      ).unwrap();
      setDetailId(null);
      toast.success("Return recorded — stock restocked");
      void dispatch(fetchProducts());
    } catch (err) {
      toast.fromError(err, "Failed to process return");
    } finally {
      setReturning(false);
    }
  }, [orderDetail, dispatch]);

  const saveDiscount = useCallback(async () => {
    if (!orderDetail) return;
    const raw = discountDraft.trim();
    const amount = raw === "" ? 0 : Number(raw);
    if (raw !== "" && Number.isNaN(amount)) {
      toast.error("Enter a valid discount");
      return;
    }
    if (amount < 0) {
      toast.error("Discount cannot be negative");
      return;
    }
    setSavingDiscount(true);
    try {
      const items = (orderDetail as any).items || [orderDetail];
      // We apply the full discount to the first item and set others to 0
      // This ensures the total discount for the "order" (group) is exactly 'amount'
      await Promise.all(
        items.map((item: any, idx: number) => {
          const itemDiscount = idx === 0 ? amount : 0;
          return dispatch(
            updateOrder({
              id: item.id,
              patch: { discountAmount: itemDiscount },
            })
          ).unwrap();
        })
      );
      toast.success("Discount updated");
    } catch (err) {
      toast.fromError(err, "Failed to update discount");
    } finally {
      setSavingDiscount(false);
    }
  }, [orderDetail, discountDraft, dispatch]);

  const handleStatusChange = useCallback(
    async (orderId: string, status: Order["status"]) => {
      try {
        await dispatch(updateOrder({ id: orderId, patch: { status } })).unwrap();
        toast.success(`Order ${status}`);
        if (status === "cancelled" || status === "delivered" || status === "returned")
          setDetailId(null);
      } catch (err) {
        toast.fromError(err, "Failed to update order");
      }
    },
    [dispatch]
  );

  const applyDateFilters = useCallback(async () => {
    setFiltersLoading(true);
    try {
      await dispatch(
        fetchOrders({
          ...(dateFrom ? { dateFrom } : {}),
          ...(dateTo ? { dateTo } : {}),
        })
      ).unwrap();
      setAppliedDateFrom(dateFrom);
      setAppliedDateTo(dateTo);
      toast.success("Orders updated");
    } catch (err) {
      toast.fromError(err, "Failed to load orders");
    } finally {
      setFiltersLoading(false);
    }
  }, [dispatch, dateFrom, dateTo]);

  const clearDateFilters = useCallback(async () => {
    setDateFrom("");
    setDateTo("");
    setAppliedDateFrom("");
    setAppliedDateTo("");
    setFiltersLoading(true);
    try {
      await dispatch(fetchOrders(undefined)).unwrap();
      toast.success("Showing all dates");
    } catch (err) {
      toast.fromError(err, "Failed to load orders");
    } finally {
      setFiltersLoading(false);
    }
  }, [dispatch]);

  const downloadPdf = useCallback(async (
    internalId: string,
    displayOrderId: string,
    sizeOverride?: "thermal" | "a4"
  ) => {
    setPdfLoadingId(internalId);
    try {
      await downloadOrderPdf(internalId, `${displayOrderId}.pdf`, {
        size: sizeOverride ?? settings?.defaultPdfSize ?? "thermal",
      });
      toast.success("PDF downloaded");
    } catch (err) {
      toast.fromError(err, "Failed to download PDF");
    } finally {
      setPdfLoadingId(null);
    }
  }, [settings?.defaultPdfSize]);

  const clearTableFilters = useCallback(() => {
    setStaffFilter("");
    setStatusFilter("");
    setProductFilter("");
    setTypeFilter("");
  }, []);

  const downloadSelectedPdf = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkPdfLoading(true);
    try {
      await downloadBulkOrdersPdf(ids, `orders-${Date.now()}.pdf`, {
        size: settings?.defaultPdfSize ?? "thermal",
      });
      toast.success("Selected orders PDF downloaded");
    } catch (err) {
      toast.fromError(err, "Failed to download selected orders PDF");
    } finally {
      setBulkPdfLoading(false);
    }
  }, [selectedIds, settings?.defaultPdfSize]);

  const productOptions = useMemo(
    () => [
      { value: "", label: "Select all products" },
      ...products.map((p) => ({ value: p.id, label: p.name })),
    ],
    [products]
  );

  const staffOptions = useMemo(
    () => [
      { value: "", label: "Select all staff" },
      ...[...staff]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((s) => ({ value: s.id, label: s.name })),
    ],
    [staff]
  );

  const statusOptions = useMemo(
    () => [
      { value: "", label: "Select all statuses" },
      { value: "pending", label: "Pending" },
      { value: "packed", label: "Packed" },
      { value: "dispatch", label: "Dispatch" },
      { value: "returned", label: "Returned" },
      { value: "delivered", label: "Delivered" },
      { value: "cancelled", label: "Cancelled" },
    ],
    []
  );

  const typeOptions = useMemo(
    () => [
      { value: "", label: "Select all types" },
      { value: "cod", label: "COD" },
      { value: "prepaid", label: "Prepaid" },
    ],
    []
  );

  const columns = useMemo(
    () => [
      {
        key: "__select",
        header: (
          <span className="inline-flex items-center justify-center">
            <input
              ref={selectAllHeaderRef}
              type="checkbox"
              checked={allVisibleSelected}
              onChange={() => toggleAllVisibleSelected()}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              aria-label="Select all orders in this table"
            />
          </span>
        ),
        className: "w-12",
        render: (row: Order) => (
          <input
            type="checkbox"
            checked={selectedIds.has(row.id)}
            onChange={() => toggleRowSelected(row.id)}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            aria-label={`Select order ${row.orderId}`}
          />
        ),
      },
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
        header: "Products",
        render: (row: any) => {
          const names = row.items?.map((i: any) =>
            products.find((p) => p.id === i.productId)?.name || i.productId
          ) || [];

          if (names.length === 0) return "—";
          if (names.length === 1) return names[0];

          return (
            <div>
              <span className="text-xs font-bold text-primary">{names.length} items</span>
              <div className="text-[10px] text-text-muted mt-0.5 line-clamp-1 italic">
                {names.join(", ")}
              </div>
            </div>
          );
        }
      },
      {
        key: "discountAmount",
        header: "Discount",
        render: (row: Order) => discountDisplay(row.discountAmount) ?? "—",
      },
      {
        key: "staffAssignedNumber",
        header: "Assigned #",
        render: (row: Order) => {
          const n = row.staffAssignedNumber?.trim();
          return n ? (
            <span className="font-mono text-xs">{n}</span>
          ) : (
            "—"
          );
        },
      },
      {
        key: "sellingAmount",
        header: "Total",
        render: (row: Order) => `₹${safeMoney(row.sellingAmount).toFixed(2)}`,
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
                  : row.status === "returned"
                    ? "default"
                    : row.status === "dispatch"
                      ? "info"
                      : row.status === "packed"
                        ? "default"
                        : "warning"
            }
          >
            {row.status}
          </Badge>
        ),
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
      {
        key: "pdf",
        header: "PDF",
        render: (row: Order) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void downloadPdf(row.id, row.orderId);
            }}
            disabled={pdfLoadingId === row.id}
            className="inline-flex items-center justify-center rounded-[var(--radius-sm)] p-1.5 text-primary hover:bg-primary-muted disabled:opacity-50"
            title="Download PDF"
            aria-label={`Download PDF for ${row.orderId}`}
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
          </button>
        ),
      },
    ],
    [
      staff,
      products,
      pdfLoadingId,
      selectedIds,
      allVisibleSelected,
      toggleRowSelected,
      toggleAllVisibleSelected,
      downloadPdf,
    ]
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Order Management"
          subtitle="Filter by date (server), staff, status, product, and order type. Staff-entered discounts appear in the Discount column."
        />
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">
                From date
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">
                To date
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
              />
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => void applyDateFilters()}
              loading={filtersLoading}
            >
              Apply dates
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void clearDateFilters()}
              disabled={filtersLoading}
            >
              Clear dates
            </Button>
          </div>
          {(appliedDateFrom || appliedDateTo) && (
            <p className="text-xs text-text-muted">
              Showing orders
              {appliedDateFrom ? ` from ${appliedDateFrom}` : ""}
              {appliedDateTo ? ` through ${appliedDateTo}` : ""}
              {" "}(UTC day boundaries).
            </p>
          )}
          <div className="flex flex-wrap items-end gap-3">
            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
              aria-label="Filter by staff"
            >
              {staffOptions.map((opt) => (
                <option key={opt.value || "all-staff"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
              aria-label="Filter by order status"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value || "all-status"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
              aria-label="Filter by product"
            >
              {productOptions.map((opt) => (
                <option key={opt.value || "all-products"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
              aria-label="Filter by order type"
            >
              {typeOptions.map((opt) => (
                <option key={opt.value || "all-types"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={clearTableFilters}
              aria-label="Reset staff, status, product, and type filters to show all"
            >
              Select all
            </Button>
          </div>
        </div>
        {selectedIds.size > 0 && (
          <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-text-muted">
            <span>
              {selectedIds.size} order{selectedIds.size === 1 ? "" : "s"} selected.
            </span>
            <Button
              type="button"
              size="sm"
              onClick={() => void downloadSelectedPdf()}
              loading={bulkPdfLoading}
            >
              Download selected PDF
            </Button>
            <button
              type="button"
              className="font-medium text-primary underline hover:no-underline"
              onClick={clearRowSelection}
            >
              Clear selection
            </button>
          </div>
        )}
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
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">Customer Name</dt>
                <dd className="font-medium">{orderDetail.customerName}</dd>
              </div>
              <div>
                <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">Phone Number</dt>
                <dd>{orderDetail.phone}</dd>
              </div>
              <div>
                <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">Building/Street</dt>
                <dd>{orderDetail.deliveryAddress}</dd>
              </div>
              <div>
                <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">Post Office</dt>
                <dd>{orderDetail.postOffice}</dd>
              </div>
              <div>
                <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">District</dt>
                <dd>{orderDetail.district}</dd>
              </div>
              <div>
                <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">State</dt>
                <dd>{orderDetail.state}</dd>
              </div>
              <div>
                <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">Pincode</dt>
                <dd>{orderDetail.pincode}</dd>
              </div>
              <div className="sm:col-span-2 border-t pt-4 mt-2">
                <dt className="text-text-muted mb-2 text-xs uppercase tracking-wider font-bold">Order Items</dt>
                <dd className="rounded-lg border border-gray-100 overflow-hidden shadow-sm">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-gray-500 font-bold">
                      <tr>
                        <th className="px-3 py-2 text-left">Product</th>
                        <th className="px-3 py-2 text-center">Qty</th>
                        <th className="px-3 py-2 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {(orderDetail as any).items?.map((item: any) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2 font-medium">
                            <div>{products.find((p) => p.id === item.productId)?.name || item.productId}</div>
                            {(item.addOnAmount || item.addOnNote) && (
                              <div className="mt-1 text-[10px] text-earnings font-normal flex items-center gap-1.5">
                                <span className="inline-block px-1 py-0.5 bg-earnings/10 rounded text-earnings uppercase tracking-tighter font-bold">Add-on</span>
                                <span>{item.addOnNote || "Extra"} ({discountDisplay(item.addOnAmount)})</span>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-gray-600">{item.quantity}</td>
                          <td className="px-3 py-2 text-right font-black text-indigo-600">
                            ₹{safeMoney(item.sellingAmount).toFixed(2)}
                          </td>
                        </tr>
                      )) || (
                          <tr>
                            <td className="px-3 py-2 font-medium">
                              <div>{products.find((p) => p.id === (orderDetail as any).productId)?.name || (orderDetail as any).productId}</div>
                              {((orderDetail as any).addOnAmount || (orderDetail as any).addOnNote) && (
                                <div className="mt-1 text-[10px] text-earnings font-normal flex items-center gap-1.5">
                                  <span className="inline-block px-1 py-0.5 bg-earnings/10 rounded text-earnings uppercase tracking-tighter font-bold">Add-on</span>
                                  <span>{(orderDetail as any).addOnNote || "Extra"} ({discountDisplay((orderDetail as any).addOnAmount)})</span>
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center font-bold text-gray-600">{(orderDetail as any).quantity}</td>
                            <td className="px-3 py-2 text-right font-black text-indigo-600">
                              ₹{safeMoney((orderDetail as any).sellingAmount).toFixed(2)}
                            </td>
                          </tr>
                        )}
                    </tbody>
                    <tfoot className="bg-gray-50/60 border-t border-gray-100">
                      <tr>
                        <td colSpan={2} className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Items Amount</td>
                        <td className="px-3 py-2 text-right font-black text-indigo-700">₹{safeMoney((orderDetail as any).sellingAmount).toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </dd>
              </div>
              <div>
                <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">Order Type</dt>
                <dd><Badge variant="default">{orderDetail.orderType.toUpperCase()}</Badge></dd>
              </div>
              <div>
                <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">Discount</dt>
                <dd>{discountDisplay(orderDetail.discountAmount) ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">Total Amount</dt>
                <dd className="font-medium text-earnings">
                  ₹{safeMoney(orderDetail.sellingAmount).toFixed(2)}
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
                        onChange={(e) => setDiscountDraft(e.target.value)}
                        placeholder="0"
                        aria-label="Discount amount"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void saveDiscount()}
                      loading={savingDiscount}
                    >
                      Apply discount
                    </Button>
                    <p className="text-xs text-text-muted sm:flex-1">
                      Clear the field or set 0 to remove discount. Total is recalculated from the product catalog price.
                    </p>
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">Current Status</dt>
                <dd>
                  <span className="capitalize font-medium">{orderDetail.status}</span>
                  {orderDetail.status === "dispatch" ? (
                    <span className="mt-0.5 block text-xs font-normal text-text-muted">
                      Dispatched — tracking is locked. Use Mark delivered when the customer receives the order.
                    </span>
                  ) : null}
                  {orderDetail.status === "pending" ? (
                    <span className="mt-0.5 block text-xs font-normal text-text-muted">
                      Enter or edit tracking below. Click Packed when the parcel is packed (not yet dispatched).
                    </span>
                  ) : null}
                  {orderDetail.status === "packed" ? (
                    <span className="mt-0.5 block text-xs font-normal text-text-muted">
                      Packed — finish the tracking ID, then Mark dispatched when handed to the courier.
                    </span>
                  ) : null}
                </dd>
              </div>
              {(orderDetail.status === "delivered" ||
                orderDetail.status === "cancelled" ||
                orderDetail.status === "returned") &&
                orderDetail.trackingId?.trim() ? (
                <div>
                  <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">Tracking ID</dt>
                  <dd className="font-mono text-sm">{orderDetail.trackingId.trim()}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">Assigned #</dt>
                <dd className="font-mono text-sm">
                  {orderDetail.staffAssignedNumber?.trim() || "—"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">Staff Details</dt>
                <dd>{staff.find(s => s.id === (orderDetail as any).staffId)?.name || (orderDetail as any).staffId}</dd>
              </div>
              {(orderDetail as any).notes && (
                <div className="sm:col-span-2">
                  <dt className="text-text-muted mb-1 text-xs uppercase tracking-wider">Notes</dt>
                  <dd className="bg-surface-alt p-2 rounded-[var(--radius-sm)] border border-border text-text-muted">
                    {(orderDetail as any).notes}
                  </dd>
                </div>
              )}
            </dl>
            {(orderDetail as any).status === "pending" || (orderDetail as any).status === "packed" ? (
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
                  onChange={(e) => setTrackingDraft(e.target.value)}
                  onBlur={() => void persistTrackingFromBlur()}
                  placeholder="Enter courier tracking number"
                  maxLength={255}
                  autoComplete="off"
                  className="w-full max-w-md rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-sm"
                />
                <p className="mt-2 text-xs text-text-muted">
                  {(orderDetail as any).status === "pending"
                    ? "You can set tracking before or after packing. Packed means ready for courier; use Mark dispatched only after you have a final tracking ID."
                    : trackingDraft.trim()
                      ? "Click Mark dispatched when the parcel is with the courier."
                      : "Enter the tracking ID, then Mark dispatched."}
                </p>
              </div>
            ) : null}
            {(orderDetail as any).status === "dispatch" && (orderDetail as any).trackingId?.trim() ? (
              <div className="rounded-[var(--radius-md)] border border-border bg-surface-alt p-3">
                <p className="text-text-muted mb-1 text-xs font-medium uppercase tracking-wider">
                  Tracking ID
                </p>
                <p className="font-mono text-sm">{(orderDetail as any).trackingId.trim()}</p>
                <p className="mt-2 text-xs text-text-muted">
                  Tracking cannot be edited after dispatch. Use Mark delivered when appropriate.
                </p>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2 border-t border-border mt-4 pt-4 justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDetailId(null)}
              >
                Close
              </Button>
              {orderDetail.status === "pending" ||
                orderDetail.status === "packed" ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    handleStatusChange((orderDetail as any).id, "cancelled");
                    setDetailId(null);
                  }}
                >
                  Cancel Order
                </Button>
              ) : null}
              {(orderDetail.status === "dispatch" ||
                orderDetail.status === "delivered") ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => void handleReturn()}
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
                  onClick={() => void markPacked()}
                  loading={markingPacked}
                >
                  Packed
                </Button>
              ) : null}
              {orderDetail.status === "packed" && trackingDraft.trim() ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => void moveToDispatch()}
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
                  onClick={() => void confirmDelivered()}
                  loading={dispatching}
                >
                  Mark delivered
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default memo(AdminOrderManagementPage);
