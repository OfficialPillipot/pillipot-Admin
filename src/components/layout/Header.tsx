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
      <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-b border-border bg-surface/90 px-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] shadow-[var(--shadow-header)] backdrop-blur-md supports-[backdrop-filter]:bg-surface/75 sm:h-14 sm:gap-3 sm:px-[max(1rem,env(safe-area-inset-left))] sm:pr-[max(1rem,env(safe-area-inset-right))] md:px-[max(1.5rem,env(safe-area-inset-left))] md:pr-[max(1.5rem,env(safe-area-inset-right))]">
        <div className="flex min-w-0 items-center gap-2 md:max-w-[min(20rem,28vw)] md:shrink-0 lg:max-w-[min(24rem,32vw)]">
          {onMenuClick && (
            <button
              type="button"
              onClick={onMenuClick}
              className="-ml-1 inline-flex min-h-9 min-w-9 items-center justify-center rounded-[var(--radius-md)] text-text-muted transition-colors hover:bg-surface-alt hover:text-text-heading focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface sm:-ml-2 sm:min-h-10 sm:min-w-10 md:hidden"
              aria-label="Open menu"
            >
              <Bars3Icon className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" />
            </button>
          )}
          <h1
            key={pathname}
            className="animate-admin-header-title min-w-0 truncate text-sm font-semibold tracking-tight text-text-heading sm:text-base md:text-lg"
          >
            {title}
          </h1>
        </div>
        <div className="flex min-w-0 flex-1 justify-end md:justify-center">
          <button
            type="button"
            onClick={openCommand}
            className="inline-flex h-9 min-w-9 items-center justify-center rounded-[var(--radius-md)] border border-border bg-surface-alt text-text-muted shadow-inner transition-colors hover:border-border-strong hover:bg-surface hover:text-text-heading md:hidden"
            aria-label="Open search"
            title="Search pages"
          >
            <MagnifyingGlassIcon className="h-4 w-4 shrink-0" aria-hidden />
          </button>
          <button
            type="button"
            onClick={openCommand}
            className="hidden h-9 w-full max-w-md items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface-alt px-3 text-left text-sm text-text-muted shadow-inner transition-colors hover:border-border-strong hover:bg-surface md:flex"
            aria-label="Open command palette"
            title="Search pages (⌘K or Ctrl+K)"
          >
            <MagnifyingGlassIcon className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
            <span className="truncate">Search anything…</span>
            <kbd className="ml-auto hidden rounded-md border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] font-medium text-text-muted lg:inline-block">
              ⌘K
            </kbd>
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3 md:pl-2">
          <HeaderNotifications user={user} />
          <button
            type="button"
            onClick={onToggleTheme}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-border bg-surface-alt text-text-muted shadow-sm transition-colors hover:text-text-heading focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:h-9 sm:w-9"
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
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-muted text-xs font-semibold text-primary ring-2 ring-border sm:h-9 sm:w-9 sm:text-sm"
            aria-hidden
          >
            {userDisplayName.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>
      <CommandPalette open={commandOpen} onClose={closeCommand} user={user} />
    </>
  );
}

export const Header = memo(HeaderComponent);
