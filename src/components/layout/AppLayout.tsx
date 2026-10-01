import { memo, useLayoutEffect, useState } from "react";
import { useLocation } from "react-router";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MainPane } from "./MainPane";
import type { User } from "../../types";

interface AppLayoutProps {
  user: User;
  onLogout: () => void;
  pageTitles?: Record<string, string>;
  children: React.ReactNode;
}

type ThemeMode = "light" | "dark";

const DEFAULT_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/orders": "Orders",
  "/orders/create": "Create Order",
  "/orders/:id": "Order Detail",
  "/profile": "Profile",
  "/vendor/profile": "My Profile",
  "/vendor/orders": "My Orders",
  "/vendor/products": "My Products",
  "/vendor/offers": "Offers",
  "/vendor/reviews": "Reviews",
  "/vendor/addons": "Add-ons",
  "/admin": "Admin Dashboard",
  "/admin/staff": "Staff Management",
  "/admin/staff/:id": "Staff Profile",
  "/admin/orders": "Order Management",
  "/admin/online-orders": "Online Orders",
  "/admin/vendor-orders": "Vendor Orders",
  "/admin/customers": "Customers",
  "/admin/categories": "Category Management",
  "/admin/subcategories": "Subcategory Management",
  "/admin/products": "Product Management",
  "/admin/vendor-products": "Vendor Products",
  "/admin/vendors/products": "Vendor Products",
  "/admin/vendors": "Vendors",
  "/admin/active-vendors": "Active Vendors",
  "/admin/delivery": "Delivery Management",
  "/admin/offers": "Offer Management",
  "/admin/addons": "Add-on Management",
  "/admin/salary": "Salary Management",
  "/admin/bonus-daily-logs": "Daily Bonus Logs",
  "/admin/sender": "Sender Management",
  "/admin/post-offices": "Post Office Management",
  "/admin/cod": "COD Management",
  "/admin/staff/assigned-numbers": "Assigned numbers",
  "/admin/export": "Export Data",
  "/admin/profit": "Profit analytics",
  "/admin/role-permissions": "Access control",
  "/admin/webapp-users": "Webapp Users",
  "/admin/users": "User Management",
  "/admin/reviews": "Reviews",
  "/admin/statistics": "Statistics",
  "/admin/settings": "Settings",
  "/admin/tracking-scan": "Tracking scan",
  "/tracking-scanner": "Tracking Scanner",
  "/account/password": "Change password",
  "/staff/orders/recent": "Recent Orders",
  "/staff/product-stock": "Product Stock",
  "/staff/payroll-ledger": "Payroll Ledger",
  "/staff/blog": "Blog Management",
  "/admin/blog": "Blog Management",
  "/enquiries": "Customer Enquiries",
};

const TABLE_SHOWING_PATHS = new Set([
  "/vendor/orders",
  "/vendor/products",
  "/vendor/offers",
  "/vendor/reviews",
  "/vendor/addons",
  "/orders",
  "/staff/orders/recent",
  "/staff/product-stock",
  "/staff/payroll-ledger",
  "/enquiries",
  "/admin/orders",
  "/admin/online-orders",
  "/admin/vendor-orders",
  "/admin/customers",
  "/admin/categories",
  "/admin/subcategories",
  "/admin/products",
  "/admin/vendor-products",
  "/admin/vendors/products",
  "/admin/vendors",
  "/admin/active-vendors",
  "/admin/staff",
  "/admin/delivery",
  "/admin/offers",
  "/admin/addons",
  "/admin/salary",
  "/admin/bonus-daily-logs",
  "/admin/sender",
  "/admin/post-offices",
  "/admin/cod",
  "/admin/role-permissions",
  "/admin/webapp-users",
  "/admin/users",
  "/admin/staff/assigned-numbers",
  "/admin/reviews",
]);

function isTableShowingPage(pathname: string): boolean {
  const clean = pathname.replace(/\/+$/, "") || "/";
  if (TABLE_SHOWING_PATHS.has(clean)) return true;
  if (
    clean.endsWith("/orders") ||
    clean.endsWith("/products") ||
    clean.endsWith("/categories") ||
    clean.endsWith("/subcategories") ||
    clean.endsWith("/customers") ||
    clean.endsWith("/vendors") ||
    clean.endsWith("/reviews") ||
    clean.endsWith("/addons")
  ) {
    return true;
  }
  return false;
}

