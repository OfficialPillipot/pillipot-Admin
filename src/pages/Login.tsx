import { memo, useState, useCallback } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";
import { Button, Input, Card, Modal } from "../components/ui";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";
import { toast } from "../lib/toast";

function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotSubmitting, setForgotSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/";

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setSubmitting(true);
      try {
        const result = await login(username.trim(), password);
        if (!result.ok) {
          setError(result.message);
          return;
        }
      } finally {
        setSubmitting(false);
      }
    },
    [login, username, password]
  );

  const handleForgotOpen = useCallback(() => {
    setForgotUsername(username.trim());
    setForgotError("");
    setForgotOpen(true);
  }, [username]);

  const handleForgotSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setForgotError("");
      const trimmed = forgotUsername.trim().toLowerCase();
      if (!trimmed) {
        setForgotError("Enter your username");
        return;
      }
      setForgotSubmitting(true);
      try {
        const res = await api.post<{ message: string }>(
          endpoints.authForgotPassword,
          { username: trimmed }
        );
        toast.success(res.message);
        setForgotOpen(false);
        setForgotUsername("");
      } catch (err) {
        setForgotError(
          err instanceof Error ? err.message : "Something went wrong"
        );
      } finally {
        setForgotSubmitting(false);
      }
    },
    [forgotUsername]
  );

  if (isAuthenticated && user) {
    if (user.mustChangePassword) {
      return <Navigate to="/account/password" replace state={{ from: location }} />;
    }
    const redirect = user.role === "super_admin" ? "/admin" : "/";
    return <Navigate to={from === "/login" ? redirect : from} replace />;
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-slate-100 via-surface-alt to-primary-muted/40 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] sm:p-6">
      <Card className="w-full max-w-md shadow-[var(--shadow-card-lg)]" padding="lg">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Edenecart
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-text-heading sm:text-2xl">
            Order management
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Sign in to your account
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Your username"
            autoComplete="username"
            autoFocus
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
          />
          {error && (
            <p className="text-sm text-error">{error}</p>
          )}
          <div className="flex flex-col gap-2  sm:items-stretch">
            <Button
              type="submit"
              size="lg"
              loading={submitting}
              className="sm:flex-1 sm:flex-row cursor-pointer"
            >
              Sign in
            </Button>
            <div
              onClick={handleForgotOpen}
              className="w-full text-right "
            ><span className="cursor-pointer hover:text-blue-500">
                Forgot password
              </span>
            </div>
          </div>
        </form>

      </Card>

      <Modal
        isOpen={forgotOpen}
        onClose={() => {
          if (!forgotSubmitting) setForgotOpen(false);
        }}
        title="Forgot password"
        size="sm"
      >
        <form onSubmit={handleForgotSubmit} className="space-y-4">
          <p className="text-sm text-text-muted">
            Enter your staff username. If it matches an active account, a reset request is
            sent to your administrator.
          </p>
          <Input
            label="Username"
            value={forgotUsername}
            onChange={(e) => setForgotUsername(e.target.value)}
            placeholder="Your username"
            autoComplete="username"
            autoFocus
          />
          {forgotError && (
            <p className="text-sm text-error">{forgotError}</p>
          )}
          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="secondary"
              disabled={forgotSubmitting}
              onClick={() => setForgotOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={forgotSubmitting}>
              OK
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default memo(LoginPage);
