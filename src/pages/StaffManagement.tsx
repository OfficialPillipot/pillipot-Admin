import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ClipboardDocumentIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  selectStaff,
  createStaff,
  updateStaff,
  fetchStaff,
  resetStaffPassword,
  fulfillPasswordResetRequest,
  deleteStaff,
  type UpdateStaffPayload,
} from "../store/staffSlice";
import { selectStaffPositions, fetchStaffPositions } from "../store/staffPositionsSlice";
import { selectAssignedNumbers, fetchAssignedNumbers } from "../store/assignedNumbersSlice";
import {
  Card,
  CardHeader,
  Button,
  Table,
  Modal,
  Input,
  Badge,
  Select,
  Tooltip,
} from "../components/ui";
import { staffJobRoleLabel } from "../lib/staffJobRoles";
import { formatDate } from "../lib/orderUtils";
import { toast } from "../lib/toast";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";
import type { RbacMatrixResponse, Staff } from "../types";
import type { SelectOption } from "../components/ui/Select";

const EXTRA_PERM_ACTION_LABEL: Record<string, string> = {
  view: "View",
  create: "Create",
  update: "Edit",
  delete: "Delete",
  lookup: "Lookup",
  view_cost: "View cost",
};

const DEFAULT_BONUS_MILESTONES = [
  { orders: 5, bonus: 50 },
  { orders: 10, bonus: 100 },
  { orders: 15, bonus: 150 },
];

const PHONE_RE = /^[\d+\s().-]{7,25}$/;

