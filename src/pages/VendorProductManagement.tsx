import { memo, useState, useCallback, useMemo, useEffect } from "react";
import { PencilIcon, XMarkIcon, TagIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
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
  ManagementFilterActions,
  MANAGEMENT_NATIVE_CONTROL_CLASS,
  MANAGEMENT_FILTER_BTN_CLASS,
  ResponsiveManagementFilters,
  RichTextEditor,
  SearchableMultiSelect,
  type MultiSelectOption,
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
  const [searchDraft, setSearchDraft] = useState("");
  const [categoryDraft, setCategoryDraft] = useState<string[]>([]);
  const [subcategoryDraft, setSubcategoryDraft] = useState<string[]>([]);

  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedCategory, setAppliedCategory] = useState<string[]>([]);
  const [appliedSubcategory, setAppliedSubcategory] = useState<string[]>([]);

  const { data: products = [], isLoading: productsLoading } = useGetVendorPortalProductsQuery();
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
  const [deactivatingProduct, setDeactivatingProduct] = useState<Product | null>(null);
  const [deactivatingLoading, setDeactivatingLoading] = useState(false);

  const handleApplyFilters = useCallback(() => {
    setAppliedSearch(searchDraft.trim());
    setAppliedCategory(categoryDraft);
    setAppliedSubcategory(subcategoryDraft);
  }, [searchDraft, categoryDraft, subcategoryDraft]);

  const handleClearFilters = useCallback(() => {
    setSearchDraft("");
    setCategoryDraft([]);
    setSubcategoryDraft([]);
    setAppliedSearch("");
    setAppliedCategory([]);
    setAppliedSubcategory([]);
  }, []);

  const handleConfirmDeactivate = useCallback(async () => {
    if (!deactivatingProduct) return;
    setDeactivatingLoading(true);
    try {
      await updateProduct({ id: deactivatingProduct.id, patch: { isActive: false } }).unwrap();
      toast.success("Product deactivated");
      setDeactivatingProduct(null);
    } catch (err) {
      toast.fromError(err, "Failed to deactivate product");
    } finally {
      setDeactivatingLoading(false);
    }
  }, [deactivatingProduct, updateProduct]);

  const hasAnyApplied = Boolean(
    appliedSearch.trim() ||
    appliedCategory.length > 0 ||
    appliedSubcategory.length > 0
  );

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

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) {
      map.set(c.id, c.name);
    }
    return map;
  }, [categories]);

  const allSubcategories = useMemo(() => {
    return categories.flatMap((c) =>
      (c.subcategories || []).map((s: any) => ({
        ...s,
        categoryId: s.categoryId || c.id,
        categoryName: c.name,
      }))
    );
  }, [categories]);

  const subcategoryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of allSubcategories) {
      map.set(s.id, s.name);
    }
    return map;
  }, [allSubcategories]);

  const categoryMultiOptions = useMemo<MultiSelectOption[]>(() => {
    return categories.map((c) => ({
      value: c.id,
      label: c.name,
    }));
  }, [categories]);

  const subcategoryMultiOptions = useMemo<MultiSelectOption[]>(() => {
    let list = allSubcategories;
    if (categoryDraft.length > 0) {
      const selectedCatIds = new Set(categoryDraft);
      list = allSubcategories.filter((s) => selectedCatIds.has(s.categoryId));
    }
    return list.map((s) => ({
      value: s.id,
      label: s.name,
      subLabel: s.categoryName,
    }));
  }, [allSubcategories, categoryDraft]);

  const subcategoryOptions: SelectOption[] = useMemo(() => {
    if (!categoryId) return [{ value: "", label: "Select subcategory…" }];
    const cat = categories.find(c => c.id === categoryId);
    return [
      { value: "", label: "Select subcategory…" },
      ...(cat?.subcategories || []).map((s: any) => ({ value: s.id, label: s.name }))
    ];
  }, [categories, categoryId]);

  const filteredProducts = useMemo(() => {
    const q = appliedSearch.trim().toLowerCase();
    const hasSearch = Boolean(q);
    const hasCat = appliedCategory.length > 0;
    const hasSub = appliedSubcategory.length > 0;

    const catIdSet = new Set(appliedCategory);
    const catNameSet = new Set(
      appliedCategory.map((id) => categoryMap.get(id)?.toLowerCase()).filter(Boolean) as string[]
    );
    const subIdSet = new Set(appliedSubcategory);
    const subNameSet = new Set(
      appliedSubcategory.map((id) => subcategoryMap.get(id)?.toLowerCase()).filter(Boolean) as string[]
    );

    return products.filter((p) => {
      if (hasSearch) {
        const code = (p.productCode || "").toLowerCase();
        const name = (p.name || "").toLowerCase();
        const desc = (p.description || "").toLowerCase();
        const cat = (p.categoryName || p.categoryEntity?.name || "").toLowerCase();
        const sub = (p.subcategoryName || p.subcategoryEntity?.name || "").toLowerCase();
        if (
          !code.includes(q) &&
          !name.includes(q) &&
          !desc.includes(q) &&
          !cat.includes(q) &&
          !sub.includes(q)
        ) {
          return false;
        }
      }

      if (hasCat) {
        const catId = p.categoryId || p.categoryEntity?.id;
        const catName = (
          p.categoryName ||
          p.categoryEntity?.name ||
          (p as any).category?.name ||
          (catId ? categoryMap.get(catId) : "") ||
          ""
        ).toLowerCase();
        const matchesCat = (catId && catIdSet.has(catId)) || (catName && catNameSet.has(catName));
        if (!matchesCat) return false;
      }

      if (hasSub) {
        const subId = p.subcategoryId || p.subcategoryEntity?.id;
        const subName = (
          p.subcategoryName ||
          p.subcategoryEntity?.name ||
          (p as any).subcategory?.name ||
          (subId ? subcategoryMap.get(subId) : "") ||
          ""
        ).toLowerCase();
        const matchesSub = (subId && subIdSet.has(subId)) || (subName && subNameSet.has(subName));
        if (!matchesSub) return false;
      }

      return true;
    });
  }, [products, appliedSearch, appliedCategory, appliedSubcategory, categoryMap, subcategoryMap]);

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
    {
      key: "productCode",
      header: "ID",
      className: "whitespace-nowrap min-w-[7.5rem]",
      render: (row: Product) => (
        <span className="whitespace-nowrap font-medium text-text-heading">
          {row.productCode ?? "—"}
        </span>
      ),
    },
    { key: "name", header: "Name" },
    {
      key: "category",
      header: "Category",
      className: "whitespace-nowrap",
      render: (row: Product) => {
        const cat =
          row.categoryName ||
          row.categoryEntity?.name ||
          (row as any).category?.name ||
          (row.categoryId ? categoryMap.get(row.categoryId) : "") ||
          "—";
        return <span className="whitespace-nowrap font-medium text-text-heading">{cat}</span>;
      },
    },
    {
      key: "subcategory",
      header: "Subcategory",
      className: "whitespace-nowrap",
      render: (row: Product) => {
        const sub =
          row.subcategoryName ||
          row.subcategoryEntity?.name ||
          (row as any).subcategory?.name ||
          (row.subcategoryId ? subcategoryMap.get(row.subcategoryId) : "") ||
          "—";
        return <span className="whitespace-nowrap text-text">{sub}</span>;
      },
    },
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
              if (row.isActive) {
                setDeactivatingProduct(row);
              } else {
                try {
                  await updateProduct({ id: row.id, patch: { isActive: true } }).unwrap();
                  toast.success("Product activated");
                } catch (err) {
                  toast.fromError(err, "Failed to update status");
                }
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
  ], [openEdit, handleDelete, setOfferEditingProductId, categoryMap, subcategoryMap, updateProduct]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader action={<Button onClick={openAdd}>Add Product</Button>} />

        <div className="pb-4 space-y-2">
          <ResponsiveManagementFilters modalTitle="Product Filters">
            <ManagementFilterPanel>
              <ManagementFilterField label="Search" className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
                <input
                  type="search"
                  placeholder="Product name, code..."
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  className={MANAGEMENT_NATIVE_CONTROL_CLASS}
                  aria-label="Search by product name, code, description"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleApplyFilters();
                    }
                  }}
                />
              </ManagementFilterField>

              <ManagementFilterField label="Category">
                <SearchableMultiSelect
                  selectedValues={categoryDraft}
                  onChange={setCategoryDraft}
                  options={categoryMultiOptions}
                  placeholder="All Categories"
                  searchPlaceholder="Search categories..."
                  itemNoun="category"
                />
              </ManagementFilterField>

              <ManagementFilterField label="Subcategory">
                <SearchableMultiSelect
                  selectedValues={subcategoryDraft}
                  onChange={setSubcategoryDraft}
                  options={subcategoryMultiOptions}
                  placeholder="All Subcategories"
                  searchPlaceholder="Search subcategories..."
                  itemNoun="subcategory"
                />
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
                    className="hover:text-red-500"
                    title="Remove search filter"
                  >
                    <XMarkIcon className="h-3.5 w-3.5" />
                  </button>
                </span>
              )}
              {appliedCategory.map((catId) => (
                <span
                  key={catId}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-600 border border-blue-500/20"
                >
                  Category: {categoryMap.get(catId) || catId}
                  <button
                    type="button"
                    onClick={() => {
                      const next = appliedCategory.filter((id) => id !== catId);
                      setCategoryDraft(next);
                      setAppliedCategory(next);
                    }}
                    className="hover:text-red-500"
                    title="Remove category filter"
                  >
                    <XMarkIcon className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
              {appliedSubcategory.map((subId) => (
                <span
                  key={subId}
                  className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-1 text-xs font-medium text-purple-600 border border-purple-500/20"
                >
                  Subcategory: {subcategoryMap.get(subId) || subId}
                  <button
                    type="button"
                    onClick={() => {
                      const next = appliedSubcategory.filter((id) => id !== subId);
                      setSubcategoryDraft(next);
                      setAppliedSubcategory(next);
                    }}
                    className="hover:text-red-500"
                    title="Remove subcategory filter"
                  >
                    <XMarkIcon className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
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

        <Table
          isLoading={productsLoading}
          columns={columns}
          data={filteredProducts}
          keyExtractor={(p) => p.id}
          emptyMessage={hasAnyApplied ? "No products match your selected filters." : "You haven't added any products yet."}
        />
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Product" : "Add Product"}
        size="screen-gap"
      >
        <div className="space-y-5">
          {/* Product Name & Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className={categoryId ? "md:col-span-6" : "md:col-span-7"}>
              <Input label="Product name *" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className={categoryId ? "md:col-span-3" : "md:col-span-5"}>
              <Select label="Category *" options={categoryOptions} value={categoryId} onChange={(e) => setCategoryId(e.target.value)} />
            </div>
            {categoryId && (
              <div className="md:col-span-3">
                <Select label="Subcategory *" options={subcategoryOptions} value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)} />
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-text">Description</label>
            <RichTextEditor
              key={editingId || "new-vendor-product"}
              value={description}
              onChange={setDescription}
              placeholder="Product details, bullet points, bold text..."
            />
          </div>

          {/* Pricing, Inventory & Specifications Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <Input label="Buying price (₹)" type="number" value={buyingPrice} onChange={(e) => setBuyingPrice(e.target.value)} placeholder="Cost to you" />
            <Input label="Selling price (₹) *" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price for customers" />
            <Input label="Actual price (MRP) (₹)" type="number" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} placeholder="Original price before discount" />
            <Input label="Stock quantity" type="number" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} placeholder="Available stock" />
            <Input label="Size" value={size} onChange={(e) => setSize(e.target.value)} placeholder="e.g. Medium, 1kg" />
            <Input label="Color" value={color} onChange={(e) => setColor(e.target.value)} placeholder="e.g. Red, Blue" />
            <div className="sm:col-span-2 space-y-1">
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
          </div>

          {/* Product Customization */}
          <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-dashed border-border/80">
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

          {/* Media Section: Upload & Current Media in Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-3 rounded-lg border border-border p-4 bg-surface-muted/30">
              <p className="text-sm font-semibold text-text">Media Upload</p>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-muted">Images (Up to 3 — JPG, PNG, WebP — max 5MB each)</label>
                <div className="grid grid-cols-3 gap-2.5">
                  {imagePreviewUrls.map((url, idx) => (
                    <div key={idx} className="relative aspect-square">
                      <img src={url} className="h-full w-full rounded-md object-cover border border-border" />
                      <button onClick={() => setImageFiles(prev => prev.filter((_, i) => i !== idx))} className="absolute -right-2 -top-2 rounded-full bg-error p-1 text-white shadow"><XMarkIcon className="h-3 w-3" /></button>
                    </div>
                  ))}
                  {imageFiles.length < 3 && (
                    <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-border hover:bg-surface-muted/50 transition-colors">
                      <span className="text-xl font-bold text-primary">+</span>
                      <span className="text-[11px] text-text-muted">Add Image</span>
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
                <label className="mb-1.5 block text-xs font-medium text-text-muted">Video (MP4, MOV — max 50MB)</label>
                <input
                  type="file"
                  accept="video/mp4,video/quicktime"
                  className="block w-full text-sm text-text-muted file:mr-2 file:rounded file:border-0 file:bg-primary-muted file:px-2.5 file:py-1.5 file:text-xs file:font-semibold file:text-primary hover:file:bg-primary-muted/80 cursor-pointer"
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
                {videoPreviewUrl && <video controls className="mt-2 max-h-48 w-full rounded-md border border-border" src={videoPreviewUrl} />}
              </div>
            </div>

            {editingId && (
              <div className="space-y-3 rounded-lg border border-border p-4 bg-surface">
                <p className="text-sm font-semibold text-text">Current Media</p>
                <div className="flex flex-wrap gap-2.5">
                  {[
                    { url: products.find(p => p.id === editingId)?.imageUrl, key: "imageUrl" },
                    { url: products.find(p => p.id === editingId)?.imageUrl2, key: "imageUrl2" },
                    { url: products.find(p => p.id === editingId)?.imageUrl3, key: "imageUrl3" },
                  ].map((item, idx) => item.url && (
                    <div key={idx} className="relative group">
                      <img src={item.url} className="h-20 w-20 rounded-md object-cover border border-border" />
                      <button
                        onClick={async () => {
                          if (!window.confirm("Delete image permanently?")) return;
                          try {
                            await updateProduct({ id: editingId, patch: { [item.key]: null } as any }).unwrap();
                            toast.success("Image deleted");
                          } catch (err) { toast.fromError(err, "Failed to delete image"); }
                        }}
                        className="absolute -right-1.5 -top-1.5 rounded-full bg-error p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow"
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                {products.find(p => p.id === editingId)?.videoUrl && (
                  <div className="relative group w-fit mt-2">
                    <video src={products.find(p => p.id === editingId)?.videoUrl ?? undefined} className="h-24 rounded-md border border-border" controls />
                    <button
                      onClick={async () => {
                        if (!window.confirm("Delete video permanently?")) return;
                        try {
                          await updateProduct({ id: editingId, patch: { videoUrl: null } as any }).unwrap();
                          toast.success("Video deleted");
                        } catch (err) { toast.fromError(err, "Failed to delete video"); }
                      }}
                      className="absolute -right-1.5 -top-1.5 rounded-full bg-error p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

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

      {/* Deactivate Warning Modal */}
      <Modal
        isOpen={Boolean(deactivatingProduct)}
        onClose={() => {
          if (!deactivatingLoading) setDeactivatingProduct(null);
        }}
        title="Warning: Deactivate Product"
        size="md"
      >
        <div className="space-y-4 pt-1">
          <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-amber-500/20 bg-amber-500/10 p-4">
            <ExclamationTriangleIcon className="h-6 w-6 shrink-0 text-amber-500 mt-0.5" />
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-text-heading">
                You won’t receive orders for this product
              </p>
              <p className="text-text-muted leading-relaxed">
                Deactivating this product will make it appear as <span className="font-bold text-red-600 whitespace-nowrap">Out of Stock</span> in the store. Customers won’t be able to place new orders until you reactivate the product.
              </p>
            </div>
          </div>

          {deactivatingProduct && (
            <div className="rounded-[var(--radius-md)] border border-border bg-surface-elevated/60 p-3 text-xs text-text-muted space-y-1">
              <div>
                <span className="font-medium text-text-heading">Product:</span>{" "}
                {deactivatingProduct.name}
              </div>
              {deactivatingProduct.productCode && (
                <div>
                  <span className="font-medium text-text-heading">Product ID:</span>{" "}
                  {deactivatingProduct.productCode}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={deactivatingLoading}
              onClick={() => setDeactivatingProduct(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white border-transparent"
              loading={deactivatingLoading}
              onClick={handleConfirmDeactivate}
            >
              OK, Deactivate
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default memo(VendorProductManagement);
