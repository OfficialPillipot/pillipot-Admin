import { memo, useCallback, useMemo, useState } from "react";
import { Link } from "react-router";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { selectStaff, createStaff, updateStaff } from "../store/staffSlice";
import { Card, CardHeader, Button, Table, Modal, Input } from "../components/ui";
import { formatDate } from "../lib/orderUtils";
import { toast } from "../lib/toast";

const DEFAULT_BONUS_MILESTONES = [
  { orders: 10, bonus: 50 },
  { orders: 15, bonus: 100 },
  { orders: 20, bonus: 150 },
];

function StaffManagementPage() {
  const dispatch = useAppDispatch();
  const staff = useAppSelector(selectStaff);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [joinedDate, setJoinedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const openAdd = useCallback(() => {
    setName("");
    setUsername("");
    setJoinedDate(new Date().toISOString().slice(0, 10));
    setError("");
    setModalOpen(true);
  }, []);

  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      const nameTrim = name.trim();
      const usernameTrim = username.trim().toLowerCase();
      if (!nameTrim) {
        setError("Name is required");
        return;
      }
      if (!usernameTrim) {
        setError("Username is required");
        return;
      }
      if (staff.some((s) => s.username.toLowerCase() === usernameTrim)) {
        setError("Username already exists");
        return;
      }
      setSubmitting(true);
      try {
        await dispatch(
          createStaff({
            name: nameTrim,
            username: usernameTrim,
            joinedDate: joinedDate || new Date().toISOString().slice(0, 10),
            isActive: true,
            payoutPerOrder: 30,
            bonusMilestones: DEFAULT_BONUS_MILESTONES,
          })
        ).unwrap();
        toast.success("Staff created");
        setModalOpen(false);
      } catch {
        setError("Failed to create staff");
        toast.error("Failed to create staff");
      } finally {
        setSubmitting(false);
      }
    },
    [name, username, joinedDate, staff, dispatch]
  );

  const toggleActive = useCallback(
    async (staffId: string, current: boolean) => {
      try {
        await dispatch(updateStaff({ id: staffId, patch: { isActive: !current } })).unwrap();
        toast.success(current ? "Staff set to inactive" : "Staff set to active");
      } catch {
        toast.error("Failed to update status");
      }
    },
    [dispatch]
  );

  const columns = useMemo(
    () => [
      {
        key: "name",
        header: "Staff Name",
        render: (row: { id: string; name: string }) => (
          <Link to={`/admin/staff/${row.id}`} className="font-medium text-primary hover:underline">
            {row.name}
          </Link>
        ),
      },
      {
        key: "joinedDate",
        header: "Joined",
        render: (row: { joinedDate: string }) => formatDate(row.joinedDate),
      },
      { key: "username", header: "Username" },
      {
        key: "isActive",
        header: "Status",
        render: (row: { id: string; isActive: boolean }) => (
          <button
            type="button"
            onClick={() => toggleActive(row.id, row.isActive)}
            className={
              "rounded-[var(--radius-sm)] px-2 py-1 text-xs font-medium " +
              (row.isActive
                ? "bg-success-bg text-success"
                : "bg-error-bg text-error")
            }
          >
            {row.isActive ? "Active" : "Inactive"}
          </button>
        ),
      },
    ],
    [toggleActive]
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Staff Management"
          subtitle="Toggle status to allow or block login. Inactive staff cannot log in."
          action={
            <Button onClick={openAdd}>Add Staff</Button>
          }
        />
        <Table
          columns={columns}
          data={staff}
          keyExtractor={(row) => row.id}
          emptyMessage="No staff."
        />
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Staff"
        size="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Priya Sharma"
          />
          <Input
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. priya.s (used for login)"
          />
          <Input
            label="Joined Date"
            type="date"
            value={joinedDate}
            onChange={(e) => setJoinedDate(e.target.value)}
          />
          {error && <p className="text-sm text-error">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" loading={submitting}>
              Create Staff
            </Button>
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default memo(StaffManagementPage);
