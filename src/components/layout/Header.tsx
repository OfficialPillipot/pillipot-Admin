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
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4 md:px-6">
      <div className="flex items-center gap-2">
        {onMenuClick && (
          <button 
            onClick={onMenuClick} 
            className="md:hidden p-2 -ml-2 text-text-muted hover:text-text-heading rounded-md focus:outline-none"
            aria-label="Open menu"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
        )}
        <h1 className="text-lg font-semibold text-text-heading md:text-xl">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-text-heading">{userDisplayName}</p>
          <p className="text-xs text-text-muted">{userRole}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-muted text-sm font-medium text-primary">
          {userDisplayName.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}

export const Header = memo(HeaderComponent);
