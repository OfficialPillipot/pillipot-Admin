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
  BanknotesIcon,
  PaperAirplaneIcon,
  ArchiveBoxIcon,
  ClockIcon,
  NewspaperIcon,
  ChatBubbleLeftRightIcon,
  PresentationChartLineIcon,
  ShieldCheckIcon,
  IdentificationIcon,
  QrCodeIcon,
  GiftIcon,
  // BuildingOffice2Icon,
  MegaphoneIcon,
  ListBulletIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import { Tooltip } from "../ui";
import type { User } from "../../types";
import { hasPermission } from "../../lib/permissions";

const SIDEBAR_COLLAPSED_KEY = "Pillipot_sidebar_collapsed";

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

interface NavSection<T> {
  title: string;
  items: T[];
}

const STAFF_NAV_SECTIONS: NavSection<StaffNavItem>[] = [
  {
    title: "Work",
    items: [
      { to: "/", label: "Dashboard", end: true, icon: HomeIcon },
      { to: "/orders/create", label: "Create Order", end: true, icon: DocumentPlusIcon },
      { to: "/orders", label: "My Orders", end: true, icon: ClipboardDocumentListIcon },
      { to: "/stock", label: "Product stock", end: true, icon: ArchiveBoxIcon },
      { to: "/recent-orders", label: "Recent orders", end: true, icon: ClockIcon },
      { to: "/bonus-log", label: "Bonus log", end: true, icon: GiftIcon },
      { to: "/blog", label: "Blog", end: true, icon: NewspaperIcon },
      {
        to: "/enquiries",
        label: "Ask admin",
        end: true,
        icon: ChatBubbleLeftRightIcon,
      },
    ],
  },
  {
    title: "Account",
    items: [
      { to: "/profile", label: "Profile", end: true, icon: UserCircleIcon },
      { to: "/account/password", label: "Change password", end: true, icon: KeyIcon },
    ],
  },
];

const VENDOR_NAV_SECTIONS: NavSection<StaffNavItem>[] = [
  {
    title: "Marketplace",
    items: [
      { to: "/", label: "Dashboard", end: true, icon: HomeIcon },
      { to: "/vendor/products", label: "My Products", end: true, icon: Squares2X2Icon },
      { to: "/vendor/orders", label: "Product Orders", end: true, icon: ClipboardDocumentListIcon },
      { to: "/admin/tracking-scan", label: "Tracking scan", end: true, icon: QrCodeIcon },
      { to: "/vendor/offers", label: "Offers", end: true, icon: TagIcon },
    ],
  },
  {
    title: "Catalog",
    items: [
      { to: "/vendor/categories", label: "Categories", end: true, icon: TagIcon },
      { to: "/vendor/subcategories", label: "Subcategories", end: true, icon: ListBulletIcon },
    ],
  },
  {
    title: "Account",
    items: [
      { to: "/account/password", label: "Change password", end: true, icon: KeyIcon },
    ],
  },
];

