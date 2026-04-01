import { Routes, Route, Navigate } from "react-router";
import { ProtectedRoute } from "../components/auth";
import type { User } from "../types";
import StaffDashboard from "../pages/StaffDashboard";
import StaffProductStock from "../pages/StaffProductStock";
import StaffRecentOrders from "../pages/StaffRecentOrders";
import StaffMyProfile from "../pages/StaffMyProfile";
import CreateOrder from "../pages/CreateOrder";
import OrdersList from "../pages/OrdersList";
import OrderDetail from "../pages/OrderDetail";
import AdminDashboard from "../pages/AdminDashboard";
import StaffManagement from "../pages/StaffManagement";
import StaffRoleManagement from "../pages/StaffRoleManagement";
import AssignedNumbersManagement from "../pages/AssignedNumbersManagement";
import StaffProfile from "../pages/StaffProfile";
import AdminOrderManagement from "../pages/AdminOrderManagement";
import ProductManagement from "../pages/ProductManagement";
import CategoryManagement from "../pages/CategoryManagement";
import ExportData from "../pages/ExportData";
import CustomerManagement from "../pages/CustomerManagement";
import ChangePassword from "../pages/ChangePassword";
import SenderManagement from "../pages/SenderManagement";
import AdminSettings from "../pages/AdminSettings";
import SalaryManagement from "../pages/SalaryManagement";
import ProfitAnalytics from "../pages/ProfitAnalytics";
import DeliveryManagement from "../pages/DeliveryManagement";
import RolePermissions from "../pages/RolePermissions";
import UserManagement from "../pages/UserManagement";
import TrackingScanner from "../pages/TrackingScanner";

interface LayoutRoutesProps {
  user: User;
}

export function LayoutRoutes({ user }: LayoutRoutesProps) {
  return (
    <Routes>
      {/* Staff routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <StaffDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/stock"
        element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <StaffProductStock />
          </ProtectedRoute>
        }
      />
      <Route
        path="/recent-orders"
        element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <StaffRecentOrders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders"
        element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <OrdersList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders/create"
        element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <CreateOrder />
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders/:id"
        element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <OrderDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <StaffMyProfile />
          </ProtectedRoute>
        }
      />
      {/* Admin shell: super_admin + guest (API enforces fine-grained permissions) */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["super_admin", "guest"]}>
            <AdminDashboard />
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
            <StaffManagement />
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
            <StaffRoleManagement />
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
            <AssignedNumbersManagement />
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
            <StaffProfile />
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
            <AdminOrderManagement />
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
            <TrackingScanner />
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
            <CustomerManagement />
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
            <CategoryManagement />
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
            <DeliveryManagement />
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
            <ProductManagement />
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
            <ExportData />
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
            <SenderManagement />
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
            <SalaryManagement />
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
            <ProfitAnalytics />
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
            <AdminSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/role-permissions"
        element={
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <RolePermissions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <UserManagement />
          </ProtectedRoute>
        }
      />
      <Route path="/account/password" element={<ChangePassword />} />
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
  );
}
