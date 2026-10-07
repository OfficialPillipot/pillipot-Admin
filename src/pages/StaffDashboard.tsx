import { memo, useEffect, useMemo } from "react";
import { Link } from "react-router";
import {
  TrophyIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/solid";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchOrders, selectOrders } from "../store/ordersSlice";
import { fetchStaffMe, selectStaffMe, selectStaffMeLoading } from "../store/staffSlice";
import { fetchProducts, selectProducts } from "../store/productsSlice";
import { fetchSettings, selectSettings } from "../store/settingsSlice";
import {
  Card,
  CardHeader,
  Button,
  ProgressBar,
} from "../components/ui";
import { isAtOrBelowStockThreshold } from "../lib/stockUtils";
import {
  computeEarningsForStaff,
  getNextMilestone,
  formatCurrency,
} from "../lib/orderUtils";

function StaffDashboardPage() {
  const dispatch = useAppDispatch();
  const orders = useAppSelector(selectOrders);
  const staffProfile = useAppSelector(selectStaffMe);
  const meLoading = useAppSelector(selectStaffMeLoading);
  const products = useAppSelector(selectProducts);
  const settings = useAppSelector(selectSettings);

  useEffect(() => {
    void dispatch(fetchOrders());
    void dispatch(fetchStaffMe());
    void dispatch(fetchProducts());
    void dispatch(fetchSettings());
  }, [dispatch]);

  const lowStockThreshold = settings?.lowStockThreshold ?? 0;

  const lowOrOutCount = useMemo(
    () =>
      products.filter((p) =>
        isAtOrBelowStockThreshold(p.stockQuantity ?? 0, lowStockThreshold)
      ).length,
    [products, lowStockThreshold]
  );

  const staffId = staffProfile?.id ?? null;

  const stats = useMemo(() => {
    if (!staffProfile || !staffId) return null;
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    dayEnd.setHours(23, 59, 59, 999);
    const todayLines = orders.filter((o) => {
      if (o.staffId !== staffId || o.status === "cancelled") return false;
      const d = new Date(o.createdAt);
      return d >= dayStart && d <= dayEnd;
    });
    const todayOrders = new Set(todayLines.map((o) => o.orderId)).size;
    const undelivered = orders.filter(
      (o) =>
        o.staffId === staffId &&
        (o.status === "scheduled" ||
          o.status === "pending" ||
          o.status === "packed" ||
          o.status === "dispatch")
    ).length;
    const todayEarn = computeEarningsForStaff(orders, staffProfile, {
      range: { start: dayStart, end: dayEnd },
    });
    const weekly = computeEarningsForStaff(orders, staffProfile, {
      weekOnly: true,
    }).total;
    return {
      todayOrders,
      todayQty: todayEarn.orderCount,
      todayTotalEarnings: todayEarn.total,
      undelivered,
      weeklyEarnings: weekly,
    };
  }, [orders, staffProfile, staffId]);

  const nextMilestone = useMemo(() => {
    if (!staffProfile || !stats) return null;
    return getNextMilestone(staffProfile, stats.todayQty);
  }, [staffProfile, stats]);

  const milestonesSorted = useMemo(() => {
    if (!staffProfile?.bonusMilestones?.length) return [];
    return [...staffProfile.bonusMilestones].sort((a, b) => a.orders - b.orders);
  }, [staffProfile]);

  const qtyToNext = useMemo(() => {
    if (!nextMilestone || !stats) return 0;
    return Math.max(0, nextMilestone.orders - stats.todayQty);
  }, [nextMilestone, stats]);

  if (meLoading) {
    return <div className="text-text-muted">Loading…</div>;
  }

  if (!staffProfile || !stats) {
    return (
      <div className="text-text-muted">
        Could not load your profile. Please contact admin.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CardHeader
        title="Dashboard"
        subtitle={`Hello, ${staffProfile.name}`}
        action={
          <Link to="/orders/create">
            <Button>Create Order</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card padding="sm" className="flex flex-col">
          <p className="text-[10px] sm:text-sm text-text-muted leading-tight">Today&apos;s Orders</p>
          <p className="mt-1 text-lg sm:text-2xl font-semibold text-text-heading">
            {stats.todayOrders}
          </p>
        </Card>
        <Card padding="sm" className="flex flex-col">
          <p className="text-[10px] sm:text-sm text-text-muted leading-tight">This Week</p>
          <p className="mt-1 text-lg sm:text-2xl font-semibold text-primary truncate">
            {formatCurrency(stats.weeklyEarnings)}
          </p>
        </Card>
        <Card
          padding="sm"
          className={`flex flex-col ${lowOrOutCount > 0
            ? "border-2 border-error/40 bg-error-bg/30"
            : ""
            }`}
        >
          <p className="text-[10px] sm:text-sm text-text-muted leading-tight">Low / out of stock</p>
          <p className="mt-1 text-lg sm:text-2xl font-semibold text-error">
            {lowOrOutCount}
          </p>
          <Link
            to="/stock"
            className="mt-auto pt-2 inline-block text-[10px] sm:text-xs font-semibold text-primary hover:underline"
          >
            <span className="hidden sm:inline">View product stock →</span>
            <span className="sm:hidden">View stock →</span>
          </Link>
        </Card>
      </div>

      {milestonesSorted.length > 0 && (
        <section
          className="relative rounded-[24px] border border-primary/10 bg-primary/5 p-4 sm:p-6 shadow-sm overflow-hidden"
          aria-labelledby="bonus-targets-heading"
        >
          <div className="flex flex-col items-start gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-md shadow-primary/20">
                <TrophyIcon className="h-6 w-6" aria-hidden />
              </div>
              <h2
                id="bonus-targets-heading"
                className="text-xl font-black tracking-tight text-text-heading sm:text-2xl"
              >
                Today Earnings              </h2>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              <div className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-muted sm:text-xs">
                Daily targets — progress resets each calendar day (your time)
              </div>
              <Link
                to="/bonus-log"
                className="text-xs font-bold text-primary hover:underline sm:text-xs"
              >
                Bonus log →
              </Link>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-4">
            <div className="flex flex-col rounded-2xl border border-border bg-surface p-3 sm:p-4 shadow-sm">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-text-muted leading-tight">
                Progress
              </p>
              <p className="mt-1 text-2xl sm:text-3xl font-black tabular-nums text-text-heading">
                {stats.todayQty}
              </p>
              <p className="mt-1 sm:mt-2 text-[10px] sm:text-xs font-medium text-text-muted leading-tight">
                qty today
              </p>
            </div>

            {nextMilestone ? (
              <>
                <div className="flex flex-col rounded-2xl border-2 border-primary/40 bg-surface p-3 sm:p-4 shadow-md ring-4 ring-primary/10">
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-text-heading leading-tight">
                    Target
                  </p>
                  <p className="mt-1 text-2xl sm:text-3xl font-black tabular-nums text-text-heading">
                    {nextMilestone.orders}
                  </p>
                  <p className="mt-1 sm:mt-2 text-[10px] sm:text-xs font-medium text-text-muted leading-tight">
                    qty to hit
                  </p>
                </div>

                <div className="flex flex-col rounded-2xl bg-primary p-3 sm:p-4 text-white shadow-md">
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white/90 leading-tight">
                    Bonus
                  </p>
                  <p className="mt-1 text-2xl sm:text-3xl font-black tabular-nums text-white">
                    {formatCurrency(nextMilestone.bonus)}
                  </p>
                  <div className="mt-auto pt-2">
                    <p className="rounded-md bg-black/20 py-1 sm:py-1.5 text-center text-[10px] sm:text-xs font-bold text-white leading-tight">
                      {qtyToNext === 0
                        ? "Reached!"
                        : `${qtyToNext} more`}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="col-span-2 rounded-2xl border border-primary/25 bg-primary-muted/80 p-3 sm:p-4 shadow-sm">
                <p className="text-xs sm:text-sm font-bold text-text-heading">All today&apos;s tiers achieved</p>
                <p className="mt-1 text-[10px] sm:text-xs text-text-muted">
                  You&apos;ve hit every milestone for today. Tomorrow starts fresh — keep up the momentum.
                </p>
              </div>
            )}
          </div>

          {nextMilestone ? (
            <div className="mt-4 sm:mt-6 rounded-2xl border border-border bg-surface p-4 sm:p-5 shadow-sm">
              <ProgressBar
                value={stats.todayQty}
                max={nextMilestone.orders}
                label="Progress to next bonus (today)"
                className="[&>div:last-child]:h-3.5 [&>div:last-child>div]:rounded-full [&>div:last-child>div]:bg-primary"
              />
              <p className="mt-4 text-center text-sm font-bold text-text-heading">
                Today (base + bonuses):{" "}
                <span className="tabular-nums text-base font-black text-primary">
                  {formatCurrency(stats.todayTotalEarnings)}
                </span>
              </p>
            </div>
          ) : (
            <p className="relative mt-4 text-center text-sm font-medium text-text-muted">
              Today (base + bonuses):{" "}
              <span className="font-black tabular-nums text-text-heading">
                {formatCurrency(stats.todayTotalEarnings)}
              </span>
            </p>
          )}

          <div className="mt-6 sm:mt-8 border-t border-border pt-6">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-text-muted sm:text-xs">
              All tiers (admin set)
            </p>
            <ul className="flex flex-col gap-2">
              {milestonesSorted.map((m) => {
                const reached = stats.todayQty >= m.orders;
                const isNext =
                  !reached &&
                  nextMilestone &&
                  m.orders === nextMilestone.orders;
                return (
                  <li
                    key={`${m.orders}-${m.bonus}`}
                    className={[
                      "flex items-center gap-3 rounded-2xl px-4 py-4 transition-colors text-sm sm:text-base border",
                      isNext
                        ? "border border-primary/40 bg-surface text-text-heading shadow-sm"
                        : "bg-surface-alt/40 border-border/60 text-text",
                    ].join(" ")}
                  >
                    {reached ? (
                      <CheckCircleIcon
                        className="h-6 w-6 shrink-0 text-success"
                        aria-hidden
                      />
                    ) : (
                      <span
                        className={[
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black sm:text-xs",
                          isNext
                            ? "bg-primary text-white"
                            : "bg-border text-white",
                        ].join(" ")}
                        aria-hidden
                      >
                        {isNext ? "!" : "○"}
                      </span>
                    )}
                    <div className="min-w-0 flex-1 flex flex-wrap items-center gap-2">
                      <span className="font-bold tabular-nums">{m.orders}</span>
                      <span className="text-text-muted">qty</span>
                      <span className="text-border">→</span>
                      <span className="font-black tabular-nums text-text-heading">
                        {formatCurrency(m.bonus)}
                      </span>
                      {reached && (
                        <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-success sm:text-xs">
                          Done
                        </span>
                      )}
                      {isNext && (
                        <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-primary sm:text-xs">
                          Current target
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}

export default memo(StaffDashboardPage);
