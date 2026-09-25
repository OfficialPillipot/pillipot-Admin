/**
 * Automatically scrolls the nearest scrollable parent (e.g. `<main>` or modal body or `window`)
 * if an opened dropdown or filter popover extends below the visible screen or container edge.
 */
export function autoScrollDropdownIntoView(
  element: HTMLElement | null,
  options: {
    padding?: number;
    behavior?: ScrollBehavior;
  } = {}
) {
  if (!element || typeof window === "undefined") return;

  const { padding = 24, behavior = "smooth" } = options;

  requestAnimationFrame(() => {
    if (!element.isConnected) return;

    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

    // Viewport overflow
    const overflowViewport = rect.bottom + padding - viewportHeight;

    // Find nearest scrollable parent container (e.g. <main className="overflow-y-auto"> or modal)
    let scrollParent: HTMLElement | null = null;
    let parent = element.parentElement;
    let containerBottom = viewportHeight;
    let containerTop = 0;

    while (parent && parent !== document.body && parent !== document.documentElement) {
      const style = window.getComputedStyle(parent);
      const overflowY = style.overflowY;
      if (overflowY === "auto" || overflowY === "scroll") {
        scrollParent = parent;
        const pRect = parent.getBoundingClientRect();
        containerBottom = Math.min(containerBottom, pRect.bottom);
        containerTop = Math.max(containerTop, pRect.top);
        break;
      }
      parent = parent.parentElement;
    }

    const overflowContainer = rect.bottom + padding - containerBottom;
    const maxOverflow = Math.max(overflowViewport, overflowContainer);

    if (maxOverflow > 0) {
      // Don't scroll so far down that the top of the element or trigger disappears behind the top of container/header
      const maxScrollAllowed = Math.max(0, rect.top - containerTop - 12);
      const scrollDelta = Math.min(maxOverflow, maxScrollAllowed);

      if (scrollDelta > 0) {
        if (scrollParent) {
          scrollParent.scrollBy({
            top: scrollDelta,
            behavior,
          });
        } else {
          window.scrollBy({
            top: scrollDelta,
            behavior,
          });
        }
      }
    }
  });
}
