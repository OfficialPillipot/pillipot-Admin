import { memo, useState, useCallback, useMemo, useEffect } from "react";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  selectCategories,
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../store/categoriesSlice";
import { fetchProducts, selectProducts } from "../store/productsSlice";
import { Card, CardHeader, Button, Table, Modal, Input, Tooltip } from "../components/ui";
import { toast } from "../lib/toast";
import type { Category } from "../types";

function CategoryManagementPage() {
  const dispatch = useAppDispatch();
  const categories = useAppSelector(selectCategories);
  const products = useAppSelector(selectProducts);

  const productCountByCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of products) {
      if (!p.categoryId) continue;
      m.set(p.categoryId, (m.get(p.categoryId) ?? 0) + 1);
    }
    return m;
  }, [products]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    void dispatch(fetchCategories());
    void dispatch(fetchProducts());
  }, [dispatch]);

  const openAdd = useCallback(() => {
    setEditingId(null);
    setName("");
    setDescription("");
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((c: Category) => {
    setEditingId(c.id);
    setName(c.name);
    setDescription(c.description ?? "");
    setModalOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      if (editingId) {
        await dispatch(
          updateCategory({
            id: editingId,
            patch: {
              name: name.trim(),
              description: description.trim() || undefined,
            },
          })
        ).unwrap();
        toast.success("Category updated");
      } else {
        await dispatch(
          createCategory({
            name: name.trim(),
            description: description.trim() || undefined,
          })
        ).unwrap();
        toast.success("Category created");
      }
      setModalOpen(false);
    } catch (err) {
      toast.fromError(err, "Failed to save category");
    }
  }, [editingId, name, description, dispatch]);

  const handleDelete = useCallback(
    async (id: string) => {
      const n = productCountByCategory.get(id) ?? 0;
      if (n > 0) return;
      if (!window.confirm("Delete this category? It must have no products assigned.")) return;
      try {
        await dispatch(deleteCategory(id)).unwrap();
        if (editingId === id) setModalOpen(false);
        toast.success("Category deleted");
      } catch (err) {
        toast.fromError(err, "Cannot delete — remove or reassign products first");
      }
    },
    [dispatch, editingId, productCountByCategory]
  );

  const columns = useMemo(
    () => [
      { key: "name", header: "Name" },
      {
        key: "description",
        header: "Description",
        render: (row: Category) => row.description?.trim() || "—",
      },
      {
        key: "actions",
        header: "",
        render: (row: Category) => {
          const inUse = (productCountByCategory.get(row.id) ?? 0) > 0;
          const count = productCountByCategory.get(row.id) ?? 0;
          const deleteTip = inUse
            ? `Cannot delete: ${count} product(s) use this category. Reassign them in Product Management first.`
            : "Delete category";
          return (
            <div className="flex items-center gap-1">
              <Tooltip content="Edit" side="top">
                <button
                  type="button"
                  onClick={() => openEdit(row)}
                  className="rounded-[var(--radius-md)] p-2 text-text-muted hover:bg-primary-muted hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label="Edit category"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
              </Tooltip>
              <Tooltip content={deleteTip} side="top">
                <span
                  className={
                    inUse ? "inline-flex cursor-not-allowed rounded-[var(--radius-md)]" : "inline-flex"
                  }
                >
                  <button
                    type="button"
                    disabled={inUse}
                    onClick={() => void handleDelete(row.id)}
                    className="rounded-[var(--radius-md)] p-2 text-text-muted hover:bg-error-bg hover:text-error focus:outline-none focus:ring-2 focus:ring-error disabled:opacity-40 disabled:hover:bg-transparent"
                    aria-label={inUse ? "Cannot delete category in use" : "Delete category"}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </span>
              </Tooltip>
            </div>
          );
        },
      },
    ],
    [openEdit, handleDelete, productCountByCategory]
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Category Management"
          // subtitle="Create categories here first, then assign products to them in Product Management."
          action={<Button onClick={openAdd}>Add category</Button>}
        />
        <Table
          columns={columns}
          data={categories}
          keyExtractor={(c) => c.id}
          emptyMessage="No categories yet. Add one before creating products."
        />
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit category" : "Add category"}
      >
        <div className="space-y-4">
          <Input
            label="Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Beverages"
          />
          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional notes"
          />
          <div className="flex gap-2">
            <Button onClick={() => void handleSave()}>Save</Button>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default memo(CategoryManagementPage);
