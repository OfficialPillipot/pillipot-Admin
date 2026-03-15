import { memo, useState, useCallback } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useAppSelector } from "../store/hooks";
import { selectStaff } from "../store/staffSlice";
import { MOCK_USERS } from "../data/mockData";
import { Button, Input, Card } from "../components/ui";

function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const staff = useAppSelector(selectStaff);
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/";

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      if (!username.trim()) {
        setError("Enter username");
        return;
      }
      const found = MOCK_USERS.find(
        (u) => u.username.toLowerCase() === username.trim().toLowerCase()
      );
      const isStaffActive =
        found?.role === "staff" && found.staffId
          ? staff.find((s) => s.id === found.staffId)?.isActive ?? true
          : true;
      const ok = login(username.trim(), password, { isStaffActive });
      if (!ok) {
        setError(
          found && isStaffActive === false
            ? "This account is inactive. Contact admin."
            : "Invalid username. Try: admin, priya.s, rahul.k, anita.n"
        );
      }
    },
    [login, username, password, staff]
  );

  if (isAuthenticated && user) {
    const redirect = user.role === "super_admin" ? "/admin" : "/";
    return <Navigate to={from === "/login" ? redirect : from} replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-alt p-4">
      <Card className="w-full max-w-md" padding="lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-text-heading">
            Edenecart Order Management
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Sign in to continue
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. admin or priya.s"
            autoComplete="username"
            autoFocus
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Any for demo"
            autoComplete="current-password"
          />
          {error && (
            <p className="text-sm text-error">{error}</p>
          )}
          <Button type="submit" fullWidth size="lg">
            Sign in
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-text-muted">
          Demo: admin / priya.s / rahul.k / anita.n (any password)
        </p>
      </Card>
    </div>
  );
}

export default memo(LoginPage);
