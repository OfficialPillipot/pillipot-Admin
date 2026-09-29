import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router";
import {
  Card,
  CardHeader,
  Button,
  Table,
  type Column,
  ManagementFilterPanel,
  ManagementFilterField,
  MANAGEMENT_NATIVE_CONTROL_CLASS,
  MANAGEMENT_DATE_CONTROL_CLASS,
  ResponsiveManagementFilters,
  Select,
} from "../components/ui";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";
import type { StaffBonusDailyLogEntry } from "../types";
import { toast } from "../lib/toast";
import { formatCurrency } from "../lib/orderUtils";
import { useAuth } from "../context/AuthContext";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchStaff, selectStaff } from "../store/staffSlice";
import {
  presetLastMonth,
  presetThisMonth,
  presetThisWeek,
  presetToday,
} from "../lib/salaryPeriodPresets";

function formatTiers(tiers: StaffBonusDailyLogEntry["tiers"]): string {
  if (!tiers.length) return "—";
  return tiers
    .map((t) => `≥${t.milestoneOrders} → ${formatCurrency(t.bonus)}`)
    .join("; ");
}

function BonusDailyLogPage() {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const staffList = useAppSelector(selectStaff);
  const isStaff = user?.role === "staff";

  const [periodDates, setPeriodDates] = useState(() => presetThisMonth());
  const dateFrom = periodDates.from;
  const dateTo = periodDates.to;
  const [staffFilterId, setStaffFilterId] = useState("");
  const [staffNameFilter, setStaffNameFilter] = useState("");
  const [entries, setEntries] = useState<StaffBonusDailyLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const staffNameRef = useRef(staffNameFilter);
  staffNameRef.current = staffNameFilter;

  useEffect(() => {
    if (!isStaff) void dispatch(fetchStaff());
  }, [dispatch, isStaff]);

  const staffOptions = useMemo(
    () => [
      { value: "", label: "All staff" },
      ...[...staffList]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((s) => ({ value: s.id, label: s.name })),
    ],
    [staffList],
  );

  const load = useCallback(async () => {
    if (!dateFrom || !dateTo) {
      toast.error("Choose a date range");
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("dateFrom", dateFrom);
      params.set("dateTo", dateTo);
      if (!isStaff) {
        if (staffFilterId) params.set("staffProfileId", staffFilterId);
        const n = staffNameRef.current.trim();
        if (n) params.set("staffName", n);
      }
      const base = isStaff
        ? endpoints.staffMeBonusDailyLog
        : endpoints.staffBonusDailyLog;
      const path = `${base}?${params.toString()}`;
      const data = await api.get<{ entries: StaffBonusDailyLogEntry[] }>(path);
      setEntries(data.entries ?? []);
    } catch (err) {
      toast.fromError(err, "Failed to load bonus log");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, isStaff, staffFilterId]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyPreset = useCallback((from: string, to: string) => {
    setPeriodDates({ from, to });
  }, []);

  const columns = useMemo((): Column<StaffBonusDailyLogEntry>[] => {
    const cols: Column<StaffBonusDailyLogEntry>[] = [];
    if (!isStaff) {
      cols.push({
        key: "staffName",
        header: "Staff",
        render: (row) => row.staffName,
      });
    }
    cols.push(
      {
        key: "date",
        header: "Date (UTC)",
        render: (row) => row.date,
      },
      {
        key: "quantityTotal",
        header: "Qty",
        render: (row) => (
          <span className="tabular-nums font-semibold">{row.quantityTotal}</span>
        ),
      },
      {
        key: "baseEarnings",
        header: "Base",
        render: (row) => formatCurrency(row.baseEarnings),
      },
      {
        key: "bonusTotal",
        header: "Bonus",
        render: (row) => formatCurrency(row.bonusTotal),
      },
      {
        key: "dayTotal",
        header: "Total",
        render: (row) => (
          <span className="font-bold text-primary">
            {formatCurrency(row.dayTotal)}
          </span>
        ),
      },
      {
        key: "tiers",
        header: "Tiers hit",
        render: (row) => (
          <span className="text-sm text-text-muted">{formatTiers(row.tiers)}</span>
        ),
      },
    );
    return cols;
  }, [isStaff]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          action={
            !isStaff ? (
              <Link
                to="/admin/payroll-ledger"
                className="inline-flex items-center rounded-md border-2 border-primary px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary-muted"
              >
                Payroll
              </Link>
            ) : undefined
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

        {!isStaff && (
          <div className="mb-4 px-4 md:px-6">
            <ResponsiveManagementFilters
              modalTitle="Bonus log filters"
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
                    className={MANAGEMENT_DATE_CONTROL_CLASS}
                  />
                </ManagementFilterField>
                <ManagementFilterField label="To">
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) =>
                      setPeriodDates((prev) => ({
                        ...prev,
                        to: e.target.value,
                      }))
                    }
                    className={MANAGEMENT_DATE_CONTROL_CLASS}
                  />
                </ManagementFilterField>
                <ManagementFilterField label="Staff">
                  <Select
                    value={staffFilterId}
                    onChange={(e) => setStaffFilterId(e.target.value)}
                    options={staffOptions}
                  />
                </ManagementFilterField>
                <ManagementFilterField label="Staff name contains">
                  <input
                    type="search"
                    value={staffNameFilter}
                    onChange={(e) => setStaffNameFilter(e.target.value)}
                    placeholder="Then click Refresh — name or username…"
                    className={MANAGEMENT_NATIVE_CONTROL_CLASS}
                  />
                </ManagementFilterField>
              </ManagementFilterPanel>
            </ResponsiveManagementFilters>
          </div>
        )}

        {isStaff && (
          <div className="mb-4 px-4 md:px-6">
            <ResponsiveManagementFilters
              modalTitle="Date range"
              triggerLabel="Date range"
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
                    className={MANAGEMENT_DATE_CONTROL_CLASS}
                  />
                </ManagementFilterField>
                <ManagementFilterField label="To">
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) =>
                      setPeriodDates((prev) => ({
                        ...prev,
                        to: e.target.value,
                      }))
                    }
                    className={MANAGEMENT_DATE_CONTROL_CLASS}
                  />
                </ManagementFilterField>
              </ManagementFilterPanel>
            </ResponsiveManagementFilters>
          </div>
        )}

        <div className="px-4 pb-4 md:px-6">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => void load()}
            disabled={loading}
          >
            {loading ? "Loading…" : "Refresh"}
          </Button>
        </div>

        <Table
          data={entries}
          keyExtractor={(row) => `${row.staffId}-${row.date}`}
          emptyMessage={
            loading ? "Loading…" : "No rows in this range (days with zero qty are omitted)."
          }
          columns={columns}
        />
      </Card>
    </div>
  );
}

export default memo(BonusDailyLogPage);
