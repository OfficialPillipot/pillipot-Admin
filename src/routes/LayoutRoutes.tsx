import { Routes, Route, Navigate } from "react-router";
import { ProtectedRoute } from "../components/auth";
import type { User } from "../types";
import StaffDashboard from "../pages/StaffDashboard";
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
      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/staff"
        element={
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <StaffManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/staff/roles"
        element={
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <StaffRoleManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/staff/assigned-numbers"
        element={
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <AssignedNumbersManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/staff/:id"
        element={
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <StaffProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/orders"
        element={
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <AdminOrderManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/customers"
        element={
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <CustomerManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/categories"
        element={
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <CategoryManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/products"
        element={
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <ProductManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/export"
        element={
          <ProtectedRoute allowedRoles={["super_admin"]}>
            <ExportData />
          </ProtectedRoute>
        }
      />
      <Route path="/account/password" element={<ChangePassword />} />
      <Route
        path="*"
        element={
          <Navigate
            to={user.role === "super_admin" ? "/admin" : "/"}
            replace
          />
        }
      />
    </Routes>
  );
}
