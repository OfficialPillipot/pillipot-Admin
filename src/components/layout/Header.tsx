import { memo, useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { Bars3Icon, MagnifyingGlassIcon, MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import type { User } from "../../types";
import { CommandPalette } from "./CommandPalette";
import { HeaderNotifications } from "./HeaderNotifications";

interface HeaderProps {
  title: string;
  user: User;
  userDisplayName: string;
  userRole: string;
  onMenuClick?: () => void;
  themeMode: "light" | "dark";
  onToggleTheme: () => void;
}

function HeaderComponent({
  title,
  user,
  userDisplayName,
  userRole,
  onMenuClick,
  themeMode,
  onToggleTheme,
}: HeaderProps) {
  const { pathname } = useLocation();
  const [commandOpen, setCommandOpen] = useState(false);

  const openCommand = useCallback(() => setCommandOpen(true), []);
  const closeCommand = useCallback(() => setCommandOpen(false), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 px-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] shadow-[var(--shadow-header)] backdrop-blur-md supports-[backdrop-filter]:bg-surface/80 sm:px-[max(1rem,env(safe-area-inset-left))] sm:pr-[max(1rem,env(safe-area-inset-right))] md:px-[max(1.5rem,env(safe-area-inset-left))] md:pr-[max(1.5rem,env(safe-area-inset-right))]">
        <div className="flex min-h-16 items-center gap-2 py-2 sm:min-h-[4.5rem] sm:gap-3">
          <div className="flex min-w-0 items-center gap-2 md:max-w-[min(24rem,30vw)] md:shrink-0 lg:max-w-[min(28rem,34vw)]">
            {onMenuClick && (
              <button
                type="button"
                onClick={onMenuClick}
                className="-ml-1 inline-flex min-h-10 min-w-10 items-center justify-center rounded-[var(--radius-md)] border border-border bg-surface-elevated text-text-muted transition-colors hover:bg-surface-soft hover:text-text-heading focus:outline-none sm:-ml-2 md:hidden"
                aria-label="Open menu"
              >
                <Bars3Icon className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" />
              </button>
            )}
            <div className="min-w-0">
              <p className="mb-1 hidden text-[11px] font-medium uppercase tracking-[0.24em] text-text-muted sm:block">
                PilliPot Control Center
              </p>
              <h1
                key={pathname}
                className="animate-admin-header-title min-w-0 truncate text-base font-semibold tracking-tight text-text-heading sm:text-lg md:text-[1.35rem]"
              >
                {title}
              </h1>
            </div>
          </div>
          <div className="flex min-w-0 flex-1 justify-end md:justify-center">
            <button
              type="button"
              onClick={openCommand}
              className="inline-flex h-10 min-w-10 items-center justify-center rounded-[var(--radius-md)] border border-border bg-surface-elevated text-text-muted shadow-[var(--shadow-card)] transition-colors hover:border-border-strong hover:bg-surface-soft hover:text-text-heading md:hidden"
              aria-label="Open search"
              title="Search pages"
            >
              <MagnifyingGlassIcon className="h-4 w-4 shrink-0" aria-hidden />
            </button>
            <button
              type="button"
              onClick={openCommand}
              className="hidden h-11 w-full max-w-xl items-center gap-3 rounded-[var(--radius-md)] border border-border bg-surface-elevated px-4 text-left text-sm text-text-muted shadow-[var(--shadow-card)] transition-colors hover:border-border-strong hover:bg-surface-soft md:flex"
              aria-label="Open command palette"
              title="Search pages (⌘K or Ctrl+K)"
            >
              <MagnifyingGlassIcon className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
              <span className="truncate">Jump to pages, orders, staff tools...</span>
              <kbd className="ml-auto hidden rounded-md border border-border bg-surface-soft px-1.5 py-0.5 font-mono text-[10px] font-medium text-text-muted lg:inline-block">
                ⌘K
              </kbd>
            </button>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3 md:pl-2">
            <HeaderNotifications user={user} />
            <button
              type="button"
              onClick={onToggleTheme}
              className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-border bg-surface-elevated text-text-muted shadow-[var(--shadow-card)] transition-colors hover:bg-surface-soft hover:text-text-heading focus:outline-none sm:h-10 sm:w-10"
              aria-label={themeMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={themeMode === "dark" ? "Light mode" : "Dark mode"}
            >
              {themeMode === "dark" ? (
                <SunIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <MoonIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </button>
            <Link
              to={
                user.role === "vendor"
                  ? "/vendor/profile"
                  : user.role === "staff"
                    ? "/profile"
                    : "/account/password"
              }
              className="group flex items-center gap-2 rounded-xl p-1 transition-all hover:bg-surface-soft sm:gap-3 focus:outline-none"
              title="View Profile"
            >
              <div className="hidden min-w-0 text-right sm:block">
                <p className="truncate text-sm font-medium text-text-heading transition-colors group-hover:text-primary">
                  {userDisplayName}
                </p>
                <p className="text-xs text-text-muted">{userRole}</p>
              </div>
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={userDisplayName}
                  className="h-9 w-9 shrink-0 rounded-full object-cover border border-primary/30 shadow-[var(--shadow-card)] sm:h-10 sm:w-10 group-hover:ring-2 group-hover:ring-primary/40 transition-all"
                />
              ) : (
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-gradient-to-br from-primary/15 to-primary/5 text-xs font-semibold text-primary shadow-[var(--shadow-card)] sm:h-10 sm:w-10 sm:text-sm group-hover:ring-2 group-hover:ring-primary/40 transition-all"
                  aria-hidden
                >
                  {userDisplayName.charAt(0).toUpperCase()}
                </div>
              )}
            </Link>
          </div>
        </div>
      </header>
      <CommandPalette open={commandOpen} onClose={closeCommand} user={user} />
    </>
  );
}

export const Header = memo(HeaderComponent);
