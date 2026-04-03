import { memo, useEffect, useRef, useState } from "react";
import { subscribeApiLoading } from "../api/api-loading";

const SHOW_DELAY_MS = 150;

/**
 * Full-screen loader while any non-silent `api.*` request is in flight.
 * Debounced slightly so very fast responses do not flash the overlay.
 */
function ApiLoadingOverlayComponent() {
  const [inFlight, setInFlight] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return subscribeApiLoading(setInFlight);
  }, []);

  useEffect(() => {
    if (inFlight <= 0) {
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setVisible(false);
      return;
    }
    if (timerRef.current === null) {
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setVisible(true);
      }, SHOW_DELAY_MS);
    }
  }, [inFlight]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-surface/70 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="loader shrink-0" aria-hidden />
    </div>
  );
}

export const ApiLoadingOverlay = memo(ApiLoadingOverlayComponent);
