import { memo } from "react";
import {
  Button,
  ManagementFilterField,
  ManagementFilterPanel,
  MANAGEMENT_NATIVE_CONTROL_CLASS,
  ResponsiveManagementFilters,
} from "../ui";
import { ORDER_STATUS_FILTER_OPTIONS } from "../../lib/ordersList";

export type SelectOption = { value: string; label: string };

export type AdminOrderFiltersProps = {
  serverSearch: string;
  onServerSearchChange: (v: string) => void;
  dateFrom: string;
  onDateFromChange: (v: string) => void;
  dateTo: string;
  onDateToChange: (v: string) => void;
  filtersLoading: boolean;
  onApplyServerFilters: () => void;
  onClearServerFilters: () => void;
  staffFilter: string;
  onStaffFilterChange: (v: string) => void;
  staffOptions: SelectOption[];
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  productFilter: string;
  onProductFilterChange: (v: string) => void;
  productOptions: SelectOption[];
  typeFilter: string;
  onTypeFilterChange: (v: string) => void;
  typeOptions: SelectOption[];
  onResetTableFilters: () => void;
  appliedDateFrom: string;
  appliedDateTo: string;
  appliedServerSearch: string;
};

function AdminOrderFiltersComponent(props: AdminOrderFiltersProps) {
  const {
    serverSearch,
    onServerSearchChange,
    dateFrom,
    onDateFromChange,
    dateTo,
    onDateToChange,
    filtersLoading,
    onApplyServerFilters,
    onClearServerFilters,
    staffFilter,
    onStaffFilterChange,
    staffOptions,
    statusFilter,
    onStatusFilterChange,
    productFilter,
    onProductFilterChange,
    productOptions,
    typeFilter,
    onTypeFilterChange,
    typeOptions,
    onResetTableFilters,
    appliedDateFrom,
    appliedDateTo,
    appliedServerSearch,
  } = props;

  return (
    <div className="mb-4 space-y-2">
      <ResponsiveManagementFilters modalTitle="Order filters" triggerLabel="Filters">
        <ManagementFilterPanel>
          <ManagementFilterField
            label="Search"
            className="lg:col-span-2 xl:col-span-2"
          >
            <input
              type="search"
              value={serverSearch}
              onChange={(e) => onServerSearchChange(e.target.value)}
              placeholder="Order ID, name, phone, or pincode"
              className={MANAGEMENT_NATIVE_CONTROL_CLASS}
              aria-label="Search by order id, customer name, phone, or pincode"
            />
          </ManagementFilterField>
          <ManagementFilterField label="From date">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              className={MANAGEMENT_NATIVE_CONTROL_CLASS}
              aria-label="From date"
            />
          </ManagementFilterField>
          <ManagementFilterField label="To date">
            <input
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              className={MANAGEMENT_NATIVE_CONTROL_CLASS}
              aria-label="To date"
            />
          </ManagementFilterField>
          <ManagementFilterField label="Server filters">
            <div className="flex w-full flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => void onApplyServerFilters()}
                loading={filtersLoading}
              >
                Apply
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void onClearServerFilters()}
                disabled={filtersLoading}
              >
                Clear all
              </Button>
            </div>
          </ManagementFilterField>
          <ManagementFilterField label="Staff">
            <select
              value={staffFilter}
              onChange={(e) => onStaffFilterChange(e.target.value)}
              className={MANAGEMENT_NATIVE_CONTROL_CLASS}
              aria-label="Filter by staff"
            >
              {staffOptions.map((opt) => (
                <option key={opt.value || "all-staff"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </ManagementFilterField>
          <ManagementFilterField label="Status">
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className={MANAGEMENT_NATIVE_CONTROL_CLASS}
              aria-label="Filter by order status"
            >
              {ORDER_STATUS_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value || "all-status"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </ManagementFilterField>
          <ManagementFilterField label="Product">
            <select
              value={productFilter}
              onChange={(e) => onProductFilterChange(e.target.value)}
              className={MANAGEMENT_NATIVE_CONTROL_CLASS}
              aria-label="Filter by product"
            >
              {productOptions.map((opt) => (
                <option key={opt.value || "all-products"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </ManagementFilterField>
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
          <ManagementFilterField label="Table filters">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full sm:w-auto"
              onClick={onResetTableFilters}
              aria-label="Reset staff, status, product, and type filters to show all"
            >
              Reset table filters
            </Button>
          </ManagementFilterField>
        </ManagementFilterPanel>
      </ResponsiveManagementFilters>
      {(appliedDateFrom ||
        appliedDateTo ||
        appliedServerSearch.trim()) && (
        <p className="text-xs text-text-muted">
          Showing orders
          {appliedDateFrom ? ` from ${appliedDateFrom}` : ""}
          {appliedDateTo ? ` through ${appliedDateTo}` : ""}
          {appliedServerSearch.trim()
            ? `${appliedDateFrom || appliedDateTo ? ";" : ""} matching “${appliedServerSearch.trim()}” (order id, name, phone, or pincode)`
            : ""}
          {appliedDateFrom || appliedDateTo ? " (UTC day boundaries)." : "."}
        </p>
      )}
    </div>
  );
}

export const AdminOrderFilters = memo(AdminOrderFiltersComponent);
