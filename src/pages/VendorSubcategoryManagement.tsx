import { memo, useState, useCallback, useMemo } from "react";
import { PencilIcon } from "@heroicons/react/24/outline";
import {
  Card,
  CardHeader,
  Button,
  Table,
  Modal,
  Input,
  Select
} from "../components/ui";
import {
  useGetVendorPortalCategoriesQuery,
  useCreateVendorPortalSubcategoryMutation,
  useUpdateVendorPortalSubcategoryMutation
} from "../store/api/edenApi";
import { toast } from "../lib/toast";
import type { Category, Subcategory } from "../types";

function VendorSubcategoryManagement() {
  const { data: categories = [], isLoading } = useGetVendorPortalCategoriesQuery();
  const [createSubcategory] = useCreateVendorPortalSubcategoryMutation();
  const [updateSubcategory] = useUpdateVendorPortalSubcategoryMutation();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const subcategories = useMemo(() => {
    return (categories as (Category & { subcategories?: Subcategory[] })[])
      .flatMap(c => (c.subcategories || []).map(s => ({ ...s, categoryName: c.name })));
  }, [categories]);

  const handleSave = useCallback(async () => {
    if (!categoryId) {
      toast.error("Please select a category");
      return;
    }
    if (!name.trim()) {
      toast.error("Subcategory name is required");
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        await updateSubcategory({
          id: editingId,
          categoryId,
          name: name.trim(),
          description: description.trim()
        }).unwrap();
        toast.success("Subcategory updated");
      } else {
        await createSubcategory({
          categoryId,
          name: name.trim(),
          description: description.trim()
        }).unwrap();
        toast.success("Subcategory created");
      }
      setModalOpen(false);
      setEditingId(null);
      setName("");
      setDescription("");
      setCategoryId("");
    } catch (err) {
      toast.fromError(err, editingId ? "Failed to update subcategory" : "Failed to create subcategory");
    } finally {
      setSubmitting(false);
    }
  }, [editingId, categoryId, name, description, createSubcategory, updateSubcategory]);

  const openEdit = useCallback((sub: any) => {
    setEditingId(sub.id);
    setCategoryId(sub.categoryId);
    setName(sub.name);
    setDescription(sub.description || "");
    setModalOpen(true);
  }, []);

  const openAdd = useCallback(() => {
    setEditingId(null);
    setCategoryId("");
    setName("");
    setDescription("");
    setModalOpen(true);
  }, []);

  const columns = useMemo(() => [
    { key: "name", header: "Subcategory Name" },
    { key: "category", header: "Parent Category", render: (row: any) => row.categoryName },
    { key: "description", header: "Description", render: (row: Subcategory) => row.description || "—" },
    { key: "status", header: "Status", render: () => <span className="text-xs bg-success/10 text-success px-2 py-1 rounded">Active</span> },
    {
      key: "actions",
      header: "",
      render: (row: any) => (
        <div className="flex items-center gap-1">
          {row.isOwner && (
            <button
              type="button"
              onClick={() => openEdit(row)}
              className="rounded-[var(--radius-md)] p-2 text-text-muted hover:bg-primary-muted hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              title="Edit subcategory"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ], [openEdit]);

  const categoryOptions = useMemo(() => [
    { value: "", label: "Select parent category..." },
    ...categories.map(c => ({ value: c.id, label: c.name }))
  ], [categories]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Product Subcategories"
          subtitle="Manage specific sub-types for your products"
          action={<Button onClick={openAdd}>Add Subcategory</Button>}
        />
        <Table
          isLoading={isLoading}
          columns={columns}
          data={subcategories}
          keyExtractor={(s) => s.id}
          emptyMessage="No subcategories found."
        />
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Subcategory" : "Add New Subcategory"}
      >
        <div className="space-y-4">
          <Select
            label="Parent Category *"
            options={categoryOptions}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          />
          <Input
            label="Subcategory Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Leather Wallets"
          />
          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional details"
          />
          <div className="pt-2 flex gap-2">
            <Button onClick={handleSave} disabled={submitting}>{submitting ? "Saving..." : editingId ? "Save Changes" : "Create Subcategory"}</Button>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default memo(VendorSubcategoryManagement);