function StaffManagementPage() {
  const dispatch = useAppDispatch();
  const { user: authUser } = useAuth();
  const canEditStaffExtras =
    authUser?.permissions?.includes("staff.update") ?? false;
  const staff = useAppSelector(selectStaff);
  const positions = useAppSelector(selectStaffPositions);
  const assignedNumbers = useAppSelector(selectAssignedNumbers);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editStaff, setEditStaff] = useState<Staff | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [joinedDate, setJoinedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [staffPositionId, setStaffPositionId] = useState("");
  const [assignedNumberId, setAssignedNumberId] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tempPasswordModal, setTempPasswordModal] = useState<{
    username: string;
    password: string;
  } | null>(null);
  const [resetConfirmStaff, setResetConfirmStaff] = useState<Staff | null>(null);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [fulfillRequestId, setFulfillRequestId] = useState<string | null>(null);
  const [fulfillSubmitting, setFulfillSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Staff | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const [permissionCatalog, setPermissionCatalog] = useState<
    RbacMatrixResponse["catalog"]
  >([]);
  const [permCatalogLoaded, setPermCatalogLoaded] = useState(false);
  const [draftExtraSlugs, setDraftExtraSlugs] = useState<Set<string>>(
    () => new Set()
  );

  const loadPermissionCatalog = useCallback(async () => {
    if (!canEditStaffExtras) return;
    try {
      const res = await api.get<RbacMatrixResponse>(endpoints.staffPermissionCatalog);
      setPermissionCatalog(res.catalog ?? []);
      setPermCatalogLoaded(true);
    } catch {
      setPermissionCatalog([]);
      setPermCatalogLoaded(false);
    }
  }, [canEditStaffExtras]);

  const byResourceForExtras = useMemo(() => {
    const m = new Map<string, RbacMatrixResponse["catalog"]>();
    for (const p of permissionCatalog) {
      const arr = m.get(p.resource) ?? [];
      arr.push(p);
      m.set(p.resource, arr);
    }
    return m;
  }, [permissionCatalog]);

  const toggleExtraSlug = useCallback((slug: string) => {
    setDraftExtraSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }, []);

  useEffect(() => {
    void dispatch(fetchStaff());
    void dispatch(fetchStaffPositions());
    void dispatch(fetchAssignedNumbers());
  }, [dispatch]);

  useEffect(() => {
    const onFocus = () => {
      void dispatch(fetchStaff());
      void dispatch(fetchAssignedNumbers());
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [dispatch]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void dispatch(fetchStaff());
    }, 15000);
    return () => window.clearInterval(timer);
  }, [dispatch]);

  const positionOptions: SelectOption[] = useMemo(
    () => positions.map((p) => ({ value: p.id, label: p.name })),
    [positions]
  );

  const numberOptionsFor = useCallback(
    (profileId: string | null) => {
      const opts: SelectOption[] = [{ value: "", label: "None" }];
      for (const n of assignedNumbers) {
        if (!n.assignedToStaffProfileId || n.assignedToStaffProfileId === profileId) {
          opts.push({ value: n.id, label: n.number });
        }
      }
      return opts;
    },
    [assignedNumbers]
  );

  const openAdd = useCallback(() => {
    setName("");
    setUsername("");
    setPhone("");
    setJoinedDate(new Date().toISOString().slice(0, 10));
    setStaffPositionId(positions[0]?.id ?? "");
    setAssignedNumberId("");
    setError("");
    setAddModalOpen(true);
  }, [positions]);

  const openEdit = useCallback(
    (s: Staff) => {
      setEditStaff(s);
      setName(s.name);
      setPhone(s.phone);
      setJoinedDate(s.joinedDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
      setStaffPositionId(s.staffPositionId ?? positions[0]?.id ?? "");
      setAssignedNumberId(s.assignedNumberId ?? "");
      setDraftExtraSlugs(new Set(s.extraPermissionSlugs ?? []));
      setPermCatalogLoaded(false);
      setError("");
      void loadPermissionCatalog();
    },
    [positions, loadPermissionCatalog]
  );

  const closeEdit = useCallback(() => {
    setEditStaff(null);
    setPermCatalogLoaded(false);
    setError("");
  }, []);

  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      const nameTrim = name.trim();
      const usernameTrim = username.trim().toLowerCase();
      const phoneTrim = phone.trim();
      if (!nameTrim) {
        setError("Name is required");
        return;
      }
      if (!usernameTrim) {
        setError("Username is required");
        return;
      }
      if (!phoneTrim) {
        setError("Phone number is required");
        return;
      }
      if (!PHONE_RE.test(phoneTrim)) {
        setError("Enter a valid phone number (7–25 characters)");
        return;
      }
      if (!staffPositionId) {
        setError("Select a role (add roles under Role management if empty)");
        return;
      }
      if (staff.some((s) => s.username.toLowerCase() === usernameTrim)) {
        setError("Username already exists");
        return;
      }
      setSubmitting(true);
      try {
        const created = await dispatch(
          createStaff({
            name: nameTrim,
            username: usernameTrim,
            phone: phoneTrim,
            joinedDate: joinedDate || new Date().toISOString().slice(0, 10),
            staffPositionId,
            assignedNumberId: assignedNumberId || null,
            isActive: true,
            payoutPerOrder: 30,
            bonusMilestones: DEFAULT_BONUS_MILESTONES,
          })
        ).unwrap();
        toast.success("Staff created");
        setAddModalOpen(false);
        void dispatch(fetchAssignedNumbers());
        if (created.temporaryPassword) {
          setTempPasswordModal({
            username: created.username,
            password: created.temporaryPassword,
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to create staff";
        setError(msg);
        toast.fromError(err, "Failed to create staff");
      } finally {
        setSubmitting(false);
      }
    },
    [
      name,
      username,
      phone,
      joinedDate,
      staffPositionId,
      assignedNumberId,
      staff,
      dispatch,
    ]
  );

  const handleSaveEdit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editStaff) return;
      setError("");
      const nameTrim = name.trim();
      const phoneTrim = phone.trim();
      if (!nameTrim) {
        setError("Name is required");
        return;
      }
      if (!phoneTrim || !PHONE_RE.test(phoneTrim)) {
        setError("Enter a valid phone number (7–25 characters)");
        return;
      }
      if (!staffPositionId) {
        setError("Select a role");
        return;
      }
      setSubmitting(true);
      try {
        const patch: UpdateStaffPayload = {
          name: nameTrim,
          phone: phoneTrim,
          joinedDate: joinedDate || editStaff.joinedDate.slice(0, 10),
          staffPositionId,
          assignedNumberId: assignedNumberId || null,
        };
        if (permCatalogLoaded) {
          patch.extraPermissionSlugs = [...draftExtraSlugs].sort();
        }
        await dispatch(
          updateStaff({
            id: editStaff.id,
            patch,
          })
        ).unwrap();
        toast.success("Staff updated");
        closeEdit();
        void dispatch(fetchAssignedNumbers());
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to update staff";
        setError(msg);
        toast.fromError(err, "Failed to update staff");
      } finally {
        setSubmitting(false);
      }
    },
    [
      editStaff,
      name,
      phone,
      joinedDate,
      staffPositionId,
      assignedNumberId,
      permCatalogLoaded,
      draftExtraSlugs,
      dispatch,
      closeEdit,
    ]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteConfirm) return;
    setDeleteSubmitting(true);
    try {
      await dispatch(deleteStaff(deleteConfirm.id)).unwrap();
      toast.success("Staff deleted");
      setDeleteConfirm(null);
      void dispatch(fetchAssignedNumbers());
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Cannot delete (orders may exist)"
      );
    } finally {
      setDeleteSubmitting(false);
    }
  }, [deleteConfirm, dispatch]);

  const toggleActive = useCallback(
    async (staffId: string, current: boolean) => {
      try {
        await dispatch(updateStaff({ id: staffId, patch: { isActive: !current } })).unwrap();
        toast.success(current ? "Staff set to inactive" : "Staff set to active");
      } catch (err) {
        toast.fromError(err, "Failed to update status");
      }
    },
    [dispatch]
  );

  const handleConfirmResetPassword = useCallback(async () => {
    if (!resetConfirmStaff) return;
    setResetSubmitting(true);
    try {
      const updated = await dispatch(
        resetStaffPassword(resetConfirmStaff.id)
      ).unwrap();
      setResetConfirmStaff(null);
      toast.success("Password reset");
      if (updated.temporaryPassword) {
        setTempPasswordModal({
          username: updated.username,
          password: updated.temporaryPassword,
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setResetSubmitting(false);
    }
  }, [dispatch, resetConfirmStaff]);

  const handleConfirmFulfillRequest = useCallback(async () => {
    if (!fulfillRequestId) return;
    setFulfillSubmitting(true);
    try {
      const updated = await dispatch(
        fulfillPasswordResetRequest(fulfillRequestId)
      ).unwrap();
      setFulfillRequestId(null);
      toast.success("Password reset issued; request marked complete.");
      if (updated.temporaryPassword) {
        setTempPasswordModal({
          username: updated.username,
          password: updated.temporaryPassword,
        });
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to fulfill request"
      );
    } finally {
      setFulfillSubmitting(false);
    }
  }, [dispatch, fulfillRequestId]);

  const copyPassword = useCallback((pwd: string) => {
    void navigator.clipboard.writeText(pwd);
    toast.success("Password copied");
  }, []);

  const roleLabel = useCallback((row: Staff) => {
    if (row.staffPositionName?.trim()) return row.staffPositionName;
    return staffJobRoleLabel(row.jobRole);
  }, []);

  const columns = useMemo(
    () => [
      {
        key: "name",
        header: "Staff Name",
        render: (row: Staff) => (
          <Link to={`/admin/staff/${row.id}`} className="font-medium text-primary hover:underline">
            {row.name}
          </Link>
        ),
      },
      {
        key: "assignedNumber",
        header: "Assigned #",
        render: (row: Staff) =>
          row.assignedNumber?.trim() ? (
            <span className="font-mono text-sm">{row.assignedNumber}</span>
          ) : (
            <span className="text-text-muted">—</span>
          ),
      },
      {
        key: "joinedDate",
        header: "Joined",
        render: (row: Staff) => formatDate(row.joinedDate),
      },
      { key: "username", header: "Username" },
      {
        key: "jobRole",
        header: "Role",
        render: (row: Staff) => roleLabel(row),
      },
      { key: "phone", header: "Phone" },
      {
        key: "forgotPasswordRequest",
        header: "Forgot password request",
        render: (row: Staff) => {
          const p = row.pendingPasswordResetRequest;
          if (!p) {
            return <span className="text-sm text-text-muted">—</span>;
          }
          return (
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
              <Badge variant="warning">Pending</Badge>
              <span className="text-xs text-text-muted">
                {formatDate(p.createdAt)}
              </span>
            </div>
          );
        },
      },
      {
        key: "tempPassword",
        header: "Initial password",
        render: (row: Staff) =>
          row.temporaryPassword ? (
            <div className="flex max-w-[200px] items-center gap-2">
              <code className="truncate rounded bg-surface-alt px-1.5 py-0.5 text-xs">
                {row.temporaryPassword}
              </code>
              <button
                type="button"
                onClick={() => copyPassword(row.temporaryPassword!)}
                className="shrink-0 rounded p-1 text-primary hover:bg-primary-muted"
                title="Copy password"
                aria-label={`Copy password for ${row.username}`}
              >
                <ClipboardDocumentIcon className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <span className="text-sm text-text-muted">Staff changed</span>
          ),
      },
      {
        key: "resetPassword",
        header: "Reset password",
        render: (row: Staff) => {
          const pending = row.pendingPasswordResetRequest;
          const canReset =
            pending != null || row.temporaryPassword === null;
          const title = pending
            ? "Issue a new temporary password and mark the forgot-password request complete"
            : canReset
              ? "Generate a new temporary password"
              : "Available only after this staff member has changed their initial password (unless they have a pending forgot-password request)";
          return (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!canReset}
              title={title}
              onClick={() => {
                if (pending) {
                  setFulfillRequestId(pending.id);
                } else {
                  setResetConfirmStaff(row);
                }
              }}
            >
              Reset
            </Button>
          );
        },
      },
      {
        key: "actions",
        header: "",
        render: (row: Staff) => (
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
                onClick={() => setDeleteConfirm(row)}
                className="rounded p-1.5 text-error hover:bg-error/10"
                aria-label={`Delete ${row.name}`}
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </Tooltip>
          </div>
        ),
      },
      {
        key: "isActive",
        header: "Active",
        render: (row: Staff) => (
          <button
            type="button"
            role="switch"
            aria-checked={row.isActive}
            aria-label={`${row.isActive ? "Active" : "Inactive"} — click to toggle`}
            onClick={() => toggleActive(row.id, row.isActive)}
            className={
              "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 " +
              (row.isActive ? "bg-success" : "bg-border")
            }
          >
            <span
              className={
                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface shadow transition " +
                (row.isActive ? "translate-x-6" : "translate-x-1")
              }
            />
          </button>
        ),
      },
    ],
    [toggleActive, copyPassword, openEdit, roleLabel]
  );

  const staffForm = (
    <>
      <Input
        label="Full Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Priya Sharma"
      />
      {!editStaff && (
        <Input
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="e.g. priya.s (used for login)"
        />
      )}
      <Input
        label="Phone number"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="e.g. 9876543210 or +91 9876543210"
        autoComplete="tel"
      />
      <Input
        label="Joined Date"
        type="date"
        value={joinedDate}
        onChange={(e) => setJoinedDate(e.target.value)}
      />
      <Select
        label="Role"
        options={positionOptions}
        value={staffPositionId}
        onChange={(e) => setStaffPositionId(e.target.value)}
      />
      <Select
        label="Assigned number"
        options={numberOptionsFor(editStaff?.id ?? null)}
        value={assignedNumberId}
        onChange={(e) => setAssignedNumberId(e.target.value)}
      />
      <p className="text-xs text-text-muted">
        Add numbers under Assigned numbers. Login access remains the standard staff account role.
      </p>
    </>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Staff Management"
          // subtitle="Use Role management and Assigned numbers in the sidebar first. A pending forgot-password request shows below; use Reset to issue a temporary password."
          action={
            <Button onClick={openAdd} disabled={!positions.length}>
              Add Staff
            </Button>
          }
        />
        {!positions.length ? (
          <p className="text-sm text-text-muted">
            Create at least one role under{" "}
            <Link to="/admin/staff/roles" className="text-primary underline">
              Role management
            </Link>{" "}
            before adding staff.
          </p>
        ) : null}
        <Table
          columns={columns}
          data={staff}
          keyExtractor={(row) => row.id}
          emptyMessage="No staff."
        />
      </Card>

      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => {
          if (!deleteSubmitting) setDeleteConfirm(null);
        }}
        title="Delete staff?"
        size="md"
      >
        {deleteConfirm && (
          <div className="space-y-4 text-sm text-text-heading">
            <p>
              Permanently delete{" "}
              <span className="font-semibold">{deleteConfirm.name}</span> (
              {deleteConfirm.username})? This only works if they have no orders.
            </p>
            <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="secondary"
                disabled={deleteSubmitting}
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                loading={deleteSubmitting}
                onClick={() => void handleConfirmDelete()}
              >
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!fulfillRequestId}
        onClose={() => {
          if (!fulfillSubmitting) setFulfillRequestId(null);
        }}
        title="Reset password from request?"
        size="md"
      >
        {fulfillRequestId && (
          <div className="space-y-4 text-sm text-text-heading">
            <p>
              Issue a new temporary password for this staff member and mark their
              forgot-password request as completed? Their current password will stop
              working until they sign in with the new temporary password.
            </p>
            <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="secondary"
                disabled={fulfillSubmitting}
                onClick={() => setFulfillRequestId(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                loading={fulfillSubmitting}
                onClick={() => void handleConfirmFulfillRequest()}
              >
                Confirm reset
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!resetConfirmStaff}
        onClose={() => {
          if (!resetSubmitting) setResetConfirmStaff(null);
        }}
        title="Reset password?"
        size="md"
      >
        {resetConfirmStaff && (
          <div className="space-y-4 text-sm text-text-heading">
            <p>
              Generate a new temporary password for{" "}
              <span className="font-semibold">{resetConfirmStaff.name}</span> (
              {resetConfirmStaff.username})? Their current password will stop working.
              They must sign in with the new temporary password and will be asked to set
              their own password again.
            </p>
            <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="secondary"
                disabled={resetSubmitting}
                onClick={() => setResetConfirmStaff(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                loading={resetSubmitting}
                onClick={() => void handleConfirmResetPassword()}
              >
                Confirm reset
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!tempPasswordModal}
        onClose={() => setTempPasswordModal(null)}
        title="Temporary password"
        size="md"
      >
        {tempPasswordModal && (
          <div className="space-y-3 text-sm text-text-heading">
            <p>
              Share this password with{" "}
              <span className="font-medium">{tempPasswordModal.username}</span>.
              It also appears in the table until they set a new password.
            </p>
            <div className="rounded-[var(--radius-md)] border border-border bg-surface-alt p-3 font-mono text-base">
              {tempPasswordModal.password}
            </div>
            <Button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(tempPasswordModal.password);
                toast.success("Copied to clipboard");
              }}
            >
              Copy password
            </Button>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add Staff"
        size="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {staffForm}
          {error && <p className="text-sm text-error">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" loading={submitting}>
              Create Staff
            </Button>
            <Button variant="secondary" type="button" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!editStaff}
        onClose={() => !submitting && closeEdit()}
        title="Edit Staff"
        size="lg"
      >
        {editStaff && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <p className="text-sm text-text-muted">
              Username <span className="font-mono text-text-heading">{editStaff.username}</span> cannot be changed.
            </p>
            {staffForm}
            {editStaff && canEditStaffExtras ? (
              <div className="rounded-[var(--radius-md)] border border-border-subtle bg-surface-alt/50 p-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Extra permissions
                </h4>
                <p className="mt-1 text-[11px] text-text-muted leading-relaxed">
                  Checked items are added on top of the shared <strong>staff</strong> role. The staff member must sign
                  out and sign back in for changes to apply.
                </p>
                {!permCatalogLoaded ? (
                  <p className="mt-2 text-xs text-text-muted">Loading permission list…</p>
                ) : permissionCatalog.length === 0 ? (
                  <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">
                    Could not load the permission list. Save still updates name, role, and number.
                  </p>
                ) : (
                  <div className="mt-3 max-h-[min(50vh,16rem)] space-y-3 overflow-y-auto pr-1">
                    {[...byResourceForExtras.entries()]
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([resource, perms]) => (
                        <div key={resource}>
                          <h5 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                            {resource.replace(/_/g, " ")}
                          </h5>
                          <div className="flex flex-wrap gap-3">
                            {perms.map((p) => (
                              <label
                                key={p.slug}
                                className="flex cursor-pointer items-center gap-2 text-sm text-text-heading"
                              >
                                <input
                                  type="checkbox"
                                  checked={draftExtraSlugs.has(p.slug)}
                                  onChange={() => toggleExtraSlug(p.slug)}
                                  className="h-4 w-4 rounded border-border text-primary"
                                />
                                {EXTRA_PERM_ACTION_LABEL[p.action] ?? p.action}
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ) : null}
            {error && <p className="text-sm text-error">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" loading={submitting}>
                Save
              </Button>
              <Button variant="secondary" type="button" onClick={closeEdit} disabled={submitting}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

export default memo(StaffManagementPage);
