import { memo, useMemo, useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { selectStaff, updateStaff } from "../store/staffSlice";
import { selectOrders } from "../store/ordersSlice";
import { selectProducts } from "../store/productsSlice";
import { Card, CardHeader, Table, Select, Button } from "../components/ui";
import { STAFF_JOB_ROLE_OPTIONS, staffJobRoleLabel } from "../lib/staffJobRoles";
import { toast } from "../lib/toast";
import {
  computeEarningsForStaff,
  formatDate,
  formatCurrency,
} from "../lib/orderUtils";
import type { Order } from "../types";
import type { SelectOption } from "../components/ui/Select";

function StaffProfilePage() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const staff = useAppSelector(selectStaff);
  const orders = useAppSelector(selectOrders);
  const products = useAppSelector(selectProducts);
  const [productFilter, setProductFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [jobRoleDraft, setJobRoleDraft] = useState("sales");
  const [jobRoleSaving, setJobRoleSaving] = useState(false);

  const staffProfile = useMemo(
    () => staff.find((s) => s.id === id),
    [staff, id]
  );

  useEffect(() => {
    if (staffProfile) setJobRoleDraft(staffProfile.jobRole || "sales");
  }, [staffProfile?.id, staffProfile?.jobRole]);

  const saveJobRole = useCallback(async () => {
    if (!staffProfile || !id) return;
    setJobRoleSaving(true);
    try {
      await dispatch(
        updateStaff({ id, patch: { jobRole: jobRoleDraft } })
      ).unwrap();
      toast.success("Job type updated");
    } catch {
      toast.error("Failed to update job type");
    } finally {
      setJobRoleSaving(false);
    }
  }, [dispatch, id, staffProfile, jobRoleDraft]);

  const staffOrders = useMemo(() => {
    if (!id) return [];
    let list = orders.filter((o) => o.staffId === id);
    if (productFilter) list = list.filter((o) => o.productId === productFilter);
    if (typeFilter) list = list.filter((o) => o.orderType === typeFilter);
    if (dateFilter) list = list.filter((o) => o.createdAt.startsWith(dateFilter));
    return list.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [id, orders, productFilter, typeFilter, dateFilter]);

  const stats = useMemo(() => {
    if (!staffProfile) return null;
    const all = computeEarningsForStaff(orders, staffProfile);
    const weekly = computeEarningsForStaff(orders, staffProfile, {
      weekOnly: true,
    });
    return { ...all, weeklyEarnings: weekly.total };
  }, [staffProfile, orders]);

  const productOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: "All products" },
      ...products.map((p) => ({ value: p.id, label: p.name })),
    ],
    [products]
  );

  const typeOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: "All" },
      { value: "cod", label: "COD" },
      { value: "prepaid", label: "Prepaid" },
    ],
    []
  );

  const columns = useMemo(
    () => [
      { key: "orderId", header: "Order ID" },
      { key: "createdAt", header: "Date", render: (o: Order) => formatDate(o.createdAt) },
      { key: "customerName", header: "Customer" },
      {
        key: "productId",
        header: "Product",
        render: (o: Order) => products.find((p) => p.id === o.productId)?.name ?? o.productId,
      },
      {
        key: "orderType",
        header: "Type",
        render: (o: Order) => o.orderType.toUpperCase(),
      },
      {
        key: "discountAmount",
        header: "Discount",
        render: (o: Order) =>
          o.discountAmount != null && o.discountAmount > 0
            ? `₹${Number(o.discountAmount).toFixed(2)}`
            : "—",
      },
      {
        key: "sellingAmount",
        header: "Total",
        render: (o: Order) => `₹${Number(o.sellingAmount).toFixed(2)}`,
      },
      { key: "status", header: "Status" },
    ],
    [products]
  );

  if (!staffProfile) {
    return (
      <div className="text-text-muted">
        Staff not found. <Link to="/admin/staff" className="text-primary hover:underline">Back to staff</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link to="/admin/staff" className="text-primary hover:underline">
          ← Staff
        </Link>
      </div>
      <Card>
        <CardHeader
          title={staffProfile.name}
          subtitle={`Joined ${formatDate(staffProfile.joinedDate)} · ${staffProfile.isActive ? "Active" : "Inactive"}`}
        />
        <dl className="grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-text-muted">Username</dt>
            <dd className="font-medium">{staffProfile.username}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-muted">Phone</dt>
            <dd className="font-medium">{staffProfile.phone || "—"}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-muted">Job type</dt>
            <dd className="font-medium">{staffJobRoleLabel(staffProfile.jobRole)}</dd>
          </div>
          <div className="sm:col-span-3">
            <dt className="text-sm text-text-muted">Change job type</dt>
            <dd className="mt-2 flex flex-wrap items-end gap-2">
              <div className="min-w-[12rem] flex-1">
                <Select
                  label=""
                  options={STAFF_JOB_ROLE_OPTIONS}
                  value={jobRoleDraft}
                  onChange={(e) => setJobRoleDraft(e.target.value)}
                  className="w-full"
                />
              </div>
              <Button
                type="button"
                size="sm"
                loading={jobRoleSaving}
                onClick={() => void saveJobRole()}
              >
                Save
              </Button>
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-muted">Total orders</dt>
            <dd className="font-medium">{stats?.orderCount ?? 0}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-muted">Total earnings</dt>
            <dd className="font-medium text-earnings">
              {stats ? formatCurrency(stats.total) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-muted">This week</dt>
            <dd className="font-medium text-primary">
              {stats ? formatCurrency(stats.weeklyEarnings) : "—"}
            </dd>
          </div>
        </dl>
      </Card>

      <Card>
        <CardHeader title="Orders" subtitle="All orders by this staff" />
        <div className="mb-4 flex flex-wrap gap-3">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <Select
            options={productOptions}
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="w-40"
          />
          <Select
            options={typeOptions}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-32"
          />
        </div>
        <Table
          columns={columns}
          data={staffOrders}
          keyExtractor={(o) => o.id}
          emptyMessage="No orders."
        />
      </Card>
    </div>
  );
}

export default memo(StaffProfilePage);
