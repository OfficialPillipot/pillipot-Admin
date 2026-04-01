import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { PencilIcon, StarIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Card, CardHeader, Button, Input, Modal, Table, Tooltip } from "../components/ui";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  createSender,
  deleteSender,
  fetchSenders,
  selectSenders,
  setDefaultSender,
  updateSender,
} from "../store/sendersSlice";
import { toast } from "../lib/toast";
import type { Sender } from "../types";

type SenderDraft = {
  name: string;
  buildingHouse: string;
  streetLine1: string;
  streetLine2: string;
  area: string;
  cityState: string;
  postOffice: string;
  pincode: string;
  district: string;
  state: string;
  phone: string;
  email: string;
  contractIdPrepaid: string;
  contractIdCod: string;
  customerId: string;
  isDefault: boolean;
};

const EMPTY_DRAFT: SenderDraft = {
  name: "",
  buildingHouse: "",
  streetLine1: "",
  streetLine2: "",
  area: "",
  cityState: "",
  postOffice: "",
  pincode: "",
  district: "",
  state: "",
  phone: "",
  email: "",
  contractIdPrepaid: "",
  contractIdCod: "",
  customerId: "",
  isDefault: false,
};

function SenderManagementPage() {
  const dispatch = useAppDispatch();
  const senders = useAppSelector(selectSenders);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Sender | null>(null);
  const [draft, setDraft] = useState<SenderDraft>(EMPTY_DRAFT);

  useEffect(() => {
    void dispatch(fetchSenders());
  }, [dispatch]);

  const openCreate = useCallback(() => {
    setEditing(null);
    setDraft({ ...EMPTY_DRAFT, isDefault: senders.length === 0 });
    setOpen(true);
  }, [senders.length]);

  const openEdit = useCallback((sender: Sender) => {
    setEditing(sender);
    setDraft({
      name: sender.name ?? "",
      buildingHouse: sender.buildingHouse ?? "",
      streetLine1: sender.streetLine1 ?? "",
      streetLine2: sender.streetLine2 ?? "",
      area: sender.area ?? "",
      cityState: sender.cityState ?? "",
      postOffice: sender.postOffice ?? "",
      pincode: sender.pincode ?? "",
      district: sender.district ?? "",
      state: sender.state ?? "",
      phone: sender.phone ?? "",
      email: sender.email ?? "",
      contractIdPrepaid: sender.contractIdPrepaid ?? "",
      contractIdCod: sender.contractIdCod ?? "",
      customerId: sender.customerId ?? "",
      isDefault: sender.isDefault,
    });
    setOpen(true);
  }, []);

  const updateField = useCallback(
    (key: keyof SenderDraft, value: string | boolean) =>
      setDraft((prev) => ({ ...prev, [key]: value })),
    []
  );

  const save = useCallback(async () => {
    if (!draft.name.trim() || !draft.streetLine1.trim()) {
      toast.error("Sender name and street are required");
      return;
    }
    const payload = {
      ...draft,
      name: draft.name.trim(),
      streetLine1: draft.streetLine1.trim(),
      buildingHouse: draft.buildingHouse.trim(),
      streetLine2: draft.streetLine2.trim(),
      area: draft.area.trim(),
      cityState: draft.cityState.trim(),
      postOffice: draft.postOffice.trim(),
      pincode: draft.pincode.trim(),
      district: draft.district.trim(),
      state: draft.state.trim(),
      phone: draft.phone.trim(),
      email: draft.email.trim(),
      contractIdPrepaid: draft.contractIdPrepaid.trim(),
      contractIdCod: draft.contractIdCod.trim(),
      customerId: draft.customerId.trim(),
    };
    try {
      if (editing) {
        await dispatch(updateSender({ id: editing.id, patch: payload })).unwrap();
        toast.success("Sender updated");
      } else {
        await dispatch(createSender(payload)).unwrap();
        toast.success("Sender created");
      }
      setOpen(false);
      await dispatch(fetchSenders()).unwrap();
    } catch (err) {
      toast.fromError(err, "Failed to save sender");
    }
  }, [dispatch, draft, editing]);

  const remove = useCallback(
    async (id: string) => {
      if (!window.confirm("Delete this sender?")) return;
      try {
        await dispatch(deleteSender(id)).unwrap();
        await dispatch(fetchSenders()).unwrap();
        toast.success("Sender deleted");
      } catch (err) {
        toast.fromError(err, "Failed to delete sender");
      }
    },
    [dispatch]
  );

  const makeDefault = useCallback(
    async (id: string) => {
      try {
        await dispatch(setDefaultSender(id)).unwrap();
        toast.success("Default sender updated");
      } catch (err) {
        toast.fromError(err, "Failed to set default sender");
      }
    },
    [dispatch]
  );

  const columns = useMemo(
    () => [
      { key: "name", header: "Sender" },
      {
        key: "address",
        header: "Address",
        render: (row: Sender) =>
          [
            row.buildingHouse,
            row.streetLine1,
            row.area,
            row.postOffice,
            row.district,
            row.state,
          ]
            .filter(Boolean)
            .join(", "),
      },
      {
        key: "ids",
        header: "Contracts / Customer",
        render: (row: Sender) =>
          `COD: ${row.contractIdCod || "—"} | Prepaid: ${row.contractIdPrepaid || "—"} | Customer: ${row.customerId || "—"}`,
      },
      {
        key: "isDefault",
        header: "Default",
        render: (row: Sender) =>
          row.isDefault ? (
            <span className="inline-flex items-center rounded-full bg-primary-muted px-2 py-1 text-xs font-medium text-primary">
              Default
            </span>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void makeDefault(row.id)}
            >
              Set default
            </Button>
          ),
      },
      {
        key: "actions",
        header: "",
        render: (row: Sender) => (
          <div className="flex items-center gap-1">
            <Tooltip content="Edit">
              <button
                type="button"
                onClick={() => openEdit(row)}
                className="rounded-[var(--radius-md)] p-2 text-text-muted hover:bg-primary-muted hover:text-primary"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
            </Tooltip>
            {!row.isDefault && (
              <Tooltip content="Set default">
                <button
                  type="button"
                  onClick={() => void makeDefault(row.id)}
                  className="rounded-[var(--radius-md)] p-2 text-text-muted hover:bg-primary-muted hover:text-primary"
                >
                  <StarIcon className="h-4 w-4" />
                </button>
              </Tooltip>
            )}
            <Tooltip content="Delete">
              <button
                type="button"
                onClick={() => void remove(row.id)}
                className="rounded-[var(--radius-md)] p-2 text-text-muted hover:bg-error-bg hover:text-error"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </Tooltip>
          </div>
        ),
      },
    ],
    [makeDefault, openEdit, remove]
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Sender Management"
          // subtitle="Manage sender address details used in delivery label PDFs."
          action={<Button onClick={openCreate}>Add sender</Button>}
        />
        <Table
          columns={columns}
          data={senders}
          keyExtractor={(s) => s.id}
          emptyMessage="No senders yet. Add one to enable label PDF downloads."
        />
      </Card>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit sender" : "Add sender"}
        size="lg"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Sender name *" value={draft.name} onChange={(e) => updateField("name", e.target.value)} />
          <Input label="Building / House" value={draft.buildingHouse} onChange={(e) => updateField("buildingHouse", e.target.value)} />
          <Input label="Street *" value={draft.streetLine1} onChange={(e) => updateField("streetLine1", e.target.value)} />
          <Input label="Street line 2" value={draft.streetLine2} onChange={(e) => updateField("streetLine2", e.target.value)} />
          <Input label="Area" value={draft.area} onChange={(e) => updateField("area", e.target.value)} />
          <Input label="City / State" value={draft.cityState} onChange={(e) => updateField("cityState", e.target.value)} />
          <Input label="Post office" value={draft.postOffice} onChange={(e) => updateField("postOffice", e.target.value)} />
          <Input label="Pincode" value={draft.pincode} onChange={(e) => updateField("pincode", e.target.value)} />
          <Input label="District" value={draft.district} onChange={(e) => updateField("district", e.target.value)} />
          <Input label="State" value={draft.state} onChange={(e) => updateField("state", e.target.value)} />
          <Input label="Phone" value={draft.phone} onChange={(e) => updateField("phone", e.target.value)} />
          <Input label="Email" value={draft.email} onChange={(e) => updateField("email", e.target.value)} />
          <Input label="Contract ID (COD)" value={draft.contractIdCod} onChange={(e) => updateField("contractIdCod", e.target.value)} />
          <Input label="Contract ID (Prepaid)" value={draft.contractIdPrepaid} onChange={(e) => updateField("contractIdPrepaid", e.target.value)} />
          <Input label="Customer ID" value={draft.customerId} onChange={(e) => updateField("customerId", e.target.value)} />
          <label className="flex items-center gap-2 text-sm text-text-muted sm:col-span-2">
            <input
              type="checkbox"
              checked={draft.isDefault}
              onChange={(e) => updateField("isDefault", e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary"
            />
            Set as default sender
          </label>
          <div className="sm:col-span-2 flex gap-2">
            <Button onClick={() => void save()}>Save</Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default memo(SenderManagementPage);
