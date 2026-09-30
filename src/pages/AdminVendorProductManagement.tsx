import { useState, useMemo, useCallback } from "react";
import { 
  Squares2X2Icon 
} from "@heroicons/react/24/outline";
import {
  Card,
  Table,
  TablePagination,
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
  useGetAdminVendorProductsPaginatedQuery,
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
  // ── Pagination State (default: 10 items) ──
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // ── Checkbox Selection State ──
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

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

  const { data: paginatedData, isLoading: productsLoading } = useGetAdminVendorProductsPaginatedQuery({
    page: currentPage,
    limit: pageSize,
    search: appliedSearch.trim() || undefined,
    status: appliedStatus.length === 1 ? appliedStatus[0] : undefined,
    categoryId: appliedCategory.length === 1 ? appliedCategory[0] : undefined,
    subcategoryId: appliedSubcategory.length === 1 ? appliedSubcategory[0] : undefined,
  });

  const products = useMemo(() => paginatedData?.items ?? [], [paginatedData]);
  const totalItems = paginatedData?.total ?? 0;
  const totalPages = paginatedData?.totalPages ?? 1;

  const { data: vendors = [], isLoading: vendorsLoading } = useGetVendorsQuery();
  const { data: categories = [] } = useGetCategoriesQuery();
  const { data: subcategories = [] } = useGetSubcategoriesQuery();
  const [updateProduct] = useUpdateProductMutation();

  const isLoading = productsLoading || vendorsLoading;

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
    setCurrentPage(1);
    setSelectedIds(new Set());
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
    setCurrentPage(1);
    setSelectedIds(new Set());
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

  const allOnPageSelected = products.length > 0 && products.every((p) => selectedIds.has(p.id));
  const isIndeterminate = selectedIds.size > 0 && !allOnPageSelected;

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        products.forEach((p) => next.delete(p.id));
      } else {
        products.forEach((p) => next.add(p.id));
      }
      return next;
    });
  }, [allOnPageSelected, products]);

  const toggleSelectRow = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleBulkUpdateStatus = useCallback(async (isActive: boolean) => {
    if (selectedIds.size === 0) return;
    setBulkActionLoading(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(
        ids.map((id) => updateProduct({ id, patch: { isActive } }).unwrap())
      );
      toast.success(`${ids.length} product(s) ${isActive ? "activated" : "hidden from catalog"}`);
      setSelectedIds(new Set());
    } catch (err) {
      toast.fromError(err, "Failed to update selected products");
    } finally {
      setBulkActionLoading(false);
    }
  }, [selectedIds, updateProduct]);

  const columns = useMemo(() => [
    {
      key: "select",
      header: (
        <input
          type="checkbox"
          ref={(el) => {
            if (el) el.indeterminate = isIndeterminate;
          }}
          checked={allOnPageSelected}
          onChange={toggleSelectAll}
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer accent-primary"
          aria-label="Select all products on page"
        />
      ),
      className: "w-10 px-3 text-center",
      mobileHeaderStart: true,
      render: (row: Product) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.id)}
          onChange={() => toggleSelectRow(row.id)}
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer accent-primary"
          aria-label={`Select product ${row.name}`}
        />
      ),
    },
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

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-primary/5 border border-primary/20 rounded-[var(--radius-lg)] mb-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary text-white text-xs font-bold">
                {selectedIds.size}
              </span>
              <span className="text-sm font-medium text-text">
                {selectedIds.size === 1 ? "1 product selected" : `${selectedIds.size} products selected`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={bulkActionLoading}
                onClick={() => handleBulkUpdateStatus(true)}
              >
                Activate Selected
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={bulkActionLoading}
                onClick={() => handleBulkUpdateStatus(false)}
              >
                Deactivate Selected
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Table Content */}
        <Table 
          columns={columns} 
          data={filteredProducts} 
          keyExtractor={(p) => p.id} 
          emptyMessage={hasAnyApplied ? "No products match your filter criteria." : "No vendor products found."} 
          isLoading={isLoading}
          mobileCards={true}
        />

        <TablePagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={totalItems}
          totalPages={totalPages}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          pageSizeOptions={[10, 20, 50, 80, 100]}
          disabled={isLoading}
        />
      </Card>
    </div>
  );
}
