import { memo } from "react";
import {
  Button,
  ManagementFilterField,
  ManagementFilterPanel,
  MANAGEMENT_NATIVE_CONTROL_CLASS,
  ResponsiveManagementFilters,
  SingleCalendarDateRangePicker,
  toDisplayDate,
  SearchableMultiSelect,
  type MultiSelectOption,
} from "../ui";
import { ORDER_STATUS_FILTER_OPTIONS } from "../../lib/ordersList";

export type SelectOption = { value: string; label: string };
export type { MultiSelectOption };

export const ORDER_STATUS_MULTI_OPTIONS: MultiSelectOption[] = ORDER_STATUS_FILTER_OPTIONS
  .filter((opt) => Boolean(opt.value))
  .map((opt) => ({ value: opt.value, label: opt.label }));

export type AdminOrderFiltersProps = {
  // Search
  search: string;
  onSearchChange: (v: string) => void;
  // Merged Date Range
  dateFrom: string;
  onDateFromChange: (v: string) => void;
  dateTo: string;
  onDateToChange: (v: string) => void;
  // Vendor (Searchable Multi-select)
  vendorFilter: string[];
  onVendorFilterChange: (v: string[]) => void;
  vendorOptions: MultiSelectOption[];
  // Status (Multi-select)
  statusFilter: string[];
  onStatusFilterChange: (v: string[]) => void;
  statusOptions?: MultiSelectOption[];
  // Product (Searchable Multi-select)
  productFilter: string[];
  onProductFilterChange: (v: string[]) => void;
  productOptions: MultiSelectOption[];
  // Order type
  typeFilter: string;
  onTypeFilterChange: (v: string) => void;
  typeOptions: SelectOption[];
  // Common action buttons
  filtersLoading?: boolean;
  applyLoading?: boolean;
  resetLoading?: boolean;
  clearLoading?: boolean;
  onApply: () => void;
  onReset?: () => void;
  onClearAll: () => void;
  // Applied filter summary info
  appliedSearch?: string;
  appliedDateFrom?: string;
  appliedDateTo?: string;
  appliedVendor?: string[];
  appliedStatus?: string[];
  appliedProduct?: string[];
  appliedType?: string;
};

