import { memo, useState, useCallback, useMemo, useEffect } from "react";
import { PencilIcon, TrashIcon, EyeIcon } from "@heroicons/react/24/outline";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  selectSubcategories,
  fetchSubcategories,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
} from "../store/subcategoriesSlice";
import { selectCategories, fetchCategories } from "../store/categoriesSlice";
import { fetchProducts, selectProducts } from "../store/productsSlice";
import { Card, CardHeader, Button, Table, Modal, Input, Tooltip, Select } from "../components/ui";
import { toast } from "../lib/toast";
import type { Subcategory, Category } from "../types";

function SubcategoryManagementPage() {
  const dispatch = useAppDispatch();
  const subcategories = useAppSelector(selectSubcategories);
  const categories = useAppSelector(selectCategories);
  const products = useAppSelector(selectProducts);

  const productCountBySubcategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of products) {
      if (!p.subcategoryId) continue;
      m.set(p.subcategoryId, (m.get(p.subcategoryId) ?? 0) + 1);
    }
    return m;
  }, [products]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingSubcategory, setViewingSubcategory] = useState<Subcategory | null>(null);

  const filteredSubcategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return subcategories;
    return subcategories.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description || "").toLowerCase().includes(q) ||
        (s.category?.name || "").toLowerCase().includes(q)
    );
  }, [subcategories, searchQuery]);

  useEffect(() => {
    void dispatch(fetchSubcategories());
    void dispatch(fetchCategories());
    void dispatch(fetchProducts());
  }, [dispatch]);

  const openAdd = useCallback(() => {
    setEditingId(null);
    setName("");
    setDescription("");
    setCategoryId(categories[0]?.id || "");
    setModalOpen(true);
  }, [categories]);

  const openEdit = useCallback((s: Subcategory) => {
    setEditingId(s.id);
    setName(s.name);
    setDescription(s.description ?? "");
    setCategoryId(s.categoryId);
    setModalOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!categoryId) {
      toast.error("Category is required");
      return;
    }
    setIsSubmitting(true);
    try {
      if (editingId) {
        await dispatch(
          updateSubcategory({
            id: editingId,
            patch: {
              name: name.trim(),
              description: description.trim() || undefined,
              categoryId,
            },
          })
        ).unwrap();
        toast.success("Subcategory updated");
      } else {
        await dispatch(
          createSubcategory({
            name: name.trim(),
            description: description.trim() || undefined,
            categoryId,
          })
        ).unwrap();
        toast.success("Subcategory created");
      }
      setModalOpen(false);
    } catch (err) {
      toast.fromError(err, "Failed to save subcategory");
    } finally {
      setIsSubmitting(false);
    }
  }, [editingId, name, description, categoryId, dispatch]);

  const handleDelete = useCallback(
    async (id: string) => {
      const n = productCountBySubcategory.get(id) ?? 0;
      if (n > 0) {
          toast.error(`Cannot delete: ${n} product(s) use this subcategory.`);
          return;
      }
      if (!window.confirm("Delete this subcategory?")) return;
      try {
        await dispatch(deleteSubcategory(id)).unwrap();
        toast.success("Subcategory deleted");
      } catch (err) {
        toast.fromError(err, "Failed to delete subcategory");
      }
    },
    [dispatch, productCountBySubcategory]
  );

  const columns = useMemo(
    () => [
      { key: "name", header: "Name" },
      {
        key: "category",
        header: "Parent Category",
        render: (row: Subcategory) => row.category?.name || "—",
      },
      {
        key: "description",
        header: "Description",
        render: (row: Subcategory) => row.description?.trim() || "—",
      },
      {
        key: "actions",
        header: "",
        render: (row: Subcategory) => {
          const inUse = (productCountBySubcategory.get(row.id) ?? 0) > 0;
          return (
            <div className="flex items-center gap-1">
              <Tooltip content="Edit" side="top">
                <button
                  type="button"
                  onClick={() => openEdit(row)}
                  className="rounded-[var(--radius-md)] p-2 text-text-muted hover:bg-primary-muted hover:text-primary"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
              </Tooltip>
              <Tooltip content={inUse ? "In use" : "Delete"} side="top">
                <button
                  type="button"
                  disabled={inUse}
                  onClick={() => void handleDelete(row.id)}
                  className="rounded-[var(--radius-md)] p-2 text-text-muted hover:bg-error-bg hover:text-error disabled:opacity-40"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </Tooltip>
            </div>
          );
        },
      },
    ],
    [openEdit, handleDelete, productCountBySubcategory]
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Subcategory Management"
          action={<Button onClick={openAdd}>Add subcategory</Button>}
        />
        <div className="mb-4">
          <Input
            label=""
            placeholder="Search subcategories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Table
          columns={columns}
          data={filteredSubcategories}
          keyExtractor={(s) => s.id}
          emptyMessage="No subcategories found."
        />
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit subcategory" : "Add subcategory"}
      >
        <div className="space-y-4">
          <Select
            label="Parent Category *"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            options={categories.map((c) => ({ label: c.name, value: c.id }))}
          />
          <Input
            label="Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Cold Coffee"
          />
          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional notes"
          />

          <div className="flex gap-2 pt-2">
            <Button onClick={() => void handleSave()} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default memo(SubcategoryManagementPage);
