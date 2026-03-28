import { memo, useState, useCallback, useMemo, useEffect } from "react";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  selectAssignedNumbers,
  fetchAssignedNumbers,
  createAssignedNumber,
  updateAssignedNumber,
  deleteAssignedNumber,
} from "../store/assignedNumbersSlice";
import { Card, CardHeader, Button, Table, Modal, Input, Tooltip } from "../components/ui";
import { toast } from "../lib/toast";
import type { AssignedNumber } from "../types";

function AssignedNumbersManagementPage() {
  const dispatch = useAppDispatch();
  const numbers = useAppSelector(selectAssignedNumbers);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [numberVal, setNumberVal] = useState("");

  useEffect(() => {
    void dispatch(fetchAssignedNumbers());
  }, [dispatch]);

  const openAdd = useCallback(() => {
    setEditingId(null);
    setNumberVal("");
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((n: AssignedNumber) => {
    setEditingId(n.id);
    setNumberVal(n.number);
    setModalOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    const v = numberVal.trim();
    if (!v) {
      toast.error("Number is required");
      return;
    }
    try {
      if (editingId) {
        await dispatch(
          updateAssignedNumber({ id: editingId, number: v })
        ).unwrap();
        toast.success("Number updated");
      } else {
        await dispatch(createAssignedNumber({ number: v })).unwrap();
        toast.success("Number added");
      }
      setModalOpen(false);
    } catch {
      toast.error("Failed to save — check uniqueness");
    }
  }, [editingId, numberVal, dispatch]);

  const handleDelete = useCallback(
    async (row: AssignedNumber) => {
      if (row.assignedToStaffProfileId) {
        toast.error("Unassign this number from staff before deleting");
        return;
      }
      if (!window.confirm(`Delete assigned number “${row.number}”?`)) return;
      try {
        await dispatch(deleteAssignedNumber(row.id)).unwrap();
        if (editingId === row.id) setModalOpen(false);
        toast.success("Number deleted");
      } catch {
        toast.error("Cannot delete this number");
      }
    },
    [dispatch, editingId]
  );

  const columns = useMemo(
    () => [
      { key: "number", header: "Assigned number" },
      {
        key: "assigned",
        header: "Status",
        render: (row: AssignedNumber) =>
          row.assignedToStaffProfileId ? (
            <span className="text-sm text-text-muted">Assigned to staff</span>
          ) : (
            <span className="text-sm text-success">Available</span>
          ),
      },
      {
        key: "actions",
        header: "",
        render: (row: AssignedNumber) => (
          <div className="flex items-center gap-1">
            <Tooltip content="Edit" side="top">
              <button
                type="button"
                onClick={() => openEdit(row)}
                className="rounded p-1.5 text-primary hover:bg-primary-muted"
                aria-label={`Edit ${row.number}`}
              >
                <PencilIcon className="h-5 w-5" />
              </button>
            </Tooltip>
            <Tooltip content="Delete" side="top">
              <button
                type="button"
                onClick={() => void handleDelete(row)}
                className="rounded p-1.5 text-error hover:bg-error/10"
                aria-label={`Delete ${row.number}`}
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
          title="Assigned numbers"
          subtitle="Add numbers here, then link each to a staff member from Staff management. Each number can belong to at most one staff member."
          action={
            <Button type="button" onClick={openAdd}>
              Add number
            </Button>
          }
        />
        <Table
          columns={columns}
          data={numbers}
          keyExtractor={(r) => r.id}
          emptyMessage="No numbers yet."
        />
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit number" : "Add number"}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Number"
            value={numberVal}
            onChange={(e) => setNumberVal(e.target.value)}
            placeholder="e.g. 1001 or ADN-42"
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

export default memo(AssignedNumbersManagementPage);
