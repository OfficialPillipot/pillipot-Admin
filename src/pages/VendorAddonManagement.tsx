import { useState, useMemo, useRef } from "react";
import {
  GiftIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import {
  Card,
  Button,
  Input,
  ToggleSwitch,
  Modal,
  Badge,
} from "../components/ui";
import {
  useGetVendorPortalProductsQuery,
  useGetVendorPortalAddonsQuery,
  useCreateVendorPortalAddonMutation,
  useUpdateVendorPortalAddonMutation,
  useDeleteVendorPortalAddonMutation,
} from "../store/api/edenApi";
import { toast } from "../lib/toast";
import type { Addon, Product } from "../types";

export default function VendorAddonManagement() {
  const { data: products = [], isLoading: isLoadingProducts } = useGetVendorPortalProductsQuery();
  const { data: addons = [], isLoading: isLoadingAddons, refetch } = useGetVendorPortalAddonsQuery();

  const [createAddon, { isLoading: isCreating }] = useCreateVendorPortalAddonMutation();
  const [updateAddon, { isLoading: isUpdating }] = useUpdateVendorPortalAddonMutation();
  const [deleteAddon, { isLoading: isDeleting }] = useDeleteVendorPortalAddonMutation();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterProduct, setFilterProduct] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<Addon | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formProductId, setFormProductId] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete Confirmation State
  const [deletingAddonId, setDeletingAddonId] = useState<string | null>(null);

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  const filteredAddons = useMemo(() => {
    return addons.filter((addon) => {
      const matchSearch =
        !searchQuery ||
        addon.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (addon.description || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchProduct =
        !filterProduct ||
        (filterProduct === "global" ? !addon.productId : addon.productId === filterProduct);

      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && addon.isActive) ||
        (filterStatus === "inactive" && !addon.isActive);

      return matchSearch && matchProduct && matchStatus;
    });
  }, [addons, searchQuery, filterProduct, filterStatus]);

  const stats = useMemo(() => {
    const total = addons.length;
    const active = addons.filter((a) => a.isActive).length;
    const allProducts = addons.filter((a) => !a.productId).length;
    const specificProducts = addons.filter((a) => !!a.productId).length;
    return { total, active, allProducts, specificProducts };
  }, [addons]);

  const openCreateModal = () => {
    setEditingAddon(null);
    setFormName("");
    setFormDescription("");
    setFormPrice("");
    setFormProductId("");
    setFormIsActive(true);
    setSelectedFile(null);
    setPreviewUrl("");
    setIsModalOpen(true);
  };

  const openEditModal = (addon: Addon) => {
    setEditingAddon(addon);
    setFormName(addon.name);
    setFormDescription(addon.description || "");
    setFormPrice(String(addon.price));
    setFormProductId(addon.productId || "");
    setFormIsActive(addon.isActive);
    setSelectedFile(null);
    setPreviewUrl(addon.imageUrl || "");
    setIsModalOpen(true);
  };

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
        await updateAddon({
          id: editingAddon.id,
          patch: {
            name: formName.trim(),
            description: formDescription.trim() || undefined,
            price: priceNum,
            productId: formProductId ? formProductId : undefined,
            isActive: formIsActive,
            image: selectedFile || undefined,
          },
        }).unwrap();
        toast.success("Add-on updated successfully!");
      } else {
        await createAddon({
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          price: priceNum,
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

  const handleToggleStatus = async (addon: Addon) => {
    try {
      await updateAddon({
        id: addon.id,
        patch: { isActive: !addon.isActive },
      }).unwrap();
      toast.success(`Add-on ${!addon.isActive ? "activated" : "deactivated"}`);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update status");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAddon(id).unwrap();
      toast.success("Add-on deleted successfully");
      setDeletingAddonId(null);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to delete add-on");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-text-heading tracking-tight flex items-center gap-2.5">
            <GiftIcon className="h-8 w-8 text-primary" />
            Add-ons Management
          </h1>
          <p className="text-sm text-text-muted mt-1 font-medium">
            Offer customer extras like gift wrap, greeting cards, or accessories with your products.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            className="!px-3 !py-2"
            title="Refresh"
          >
            <ArrowPathIcon className="h-4 w-4 text-text-muted" />
          </Button>
          <Button
            variant="primary"
            onClick={openCreateModal}
            className="!px-4 !py-2 shadow-md shadow-primary/20"
          >
            <PlusIcon className="h-5 w-5 mr-1.5" />
            Create Add-on
          </Button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="!p-4 bg-gradient-to-br from-surface to-surface-muted/50 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Total Add-ons</span>
            <GiftIcon className="h-5 w-5 text-primary" />
          </div>
          <p className="text-2xl font-black text-text-heading mt-2">{stats.total}</p>
        </Card>

        <Card className="!p-4 bg-gradient-to-br from-surface to-surface-muted/50 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Active Add-ons</span>
            <CheckCircleIcon className="h-5 w-5 text-success" />
          </div>
          <p className="text-2xl font-black text-success mt-2">{stats.active}</p>
        </Card>

        <Card className="!p-4 bg-gradient-to-br from-surface to-surface-muted/50 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">All Products</span>
            <Badge variant="info">Storewide</Badge>
          </div>
          <p className="text-2xl font-black text-text-heading mt-2">{stats.allProducts}</p>
        </Card>

        <Card className="!p-4 bg-gradient-to-br from-surface to-surface-muted/50 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Product-Specific</span>
            <Badge variant="default">Targeted</Badge>
          </div>
          <p className="text-2xl font-black text-text-heading mt-2">{stats.specificProducts}</p>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="!p-4 border border-border bg-surface">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search add-ons by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-surface-muted/40 border border-border rounded-xl focus:outline-none focus:border-primary focus:bg-surface font-medium text-text-heading placeholder:text-text-muted/60"
            />
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <select
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value)}
              className="px-3 py-2 text-xs font-bold bg-surface-muted/40 border border-border rounded-xl text-text-heading focus:outline-none focus:border-primary"
            >
              <option value="">All Scopes</option>
              <option value="global">All My Products (Storewide)</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name.length > 30 ? p.name.slice(0, 30) + "..." : p.name}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 text-xs font-bold bg-surface-muted/40 border border-border rounded-xl text-text-heading focus:outline-none focus:border-primary"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Add-ons List / Grid */}
      {isLoadingAddons || isLoadingProducts ? (
        <div className="py-20 flex flex-col items-center justify-center text-text-muted">
          <ArrowPathIcon className="h-8 w-8 animate-spin text-primary mb-3" />
          <p className="text-sm font-bold">Loading add-ons...</p>
        </div>
      ) : filteredAddons.length === 0 ? (
        <Card className="!p-12 text-center border-dashed border-2 border-border flex flex-col items-center justify-center">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
            <GiftIcon className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-black text-text-heading">No Add-ons Found</h3>
          <p className="text-sm text-text-muted max-w-md mt-1 mb-5">
            {searchQuery || filterProduct || filterStatus !== "all"
              ? "No add-ons match your current filters. Try resetting the search or filter options."
              : "You haven't created any add-ons yet. Start offering gift wrapping, custom cards, or special extras to boost sales!"}
          </p>
          <Button variant="primary" onClick={openCreateModal}>
            <PlusIcon className="h-4 w-4 mr-1.5" />
            Create Your First Add-on
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAddons.map((addon) => {
            const product = addon.productId ? productMap.get(addon.productId) : null;
            return (
              <div
                key={addon.id}
                className={`relative rounded-2xl border transition-all p-5 bg-surface flex flex-col justify-between shadow-xs hover:shadow-md ${
                  addon.isActive
                    ? "border-border hover:border-primary/40"
                    : "border-border/60 bg-surface-muted/20 opacity-80"
                }`}
              >
                <div>
                  {/* Top Bar: Image & Status Toggle */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="h-16 w-16 rounded-xl bg-surface-muted border border-border overflow-hidden flex items-center justify-center shrink-0">
                      {addon.imageUrl ? (
                        <img
                          src={addon.imageUrl}
                          alt={addon.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <GiftIcon className="h-8 w-8 text-text-muted/40" />
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <ToggleSwitch
                        checked={addon.isActive}
                        onChange={() => handleToggleStatus(addon)}
                        aria-label={addon.isActive ? "Active" : "Inactive"}
                      />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                        {addon.isActive ? "Visible in Store" : "Hidden"}
                      </span>
                    </div>
                  </div>

                  {/* Title and Price */}
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-black text-base text-text-heading line-clamp-1" title={addon.name}>
                      {addon.name}
                    </h3>
                    <span className="text-base font-black text-primary shrink-0">
                      ₹{Number(addon.price).toLocaleString("en-IN")}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-text-muted mt-1.5 line-clamp-2 min-h-[2rem]">
                    {addon.description || "No description provided."}
                  </p>
                </div>

                {/* Footer: Scope & Actions */}
                <div className="pt-4 mt-3 border-t border-border flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    {product ? (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md truncate max-w-[180px]"
                        title={product.name}
                      >
                        🎯 {product.name}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                        🌟 All My Products
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(addon)}
                      className="p-1.5 text-text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                      title="Edit Add-on"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingAddonId(addon.id)}
                      className="p-1.5 text-text-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                      title="Delete Add-on"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
                placeholder="e.g. Luxury Gift Wrapping / Personalized Card"
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
                  Product Scope
                </label>
                <select
                  value={formProductId}
                  onChange={(e) => setFormProductId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-xl text-text-heading focus:outline-none focus:border-primary font-medium"
                >
                  <option value="">Apply to All My Products</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.productCode ? `(${p.productCode})` : ""}
                    </option>
                  ))}
                </select>
              </div>
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
