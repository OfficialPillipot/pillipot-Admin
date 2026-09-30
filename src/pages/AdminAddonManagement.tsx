import { useState, useMemo, useRef, useCallback } from "react";
import {
  GiftIcon,
  TrashIcon,
  PencilIcon,
  XMarkIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import {
  Card,
  CardHeader,
  Button,
  Input,
  ToggleSwitch,
  Modal,
  Badge,
  Table,
  TablePagination,
  type Column,
  Tooltip,
  ManagementFilterPanel,
  ManagementFilterField,
  ManagementFilterActions,
  MANAGEMENT_NATIVE_CONTROL_CLASS,
  MANAGEMENT_FILTER_BTN_CLASS,
  ResponsiveManagementFilters,
} from "../components/ui";
import {
  useGetAdminAddonsQuery,
  useCreateAdminAddonMutation,
  useUpdateAdminAddonMutation,
  useDeleteAdminAddonMutation,
  useGetProductsQuery,
  useGetVendorsQuery,
} from "../store/api/edenApi";
import { toast } from "../lib/toast";
import type { Addon } from "../types";

export default function AdminAddonManagement() {
  const { data: addons = [], isLoading: isLoadingAddons } = useGetAdminAddonsQuery();
  const { data: products = [], isLoading: isLoadingProducts } = useGetProductsQuery();
  const { data: vendors = [], isLoading: isLoadingVendors } = useGetVendorsQuery();

  const [createAdminAddon, { isLoading: isCreating }] = useCreateAdminAddonMutation();
  const [updateAdminAddon, { isLoading: isUpdating }] = useUpdateAdminAddonMutation();
  const [deleteAdminAddon, { isLoading: isDeleting }] = useDeleteAdminAddonMutation();

  // ── Draft Filter States ──
  const [searchDraft, setSearchDraft] = useState("");
  const [vendorDraft, setVendorDraft] = useState("");
  const [scopeDraft, setScopeDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState<"all" | "active" | "inactive">("all");

  // ── Applied Filter States ──
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedVendor, setAppliedVendor] = useState("");
  const [appliedScope, setAppliedScope] = useState("");
  const [appliedStatus, setAppliedStatus] = useState<"all" | "active" | "inactive">("all");

  // ── Pagination State (default: 10 items) ──
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // ── Checkbox Selection State ──
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // ── Modals & Form State ──
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<Addon | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formVendorId, setFormVendorId] = useState("");
  const [formProductId, setFormProductId] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Delete Confirmation State ──
  const [deletingAddonId, setDeletingAddonId] = useState<string | null>(null);

  const vendorMap = useMemo(() => {
    const map = new Map<string, any>();
    vendors.forEach((v) => map.set(v.id, v));
    return map;
  }, [vendors]);

  const productMap = useMemo(() => {
    const map = new Map<string, any>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  // Products filtered by selected vendor in modal
  const modalAvailableProducts = useMemo(() => {
    if (!formVendorId) return products;
    return products.filter((p) => p.vendorId === formVendorId);
  }, [products, formVendorId]);

  const handleApplyFilters = useCallback(() => {
    setAppliedSearch(searchDraft.trim());
    setAppliedVendor(vendorDraft);
    setAppliedScope(scopeDraft);
    setAppliedStatus(statusDraft);
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [searchDraft, vendorDraft, scopeDraft, statusDraft]);

  const handleClearFilters = useCallback(() => {
    setSearchDraft("");
    setVendorDraft("");
    setScopeDraft("");
    setStatusDraft("all");
    setAppliedSearch("");
    setAppliedVendor("");
    setAppliedScope("");
    setAppliedStatus("all");
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, []);

  const hasAnyApplied = Boolean(
    appliedSearch.trim() ||
    appliedVendor ||
    appliedScope ||
    appliedStatus !== "all"
  );

  const filteredAddons = useMemo(() => {
    return addons.filter((addon) => {
      const matchSearch =
        !appliedSearch ||
        addon.name.toLowerCase().includes(appliedSearch.toLowerCase()) ||
        (addon.description || "").toLowerCase().includes(appliedSearch.toLowerCase());

      const matchVendor =
        !appliedVendor ||
        (appliedVendor === "platform" ? !addon.vendorId : addon.vendorId === appliedVendor);

      const matchProduct =
        !appliedScope ||
        (appliedScope === "all" ? !addon.productId : addon.productId === appliedScope);

      const matchStatus =
        appliedStatus === "all" ||
        (appliedStatus === "active" && addon.isActive) ||
        (appliedStatus === "inactive" && !addon.isActive);

      return matchSearch && matchVendor && matchProduct && matchStatus;
    });
  }, [addons, appliedSearch, appliedVendor, appliedScope, appliedStatus]);

  const paginatedAddons = useMemo(
    () => filteredAddons.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredAddons, currentPage, pageSize]
  );

  const allOnPageSelected = paginatedAddons.length > 0 && paginatedAddons.every((a) => selectedIds.has(a.id));
  const isIndeterminate = selectedIds.size > 0 && !allOnPageSelected;

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        paginatedAddons.forEach((a) => next.delete(a.id));
      } else {
        paginatedAddons.forEach((a) => next.add(a.id));
      }
      return next;
    });
  }, [allOnPageSelected, paginatedAddons]);

  const toggleSelectRow = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const openCreateModal = () => {
    setEditingAddon(null);
    setFormName("");
    setFormDescription("");
    setFormPrice("");
    setFormVendorId("");
    setFormProductId("");
    setFormIsActive(true);
    setSelectedFile(null);
    setPreviewUrl("");
    setIsModalOpen(true);
  };

  const openEditModal = useCallback((addon: Addon) => {
    setEditingAddon(addon);
    setFormName(addon.name);
    setFormDescription(addon.description || "");
    setFormPrice(String(addon.price));
    setFormVendorId(addon.vendorId || "");
    setFormProductId(addon.productId || "");
    setFormIsActive(addon.isActive);
    setSelectedFile(null);
    setPreviewUrl(addon.imageUrl || "");
    setIsModalOpen(true);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be under 5MB");
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Please enter an add-on name");
      return;
    }
    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error("Please enter a valid price (>= 0)");
      return;
    }

    try {
      if (editingAddon) {
        await updateAdminAddon({
          id: editingAddon.id,
          patch: {
            name: formName.trim(),
            description: formDescription.trim() || undefined,
            price: priceNum,
            vendorId: formVendorId ? formVendorId : undefined,
            productId: formProductId ? formProductId : undefined,
            isActive: formIsActive,
            image: selectedFile || undefined,
          },
        }).unwrap();
        toast.success("Add-on updated successfully!");
      } else {
        await createAdminAddon({
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          price: priceNum,
          vendorId: formVendorId ? formVendorId : undefined,
          productId: formProductId ? formProductId : undefined,
          isActive: formIsActive,
          image: selectedFile || undefined,
        }).unwrap();
        toast.success("Add-on created successfully!");
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || "Failed to save add-on");
    }
  };

  const handleToggleStatus = useCallback(async (addon: Addon) => {
    try {
      await updateAdminAddon({
        id: addon.id,
        patch: { isActive: !addon.isActive },
      }).unwrap();
      toast.success(`Add-on ${!addon.isActive ? "activated" : "deactivated"}`);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update status");
    }
  }, [updateAdminAddon]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteAdminAddon(id).unwrap();
      toast.success("Add-on deleted successfully");
      setDeletingAddonId(null);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to delete add-on");
    }
  }, [deleteAdminAddon]);

  const handleBulkToggleStatus = useCallback(async (isActive: boolean) => {
    if (selectedIds.size === 0) return;
    setBulkActionLoading(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          updateAdminAddon({ id, patch: { isActive } }).unwrap()
        )
      );
      toast.success(`${selectedIds.size} add-on(s) ${isActive ? "activated" : "deactivated"}`);
      setSelectedIds(new Set());
    } catch (err) {
      toast.fromError(err, "Failed to update selected add-ons");
    } finally {
      setBulkActionLoading(false);
    }
  }, [selectedIds, updateAdminAddon]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} selected add-on(s)?`)) return;
    setBulkActionLoading(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => deleteAdminAddon(id).unwrap())
      );
      toast.success(`${selectedIds.size} add-on(s) deleted`);
      setSelectedIds(new Set());
    } catch (err) {
      toast.fromError(err, "Failed to delete selected add-ons");
    } finally {
      setBulkActionLoading(false);
    }
  }, [selectedIds, deleteAdminAddon]);

  const columns: Column<Addon>[] = useMemo(
    () => [
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
            aria-label="Select all add-ons on page"
          />
        ),
        className: "w-10 px-3 text-center",
        mobileHeaderStart: true,
        render: (row: Addon) => (
          <input
            type="checkbox"
            checked={selectedIds.has(row.id)}
            onChange={() => toggleSelectRow(row.id)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer accent-primary"
            aria-label={`Select addon ${row.name}`}
          />
        ),
      },
      {
        key: "addonCode",
        header: "ID",
        className: "whitespace-nowrap min-w-[7.5rem]",
        render: (row: Addon) => (
          <span className="whitespace-nowrap font-medium text-text-heading">
            #ADD-{(row.id || "").slice(0, 6).toUpperCase()}
          </span>
        ),
      },
      {
        key: "image",
        header: "Image",
        className: "w-16",
        render: (row: Addon) =>
          row.imageUrl ? (
            <img
              src={row.imageUrl}
              alt={row.name}
              className="h-10 w-10 rounded object-cover border border-border"
            />
          ) : (
            <div className="h-10 w-10 rounded bg-surface-muted flex items-center justify-center border border-border text-text-muted">
              <GiftIcon className="h-5 w-5 opacity-40" />
            </div>
          ),
      },
      {
        key: "name",
        header: "Name",
        render: (row: Addon) => (
          <div className="flex flex-col min-w-0 max-w-xs">
            <span className="font-medium text-text-heading truncate">{row.name}</span>
            {row.description ? (
              <span className="text-xs text-text-muted line-clamp-1">{row.description}</span>
            ) : (
              <span className="text-[10px] text-text-muted/50 italic">No description</span>
            )}
          </div>
        ),
      },
      {
        key: "vendor",
        header: "Vendor",
        className: "whitespace-nowrap",
        render: (row: Addon) => {
          const v = row.vendor || (row.vendorId ? vendorMap.get(row.vendorId) : null);
          const name = v?.businessName?.trim() || v?.ownerName?.trim();
          return name ? (
            <span className="whitespace-nowrap font-medium text-text-heading">{name}</span>
          ) : (
            <Badge variant="info">Platform-Wide</Badge>
          );
        },
      },
      {
        key: "scope",
        header: "Applies To",
        className: "whitespace-nowrap",
        render: (row: Addon) => {
          const product = row.product || (row.productId ? productMap.get(row.productId) : null);
          return product ? (
            <span className="text-xs font-medium text-text max-w-[180px] truncate block" title={product.name}>
              {product.name}
            </span>
          ) : (
            <Badge variant="primary">All Products</Badge>
          );
        },
      },
      {
        key: "price",
        header: "Price",
        className: "whitespace-nowrap",
        render: (row: Addon) => (
          <span className="font-medium text-text-heading">
            ₹{Number(row.price).toFixed(2)}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        className: "whitespace-nowrap",
        render: (row: Addon) => (
          <div className="flex items-center gap-2">
            <Badge variant={row.isActive ? "success" : "muted"}>
              {row.isActive ? "Active" : "Inactive"}
            </Badge>
            <ToggleSwitch
              checked={row.isActive}
              onChange={() => handleToggleStatus(row)}
              aria-label={row.isActive ? "Active add-on" : "Inactive add-on"}
            />
          </div>
        ),
      },
      {
        key: "actions",
        header: "",
        className: "w-20 text-right",
        mobileHeaderEnd: true,
        render: (row: Addon) => (
          <div className="flex items-center justify-end gap-1">
            <Tooltip content="Edit" side="top">
              <button
                type="button"
                onClick={() => openEditModal(row)}
                className="rounded-[var(--radius-md)] p-2 text-text-muted hover:bg-primary-muted hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                aria-label="Edit add-on"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
            </Tooltip>
            <Tooltip content="Delete" side="top">
              <button
                type="button"
                onClick={() => setDeletingAddonId(row.id)}
                className="rounded-[var(--radius-md)] p-2 text-text-muted hover:bg-error-bg hover:text-error focus:outline-none focus:ring-2 focus:ring-error cursor-pointer"
                aria-label="Delete add-on"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </Tooltip>
          </div>
        ),
      },
    ],
    [
      vendorMap,
      productMap,
      handleToggleStatus,
      openEditModal,
      allOnPageSelected,
      isIndeterminate,
      selectedIds,
      toggleSelectAll,
      toggleSelectRow,
    ]
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          action={
            <Button onClick={openCreateModal}>Add Add-on</Button>
          }
        />

        <div className="pb-4 space-y-2">
          <ResponsiveManagementFilters modalTitle="Add-on Filters" triggerLabel="Filters">
            <ManagementFilterPanel>
              <ManagementFilterField label="Search" className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
                <input
                  type="search"
                  placeholder="Add-on name, description..."
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  className={MANAGEMENT_NATIVE_CONTROL_CLASS}
                  aria-label="Search by add-on name, description"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleApplyFilters();
                    }
                  }}
                />
              </ManagementFilterField>

              <ManagementFilterField label="Vendor">
                <select
                  value={vendorDraft}
                  onChange={(e) => setVendorDraft(e.target.value)}
                  className={MANAGEMENT_NATIVE_CONTROL_CLASS}
                  aria-label="Filter by vendor"
                >
                  <option value="">All Vendors</option>
                  <option value="platform">Platform-Wide (No Vendor)</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.businessName || v.ownerName}
                    </option>
                  ))}
                </select>
              </ManagementFilterField>

              <ManagementFilterField label="Scope">
                <select
                  value={scopeDraft}
                  onChange={(e) => setScopeDraft(e.target.value)}
                  className={MANAGEMENT_NATIVE_CONTROL_CLASS}
                  aria-label="Filter by product scope"
                >
                  <option value="">All Scopes</option>
                  <option value="all">Wide (No Specific Product)</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name.length > 25 ? p.name.slice(0, 25) + "..." : p.name}
                    </option>
                  ))}
                </select>
              </ManagementFilterField>

              <ManagementFilterField label="Status">
                <select
                  value={statusDraft}
                  onChange={(e) => setStatusDraft(e.target.value as any)}
                  className={MANAGEMENT_NATIVE_CONTROL_CLASS}
                  aria-label="Filter by status"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </ManagementFilterField>

              <ManagementFilterActions>
                <Button
                  type="button"
                  size="sm"
                  className={`${MANAGEMENT_FILTER_BTN_CLASS} font-semibold`}
                  onClick={handleApplyFilters}
                >
                  Apply
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className={`${MANAGEMENT_FILTER_BTN_CLASS} font-medium`}
                  onClick={handleClearFilters}
                >
                  Clear
                </Button>
              </ManagementFilterActions>
            </ManagementFilterPanel>
          </ResponsiveManagementFilters>

          {/* Active Filter Chips */}
          {hasAnyApplied && (
            <div className="flex flex-wrap items-center gap-2 pt-1 px-1">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Active Filters:
              </span>
              {appliedSearch && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary border border-primary/20">
                  Search: “{appliedSearch}”
                  <button
                    type="button"
                    onClick={() => {
                      setSearchDraft("");
                      setAppliedSearch("");
                    }}
                    className="hover:text-red-500 cursor-pointer"
                    title="Remove search filter"
                  >
                    <XMarkIcon className="h-3.5 w-3.5" />
                  </button>
                </span>
              )}
              {appliedVendor && (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-600 border border-indigo-500/20">
                  Vendor: {appliedVendor === "platform" ? "Platform-Wide" : (vendorMap.get(appliedVendor)?.businessName || vendorMap.get(appliedVendor)?.ownerName || appliedVendor)}
                  <button
                    type="button"
                    onClick={() => {
                      setVendorDraft("");
                      setAppliedVendor("");
                    }}
                    className="hover:text-red-500 cursor-pointer"
                    title="Remove vendor filter"
                  >
                    <XMarkIcon className="h-3.5 w-3.5" />
                  </button>
                </span>
              )}
              {appliedScope && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-600 border border-blue-500/20">
                  Scope: {appliedScope === "all" ? "Wide (No Product)" : (productMap.get(appliedScope)?.name || appliedScope)}
                  <button
                    type="button"
                    onClick={() => {
                      setScopeDraft("");
                      setAppliedScope("");
                    }}
                    className="hover:text-red-500 cursor-pointer"
                    title="Remove scope filter"
                  >
                    <XMarkIcon className="h-3.5 w-3.5" />
                  </button>
                </span>
              )}
              {appliedStatus !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 border border-emerald-500/20">
                  Status: {appliedStatus === "active" ? "Active" : "Inactive"}
                  <button
                    type="button"
                    onClick={() => {
                      setStatusDraft("all");
                      setAppliedStatus("all");
                    }}
                    className="hover:text-red-500 cursor-pointer"
                    title="Remove status filter"
                  >
                    <XMarkIcon className="h-3.5 w-3.5" />
                  </button>
                </span>
              )}
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs text-text-muted hover:text-red-500 underline ml-2 cursor-pointer"
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
                {selectedIds.size === 1 ? "1 add-on selected" : `${selectedIds.size} add-ons selected`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={bulkActionLoading}
                onClick={() => handleBulkToggleStatus(true)}
              >
                Activate Selected
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={bulkActionLoading}
                onClick={() => handleBulkToggleStatus(false)}
              >
                Deactivate Selected
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={bulkActionLoading}
                onClick={handleBulkDelete}
              >
                Delete Selected
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

        <Table
          isLoading={isLoadingAddons || isLoadingProducts || isLoadingVendors}
          columns={columns}
          data={paginatedAddons}
          keyExtractor={(addon) => addon.id}
          emptyMessage={
            hasAnyApplied
              ? "No add-ons match your selected filters."
              : "No add-ons created yet."
          }
        />

        <TablePagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={filteredAddons.length}
          totalPages={Math.max(1, Math.ceil(filteredAddons.length / pageSize))}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          pageSizeOptions={[10, 20, 50, 80, 100]}
          itemLabel="add-ons"
          disabled={isLoadingAddons}
        />
      </Card>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingAddon ? "Edit Add-on" : "Create New Add-on"}
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-text-heading mb-1">
                Add-on Name <span className="text-rose-500">*</span>
              </label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Gift Wrap, Custom Ribbon, Greeting Card"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-heading mb-1">
                  Price (₹) <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-heading mb-1">
                  Assign to Vendor
                </label>
                <select
                  value={formVendorId}
                  onChange={(e) => {
                    setFormVendorId(e.target.value);
                    setFormProductId("");
                  }}
                  className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-xl text-text-heading focus:outline-none focus:border-primary font-medium"
                >
                  <option value="">Platform-Wide (No specific vendor)</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.businessName || v.ownerName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-heading mb-1">
                Product Scope (Optional)
              </label>
              <select
                value={formProductId}
                onChange={(e) => setFormProductId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-xl text-text-heading focus:outline-none focus:border-primary font-medium"
              >
                <option value="">
                  {formVendorId ? "All Products of this Vendor" : "All Marketplace Products"}
                </option>
                {modalAvailableProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.productCode ? `(${p.productCode})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-xs font-bold text-text-heading mb-1">
                Add-on Image (Optional)
              </label>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl bg-surface-muted border border-border overflow-hidden flex items-center justify-center shrink-0">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <PhotoIcon className="h-8 w-8 text-text-muted/40" />
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Choose Image
                    </Button>
                    {previewUrl && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setSelectedFile(null);
                          setPreviewUrl("");
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-[11px] text-text-muted mt-1">PNG, JPG or WEBP (Max 5MB)</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-heading mb-1">
                Description (Optional)
              </label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Brief description of what is included in this add-on..."
                rows={3}
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-xl text-text-heading focus:outline-none focus:border-primary font-medium placeholder:text-text-muted/60"
              />
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-border">
              <div className="flex items-center gap-2">
                <ToggleSwitch
                  checked={formIsActive}
                  onChange={setFormIsActive}
                  aria-label="Active & Available to Customers"
                />
                <span className="text-xs font-bold text-text-heading">
                  Active & Available to Customers
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isCreating || isUpdating}
                >
                  {isCreating || isUpdating ? "Saving..." : editingAddon ? "Update Add-on" : "Create Add-on"}
                </Button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingAddonId && (
        <Modal
          isOpen={!!deletingAddonId}
          onClose={() => setDeletingAddonId(null)}
          title="Delete Add-on"
        >
          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              Are you sure you want to delete this add-on? Customers will no longer be able to select it for orders.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="secondary"
                onClick={() => setDeletingAddonId(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => handleDelete(deletingAddonId)}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete Add-on"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
