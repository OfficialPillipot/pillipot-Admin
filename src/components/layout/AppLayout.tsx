import { memo, useState } from "react";
import { useLocation } from "react-router";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import type { User } from "../../types";

interface AppLayoutProps {
  user: User;
  onLogout: () => void;
  pageTitles?: Record<string, string>;
  children: React.ReactNode;
}

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
  "/admin/products": "Product Management",
  "/admin/export": "Export Data",
  "/account/password": "Change password",
};

function getTitle(pathname: string, pageTitles: Record<string, string>): string {
  const exact = pageTitles[pathname] ?? DEFAULT_TITLES[pathname];
  if (exact) return exact;
  if (pathname.startsWith("/admin/staff/")) return "Staff Profile";
  if (pathname.startsWith("/orders/") && pathname !== "/orders/create")
    return "Order Detail";
  return "Edenecart";
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
  const roleLabel = user.role === "super_admin" ? "Super Admin" : "Staff";
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      <Sidebar
        role={user.role}
        onLogout={onLogout}
        mobileOpen={mobileMenuOpen}
        setMobileOpen={setMobileMenuOpen}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          title={title}
          userDisplayName={user.name}
          userRole={roleLabel}
          onMenuClick={() => setMobileMenuOpen(true)}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-[max(0.75rem,env(safe-area-inset-left))] pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 pr-[max(0.75rem,env(safe-area-inset-right))] sm:px-[max(1rem,env(safe-area-inset-left))] sm:pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pt-5 sm:pr-[max(1rem,env(safe-area-inset-right))] md:px-[max(1.5rem,env(safe-area-inset-left))] md:pb-[max(1.5rem,env(safe-area-inset-bottom))] md:pt-6 md:pr-[max(1.5rem,env(safe-area-inset-right))]">
          <div className="mx-auto w-full max-w-[90rem]">{children}</div>
        </main>
      </div>
    </div>
  );
}

export const AppLayout = memo(AppLayoutComponent);
