import { memo, useState, useCallback, useMemo, useEffect } from "react";
import { PencilIcon, XMarkIcon, TagIcon } from "@heroicons/react/24/outline";
import {
  Card,
  CardHeader,
  Button,
  Table,
  Modal,
  Input,
  Tooltip,
  Select,
  Badge,
  ManagementFilterPanel,
  ManagementFilterField,
  ResponsiveManagementFilters,
  RichTextEditor,
} from "../components/ui";
import type { SelectOption } from "../components/ui/Select";
import { toast } from "../lib/toast";
import type { Product } from "../types";
import {
  useGetVendorPortalProductsQuery,
  useCreateVendorPortalProductMutation,
  useUpdateVendorPortalProductMutation,
  useDeleteVendorPortalProductMutation,
  useGetVendorPortalCategoriesQuery,
  useGetVendorPortalOffersQuery
} from "../store/api/edenApi";
import { OfferEditModal } from "./VendorOfferManagement";


const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/quicktime"]);

function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) return "Image must be JPG, PNG, or WebP.";
  if (file.size > MAX_IMAGE_BYTES) return "Image must be at most 5MB.";
  return null;
}

function validateVideoFile(file: File): string | null {
  if (!ALLOWED_VIDEO_TYPES.has(file.type)) return "Video must be MP4 or MOV.";
  if (file.size > MAX_VIDEO_BYTES) return "Video must be at most 50MB.";
  return null;
}

