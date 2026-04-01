import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowPathIcon, PencilIcon } from "@heroicons/react/24/outline";
import { Card, CardHeader, Table, Badge, Button, Modal, Tooltip } from "../components/ui";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";
import type { AdminUserRow, RbacMatrixResponse } from "../types";
import { toast } from "../lib/toast";

const EXTRA_PERM_ACTION_LABEL: Record<string, string> = {
  view: "View",
  create: "Create",
  update: "Edit",
  delete: "Delete",
  lookup: "Lookup",
  view_cost: "View cost",
};

function UserManagementPage() {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [permEditUser, setPermEditUser] = useState<AdminUserRow | null>(null);
  const [permissionCatalog, setPermissionCatalog] = useState<
    RbacMatrixResponse["catalog"]
  >([]);
  const [permCatalogLoaded, setPermCatalogLoaded] = useState(false);
  const [draftExtraSlugs, setDraftExtraSlugs] = useState<Set<string>>(
    () => new Set(),
  );
  const [savingPerms, setSavingPerms] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<AdminUserRow[]>(endpoints.rbacUsers);
      setRows(
        data.map((r) => ({
          ...r,
          extraPermissionSlugs: r.extraPermissionSlugs ?? [],
        })),
      );
    } catch (e) {
      toast.fromError(e, "Failed to load users");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const loadCatalog = useCallback(async () => {
    try {
      const m = await api.get<RbacMatrixResponse>(endpoints.rbacMatrix);
      setPermissionCatalog(m.catalog ?? []);
      setPermCatalogLoaded(true);
    } catch {
      setPermissionCatalog([]);
      setPermCatalogLoaded(false);
    }
  }, []);

  const openPermEditor = useCallback(
    (row: AdminUserRow) => {
      if (row.roleSlug === "super_admin") return;
      setPermEditUser(row);
      setDraftExtraSlugs(new Set(row.extraPermissionSlugs ?? []));
      void loadCatalog();
    },
    [loadCatalog],
  );

  const closePermEditor = useCallback(() => {
    if (!savingPerms) setPermEditUser(null);
  }, [savingPerms]);

  const byResource = useMemo(() => {
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

  const saveExtraPerms = useCallback(async () => {
    if (!permEditUser) return;
    setSavingPerms(true);
    try {
      const res = await api.patch<{ extraPermissionSlugs: string[] }>(
        endpoints.rbacUserExtraPermissions(permEditUser.id),
        { extraPermissionSlugs: [...draftExtraSlugs].sort() },
      );
      setRows((prev) =>
        prev.map((r) =>
          r.id === permEditUser.id
            ? { ...r, extraPermissionSlugs: res.extraPermissionSlugs }
            : r,
        ),
      );
      toast.success("Extra permissions saved. User must sign out and back in.");
      setPermEditUser(null);
    } catch (e) {
      toast.fromError(e, "Failed to save permissions");
    } finally {
      setSavingPerms(false);
    }
  }, [permEditUser, draftExtraSlugs]);

  const columns = useMemo(
    () => [
      { key: "username", header: "Username" },
      { key: "name", header: "Name" },
      {
        key: "roleSlug",
        header: "Role",
        render: (row: AdminUserRow) => (
          <div className="flex flex-col gap-0.5">
            <Badge variant="muted">{row.roleSlug}</Badge>
            <span className="text-[11px] text-text-muted">{row.roleName}</span>
          </div>
        ),
      },
      {
        key: "extraPermissionSlugs",
        header: "Extra permissions",
        render: (row: AdminUserRow) => {
          if (row.roleSlug === "super_admin") {
            return (
              <span className="text-xs text-text-muted" title="Super admin has full access">
                Full access
              </span>
            );
          }
          const n = row.extraPermissionSlugs?.length ?? 0;
          return (
            <span className="text-sm text-text-heading">
              {n === 0 ? (
                <span className="text-text-muted">None (role only)</span>
              ) : (
                <>
                  <Badge variant="info">{n} extra</Badge>
                </>
              )}
            </span>
          );
        },
      },
      {
        key: "permActions",
        header: "",
        render: (row: AdminUserRow) =>
          row.roleSlug === "super_admin" ? (
            <span className="text-text-muted">—</span>
          ) : (
            <Tooltip content="Edit permissions added on top of role" side="top">
              <button
                type="button"
                onClick={() => openPermEditor(row)}
                className="rounded p-1.5 text-primary hover:bg-primary-muted"
                aria-label={`Edit permissions for ${row.username}`}
              >
                <PencilIcon className="h-5 w-5" />
              </button>
            </Tooltip>
          ),
      },
      {
        key: "isActive",
        header: "Status",
        render: (row: AdminUserRow) => (
          <Badge variant={row.isActive ? "success" : "muted"}>
            {row.isActive ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        key: "mustChangePassword",
        header: "Password",
        render: (row: AdminUserRow) =>
          row.mustChangePassword ? (
            <span className="text-xs text-amber-700 dark:text-amber-400">Must change</span>
          ) : (
            <span className="text-xs text-text-muted">—</span>
          ),
      },
      {
        key: "staffProfileId",
        header: "Staff",
        render: (row: AdminUserRow) =>
          row.staffProfileId ? (
            <Link
              to={`/admin/staff/${row.staffProfileId}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              View profile
            </Link>
          ) : (
            <span className="text-xs text-text-muted">—</span>
          ),
      },
    ],
    [openPermEditor],
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="User management"
          subtitle="Edit extra permissions per user (merged with their role at login). Super admin accounts always have full access."
          action={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={loading}
              onClick={() => void load()}
            >
              <ArrowPathIcon className="h-4 w-4" aria-hidden />
              Refresh
            </Button>
          }
        />
        <Table
          columns={columns}
          data={rows}
          keyExtractor={(row) => row.id}
          emptyMessage={
            loading ? "Loading…" : "No users returned. You may need super admin access."
          }
        />
      </Card>

      <Modal
        isOpen={!!permEditUser}
        onClose={closePermEditor}
        title={permEditUser ? `Extra permissions — ${permEditUser.username}` : ""}
        size="lg"
      >
        {permEditUser && (
          <div className="space-y-4 text-sm text-text-heading">
            <p className="text-text-muted">
              <span className="font-medium text-text-heading">{permEditUser.name}</span>{" "}
              ({permEditUser.roleSlug}) — checked items are added on top of their role.
              They must sign out and sign back in for JWT changes to apply.
            </p>
            {!permCatalogLoaded ? (
              <p className="text-xs text-text-muted">Loading permission list…</p>
            ) : permissionCatalog.length === 0 ? (
              <p className="text-xs text-amber-800 dark:text-amber-200">
                Could not load the permission catalog.
              </p>
            ) : (
              <div className="max-h-[min(50vh,18rem)] space-y-3 overflow-y-auto rounded-[var(--radius-md)] border border-border-subtle bg-surface-alt/50 p-3 pr-2">
                {[...byResource.entries()]
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
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              <Button
                type="button"
                loading={savingPerms}
                disabled={!permCatalogLoaded || permissionCatalog.length === 0}
                onClick={() => void saveExtraPerms()}
              >
                Save permissions
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={savingPerms}
                onClick={closePermEditor}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default memo(UserManagementPage);
