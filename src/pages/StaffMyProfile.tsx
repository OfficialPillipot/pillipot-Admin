import { memo, useCallback, useState } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  fetchStaffMe,
  requestMyPasswordReset,
  selectStaffMe,
  selectStaffMeLoading,
} from "../store/staffSlice";
import { Card, CardHeader, Button, Badge } from "../components/ui";
import { formatDate } from "../lib/orderUtils";
import { staffJobRoleLabel } from "../lib/staffJobRoles";
import { toast } from "../lib/toast";

function StaffMyProfilePage() {
  const dispatch = useAppDispatch();
  const profile = useAppSelector(selectStaffMe);
  const loading = useAppSelector(selectStaffMeLoading);
  const [requesting, setRequesting] = useState(false);

  const handleRequestReset = useCallback(async () => {
    setRequesting(true);
    try {
      await dispatch(requestMyPasswordReset()).unwrap();
      toast.success(
        "Request sent. A super admin will reset your password and share a new temporary password with you."
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not submit request");
    } finally {
      setRequesting(false);
    }
  }, [dispatch]);

  if (loading && !profile) {
    return <div className="text-text-muted">Loading…</div>;
  }

  if (!profile) {
    return (
      <div className="space-y-4">
        <p className="text-text-muted">Could not load your profile.</p>
        <Button type="button" variant="secondary" onClick={() => void dispatch(fetchStaffMe())}>
          Retry
        </Button>
      </div>
    );
  }

  const pending = profile.pendingPasswordResetRequest;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <CardHeader title="My profile" subtitle="Your account details" />

      <Card>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-text-muted">Name</dt>
            <dd className="font-medium text-text-heading">{profile.name}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-muted">Username</dt>
            <dd className="font-medium text-text-heading">{profile.username}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-muted">Phone</dt>
            <dd className="font-medium text-text-heading">{profile.phone || "—"}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-muted">Joined</dt>
            <dd className="font-medium text-text-heading">
              {formatDate(profile.joinedDate)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-muted">Job type</dt>
            <dd className="font-medium text-text-heading">
              {staffJobRoleLabel(profile.jobRole)}
            </dd>
          </div>
        </dl>
      </Card>

      <Card>
        <CardHeader title="Password reset request" />
        <p className="text-sm text-text-muted">
          Ask your administrator for a new temporary password. Your request appears in
          Staff Management until they complete it.
        </p>
        {pending ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge variant="warning">Request pending</Badge>
            <span className="text-xs text-text-muted">
              Submitted {formatDate(pending.createdAt)}
            </span>
          </div>
        ) : (
          <div className="mt-4">
            <Button
              type="button"
              variant="secondary"
              loading={requesting}
              onClick={() => void handleRequestReset()}
            >
              Request password reset
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

export default memo(StaffMyProfilePage);