const ADMIN_NAV_SECTIONS: NavSection<AdminNavItem>[] = [
  {
    title: "Overview",
    items: [{ to: "/admin", label: "Dashboard", end: true, icon: HomeIcon }],
  },
  {
    title: "Orders & delivery",
    items: [
      { to: "/admin/orders", label: "Orders", end: true, icon: CubeIcon, permission: "orders.view" },
      {
        to: "/admin/tracking-scan",
        label: "Tracking scan",
        end: true,
        icon: QrCodeIcon,
        permission: "orders.update",
      },
      // {
      //   to: "/admin/post-office",
      //   label: "India Post",
      //   end: true,
      //   icon: BuildingOffice2Icon,
      //   permission: "orders.view",
      // },
      { to: "/admin/senders", label: "Senders", end: true, icon: TruckIcon, permission: "senders.view" },
      { to: "/admin/delivery", label: "Delivery", end: true, icon: PaperAirplaneIcon, permission: "deliveries.view" },
    ],
  },
  {
    title: "Team & payroll",
    items: [
      { to: "/admin/staff", label: "Staff", end: true, icon: UsersIcon, permission: "staff.view" },
      {
        to: "/admin/salary",
        label: "Staff pay",
        end: true,
        icon: CurrencyRupeeIcon,
        permission: "staff.view",
      },
      {
        to: "/admin/payroll-ledger",
        label: "Payroll",
        end: true,
        icon: BanknotesIcon,
        permission: "staff.view",
      },
      {
        to: "/admin/bonus-log",
        label: "Bonus log",
        end: true,
        icon: GiftIcon,
        permission: "staff.view",
      },
      {
        to: "/admin/staff/assigned-numbers",
        label: "Assigned numbers",
        end: true,
        icon: HashtagIcon,
        permission: "assigned_numbers.view",
      },
      {
        to: "/admin/staff/roles",
        label: "Staff roles",
        end: true,
        icon: BriefcaseIcon,
        permission: "staff_positions.view",
      },
    ],
  },
  {
    title: "Catalog & customers",
    items: [
      { to: "/admin/products", label: "Products", end: true, icon: Squares2X2Icon, permission: "products.view" },
      { to: "/admin/categories", label: "Categories", end: true, icon: TagIcon, permission: "categories.view" },
      { to: "/admin/subcategories", label: "Subcategories", end: true, icon: ListBulletIcon, permission: "categories.view" },
      { to: "/admin/offers", label: "Product Offers", end: true, icon: TagIcon, permission: "products.view" },
      { to: "/admin/banners", label: "Banners", end: true, icon: MegaphoneIcon },
      { to: "/admin/reviews", label: "Reviews", end: true, icon: StarIcon, permission: "products.view" },
      { to: "/admin/customers", label: "Customers", end: true, icon: UserGroupIcon, permission: "customers.view" },
      { to: "/admin/webapp-users", label: "Platform customers", end: true, icon: IdentificationIcon, permission: "customers.view" },
    ],
  },
  {
    title: "Vendors",
    items: [
      { to: "/admin/vendors", label: "Applications", end: true, icon: BriefcaseIcon, permission: "vendors.view" },
      { to: "/admin/vendors/active", label: "Active Vendors", end: true, icon: UsersIcon, permission: "vendors.view" },
      { to: "/admin/vendors/products", label: "Vendor Products", end: true, icon: Squares2X2Icon, permission: "vendors.view" },
      { to: "/admin/vendors/orders", label: "Vendor Orders", end: true, icon: ClipboardDocumentListIcon, permission: "vendors.view" },
    ],
  },
  {
    title: "Insights",
    items: [
      { to: "/admin/profit", label: "Profit", end: true, icon: PresentationChartLineIcon, permission: "profit.view" },
      { to: "/admin/export", label: "Export data", end: true, icon: ArrowDownTrayIcon, permission: "customers.view" },
    ],
  },
  {
    title: "Content",
    items: [
      { to: "/admin/blog", label: "Staff blog", end: true, icon: NewspaperIcon, permission: "blogs.view" },
      {
        to: "/admin/staff-enquiries",
        label: "Staff enquiries",
        end: true,
        icon: ChatBubbleLeftRightIcon,
        permission: "staff_enquiries.view",
      },
    ],
  },
  {
    title: "System",
    items: [
      { to: "/account/password", label: "Change password", end: true, icon: KeyIcon },
      { to: "/admin/settings", label: "Settings", end: true, icon: Cog6ToothIcon, permission: "settings.view" },
    ],
  },
  {
    title: "Super admin",
    items: [
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
    ],
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

  const navSections = useMemo(() => {
    if (user.role === "staff") {
      return STAFF_NAV_SECTIONS.filter((sec) => sec.items.length > 0);
    }
    if (user.role === "vendor") {
      return VENDOR_NAV_SECTIONS.filter((sec) => sec.items.length > 0);
    }
    return ADMIN_NAV_SECTIONS.map((sec) => ({
      title: sec.title,
      items: sec.items.filter((item) => {
        if (item.superAdminOnly && user.role !== "super_admin") return false;
        if (item.permission && !hasPermission(user, item.permission)) return false;
        return true;
      }),
    })).filter((sec) => sec.items.length > 0);
  }, [user]);

  const linkBase =
    "group flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] border border-transparent py-2 pl-2.5 pr-3 text-xs font-medium transition-all duration-150 ease-out max-md:gap-2.5 md:min-h-0 md:gap-3 md:py-2.5 md:px-3 md:text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-accent/40";
  const linkActive =
    "border-sidebar-accent/30 bg-sidebar-accent/10 text-sidebar-text-active shadow-sm";
  const linkInactive =
    "text-sidebar-text hover:border-sidebar-accent/20 hover:bg-sidebar-hover hover:text-sidebar-text-active";

  return (
    <aside
      className={
        "z-50 flex h-full flex-col bg-gradient-to-b from-sidebar-bg to-sidebar-bg-end text-sidebar-text transition-[transform,width] duration-300 ease-out " +
        "max-md:shadow-[4px_0_24px_rgba(15,23,42,0.12)] " +
        "fixed inset-y-0 left-0 transform md:relative md:translate-x-0 md:shadow-none " +
        (mobileOpen ? "translate-x-0 " : "-translate-x-full ") +
        (collapsed ? "w-[min(16rem,85vw)] md:w-[4.5rem] " : "w-[min(16rem,85vw)] md:w-56 lg:w-72 ")
      }
    >
      <div
        className={`flex h-20 shrink-0 items-center border-b border-sidebar-border px-3 pl-[max(0.75rem,env(safe-area-inset-left))] ${collapsed ? "md:justify-center justify-between" : "justify-between"}`}
      >
        <div className={`flex min-w-0 items-center gap-3 px-1 ${collapsed ? "md:hidden" : ""}`}>
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-gradient-to-br from-sidebar-accent to-sidebar-accent/70 text-sm font-bold text-sidebar-bg shadow-sm"
            aria-hidden
          >
            EC
          </div>
          <div className="min-w-0">
            <span className="truncate text-base font-semibold tracking-tight text-sidebar-text-active">
              PilliPot
            </span>
          </div>
        </div>

        <Tooltip
          content={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          side="right"
          className="hidden md:flex"
        >
          <button
            type="button"
            onClick={toggleCollapsed}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-transparent text-sidebar-text hover:border-sidebar-border hover:bg-sidebar-hover hover:text-sidebar-text-active focus:outline-none focus:ring-2 focus:ring-sidebar-text-active/20"
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
      <nav className="sidebar-scroll flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {navSections.map((section, sectionIndex) => (
          <div
            key={section.title}
            className={
              sectionIndex > 0
                ? "mt-4 border-t border-sidebar-border pt-4 md:mt-3 md:pt-3"
                : ""
            }
          >
            <p
              className={
                "mb-2 truncate px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-sidebar-text/55 " +
                (collapsed ? "md:sr-only" : "")
              }
            >
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const link = (
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={handleMobileNavClick}
                    className={({ isActive }: { isActive: boolean }) =>
                      linkBase +
                      " w-full " +
                      (isActive ? linkActive : linkInactive) +
                      (collapsed ? " md:justify-center md:px-2.5" : "")
                    }
                  >
                    <item.icon className="h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-105 md:h-5 md:w-5" aria-hidden />
                    <span className={collapsed ? "block md:hidden" : "block"}>
                      {item.label}
                    </span>
                  </NavLink>
                );
                return (
                  <div key={`${section.title}-${item.to}`} className="w-full">
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
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-sidebar-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {!collapsed && (
          <div className="mb-3 rounded-[var(--radius-md)] border border-sidebar-accent/20 bg-sidebar-accent/8 p-3">
            <p className="text-xs font-semibold text-sidebar-text-active">{user.name}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-sidebar-text">
              {user.role.replace("_", " ")}
            </p>
          </div>
        )}
        {collapsed ? (
          <Tooltip content="Logout" side="right" className="flex w-full">
            <button
              type="button"
              onClick={() => { handleMobileNavClick(); onLogout(); }}
              className="flex w-full items-center rounded-[var(--radius-md)] border border-transparent px-3 py-2 text-sidebar-text hover:border-sidebar-accent/20 hover:bg-sidebar-hover hover:text-sidebar-text-active md:justify-center md:p-2.5 transition-colors duration-150"
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
            className="flex w-full items-center gap-2 rounded-[var(--radius-md)] border border-transparent px-3 py-2.5 text-left text-xs text-sidebar-text hover:border-sidebar-accent/20 hover:bg-sidebar-hover hover:text-sidebar-text-active md:gap-3 md:text-sm transition-colors duration-150"
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
