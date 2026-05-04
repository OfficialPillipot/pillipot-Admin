import { useState, useCallback, useMemo, useEffect, useDeferredValue } from "react";
import { useNavigate } from "react-router";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Card, CardHeader, Button, Table, Modal, Input, Tooltip } from "../components/ui";
import { toast } from "../lib/toast";
import { useGetTagsQuery, useCreateTagMutation, useUpdateTagMutation, useDeleteTagMutation } from "../store/api/edenApi";

export default function TagManagementPage() {
  const { data: tags = [], isLoading } = useGetTagsQuery();
  const [createTag] = useCreateTagMutation();
  const [updateTag] = useUpdateTagMutation();
  const [deleteTag] = useDeleteTagMutation();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const deferredSearch = useDeferredValue(searchQuery);

  useEffect(() => {
    if (!modalOpen) {
      setEditingId(null);
      setName("");
    }
  }, [modalOpen]);

  const openAdd = useCallback(() => {
    setEditingId(null);
    setName("");
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((t: { id: string; name: string }) => {
    setEditingId(t.id);
    setName(t.name);
    setModalOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!name.trim()) return toast.error("Name is required");
    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateTag({ id: editingId, patch: { name: name.trim() } }).unwrap();
        toast.success("Tag updated");
      } else {
        await createTag({ name: name.trim() }).unwrap();
        toast.success("Tag created");
      }
      setModalOpen(false);
    } catch (err) {
      toast.fromError(err, "Failed to save tag");
    } finally {
      setIsSubmitting(false);
    }
  }, [editingId, name, createTag, updateTag]);

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm("Delete this tag?")) return;
    try {
      await deleteTag(id).unwrap();
      toast.success("Tag deleted");
    } catch (err) {
      toast.fromError(err, "Failed to delete tag");
    }
  }, [deleteTag]);

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return tags;
    return tags.filter((t: { name: string }) => t.name.toLowerCase().includes(q));
  }, [tags, deferredSearch]);

  const navigate = useNavigate();

  const columns = useMemo(() => [
    { key: "name", header: "Name", render: (r: any) => r.name },
    { key: "actions", header: "", render: (r: any) => (
      <div className="flex items-center gap-1">
        <Tooltip content="Add product"><button onClick={() => navigate(`/admin/products?tag=${encodeURIComponent(r.name)}`)} className="p-2 text-text-muted hover:bg-primary-muted rounded">+</button></Tooltip>
        <Tooltip content="Edit"><button onClick={() => openEdit(r)} className="p-2 text-text-muted hover:bg-primary-muted rounded"><PencilIcon className="h-4 w-4" /></button></Tooltip>
        <Tooltip content="Delete"><button onClick={() => handleDelete(r.id)} className="p-2 text-text-muted hover:bg-error-bg rounded"><TrashIcon className="h-4 w-4" /></button></Tooltip>
      </div>
    )}
  ], [openEdit, handleDelete]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Tag Management" action={<Button onClick={openAdd}>Add tag</Button>} />
        <div className="mb-4 p-4">
          <Input label="" placeholder="Search tags..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="p-4">
          <Table columns={columns} data={filtered} keyExtractor={(t: any) => t.id} emptyMessage={isLoading ? "Loading tags..." : "No tags found."} />
        </div>
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit tag" : "Add tag"}>
        <div className="space-y-4">
          <Input label="Name *" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. sale" />
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Save"}</Button>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
