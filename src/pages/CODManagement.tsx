import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardHeader, Button, Table } from "../components/ui";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { selectProducts, updateProduct, fetchProducts } from "../store/productsSlice";
import { toast } from "../lib/toast";
import { formatCurrency } from "../lib/orderUtils";

function parseMilestones(text: string): { quantity: number; charge: number }[] {
  const out: { quantity: number; charge: number }[] = [];
  for (const raw of text.split(",")) {
    const part = raw.trim();
    if (!part) continue;
    const [q, c] = part.split(":").map((x) => Number(x.trim()));
    if (!Number.isFinite(q) || !Number.isFinite(c) || q <= 0 || c < 0) {
      throw new Error("Use milestone format like 1:30, 2:60, 3:90");
    }
    out.push({ quantity: q, charge: c });
  }
  return out.sort((a, b) => a.quantity - b.quantity);
}

function milestoneText(list: any): string {
  if (typeof list === "string") {
    try {
      list = JSON.parse(list);
    } catch {
      return "";
    }
  }
  if (!Array.isArray(list)) return "";
  return list
    .slice()
    .sort((a, b) => a.quantity - b.quantity)
    .map((x) => `${x.quantity}:${x.charge}`)
    .join(", ");
}

function CODManagementPage() {
  const dispatch = useAppDispatch();
  const products = useAppSelector(selectProducts);
  const [draftCharge, setDraftCharge] = useState<Record<string, string>>({});
  const [draftMilestones, setDraftMilestones] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    void dispatch(fetchProducts());
  }, [dispatch]);

  useEffect(() => {
    const charges: Record<string, string> = {};
    const milestones: Record<string, string> = {};
    for (const p of products) {
      charges[p.id] = String(p.codDeliveryCharge ?? 0);
      milestones[p.id] = milestoneText(p.codDeliveryMilestones ?? []);
    }
    setDraftCharge(charges);
    setDraftMilestones(milestones);
  }, [products]);

  const productById = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );

  const productRows = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name)),
    [products],
  );

  const saveProductRule = useCallback(
    async (productId: string) => {
      const charge = Number(draftCharge[productId] ?? "0");
      if (!Number.isFinite(charge) || charge < 0) {
        toast.error("Enter a valid COD amount");
        return;
      }
      let milestones: { quantity: number; charge: number }[] = [];
      try {
        milestones = parseMilestones(draftMilestones[productId] ?? "");
      } catch (e) {
        toast.error((e as Error).message);
        return;
      }
      
      setSavingId(productId);
      try {
        await dispatch(
          updateProduct({
            id: productId,
            patch: {
              codDeliveryCharge: charge,
              codDeliveryMilestones: milestones,
            },
          }),
        ).unwrap();
        toast.success("COD rule updated");
      } catch (err) {
        toast.fromError(err, "Failed to update COD rule");
      } finally {
        setSavingId(null);
      }
    },
    [dispatch, draftCharge, draftMilestones],
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
          title="Online COD management"
        />

        <Table
          columns={[
            {
              key: "productName",
              header: "Product",
              render: (p: (typeof productRows)[0]) => (
                <div className="font-medium">{p.name}</div>
              ),
            },
            {
              key: "rules",
              header: "COD rules",
              className: "md:min-w-[15rem]",
              render: (p: (typeof productRows)[0]) => (
                <div className="rule-card-mobile-trigger w-full min-w-0 max-w-full text-left">
                  <div className="grid w-full min-w-0 gap-3 rounded-xl border border-primary-muted bg-surface p-4 shadow-sm ring-1 ring-primary/5 transition-all hover:shadow-md">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-tightest text-text-muted/80">
                        COD Delivery Charge
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
                            draftCharge[p.id] ??
                            String(p.codDeliveryCharge ?? 0)
                          }
                          onChange={(e) =>
                            setDraftCharge((prev) => ({
                              ...prev,
                              [p.id]: e.target.value,
                            }))
                          }
                          className="box-border w-full min-w-0 max-w-full rounded-lg border border-border bg-surface-alt py-2 pl-6 pr-3 text-sm text-text outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-tightest text-text-muted/80">
                        Quantity-based rules (qty:charge)
                      </label>
                      <input
                        type="text"
                        value={
                          draftMilestones[p.id] ??
                          milestoneText(
                            productById.get(p.id)?.codDeliveryMilestones ?? [],
                          )
                        }
                        onChange={(e) =>
                          setDraftMilestones((prev) => ({
                            ...prev,
                            [p.id]: e.target.value,
                          }))
                        }
                        className="box-border w-full min-w-0 max-w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-text outline-none transition-all focus:border-primary  focus:ring-2 focus:ring-primary/10"
                        placeholder="e.g. 1:30, 2:60"
                      />
                    </div>

                    <div className="flex min-w-0 flex-wrap gap-1.5">
                      {(() => {
                        try {
                          const tiers = parseMilestones(
                            draftMilestones[p.id] ??
                            milestoneText(
                              productById.get(p.id)?.codDeliveryMilestones ?? [],
                            ),
                          );
                          if (tiers.length === 0) {
                            return (
                              <span className="text-xs font-medium italic text-text-muted">
                                No quantity rules
                              </span>
                            );
                          }
                          return tiers.map((m) => (
                            <span
                              key={`${p.id}-${m.quantity}-${m.charge}`}
                              className="rounded-md border border-primary-muted bg-primary-muted px-2 py-1 text-[10px] font-bold text-primary"
                            >
                              Qty {m.quantity} → {formatCurrency(m.charge)}
                            </span>
                          ));
                        } catch {
                          return (
                            <span className="text-[10px] font-bold text-error">
                              Invalid (qty:charge)
                            </span>
                          );
                        }
                      })()}
                    </div>

                    <p className="text-[10px] leading-tight text-text-muted/60">
                      If quantity rules are set, the specific charge for the exact ordered quantity is used. Otherwise, it falls back to the base charge.
                    </p>
                    <Button
                      size="sm"
                      className="w-full cursor-pointer shadow-sm shadow-primary/10"
                      onClick={() => void saveProductRule(p.id)}
                      loading={savingId === p.id}
                    >
                      Save COD rule
                    </Button>
                  </div>
                </div>
              ),
            },
          ]}
          data={productRows}
          keyExtractor={(p) => p.id}
          emptyMessage="No products."
        />
      </Card>
    </div>
  );
}

export default memo(CODManagementPage);
