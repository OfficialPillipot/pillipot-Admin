import { memo, useCallback, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  KeyIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { Card, CardHeader, Button, Input, Modal, Table, Badge, Tooltip } from "../components/ui";
import {
  useCreateRbacGuestUserMutation,
  useDeleteRbacGuestUserMutation,
  useGetRbacGuestUsersQuery,
  useGetRbacMatrixQuery,
  useGetRbacRolesQuery,
  useResetRbacGuestUserPasswordMutation,
  useUpdateRbacGuestUserMutation,
  useUpdateRbacRolePermissionsMutation,
} from "../store/api/edenApi";
import type { GuestUserRow, RbacMatrixResponse, RbacRoleRow } from "../types";
import { toast } from "../lib/toast";

const ACTION_LABEL: Record<string, string> = {
  view: "View",
  create: "Create",
  update: "Edit",
  delete: "Delete",
  lookup: "Lookup",
  view_cost: "View cost",
};

function RolePermissionsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RbacRoleRow | null>(null);
  const [draftSlugs, setDraftSlugs] = useState<Set<string>>(new Set());

  const [guestUsername, setGuestUsername] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPassword, setGuestPassword] = useState("");
  const [createdGuestPw, setCreatedGuestPw] = useState<string | null>(null);

  const [editGuestRow, setEditGuestRow] = useState<GuestUserRow | null>(null);
  const [editGuestName, setEditGuestName] = useState("");
  const [editGuestActive, setEditGuestActive] = useState(true);

  const [resetGuestRow, setResetGuestRow] = useState<GuestUserRow | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetResultPw, setResetResultPw] = useState<string | null>(null);
  const {
    data: roles = [],
    isLoading: loadingRoles,
  } = useGetRbacRolesQuery();
  const {
    data: matrix,
    isLoading: loadingMatrix,
  } = useGetRbacMatrixQuery();
  const {
    data: guests = [],
    isFetching: refreshingGuests,
    refetch: refetchGuests,
  } = useGetRbacGuestUsersQuery();
  const [updateRolePermissions, { isLoading: saving }] =
    useUpdateRbacRolePermissionsMutation();
  const [createGuestMutation, { isLoading: creatingGuest }] =
    useCreateRbacGuestUserMutation();
  const [updateGuestMutation, { isLoading: savingGuest }] =
    useUpdateRbacGuestUserMutation();
  const [resetGuestPasswordMutation, { isLoading: resettingPw }] =
    useResetRbacGuestUserPasswordMutation();
  const [deleteGuestMutation] = useDeleteRbacGuestUserMutation();
  const loading = loadingRoles || loadingMatrix;
  const catalog: RbacMatrixResponse["catalog"] = matrix?.catalog ?? [];

  const byResource = useMemo(() => {
    const m = new Map<string, RbacMatrixResponse["catalog"]>();
    for (const p of catalog) {
      const arr = m.get(p.resource) ?? [];
      arr.push(p);
      m.set(p.resource, arr);
    }
    return m;
  }, [catalog]);

  const openEdit = useCallback((role: RbacRoleRow) => {
    if (role.slug === "super_admin") {
      toast.error("Super admin always has full access; permissions are not editable here.");
      return;
    }
    setEditingRole(role);
    setDraftSlugs(new Set(role.permissionSlugs));
    setModalOpen(true);
  }, []);

  const toggleSlug = useCallback((slug: string) => {
    setDraftSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }, []);

  const savePermissions = useCallback(async () => {
    if (!editingRole) return;
    try {
      await updateRolePermissions({
        roleId: editingRole.id,
        permissionSlugs: [...draftSlugs].sort(),
      }).unwrap();
      toast.success("Permissions updated");
      setModalOpen(false);
    } catch (e) {
      toast.fromError(e, "Failed to save permissions");
    }
  }, [editingRole, draftSlugs, updateRolePermissions]);

  const createGuest = useCallback(async () => {
    const u = guestUsername.trim().toLowerCase();
    if (!u || !guestName.trim()) {
      toast.error("Username and name are required");
      return;
    }
    setCreatedGuestPw(null);
    try {
      const body: { username: string; name: string; password?: string } = {
        username: u,
        name: guestName.trim(),
      };
      if (guestPassword.trim().length >= 8) body.password = guestPassword.trim();
      const res = await createGuestMutation({
        username: body.username,
        name: body.name,
        password: body.password,
      }).unwrap() as {
        id: string;
        username: string;
        name: string;
        temporaryPassword: string;
      };
      setCreatedGuestPw(res.temporaryPassword);
      toast.success(`Guest user “${res.username}” created`);
      setGuestUsername("");
      setGuestName("");
      setGuestPassword("");
    } catch (e) {
      toast.fromError(e, "Could not create guest user");
    }
  }, [guestUsername, guestName, guestPassword, createGuestMutation]);

  const openEditGuest = useCallback((row: GuestUserRow) => {
    setEditGuestRow(row);
    setEditGuestName(row.name);
    setEditGuestActive(row.isActive);
  }, []);

  const saveGuestEdit = useCallback(async () => {
    if (!editGuestRow || !editGuestName.trim()) return;
    try {
      await updateGuestMutation({
        id: editGuestRow.id,
        name: editGuestName.trim(),
        isActive: editGuestActive,
      }).unwrap();
      toast.success("Guest user updated");
      setEditGuestRow(null);
    } catch (e) {
      toast.fromError(e, "Failed to update guest");
    }
  }, [editGuestRow, editGuestName, editGuestActive, updateGuestMutation]);

  const openResetGuest = useCallback((row: GuestUserRow) => {
    setResetGuestRow(row);
    setResetNewPassword("");
    setResetResultPw(null);
  }, []);

  const submitResetPassword = useCallback(async () => {
    if (!resetGuestRow || resetNewPassword.trim().length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setResetResultPw(null);
    try {
      const res = await resetGuestPasswordMutation({
        id: resetGuestRow.id,
        newPassword: resetNewPassword.trim(),
      }).unwrap();
      setResetResultPw(res.temporaryPassword);
      toast.success("Password updated");
      setResetNewPassword("");
    } catch (e) {
      toast.fromError(e, "Failed to reset password");
    } finally {
      // handled by RTK Query isLoading
    }
  }, [resetGuestRow, resetNewPassword, resetGuestPasswordMutation]);

  const deleteGuest = useCallback(
    async (row: GuestUserRow) => {
      if (
        !window.confirm(
          `Delete guest user “${row.username}”? They will not be able to sign in.`
        )
      ) {
        return;
      }
      try {
        await deleteGuestMutation(row.id).unwrap();
        toast.success("Guest user deleted");
      } catch (e) {
        toast.fromError(e, "Failed to delete guest");
      }
    },
    [deleteGuestMutation]
  );

  const columns = useMemo(
    () => [
      { key: "name", header: "Role" },
      {
        key: "slug",
        header: "Slug",
        render: (row: RbacRoleRow) => (
          <code className="text-xs text-text-muted">{row.slug}</code>
        ),
      },
      {
        key: "permCount",
        header: "Permissions",
        render: (row: RbacRoleRow) => (
          <span className="text-text-muted">
            {row.slug === "super_admin" ? "All" : row.permissionSlugs.length}
          </span>
        ),
      },
      {
        key: "actions",
        header: "",
        render: (row: RbacRoleRow) =>
          row.slug === "super_admin" ? null : (
            <Button type="button" size="sm" variant="secondary" onClick={() => openEdit(row)}>
              Edit permissions
            </Button>
          ),
      },
    ],
    [openEdit]
  );

  const guestColumns = useMemo(
    () => [
      {
        key: "username",
        header: "Username",
        render: (row: GuestUserRow) => (
          <code className="text-sm text-text-heading">{row.username}</code>
        ),
      },
      { key: "name", header: "Display name" },
      {
        key: "status",
        header: "Status",
        render: (row: GuestUserRow) => (
          <Badge variant={row.isActive ? "success" : "muted"}>
            {row.isActive ? "Active" : "Disabled"}
          </Badge>
        ),
      },
      {
        key: "actions",
        header: "",
        mobileHeaderEnd: true,
        render: (row: GuestUserRow) => (
          <div className="flex flex-wrap items-center justify-end gap-1">
            <Tooltip content="Edit" side="top">
              <button
                type="button"
                onClick={() => openEditGuest(row)}
                className="rounded p-1.5 text-primary hover:bg-primary-muted"
                aria-label={`Edit ${row.username}`}
              >
                <PencilIcon className="h-5 w-5" />
              </button>
            </Tooltip>
            <Tooltip content="Set password" side="top">
              <button
                type="button"
                onClick={() => openResetGuest(row)}
                className="rounded p-1.5 text-text-muted hover:bg-surface-alt"
                aria-label={`Reset password ${row.username}`}
              >
                <KeyIcon className="h-5 w-5" />
              </button>
            </Tooltip>
            <Tooltip content="Delete" side="top">
              <button
                type="button"
                onClick={() => void deleteGuest(row)}
                className="rounded p-1.5 text-error hover:bg-error/10"
                aria-label={`Delete ${row.username}`}
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </Tooltip>
          </div>
        ),
      },
    ],
    [openEditGuest, openResetGuest, deleteGuest]
  );

  return (
    <div className="space-y-4">
      <Card>
        {loading ? (
          <p className="text-sm text-text-muted">Loading…</p>
        ) : (
          <Table
            columns={columns}
            data={roles}
            keyExtractor={(r) => r.id}
            emptyMessage="No roles."
          />
        )}
      </Card>

      <Card>
        <CardHeader
          title="Guest users"
          subtitle="All accounts with the Guest role. Edit name, disable access, reset password, or remove the account."
          action={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={refreshingGuests}
              onClick={() => void refetchGuests()}
            >
              <span className="inline-flex items-center gap-1.5">
                <ArrowPathIcon className="h-4 w-4" aria-hidden />
                Refresh
              </span>
            </Button>
          }
        />
        <Table
          columns={guestColumns}
          data={guests}
          keyExtractor={(r) => r.id}
          emptyMessage="No guest users yet. Create one below."
        />
      </Card>

      <Card>
        <CardHeader
          title="Create guest user"
          subtitle="Guest accounts use the admin app shell with only the permissions you assign to the Guest role (use Edit permissions on the Guest row above)."
        />
        <div className="grid max-w-lg gap-3 sm:grid-cols-2">
          <Input
            label="Username"
            value={guestUsername}
            onChange={(e) => setGuestUsername(e.target.value)}
            placeholder="guest2"
            autoComplete="off"
          />
          <Input
            label="Display name"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Reports viewer"
            autoComplete="off"
          />
          <div className="sm:col-span-2">
            <Input
              label="Password (optional)"
              type="password"
              value={guestPassword}
              onChange={(e) => setGuestPassword(e.target.value)}
              hint="Leave empty to auto-generate a temporary password (shown once below)."
              autoComplete="new-password"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" onClick={() => void createGuest()} loading={creatingGuest}>
            Create guest
          </Button>
        </div>
        {createdGuestPw ? (
          <p className="mt-3 rounded-[var(--radius-md)] border border-border bg-surface-alt p-3 text-sm">
            <span className="font-medium text-text-heading">Temporary password: </span>
            <code className="select-all text-primary">{createdGuestPw}</code>
          </p>
        ) : null}
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editingRole ? `Permissions — ${editingRole.name}` : "Permissions"}
        size="lg"
      >
        {editingRole ? (
          <div className="max-h-[min(70vh,28rem)] space-y-4 overflow-y-auto pr-1">
            {[...byResource.entries()]
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([resource, perms]) => (
                <div key={resource}>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                    {resource.replace(/_/g, " ")}
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {perms.map((p) => (
                      <label
                        key={p.slug}
                        className="flex cursor-pointer items-center gap-2 text-sm text-text"
                      >
                        <input
                          type="checkbox"
                          checked={draftSlugs.has(p.slug)}
                          onChange={() => toggleSlug(p.slug)}
                          className="h-4 w-4 rounded border-border text-primary"
                        />
                        {ACTION_LABEL[p.action] ?? p.action}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              <Button type="button" onClick={() => void savePermissions()} loading={saving}>
                Save
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={saving}
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={!!editGuestRow}
        onClose={() => !savingGuest && setEditGuestRow(null)}
        title={editGuestRow ? `Edit — ${editGuestRow.username}` : "Edit guest"}
        size="md"
      >
        {editGuestRow ? (
          <div className="space-y-4">
            <p className="text-xs text-text-muted">Username cannot be changed.</p>
            <Input
              label="Display name"
              value={editGuestName}
              onChange={(e) => setEditGuestName(e.target.value)}
            />
            <label className="flex cursor-pointer items-center gap-2 text-sm text-text">
              <input
                type="checkbox"
                checked={editGuestActive}
                onChange={(e) => setEditGuestActive(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary"
              />
              Account active (can sign in)
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void saveGuestEdit()} loading={savingGuest}>
                Save
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={savingGuest}
                onClick={() => setEditGuestRow(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={!!resetGuestRow}
        onClose={() => !resettingPw && setResetGuestRow(null)}
        title={resetGuestRow ? `Set password — ${resetGuestRow.username}` : "Reset password"}
        size="md"
      >
        {resetGuestRow ? (
          <div className="space-y-4">
            <Input
              label="New password"
              type="password"
              value={resetNewPassword}
              onChange={(e) => setResetNewPassword(e.target.value)}
              hint="Minimum 8 characters."
              autoComplete="new-password"
            />
            {resetResultPw ? (
              <p className="rounded-[var(--radius-md)] border border-border bg-surface-alt p-3 text-sm">
                <span className="font-medium text-text-heading">Password set to: </span>
                <code className="select-all text-primary">{resetResultPw}</code>
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => void submitResetPassword()}
                loading={resettingPw}
              >
                Update password
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={resettingPw}
                onClick={() => setResetGuestRow(null)}
              >
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

export default memo(RolePermissionsPage);
