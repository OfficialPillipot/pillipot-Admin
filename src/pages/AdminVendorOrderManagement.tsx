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
import { selectStaff } from "../store/staffSlice";
import { selectProducts, fetchProducts } from "../store/productsSlice";
import {
  fetchDeliveryMethods,
  selectDeliveryMethods,
} from "../store/deliveriesSlice";
import { fetchSettings, selectSettings } from "../store/settingsSlice";
import { Card, CardHeader, Table } from "../components/ui";
import { toast } from "../lib/toast";
import { downloadBulkOrdersPdf, downloadOrderPdf } from "../lib/download-order-pdf";
import type { Order, OrderStatus } from "../types";
import { AdminOrderBulkBar, type AdminBulkAdvanceAction } from "../components/orders/AdminOrderBulkBar";
import { AdminOrderDetailModal } from "../components/orders/AdminOrderDetailModal";
import { AdminOrderFilters } from "../components/orders/AdminOrderFilters";
import { AdminOrderMobileSelectAll } from "../components/orders/AdminOrderMobileSelectAll";
import {
  ADMIN_DELIVERY_FILTER_NONE,
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
import { useGetAdminVendorOrdersQuery } from "../store/api/edenApi";

function getAdminOrderEditHref(row: Order & { items?: Order[] }): string | null {
  return `/admin/orders/${row.id}`;
}

function AdminVendorOrderManagementPage() {
  const dispatch = useAppDispatch();
  const { user } = useAuth();

  // ── Use the dedicated vendor orders API ──
  const { data, isLoading, refetch } = useGetAdminVendorOrdersQuery();
  const listLines = useMemo(() => (data?.items ?? []) as Order[], [data]);

  const staff = useAppSelector(selectStaff);
  const products = useAppSelector(selectProducts);
  const deliveryMethods = useAppSelector(selectDeliveryMethods);
  const settings = useAppSelector(selectSettings);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [productFilter, setProductFilter] = useState("");
  const [staffFilter, setStaffFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [deliveryFilter, setDeliveryFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
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

  const groupedOrders = useMemo(
    () =>
      groupOrdersForAdminList(listLines, {
        productId: productFilter,
        staffId: staffFilter,
        status: statusFilter,
        orderType: typeFilter,
        deliveryMethodId: deliveryFilter,
        platform: platformFilter,
      }),
    [
      listLines,
      productFilter,
      staffFilter,
      statusFilter,
      typeFilter,
      deliveryFilter,
      platformFilter,
    ],
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
    void dispatch(fetchDeliveryMethods());
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
      await refetch();
    } catch (err) {
      toast.fromError(err, "Failed to save tracking ID");
    }
  }, [detailId, orderDetail, trackingDraft, dispatch, refetch]);

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
      await refetch();
    } catch (err) {
      toast.fromError(err, "Failed to update status");
    } finally {
      setMarkingPacked(false);
    }
  }, [orderDetail, trackingDraft, dispatch, refetch]);

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
      await refetch();
    } catch (err) {
      toast.fromError(err, "Failed to update order");
    } finally {
      setDispatching(false);
    }
  }, [orderDetail, trackingDraft, dispatch, refetch]);

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
      await refetch();
    } catch (err) {
      toast.fromError(err, "Failed to update order");
    } finally {
      setDispatching(false);
    }
  }, [orderDetail, trackingDraft, dispatch, refetch]);

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
      await refetch();
    } catch (err) {
      toast.fromError(err, "Failed to process return");
    } finally {
      setReturning(false);
    }
  }, [orderDetail, dispatch, refetch]);

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
      await refetch();
    } catch (err) {
      toast.fromError(err, "Failed to update discount");
    } finally {
      setSavingDiscount(false);
    }
  }, [orderDetail, discountDraft, dispatch, refetch]);

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
        await refetch();
      } catch (err) {
        toast.fromError(err, "Failed to update order");
      }
    },
    [dispatch, refetch],
  );

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
    setDeliveryFilter("");
    setPlatformFilter("");
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
        await refetch();
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
    [selectedIds, filteredOrders, dispatch, clearRowSelection, refetch],
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

  const deliveryOptions = useMemo(
    () => [
      { value: "", label: "All delivery types" },
      {
        value: ADMIN_DELIVERY_FILTER_NONE,
        label: "No delivery method",
      },
      ...[...deliveryMethods]
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
        .map((m) => ({ value: m.id, label: m.name })),
    ],
    [deliveryMethods],
  );

  const platformOptions = useMemo(
    () => [
      { value: "", label: "Select all platforms" },
      { value: "staff", label: "Staff" },
      { value: "webapp", label: "Webapp" },
    ],
    [],
  );


  const handleRevokePacked = useCallback(
    async (row: Order & { items?: Order[] }) => {
      const groupId = row.id;
      if (!hasPermission(user, "orders.update")) return;
      const group = groupedOrders.find((o) => o.id === groupId);
      if (!group) return;
      const lineIds = orderLineIds(group as { id: string; items?: Order[] });
      setRevokePackedLoadingId(groupId);
      try {
        await Promise.all(
          lineIds.map((id) =>
            dispatch(
              updateOrder({ id, patch: { status: "pending" } }),
            ).unwrap(),
          ),
        );
        toast.success("Reverted to pending");
        await refetch();
      } catch (err) {
        toast.fromError(err, "Failed to revoke packed status");
      } finally {
        setRevokePackedLoadingId(null);
      }
    },
    [user, dispatch, refetch, groupedOrders],
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
        <CardHeader title="Vendor Order Management" />
        <AdminOrderFilters
          serverSearch=""
          onServerSearchChange={() => {}}
          dateFrom=""
          onDateFromChange={() => {}}
          dateTo=""
          onDateToChange={() => {}}
          filtersLoading={isLoading}
          onApplyServerFilters={() => {}}
          onClearServerFilters={() => {}}
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
          deliveryFilter={deliveryFilter}
          onDeliveryFilterChange={setDeliveryFilter}
          deliveryOptions={deliveryOptions}
          platformFilter={platformFilter}
          onPlatformFilterChange={setPlatformFilter}
          platformOptions={platformOptions}
          onResetTableFilters={clearTableFilters}
          appliedDateFrom=""
          appliedDateTo=""
          appliedServerSearch=""
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
          emptyMessage={isLoading ? "Loading vendor orders…" : "No vendor orders found."}
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

export default memo(AdminVendorOrderManagementPage);
