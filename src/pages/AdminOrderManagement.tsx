import {
  memo,
  useMemo,
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { bulkUpdateOrderStatus, updateOrder } from "../store/ordersSlice";
import {
  ADMIN_ORDERS_PAGE_SIZE,
  fetchOrdersList,
  type AdminOrdersQuery,
} from "../lib/fetch-admin-orders";
import { selectStaff } from "../store/staffSlice";
import { selectProducts, fetchProducts } from "../store/productsSlice";
import { fetchSettings, selectSettings } from "../store/settingsSlice";
import { Card, CardHeader, Table } from "../components/ui";
import { toast } from "../lib/toast";
import { downloadBulkOrdersPdf, downloadOrderPdf } from "../lib/download-order-pdf";
import type { Order, OrderStatus } from "../types";
import { AdminOrderBulkBar, type AdminBulkAdvanceAction } from "../components/orders/AdminOrderBulkBar";
import { AdminOrderDetailModal } from "../components/orders/AdminOrderDetailModal";
import { AdminOrderFilters } from "../components/orders/AdminOrderFilters";
import { AdminOrderMobileSelectAll } from "../components/orders/AdminOrderMobileSelectAll";
import { AdminOrderPagination } from "../components/orders/AdminOrderPagination";
import {
  groupOrdersForAdminList,
  orderLineIds,
  rowUniformStatus,
  nextBulkStep,
  safeMoney,
  type GroupedAdminOrder,
} from "../components/orders/adminOrderManagementUtils";
import { useAdminOrderTableColumns } from "../hooks/useAdminOrderTableColumns";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../lib/permissions";

function AdminOrderManagementPage() {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const [listLines, setListLines] = useState<Order[]>([]);
  const [listTotal, setListTotal] = useState(0);
  const [listPage, setListPage] = useState(1);
  const lastQueryRef = useRef<AdminOrdersQuery>({
    page: 1,
    limit: ADMIN_ORDERS_PAGE_SIZE,
  });
  const loadSeqRef = useRef(0);
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
  const [serverSearch, setServerSearch] = useState("");
  const [appliedDateFrom, setAppliedDateFrom] = useState("");
  const [appliedDateTo, setAppliedDateTo] = useState("");
  const [appliedServerSearch, setAppliedServerSearch] = useState("");
  const [filtersLoading, setFiltersLoading] = useState(false);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);
  const [bulkPdfLoading, setBulkPdfLoading] = useState(false);
  const [bulkStatusLoading, setBulkStatusLoading] = useState(false);
  const [discountDraft, setDiscountDraft] = useState("");
  const [savingDiscount, setSavingDiscount] = useState(false);
  const [trackingDraft, setTrackingDraft] = useState("");
  const [dispatching, setDispatching] = useState(false);
  const [markingPacked, setMarkingPacked] = useState(false);
  const [returning, setReturning] = useState(false);
  const [revokePackedLoadingId, setRevokePackedLoadingId] = useState<
    string | null
  >(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const selectAllHeaderRef = useRef<HTMLInputElement>(null);
  const listLinesRef = useRef(listLines);
  listLinesRef.current = listLines;

  const serverNarrowed =
    !!(
      appliedDateFrom ||
      appliedDateTo ||
      appliedServerSearch.trim()
    );

  const hasTableFilters = useMemo(
    () =>
      !!(productFilter || staffFilter || statusFilter || typeFilter),
    [productFilter, staffFilter, statusFilter, typeFilter],
  );

  const appliedServerQuery = useCallback((): AdminOrdersQuery => {
    return {
      ...(appliedDateFrom ? { dateFrom: appliedDateFrom } : {}),
      ...(appliedDateTo ? { dateTo: appliedDateTo } : {}),
      ...(appliedServerSearch.trim()
        ? { search: appliedServerSearch.trim() }
        : {}),
    };
  }, [appliedDateFrom, appliedDateTo, appliedServerSearch]);

  const loadOrders = useCallback(async (q: AdminOrdersQuery) => {
    const seq = ++loadSeqRef.current;
    lastQueryRef.current = q;
    setFiltersLoading(true);
    try {
      const data = await fetchOrdersList(q);
      if (seq !== loadSeqRef.current) return;
      setListLines(data.items);
      setListTotal(data.total);
      setListPage(q.page != null ? q.page : 1);
    } catch (err) {
      if (seq !== loadSeqRef.current) return;
      toast.fromError(err, "Failed to load orders");
    } finally {
      if (seq === loadSeqRef.current) {
        setFiltersLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadOrders({ page: 1, limit: ADMIN_ORDERS_PAGE_SIZE });
  }, [loadOrders]);

  const hadTableFiltersRef = useRef(false);
  useEffect(() => {
    if (hasTableFilters) {
      hadTableFiltersRef.current = true;
      void loadOrders(appliedServerQuery());
      return;
    }
    if (hadTableFiltersRef.current) {
      hadTableFiltersRef.current = false;
      if (!serverNarrowed) {
        void loadOrders({
          page: 1,
          limit: ADMIN_ORDERS_PAGE_SIZE,
        });
      }
    }
  }, [
    hasTableFilters,
    serverNarrowed,
    appliedDateFrom,
    appliedDateTo,
    appliedServerSearch,
    loadOrders,
    appliedServerQuery,
  ]);

  const reloadCurrentQuery = useCallback(async () => {
    await loadOrders(lastQueryRef.current);
  }, [loadOrders]);

  const groupedOrders = useMemo(
    () =>
      groupOrdersForAdminList(listLines, {
        productId: productFilter,
        staffId: staffFilter,
        status: statusFilter,
        orderType: typeFilter,
      }),
    [listLines, productFilter, staffFilter, statusFilter, typeFilter],
  );

  const filteredOrders = groupedOrders;

  const filteredHeadIdSet = useMemo(
    () => new Set(filteredOrders.map((o) => o.id)),
    [filteredOrders],
  );

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set<string>();
      for (const id of prev) {
        if (filteredHeadIdSet.has(id)) next.add(id);
      }
      if (next.size === prev.size) {
        for (const id of prev) {
          if (!next.has(id)) return next;
        }
        return prev;
      }
      return next;
    });
  }, [filteredHeadIdSet]);

  const selectedVisibleCount = useMemo(
    () => filteredOrders.filter((o) => selectedIds.has(o.id)).length,
    [filteredOrders, selectedIds],
  );

  const totalPages = Math.max(
    1,
    Math.ceil(listTotal / ADMIN_ORDERS_PAGE_SIZE),
  );
  const showApiPagination =
    !serverNarrowed &&
    !hasTableFilters &&
    listTotal > ADMIN_ORDERS_PAGE_SIZE;

  const goToOrdersPage = useCallback(
    (page: number) => {
      const p = Math.min(Math.max(1, page), totalPages);
      void loadOrders({ page: p, limit: ADMIN_ORDERS_PAGE_SIZE });
    },
    [loadOrders, totalPages],
  );

  const allVisibleSelected =
    filteredOrders.length > 0 &&
    filteredOrders.every((o) => selectedIds.has(o.id));
  const someVisibleSelected = filteredOrders.some((o) =>
    selectedIds.has(o.id),
  );

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

  const orderDetail = useMemo((): GroupedAdminOrder | null => {
    if (!detailId) return null;
    return groupedOrders.find((o) => o.id === detailId) ?? null;
  }, [groupedOrders, detailId]);

  const discountEditable =
    orderDetail?.status === "pending" ||
    orderDetail?.status === "scheduled" ||
    orderDetail?.status === "packed";

  const sortedOrderLines = useMemo((): Order[] => {
    if (!orderDetail) return [];
    if (orderDetail.items?.length) {
      return [...orderDetail.items].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    }
    return [orderDetail];
  }, [orderDetail]);

  useEffect(() => {
    void dispatch(fetchSettings());
  }, [dispatch]);

  useEffect(() => {
    if (!detailId) {
      setDiscountDraft("");
      return;
    }
    const groupedOrder = groupedOrders.find((o) => o.id === detailId);
    if (!groupedOrder) return;
    const d = groupedOrder.discountAmount;
    setDiscountDraft(
      d != null && safeMoney(d) > 0 ? String(safeMoney(d)) : "",
    );
  }, [detailId, groupedOrders]);

  useEffect(() => {
    if (!detailId) {
      setTrackingDraft("");
      return;
    }
    const o = listLinesRef.current.find((x) => x.id === detailId);
    if (!o) return;
    const t = (o.trackingId ?? "").trim();
    setTrackingDraft(t);
  }, [detailId, orderDetail?.status, orderDetail?.trackingId]);

  const persistTrackingFromBlur = useCallback(async () => {
    if (!detailId || !orderDetail) return;
    const o = listLinesRef.current.find((x) => x.id === detailId);
    if (
      !o ||
      (o.status !== "pending" &&
        o.status !== "scheduled" &&
        o.status !== "packed")
    )
      return;
    const localT = trackingDraft.trim();
    const serverT = (o.trackingId ?? "").trim();
    if (localT === serverT) return;
    const lineIds = orderLineIds(orderDetail);
    try {
      await Promise.all(
        lineIds.map((id) =>
          dispatch(
            updateOrder({
              id,
              patch: { trackingId: localT || null },
            }),
          ).unwrap(),
        ),
      );
      await reloadCurrentQuery();
    } catch (err) {
      toast.fromError(err, "Failed to save tracking ID");
    }
  }, [detailId, orderDetail, trackingDraft, dispatch, reloadCurrentQuery]);

  const markPacked = useCallback(async () => {
    if (!orderDetail || orderDetail.status !== "pending") return;
    const tid = trackingDraft.trim();
    if (!tid) {
      toast.error("Enter a tracking ID before marking packed");
      return;
    }
    const lineIds = orderLineIds(orderDetail);
    setMarkingPacked(true);
    try {
      await Promise.all(
        lineIds.map((id) =>
          dispatch(
            updateOrder({
              id,
              patch: { status: "packed", trackingId: tid },
            }),
          ).unwrap(),
        ),
      );
      toast.success("Order marked packed");
      await reloadCurrentQuery();
    } catch (err) {
      toast.fromError(err, "Failed to update status");
    } finally {
      setMarkingPacked(false);
    }
  }, [orderDetail, trackingDraft, dispatch, reloadCurrentQuery]);

  const moveToDispatch = useCallback(async () => {
    if (!orderDetail || orderDetail.status !== "packed") return;
    const tid = trackingDraft.trim();
    if (!tid) {
      toast.error("Enter a tracking ID");
      return;
    }
    const lineIds = orderLineIds(orderDetail);
    setDispatching(true);
    try {
      await Promise.all(
        lineIds.map((id) =>
          dispatch(
            updateOrder({
              id,
              patch: { status: "dispatch", trackingId: tid },
            }),
          ).unwrap(),
        ),
      );
      toast.success("Order marked dispatched");
      await reloadCurrentQuery();
    } catch (err) {
      toast.fromError(err, "Failed to update order");
    } finally {
      setDispatching(false);
    }
  }, [orderDetail, trackingDraft, dispatch, reloadCurrentQuery]);

  const confirmDelivered = useCallback(async () => {
    if (!orderDetail || orderDetail.status !== "dispatch") return;
    const tid =
      trackingDraft.trim() || orderDetail.trackingId?.trim() || "";
    if (!tid) {
      toast.error("Enter a tracking ID");
      return;
    }
    const lineIds = orderLineIds(orderDetail);
    setDispatching(true);
    try {
      await Promise.all(
        lineIds.map((id) =>
          dispatch(
            updateOrder({ id, patch: { status: "delivered" } }),
          ).unwrap(),
        ),
      );
      toast.success("Order marked delivered");
      setDetailId(null);
      await reloadCurrentQuery();
    } catch (err) {
      toast.fromError(err, "Failed to update order");
    } finally {
      setDispatching(false);
    }
  }, [orderDetail, trackingDraft, dispatch, reloadCurrentQuery]);

  const handleReturn = useCallback(async () => {
    if (
      !orderDetail ||
      (orderDetail.status !== "dispatch" &&
        orderDetail.status !== "delivered")
    ) {
      return;
    }
    setReturning(true);
    try {
      const items = orderDetail.items;
      const returnable =
        Array.isArray(items) && items.length > 0
          ? items.filter(
            (i) =>
              i.status === "dispatch" || i.status === "delivered",
          )
          : [orderDetail];
      const ids = returnable.map((i) => i.id);
      if (ids.length === 0) {
        toast.error("No lines eligible for return");
        return;
      }
      await Promise.all(
        ids.map((id) =>
          dispatch(
            updateOrder({ id, patch: { status: "returned" } }),
          ).unwrap(),
        ),
      );
      setDetailId(null);
      toast.success("Return recorded — stock restocked");
      void dispatch(fetchProducts());
      await reloadCurrentQuery();
    } catch (err) {
      toast.fromError(err, "Failed to process return");
    } finally {
      setReturning(false);
    }
  }, [orderDetail, dispatch, reloadCurrentQuery]);

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
      const items = orderDetail.items?.length
        ? orderDetail.items
        : [orderDetail];
      await Promise.all(
        items.map((item, idx) => {
          const itemDiscount = idx === 0 ? amount : 0;
          return dispatch(
            updateOrder({
              id: item.id,
              patch: { discountAmount: itemDiscount },
            }),
          ).unwrap();
        }),
      );
      toast.success("Discount updated");
      await reloadCurrentQuery();
    } catch (err) {
      toast.fromError(err, "Failed to update discount");
    } finally {
      setSavingDiscount(false);
    }
  }, [orderDetail, discountDraft, dispatch, reloadCurrentQuery]);

  const handleStatusChange = useCallback(
    async (lineIds: string[], status: Order["status"]) => {
      try {
        await Promise.all(
          lineIds.map((id) =>
            dispatch(updateOrder({ id, patch: { status } })).unwrap(),
          ),
        );
        toast.success(`Order ${status}`);
        if (
          status === "cancelled" ||
          status === "delivered" ||
          status === "returned"
        ) {
          setDetailId(null);
        }
        await reloadCurrentQuery();
      } catch (err) {
        toast.fromError(err, "Failed to update order");
      }
    },
    [dispatch, reloadCurrentQuery],
  );

  const applyDateFilters = useCallback(async () => {
    const q: AdminOrdersQuery = {
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
      ...(serverSearch.trim() ? { search: serverSearch.trim() } : {}),
    };
    if (Object.keys(q).length === 0) {
      const tableOn = !!(
        productFilter ||
        staffFilter ||
        statusFilter ||
        typeFilter
      );
      if (tableOn) {
        await loadOrders({});
      } else {
        await loadOrders({ page: 1, limit: ADMIN_ORDERS_PAGE_SIZE });
      }
      setAppliedDateFrom("");
      setAppliedDateTo("");
      setAppliedServerSearch("");
      setListPage(1);
      toast.success("Orders updated");
      return;
    }
    await loadOrders(q);
    setAppliedDateFrom(dateFrom);
    setAppliedDateTo(dateTo);
    setAppliedServerSearch(serverSearch.trim());
    toast.success("Orders updated");
  }, [
    dateFrom,
    dateTo,
    serverSearch,
    loadOrders,
    productFilter,
    staffFilter,
    statusFilter,
    typeFilter,
  ]);

  const clearDateFilters = useCallback(async () => {
    setDateFrom("");
    setDateTo("");
    setServerSearch("");
    setAppliedDateFrom("");
    setAppliedDateTo("");
    setAppliedServerSearch("");
    setListPage(1);
    const tableOn = !!(
      productFilter ||
      staffFilter ||
      statusFilter ||
      typeFilter
    );
    if (tableOn) {
      await loadOrders({});
    } else {
      await loadOrders({ page: 1, limit: ADMIN_ORDERS_PAGE_SIZE });
    }
    toast.success("Showing all orders");
  }, [loadOrders, productFilter, staffFilter, statusFilter, typeFilter]);

  const downloadPdf = useCallback(
    async (
      internalId: string,
      displayOrderId: string,
      sizeOverride?: "thermal" | "a4",
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
    },
    [settings?.defaultPdfSize],
  );

  const clearTableFilters = useCallback(() => {
    setStaffFilter("");
    setStatusFilter("");
    setProductFilter("");
    setTypeFilter("");
  }, []);

  const downloadSelectedPdf = useCallback(async () => {
    const ids = filteredOrders
      .filter((o) => selectedIds.has(o.id))
      .flatMap((g) => orderLineIds(g as { id: string; items?: Order[] }));
    const unique = [...new Set(ids)];
    if (unique.length === 0) return;
    setBulkPdfLoading(true);
    try {
      await downloadBulkOrdersPdf(unique, `orders-${Date.now()}.pdf`, {
        size: settings?.defaultPdfSize ?? "thermal",
      });
      toast.success("Selected orders PDF downloaded");
    } catch (err) {
      toast.fromError(err, "Failed to download selected orders PDF");
    } finally {
      setBulkPdfLoading(false);
    }
  }, [selectedIds, filteredOrders, settings?.defaultPdfSize]);

  const bulkAdvanceAction = useMemo((): AdminBulkAdvanceAction => {
    if (selectedVisibleCount === 0) return null;
    const rows = filteredOrders.filter((o) => selectedIds.has(o.id));
    if (rows.length === 0) return null;

    const perRow = rows.map((r) =>
      rowUniformStatus(r as Order & { items?: Order[] }),
    );
    if (perRow.some((s) => s === "mixed")) {
      return {
        kind: "blocked",
        message:
          "One or more orders have lines with different statuses. Open those orders and align statuses first.",
      };
    }
    const current = perRow[0] as OrderStatus;
    if (!perRow.every((s) => s === current)) {
      return {
        kind: "blocked",
        message:
          "Select orders that all share the same status (e.g. only pending, or only packed).",
      };
    }
    if (
      current === "cancelled" ||
      current === "returned" ||
      current === "delivered"
    ) {
      return null;
    }
    const step = nextBulkStep(current);
    if (!step) return null;
    return {
      kind: "action",
      current,
      next: step.next,
      label: step.label,
    };
  }, [selectedVisibleCount, selectedIds, filteredOrders]);

  const applyBulkAdvance = useCallback(
    async (next: OrderStatus) => {
      const lineIds: string[] = [];
      for (const g of filteredOrders) {
        if (!selectedIds.has(g.id)) continue;
        lineIds.push(...orderLineIds(g as { id: string; items?: Order[] }));
      }
      const unique = [...new Set(lineIds)];
      if (unique.length === 0) return;
      setBulkStatusLoading(true);
      try {
        const res = await dispatch(
          bulkUpdateOrderStatus({ ids: unique, status: next }),
        ).unwrap();
        await loadOrders(lastQueryRef.current);
        if (res.failed === 0) {
          toast.success(
            `Updated ${res.updated} order line${res.updated === 1 ? "" : "s"} to ${next}`,
          );
          clearRowSelection();
        } else if (res.updated === 0) {
          const first = res.errors[0]?.message;
          toast.error(
            first ??
              `None of the ${res.failed} line(s) could be moved to ${next}. Check tracking and rules per order.`,
          );
        } else {
          toast.warning(
            `${res.updated} line(s) set to ${next}; ${res.failed} failed. ${res.errors[0]?.message ? `Example: ${res.errors[0].message}` : "Check tracking and other rules per order."}`,
            { autoClose: 8000 },
          );
        }
      } catch (err) {
        toast.fromError(err, "Bulk status update failed");
      } finally {
        setBulkStatusLoading(false);
      }
    },
    [selectedIds, filteredOrders, dispatch, clearRowSelection, loadOrders],
  );

  const productOptions = useMemo(
    () => [
      { value: "", label: "Select all products" },
      ...products.map((p) => ({ value: p.id, label: p.name })),
    ],
    [products],
  );

  const staffOptions = useMemo(
    () => [
      { value: "", label: "Select all staff" },
      ...[...staff]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((s) => ({ value: s.id, label: s.name })),
    ],
    [staff],
  );

  const typeOptions = useMemo(
    () => [
      { value: "", label: "Select all types" },
      { value: "cod", label: "COD" },
      { value: "prepaid", label: "Prepaid" },
    ],
    [],
  );

  const getAdminOrderEditHref = useCallback(
    (row: Order & { items?: Order[] }) => {
      if (!hasPermission(user, "orders.update")) return null;
      const lines = row.items?.length ? row.items : [row];
      const u = rowUniformStatus(row);
      if (u === "mixed") return null;
      if (u !== "pending" && u !== "packed") return null;
      return `/admin/orders/${lines[0].id}/edit`;
    },
    [user],
  );

  const handleRevokePacked = useCallback(
    async (row: Order & { items?: Order[] }) => {
      if (!hasPermission(user, "orders.update")) return;
      if (rowUniformStatus(row) !== "packed") return;
      const lineIds = orderLineIds(row);
      if (
        !window.confirm(
          "Return this order to pending? Tracking numbers will be cleared.",
        )
      )
        return;
      setRevokePackedLoadingId(row.id);
      try {
        await Promise.all(
          lineIds.map((id) =>
            dispatch(
              updateOrder({
                id,
                patch: { status: "pending", trackingId: null },
              }),
            ).unwrap(),
          ),
        );
        toast.success("Order returned to pending");
        await loadOrders(lastQueryRef.current);
      } catch (err) {
        toast.fromError(err, "Could not revoke packed status");
      } finally {
        setRevokePackedLoadingId(null);
      }
    },
    [user, dispatch, loadOrders],
  );

  const columns = useAdminOrderTableColumns({
    selectAllHeaderRef,
    staff,
    products,
    pdfLoadingId,
    selectedIds,
    allVisibleSelected,
    toggleRowSelected,
    toggleAllVisibleSelected,
    downloadPdf,
    onOpenDetail: setDetailId,
    getAdminOrderEditHref,
    onRevokePacked: hasPermission(user, "orders.update")
      ? handleRevokePacked
      : undefined,
    revokePackedLoadingId,
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Order Management" />
        <AdminOrderFilters
          serverSearch={serverSearch}
          onServerSearchChange={setServerSearch}
          dateFrom={dateFrom}
          onDateFromChange={setDateFrom}
          dateTo={dateTo}
          onDateToChange={setDateTo}
          filtersLoading={filtersLoading}
          onApplyServerFilters={() => void applyDateFilters()}
          onClearServerFilters={() => void clearDateFilters()}
          staffFilter={staffFilter}
          onStaffFilterChange={setStaffFilter}
          staffOptions={staffOptions}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          productFilter={productFilter}
          onProductFilterChange={setProductFilter}
          productOptions={productOptions}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          typeOptions={typeOptions}
          onResetTableFilters={clearTableFilters}
          appliedDateFrom={appliedDateFrom}
          appliedDateTo={appliedDateTo}
          appliedServerSearch={appliedServerSearch}
        />
        <AdminOrderBulkBar
          selectedCount={selectedVisibleCount}
          bulkAdvanceAction={bulkAdvanceAction}
          bulkStatusLoading={bulkStatusLoading}
          bulkPdfLoading={bulkPdfLoading}
          onBulkAdvance={(next) => void applyBulkAdvance(next)}
          onDownloadSelectedPdf={() => void downloadSelectedPdf()}
          onClearSelection={clearRowSelection}
        />
        <AdminOrderMobileSelectAll
          allVisibleSelected={allVisibleSelected}
          onToggleAll={toggleAllVisibleSelected}
        />
        <Table
          columns={columns}
          data={filteredOrders}
          keyExtractor={(o) => o.id}
          emptyMessage="No orders."
        />
        <AdminOrderPagination
          visible={showApiPagination}
          listTotal={listTotal}
          listPage={listPage}
          totalPages={totalPages}
          loading={filtersLoading}
          onGoToPage={goToOrdersPage}
        />
      </Card>

      <AdminOrderDetailModal
        orderDetail={orderDetail}
        onClose={() => setDetailId(null)}
        products={products}
        staff={staff}
        sortedOrderLines={sortedOrderLines}
        discountEditable={!!discountEditable}
        discountDraft={discountDraft}
        onDiscountDraftChange={setDiscountDraft}
        savingDiscount={savingDiscount}
        onSaveDiscount={() => void saveDiscount()}
        trackingDraft={trackingDraft}
        onTrackingDraftChange={setTrackingDraft}
        onTrackingBlur={() => void persistTrackingFromBlur()}
        onCancelOrder={() => {
          if (!orderDetail) return;
          void handleStatusChange(orderLineIds(orderDetail), "cancelled");
        }}
        onReturn={() => void handleReturn()}
        onMarkPacked={() => void markPacked()}
        onMoveToDispatch={() => void moveToDispatch()}
        onConfirmDelivered={() => void confirmDelivered()}
        markingPacked={markingPacked}
        dispatching={dispatching}
        returning={returning}
      />
    </div>
  );
}

export default memo(AdminOrderManagementPage);
