import { lazy } from "react";

/** Route-level code splitting — each import becomes its own async chunk. */
export const StaffDashboard = lazy(() => import("../pages/StaffDashboard"));
export const StaffProductStock = lazy(() => import("../pages/StaffProductStock"));
export const StaffRecentOrders = lazy(() => import("../pages/StaffRecentOrders"));
export const StaffMyProfile = lazy(() => import("../pages/StaffMyProfile"));
export const CreateOrder = lazy(() => import("../pages/CreateOrder"));
export const OrdersList = lazy(() => import("../pages/OrdersList"));
export const OrderDetail = lazy(() => import("../pages/OrderDetail"));
export const AdminDashboard = lazy(() => import("../pages/AdminDashboard"));
export const StaffManagement = lazy(() => import("../pages/StaffManagement"));
export const StaffRoleManagement = lazy(() => import("../pages/StaffRoleManagement"));
export const AssignedNumbersManagement = lazy(
  () => import("../pages/AssignedNumbersManagement"),
);
export const StaffProfile = lazy(() => import("../pages/StaffProfile"));
export const AdminOrderManagement = lazy(
  () => import("../pages/AdminOrderManagement"),
);
export const ProductManagement = lazy(() => import("../pages/ProductManagement"));
export const CategoryManagement = lazy(() => import("../pages/CategoryManagement"));
export const ExportData = lazy(() => import("../pages/ExportData"));
export const CustomerManagement = lazy(() => import("../pages/CustomerManagement"));
export const ChangePassword = lazy(() => import("../pages/ChangePassword"));
export const SenderManagement = lazy(() => import("../pages/SenderManagement"));
export const AdminSettings = lazy(() => import("../pages/AdminSettings"));
export const SalaryManagement = lazy(() => import("../pages/SalaryManagement"));
export const StaffPayrollLedger = lazy(() => import("../pages/StaffPayrollLedger"));
export const ProfitAnalytics = lazy(() => import("../pages/ProfitAnalytics"));
export const DeliveryManagement = lazy(() => import("../pages/DeliveryManagement"));
export const RolePermissions = lazy(() => import("../pages/RolePermissions"));
export const UserManagement = lazy(() => import("../pages/UserManagement"));
export const TrackingScanner = lazy(() => import("../pages/TrackingScanner"));
export const AdminBlogManagement = lazy(
  () => import("../pages/AdminBlogManagement"),
);
export const StaffBlog = lazy(() => import("../pages/StaffBlog"));
export const StaffBlogPost = lazy(() => import("../pages/StaffBlogPost"));
