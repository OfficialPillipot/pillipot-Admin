import { useState, useMemo, useCallback } from "react";
import { 
  Squares2X2Icon 
} from "@heroicons/react/24/outline";
import {
  Card,
  Table,
  Tooltip,
  ToggleSwitch,
  Button,
  ManagementFilterField,
  ManagementFilterPanel,
  ManagementFilterActions,
  MANAGEMENT_NATIVE_CONTROL_CLASS,
  MANAGEMENT_FILTER_BTN_CLASS,
  ResponsiveManagementFilters,
  SearchableMultiSelect,
  type MultiSelectOption,
} from "../components/ui";
import {
  useGetAdminVendorProductsQuery,
  useGetVendorsQuery,
  useGetCategoriesQuery,
  useGetSubcategoriesQuery,
  useUpdateProductMutation,
} from "../store/api/edenApi";
import { toast } from "../lib/toast";
import type { Product } from "../types";

const STATUS_MULTI_OPTIONS: MultiSelectOption[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export default function AdminVendorProductManagement() {
  const { data: products = [], isLoading: productsLoading } = useGetAdminVendorProductsQuery();
  const { data: vendors = [], isLoading: vendorsLoading } = useGetVendorsQuery();
  const { data: categories = [] } = useGetCategoriesQuery();
  const { data: subcategories = [] } = useGetSubcategoriesQuery();
  const [updateProduct] = useUpdateProductMutation();

  const isLoading = productsLoading || vendorsLoading;

  // ── Draft Filter State (Only applied upon clicking "Apply") ──
  const [searchDraft, setSearchDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState<string[]>([]);
  const [categoryDraft, setCategoryDraft] = useState<string[]>([]);
  const [subcategoryDraft, setSubcategoryDraft] = useState<string[]>([]);

  // ── Applied Filter State ──
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedStatus, setAppliedStatus] = useState<string[]>([]);
  const [appliedCategory, setAppliedCategory] = useState<string[]>([]);
  const [appliedSubcategory, setAppliedSubcategory] = useState<string[]>([]);

  const vendorMap = useMemo(() => {
    const map = new Map<string, (typeof vendors)[0]>();
    for (const v of vendors) {
      if (v.id) map.set(v.id, v);
    }
    return map;
  }, [vendors]);

  const categoryMap = useMemo(() => {
    const map = new Map<string, (typeof categories)[0]>();
    for (const c of categories) {
      if (c.id) map.set(c.id, c);
    }
    return map;
  }, [categories]);

  const subcategoryMap = useMemo(() => {
    const map = new Map<string, (typeof subcategories)[0]>();
    for (const sc of subcategories) {
      if (sc.id) map.set(sc.id, sc);
    }
    return map;
  }, [subcategories]);

  const categoryOptions = useMemo<MultiSelectOption[]>(() => {
    return categories.map((c) => ({ value: c.id, label: c.name }));
  }, [categories]);

  const subcategoryOptions = useMemo<MultiSelectOption[]>(() => {
    let list = subcategories;
    if (categoryDraft.length > 0) {
      const selectedCatIds = new Set(categoryDraft);
      list = subcategories.filter((sc) => sc.categoryId && selectedCatIds.has(sc.categoryId));
    }
    return list.map((sc) => ({ value: sc.id, label: sc.name }));
  }, [subcategories, categoryDraft]);

  const handleApply = useCallback(() => {
    setAppliedSearch(searchDraft);
    setAppliedStatus(statusDraft);
    setAppliedCategory(categoryDraft);
    setAppliedSubcategory(subcategoryDraft);
  }, [searchDraft, statusDraft, categoryDraft, subcategoryDraft]);

  const handleClearAll = useCallback(() => {
    setSearchDraft("");
    setStatusDraft([]);
    setCategoryDraft([]);
    setSubcategoryDraft([]);

    setAppliedSearch("");
    setAppliedStatus([]);
    setAppliedCategory([]);
    setAppliedSubcategory([]);
  }, []);

  const hasAnyApplied = Boolean(
    appliedSearch.trim() ||
    appliedStatus.length > 0 ||
    appliedCategory.length > 0 ||
    appliedSubcategory.length > 0
  );

  const handleToggleActive = async (id: string, nextValue: boolean) => {
    try {
      await updateProduct({ id, patch: { isActive: nextValue } }).unwrap();
      toast.success(`Product ${nextValue ? "activated in catalog" : "hidden from catalog"}`);
    } catch (err) {
      toast.fromError(err, "Failed to update product status");
    }
  };

  const filteredProducts = useMemo(() => {
    const q = appliedSearch.trim().toLowerCase();
    const hasStatus = appliedStatus.length > 0;
    const hasCat = appliedCategory.length > 0;
    const hasSub = appliedSubcategory.length > 0;

    const catIdSet = new Set(appliedCategory);
    const catNameSet = new Set(
      appliedCategory.map((id) => categoryMap.get(id)?.name.toLowerCase()).filter(Boolean) as string[]
    );

    const subIdSet = new Set(appliedSubcategory);
    const subNameSet = new Set(
      appliedSubcategory.map((id) => subcategoryMap.get(id)?.name.toLowerCase()).filter(Boolean) as string[]
    );

    return products.filter((p) => {
      // 1. Search by ID, product name, vendor name, company name
      if (q) {
        const v = p.vendor || (p.vendorId ? vendorMap.get(p.vendorId) : null);
        const code = (p.productCode || "").toLowerCase();
        const prodName = (p.name || "").toLowerCase();
        const business = (v?.businessName || "").toLowerCase();
        const owner = (v?.ownerName || "").toLowerCase();
        const shop = ((v as any)?.shopName || "").toLowerCase();

        const matches =
          code.includes(q) ||
          prodName.includes(q) ||
          business.includes(q) ||
          owner.includes(q) ||
          shop.includes(q);

        if (!matches) return false;
      }

      // 2. Status filter
      if (hasStatus) {
        const isActive = p.isActive === true || String(p.isActive) === "1" || String(p.isActive) === "true";
        const statusKey = isActive ? "active" : "inactive";
        if (!appliedStatus.includes(statusKey)) return false;
      }

      // 3. Category multiple select
      if (hasCat) {
        const catId = p.categoryId || p.categoryEntity?.id;
        const catName = (p.categoryName || "").toLowerCase();
        const matchesCat = (catId && catIdSet.has(catId)) || (catName && catNameSet.has(catName));
        if (!matchesCat) return false;
      }

      // 4. Subcategory multiple select
      if (hasSub) {
        const subId = p.subcategoryId || p.subcategoryEntity?.id;
        const subName = (p.subcategoryName || "").toLowerCase();
        const matchesSub = (subId && subIdSet.has(subId)) || (subName && subNameSet.has(subName));
        if (!matchesSub) return false;
      }

      return true;
    });
  }, [
    products,
    appliedSearch,
    appliedStatus,
    appliedCategory,
    appliedSubcategory,
    vendorMap,
    categoryMap,
    subcategoryMap,
  ]);

  const columns = useMemo(() => [
    { 
      key: "productCode", 
      header: "ID", 
      className: "whitespace-nowrap min-w-[7.5rem]",
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
              {row.subcategoryName ? ` • ${row.subcategoryName}` : ""}
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
    <div className="space-y-4">
      <Card>
        {/* Filters in Order Filter Design */}
        <div className="mb-4 space-y-2">
          <ResponsiveManagementFilters modalTitle="Vendor Product Filters" triggerLabel="Filters">
            <ManagementFilterPanel>
              {/* Search */}
              <ManagementFilterField
                label="Search"
                className="sm:col-span-2 lg:col-span-1 xl:col-span-2"
              >
                <input
                  type="search"
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  placeholder="Search ID, vendor, company, or product..."
                  className={MANAGEMENT_NATIVE_CONTROL_CLASS}
                  aria-label="Search by ID, vendor name, company, or product"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleApply();
                    }
                  }}
                />
              </ManagementFilterField>

              {/* Status (Multi-select) */}
              <ManagementFilterField label="Status">
                <SearchableMultiSelect
                  selectedValues={statusDraft}
                  onChange={setStatusDraft}
                  options={STATUS_MULTI_OPTIONS}
                  placeholder="All Statuses"
                  searchPlaceholder="Search statuses..."
                  itemNoun="status"
                />
              </ManagementFilterField>

              {/* Category (Searchable Multi-select) */}
              <ManagementFilterField label="Category">
                <SearchableMultiSelect
                  selectedValues={categoryDraft}
                  onChange={setCategoryDraft}
                  options={categoryOptions}
                  placeholder="All Categories"
                  searchPlaceholder="Search categories..."
                  itemNoun="category"
                />
              </ManagementFilterField>

              {/* Subcategory (Searchable Multi-select) */}
              <ManagementFilterField label="Subcategory">
                <SearchableMultiSelect
                  selectedValues={subcategoryDraft}
                  onChange={setSubcategoryDraft}
                  options={subcategoryOptions}
                  placeholder="All Subcategories"
                  searchPlaceholder="Search subcategories..."
                  itemNoun="subcategory"
                />
              </ManagementFilterField>

              {/* Common Apply & Clear Buttons */}
              <ManagementFilterActions>
                <Button
                  type="button"
                  size="sm"
                  className={`${MANAGEMENT_FILTER_BTN_CLASS} font-semibold`}
                  onClick={handleApply}
                >
                  Apply
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className={`${MANAGEMENT_FILTER_BTN_CLASS} font-medium`}
                  onClick={handleClearAll}
                >
                  Clear
                </Button>
              </ManagementFilterActions>
            </ManagementFilterPanel>
          </ResponsiveManagementFilters>

          {/* Active Applied Filters Summary Bar */}
          {hasAnyApplied && (
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-text-muted">
              <span className="font-semibold text-text-heading">Active filters:</span>
              {appliedSearch.trim() && (
                <span className="rounded-full bg-primary-muted px-2.5 py-0.5 font-medium text-primary">
                  Search: “{appliedSearch.trim()}”
                </span>
              )}
              {appliedStatus.length > 0 && (
                <span className="rounded-full bg-primary-muted px-2.5 py-0.5 font-medium text-primary">
                  Status:{" "}
                  {appliedStatus
                    .map((s) => STATUS_MULTI_OPTIONS.find((opt) => opt.value === s)?.label || s)
                    .join(", ")}
                </span>
              )}
              {appliedCategory.length > 0 && (
                <span className="rounded-full bg-primary-muted px-2.5 py-0.5 font-medium text-primary">
                  Categories:{" "}
                  {appliedCategory.length === 1
                    ? categoryOptions.find((c) => c.value === appliedCategory[0])?.label || "1 category"
                    : `${appliedCategory.length} categories`}
                </span>
              )}
              {appliedSubcategory.length > 0 && (
                <span className="rounded-full bg-primary-muted px-2.5 py-0.5 font-medium text-primary">
                  Subcategories:{" "}
                  {appliedSubcategory.length === 1
                    ? subcategoryOptions.find((sc) => sc.value === appliedSubcategory[0])?.label || "1 subcategory"
                    : `${appliedSubcategory.length} subcategories`}
                </span>
              )}
              <button
                type="button"
                onClick={handleClearAll}
                className="ml-auto text-xs font-semibold text-text-muted hover:text-error transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Table Content */}
        <Table 
          columns={columns} 
          data={filteredProducts} 
          keyExtractor={(p) => p.id} 
          emptyMessage={hasAnyApplied ? "No products match your filter criteria." : "No vendor products found."} 
          isLoading={isLoading}
          mobileCards={true}
        />
      </Card>
    </div>
  );
}
