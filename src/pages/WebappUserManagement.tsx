import { memo, useCallback, useEffect, useState, useMemo } from "react";
import {
  Card,
  CardHeader,
  Table,
  Button,
  Input,
  Modal,
  SearchableMultiSelect,
  type MultiSelectOption,
  SingleCalendarDateRangePicker,
  toDisplayDate,
  ManagementFilterPanel,
  ManagementFilterField,
  ResponsiveManagementFilters,
} from "../components/ui";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";
import { toast } from "../lib/toast";
import {
  ArrowPathIcon,
  MagnifyingGlassIcon,
  ShoppingBagIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  useGetProductsQuery,
  useGetAdminVendorProductsQuery,
  useGetCategoriesQuery,
  useGetSubcategoriesQuery,
} from "../store/api/edenApi";

export interface CustomerProductItem {
  productId: string;
  name: string;
  quantity: number;
  amount: number;
  imageUrl?: string;
}

export interface CustomerUserRow {
  id: string;
  username: string; // email
  name: string;
  isActive: boolean;
  createdAt?: string;
  totalProducts?: number;
  ordersCount?: number;
  totalSpent?: number;
  productIds?: string[];
  categoryIds?: string[];
  subcategoryIds?: string[];
  productsList?: CustomerProductItem[];
}

