import { memo, useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router";

const ENTER_MS = 260;

/**
 * Short enter motion when the route pathname changes. Cleans up animation class
 * on effect cleanup so React Strict Mode (double effect) cannot leave the pane
 * stuck at opacity 0 with a cancelled timeout.
 */
function MainPaneComponent({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const rootRef = useRef<HTMLDivElement>(null);
  const prevPathRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const prev = prevPathRef.current;
    if (prev === pathname) {
      return;
    }

    prevPathRef.current = pathname;

    if (prev === null) {
      return;
    }

    el.classList.remove("admin-main-pane-enter");
    void el.offsetWidth;
    el.classList.add("admin-main-pane-enter");
    const t = window.setTimeout(() => {
      el.classList.remove("admin-main-pane-enter");
    }, ENTER_MS);

    return () => {
      window.clearTimeout(t);
      el.classList.remove("admin-main-pane-enter");
    };
  }, [pathname]);

  return (
    <div ref={rootRef} className="min-h-0 min-w-0">
      {children}
    </div>
  );
}

export const MainPane = memo(MainPaneComponent);
