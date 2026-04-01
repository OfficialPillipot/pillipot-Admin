import { memo, useState, useCallback, useMemo } from "react";
import { NavLink } from "react-router";
import {
  HomeIcon,
  DocumentPlusIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  CubeIcon,
  Squares2X2Icon,
  TagIcon,
  ArrowDownTrayIcon,
  ArrowLeftOnRectangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  KeyIcon,
  UserCircleIcon,
  UserGroupIcon,
  HashtagIcon,
  BriefcaseIcon,
  TruckIcon,
  Cog6ToothIcon,
  CurrencyRupeeIcon,
  PaperAirplaneIcon,
  ArchiveBoxIcon,
  ClockIcon,
  PresentationChartLineIcon,
  ShieldCheckIcon,
  IdentificationIcon,
  QrCodeIcon,
} from "@heroicons/react/24/outline";
import { Tooltip } from "../ui";
import type { User } from "../../types";
import { hasPermission } from "../../lib/permissions";

const SIDEBAR_COLLAPSED_KEY = "edenecart_sidebar_collapsed";

interface StaffNavItem {
  to: string;
  label: string;
  end?: boolean;
  icon: React.ComponentType<{ className?: string }>;
}

interface AdminNavItem {
  to: string;
  label: string;
  end?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  /** If set, user must have this permission (super admin always sees the link). */
  permission?: string;
  /** Only shown to super_admin (e.g. RBAC editor). */
  superAdminOnly?: boolean;
}

const STAFF_NAV: StaffNavItem[] = [
  { to: "/", label: "Dashboard", end: true, icon: HomeIcon },
  { to: "/orders/create", label: "Create Order", end: true, icon: DocumentPlusIcon },
  { to: "/orders", label: "My Orders", end: true, icon: ClipboardDocumentListIcon },
  { to: "/stock", label: "Product stock", end: true, icon: ArchiveBoxIcon },
  { to: "/recent-orders", label: "Recent orders", end: true, icon: ClockIcon },
  { to: "/profile", label: "Profile", end: true, icon: UserCircleIcon },
  { to: "/account/password", label: "Change password", end: true, icon: KeyIcon },
];

const ADMIN_NAV: AdminNavItem[] = [
  { to: "/admin", label: "Dashboard", end: true, icon: HomeIcon },
  { to: "/admin/orders", label: "Orders", end: true, icon: CubeIcon, permission: "orders.view" },
  {
    to: "/admin/tracking-scan",
    label: "Tracking scan",
    end: true,
    icon: QrCodeIcon,
    permission: "orders.update",
  },
  { to: "/admin/salary", label: "Salary", end: true, icon: CurrencyRupeeIcon, permission: "staff.view" },
  { to: "/admin/profit", label: "Profit", end: true, icon: PresentationChartLineIcon, permission: "profit.view" },
  { to: "/admin/staff", label: "Staff", end: true, icon: UsersIcon, permission: "staff.view" },
  { to: "/admin/products", label: "Products", end: true, icon: Squares2X2Icon, permission: "products.view" },
  { to: "/admin/customers", label: "Customers", end: true, icon: UserGroupIcon, permission: "customers.view" },
  { to: "/admin/staff/assigned-numbers", label: "Assigned numbers", end: true, icon: HashtagIcon, permission: "assigned_numbers.view" },
  { to: "/admin/categories", label: "Categories", end: true, icon: TagIcon, permission: "categories.view" },
  { to: "/admin/delivery", label: "Delivery", end: true, icon: PaperAirplaneIcon, permission: "deliveries.view" },
  { to: "/admin/senders", label: "Senders", end: true, icon: TruckIcon, permission: "senders.view" },
  { to: "/admin/staff/roles", label: "Staff roles", end: true, icon: BriefcaseIcon, permission: "staff_positions.view" },
  { to: "/account/password", label: "Change password", end: true, icon: KeyIcon },
  { to: "/admin/export", label: "Export Data", end: true, icon: ArrowDownTrayIcon, permission: "customers.view" },
  { to: "/admin/settings", label: "Settings", end: true, icon: Cog6ToothIcon, permission: "settings.view" },
  {
    to: "/admin/users",
    label: "Users",
    end: true,
    icon: IdentificationIcon,
    superAdminOnly: true,
  },
  {
    to: "/admin/role-permissions",
    label: "Access control",
    end: true,
    icon: ShieldCheckIcon,
    superAdminOnly: true,
  },
];

function getStoredCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

function setStoredCollapsed(value: boolean) {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, value ? "true" : "false");
  } catch {
    /* storage unavailable */
  }
}

interface SidebarProps {
  user: User;
  onLogout: () => void;
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}

