import { memo, useCallback, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";
import { Card, CardHeader, Button, Input } from "../components/ui";
import { toast } from "../lib/toast";

function ChangePasswordPage() {
  const { user, isAuthenticated, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const afterSuccess = useCallback(async () => {
    await refreshUser();
    toast.success("Password updated");
    if (user?.role === "super_admin") navigate("/admin", { replace: true });
    else navigate("/", { replace: true });
  }, [refreshUser, navigate, user?.role]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      if (newPassword.length < 8) {
        setError("New password must be at least 8 characters");
        return;
      }
      if (newPassword !== confirm) {
        setError("New password and confirmation do not match");
        return;
      }
      setSubmitting(true);
      try {
        await api.post(endpoints.authChangePassword, {
          currentPassword,
          newPassword,
        });
        await afterSuccess();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update password");
      } finally {
        setSubmitting(false);
      }
    },
    [currentPassword, newPassword, confirm, afterSuccess]
  );

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const required = user.mustChangePassword === true;

  return (
    <div className="mx-auto max-w-md py-8">
      <Card>
        <CardHeader
          title={required ? "Set your password" : "Change password"}
          subtitle={
            required
              ? "Your admin shared a temporary password. Choose a new one to continue."
              : "Update your account password."
          }
        />
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Current password"
            type={showCurrent ? "text" : "password"}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
            endNode={
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="focus:outline-none"
                aria-label={showCurrent ? "Hide password" : "Show password"}
              >
                {showCurrent ? (
                  <EyeSlashIcon className="h-5 w-5 hover:text-text" />
                ) : (
                  <EyeIcon className="h-5 w-5 hover:text-text" />
                )}
              </button>
            }
          />
          <Input
            label="New password"
            type={showNew ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            endNode={
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="focus:outline-none"
                aria-label={showNew ? "Hide password" : "Show password"}
              >
                {showNew ? (
                  <EyeSlashIcon className="h-5 w-5 hover:text-text" />
                ) : (
                  <EyeIcon className="h-5 w-5 hover:text-text" />
                )}
              </button>
            }
          />
          <Input
            label="Confirm new password"
            type={showConfirmPass ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
            endNode={
              <button
                type="button"
                onClick={() => setShowConfirmPass(!showConfirmPass)}
                className="focus:outline-none"
                aria-label={showConfirmPass ? "Hide password" : "Show password"}
              >
                {showConfirmPass ? (
                  <EyeSlashIcon className="h-5 w-5 hover:text-text" />
                ) : (
                  <EyeIcon className="h-5 w-5 hover:text-text" />
                )}
              </button>
            }
          />
          {error && <p className="text-sm text-error">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={submitting}>
              Save password
            </Button>
            {!required && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>
            )}
            {required && (
              <Button type="button" variant="secondary" onClick={() => logout()}>
                Sign out
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}

export default memo(ChangePasswordPage);
