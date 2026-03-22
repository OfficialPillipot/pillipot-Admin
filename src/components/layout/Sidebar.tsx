import { memo, useState, useCallback } from "react";
import { NavLink } from "react-router";
import {
  HomeIcon,
  DocumentPlusIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  CubeIcon,
  Squares2X2Icon,
  ArrowDownTrayIcon,
  ArrowLeftOnRectangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
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
];

const ADMIN_NAV: NavItem[] = [
  { to: "/admin", label: "Dashboard", roles: ["super_admin"], end: true, icon: HomeIcon },
  { to: "/admin/staff", label: "Staff", roles: ["super_admin"], end: true, icon: UsersIcon },
  { to: "/admin/orders", label: "Orders", roles: ["super_admin"], end: true, icon: CubeIcon },
  { to: "/admin/products", label: "Products", roles: ["super_admin"], end: true, icon: Squares2X2Icon },
  { to: "/admin/export", label: "Export Data", roles: ["super_admin"], end: true, icon: ArrowDownTrayIcon },
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
  } catch {}
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
    "flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-colors ";
  const linkActive = "bg-sidebar-hover text-sidebar-text-active";
  const linkInactive = "text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active";



  return (
    <aside
      className={
        "flex h-full flex-col bg-sidebar-bg text-sidebar-text transition-all duration-300 z-50 " +
        "fixed inset-y-0 left-0 transform md:relative md:translate-x-0 " +
        (mobileOpen ? "translate-x-0 " : "-translate-x-full ") +
        (collapsed ? "w-64 md:w-[4.5rem] " : "w-64 md:w-56 lg:w-64 ")
      }
    >
      <div className={`flex h-14 shrink-0 items-center ${collapsed ? "md:justify-center justify-between" : "justify-between"} border-b border-sidebar-hover px-2`}>
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
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
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
      <div className="border-t border-sidebar-hover p-2">
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

