import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  Card,
  CardHeader,
  Button,
  Table,
  Badge,
  ManagementFilterPanel,
  ManagementFilterField,
  MANAGEMENT_NATIVE_CONTROL_CLASS,
  ResponsiveManagementFilters,
  Select,
} from "../components/ui";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { selectStaff, fetchStaff } from "../store/staffSlice";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";
import type { StaffEarnings, StaffSalaryPaymentRow } from "../types";
import { toast } from "../lib/toast";
import { formatCurrency } from "../lib/orderUtils";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../lib/permissions";
import {
  presetLastMonth,
  presetThisMonth,
  presetThisWeek,
  presetToday,
} from "../lib/salaryPeriodPresets";

/** Pay is only offered when period total reaches at least this amount (₹). */
const MIN_PAY_TOTAL = 30;

function formatPaidAt(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StaffPayrollLedgerPage() {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const canRecordPay = hasPermission(user, "staff.update");
  const staff = useAppSelector(selectStaff);

  const [earningsRows, setEarningsRows] = useState<StaffEarnings[]>([]);
  const [payments, setPayments] = useState<StaffSalaryPaymentRow[]>([]);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [periodDates, setPeriodDates] = useState(() => presetToday());
  const dateFrom = periodDates.from;
  const dateTo = periodDates.to;
  const [staffFilterId, setStaffFilterId] = useState("");
  const [payStatusFilter, setPayStatusFilter] = useState<
    "" | "paid" | "unpaid"
  >("");
  const [payingId, setPayingId] = useState<string | null>(null);

  const periodComplete = Boolean(dateFrom && dateTo);

  useEffect(() => {
    if (!periodComplete) setPayStatusFilter("");
  }, [periodComplete]);

  const loadEarnings = useCallback(async () => {
    setEarningsLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const qs = params.toString();
      const path = qs ? `${endpoints.staffEarnings}?${qs}` : endpoints.staffEarnings;
      const data = await api.get<StaffEarnings[]>(path);
      setEarningsRows(data);
    } catch (err) {
      toast.fromError(err, "Failed to load earnings");
      setEarningsRows([]);
    } finally {
      setEarningsLoading(false);
    }
  }, [dateFrom, dateTo]);

  const loadPayments = useCallback(async () => {
    setPaymentsLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (staffFilterId) params.set("staffProfileId", staffFilterId);
      const qs = params.toString();
      const path = qs
        ? `${endpoints.staffSalaryPayments}?${qs}`
        : endpoints.staffSalaryPayments;
      const data = await api.get<StaffSalaryPaymentRow[]>(path);
      setPayments(data);
    } catch (err) {
      toast.fromError(err, "Failed to load payment history");
      setPayments([]);
    } finally {
      setPaymentsLoading(false);
    }
  }, [dateFrom, dateTo, staffFilterId]);

  useEffect(() => {
    void dispatch(fetchStaff());
  }, [dispatch]);

  useEffect(() => {
    void loadEarnings();
  }, [loadEarnings]);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  const staffOptions = useMemo(
    () => [
      { value: "", label: "All staff" },
      ...[...staff]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((s) => ({ value: s.id, label: s.name })),
    ],
    [staff],
  );

  const payStatusOptions = useMemo(
    () => [
      { value: "", label: "All statuses" },
      { value: "paid", label: "Paid" },
      { value: "unpaid", label: "Unpaid" },
    ],
    [],
  );

  const filteredEarnings = useMemo(() => {
    let rows = staffFilterId
      ? earningsRows.filter((r) => r.staffId === staffFilterId)
      : earningsRows;
    if (!periodComplete || payStatusFilter === "") return rows;
    if (payStatusFilter === "paid") {
      return rows.filter((r) => r.periodPayment != null);
    }
    return rows.filter((r) => r.periodPayment == null);
  }, [earningsRows, staffFilterId, periodComplete, payStatusFilter]);

  const applyPreset = useCallback((from: string, to: string) => {
    setPeriodDates({ from, to });
  }, []);

  const recordPayment = useCallback(
    async (r: StaffEarnings) => {
      if (!periodComplete || !dateFrom || !dateTo) {
        toast.error("Choose a date range first");
        return;
      }
      if (r.periodPayment != null) return;
      if (r.total < MIN_PAY_TOTAL) {
        toast.error(`Total must be at least ${formatCurrency(MIN_PAY_TOTAL)} to record pay`);
        return;
      }
      setPayingId(r.staffId);
      try {
        await api.post(endpoints.staffSalaryPayments, {
          staffProfileId: r.staffId,
          dateFrom,
          dateTo,
        });
        toast.success(`Recorded pay for ${r.staffName}`);
        await loadEarnings();
        await loadPayments();
      } catch (err) {
        toast.fromError(err, "Could not record payment");
      } finally {
        setPayingId(null);
      }
    },
    [dateFrom, dateTo, loadEarnings, loadPayments, periodComplete],
  );

  const refreshAll = useCallback(() => {
    void loadEarnings();
    void loadPayments();
  }, [loadEarnings, loadPayments]);

  const busy = earningsLoading || paymentsLoading;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Payroll"
          subtitle="Choose a period to see earnings, pay status, and record payouts. Pay rules are edited under Staff pay."
          action={
            <Link
              to="/admin/salary"
              className="inline-flex items-center rounded-md border-2 border-primary px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary-muted"
            >
              Staff pay
            </Link>
          }
        />

        <div className="mb-3 flex flex-wrap gap-2 px-4 md:px-6">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => applyPreset(presetToday().from, presetToday().to)}
          >
            Today
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const p = presetThisWeek();
              applyPreset(p.from, p.to);
            }}
          >
            This week
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const p = presetThisMonth();
              applyPreset(p.from, p.to);
            }}
          >
            This month
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const p = presetLastMonth();
              applyPreset(p.from, p.to);
            }}
          >
            Last month
          </Button>
        </div>

        <div className="mb-4 px-4 md:px-6">
          <ResponsiveManagementFilters
            modalTitle="Payroll filters"
            triggerLabel="Filters"
          >
            <ManagementFilterPanel>
              <ManagementFilterField label="From">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) =>
                    setPeriodDates((prev) => ({
                      ...prev,
                      from: e.target.value,
                    }))
                  }
                  className={MANAGEMENT_NATIVE_CONTROL_CLASS}
                  aria-label="From date"
                />
              </ManagementFilterField>
              <ManagementFilterField label="To">
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) =>
                    setPeriodDates((prev) => ({ ...prev, to: e.target.value }))
                  }
                  className={MANAGEMENT_NATIVE_CONTROL_CLASS}
                  aria-label="To date"
                />
              </ManagementFilterField>
              <ManagementFilterField label="Staff">
                <Select
                  options={staffOptions}
                  value={staffFilterId}
                  onChange={(e) => setStaffFilterId(e.target.value)}
                />
              </ManagementFilterField>
              <ManagementFilterField label="Pay status">
                <Select
                  options={payStatusOptions}
                  value={payStatusFilter}
                  onChange={(e) =>
                    setPayStatusFilter(e.target.value as "" | "paid" | "unpaid")
                  }
                  disabled={!periodComplete}
                  title={
                    periodComplete
                      ? undefined
                      : "Choose From and To dates to filter by paid or unpaid"
                  }
                />
              </ManagementFilterField>
              <ManagementFilterField label="Apply">
                <Button type="button" onClick={refreshAll} loading={busy}>
                  Refresh
                </Button>
              </ManagementFilterField>
            </ManagementFilterPanel>
          </ResponsiveManagementFilters>
          {!periodComplete ? (
            <p className="mt-2 text-xs text-text-muted">
              Tip: pick <strong>From</strong> and <strong>To</strong> to enable{" "}
              <strong>Pay</strong> and to match rows with payment records.
            </p>
          ) : (
            <p className="mt-2 text-xs text-text-muted">
              Period <span className="font-mono">{dateFrom}</span> →{" "}
              <span className="font-mono">{dateTo}</span>
            </p>
          )}
        </div>

        {earningsLoading ? (
          <p className="px-4 py-6 text-sm text-text-muted md:px-6">Loading…</p>
        ) : (
          <Table
            columns={[
              {
                key: "staffName",
                header: "Staff",
                render: (r: StaffEarnings) => (
                  <div className="font-medium">{r.staffName}</div>
                ),
              },
              {
                key: "rate",
                header: "₹ / qty",
                render: (r: StaffEarnings) => (
                  <span className="font-mono text-sm">
                    {formatCurrency(r.payoutPerOrder)}
                  </span>
                ),
              },
              {
                key: "orderCount",
                header: "Qty",
                render: (r: StaffEarnings) => (
                  <span className="font-mono">{r.orderCount}</span>
                ),
              },
              {
                key: "base",
                header: "Base",
                render: (r: StaffEarnings) => formatCurrency(r.orderEarnings),
              },
              {
                key: "bonus",
                header: "Bonus",
                render: (r: StaffEarnings) => formatCurrency(r.bonus),
              },
              {
                key: "total",
                header: "Total",
                render: (r: StaffEarnings) => (
                  <span className="font-semibold text-earnings">
                    {formatCurrency(r.total)}
                  </span>
                ),
              },
              {
                key: "status",
                header: "Pay status",
                render: (r: StaffEarnings) => {
                  if (!periodComplete) {
                    return <span className="text-xs text-text-muted">—</span>;
                  }
                  if (r.periodPayment != null) {
                    return (
                      <div className="space-y-0.5">
                        <Badge variant="success">Paid</Badge>
                        <p className="text-[10px] text-text-muted">
                          {formatPaidAt(r.periodPayment.paidAt)}
                          {r.periodPayment.paidByName
                            ? ` · ${r.periodPayment.paidByName}`
                            : ""}
                        </p>
                      </div>
                    );
                  }
                  return <Badge variant="warning">Unpaid</Badge>;
                },
              },
              {
                key: "pay",
                header: "",
                render: (r: StaffEarnings) => {
                  if (!canRecordPay || !periodComplete) {
                    return <span className="text-text-muted">—</span>;
                  }
                  if (r.periodPayment != null) {
                    return <span className="text-xs text-text-muted">Done</span>;
                  }
                  const belowMin = r.total < MIN_PAY_TOTAL;
                  return (
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      loading={payingId === r.staffId}
                      disabled={
                        belowMin ||
                        (payingId !== null && payingId !== r.staffId)
                      }
                      title={
                        belowMin
                          ? `Pay when total is ${formatCurrency(MIN_PAY_TOTAL)} or more`
                          : undefined
                      }
                      onClick={() => void recordPayment(r)}
                    >
                      Pay
                    </Button>
                  );
                },
              },
            ]}
            data={filteredEarnings}
            keyExtractor={(r) => r.staffId}
            emptyMessage="No staff or no data for this period."
          />
        )}
      </Card>

      <Card>
        <CardHeader
          title="Payment history"
          subtitle="Recorded payouts for the same period filters above (up to 250 rows). Staff filter applies here."
        />
        {paymentsLoading ? (
          <p className="px-4 py-6 text-sm text-text-muted md:px-6">
            Loading…
          </p>
        ) : (
          <Table
            columns={[
              {
                key: "paidAt",
                header: "Paid at",
                render: (p: StaffSalaryPaymentRow) => formatPaidAt(p.paidAt),
              },
              { key: "staffName", header: "Staff" },
              {
                key: "period",
                header: "Period",
                render: (p: StaffSalaryPaymentRow) => (
                  <span className="font-mono text-xs">
                    {p.periodStart} → {p.periodEnd}
                  </span>
                ),
              },
              { key: "quantityCount", header: "Qty" },
              {
                key: "baseAmount",
                header: "Base",
                render: (p: StaffSalaryPaymentRow) =>
                  formatCurrency(p.baseAmount),
              },
              {
                key: "bonusAmount",
                header: "Bonus",
                render: (p: StaffSalaryPaymentRow) =>
                  formatCurrency(p.bonusAmount),
              },
              {
                key: "totalAmount",
                header: "Total",
                render: (p: StaffSalaryPaymentRow) => (
                  <span className="font-semibold">
                    {formatCurrency(p.totalAmount)}
                  </span>
                ),
              },
              {
                key: "paidBy",
                header: "Recorded by",
                render: (p: StaffSalaryPaymentRow) => p.paidByName ?? "—",
              },
              {
                key: "note",
                header: "Note",
                render: (p: StaffSalaryPaymentRow) =>
                  p.note?.trim() ? (
                    <span className="text-xs">{p.note}</span>
                  ) : (
                    <span className="text-text-muted">—</span>
                  ),
              },
            ]}
            data={payments}
            keyExtractor={(p) => p.id}
            emptyMessage="No payments in this range."
          />
        )}
      </Card>
    </div>
  );
}

export default memo(StaffPayrollLedgerPage);
