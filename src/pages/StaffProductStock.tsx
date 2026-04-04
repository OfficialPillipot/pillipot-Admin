import { memo, useMemo } from "react";
import { useAppSelector } from "../store/hooks";
import { selectProducts } from "../store/productsSlice";
import { selectSettings } from "../store/settingsSlice";
import type { Product } from "../types";
import { Card, CardHeader, Table, Badge } from "../components/ui";
import {
  isAtOrBelowStockThreshold,
  stockStatusLabel,
} from "../lib/stockUtils";

function StaffProductStockPage() {
  const products = useAppSelector(selectProducts);
  const settings = useAppSelector(selectSettings);
  const lowStockThreshold = settings?.lowStockThreshold ?? 0;

  const productsInventorySorted = useMemo(() => {
    return [...products].sort((a, b) => {
      const aLow = isAtOrBelowStockThreshold(a.stockQuantity ?? 0, lowStockThreshold)
        ? 0
        : 1;
      const bLow = isAtOrBelowStockThreshold(b.stockQuantity ?? 0, lowStockThreshold)
        ? 0
        : 1;
      if (aLow !== bLow) return aLow - bLow;
      return (
        (a.stockQuantity ?? 0) - (b.stockQuantity ?? 0) ||
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      );
    });
  }, [products, lowStockThreshold]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Product stock"
        // subtitle={`Catalog quantities for every product. Rows at or below ${lowStockThreshold} units are highlighted (threshold is set by admin in Settings).`}
        />
        <Table
          columns={[
            { key: "name", header: "Product" },
            {
              key: "categoryName",
              header: "Category",
              render: (p: Product) => p.categoryName ?? "—",
            },
            {
              key: "sku",
              header: "SKU",
              render: (p: Product) => p.sku ?? "—",
            },
            {
              key: "price",
              header: "Selling (₹)",
              render: (p: Product) => `₹${Number(p.price).toFixed(2)}`,
            },
            {
              key: "stockQuantity",
              header: "Stock",
              render: (p: Product) => {
                const q = p.stockQuantity ?? 0;
                const st = stockStatusLabel(q, lowStockThreshold);
                return (
                  <span
                    className={[
                      "font-mono font-semibold tabular-nums",
                      st ? "text-error" : "text-text-heading",
                    ].join(" ")}
                  >
                    {q}
                  </span>
                );
              },
            },
            {
              key: "status",
              header: "Status",
              render: (p: Product) => {
                const st = stockStatusLabel(p.stockQuantity ?? 0, lowStockThreshold);
                if (st === "out") return <Badge variant="error">Out of stock</Badge>;
                if (st === "low") return <Badge variant="warning">Low</Badge>;
                return <Badge variant="success">Available</Badge>;
              },
            },
          ]}
          data={productsInventorySorted}
          keyExtractor={(p) => p.id}
          emptyMessage="No products in catalog."
        />
      </Card>
    </div>
  );
}

export default memo(StaffProductStockPage);
