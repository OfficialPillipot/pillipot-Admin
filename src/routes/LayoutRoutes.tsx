import { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router";
import { ProtectedRoute } from "../components/auth";
import type { User } from "../types";
import * as Pages from "./lazyPages";

interface LayoutRoutesProps {
  user: User;
}

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-text-muted">
      Loading…
    </div>
  );
}

export function LayoutRoutes({ user }: LayoutRoutesProps) {
  return (
    <Suspense fallback={<RouteFallback />}>
    <Routes>
      {/* Staff routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <Pages.StaffDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/stock"
        element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <Pages.StaffProductStock />
          </ProtectedRoute>
        }
      />
      <Route
        path="/recent-orders"
        element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <Pages.StaffRecentOrders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders"
        element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <Pages.OrdersList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders/create"
        element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <Pages.CreateOrder />
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders/:id"
        element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <Pages.OrderDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <Pages.StaffMyProfile />
          </ProtectedRoute>
        }
      />
      {/* Admin shell: super_admin + guest (API enforces fine-grained permissions) */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["super_admin", "guest"]}>
            <Pages.AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/staff"
        element={
          <ProtectedRoute
            allowedRoles={["super_admin", "guest"]}
            requiredPermissions={["staff.view"]}
          >
            <Pages.StaffManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/staff/roles"
        element={
          <ProtectedRoute
            allowedRoles={["super_admin", "guest"]}
            requiredPermissions={["staff_positions.view"]}
          >
            <Pages.StaffRoleManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/staff/assigned-numbers"
        element={
          <ProtectedRoute
            allowedRoles={["super_admin", "guest"]}
            requiredPermissions={["assigned_numbers.view"]}
          >
            <Pages.AssignedNumbersManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/staff/:id"
        element={
          <ProtectedRoute
            allowedRoles={["super_admin", "guest"]}
            requiredPermissions={["staff.view"]}
          >
            <Pages.StaffProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/orders"
        element={
          <ProtectedRoute
            allowedRoles={["super_admin", "guest"]}
            requiredPermissions={["orders.view"]}
          >
            <Pages.AdminOrderManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/tracking-scan"
        element={
          <ProtectedRoute
            allowedRoles={["super_admin", "guest"]}
            requiredPermissions={["orders.update"]}
          >
            <Pages.TrackingScanner />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/customers"
        element={
          <ProtectedRoute
            allowedRoles={["super_admin", "guest"]}
            requiredPermissions={["customers.view"]}
          >
            <Pages.CustomerManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/categories"
        element={
          <ProtectedRoute
            allowedRoles={["super_admin", "guest"]}
            requiredPermissions={["categories.view"]}
          >
            <Pages.CategoryManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/delivery"
        element={
          <ProtectedRoute
            allowedRoles={["super_admin", "guest"]}
            requiredPermissions={["deliveries.view"]}
          >
            <Pages.DeliveryManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/products"
        element={
          <ProtectedRoute
            allowedRoles={["super_admin", "guest"]}
            requiredPermissions={["products.view"]}
          >
            <Pages.ProductManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/export"
        element={
          <ProtectedRoute
            allowedRoles={["super_admin", "guest"]}
            requiredPermissions={["customers.view"]}
          >
            <Pages.ExportData />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/senders"
        element={
          <ProtectedRoute
            allowedRoles={["super_admin", "guest"]}
            requiredPermissions={["senders.view"]}
          >
            <Pages.SenderManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/salary"
        element={
          <ProtectedRoute
            allowedRoles={["super_admin", "guest"]}
            requiredPermissions={["staff.view"]}
          >
            <Pages.SalaryManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/profit"
        element={
          <ProtectedRoute
            allowedRoles={["super_admin", "guest"]}
            requiredPermissions={["profit.view"]}
          >
            <Pages.ProfitAnalytics />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute
            allowedRoles={["super_admin", "guest"]}
            requiredPermissions={["settings.view"]}
          >
            <Pages.AdminSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/role-permissions"
        element={
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <Pages.RolePermissions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <Pages.UserManagement />
          </ProtectedRoute>
        }
      />
      <Route path="/account/password" element={<Pages.ChangePassword />} />
      <Route
        path="*"
        element={
          <Navigate
            to={user.role === "staff" ? "/" : "/admin"}
            replace
          />
        }
      />
    </Routes>
    </Suspense>
  );
}