function getTitle(pathname: string, pageTitles: Record<string, string>): string {
  const clean = pathname.replace(/\/+$/, "") || "/";
  const exact = pageTitles[clean] ?? DEFAULT_TITLES[clean];
  if (exact) return exact;
  if (clean.startsWith("/admin/staff/")) return "Staff Profile";
  if (clean.startsWith("/orders/") && clean !== "/orders/create") return "Order Detail";
  if (clean.startsWith("/enquiries/")) return "Enquiry Detail";
  if (clean.startsWith("/admin/blog/edit/")) return "Edit Blog Post";
  if (clean === "/admin/blog/create") return "Create Blog Post";
  if (clean.startsWith("/staff/blog/edit/")) return "Edit Blog Post";
  if (clean === "/staff/blog/create") return "Create Blog Post";

  // Dynamic fallback: derive title from last URL segment formatted cleanly
  const segments = clean.split("/").filter(Boolean);
  if (segments.length > 0) {
    const last = segments[segments.length - 1];
    return last
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  return "Pillipot";
}

function AppLayoutComponent({
  user,
  onLogout,
  pageTitles = {},
  children,
}: AppLayoutProps) {
  const location = useLocation();
  const isTablePage = isTableShowingPage(location.pathname);
  const titles = { ...DEFAULT_TITLES, ...pageTitles };
  const title = getTitle(location.pathname, titles);
  const roleLabel =
    user.role === "super_admin"
      ? "Super Admin"
      : user.role === "guest"
        ? "Guest"
        : user.role === "vendor"
          ? "Vendor"
          : "Staff";

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "light";
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem("eden_theme");
    } catch {
      saved = null;
    }
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-theme", themeMode);
    document.documentElement.style.colorScheme = themeMode;
    try {
      window.localStorage.setItem("eden_theme", themeMode);
    } catch {
      // ignore storage write errors
    }
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <div className="admin-shell-noise relative flex h-[100dvh] min-h-0 overflow-hidden bg-surface-alt">
      <div className="admin-glow-orb left-[-5rem] top-[-4rem] h-40 w-40 bg-sky-300/30 sm:h-56 sm:w-56" />
      <div className="admin-glow-orb bottom-[12%] right-[-5rem] h-44 w-44 bg-blue-500/20 sm:h-64 sm:w-64" />
      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px] transition-opacity md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      <div className="shrink-0 max-md:w-0 max-md:min-w-0 max-md:overflow-visible">
        <Sidebar
          user={user}
          onLogout={onLogout}
          mobileOpen={mobileMenuOpen}
          setMobileOpen={setMobileMenuOpen}
        />
      </div>
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          title={title}
          user={user}
          userDisplayName={user.name}
          userRole={roleLabel}
          onMenuClick={() => setMobileMenuOpen(true)}
          themeMode={themeMode}
          onToggleTheme={toggleTheme}
        />
        <main
          className={
            isTablePage
              ? "flex-1 overflow-y-auto overflow-x-hidden p-0"
              : "flex-1 overflow-y-auto overflow-x-hidden px-[max(0.625rem,env(safe-area-inset-left))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 pr-[max(0.625rem,env(safe-area-inset-right))] sm:px-[max(1rem,env(safe-area-inset-left))] sm:pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pt-5 sm:pr-[max(1rem,env(safe-area-inset-right))] md:px-[max(1.5rem,env(safe-area-inset-left))] md:pb-[max(1.5rem,env(safe-area-inset-bottom))] md:pt-6 md:pr-[max(1.5rem,env(safe-area-inset-right))]"
          }
        >
          <div className={isTablePage ? "w-full" : "mx-auto w-full max-w-[1700px]"}>
            <MainPane>{children}</MainPane>
          </div>
        </main>
      </div>
    </div>
  );
}

export const AppLayout = memo(AppLayoutComponent);
