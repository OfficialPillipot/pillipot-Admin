import { memo } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { hasEveryPermission } from "../../lib/permissions";
import type { UserRole } from "../../types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  /** If set, user must have every listed permission (super admin always passes). */
  requiredPermissions?: string[];
}

function ProtectedRouteComponent({
  children,
  allowedRoles,
  requiredPermissions,
}: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    const redirect = user.role === "staff" || user.role === "vendor" ? "/" : "/admin";
    return <Navigate to={redirect} replace />;
  }

  if (
    requiredPermissions &&
    requiredPermissions.length > 0 &&
    !hasEveryPermission(user, requiredPermissions)
  ) {
    const permRedirect = user.role === "staff" || user.role === "vendor" ? "/" : "/admin";
    return <Navigate to={permRedirect} replace />;
  }

  return <>{children}</>;
}

export const ProtectedRoute = memo(ProtectedRouteComponent);
