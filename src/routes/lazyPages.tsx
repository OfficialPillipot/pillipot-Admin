import { lazy, type ComponentType } from "react";

/**
 * Lazy route with one retry — helps transient Vite chunk / network failures that
 * often clear after a refresh.
 */
function lazyRoute<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch {
      await new Promise((r) => setTimeout(r, 200));
      return factory();
    }
  });
}

/** Route-level code splitting — each import becomes its own async chunk. */
export const StaffDashboard = lazyRoute(() => import("../pages/StaffDashboard"));
export const StaffProductStock = lazyRoute(
  () => import("../pages/StaffProductStock"),
);
export const StaffRecentOrders = lazyRoute(
  () => import("../pages/StaffRecentOrders"),
);
export const StaffMyProfile = lazyRoute(() => import("../pages/StaffMyProfile"));
export const CreateOrder = lazyRoute(() => import("../pages/CreateOrder"));
export const OrdersList = lazyRoute(() => import("../pages/OrdersList"));
export const OrderDetail = lazyRoute(() => import("../pages/OrderDetail"));
export const AdminDashboard = lazyRoute(() => import("../pages/AdminDashboard"));
export const StaffManagement = lazyRoute(() => import("../pages/StaffManagement"));
export const StaffRoleManagement = lazyRoute(
  () => import("../pages/StaffRoleManagement"),
);
export const AssignedNumbersManagement = lazyRoute(
  () => import("../pages/AssignedNumbersManagement"),
);
export const StaffProfile = lazyRoute(() => import("../pages/StaffProfile"));
export const AdminOrderManagement = lazyRoute(
  () => import("../pages/AdminOrderManagement"),
);
export const ProductManagement = lazyRoute(
  () => import("../pages/ProductManagement"),
);
export const CategoryManagement = lazyRoute(
  () => import("../pages/CategoryManagement"),
);
export const ExportData = lazyRoute(() => import("../pages/ExportData"));
export const CustomerManagement = lazyRoute(
  () => import("../pages/CustomerManagement"),
);
export const ChangePassword = lazyRoute(() => import("../pages/ChangePassword"));
export const SenderManagement = lazyRoute(
  () => import("../pages/SenderManagement"),
);
export const AdminSettings = lazyRoute(() => import("../pages/AdminSettings"));
export const SalaryManagement = lazyRoute(() => import("../pages/SalaryManagement"));
export const StaffPayrollLedger = lazyRoute(
  () => import("../pages/StaffPayrollLedger"),
);
export const ProfitAnalytics = lazyRoute(() => import("../pages/ProfitAnalytics"));
export const DeliveryManagement = lazyRoute(
  () => import("../pages/DeliveryManagement"),
);
export const RolePermissions = lazyRoute(() => import("../pages/RolePermissions"));
export const UserManagement = lazyRoute(() => import("../pages/UserManagement"));
export const TrackingScanner = lazyRoute(() => import("../pages/TrackingScanner"));
export const AdminBlogManagement = lazyRoute(
  () => import("../pages/AdminBlogManagement"),
);
export const StaffBlog = lazyRoute(() => import("../pages/StaffBlog"));
export const StaffBlogPost = lazyRoute(() => import("../pages/StaffBlogPost"));
export const StaffEnquiries = lazyRoute(() => import("../pages/StaffEnquiries"));
export const StaffEnquiryDetail = lazyRoute(
  () => import("../pages/StaffEnquiryDetail"),
);
export const AdminStaffEnquiries = lazyRoute(
  () => import("../pages/AdminStaffEnquiries"),
);
export const AdminStaffEnquiryDetail = lazyRoute(
  () => import("../pages/AdminStaffEnquiryDetail"),
);