function SidebarComponent({ user, onLogout, mobileOpen, setMobileOpen }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(getStoredCollapsed);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      setStoredCollapsed(next);
      return next;
    });
  }, []);

  const handleMobileNavClick = () => {
    if (setMobileOpen) setMobileOpen(false);
  };

  const navItems = useMemo(() => {
    if (user.role === "staff") return STAFF_NAV;
    return ADMIN_NAV.filter((item) => {
      if (item.superAdminOnly && user.role !== "super_admin") return false;
      if (item.permission && !hasPermission(user, item.permission)) return false;
      return true;
    });
  }, [user]);

  const linkBase =
    "flex min-h-10 items-center gap-2 rounded-[var(--radius-md)] border-l-2 border-transparent py-1.5 pl-2 pr-2.5 text-xs font-medium transition-colors max-md:gap-2.5 md:min-h-0 md:gap-3 md:py-2 md:pl-2.5 md:pr-3 md:text-sm ";
  const linkActive =
    "border-l-sidebar-accent bg-white/[0.08] text-sidebar-text-active md:bg-white/[0.06]";
  const linkInactive =
    "text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active";



  return (
    <aside
      className={
        "flex h-full flex-col bg-sidebar-bg text-sidebar-text transition-[transform,width] duration-300 ease-out z-50 " +
        "max-md:shadow-[4px_0_24px_rgba(15,23,42,0.12)] " +
        "fixed inset-y-0 left-0 transform md:relative md:translate-x-0 md:shadow-none " +
        (mobileOpen ? "translate-x-0 " : "-translate-x-full ") +
        (collapsed ? "w-[min(16rem,85vw)] md:w-[4.5rem] " : "w-[min(16rem,85vw)] md:w-56 lg:w-64 ")
      }
    >
      <div
        className={`flex h-14 shrink-0 items-center border-b border-sidebar-hover/80 px-2 pl-[max(0.5rem,env(safe-area-inset-left))] ${collapsed ? "md:justify-center justify-between" : "justify-between"}`}
      >
        <div className={`flex min-w-0 items-center gap-2 px-1 ${collapsed ? "md:hidden" : ""}`}>
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-sidebar-accent/20 text-xs font-bold text-sidebar-accent"
            aria-hidden
          >
            E
          </span>
          <span className="truncate text-sm font-semibold tracking-tight text-sidebar-text-active">
            Edenecart
          </span>
        </div>

        <Tooltip
          content={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          side="right"
          className="hidden md:flex"
        >
          <button
            type="button"
            onClick={toggleCollapsed}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active focus:outline-none focus:ring-2 focus:ring-sidebar-text-active/50"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRightIcon className="h-5 w-5" />
            ) : (
              <ChevronLeftIcon className="h-5 w-5" />
            )}
          </button>
        </Tooltip>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {navItems.map((item) => {
          const link = (
            <NavLink
              to={item.to}
              end={item.end}
              onClick={handleMobileNavClick}
              className={({ isActive }: { isActive: boolean }) =>
                linkBase +
                " w-full " +
                (isActive ? linkActive : linkInactive) +
                (collapsed ? " md:justify-center md:px-2" : "")
              }
            >
              <item.icon className="h-4 w-4 shrink-0 md:h-5 md:w-5" aria-hidden />
              <span className={collapsed ? "block md:hidden" : "block"}>
                {item.label}
              </span>
            </NavLink>
          );
          return (
            <div key={item.to} className="w-full">
              {collapsed ? (
                <Tooltip content={item.label} side="right" className="flex w-full">
                  {link}
                </Tooltip>
              ) : (
                link
              )}
            </div>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-hover p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {collapsed ? (
          <Tooltip content="Logout" side="right" className="flex w-full">
            <button
              type="button"
              onClick={() => { handleMobileNavClick(); onLogout(); }}
              className="flex w-full items-center md:justify-center rounded-[var(--radius-md)] md:p-2 px-3 py-2 text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active"
              aria-label="Logout"
            >
              <ArrowLeftOnRectangleIcon className="h-5 w-5 shrink-0" />
              <span className="ml-2 block text-xs md:hidden md:ml-3 md:text-sm">
                Logout
              </span>
            </button>
          </Tooltip>
        ) : (
          <button
            type="button"
            onClick={() => { handleMobileNavClick(); onLogout(); }}
            className="flex w-full items-center gap-2 rounded-[var(--radius-md)] px-2.5 py-1.5 text-left text-xs text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active md:gap-3 md:px-3 md:py-2 md:text-sm"
          >
            <ArrowLeftOnRectangleIcon className="h-4 w-4 shrink-0 md:h-5 md:w-5" />
            Logout
          </button>
        )}
      </div>
    </aside>
  );
}

export const Sidebar = memo(SidebarComponent);

