import { memo } from "react";
import { Bars3Icon } from "@heroicons/react/24/outline";

interface HeaderProps {
  title: string;
  userDisplayName: string;
  userRole: string;
  onMenuClick?: () => void;
}

function HeaderComponent({ title, userDisplayName, userRole, onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface/95 px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] shadow-[var(--shadow-header)] backdrop-blur-md supports-[backdrop-filter]:bg-surface/80 md:px-[max(1.5rem,env(safe-area-inset-left))] md:pr-[max(1.5rem,env(safe-area-inset-right))]">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="-ml-2 inline-flex min-h-10 min-w-10 items-center justify-center rounded-[var(--radius-md)] text-text-muted transition-colors hover:bg-surface-alt hover:text-text-heading focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:hidden"
            aria-label="Open menu"
          >
            <Bars3Icon className="h-6 w-6 shrink-0" />
          </button>
        )}
        <h1 className="min-w-0 truncate text-base font-semibold tracking-tight text-text-heading sm:text-lg md:text-xl">
          {title}
        </h1>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <div className="hidden min-w-0 text-right sm:block">
          <p className="truncate text-sm font-medium text-text-heading">{userDisplayName}</p>
          <p className="text-xs text-text-muted">{userRole}</p>
        </div>
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-muted text-sm font-semibold text-primary ring-2 ring-surface"
          aria-hidden
        >
          {userDisplayName.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}

export const Header = memo(HeaderComponent);
