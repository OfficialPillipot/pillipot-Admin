import { memo, useMemo, useState, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { 
  Card, 
  CardHeader, 
  Table, 
  Badge, 
  Button, 
  Modal, 
  Select,
  Input,
  ManagementFilterPanel,
  ManagementFilterField,
  MANAGEMENT_NATIVE_CONTROL_CLASS,
  ResponsiveManagementFilters
} from "../components/ui";
import { OrderStatusBadge } from "../components/orders/OrderStatusBadge";
import { formatDate } from "../lib/orderUtils";
import { downloadOrderPdf } from "../lib/download-order-pdf";
import { 
  useGetVendorPortalOrdersQuery, 
  useUpdateVendorPortalOrderStatusMutation,
  useGetVendorPortalProductsQuery
} from "../store/api/edenApi";
import { toast } from "../lib/toast";
import type { Order, OrderStatus } from "../types";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";

function VendorOrderManagement() {
  // ── Server-level filter state ──
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedDateFrom, setAppliedDateFrom] = useState("");
  const [appliedDateTo, setAppliedDateTo] = useState("");

  // ── Table-level filter state ──
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");

  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);

  const queryParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (appliedSearch) p.search = appliedSearch;
    if (appliedDateFrom) p.dateFrom = appliedDateFrom;
    if (appliedDateTo) p.dateTo = appliedDateTo;
    return Object.keys(p).length > 0 ? p : undefined;
  }, [appliedSearch, appliedDateFrom, appliedDateTo]);

  const { data: allOrders = [], isLoading } = useGetVendorPortalOrdersQuery(queryParams);

  const { data: products = [] } = useGetVendorPortalProductsQuery();
  const [updateStatus] = useUpdateVendorPortalOrderStatusMutation();
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // ── Filtered orders (table-level) ──
  const orders = useMemo(() => {
    let result = allOrders;
    if (statusFilter) result = result.filter(o => o.status === statusFilter);
    if (typeFilter) result = result.filter(o => o.orderType === typeFilter);
    if (productFilter) result = result.filter(o => o.productId === productFilter);
    if (platformFilter) result = result.filter(o => (o.platform || "staff") === platformFilter);
    return result;
  }, [allOrders, statusFilter, typeFilter, productFilter, platformFilter]);

  // ── Checkbox selection logic ──
  const allVisibleSelected = orders.length > 0 && orders.every(o => selectedIds.has(o.id));
  const someVisibleSelected = orders.some(o => selectedIds.has(o.id));
  const selectedVisibleCount = orders.filter(o => selectedIds.has(o.id)).length;

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
    const ids = orders.map(o => o.id);
    setSelectedIds(prev => {
      const allOn = ids.length > 0 && ids.every(id => prev.has(id));
      const next = new Set(prev);
      if (allOn) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });
  }, [orders]);

  // ── Server filter handlers ──
  const handleApplyFilters = useCallback(() => {
    setAppliedSearch(search.trim());
    setAppliedDateFrom(dateFrom);
    setAppliedDateTo(dateTo);
  }, [search, dateFrom, dateTo]);

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setAppliedSearch("");
    setAppliedDateFrom("");
    setAppliedDateTo("");
    setStatusFilter("");
    setTypeFilter("");
    setProductFilter("");
    setPlatformFilter("");
  }, []);

  const resetTableFilters = useCallback(() => {
    setStatusFilter("");
    setTypeFilter("");
    setProductFilter("");
    setPlatformFilter("");
  }, []);

  // ── Options ──
  const productOptions = useMemo(() => [
    { value: "", label: "Select all products" },
    ...products.map(p => ({ value: p.id, label: p.name }))
  ], [products]);

  const statusOptions = [
    { value: "", label: "All statuses" },
    { value: "pending", label: "Pending" },
    { value: "packed", label: "Packed" },
    { value: "dispatch", label: "Dispatch" },
    { value: "delivered", label: "Delivered" },
    { value: "cancelled", label: "Cancelled" },
    { value: "returned", label: "Returned" },
  ];

  const typeOptions = [
    { value: "", label: "Select all types" },
    { value: "cod", label: "COD" },
    { value: "prepaid", label: "Prepaid" },
  ];

  const platformOptions = [
    { value: "", label: "Select all platforms" },
    { value: "staff", label: "Staff" },
    { value: "webapp", label: "Webapp" },
  ];

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

  const handleStatusChange = useCallback(async (id: string, newStatus: OrderStatus) => {
    setUpdatingStatus(id);
    try {
      await updateStatus({ id, status: newStatus }).unwrap();
      toast.success(`Order status updated to ${newStatus}`);
      if (selectedOrder?.id === id) {
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
      }
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

  const handleCancelOrder = useCallback(async (id: string) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    try {
      await updateStatus({ id, status: "cancelled" }).unwrap();
      toast.success("Order cancelled");
      setSelectedOrder(null);
    } catch (err) {
      toast.fromError(err, "Failed to cancel order");
    }
  }, [updateStatus]);

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
      render: (row: Order) => (
        <button 
          onClick={() => setSelectedOrder(row)}
          className="font-medium text-primary hover:underline"
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
    { key: "customer", header: "Customer", render: (row: Order) => (
      <div>
        <div className="font-medium text-sm">{row.customerName}</div>
        <div className="text-[10px] text-text-muted">{row.phone}</div>
      </div>
    )},
    { key: "product", header: "Product", render: (row: any) => (
      <div className="max-w-[150px] truncate" title={row.product?.name || row.productName || row.productId}>
        {row.product?.name || row.productName || row.productId}
      </div>
    )},
    { key: "quantity", header: "Qty", render: (row: Order) => row.quantity },
    { 
      key: "discount", 
      header: "Discount", 
      render: (row: Order) => row.discountAmount ? `₹${Number(row.discountAmount).toFixed(2)}` : "—" 
    },
    { 
      key: "assigned", 
      header: "Assigned #", 
      render: (row: Order) => row.staffAssignedNumber?.trim() ? <span className="font-mono text-[10px]">{row.staffAssignedNumber}</span> : "—" 
    },
    { 
      key: "amount", 
      header: "Total", 
      render: (row: Order) => `₹${Number(row.sellingAmount).toFixed(2)}` 
    },
    { 
      key: "platform", 
      header: "Platform", 
      render: (row: Order) => (
        <span className="text-[10px] uppercase font-bold text-text-muted">{row.platform || "staff"}</span>
      )
    },
    { 
      key: "paymentStatus", 
      header: "Payment", 
      render: (row: Order) => {
        const method = row.paymentMethod ?? "cod";
        const status = row.paymentStatus ?? "pending";
        const isOnline = method === "razorpay";
        const isPaid = status === "paid";
        const isFailed = status === "failed";
        return (
          <div className="flex flex-col gap-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider w-fit ${
              isOnline
                ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
                : "bg-amber-100 text-amber-700 border border-amber-200"
            }`}>
              {isOnline ? "Online" : "COD"}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider w-fit ${
              isPaid ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
              : isFailed ? "bg-red-100 text-red-700 border border-red-200"
              : "bg-slate-100 text-slate-500 border border-slate-200"
            }`}>
              {isPaid ? "✓ Paid" : isFailed ? "✗ Failed" : "Pending"}
            </span>
          </div>
        );
      }
    },
    { 
      key: "status", 
      header: "Status", 
      render: (row: Order) => <OrderStatusBadge uniform={row.status} /> 
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
  ], [handleDownloadPdf, pdfLoadingId, selectedIds, allVisibleSelected, toggleRowSelected, toggleAllVisibleSelected]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Product Orders" subtitle="Manage orders containing your products" />
        
        <div className="mb-4 space-y-2">
          <ResponsiveManagementFilters modalTitle="Order filters" triggerLabel="Filters">
            <ManagementFilterPanel>
              {/* Server-level filters */}
              <ManagementFilterField label="Search" className="lg:col-span-2 xl:col-span-2">
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
                  placeholder="Order ID, name, phone, or pincode"
                  className={MANAGEMENT_NATIVE_CONTROL_CLASS}
                  aria-label="Search by order id, customer name, phone, or pincode"
                />
              </ManagementFilterField>
              <ManagementFilterField label="From date">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className={MANAGEMENT_NATIVE_CONTROL_CLASS}
                  aria-label="From date"
                />
              </ManagementFilterField>
              <ManagementFilterField label="To date">
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className={MANAGEMENT_NATIVE_CONTROL_CLASS}
                  aria-label="To date"
                />
              </ManagementFilterField>
              <ManagementFilterField label="Server filters">
                <div className="flex w-full flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleApplyFilters()}
                    loading={isLoading}
                  >
                    Apply
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => void handleClearFilters()}
                    disabled={isLoading}
                  >
                    Clear all
                  </Button>
                </div>
              </ManagementFilterField>

              {/* Table-level filters */}
              <ManagementFilterField label="Status">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={MANAGEMENT_NATIVE_CONTROL_CLASS}
                  aria-label="Filter by order status"
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value || "all-status"} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </ManagementFilterField>
              <ManagementFilterField label="Product">
                <select
                  value={productFilter}
                  onChange={(e) => setProductFilter(e.target.value)}
                  className={MANAGEMENT_NATIVE_CONTROL_CLASS}
                  aria-label="Filter by product"
                >
                  {productOptions.map((opt) => (
                    <option key={opt.value || "all-products"} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </ManagementFilterField>
              <ManagementFilterField label="Order type">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className={MANAGEMENT_NATIVE_CONTROL_CLASS}
                  aria-label="Filter by order type"
                >
                  {typeOptions.map((opt) => (
                    <option key={opt.value || "all-types"} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </ManagementFilterField>
              <ManagementFilterField label="Platform">
                <select
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                  className={MANAGEMENT_NATIVE_CONTROL_CLASS}
                  aria-label="Filter by platform"
                >
                  {platformOptions.map((opt) => (
                    <option key={opt.value || "all-platforms"} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </ManagementFilterField>
              <ManagementFilterField label="Table filters">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={resetTableFilters}
                  aria-label="Reset table filters"
                >
                  Reset table filters
                </Button>
              </ManagementFilterField>
            </ManagementFilterPanel>
          </ResponsiveManagementFilters>

          {(appliedDateFrom || appliedDateTo || appliedSearch.trim()) && (
            <p className="text-xs text-text-muted">
              Showing orders
              {appliedDateFrom ? ` from ${appliedDateFrom}` : ""}
              {appliedDateTo ? ` through ${appliedDateTo}` : ""}
              {appliedSearch.trim()
                ? `${appliedDateFrom || appliedDateTo ? ";" : ""} matching "${appliedSearch.trim()}"`
                : ""}
              {appliedDateFrom || appliedDateTo ? " (UTC day boundaries)." : "."}
            </p>
          )}
        </div>

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
          data={orders}
          keyExtractor={(o) => o.id}
          emptyMessage="No orders found for your products."
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
                onClick={() => handleCancelOrder(selectedOrder.id)}
                disabled={selectedOrder.status === "cancelled" || selectedOrder.status === "delivered"}
              >
                Cancel Order
              </Button>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setSelectedOrder(null)}>Close</Button>
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
    </div>
  );
}

export default memo(VendorOrderManagement);
