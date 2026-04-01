import { memo, useState, useCallback, useMemo, useEffect } from "react";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { selectProducts, createProduct, updateProduct, deleteProduct } from "../store/productsSlice";
import { selectCategories, fetchCategories } from "../store/categoriesSlice";
import {
  Badge,
  Card,
  CardHeader,
  Button,
  Table,
  Modal,
  Input,
  Tooltip,
  Select,
  ManagementFilterPanel,
  ManagementFilterField,
} from "../components/ui";
import type { SelectOption } from "../components/ui/Select";
import { toast } from "../lib/toast";
import type { Product } from "../types";

const UNCATEGORIZED_FILTER = "__none__";

function ProductManagementPage() {
  const dispatch = useAppDispatch();
  const products = useAppSelector(selectProducts);
  const categories = useAppSelector(selectCategories);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [buyingPrice, setBuyingPrice] = useState("");
  const [price, setPrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  useEffect(() => {
    void dispatch(fetchCategories());
  }, [dispatch]);

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
    setBuyingPrice("");
    setPrice("");
    setStockQuantity("");
    setSize("");
    setColor("");
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((p: Product) => {
    setEditingId(p.id);
    setName(p.name);
    setCategoryId(p.categoryId ?? "");
    setBuyingPrice(
      p.buyingPrice != null ? String(p.buyingPrice) : ""
    );
    setPrice(String(p.price ?? 0));
    setStockQuantity(String(p.stockQuantity ?? 0));
    setSize(p.size ?? "");
    setColor(p.color ?? "");
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
    try {
      if (editingId) {
        await dispatch(
          updateProduct({
            id: editingId,
            patch: {
              name: name.trim(),
              categoryId,
              price: priceNum,
              buyingPrice: buyingNum,
              stockQuantity: stockNum,
              size: size.trim() || undefined,
              color: color.trim() || undefined,
            },
          })
        ).unwrap();
        toast.success("Product updated");
      } else {
        await dispatch(
          createProduct({
            name: name.trim(),
            categoryId,
            price: priceNum,
            buyingPrice: buyingNum,
            stockQuantity: stockNum,
            size: size.trim() || undefined,
            color: color.trim() || undefined,
          })
        ).unwrap();
        toast.success("Product created");
      }
      setModalOpen(false);
    } catch (err) {
      toast.fromError(err, "Failed to save product");
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
    dispatch,
  ]);

  const toggleProductActive = useCallback(
    async (p: Product, next: boolean) => {
      try {
        await dispatch(
          updateProduct({ id: p.id, patch: { isActive: next } }),
        ).unwrap();
        toast.success(next ? "Product is active" : "Product hidden from staff");
      } catch (err) {
        toast.fromError(err, "Failed to update product");
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
        render: (row: Product) => row.categoryName ?? "—",
      },
      { key: "name", header: "Name" },
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
          return (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={active ? "success" : "muted"}>
                {active ? "Active" : "Inactive"}
              </Badge>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void toggleProductActive(row, !active)}
              >
                {active ? "Deactivate" : "Activate"}
              </Button>
            </div>
          );
        },
      },
      {
        key: "actions",
        header: "",
        mobileHeaderEnd: true,
        render: (row: Product) => (
          <div className="flex items-center gap-1">
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
    [openEdit, handleDelete, toggleProductActive]
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
          <Select
            label="Category *"
            options={categoryOptions}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            placeholder="Choose a category"
          />
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
          {editingId && (
            <p className="text-xs text-text-muted">
              Product ID and SKU are assigned automatically and can be adjusted later via API if needed.
            </p>
          )}
          <div className="flex gap-2">
            <Button onClick={handleSave}>Save</Button>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default memo(ProductManagementPage);
