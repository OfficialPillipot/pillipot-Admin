import { useMemo } from "react";
import { 
  Squares2X2Icon
} from "@heroicons/react/24/outline";
import {
  Card,
  Table,
  Tooltip,
  ToggleSwitch,
} from "../components/ui";
import {
  useGetAdminVendorProductsQuery,
  useGetVendorsQuery,
  useUpdateProductMutation,
} from "../store/api/edenApi";
import { toast } from "../lib/toast";
import type { Product } from "../types";

export default function AdminVendorProductManagement() {
  const { data: products = [], isLoading } = useGetAdminVendorProductsQuery();
  const { data: vendors = [] } = useGetVendorsQuery();
  const [updateProduct] = useUpdateProductMutation();

  const vendorMap = useMemo(() => {
    const map = new Map<string, (typeof vendors)[0]>();
    for (const v of vendors) {
      if (v.id) map.set(v.id, v);
    }
    return map;
  }, [vendors]);

  const handleToggleActive = async (id: string, nextValue: boolean) => {
    try {
      await updateProduct({ id, patch: { isActive: nextValue } }).unwrap();
      toast.success(`Product ${nextValue ? "activated in catalog" : "hidden from catalog"}`);
    } catch (err) {
      toast.fromError(err, "Failed to update product status");
    }
  };

  const columns = useMemo(() => [
    { 
      key: "productCode", 
      header: "ID", 
      className: "whitespace-nowrap min-w-[6.5rem]",
      render: (row: Product) => (
        <span className="text-[10px] font-black uppercase tracking-widest text-text-muted whitespace-nowrap">
          {row.productCode || "—"}
        </span>
      )
    },
    { 
      key: "image", 
      header: "Product", 
      render: (row: Product) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-surface-muted overflow-hidden flex items-center justify-center border border-border shadow-sm shrink-0">
            {row.imageUrl ? (
              <img src={row.imageUrl} alt={row.name} className="h-full w-full object-cover" />
            ) : (
              <Squares2X2Icon className="h-5 w-5 text-text-muted/20" />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-sm text-text-heading truncate">{row.name}</span>
            <span className="text-[10px] font-bold text-text-muted/60 uppercase tracking-tight">
              {row.categoryName || "Uncategorized"}
            </span>
          </div>
        </div>
      )
    },
    {
      key: "vendor",
      header: "Vendor",
      render: (row: Product) => {
        const v = row.vendor || (row.vendorId ? vendorMap.get(row.vendorId) : null);
        const name = v?.businessName?.trim() || v?.ownerName?.trim() || "—";
        const sub = v?.businessName && v?.ownerName && v.businessName !== v.ownerName ? v.ownerName : null;
        return (
          <div className="flex flex-col min-w-0 max-w-[170px]">
            <span className="font-semibold text-xs text-text-heading truncate" title={name}>
              {name}
            </span>
            {sub && (
              <span className="text-[10px] text-text-muted truncate" title={sub}>
                {sub}
              </span>
            )}
          </div>
        );
      }
    },
    { 
      key: "price", 
      header: "Selling", 
      render: (row: Product) => (
        <span className="text-sm font-black text-primary">₹{row.price}</span>
      )
    },
    { 
      key: "stock", 
      header: "Stock", 
      render: (row: Product) => (
        <span className={`text-xs font-bold ${row.stockQuantity > 0 ? "text-text-muted" : "text-error"}`}>
          {row.stockQuantity} Qty
        </span>
      )
    },
    {
      key: "status",
      header: "Status",
      render: (row: Product) => (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border ${
          row.isActive 
            ? "bg-success/10 text-success border-success/20" 
            : "bg-surface-muted text-text-muted/40 border-border"
        }`}>
          {row.isActive ? "Active" : "Inactive"}
        </span>
      )
    },
    {
      key: "actions",
      header: "Actions",
      render: (row: Product) => (
        <div className="flex items-center gap-2">
          <Tooltip content={row.isActive ? "Hide from Catalog" : "Show in Catalog"}>
            <ToggleSwitch 
              checked={!!row.isActive} 
              onChange={(newVal) => handleToggleActive(row.id, newVal)}
              aria-label={row.isActive ? "Hide product from catalog" : "Show product in catalog"}
            />
          </Tooltip>
        </div>
      )
    }
  ], [handleToggleActive, vendorMap]);

  return (
    <div className="space-y-6">
      <Card padding="none">
        <div className="p-1">
          {isLoading ? (
            <div className="py-24 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
              <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-text-muted">Loading Marketplace Catalog...</p>
            </div>
          ) : (
            <Table 
              columns={columns} 
              data={products} 
              keyExtractor={(p) => p.id} 
              emptyMessage="No vendor products found." 
              mobileCards={true}
            />
          )}
        </div>
      </Card>
    </div>
  );
}
