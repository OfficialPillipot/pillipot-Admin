import { memo, useState, useCallback, useMemo, useEffect } from "react";
import { PencilIcon, TrashIcon, XMarkIcon, EyeIcon } from "@heroicons/react/24/outline";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { selectProducts, createProduct, updateProduct, deleteProduct } from "../store/productsSlice";
import { selectCategories, fetchCategories } from "../store/categoriesSlice";
import { selectSubcategories, fetchSubcategories } from "../store/subcategoriesSlice";
import {
  Card,
  CardHeader,
  Button,
  ToggleSwitch,
  Table,
  Modal,
  Input,
  Tooltip,
  Select,
  ManagementFilterPanel,
  ManagementFilterField,
  ResponsiveManagementFilters,
} from "../components/ui";
import type { SelectOption } from "../components/ui/Select";
import { toast } from "../lib/toast";
import type { Product } from "../types";

const UNCATEGORIZED_FILTER = "__none__";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/quicktime"]);

function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return "Image must be JPG, PNG, or WebP.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "Image must be at most 5MB.";
  }
  return null;
}

function validateVideoFile(file: File): string | null {
  if (!ALLOWED_VIDEO_TYPES.has(file.type)) {
    return "Video must be MP4 or MOV.";
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return "Video must be at most 50MB.";
  }
  return null;
}

