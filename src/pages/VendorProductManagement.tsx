import { memo, useState, useCallback, useMemo } from "react";
import {
  PencilIcon,
  XMarkIcon,
  TagIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
  VideoCameraIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { StarIcon } from "@heroicons/react/24/solid";
import {
  Card,
  CardHeader,
  Button,
  Table,
  TablePagination,
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
  useGetVendorPortalProductsPaginatedQuery,
  useCreateVendorPortalProductMutation,
  useUpdateVendorPortalProductMutation,
  useDeleteVendorPortalProductMutation,
  useGetVendorPortalCategoriesQuery,
  useGetVendorPortalOffersQuery,
  useGetTagsQuery,
} from "../store/api/edenApi";
import { OfferEditModal } from "./VendorOfferManagement";

export interface FormMediaItem {
  id: string;
  type: "image" | "video";
  file?: File;
  url: string;
  isExisting?: boolean;
  existingKey?: "imageUrl" | "imageUrl2" | "imageUrl3" | "imageUrl4" | "videoUrl";
}

export const PRODUCT_TYPE_OPTIONS: SelectOption[] = [
  { value: "simple", label: "Simple Product" },
  { value: "variable", label: "Variable / Configurable" },
  { value: "digital", label: "Digital / Downloadable" },
  { value: "perishable", label: "Perishable / Fresh Goods" },
  { value: "customized", label: "Customized / Personalized Gift" },
];

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

  // Pagination state (default: 10 items)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Checkbox selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const { data: paginatedData, isLoading: productsLoading } = useGetVendorPortalProductsPaginatedQuery({
    page: currentPage,
    limit: pageSize,
    search: appliedSearch.trim() || undefined,
    categoryId: appliedCategory.length === 1 ? appliedCategory[0] : undefined,
    subcategoryId: appliedSubcategory.length === 1 ? appliedSubcategory[0] : undefined,
  });

  const products = useMemo(() => paginatedData?.items ?? [], [paginatedData]);
  const totalItems = paginatedData?.total ?? 0;
  const totalPages = paginatedData?.totalPages ?? 1;

  const { data: categories = [] } = useGetVendorPortalCategoriesQuery();
  const { data: allOffers = [] } = useGetVendorPortalOffersQuery();

  const [createProduct] = useCreateVendorPortalProductMutation();
  const [updateProduct] = useUpdateVendorPortalProductMutation();
  const [deleteProduct] = useDeleteVendorPortalProductMutation();

  const { data: allTags = [] } = useGetTagsQuery();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [offerEditingProductId, setOfferEditingProductId] = useState<string | null>(null);

  // 1. Product Details
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [subcategoryIds, setSubcategoryIds] = useState<string[]>([]);
  const [brand, setBrand] = useState("");
  const [productType, setProductType] = useState("simple");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [weight, setWeight] = useState("");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  // Media items (max 4, slot 1 = primary thumb image)
  const [mediaItems, setMediaItems] = useState<FormMediaItem[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // 2. Pricing & Specifications
  const [buyingPrice, setBuyingPrice] = useState("");
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [preparationDays, setPreparationDays] = useState("2");

  // 3. Product Customization
  const [isCustomizable, setIsCustomizable] = useState(false);
  const [allowPhotoUpload, setAllowPhotoUpload] = useState(false);
  const [allowTextInput, setAllowTextInput] = useState(false);
  const [customTextPrompt, setCustomTextPrompt] = useState("");
  const [customTextLimit, setCustomTextLimit] = useState("50");

  const [submitting, setSubmitting] = useState(false);
  const [deactivatingProduct, setDeactivatingProduct] = useState<Product | null>(null);
  const [deactivatingLoading, setDeactivatingLoading] = useState(false);

  const handleApplyFilters = useCallback(() => {
    setAppliedSearch(searchDraft.trim());
    setAppliedCategory(categoryDraft);
    setAppliedSubcategory(subcategoryDraft);
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [searchDraft, categoryDraft, subcategoryDraft]);

  const handleClearFilters = useCallback(() => {
    setSearchDraft("");
    setCategoryDraft([]);
    setSubcategoryDraft([]);
    setAppliedSearch("");
    setAppliedCategory([]);
    setAppliedSubcategory([]);
    setCurrentPage(1);
    setSelectedIds(new Set());
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

  const categoryFormOptions = useMemo<MultiSelectOption[]>(() => {
    return categories.map((c) => ({
      value: c.id,
      label: c.name,
    }));
  }, [categories]);

  const subcategoryFormOptions = useMemo<MultiSelectOption[]>(() => {
    let list = allSubcategories;
    if (categoryIds.length > 0) {
      const selectedCatIds = new Set(categoryIds);
      list = allSubcategories.filter((s) => selectedCatIds.has(s.categoryId));
    }
    return list.map((s) => ({
      value: s.id,
      label: s.name,
      subLabel: s.categoryName,
    }));
  }, [allSubcategories, categoryIds]);

  const handleAddTag = useCallback((tagToAdd?: string) => {
    const raw = (tagToAdd || tagInput).trim();
    if (!raw) return;
    const cleanTag = raw.replace(/^#/, "").trim().toLowerCase();
    if (!cleanTag) return;
    if (!selectedTags.includes(cleanTag)) {
      setSelectedTags((prev) => [...prev, cleanTag]);
    }
    setTagInput("");
  }, [tagInput, selectedTags]);

  const handleAddImages = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const currentCount = mediaItems.length;
    const remainingSlots = 4 - currentCount;
    if (remainingSlots <= 0) {
      toast.error("Maximum 4 media items can be uploaded.");
      return;
    }

    const filesArray = Array.from(files).slice(0, remainingSlots);
    const newItems: FormMediaItem[] = [];

    for (const file of filesArray) {
      const err = validateImageFile(file);
      if (err) {
        toast.error(err);
        continue;
      }
      newItems.push({
        id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: "image",
        file,
        url: URL.createObjectURL(file),
      });
    }

    if (newItems.length > 0) {
      setMediaItems((prev) => [...prev, ...newItems]);
      toast.success(`${newItems.length} image${newItems.length > 1 ? "s" : ""} added`);
    }
  }, [mediaItems]);

  const handleAddVideo = useCallback((file: File | null) => {
    if (!file) return;
    if (mediaItems.some((m) => m.type === "video")) {
      toast.error("Only 1 video can be uploaded.");
      return;
    }
    if (mediaItems.length >= 4) {
      toast.error("Maximum 4 media items can be uploaded.");
      return;
    }
    if (mediaItems.length === 0) {
      toast.error("Please upload the primary thumbnail image first before adding a video.");
      return;
    }

    const err = validateVideoFile(file);
    if (err) {
      toast.error(err);
      return;
    }

    const newItem: FormMediaItem = {
      id: `vid-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: "video",
      file,
      url: URL.createObjectURL(file),
    };
    setMediaItems((prev) => [...prev, newItem]);
    toast.success("Video added");
  }, [mediaItems]);

  const handleRemoveMedia = useCallback((index: number) => {
    setMediaItems((prev) => {
      const item = prev[index];
      if (item?.file && item.url.startsWith("blob:")) {
        URL.revokeObjectURL(item.url);
      }
      const updated = prev.filter((_, i) => i !== index);
      // Ensure slot 0 is not a video if items remain
      if (updated.length > 0 && updated[0].type === "video") {
        const firstImgIdx = updated.findIndex((m) => m.type === "image");
        if (firstImgIdx !== -1) {
          const [img] = updated.splice(firstImgIdx, 1);
          updated.unshift(img);
        } else {
          toast.error("The primary thumbnail must be an image. Please add an image thumbnail.");
        }
      }
      return updated;
    });
  }, []);

  const handleMediaDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleMediaDrop = useCallback((targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    const draggedItem = mediaItems[draggedIndex];
    if (targetIndex === 0 && draggedItem.type === "video") {
      toast.error("The first slot is reserved for the primary thumbnail and must be an image.");
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...mediaItems];
    const [moved] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, moved);

    if (updated[0].type === "video") {
      toast.error("The first slot must be an image thumbnail.");
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    setMediaItems(updated);
    setDraggedIndex(null);
    setDragOverIndex(null);
    toast.success("Media reordered");
  }, [draggedIndex, mediaItems]);

  const handleMoveMedia = useCallback((index: number, direction: "left" | "right") => {
    const target = direction === "left" ? index - 1 : index + 1;
    if (target < 0 || target >= mediaItems.length) return;
    if (target === 0 && mediaItems[index].type === "video") {
      toast.error("The first slot is reserved for the primary thumbnail and must be an image.");
      return;
    }
    const updated = [...mediaItems];
    const [moved] = updated.splice(index, 1);
    updated.splice(target, 0, moved);
    if (updated[0].type === "video") {
      toast.error("The first slot must be an image thumbnail.");
      return;
    }
    setMediaItems(updated);
  }, [mediaItems]);

  const openAdd = useCallback(() => {
    setEditingId(null);
    setName("");
    setSku("");
    setCategoryIds([]);
    setSubcategoryIds([]);
    setBrand("");
    setProductType("simple");
    setShortDescription("");
    setDescription("");
    setWeight("");
    setLength("");
    setWidth("");
    setHeight("");
    setSelectedTags([]);
    setTagInput("");
    setMediaItems([]);
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
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((p: Product) => {
    setEditingId(p.id);
    setName(p.name);
    setSku(p.sku || p.productCode || "");
    const cats = p.categoryIds?.length ? p.categoryIds : p.categoryId ? [p.categoryId] : [];
    const subs = p.subcategoryIds?.length ? p.subcategoryIds : p.subcategoryId ? [p.subcategoryId] : [];
    setCategoryIds(cats);
    setSubcategoryIds(subs);
    setBrand(p.brand || "");
    setProductType(p.productType || "simple");
    setShortDescription(p.shortDescription || "");
    setDescription(p.description || "");
    setWeight(p.weight || "");
    setLength(p.length || "");
    setWidth(p.width || "");
    setHeight(p.height || "");
    setSelectedTags(p.tags || []);
    setTagInput("");

    // Populate existing media items up to 4
    const existing: FormMediaItem[] = [];
    if (p.imageUrl) existing.push({ id: "exist-img-1", type: "image", url: p.imageUrl, isExisting: true, existingKey: "imageUrl" });
    if (p.imageUrl2) existing.push({ id: "exist-img-2", type: "image", url: p.imageUrl2, isExisting: true, existingKey: "imageUrl2" });
    if (p.imageUrl3) existing.push({ id: "exist-img-3", type: "image", url: p.imageUrl3, isExisting: true, existingKey: "imageUrl3" });
    if (p.imageUrl4) existing.push({ id: "exist-img-4", type: "image", url: p.imageUrl4, isExisting: true, existingKey: "imageUrl4" });
    if (p.videoUrl) existing.push({ id: "exist-vid-1", type: "video", url: p.videoUrl, isExisting: true, existingKey: "videoUrl" });
    setMediaItems(existing.slice(0, 4));

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
    setModalOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      toast.error("Please enter a product name");
      return;
    }
    if (categoryIds.length === 0) {
      toast.error("Please select at least one category");
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

    if (mediaItems.length > 0 && mediaItems[0].type === "video") {
      toast.error("The first media item is the primary thumbnail and must be an image.");
      return;
    }

    setSubmitting(true);
    try {
      const images = mediaItems.filter((m) => m.type === "image");
      const videoItem = mediaItems.find((m) => m.type === "video");
      const newImageFiles = images.filter((m) => m.file).map((m) => m.file!);
      const newVideoFile = videoItem?.file ?? undefined;

      const payload: any = {
        name: name.trim(),
        categoryId: categoryIds[0] || "",
        subcategoryId: subcategoryIds[0] || undefined,
        categoryIds,
        subcategoryIds,
        sku: sku.trim() || undefined,
        brand: brand.trim() || undefined,
        productType: productType || undefined,
        shortDescription: shortDescription.trim() || undefined,
        description: description.trim() || undefined,
        weight: weight.trim() || undefined,
        length: length.trim() || undefined,
        width: width.trim() || undefined,
        height: height.trim() || undefined,
        tags: selectedTags,
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
        image: newImageFiles.length > 0 ? newImageFiles : undefined,
        video: newVideoFile,
      };

      if (editingId) {
        images.forEach((img, idx) => {
          const key = idx === 0 ? "imageUrl" : idx === 1 ? "imageUrl2" : idx === 2 ? "imageUrl3" : "imageUrl4";
          if (img.isExisting) {
            payload[key] = img.url;
          }
        });
        if (images.length < 4) payload.imageUrl4 = null;
        if (images.length < 3) payload.imageUrl3 = null;
        if (images.length < 2) payload.imageUrl2 = null;
        if (!videoItem) payload.videoUrl = null;

        await updateProduct({ id: editingId, patch: payload }).unwrap();
        toast.success("Product updated successfully");
      } else {
        await createProduct(payload).unwrap();
        toast.success("Product created successfully");
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
    categoryIds,
    subcategoryIds,
    sku,
    brand,
    productType,
    shortDescription,
    description,
    weight,
    length,
    width,
    height,
    selectedTags,
    mediaItems,
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
    createProduct,
    updateProduct,
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
      toast.success(`${ids.length} product(s) ${isActive ? "activated" : "deactivated"}`);
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
  ], [
    openEdit,
    handleDelete,
    setOfferEditingProductId,
    categoryMap,
    subcategoryMap,
    updateProduct,
    allOnPageSelected,
    isIndeterminate,
    selectedIds,
    toggleSelectAll,
    toggleSelectRow,
  ]);

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

        <Table
          isLoading={productsLoading}
          columns={columns}
          data={filteredProducts}
          keyExtractor={(p) => p.id}
          emptyMessage={hasAnyApplied ? "No products match your selected filters." : "You haven't added any products yet."}
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
          disabled={productsLoading}
        />
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Product" : "Add Product"}
        size="screen-gap"
        closeOnOutsideClick={false}
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={submitting}>
              {submitting ? "Saving Product..." : editingId ? "Save Changes" : "Save Product"}
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* SECTION 1: PRODUCT DETAILS */}
          <div className="space-y-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
            <div className="border-b border-border pb-3">
              <h3 className="text-base font-bold text-text-heading flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                  1
                </span>
                Product Details
              </h3>

            </div>

            {/* Product Name & Product Code / SKU */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-8">
                <Input
                  label="Product Name *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Handmade Ceramic Flower Pot"
                />
              </div>
              <div className="md:col-span-4">
                <Input
                  label="Product Code / SKU"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g. SKU-POT-101"
                />
              </div>
            </div>

            {/* Category & Subcategory Multi-Select with Searchability */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-text">
                  Category * <span className="text-xs text-text-muted">(Multi-select & Searchable)</span>
                </label>
                <SearchableMultiSelect
                  selectedValues={categoryIds}
                  onChange={setCategoryIds}
                  options={categoryFormOptions}
                  placeholder="Select one or more categories..."
                  searchPlaceholder="Search categories..."
                  itemNoun="category"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-text">
                  Subcategory <span className="text-xs text-text-muted">(Multi-select & Searchable)</span>
                </label>
                <SearchableMultiSelect
                  selectedValues={subcategoryIds}
                  onChange={setSubcategoryIds}
                  options={subcategoryFormOptions}
                  placeholder={categoryIds.length > 0 ? "Select subcategories..." : "Select categories first..."}
                  searchPlaceholder="Search subcategories..."
                  itemNoun="subcategory"
                />
              </div>
            </div>

            {/* Brand & Product Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Artisans Clay, Pillipot Crafts"
              />
              <Select
                label="Product Type"
                options={PRODUCT_TYPE_OPTIONS}
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
              />
            </div>

            {/* Short Description */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-text">
                Short Description <span className="text-xs text-text-muted">(Brief overview for cards & previews)</span>
              </label>
              <textarea
                rows={2}
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="Brief summary of the product..."
                className="w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Detailed Description */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-text">
                Detailed Description <span className="text-xs text-text-muted">(Rich text with formatting)</span>
              </label>
              <RichTextEditor
                key={editingId || "new-vendor-product"}
                value={description}
                onChange={setDescription}
                placeholder="Product details, features, care instructions, bullet points..."
              />
            </div>

            {/* Product Dimensions & Weight Grid */}
            <div>
              <label className="text-sm font-medium text-text block mb-2">
                Product Weight & Dimensions
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Input
                  label="Product Weight"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="e.g. 500g, 1.2kg"
                />
                <Input
                  label="Length"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  placeholder="e.g. 15 cm"
                />
                <Input
                  label="Width"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  placeholder="e.g. 10 cm"
                />
                <Input
                  label="Height"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="e.g. 20 cm"
                />
              </div>
            </div>

            {/* Tags / Keywords */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-text">
                Tags / Keywords <span className="text-xs text-text-muted">(Press Enter or click Add)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Type tag (e.g. handmade, gift, ceramic) and press Enter..."
                  className="flex-1 rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <Button type="button" variant="secondary" onClick={() => handleAddTag()}>
                  Add Tag
                </Button>
              </div>

              {/* Tag Chips */}
              {selectedTags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary border border-primary/20"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => setSelectedTags((prev) => prev.filter((t) => t !== tag))}
                        className="hover:text-red-500 transition-colors cursor-pointer"
                        title="Remove tag"
                      >
                        <XMarkIcon className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-muted italic">No tags added yet.</p>
              )}

              {/* Tag Suggestions from allTags */}
              {allTags.length > 0 && (
                <div className="pt-1">
                  <p className="text-[11px] font-medium text-text-muted mb-1">Suggested Tags:</p>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
                    {allTags
                      .filter((t) => !selectedTags.includes(t.name.toLowerCase()))
                      .slice(0, 15)
                      .map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleAddTag(t.name)}
                          className="inline-flex items-center rounded-md bg-surface-muted px-2 py-0.5 text-[11px] text-text-muted hover:bg-primary/10 hover:text-primary border border-border transition-colors cursor-pointer"
                        >
                          +{t.name}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Media Upload & Drag-and-Drop Reordering Grid */}
            <div className="space-y-3 rounded-lg border border-border p-4 bg-surface-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <PhotoIcon className="h-5 w-5 text-primary" />
                    <p className="text-sm font-semibold text-text">Product Images & Video</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                      {mediaItems.length} / 4 items
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    <strong>Slot 1</strong> is the <span className="text-primary font-semibold">Primary Thumbnail</span> (Image only).
                    Slots 2–4 can be images or 1 video. Drag cards or use arrow buttons to rearrange.
                  </p>
                </div>

                {/* Upload Buttons */}
                <div className="flex items-center gap-2">
                  <label
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors shadow-sm ${mediaItems.length >= 4
                      ? "bg-surface-muted text-text-muted cursor-not-allowed border border-border"
                      : "bg-primary text-white hover:bg-primary/90"
                      }`}
                  >
                    <PhotoIcon className="h-4 w-4" />
                    <span>+ Add Images</span>
                    <input
                      type="file"
                      className="hidden"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      disabled={mediaItems.length >= 4}
                      onChange={(e) => {
                        handleAddImages(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>

                  <label
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors shadow-sm ${mediaItems.length >= 4 ||
                      mediaItems.some((m) => m.type === "video") ||
                      mediaItems.length === 0
                      ? "bg-surface-muted text-text-muted cursor-not-allowed border border-border"
                      : "bg-surface text-text hover:bg-surface-muted border border-border"
                      }`}
                    title={
                      mediaItems.length === 0
                        ? "Upload primary thumbnail image first"
                        : mediaItems.some((m) => m.type === "video")
                          ? "Only 1 video allowed"
                          : "Upload a product video (MP4/MOV)"
                    }
                  >
                    <VideoCameraIcon className="h-4 w-4 text-purple-600" />
                    <span>+ Add Video</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="video/mp4,video/quicktime"
                      disabled={
                        mediaItems.length >= 4 ||
                        mediaItems.some((m) => m.type === "video") ||
                        mediaItems.length === 0
                      }
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        handleAddVideo(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* 4-Slots Visual Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                {[0, 1, 2, 3].map((slotIndex) => {
                  const item = mediaItems[slotIndex];
                  const isThumbSlot = slotIndex === 0;

                  if (item) {
                    return (
                      <div
                        key={item.id || slotIndex}
                        draggable
                        onDragStart={() => handleMediaDragStart(slotIndex)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverIndex(slotIndex);
                        }}
                        onDragLeave={() => setDragOverIndex(null)}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleMediaDrop(slotIndex);
                        }}
                        className={`group relative flex flex-col rounded-lg border bg-surface p-2 transition-all cursor-grab active:cursor-grabbing ${dragOverIndex === slotIndex
                          ? "border-primary ring-2 ring-primary/40 scale-[1.02]"
                          : isThumbSlot
                            ? "border-amber-400 bg-amber-500/5 shadow-sm"
                            : "border-border hover:border-text-muted hover:shadow"
                          }`}
                      >
                        {/* Slot Badge */}
                        <div className="flex items-center justify-between mb-1.5">
                          {isThumbSlot ? (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-500 text-white px-1.5 py-0.5 text-[10px] font-bold shadow-xs">
                              <StarIcon className="h-3 w-3" />
                              Primary Thumb
                            </span>
                          ) : (
                            <span className="rounded bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold text-text-muted border border-border">
                              Slot {slotIndex + 1}
                            </span>
                          )}

                          {/* Reorder Buttons (Left / Right) */}
                          <div className="flex items-center gap-0.5">
                            {slotIndex > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveMedia(slotIndex, "left");
                                }}
                                title="Move left"
                                className="rounded p-0.5 text-text-muted hover:bg-surface-muted hover:text-text cursor-pointer"
                              >
                                <ArrowLeftIcon className="h-3 w-3" />
                              </button>
                            )}
                            {slotIndex < mediaItems.length - 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveMedia(slotIndex, "right");
                                }}
                                title="Move right"
                                className="rounded p-0.5 text-text-muted hover:bg-surface-muted hover:text-text cursor-pointer"
                              >
                                <ArrowRightIcon className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Media Preview Box */}
                        <div className="relative aspect-square w-full overflow-hidden rounded-md bg-black/5 border border-border/80">
                          {item.type === "image" ? (
                            <img
                              src={item.url}
                              alt={`Slot ${slotIndex + 1}`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="relative h-full w-full bg-slate-900 flex items-center justify-center">
                              <video src={item.url} className="h-full w-full object-cover" />
                              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                <VideoCameraIcon className="h-8 w-8 text-white/90 drop-shadow" />
                              </div>
                              <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-[9px] font-bold text-white">
                                VIDEO
                              </span>
                            </div>
                          )}

                          {/* Delete Item Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveMedia(slotIndex);
                            }}
                            className="absolute top-1 right-1 rounded-full bg-error p-1 text-white shadow-md hover:bg-error/90 transition-opacity cursor-pointer"
                            title="Remove media"
                          >
                            <XMarkIcon className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Drag instruction tip */}
                        <div className="mt-1 text-center text-[10px] text-text-muted flex items-center justify-center gap-1">
                          <span className="text-xs">⠿</span> Drag to reorder
                        </div>
                      </div>
                    );
                  }

                  // Empty Slot
                  return (
                    <div
                      key={`empty-${slotIndex}`}
                      className={`flex flex-col items-center justify-center aspect-square rounded-lg border-2 border-dashed p-3 text-center transition-colors ${isThumbSlot
                        ? "border-amber-400/60 bg-amber-500/5"
                        : "border-border bg-surface-muted/30"
                        }`}
                    >
                      {isThumbSlot ? (
                        <>
                          <StarIcon className="h-6 w-6 text-amber-500 mb-1" />
                          <p className="text-xs font-bold text-text-heading">Slot 1: Thumb</p>
                          <p className="text-[10px] text-text-muted mt-0.5">Primary Cover (Image only)</p>
                        </>
                      ) : (
                        <>
                          <PhotoIcon className="h-6 w-6 text-text-muted mb-1" />
                          <p className="text-xs font-semibold text-text-muted">Slot {slotIndex + 1}</p>
                          <p className="text-[10px] text-text-muted mt-0.5">Image or Video</p>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SECTION 2: PRICING & INVENTORY */}
          <div className="space-y-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
            <div className="border-b border-border pb-3">
              <h3 className="text-base font-bold text-text-heading flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                  2
                </span>
                Pricing & Specifications
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Set cost, customer prices, inventory, size/color, and preparation fulfillment days.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Input
                label="Buying price (₹)"
                type="number"
                value={buyingPrice}
                onChange={(e) => setBuyingPrice(e.target.value)}
                placeholder="Cost to you"
              />
              <Input
                label="Selling price (₹) *"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Price for customers"
              />
              <Input
                label="Actual price (MRP) (₹)"
                type="number"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                placeholder="Original price before discount"
              />
              <Input
                label="Stock quantity"
                type="number"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                placeholder="Available stock"
              />
              <Input
                label="Size"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="e.g. Medium, 1kg"
              />
              <Input
                label="Color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="e.g. Red, Blue"
              />
            </div>
          </div>

          {/* SECTION 3: PRODUCT CUSTOMIZATION */}
          <div className="space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-text-heading flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">
                    3
                  </span>
                  Product Customization & Lead Time
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Set preparation days and allow customers to personalize this product before buying.
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
                <span className="text-sm font-semibold text-text">Enable Customization</span>
              </label>
            </div>

            {/* Preparation Days inside customization box */}
            <div className="rounded-lg border border-primary/20 bg-surface p-3.5 space-y-1">
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

            {isCustomizable && (
              <div className="space-y-3 pt-3 border-t border-primary/20">
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
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${allowPhotoUpload
                      ? "border-primary bg-primary/10 shadow-xs"
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
                      <span className="block text-sm font-semibold text-text">Image Upload</span>
                      <span className="block text-[11px] text-text-muted">
                        Allow customer to upload photos / designs to customize
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${allowTextInput
                      ? "border-primary bg-primary/10 shadow-xs"
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
                      <span className="block text-sm font-semibold text-text">Custom Text</span>
                      <span className="block text-[11px] text-text-muted">
                        Allow customer to enter custom text, wishes or names
                      </span>
                    </div>
                  </label>
                </div>

                {!allowPhotoUpload && !allowTextInput && (
                  <div className="rounded-lg bg-error/10 border border-error/30 p-2.5 text-xs font-medium text-error flex items-center gap-1.5">
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