function WebappUserManagementPage() {
  const [rows, setRows] = useState<CustomerUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerUserRow | null>(null);

  // Queries for multi-select dropdowns
  const { data: adminProducts = [] } = useGetProductsQuery();
  const { data: vendorProducts = [] } = useGetAdminVendorProductsQuery();
  const { data: categories = [] } = useGetCategoriesQuery();
  const { data: subcategories = [] } = useGetSubcategoriesQuery();

  // Draft filter states
  const [productDraft, setProductDraft] = useState<string[]>([]);
  const [categoryDraft, setCategoryDraft] = useState<string[]>([]);
  const [subcategoryDraft, setSubcategoryDraft] = useState<string[]>([]);
  const [dateFromDraft, setDateFromDraft] = useState("");
  const [dateToDraft, setDateToDraft] = useState("");

  // Applied filter states
  const [appliedProducts, setAppliedProducts] = useState<string[]>([]);
  const [appliedCategories, setAppliedCategories] = useState<string[]>([]);
  const [appliedSubcategories, setAppliedSubcategories] = useState<string[]>([]);
  const [appliedDateFrom, setAppliedDateFrom] = useState("");
  const [appliedDateTo, setAppliedDateTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<CustomerUserRow[]>(endpoints.rbacCustomerUsers);
      setRows(data);
    } catch (e) {
      toast.fromError(e, "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Options for Product multi-select
  const productOptions: MultiSelectOption[] = useMemo(() => {
    const map = new Map<string, MultiSelectOption>();
    for (const vp of vendorProducts) {
      if (vp.id) {
        const vName = vp.vendor?.businessName?.trim() || vp.vendor?.ownerName?.trim();
        map.set(vp.id, {
          value: vp.id,
          label: vp.name,
          subLabel: vName ? `By ${vName}` : undefined,
        });
      }
    }
    for (const p of adminProducts) {
      if (p.id && !map.has(p.id)) {
        map.set(p.id, {
          value: p.id,
          label: p.name,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [vendorProducts, adminProducts]);

  // Options for Category multi-select
  const categoryOptions: MultiSelectOption[] = useMemo(() => {
    return categories
      .filter((c) => Boolean(c.id && c.name))
      .map((c) => ({
        value: c.id,
        label: c.name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [categories]);

  // Options for Subcategory multi-select
  const subcategoryOptions: MultiSelectOption[] = useMemo(() => {
    const catMap = new Map(categories.map((c) => [c.id, c.name]));
    return subcategories
      .filter((sc) => Boolean(sc.id && sc.name))
      .map((sc) => {
        const parentName = sc.category?.name || catMap.get(sc.categoryId);
        return {
          value: sc.id,
          label: sc.name,
          subLabel: parentName ? `In ${parentName}` : undefined,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [subcategories, categories]);

  // Product metadata map to resolve category/subcategory from product IDs
  const productMetaMap = useMemo(() => {
    const map = new Map<string, { categoryId?: string; subcategoryId?: string }>();
    for (const p of adminProducts) {
      if (p.id) {
        map.set(p.id, { categoryId: p.categoryId, subcategoryId: p.subcategoryId });
      }
    }
    for (const vp of vendorProducts) {
      if (vp.id) {
        map.set(vp.id, { categoryId: vp.categoryId, subcategoryId: vp.subcategoryId });
      }
    }
    return map;
  }, [adminProducts, vendorProducts]);

  // Apply filters
  const handleApply = useCallback(() => {
    setAppliedProducts(productDraft);
    setAppliedCategories(categoryDraft);
    setAppliedSubcategories(subcategoryDraft);
    setAppliedDateFrom(dateFromDraft);
    setAppliedDateTo(dateToDraft);
  }, [productDraft, categoryDraft, subcategoryDraft, dateFromDraft, dateToDraft]);

  // Reset filters
  const handleReset = useCallback(() => {
    setSearchQuery("");
    setProductDraft([]);
    setCategoryDraft([]);
    setSubcategoryDraft([]);
    setDateFromDraft("");
    setDateToDraft("");
    setAppliedProducts([]);
    setAppliedCategories([]);
    setAppliedSubcategories([]);
    setAppliedDateFrom("");
    setAppliedDateTo("");
  }, []);

  const hasAnyApplied = useMemo(() => {
    return (
      Boolean(searchQuery.trim()) ||
      appliedProducts.length > 0 ||
      appliedCategories.length > 0 ||
      appliedSubcategories.length > 0 ||
      Boolean(appliedDateFrom || appliedDateTo)
    );
  }, [
    searchQuery,
    appliedProducts.length,
    appliedCategories.length,
    appliedSubcategories.length,
    appliedDateFrom,
    appliedDateTo,
  ]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return rows.filter((r) => {
      // 1. Search text filter (name or email/username)
      if (q) {
        const matchesName = r.name?.toLowerCase().includes(q);
        const matchesEmail = r.username?.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail) return false;
      }

      // Collect all product IDs this customer has purchased
      const rProdIds = r.productIds || [];
      const listProdIds = (r.productsList || []).map((p) => p.productId).filter(Boolean);
      const allCustProdIds = new Set([...rProdIds, ...listProdIds]);

      // 2. Product filter
      if (appliedProducts.length > 0) {
        const matchesProduct = appliedProducts.some((pid) => allCustProdIds.has(pid));
        if (!matchesProduct) return false;
      }

      // Collect all category IDs for this customer
      const custCategoryIds = new Set(r.categoryIds || []);
      for (const pid of allCustProdIds) {
        const meta = productMetaMap.get(pid);
        if (meta?.categoryId) custCategoryIds.add(meta.categoryId);
      }

      // 3. Category filter
      if (appliedCategories.length > 0) {
        const matchesCategory = appliedCategories.some((cid) => custCategoryIds.has(cid));
        if (!matchesCategory) return false;
      }

      // Collect all subcategory IDs for this customer
      const custSubcategoryIds = new Set(r.subcategoryIds || []);
      for (const pid of allCustProdIds) {
        const meta = productMetaMap.get(pid);
        if (meta?.subcategoryId) custSubcategoryIds.add(meta.subcategoryId);
      }

      // 4. Subcategory filter
      if (appliedSubcategories.length > 0) {
        const matchesSubcategory = appliedSubcategories.some((scid) => custSubcategoryIds.has(scid));
        if (!matchesSubcategory) return false;
      }

      // 5. Created Date filter
      if (appliedDateFrom || appliedDateTo) {
        if (!r.createdAt) return false;
        const createdDate = new Date(r.createdAt);
        if (isNaN(createdDate.getTime())) return false;
        const cy = createdDate.getFullYear();
        const cm = String(createdDate.getMonth() + 1).padStart(2, "0");
        const cd = String(createdDate.getDate()).padStart(2, "0");
        const cDateIso = `${cy}-${cm}-${cd}`;

        if (appliedDateFrom && cDateIso < appliedDateFrom) return false;
        if (appliedDateTo && cDateIso > appliedDateTo) return false;
      }

      return true;
    });
  }, [
    rows,
    searchQuery,
    appliedProducts,
    appliedCategories,
    appliedSubcategories,
    appliedDateFrom,
    appliedDateTo,
    productMetaMap,
  ]);

  const columns = [
    { key: "name", header: "Full Name" },
    { key: "username", header: "Email / Username" },
    {
      key: "totalProducts",
      header: "Products Ordered",
      render: (row: CustomerUserRow) => {
        const count = row.totalProducts ?? 0;
        const orders = row.ordersCount ?? 0;
        const hasProducts = count > 0;
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 font-semibold text-sm ${hasProducts ? "text-primary" : "text-text-muted"
                  }`}
              >
                <ShoppingBagIcon className="h-4 w-4 shrink-0" />
                {count} {count === 1 ? "product" : "products"}
              </span>
              {row.productsList && row.productsList.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(row)}
                  className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/20 transition-colors"
                  title="View ordered products"
                >
                  View items
                </button>
              )}
            </div>
            <span className="text-xs text-text-muted">
              {orders} {orders === 1 ? "order" : "orders"}
              {row.totalSpent != null && row.totalSpent > 0 && ` • ₹${row.totalSpent.toLocaleString("en-IN")}`}
            </span>
          </div>
        );
      },
    },
    {
      key: "createdAt",
      header: "Created At",
      render: (row: CustomerUserRow) =>
        row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "N/A",
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Platform Customers"

          action={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={loading}
              onClick={() => void load()}
            >
              <ArrowPathIcon className="h-4 w-4" aria-hidden />
              Refresh
            </Button>
          }
        />

        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="font-semibold text-text-heading">Customer Filters</span>
            <div>
              Showing <span className="font-semibold text-text-heading">{filteredRows.length}</span> of{" "}
              <span className="font-semibold text-text-heading">{rows.length}</span> customers
            </div>
          </div>

          {/* Searchable Multi-Select, Search & Date Filters */}
          <ResponsiveManagementFilters modalTitle="Filter Platform Customers">
            <ManagementFilterPanel>
              {/* Search by name or email */}
              <ManagementFilterField label="Search">
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleApply();
                    }
                  }}
                  className="bg-surface-elevated/85"
                  endNode={
                    searchQuery ? (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="rounded p-0.5 text-text-muted hover:text-text transition-colors"
                        title="Clear search"
                        aria-label="Clear search"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    ) : (
                      <MagnifyingGlassIcon className="h-4 w-4 text-text-muted" />
                    )
                  }
                />
              </ManagementFilterField>

              {/* Product (Searchable Multi-select) */}
              <ManagementFilterField label="Product">
                <SearchableMultiSelect
                  selectedValues={productDraft}
                  onChange={setProductDraft}
                  options={productOptions}
                  placeholder="All products"
                  searchPlaceholder="Search products by name or vendor..."
                  itemNoun="product"
                />
              </ManagementFilterField>

              {/* Category (Searchable Multi-select) */}
              <ManagementFilterField label="Category">
                <SearchableMultiSelect
                  selectedValues={categoryDraft}
                  onChange={setCategoryDraft}
                  options={categoryOptions}
                  placeholder="All categories"
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
                  placeholder="All subcategories"
                  searchPlaceholder="Search subcategories..."
                  itemNoun="subcategory"
                />
              </ManagementFilterField>

              {/* Created Date Range */}
              <ManagementFilterField label="Created Date" className="xl:col-span-2 2xl:col-span-1">
                <SingleCalendarDateRangePicker
                  dateFrom={dateFromDraft}
                  dateTo={dateToDraft}
                  onChange={(from, to) => {
                    setDateFromDraft(from);
                    setDateToDraft(to);
                  }}
                  placeholder="Select created date range"
                />
              </ManagementFilterField>

              {/* Filter Actions */}
              <ManagementFilterField label="Filter Actions" className="sm:col-span-2 lg:col-span-1 xl:col-span-2 2xl:col-span-1">
                <div className="flex w-full items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="min-h-11 flex-1 font-semibold"
                    onClick={handleApply}
                  >
                    Apply
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="min-h-11 flex-1 font-medium"
                    onClick={handleReset}
                  >
                    Reset
                  </Button>
                </div>
              </ManagementFilterField>
            </ManagementFilterPanel>
          </ResponsiveManagementFilters>

          {/* Active Filters Summary */}
          {hasAnyApplied && (
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-text-muted">
              <span className="font-semibold text-text-heading">Active filters:</span>
              {searchQuery.trim() && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-muted px-2.5 py-0.5 font-medium text-primary">
                  Search: &ldquo;{searchQuery.trim()}&rdquo;
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="ml-0.5 rounded hover:bg-primary/20 p-0.5"
                    aria-label="Clear search"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </span>
              )}
              {appliedProducts.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-muted px-2.5 py-0.5 font-medium text-primary">
                  Products:{" "}
                  {appliedProducts.length === 1
                    ? productOptions.find((p) => p.value === appliedProducts[0])?.label || "1 product"
                    : `${appliedProducts.length} products`}
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedProducts([]);
                      setProductDraft([]);
                    }}
                    className="ml-0.5 rounded hover:bg-primary/20 p-0.5"
                    aria-label="Remove product filter"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </span>
              )}
              {appliedCategories.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-muted px-2.5 py-0.5 font-medium text-primary">
                  Categories:{" "}
                  {appliedCategories.length === 1
                    ? categoryOptions.find((c) => c.value === appliedCategories[0])?.label || "1 category"
                    : `${appliedCategories.length} categories`}
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedCategories([]);
                      setCategoryDraft([]);
                    }}
                    className="ml-0.5 rounded hover:bg-primary/20 p-0.5"
                    aria-label="Remove category filter"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </span>
              )}
              {appliedSubcategories.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-muted px-2.5 py-0.5 font-medium text-primary">
                  Subcategories:{" "}
                  {appliedSubcategories.length === 1
                    ? subcategoryOptions.find((sc) => sc.value === appliedSubcategories[0])?.label ||
                    "1 subcategory"
                    : `${appliedSubcategories.length} subcategories`}
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedSubcategories([]);
                      setSubcategoryDraft([]);
                    }}
                    className="ml-0.5 rounded hover:bg-primary/20 p-0.5"
                    aria-label="Remove subcategory filter"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </span>
              )}
              {(appliedDateFrom || appliedDateTo) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-muted px-2.5 py-0.5 font-medium text-primary">
                  Created: {toDisplayDate(appliedDateFrom) || "Any"} →{" "}
                  {toDisplayDate(appliedDateTo) || "Now"}
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedDateFrom("");
                      setAppliedDateTo("");
                      setDateFromDraft("");
                      setDateToDraft("");
                    }}
                    className="ml-0.5 rounded hover:bg-primary/20 p-0.5"
                    aria-label="Remove date filter"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </span>
              )}
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-medium text-primary underline hover:text-primary-hover ml-1"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        <Table
          columns={columns}
          data={filteredRows}
          keyExtractor={(row) => row.id}
          emptyMessage={loading ? "Loading..." : "No customers found."}
        />
      </Card>

      {/* Customer Ordered Products Modal */}
      {selectedCustomer && (
        <Modal
          isOpen={Boolean(selectedCustomer)}
          onClose={() => setSelectedCustomer(null)}
          title={`Products Ordered by ${selectedCustomer.name}`}
          size="lg"
          footer={
            <div className="flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedCustomer(null)}
              >
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="rounded-lg bg-surface-elevated p-3 border border-border flex items-center justify-between text-xs sm:text-sm">
              <div>
                <p className="font-semibold text-text-heading">{selectedCustomer.name}</p>
                <p className="text-text-muted text-xs">{selectedCustomer.username}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-primary">{selectedCustomer.totalProducts} total items</p>
                <p className="text-text-muted text-xs">
                  {selectedCustomer.ordersCount} orders • ₹{selectedCustomer.totalSpent?.toLocaleString("en-IN") || 0}
                </p>
              </div>
            </div>

            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {selectedCustomer.productsList && selectedCustomer.productsList.length > 0 ? (
                selectedCustomer.productsList.map((prod, idx) => (
                  <div
                    key={prod.productId || idx}
                    className="flex items-center justify-between p-3 text-sm hover:bg-surface-elevated/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {prod.imageUrl ? (
                        <img
                          src={prod.imageUrl}
                          alt={prod.name}
                          className="h-10 w-10 rounded object-cover border border-border shrink-0"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-primary-muted flex items-center justify-center text-primary font-bold text-xs shrink-0">
                          {prod.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-text-heading truncate">{prod.name}</p>
                        <p className="text-xs text-text-muted">₹{prod.amount.toLocaleString("en-IN")}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 pl-3">
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                        Qty: {prod.quantity}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-text-muted">
                  No product items found.
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default memo(WebappUserManagementPage);
