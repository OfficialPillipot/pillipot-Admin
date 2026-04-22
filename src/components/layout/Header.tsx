import { memo, useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router";
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
      <header className="sticky top-0 z-30 border-b border-border/70 bg-surface/70 px-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] shadow-[var(--shadow-header)] backdrop-blur-xl supports-[backdrop-filter]:bg-surface/55 sm:px-[max(1rem,env(safe-area-inset-left))] sm:pr-[max(1rem,env(safe-area-inset-right))] md:px-[max(1.5rem,env(safe-area-inset-left))] md:pr-[max(1.5rem,env(safe-area-inset-right))]">
        <div className="flex min-h-16 items-center gap-2 py-2 sm:min-h-[4.5rem] sm:gap-3">
        <div className="flex min-w-0 items-center gap-2 md:max-w-[min(24rem,30vw)] md:shrink-0 lg:max-w-[min(28rem,34vw)]">
          {onMenuClick && (
            <button
              type="button"
              onClick={onMenuClick}
              className="-ml-1 inline-flex min-h-10 min-w-10 items-center justify-center rounded-[var(--radius-md)] border border-border/70 bg-surface-elevated/75 text-text-muted transition-colors hover:bg-surface-soft hover:text-text-heading focus:outline-none sm:-ml-2 md:hidden"
              aria-label="Open menu"
            >
              <Bars3Icon className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" />
            </button>
          )}
          <div className="min-w-0">
            <p className="mb-1 hidden text-[11px] font-medium uppercase tracking-[0.24em] text-text-muted sm:block">
              EdeneCart Control Center
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
            className="inline-flex h-10 min-w-10 items-center justify-center rounded-[var(--radius-md)] border border-border/70 bg-surface-elevated/75 text-text-muted shadow-sm transition-colors hover:border-border-strong hover:bg-surface-soft hover:text-text-heading md:hidden"
            aria-label="Open search"
            title="Search pages"
          >
            <MagnifyingGlassIcon className="h-4 w-4 shrink-0" aria-hidden />
          </button>
          <button
            type="button"
            onClick={openCommand}
            className="hidden h-11 w-full max-w-xl items-center gap-3 rounded-[var(--radius-lg)] border border-border/70 bg-surface-elevated/85 px-4 text-left text-sm text-text-muted shadow-sm transition-colors hover:border-border-strong hover:bg-surface-soft md:flex"
            aria-label="Open command palette"
            title="Search pages (⌘K or Ctrl+K)"
          >
            <MagnifyingGlassIcon className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
            <span className="truncate">Jump to pages, orders, staff tools...</span>
            <kbd className="ml-auto hidden rounded-md border border-border/70 bg-surface px-1.5 py-0.5 font-mono text-[10px] font-medium text-text-muted lg:inline-block">
              ⌘K
            </kbd>
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3 md:pl-2">
          <HeaderNotifications user={user} />
          <button
            type="button"
            onClick={onToggleTheme}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-border/70 bg-surface-elevated/80 text-text-muted shadow-sm transition-colors hover:bg-surface-soft hover:text-text-heading focus:outline-none sm:h-10 sm:w-10"
            aria-label={themeMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={themeMode === "dark" ? "Light mode" : "Dark mode"}
          >
            {themeMode === "dark" ? (
              <SunIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            ) : (
              <MoonIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
          </button>
          <div className="hidden min-w-0 text-right sm:block">
            <p className="truncate text-sm font-medium text-text-heading">{userDisplayName}</p>
            <p className="text-xs text-text-muted">{userRole}</p>
          </div>
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/70 bg-gradient-to-br from-primary-muted to-surface text-xs font-semibold text-primary shadow-sm ring-2 ring-white/30 sm:h-10 sm:w-10 sm:text-sm"
            aria-hidden
          >
            {userDisplayName.charAt(0).toUpperCase()}
          </div>
        </div>
        </div>
      </header>
      <CommandPalette open={commandOpen} onClose={closeCommand} user={user} />
    </>
  );
}

export const Header = memo(HeaderComponent);
