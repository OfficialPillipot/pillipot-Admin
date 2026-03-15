import { memo, useState, useCallback, useMemo } from "react";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { selectProducts, createProduct, updateProduct, deleteProduct } from "../store/productsSlice";
import { Card, CardHeader, Button, Table, Modal, Input, Tooltip } from "../components/ui";
import { toast } from "../lib/toast";
import type { Product } from "../types";

function ProductManagementPage() {
  const dispatch = useAppDispatch();
  const products = useAppSelector(selectProducts);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");

  const openAdd = useCallback(() => {
    setEditingId(null);
    setName("");
    setSku("");
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((p: Product) => {
    setEditingId(p.id);
    setName(p.name);
    setSku(p.sku ?? "");
    setModalOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!name.trim()) return;
    try {
      if (editingId) {
        await dispatch(
          updateProduct({ id: editingId, patch: { name: name.trim(), sku: sku.trim() || undefined } })
        ).unwrap();
        toast.success("Product updated");
      } else {
        await dispatch(createProduct({ name: name.trim(), sku: sku.trim() || undefined })).unwrap();
        toast.success("Product created");
      }
      setModalOpen(false);
    } catch {
      toast.error("Failed to save product");
    }
  }, [editingId, name, sku, dispatch]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm("Remove this product? It will disappear from dropdowns.")) return;
      try {
        await dispatch(deleteProduct(id)).unwrap();
        if (editingId === id) setModalOpen(false);
        toast.success("Product deleted");
      } catch {
        toast.error("Failed to delete product");
      }
    },
    [dispatch, editingId]
  );

  const columns = useMemo(
    () => [
      { key: "name", header: "Product Name" },
      { key: "sku", header: "SKU", render: (row: Product) => row.sku ?? "—" },
      {
        key: "actions",
        header: "",
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
    [openEdit, handleDelete]
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Product Management"
          subtitle="Products appear in the staff order creation dropdown."
          action={
            <Button onClick={openAdd}>Add Product</Button>
          }
        />
        <Table
          columns={columns}
          data={products}
          keyExtractor={(p) => p.id}
          emptyMessage="No products. Add one to show in order form."
        />
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Product" : "Add Product"}
      >
        <div className="space-y-4">
          <Input
            label="Product Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Organic Honey 500g"
          />
          <Input
            label="SKU (optional)"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="e.g. SKU-H001"
          />
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
