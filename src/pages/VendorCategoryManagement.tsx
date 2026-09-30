import { memo, useState, useCallback, useMemo, useEffect } from "react";
import { XMarkIcon, PencilIcon } from "@heroicons/react/24/outline";
import { 
  Card, 
  CardHeader, 
  Button, 
  Table, 
  TablePagination,
  Modal, 
  Input 
} from "../components/ui";
import { 
  useGetVendorPortalCategoriesQuery, 
  useCreateVendorPortalCategoryMutation,
  useUpdateVendorPortalCategoryMutation
} from "../store/api/edenApi";
import { toast } from "../lib/toast";
import type { Category } from "../types";

function VendorCategoryManagement() {
  const { data: categories = [], isLoading } = useGetVendorPortalCategoriesQuery();
  const [createCategory] = useCreateVendorPortalCategoryMutation();
  const [updateCategory] = useUpdateVendorPortalCategoryMutation();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Pagination state (default: 10 items)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Checkbox selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      toast.error("Category name is required");
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      if (description.trim()) formData.append("description", description.trim());
      if (imageFile) formData.append("image", imageFile);

      if (editingId) {
        await updateCategory({ id: editingId, formData }).unwrap();
        toast.success("Category updated successfully");
      } else {
        await createCategory(formData).unwrap();
        toast.success("Category created and submitted for approval");
      }
      setModalOpen(false);
      setEditingId(null);
      setName("");
      setDescription("");
      setImageFile(null);
    } catch (err) {
      toast.fromError(err, editingId ? "Failed to update category" : "Failed to create category");
    } finally {
      setSubmitting(false);
    }
  }, [name, description, imageFile, editingId, createCategory, updateCategory]);

  const openEdit = useCallback((c: Category) => {
    setEditingId(c.id);
    setName(c.name);
    setDescription(c.description || "");
    setImageFile(null);
    setModalOpen(true);
  }, []);

  const openAdd = useCallback(() => {
    setEditingId(null);
    setName("");
    setDescription("");
    setImageFile(null);
    setModalOpen(true);
  }, []);

  const paginatedCategories = useMemo(
    () => categories.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [categories, currentPage, pageSize]
  );

  const allOnPageSelected = paginatedCategories.length > 0 && paginatedCategories.every((c) => selectedIds.has(c.id));
  const isIndeterminate = selectedIds.size > 0 && !allOnPageSelected;

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        paginatedCategories.forEach((c) => next.delete(c.id));
      } else {
        paginatedCategories.forEach((c) => next.add(c.id));
      }
      return next;
    });
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
          aria-label="Select all categories on page"
        />
      ),
      className: "w-10 px-3 text-center",
      mobileHeaderStart: true,
      render: (row: Category) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.id)}
          onChange={() => toggleSelectRow(row.id)}
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer accent-primary"
          aria-label={`Select category ${row.name}`}
        />
      ),
    },
    {
      key: "imageUrl",
      header: "Image",
      render: (row: Category) =>
        row.imageUrl ? (
          <img
            src={row.imageUrl}
            alt=""
            className="h-10 w-10 rounded object-cover border border-border shadow-sm"
          />
        ) : (
          "—"
        ),
    },
    { key: "name", header: "Category Name" },
    { key: "description", header: "Description", render: (row: Category) => row.description || "—" },
    { key: "slug", header: "Slug", render: (row: Category) => row.slug || "—" },
    { key: "status", header: "Status", render: () => <span className="text-xs bg-success/10 text-success px-2 py-1 rounded">Active</span> },
    {
      key: "actions",
      header: "",
      render: (row: Category) => (
        <div className="flex items-center gap-1">
          {row.isOwner && (
            <button
              type="button"
              onClick={() => openEdit(row)}
              className="rounded-[var(--radius-md)] p-2 text-text-muted hover:bg-primary-muted hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              title="Edit category"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ], [
    openEdit,
    allOnPageSelected,
    isIndeterminate,
    selectedIds,
    paginatedCategories,
  ]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader 
          action={<Button onClick={openAdd}>Add Category</Button>} 
        />
        <Table
          isLoading={isLoading}
          columns={columns}
          data={paginatedCategories}
          keyExtractor={(c) => c.id}
          emptyMessage="No categories found."
        />

        <TablePagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={categories.length}
          totalPages={Math.max(1, Math.ceil(categories.length / pageSize))}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          pageSizeOptions={[10, 20, 50, 80, 100]}
          itemLabel="categories"
          disabled={isLoading}
        />
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Category" : "Add New Category"}
      >
        <div className="space-y-4">
          <Input label="Category Name *" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Handmade Crafts" />
          <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of the category" />
          
          <div className="space-y-3 rounded-[var(--radius-md)] border border-border bg-surface-muted/40 p-3">
            <p className="text-sm font-medium text-text">Category Image</p>

            {editingId && categories.find(c => c.id === editingId)?.imageUrl && (
              <div className="group relative w-fit mb-4">
                <img
                  src={categories.find(c => c.id === editingId)?.imageUrl!}
                  alt="Current"
                  className="h-20 w-20 rounded border border-border object-cover"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm("Delete this image permanently?")) return;
                    try {
                      const formData = new FormData();
                      formData.append("imageUrl", ""); // Send empty to trigger delete
                      await updateCategory({ id: editingId, formData }).unwrap();
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
            )}

            <div className="flex items-center gap-4">
              {imagePreviewUrl ? (
                <div className="group relative">
                  <img
                    src={imagePreviewUrl}
                    alt="Preview"
                    className="h-20 w-20 rounded border border-border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setImageFile(null)}
                    className="absolute -right-2 -top-2 rounded-full bg-error p-1 text-white shadow-lg"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed border-border bg-surface-muted/20 hover:bg-surface-muted/40 transition-colors">
                  <span className="text-lg font-bold text-primary">+</span>
                  <span className="text-[10px] text-text-muted">Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setImageFile(f);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
              {!imagePreviewUrl && (
                <p className="text-xs text-text-muted italic">
                  Upload an image for the {editingId ? "" : "new "}category
                </p>
              )}
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <Button onClick={handleSave} disabled={submitting}>{submitting ? "Saving..." : editingId ? "Save Changes" : "Create Category"}</Button>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default memo(VendorCategoryManagement);