function VendorProductManagement() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedCategory, setAppliedCategory] = useState("");

  const { data: products = [], isLoading: productsLoading } = useGetVendorPortalProductsQuery({
    search: appliedSearch || undefined,
    categoryId: appliedCategory || undefined
  });
  const { data: categories = [] } = useGetVendorPortalCategoriesQuery();
  const { data: allOffers = [] } = useGetVendorPortalOffersQuery();

  const [createProduct] = useCreateVendorPortalProductMutation();
  const [updateProduct] = useUpdateVendorPortalProductMutation();
  const [deleteProduct] = useDeleteVendorPortalProductMutation();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [offerEditingProductId, setOfferEditingProductId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [buyingPrice, setBuyingPrice] = useState("");
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [preparationDays, setPreparationDays] = useState("2");
  const [isCustomizable, setIsCustomizable] = useState(false);
  const [allowPhotoUpload, setAllowPhotoUpload] = useState(false);
  const [allowTextInput, setAllowTextInput] = useState(false);
  const [customTextPrompt, setCustomTextPrompt] = useState("");
  const [customTextLimit, setCustomTextLimit] = useState("50");
  const [description, setDescription] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleApplyFilters = useCallback(() => {
    setAppliedSearch(search.trim());
    setAppliedCategory(categoryFilter);
  }, [search, categoryFilter]);

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setCategoryFilter("");
    setAppliedSearch("");
    setAppliedCategory("");
  }, []);

  useEffect(() => {
    if (imageFiles.length === 0) {
      setImagePreviewUrls([]);
      return;
    }
    const urls = imageFiles.map((file) => URL.createObjectURL(file));
    setImagePreviewUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [imageFiles]);

  useEffect(() => {
    if (!videoFile) {
      setVideoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(videoFile);
    setVideoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [videoFile]);

  const categoryOptions: SelectOption[] = useMemo(() => [
    { value: "", label: "Select category…" },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ], [categories]);

  const subcategoryOptions: SelectOption[] = useMemo(() => {
    if (!categoryId) return [{ value: "", label: "Select subcategory…" }];
    const cat = categories.find(c => c.id === categoryId);
    return [
      { value: "", label: "Select subcategory…" },
      ...(cat?.subcategories || []).map((s: any) => ({ value: s.id, label: s.name }))
    ];
  }, [categories, categoryId]);

  const openAdd = useCallback(() => {
    setEditingId(null);
    setName("");
    setCategoryId("");
    setSubcategoryId("");
    setBuyingPrice("");
    setPrice("");
    setOriginalPrice("");
    setStockQuantity("");
    setSize("");
    setColor("");
    setPreparationDays("2");
    setIsCustomizable(false);
    setAllowPhotoUpload(false);
    setAllowTextInput(false);
    setCustomTextPrompt("");
    setCustomTextLimit("50");
    setDescription("");
    setImageFiles([]);
    setVideoFile(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((p: Product) => {
    setEditingId(p.id);
    setName(p.name);
    setCategoryId(p.categoryId ?? "");
    setSubcategoryId(p.subcategoryId ?? "");
    setBuyingPrice(p.buyingPrice != null ? String(p.buyingPrice) : "");
    setPrice(String(p.price ?? 0));
    setOriginalPrice(p.originalPrice?.toString() || "");
    setStockQuantity(String(p.stockQuantity ?? 0));
    setSize(p.size ?? "");
    setColor(p.color ?? "");
    setPreparationDays(String(p.preparationDays ?? 2));
    const customizable = !!(p.allowPhotoUpload || p.allowTextInput);
    setIsCustomizable(customizable);
    setAllowPhotoUpload(!!p.allowPhotoUpload);
    setAllowTextInput(!!p.allowTextInput);
    setCustomTextPrompt(p.customTextPrompt || "");
    setCustomTextLimit(p.customTextLimit ? String(p.customTextLimit) : "50");
    setDescription(p.description ?? "");
    setImageFiles([]);
    setVideoFile(null);
    setModalOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!name.trim()) return;
    if (!categoryId) {
      toast.error("Select a category");
      return;
    }
    const priceNum = parseFloat(price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      toast.error("Enter a valid selling price");
      return;
    }

    if (isCustomizable && !allowPhotoUpload && !allowTextInput) {
      toast.error("Please select at least one customization option (Image or Text) when customization is enabled.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        categoryId,
        subcategoryId: subcategoryId || undefined,
        price: priceNum,
        buyingPrice: buyingPrice ? parseFloat(buyingPrice) : 0,
        originalPrice: originalPrice ? parseFloat(originalPrice) : 0,
        stockQuantity: stockQuantity ? parseInt(stockQuantity, 10) : 0,
        size: size.trim() || undefined,
        color: color.trim() || undefined,
        preparationDays: preparationDays ? parseInt(preparationDays, 10) : 2,
        allowPhotoUpload: isCustomizable ? allowPhotoUpload : false,
        allowTextInput: isCustomizable ? allowTextInput : false,
        customTextPrompt: (isCustomizable && allowTextInput && customTextPrompt.trim()) ? customTextPrompt.trim() : "",
        customTextLimit: (isCustomizable && allowTextInput && customTextLimit) ? parseInt(customTextLimit, 10) : undefined,
        description: description.trim() || undefined,
        image: imageFiles.length > 0 ? imageFiles : undefined,
        video: videoFile ?? undefined,
      };

      if (editingId) {
        await updateProduct({ id: editingId, patch: payload }).unwrap();
        toast.success("Product updated");
      } else {
        await createProduct(payload).unwrap();
        toast.success("Product created");
      }
      setModalOpen(false);
    } catch (err) {
      toast.fromError(err, "Failed to save product");
    } finally {
      setSubmitting(false);
    }
  }, [
    editingId,
    name,
    categoryId,
    subcategoryId,
    price,
    buyingPrice,
    originalPrice,
    stockQuantity,
    size,
    color,
    preparationDays,
    isCustomizable,
    allowPhotoUpload,
    allowTextInput,
    customTextPrompt,
    customTextLimit,
    description,
    imageFiles,
    videoFile,
    createProduct,
    updateProduct
  ]);

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm("Delete this product permanently?")) return;
    try {
      await deleteProduct(id).unwrap();
      toast.success("Product deleted");
    } catch (err) {
      toast.fromError(err, "Failed to delete product");
    }
  }, [deleteProduct]);

  const columns = useMemo(() => [
    { key: "productCode", header: "ID", render: (row: Product) => row.productCode ?? "—" },
    { key: "name", header: "Name" },
    { key: "category", header: "Category", render: (row: Product) => row.categoryEntity?.name ?? "—" },
    { key: "price", header: "Selling", render: (row: Product) => `₹${Number(row.price).toFixed(2)}` },
    { key: "originalPrice", header: "Actual", render: (row: Product) => row.originalPrice != null ? `₹${Number(row.originalPrice).toFixed(2)}` : "—" },
    { key: "stock", header: "Stock", render: (row: Product) => row.stockQuantity ?? 0 },
    { key: "preparationDays", header: "Prep Days", render: (row: Product) => `${row.preparationDays ?? 2}d` },
    {
      key: "customization",
      header: "Customization",
      render: (row: Product) => {
        const hasPhoto = !!row.allowPhotoUpload;
        const hasText = !!row.allowTextInput;
        if (hasPhoto && hasText) {
          return <Badge variant="primary">Image + Text</Badge>;
        }
        if (hasPhoto) {
          return <Badge variant="primary">Image</Badge>;
        }
        if (hasText) {
          return <Badge variant="primary">Text</Badge>;
        }
        return <span className="text-xs text-text-muted">—</span>;
      },
    },
    { key: "image", header: "Image", render: (row: Product) => row.imageUrl ? <img src={row.imageUrl} className="h-10 w-10 rounded object-cover" /> : "—" },
    {
      key: "status", header: "Status", render: (row: Product) => (
        <div className="flex items-center gap-2">
          <Badge variant={row.isActive ? "success" : "muted"}>
            {row.isActive ? "Active" : "Inactive"}
          </Badge>
          <div
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${row.isActive ? 'bg-primary' : 'bg-slate-200'}`}
            onClick={async (e) => {
              e.stopPropagation();
              try {
                const fd = new FormData();
                fd.append('isActive', (!row.isActive).toString());
                await updateProduct({ id: row.id, patch: { isActive: !row.isActive } }).unwrap();
                toast.success(`Product ${!row.isActive ? 'activated' : 'deactivated'}`);
              } catch (err) {
                toast.fromError(err, "Failed to update status");
              }
            }}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${row.isActive ? 'translate-x-5' : 'translate-x-1'}`} />
          </div>
        </div>
      )
    },
    {
      key: "actions",
      header: "",
      render: (row: Product) => (
        <div className="flex gap-1">
          <Tooltip content="Offers">
            <button onClick={() => setOfferEditingProductId(row.id)} className="p-2 text-text-muted hover:text-success"><TagIcon className="h-4 w-4" /></button>
          </Tooltip>
          <Tooltip content="Edit">
            <button onClick={() => openEdit(row)} className="p-2 text-text-muted hover:text-primary"><PencilIcon className="h-4 w-4" /></button>
          </Tooltip>
          {/* <Tooltip content="Delete">
            <button onClick={() => handleDelete(row.id)} className="p-2 text-text-muted hover:text-error"><TrashIcon className="h-4 w-4" /></button>
          </Tooltip> */}
        </div>
      )
    }
  ], [openEdit, handleDelete, setOfferEditingProductId]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="My Products" action={<Button onClick={openAdd}>Add Product</Button>} />

        <div className="px-6 pb-4">
          <ResponsiveManagementFilters modalTitle="Product Filters">
            <ManagementFilterPanel>
              <ManagementFilterField label="Search" className="lg:col-span-2">
                <Input
                  placeholder="Product name, code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                />
              </ManagementFilterField>
              <ManagementFilterField label="Category">
                <Select
                  options={[{ value: "", label: "All Categories" }, ...categoryOptions.filter(o => o.value !== "")]}
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                />
              </ManagementFilterField>
              <ManagementFilterField label="Actions">
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleApplyFilters}>Apply</Button>
                  <Button size="sm" variant="secondary" onClick={handleClearFilters}>Clear</Button>
                </div>
              </ManagementFilterField>
            </ManagementFilterPanel>
          </ResponsiveManagementFilters>
        </div>

        <Table
          isLoading={productsLoading}
          columns={columns}
          data={products}
          keyExtractor={(p) => p.id}
          emptyMessage="You haven't added any products yet."
        />
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Product" : "Add Product"}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
          <Input label="Product name *" value={name} onChange={(e) => setName(e.target.value)} />
          <Select label="Category *" options={categoryOptions} value={categoryId} onChange={(e) => setCategoryId(e.target.value)} />
          {categoryId && <Select label="Subcategory *" options={subcategoryOptions} value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)} />}

          <div className="space-y-1">
            <label className="text-sm font-medium text-text">Description</label>
            <RichTextEditor
              key={editingId || "new-vendor-product"}
              value={description}
              onChange={setDescription}
              placeholder="Product details, bullet points, bold text..."
            />
          </div>

          <Input label="Buying price (₹)" type="number" value={buyingPrice} onChange={(e) => setBuyingPrice(e.target.value)} placeholder="Cost to you" />
          <Input label="Selling price (₹) *" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price for customers" />
          <Input label="Actual price (MRP) (₹)" type="number" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} placeholder="Original price before discount" />
          <Input label="Stock quantity" type="number" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} placeholder="Available stock" />
          <Input label="Size" value={size} onChange={(e) => setSize(e.target.value)} placeholder="e.g. Medium, 1kg" />
          <Input label="Color" value={color} onChange={(e) => setColor(e.target.value)} placeholder="e.g. Red, Blue" />

          <div className="space-y-1">
            <Input
              label="Preparation Days (Days to prepare/pack) *"
              type="number"
              min="0"
              value={preparationDays}
              onChange={(e) => setPreparationDays(e.target.value)}
              placeholder="e.g. 2"
            />
            <p className="text-[11px] text-text-muted">
              Number of days required to prepare this item. Customer delivery date picker will disable dates before this period.
            </p>
          </div>

          <div className="space-y-3 rounded border border-primary/30 bg-primary/5 p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-text">Product Customization</p>
                <p className="text-xs text-text-muted">
                  Allow customers to personalize this product before buying (e.g. photo print, engraved name).
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  checked={isCustomizable}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsCustomizable(checked);
                    if (checked && !allowPhotoUpload && !allowTextInput) {
                      setAllowPhotoUpload(true);
                    } else if (!checked) {
                      setAllowPhotoUpload(false);
                      setAllowTextInput(false);
                    }
                  }}
                />
                <span className="text-sm font-medium text-text">Enable Customization</span>
              </label>
            </div>

            {isCustomizable && (
              <div className="space-y-3 pt-2 border-t border-primary/20">
                <div>
                  <p className="text-xs font-semibold text-text mb-1">
                    Allowed Customization Options *
                  </p>
                  <p className="text-[11px] text-text-muted mb-2">
                    Select at least one customization option for customers.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label
                    className={`flex items-start gap-2.5 p-2.5 rounded border cursor-pointer transition-colors ${allowPhotoUpload
                        ? "border-primary bg-primary/10"
                        : "border-border bg-surface"
                      }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      checked={allowPhotoUpload}
                      onChange={(e) => setAllowPhotoUpload(e.target.checked)}
                    />
                    <div>
                      <span className="block text-sm font-medium text-text">Image</span>
                      <span className="block text-[11px] text-text-muted">
                        Allow customer to upload photos / images
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-2.5 rounded border cursor-pointer transition-colors ${allowTextInput
                        ? "border-primary bg-primary/10"
                        : "border-border bg-surface"
                      }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      checked={allowTextInput}
                      onChange={(e) => setAllowTextInput(e.target.checked)}
                    />
                    <div>
                      <span className="block text-sm font-medium text-text">Text</span>
                      <span className="block text-[11px] text-text-muted">
                        Allow customer to enter custom text / names
                      </span>
                    </div>
                  </label>
                </div>

                {!allowPhotoUpload && !allowTextInput && (
                  <div className="rounded bg-error/10 border border-error/30 p-2 text-xs font-medium text-error flex items-center gap-1.5">
                    <span>⚠️</span>
                    <span>Validation error: At least one option (Image or Text) must be selected before saving.</span>
                  </div>
                )}

                {allowTextInput && (
                  <div className="space-y-2 pt-2 border-t border-dashed border-border/80">
                    <Input
                      label="Custom Text Prompt / Instruction"
                      value={customTextPrompt}
                      onChange={(e) => setCustomTextPrompt(e.target.value)}
                      placeholder="e.g. Enter name or message to personalize"
                    />
                    <Input
                      label="Maximum Character Limit"
                      type="number"
                      min="1"
                      max="500"
                      value={customTextLimit}
                      onChange={(e) => setCustomTextLimit(e.target.value)}
                      placeholder="e.g. 50"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3 rounded border p-3 bg-surface-muted/30">
            <p className="text-sm font-medium">Media Upload</p>
            <div>
              <label className="mb-1 block text-xs text-text-muted">Images (Up to 3 — JPG, PNG, WebP — max 5MB each)</label>
              <div className="grid grid-cols-3 gap-2">
                {imagePreviewUrls.map((url, idx) => (
                  <div key={idx} className="relative aspect-square">
                    <img src={url} className="h-full w-full rounded object-cover border" />
                    <button onClick={() => setImageFiles(prev => prev.filter((_, i) => i !== idx))} className="absolute -right-2 -top-2 rounded-full bg-error p-1 text-white"><XMarkIcon className="h-3 w-3" /></button>
                  </div>
                ))}
                {imageFiles.length < 3 && (
                  <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed border-border hover:bg-surface-muted/50">
                    <span className="text-xl">+</span>
                    <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const err = validateImageFile(f);
                        if (err) { toast.error(err); return; }
                        setImageFiles(prev => [...prev, f]);
                      }
                      e.target.value = "";
                    }} />
                  </label>
                )}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-muted">Video (MP4, MOV — max 50MB)</label>
              <input
                type="file"
                accept="video/mp4,video/quicktime"
                className="block w-full text-sm text-text-muted file:mr-2 file:rounded file:border-0 file:bg-primary-muted file:px-2 file:py-1 file:text-sm file:text-primary"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const err = validateVideoFile(f);
                    if (err) { toast.error(err); e.target.value = ""; return; }
                  }
                  setVideoFile(f ?? null);
                  e.target.value = "";
                }}
              />
              {videoPreviewUrl && <video controls className="mt-2 max-h-48 w-full rounded border" src={videoPreviewUrl} />}
            </div>
          </div>

          {editingId && (
            <div className="space-y-3 rounded border p-3">
              <p className="text-sm font-medium">Current Media</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { url: products.find(p => p.id === editingId)?.imageUrl, key: "imageUrl" },
                  { url: products.find(p => p.id === editingId)?.imageUrl2, key: "imageUrl2" },
                  { url: products.find(p => p.id === editingId)?.imageUrl3, key: "imageUrl3" },
                ].map((item, idx) => item.url && (
                  <div key={idx} className="relative group">
                    <img src={item.url} className="h-16 w-16 rounded object-cover border" />
                    <button
                      onClick={async () => {
                        if (!window.confirm("Delete image permanently?")) return;
                        try {
                          await updateProduct({ id: editingId, patch: { [item.key]: null } as any }).unwrap();
                          toast.success("Image deleted");
                        } catch (err) { toast.fromError(err, "Failed to delete image"); }
                      }}
                      className="absolute -right-1 -top-1 rounded-full bg-error p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              {products.find(p => p.id === editingId)?.videoUrl && (
                <div className="relative group w-fit">
                  <video src={products.find(p => p.id === editingId)?.videoUrl ?? undefined} className="h-20 rounded border" controls />
                  <button
                    onClick={async () => {
                      if (!window.confirm("Delete video permanently?")) return;
                      try {
                        await updateProduct({ id: editingId, patch: { videoUrl: null } as any }).unwrap();
                        toast.success("Video deleted");
                      } catch (err) { toast.fromError(err, "Failed to delete video"); }
                    }}
                    className="absolute -right-1 -top-1 rounded-full bg-error p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={submitting}>{submitting ? "Saving…" : "Save Product"}</Button>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>


      {offerEditingProductId && (
        <OfferEditModal
          productId={offerEditingProductId}
          productName={products.find(p => p.id === offerEditingProductId)?.name || "Product"}
          onClose={() => setOfferEditingProductId(null)}
          allOffers={allOffers}
        />
      )}
    </div>
  );
}

export default memo(VendorProductManagement);
