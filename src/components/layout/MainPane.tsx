import { memo, useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router";

const ENTER_MS = 240;

/**
 * Replays a short enter animation when the route pathname changes so main content
 * feels smooth without remounting the router.
 */
function MainPaneComponent({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const rootRef = useRef<HTMLDivElement>(null);
  const prevPathRef = useRef(pathname);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (prevPathRef.current === pathname) return;
    prevPathRef.current = pathname;

    el.classList.remove("admin-main-pane-enter");
    void el.offsetWidth;
    el.classList.add("admin-main-pane-enter");
    const t = window.setTimeout(() => {
      el.classList.remove("admin-main-pane-enter");
    }, ENTER_MS);
    return () => window.clearTimeout(t);
  }, [pathname]);

  return (
    <div ref={rootRef} className="min-h-0 min-w-0">
      {children}
    </div>
  );
}

export const MainPane = memo(MainPaneComponent);
