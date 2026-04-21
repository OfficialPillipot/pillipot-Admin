import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Card, CardHeader, Button, Table } from "../components/ui";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { selectStaff, updateStaff, fetchStaff } from "../store/staffSlice";
import { toast } from "../lib/toast";
import { formatCurrency } from "../lib/orderUtils";

function parseMilestones(text: string): { orders: number; bonus: number }[] {
  const out: { orders: number; bonus: number }[] = [];
  for (const raw of text.split(",")) {
    const part = raw.trim();
    if (!part) continue;
    const [o, b] = part.split(":").map((x) => Number(x.trim()));
    if (!Number.isFinite(o) || !Number.isFinite(b) || o < 0 || b < 0) {
      throw new Error("Use milestone format like 5:50, 10:100, 15:150");
    }
    out.push({ orders: o, bonus: b });
  }
  return out.sort((a, b) => a.orders - b.orders);
}

function milestoneText(list: { orders: number; bonus: number }[]): string {
  return list
    .slice()
    .sort((a, b) => a.orders - b.orders)
    .map((x) => `${x.orders}:${x.bonus}`)
    .join(", ");
}

function SalaryManagementPage() {
  const dispatch = useAppDispatch();
  const staff = useAppSelector(selectStaff);
  const [draftPayout, setDraftPayout] = useState<Record<string, string>>({});
  const [draftMilestones, setDraftMilestones] = useState<Record<string, string>>(
    {},
  );
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    void dispatch(fetchStaff());
  }, [dispatch]);

  useEffect(() => {
    const payout: Record<string, string> = {};
    const milestones: Record<string, string> = {};
    for (const s of staff) {
      payout[s.id] = String(s.payoutPerOrder ?? 30);
      milestones[s.id] = milestoneText(s.bonusMilestones ?? []);
    }
    setDraftPayout(payout);
    setDraftMilestones(milestones);
  }, [staff]);

  const staffById = useMemo(
    () => new Map(staff.map((s) => [s.id, s])),
    [staff],
  );

  const staffRows = useMemo(
    () => [...staff].sort((a, b) => a.name.localeCompare(b.name)),
    [staff],
  );

  const saveStaffRule = useCallback(
    async (staffId: string) => {
      const payout = Number(draftPayout[staffId] ?? "30");
      if (!Number.isFinite(payout) || payout < 0) {
        toast.error("Enter a valid payout amount");
        return;
      }
      let milestones: { orders: number; bonus: number }[] = [];
      try {
        milestones = parseMilestones(draftMilestones[staffId] ?? "");
      } catch (e) {
        toast.error((e as Error).message);
        return;
      }
      setSavingId(staffId);
      try {
        await dispatch(
          updateStaff({
            id: staffId,
            patch: {
              payoutPerOrder: payout,
              bonusMilestones: milestones,
            },
          }),
        ).unwrap();
        toast.success("Pay rule updated");
      } catch (err) {
        toast.fromError(err, "Failed to update pay rule");
      } finally {
        setSavingId(null);
      }
    },
    [dispatch, draftMilestones, draftPayout],
  );

  return (
    <div className="space-y-4">
      <style>{`
        @media (max-width: 767px) {
          dl > div:has(.rule-card-mobile-trigger) {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 0.5rem !important;
          }
          dl > div:has(.rule-card-mobile-trigger) > dt {
            width: 100% !important;
          }
          dl > div:has(.rule-card-mobile-trigger) > dd {
            width: 100% !important;
            text-align: left !important;
          }
        }
      `}</style>

      <Card>
        <CardHeader
          title="Staff pay"
          // subtitle="Set amount per quantity and milestone bonuses for each staff member. To review earnings and record payouts, use Payroll."
          action={
            <Link
              to="/admin/payroll-ledger"
              className="inline-flex items-center rounded-md border-2 border-primary px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary-muted"
            >
              Payroll
            </Link>
          }
        />

        <Table
          columns={[
            {
              key: "staffName",
              header: "Staff",
              render: (s: (typeof staffRows)[0]) => (
                <div className="font-medium">{s.name}</div>
              ),
            },
            {
              key: "rules",
              header: "Pay rules",
              className: "md:min-w-[15rem]",
              render: (s: (typeof staffRows)[0]) => (
                <div className="rule-card-mobile-trigger w-full min-w-0 max-w-full text-left">
                  <div className="grid w-full min-w-0 gap-3 rounded-xl border border-primary-muted bg-surface p-4 shadow-sm ring-1 ring-primary/5 transition-all hover:shadow-md">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-tightest text-text-muted/80">
                        Amount per quantity
                      </label>
                      <div className="group relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-text-muted transition-colors group-focus-within:text-primary">
                          ₹
                        </span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={
                            draftPayout[s.id] ??
                            String(s.payoutPerOrder ?? 30)
                          }
                          onChange={(e) =>
                            setDraftPayout((prev) => ({
                              ...prev,
                              [s.id]: e.target.value,
                            }))
                          }
                          className="box-border w-full min-w-0 max-w-full rounded-lg border border-border bg-surface-alt py-2 pl-6 pr-3 text-sm text-text outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-tightest text-text-muted/80">
                        Milestone amounts (qty:bonus)
                      </label>
                      <input
                        type="text"
                        value={
                          draftMilestones[s.id] ??
                          milestoneText(
                            staffById.get(s.id)?.bonusMilestones ?? [],
                          )
                        }
                        onChange={(e) =>
                          setDraftMilestones((prev) => ({
                            ...prev,
                            [s.id]: e.target.value,
                          }))
                        }
                        className="box-border w-full min-w-0 max-w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-text outline-none transition-all focus:border-primary  focus:ring-2 focus:ring-primary/10"
                        placeholder="e.g. 5:50, 10:100"
                      />
                    </div>

                    <div className="flex min-w-0 flex-wrap gap-1.5">
                      {(() => {
                        try {
                          const tiers = parseMilestones(
                            draftMilestones[s.id] ??
                            milestoneText(
                              staffById.get(s.id)?.bonusMilestones ?? [],
                            ),
                          );
                          if (tiers.length === 0) {
                            return (
                              <span className="text-xs font-medium italic text-text-muted">
                                No tiers
                              </span>
                            );
                          }
                          return tiers.map((m) => (
                            <span
                              key={`${s.id}-${m.orders}-${m.bonus}`}
                              className="rounded-md border border-primary-muted bg-primary-muted px-2 py-1 text-[10px] font-bold text-primary"
                            >
                              {m.orders}+ qty → {formatCurrency(m.bonus)}
                            </span>
                          ));
                        } catch {
                          return (
                            <span className="text-[10px] font-bold text-error">
                              Invalid (qty:bonus)
                            </span>
                          );
                        }
                      })()}
                    </div>

                    <p className="text-[10px] leading-tight text-text-muted/60">
                      Bonuses stack for every tier at or below the period
                      quantity.
                    </p>
                    <Button
                      size="sm"
                      className="w-full cursor-pointer shadow-sm shadow-primary/10"
                      onClick={() => void saveStaffRule(s.id)}
                      loading={savingId === s.id}
                    >
                      Save pay rules
                    </Button>
                  </div>
                </div>
              ),
            },
          ]}
          data={staffRows}
          keyExtractor={(s) => s.id}
          emptyMessage="No staff members."
        />
      </Card>
    </div>
  );
}

export default memo(SalaryManagementPage);
