import { memo, useState, useCallback } from "react";
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
} from "@heroicons/react/24/outline";
import { Tooltip } from "../ui";
import type { UserRole } from "../../types";

const SIDEBAR_COLLAPSED_KEY = "edenecart_sidebar_collapsed";

interface NavItem {
  to: string;
  label: string;
  roles: UserRole[];
  end?: boolean;
  icon: React.ComponentType<{ className?: string }>;
}

const STAFF_NAV: NavItem[] = [
  { to: "/", label: "Dashboard", roles: ["staff"], end: true, icon: HomeIcon },
  { to: "/orders/create", label: "Create Order", roles: ["staff"], end: true, icon: DocumentPlusIcon },
  { to: "/orders", label: "My Orders", roles: ["staff"], end: true, icon: ClipboardDocumentListIcon },
  { to: "/profile", label: "Profile", roles: ["staff"], end: true, icon: UserCircleIcon },
  { to: "/account/password", label: "Change password", roles: ["staff"], end: true, icon: KeyIcon },
];

const ADMIN_NAV: NavItem[] = [
  { to: "/admin", label: "Dashboard", roles: ["super_admin"], end: true, icon: HomeIcon },
  { to: "/admin/staff", label: "Staff", roles: ["super_admin"], end: true, icon: UsersIcon },
  { to: "/admin/staff/roles", label: "Staff roles", roles: ["super_admin"], end: true, icon: BriefcaseIcon },
  { to: "/admin/staff/assigned-numbers", label: "Assigned numbers", roles: ["super_admin"], end: true, icon: HashtagIcon },
  { to: "/admin/orders", label: "Orders", roles: ["super_admin"], end: true, icon: CubeIcon },
  { to: "/admin/customers", label: "Customers", roles: ["super_admin"], end: true, icon: UserGroupIcon },
  { to: "/admin/categories", label: "Categories", roles: ["super_admin"], end: true, icon: TagIcon },
  { to: "/admin/products", label: "Products", roles: ["super_admin"], end: true, icon: Squares2X2Icon },
  { to: "/admin/export", label: "Export Data", roles: ["super_admin"], end: true, icon: ArrowDownTrayIcon },
  { to: "/account/password", label: "Change password", roles: ["super_admin"], end: true, icon: KeyIcon },
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
  role: UserRole;
  onLogout: () => void;
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}

function SidebarComponent({ role, onLogout, mobileOpen, setMobileOpen }: SidebarProps) {
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

  const items = role === "super_admin" ? ADMIN_NAV : STAFF_NAV;
  const filtered = items.filter((i) => i.roles.includes(role));

  const linkBase =
    "flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-colors md:min-h-0 md:py-2 ";
  const linkActive = "bg-sidebar-hover text-sidebar-text-active";
  const linkInactive = "text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active";



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
        className={`flex h-14 shrink-0 items-center border-b border-sidebar-hover px-2 pl-[max(0.5rem,env(safe-area-inset-left))] ${collapsed ? "md:justify-center justify-between" : "justify-between"}`}
      >
        <div className={`flex items-center ${collapsed ? "md:hidden" : ""}`}>
          <span className="truncate px-2 font-semibold text-sidebar-text-active">
            Edenecart Admin
          </span>
        </div>

        <button
          type="button"
          onClick={toggleCollapsed}
          className="hidden md:flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active focus:outline-none focus:ring-2 focus:ring-sidebar-text-active/50"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRightIcon className="h-5 w-5" />
          ) : (
            <ChevronLeftIcon className="h-5 w-5" />
          )}
        </button>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {/* Render nav items correctly based on responsive rules. We conditionally show tooltips only on md+ */}
        {filtered.map((item) => (
          <div key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              onClick={handleMobileNavClick}
              title={collapsed ? item.label : undefined} // Fallback title
              className={({ isActive }: { isActive: boolean }) =>
                linkBase + 
                (isActive ? linkActive : linkInactive) + 
                (collapsed ? " md:justify-center md:px-2" : "")
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className={collapsed ? "block md:hidden" : "block"}>{item.label}</span>
            </NavLink>
          </div>
        ))}
      </nav>
      <div className="border-t border-sidebar-hover p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {collapsed ? (
          <Tooltip content="Logout" side="right" className="hidden md:block">
            <button
              type="button"
              onClick={() => { handleMobileNavClick(); onLogout(); }}
              className="flex w-full items-center md:justify-center rounded-[var(--radius-md)] md:p-2 px-3 py-2 text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active"
              aria-label="Logout"
            >
              <ArrowLeftOnRectangleIcon className="h-5 w-5 shrink-0" />
              <span className="ml-3 block md:hidden text-sm">Logout</span>
            </button>
          </Tooltip>
        ) : (
          <button
            type="button"
            onClick={() => { handleMobileNavClick(); onLogout(); }}
            className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-left text-sm text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active"
          >
            <ArrowLeftOnRectangleIcon className="h-5 w-5 shrink-0" />
            Logout
          </button>
        )}
      </div>
    </aside>
  );
}

export const Sidebar = memo(SidebarComponent);

