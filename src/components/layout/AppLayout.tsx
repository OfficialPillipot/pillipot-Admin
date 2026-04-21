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
  "/orders": "My Orders",
  "/orders/create": "Create Order",
  "/orders/:id": "Order Detail",
  "/profile": "Profile",
  "/admin": "Admin Dashboard",
  "/admin/staff": "Staff Management",
  "/admin/staff/:id": "Staff Profile",
  "/admin/orders": "Order Management",
  "/admin/customers": "Customers",
  "/admin/categories": "Category Management",
  "/admin/subcategories": "Subcategory Management",
  "/admin/products": "Product Management",
  "/admin/staff/assigned-numbers": "Assigned numbers",
  "/admin/export": "Export Data",
  "/admin/profit": "Profit analytics",
  "/admin/role-permissions": "Access control",
  "/account/password": "Change password",
};

function getTitle(pathname: string, pageTitles: Record<string, string>): string {
  const exact = pageTitles[pathname] ?? DEFAULT_TITLES[pathname];
  if (exact) return exact;
  if (pathname.startsWith("/admin/staff/")) return "Staff Profile";
  if (pathname.startsWith("/orders/") && pathname !== "/orders/create")
    return "Order Detail";
  return "Pillipot";
}

function AppLayoutComponent({
  user,
  onLogout,
  pageTitles = {},
  children,
}: AppLayoutProps) {
  const location = useLocation();
  const titles = { ...DEFAULT_TITLES, ...pageTitles };
  const title = getTitle(location.pathname, titles);
  const roleLabel =
    user.role === "super_admin"
      ? "Super Admin"
      : user.role === "guest"
        ? "Guest"
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
    <div className="flex h-[100dvh] min-h-0 overflow-hidden bg-surface-alt">
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
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          title={title}
          user={user}
          userDisplayName={user.name}
          userRole={roleLabel}
          onMenuClick={() => setMobileMenuOpen(true)}
          themeMode={themeMode}
          onToggleTheme={toggleTheme}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-[max(0.625rem,env(safe-area-inset-left))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 pr-[max(0.625rem,env(safe-area-inset-right))] sm:px-[max(1rem,env(safe-area-inset-left))] sm:pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pt-5 sm:pr-[max(1rem,env(safe-area-inset-right))] md:px-[max(1.5rem,env(safe-area-inset-left))] md:pb-[max(1.5rem,env(safe-area-inset-bottom))] md:pt-6 md:pr-[max(1.5rem,env(safe-area-inset-right))]">
          <div className="w-full max-w-none">
            <MainPane>{children}</MainPane>
          </div>
        </main>
      </div>
    </div>
  );
}

export const AppLayout = memo(AppLayoutComponent);