function ProductManagementPage() {
  const dispatch = useAppDispatch();
  const products = useAppSelector(selectProducts);
  const categories = useAppSelector(selectCategories);
  const subcategories = useAppSelector(selectSubcategories);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [buyingPrice, setBuyingPrice] = useState("");
  const [price, setPrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [description, setDescription] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [togglingActiveId, setTogglingActiveId] = useState<string | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);

  useEffect(() => {
    void dispatch(fetchCategories());
    void dispatch(fetchSubcategories());
  }, [dispatch]);

  useEffect(() => {
    if (imageFiles.length === 0) {
      setImagePreviewUrls([]);
      return;
    }
    const urls = imageFiles.map((file) => URL.createObjectURL(file));
    setImagePreviewUrls(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imageFiles]);

  useEffect(() => {
    if (!videoFile) {
      setVideoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(videoFile);
    setVideoPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [videoFile]);

  const categoryOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: "Select category…" },
      ...categories.map((c) => ({ value: c.id, label: c.name })),
    ],
    [categories]
  );

  const openAdd = useCallback(() => {
    setEditingId(null);
    setName("");
    setCategoryId("");
    setSubcategoryId("");
    setBuyingPrice("");
    setPrice("");
    setStockQuantity("");
    setSize("");
    setColor("");
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
    setBuyingPrice(
      p.buyingPrice != null ? String(p.buyingPrice) : ""
    );
    setPrice(String(p.price ?? 0));
    setStockQuantity(String(p.stockQuantity ?? 0));
    setSize(p.size ?? "");
    setColor(p.color ?? "");
    setSize(p.size ?? "");
    setColor(p.color ?? "");
    setDescription(p.description ?? "");
    setImageFiles([]);
    setVideoFile(null);
    setModalOpen(true);
  }, []);

  const openView = useCallback((p: Product) => {
    setViewingProduct(p);
  }, []);

  const handleSave = useCallback(async () => {
    if (!name.trim()) return;
    if (!categoryId) {
      toast.error("Select a category");
      return;
    }
    if (!subcategoryId) {
      toast.error("Select a subcategory");
      return;
    }
    const priceNum = parseFloat(price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      toast.error("Enter a valid selling price");
      return;
    }
    const buyingTrim = buyingPrice.trim();
    const buyingNum =
      buyingTrim === "" ? 0 : parseFloat(buyingTrim);
    if (buyingTrim !== "" && (Number.isNaN(buyingNum) || buyingNum < 0)) {
      toast.error("Enter a valid buying price");
      return;
    }
    const stockTrim = stockQuantity.trim();
    const stockNum =
      stockTrim === "" ? 0 : parseInt(stockTrim, 10);
    if (stockTrim !== "" && (Number.isNaN(stockNum) || stockNum < 0)) {
      toast.error("Enter a valid stock quantity");
      return;
    }
    if (imageFiles.length > 0) {
      for (const f of imageFiles) {
        const err = validateImageFile(f);
        if (err) {
          toast.error(err);
          return;
        }
      }
    }
    if (videoFile) {
      const err = validateVideoFile(videoFile);
      if (err) {
        toast.error(err);
        return;
      }
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await dispatch(
          updateProduct({
            id: editingId,
            patch: {
              name: name.trim(),
              categoryId,
              subcategoryId: subcategoryId || undefined,
              price: priceNum,
              buyingPrice: buyingNum,
              stockQuantity: stockNum,
              size: size.trim() || undefined,
              color: color.trim() || undefined,
              description: description.trim() || undefined,
              image: imageFiles.length > 0 ? imageFiles : undefined,
              video: videoFile ?? undefined,
            },
          })
        ).unwrap();
        toast.success("Product updated");
      } else {
        await dispatch(
          createProduct({
            name: name.trim(),
            categoryId,
            subcategoryId: subcategoryId || undefined,
            price: priceNum,
            buyingPrice: buyingNum,
            stockQuantity: stockNum,
            size: size.trim() || undefined,
            color: color.trim() || undefined,
            description: description.trim() || undefined,
            image: imageFiles.length > 0 ? imageFiles : undefined,
            video: videoFile ?? undefined,
          })
        ).unwrap();
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
    buyingPrice,
    price,
    stockQuantity,
    size,
    color,
    description,
    imageFiles,
    videoFile,
    subcategoryId,
    dispatch,
  ]);

  const filteredSubcategories = useMemo(() => {
    if (!categoryId) return [];
    return subcategories.filter((s) => s.categoryId === categoryId);
  }, [subcategories, categoryId]);

  const subcategoryOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: "Select subcategory…" },
      ...filteredSubcategories.map((s) => ({ value: s.id, label: s.name })),
    ],
    [filteredSubcategories]
  );

  const toggleProductActive = useCallback(
    async (p: Product, next: boolean) => {
      setTogglingActiveId(p.id);
      try {
        await dispatch(
          updateProduct({ id: p.id, patch: { isActive: next } }),
        ).unwrap();
        toast.success(next ? "Product is active" : "Product hidden from staff");
      } catch (err) {
        toast.fromError(err, "Failed to update product");
      } finally {
        setTogglingActiveId(null);
      }
    },
    [dispatch],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (
        !window.confirm(
          "Delete this product permanently? Only allowed if it has never been ordered.",
        )
      )
        return;
      try {
        await dispatch(deleteProduct(id)).unwrap();
        if (editingId === id) setModalOpen(false);
        toast.success("Product deleted");
      } catch (err) {
        toast.fromError(err, "Failed to delete product");
      }
    },
    [dispatch, editingId],
  );

  const categoryFilterOptions: SelectOption[] = useMemo(() => {
    const hasUncat = products.some((p) => !p.categoryId);
    const opts: SelectOption[] = [
      { value: "", label: "All categories" },
      ...categories.map((c) => ({ value: c.id, label: c.name })),
    ];
    if (hasUncat) {
      opts.push({ value: UNCATEGORIZED_FILTER, label: "Uncategorized" });
    }
    return opts;
  }, [categories, products]);

  const filteredProducts = useMemo(() => {
    if (!categoryFilter) return products;
    if (categoryFilter === UNCATEGORIZED_FILTER) {
      return products.filter((p) => !p.categoryId);
    }
    return products.filter((p) => p.categoryId === categoryFilter);
  }, [products, categoryFilter]);

  const editingProduct = useMemo(
    () => (editingId ? products.find((p) => p.id === editingId) : null),
    [editingId, products],
  );

  const columns = useMemo(
    () => [
      {
        key: "productCode",
        header: "Product ID",
        mobileCardTitle: true,
        mobileLabel: "ID",
        render: (row: Product) => row.productCode ?? "—",
      },
      {
        key: "categoryName",
        header: "Category",
        render: (row: Product) => (
          <div className="flex flex-col">
            <span className="font-medium text-text">{row.categoryName ?? "—"}</span>
            {row.subcategoryName && (
              <span className="text-[10px] text-text-muted">{row.subcategoryName}</span>
            )}
          </div>
        ),
      },
      { key: "name", header: "Name" },
      {
        key: "imageUrl",
        header: "Image",
        render: (row: Product) =>
          row.imageUrl ? (
            <img
              src={row.imageUrl}
              alt=""
              width={50}
              height={50}
              className="h-12 w-12 rounded object-cover"
            />
          ) : (
            "—"
          ),
      },
      {
        key: "videoUrl",
        header: "Video",
        render: (row: Product) =>
          row.videoUrl ? (
            <video width={100} controls className="max-h-24 rounded">
              <source src={row.videoUrl} />
            </video>
          ) : (
            "—"
          ),
      },
      {
        key: "sku",
        header: "SKU",
        render: (row: Product) => row.sku ?? "—",
      },
      {
        key: "buyingPrice",
        header: "Buying (₹)",
        mobileLabel: "Buying",
        render: (row: Product) =>
          row.buyingPrice != null
            ? `₹${Number(row.buyingPrice).toFixed(2)}`
            : "—",
      },
      {
        key: "price",
        header: "Selling (₹)",
        mobileLabel: "Selling",
        render: (row: Product) => `₹${Number(row.price).toFixed(2)}`,
      },
      {
        key: "stockQuantity",
        header: "Qty",
        render: (row: Product) => row.stockQuantity ?? 0,
      },
      {
        key: "size",
        header: "Size",
        render: (row: Product) => row.size ?? "—",
      },
      {
        key: "color",
        header: "Color",
        render: (row: Product) => row.color ?? "—",
      },
      {
        key: "isActive",
        header: "Catalog",
        mobileLabel: "Status",
        render: (row: Product) => {
          const active = row.isActive !== false;
          const busy = togglingActiveId === row.id;
          return (
            <ToggleSwitch
              checked={active}
              disabled={busy}
              onChange={(next) => void toggleProductActive(row, next)}
              aria-label={
                active
                  ? `In catalog: ${row.name}. Turn off to hide from staff.`
                  : `Hidden: ${row.name}. Turn on to show in catalog.`
              }
            />
          );
        },
      },
      {
        key: "actions",
        header: "",
        mobileHeaderEnd: true,
        render: (row: Product) => (
          <div className="flex items-center gap-1">
            <Tooltip content="View" side="top">
              <button
                type="button"
                onClick={() => openView(row)}
                className="rounded-[var(--radius-md)] p-2 text-text-muted hover:bg-primary-muted hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="View product"
              >
                <EyeIcon className="h-4 w-4" />
              </button>
            </Tooltip>
            <Tooltip content="Edit" side="top">
              <button
                type="button"
                onClick={() => openEdit(row)}
                className="rounded-[var(--radius-md)] p-2 text-text-muted hover:bg-primary-muted hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Edit product"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
            </Tooltip>
            <Tooltip content="Delete" side="top">
              <button
                type="button"
                onClick={() => handleDelete(row.id)}
                className="rounded-[var(--radius-md)] p-2 text-text-muted hover:bg-error-bg hover:text-error focus:outline-none focus:ring-2 focus:ring-error"
                aria-label="Delete product"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </Tooltip>
          </div>
        ),
      },
    ],
    [openEdit, openView, handleDelete, toggleProductActive, togglingActiveId]
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Product Management"
          // subtitle="Manage categories under Category Management, then assign each product to a category here."
          action={
            <Button onClick={openAdd}>Add Product</Button>
          }
        />
        <div className="mb-4">
          <ResponsiveManagementFilters modalTitle="Product filters" triggerLabel="Filters">
            <ManagementFilterPanel>
              <ManagementFilterField label="Category" className="lg:col-span-2 xl:col-span-2">
                <Select
                  label=""
                  fullWidth
                  options={categoryFilterOptions}
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  aria-label="Filter by category"
                />
              </ManagementFilterField>
            </ManagementFilterPanel>
          </ResponsiveManagementFilters>
        </div>
        <Table
          columns={columns}
          data={filteredProducts}
          keyExtractor={(p) => p.id}
          emptyMessage={
            categoryFilter
              ? "No products in this category."
              : "No products. Add one to show in the staff order form."
          }
        />
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Product" : "Add Product"}
      >
        <div className="space-y-4">
          <Input
            label="Product name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Organic Honey 500g"
          />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-text">
              Description
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Optional details for catalog or staff"
            />
          </label>
          <div className="space-y-3 rounded-[var(--radius-md)] border border-border bg-surface-muted/40 p-3">
            <p className="text-sm font-medium text-text">Upload new media (optional)</p>
              <div>
                <label className="mb-1 block text-xs text-text-muted">
                  Images (Up to 3 — JPG, PNG, WebP — max 5MB each)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {imagePreviewUrls.map((url, idx) => (
                    <div key={idx} className="group relative aspect-square w-full">
                      <img
                        src={url}
                        alt={`Preview ${idx + 1}`}
                        className="h-full w-full rounded border border-border object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImageFiles((prev) => prev.filter((_, i) => i !== idx));
                        }}
                        className="absolute -right-2 -top-2 rounded-full bg-error p-1 text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove image"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {imageFiles.length < 3 && (
                    <label className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed border-border bg-surface-muted/20 hover:bg-surface-muted/40 transition-colors">
                      <span className="text-xl font-bold text-primary">+</span>
                      <span className="text-[10px] text-text-muted">Add Image</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            const err = validateImageFile(f);
                            if (err) {
                              toast.error(err);
                              return;
                            }
                            setImageFiles((prev) => [...prev, f]);
                          }
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-text-muted">
                  Video (MP4, MOV — max 50MB)
                </label>
                <input
                  type="file"
                  accept="video/mp4,video/quicktime"
                  className="block w-full text-sm text-text-muted file:mr-2 file:rounded file:border-0 file:bg-primary-muted file:px-2 file:py-1 file:text-sm file:text-primary"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const err = validateVideoFile(f);
                      if (err) {
                        toast.error(err);
                        e.target.value = "";
                        return;
                      }
                    }
                    setVideoFile(f ?? null);
                    e.target.value = "";
                  }}
                />
                {videoPreviewUrl && (
                  <video
                    controls
                    className="mt-2 max-h-48 w-full max-w-md rounded border border-border"
                    src={videoPreviewUrl}
                  />
                )}
              </div>
            </div>
            {editingId &&
            (editingProduct?.imageUrl ||
              editingProduct?.imageUrl2 ||
              editingProduct?.imageUrl3 ||
              editingProduct?.videoUrl) && (
              <div className="space-y-3 rounded-[var(--radius-md)] border border-border p-3">
                <p className="text-sm font-medium text-text">Current media</p>
                <div className="flex flex-wrap gap-3">
                  {[
                    { url: editingProduct.imageUrl, key: "imageUrl" },
                    { url: editingProduct.imageUrl2, key: "imageUrl2" },
                    { url: editingProduct.imageUrl3, key: "imageUrl3" },
                  ].map(
                    (item, idx) =>
                      item.url && (
                        <div key={idx} className="group relative">
                          <img
                            src={item.url}
                            alt={`Current ${idx + 1}`}
                            className="h-20 w-20 rounded border border-border object-cover"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              if (!window.confirm("Delete this image permanently?")) return;
                              try {
                                await dispatch(
                                  updateProduct({
                                    id: editingId,
                                    patch: { [item.key]: null },
                                  }),
                                ).unwrap();
                                toast.success("Image deleted");
                              } catch (err) {
                                toast.fromError(err, "Failed to delete image");
                              }
                            }}
                            className="absolute -right-2 -top-2 rounded-full bg-error p-1 text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete permanently"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ),
                  )}
                </div>
                {editingProduct?.videoUrl && (
                  <div className="group relative w-fit">
                    <video width={120} controls className="max-h-24 rounded border border-border">
                      <source src={editingProduct.videoUrl} />
                    </video>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm("Delete this video permanently?")) return;
                        try {
                          await dispatch(
                            updateProduct({
                              id: editingId,
                              patch: { videoUrl: null },
                            }),
                          ).unwrap();
                          toast.success("Video deleted");
                        } catch (err) {
                          toast.fromError(err, "Failed to delete video");
                        }
                      }}
                      className="absolute -right-2 -top-2 z-10 rounded-full bg-error p-1 text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete video permanently"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          <Select
            label="Category *"
            options={categoryOptions}
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setSubcategoryId("");
            }}
            placeholder="Choose a category"
          />
          {categoryId && (
            <Select
              label="Subcategory *"
              options={subcategoryOptions}
              value={subcategoryId}
              onChange={(e) => setSubcategoryId(e.target.value)}
              placeholder="Choose a subcategory"
            />
          )}
          {categories.length === 0 && (
            <p className="text-sm text-amber-800">
              No categories yet. Open <strong>Category Management</strong> and create at least one
              first.
            </p>
          )}
          <Input
            label="Buying price (₹)"
            type="number"
            min={0}
            step="0.01"
            value={buyingPrice}
            onChange={(e) => setBuyingPrice(e.target.value)}
            placeholder="0 — cost to you (optional)"
          />
          <Input
            label="Selling price (₹) *"
            type="number"
            min={0}
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00 — catalog / order price"
          />
          <Input
            label="Stock quantity"
            type="number"
            min={0}
            step={1}
            value={stockQuantity}
            onChange={(e) =>
              setStockQuantity(e.target.value.replace(/\D/g, ""))
            }
            placeholder="0"
          />
          <Input
            label="Size"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            placeholder="e.g. M, 500g"
          />
          <Input
            label="Color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="e.g. Navy"
          />
          {/* {editingId && (
            <p className="text-xs text-text-muted">
              Product ID and SKU are assigned automatically and can be adjusted later via API if needed.
            </p>  
          )} */}
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={submitting}>
              {submitting ? "Saving…" : "Save"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!viewingProduct}
        onClose={() => setViewingProduct(null)}
        title="View Product"
      >
        {viewingProduct && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 border-b border-border pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Name</p>
                <p className="text-sm font-medium text-text">{viewingProduct.name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Category</p>
                <p className="text-sm font-medium text-text">{viewingProduct.categoryName || "Uncategorized"}</p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-semibold text-text">Product Media</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  viewingProduct.imageUrl,
                  viewingProduct.imageUrl2,
                  viewingProduct.imageUrl3,
                ].map(
                  (url, idx) =>
                    url && (
                      <div key={idx} className="aspect-square overflow-hidden rounded-lg border border-border bg-surface-muted">
                        <img
                          src={url}
                          alt={`Product image ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ),
                )}
              </div>
              {viewingProduct.videoUrl && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">Video Preview</p>
                  <video
                    controls
                    className="w-full rounded-lg border border-border shadow-sm max-h-64"
                    src={viewingProduct.videoUrl}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4 rounded-lg bg-surface-muted/50 p-4">
              <div>
                <p className="text-[10px] font-bold uppercase text-text-muted">Price</p>
                <p className="text-sm font-bold text-primary">₹{viewingProduct.price}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-text-muted">Stock</p>
                <p className="text-sm font-medium text-text">{viewingProduct.stockQuantity}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-text-muted">Status</p>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${viewingProduct.isActive !== false ? "bg-success/10 text-success" : "bg-error/10 text-error"}`}>
                  {viewingProduct.isActive !== false ? "Active" : "Hidden"}
                </span>
              </div>
            </div>

            {viewingProduct.description && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Description</p>
                <p className="mt-1 text-sm text-text-muted leading-relaxed whitespace-pre-wrap">{viewingProduct.description}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={() => setViewingProduct(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default memo(ProductManagementPage);