function AdminOrderFiltersComponent(props: AdminOrderFiltersProps) {
  const {
    search,
    onSearchChange,
    dateFrom,
    onDateFromChange,
    dateTo,
    onDateToChange,
    vendorFilter,
    onVendorFilterChange,
    vendorOptions,
    statusFilter,
    onStatusFilterChange,
    statusOptions = ORDER_STATUS_MULTI_OPTIONS,
    productFilter,
    onProductFilterChange,
    productOptions,
    typeFilter,
    onTypeFilterChange,
    typeOptions,
    filtersLoading = false,
    applyLoading,
    resetLoading,
    clearLoading,
    onApply,
    onReset,
    onClearAll,
    appliedSearch = "",
    appliedDateFrom = "",
    appliedDateTo = "",
    appliedVendor = [],
    appliedStatus = [],
    appliedProduct = [],
    appliedType = "",
  } = props;

  const hasAnyApplied = Boolean(
    appliedSearch.trim() ||
      appliedDateFrom ||
      appliedDateTo ||
      (appliedVendor && appliedVendor.length > 0) ||
      (appliedStatus && appliedStatus.length > 0) ||
      (appliedProduct && appliedProduct.length > 0) ||
      appliedType,
  );

  return (
    <div className="mb-4 space-y-2">
      <ResponsiveManagementFilters modalTitle="Order filters" triggerLabel="Filters">
        <ManagementFilterPanel>
          {/* Search */}
          <ManagementFilterField
            label="Search"
            className="sm:col-span-2 lg:col-span-1 xl:col-span-2"
          >
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Order ID, name, phone, or pincode"
              className={MANAGEMENT_NATIVE_CONTROL_CLASS}
              aria-label="Search by order id, customer name, phone, or pincode"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onApply();
                }
              }}
            />
          </ManagementFilterField>

          {/* Merged Single Calendar Date Range Picker */}
          <ManagementFilterField
            label="Date range"
            className="sm:col-span-2 lg:col-span-1 xl:col-span-2"
          >
            <SingleCalendarDateRangePicker
              dateFrom={dateFrom}
              dateTo={dateTo}
              onChange={(f, t) => {
                onDateFromChange(f);
                onDateToChange(t);
              }}
              placeholder="Select date range"
            />
          </ManagementFilterField>

          {/* Vendors (Searchable Multi-select) */}
          <ManagementFilterField label="Vendor">
            <SearchableMultiSelect
              selectedValues={vendorFilter}
              onChange={onVendorFilterChange}
              options={vendorOptions}
              placeholder="Select vendors"
              searchPlaceholder="Type to search vendors..."
              itemNoun="vendor"
            />
          </ManagementFilterField>

          {/* Status (Searchable Multi-select) */}
          <ManagementFilterField label="Status">
            <SearchableMultiSelect
              selectedValues={statusFilter}
              onChange={onStatusFilterChange}
              options={statusOptions}
              placeholder="Select statuses"
              searchPlaceholder="Search order statuses..."
              itemNoun="status"
            />
          </ManagementFilterField>

          {/* Product (Multi-select) */}
          <ManagementFilterField label="Product">
            <SearchableMultiSelect
              selectedValues={productFilter}
              onChange={onProductFilterChange}
              options={productOptions}
              placeholder="Select products"
              searchPlaceholder="Type to search vendor products..."
            />
          </ManagementFilterField>

          {/* Order Type */}
          <ManagementFilterField label="Order type">
            <select
              value={typeFilter}
              onChange={(e) => onTypeFilterChange(e.target.value)}
              className={MANAGEMENT_NATIVE_CONTROL_CLASS}
              aria-label="Filter by order type"
            >
              {typeOptions.map((opt) => (
                <option key={opt.value || "all-types"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </ManagementFilterField>

          {/* Common Apply, Reset & Clear Buttons */}
          <ManagementFilterField label="Filter Actions" className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
            <div className="flex w-full items-center gap-2">
              <Button
                type="button"
                size="sm"
                className="min-h-11 flex-1 font-semibold"
                onClick={onApply}
                loading={Boolean(applyLoading ?? (filtersLoading && !resetLoading && !clearLoading))}
                disabled={Boolean(filtersLoading || applyLoading || resetLoading || clearLoading)}
              >
                Apply
              </Button>
              {onReset && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="min-h-11 flex-1 font-medium"
                  onClick={onReset}
                  loading={Boolean(resetLoading)}
                  disabled={Boolean(filtersLoading || applyLoading || resetLoading || clearLoading)}
                >
                  Reset
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="min-h-11 flex-1 font-medium"
                onClick={onClearAll}
                loading={Boolean(clearLoading)}
                disabled={Boolean(filtersLoading || applyLoading || resetLoading || clearLoading)}
              >
                Clear all
              </Button>
            </div>
          </ManagementFilterField>
        </ManagementFilterPanel>
      </ResponsiveManagementFilters>

      {/* Applied Filters Summary Bar */}
      {hasAnyApplied && (
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-text-muted">
          <span className="font-semibold text-text-heading">Active filters:</span>
          {appliedSearch.trim() && (
            <span className="rounded-full bg-primary-muted px-2.5 py-0.5 font-medium text-primary">
              Search: “{appliedSearch.trim()}”
            </span>
          )}
          {(appliedDateFrom || appliedDateTo) && (
            <span className="rounded-full bg-primary-muted px-2.5 py-0.5 font-medium text-primary">
              Date: {toDisplayDate(appliedDateFrom) || "Start"} → {toDisplayDate(appliedDateTo) || "Now"}
            </span>
          )}
          {appliedVendor && appliedVendor.length > 0 && (
            <span className="rounded-full bg-primary-muted px-2.5 py-0.5 font-medium text-primary">
              Vendors:{" "}
              {appliedVendor.length === 1
                ? vendorOptions.find((v) => v.value === appliedVendor[0])?.label || "1 vendor"
                : `${appliedVendor.length} vendors`}
            </span>
          )}
          {appliedStatus && appliedStatus.length > 0 && (
            <span className="rounded-full bg-primary-muted px-2.5 py-0.5 font-medium text-primary">
              Status:{" "}
              {appliedStatus.length === 1
                ? statusOptions.find((s) => s.value === appliedStatus[0])?.label || appliedStatus[0]
                : `${appliedStatus.length} statuses`}
            </span>
          )}
          {appliedProduct && appliedProduct.length > 0 && (
            <span className="rounded-full bg-primary-muted px-2.5 py-0.5 font-medium text-primary">
              Products:{" "}
              {appliedProduct.length === 1
                ? productOptions.find((p) => p.value === appliedProduct[0])?.label || "1 product"
                : `${appliedProduct.length} products`}
            </span>
          )}
          {appliedType && (
            <span className="rounded-full bg-primary-muted px-2.5 py-0.5 font-medium text-primary">
              Type:{" "}
              {typeOptions.find((t) => t.value === appliedType)?.label ||
                appliedType}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export const AdminOrderFilters = memo(AdminOrderFiltersComponent);
