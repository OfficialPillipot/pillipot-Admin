import { memo, useState, useCallback, useMemo, useEffect } from "react";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  selectStaffPositions,
  fetchStaffPositions,
  createStaffPosition,
  updateStaffPosition,
  deleteStaffPosition,
} from "../store/staffPositionsSlice";
import { Card, CardHeader, Button, Table, Modal, Input, Tooltip } from "../components/ui";
import { toast } from "../lib/toast";
import type { StaffPosition } from "../types";

function StaffRoleManagementPage() {
  const dispatch = useAppDispatch();
  const positions = useAppSelector(selectStaffPositions);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    void dispatch(fetchStaffPositions());
  }, [dispatch]);

  const openAdd = useCallback(() => {
    setEditingId(null);
    setName("");
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((p: StaffPosition) => {
    setEditingId(p.id);
    setName(p.name);
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
          updateStaffPosition({ id: editingId, name: name.trim() })
        ).unwrap();
        toast.success("Role updated");
      } else {
        await dispatch(
          createStaffPosition({ name: name.trim() })
        ).unwrap();
        toast.success("Role created");
      }
      setModalOpen(false);
    } catch {
      toast.error("Failed to save role");
    }
  }, [editingId, name, dispatch]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm("Delete this role? It must not be assigned to any staff.")) return;
      try {
        await dispatch(deleteStaffPosition(id)).unwrap();
        if (editingId === id) setModalOpen(false);
        toast.success("Role deleted");
      } catch {
        toast.error("Cannot delete — reassign staff first");
      }
    },
    [dispatch, editingId]
  );

  const columns = useMemo(
    () => [
      { key: "name", header: "Role name" },
      {
        key: "slug",
        header: "Slug",
        render: (row: StaffPosition) => (
          <code className="text-xs text-text-muted">{row.slug}</code>
        ),
      },
      {
        key: "actions",
        header: "",
        render: (row: StaffPosition) => (
          <div className="flex items-center gap-1">
            <Tooltip content="Edit" side="top">
              <button
                type="button"
                onClick={() => openEdit(row)}
                className="rounded p-1.5 text-primary hover:bg-primary-muted"
                aria-label={`Edit ${row.name}`}
              >
                <PencilIcon className="h-5 w-5" />
              </button>
            </Tooltip>
            <Tooltip content="Delete" side="top">
              <button
                type="button"
                onClick={() => void handleDelete(row.id)}
                className="rounded p-1.5 text-error hover:bg-error/10"
                aria-label={`Delete ${row.name}`}
              >
                <TrashIcon className="h-5 w-5" />
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
          title="Role management"
          subtitle="Define roles (e.g. Sales, Packing). Staff accounts must pick one of these when created or edited."
          action={
            <Button type="button" onClick={openAdd}>
              Add role
            </Button>
          }
        />
        <Table
          columns={columns}
          data={positions}
          keyExtractor={(r) => r.id}
          emptyMessage="No roles yet."
        />
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit role" : "Add role"}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Role name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Field sales"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void handleSave()}>
              Save
            </Button>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default memo(StaffRoleManagementPage);
