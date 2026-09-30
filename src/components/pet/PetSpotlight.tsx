import { memo, useEffect, useState, useCallback } from "react";
import { PetMascot } from "./PetMascot";
import type { PetTargetCoordinate } from "./types";
import { XMarkIcon, SparklesIcon, CursorArrowRaysIcon } from "@heroicons/react/24/outline";

interface PetSpotlightProps {
  target: PetTargetCoordinate;
  onDismiss: () => void;
  onAutoClick?: () => void;
}

export const PetSpotlight = memo(function PetSpotlight({
  target,
  onDismiss,
  onAutoClick,
}: PetSpotlightProps) {
  const [coords, setCoords] = useState(target);

  // Recalculate bounding box on resize/scroll
  const updateTargetPos = useCallback(() => {
    if (!target.targetSelector) return;
    try {
      const el = document.querySelector(target.targetSelector);
      if (el) {
        const rect = el.getBoundingClientRect();
        setCoords((prev) => ({
          ...prev,
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        }));
      }
    } catch {
      // Ignore
    }
  }, [target.targetSelector]);

  useEffect(() => {
    updateTargetPos();
    window.addEventListener("resize", updateTargetPos);
    window.addEventListener("scroll", updateTargetPos, true);
    return () => {
      window.removeEventListener("resize", updateTargetPos);
      window.removeEventListener("scroll", updateTargetPos, true);
    };
  }, [updateTargetPos]);

  // Determine whether to place the Pet on the right or left of the element
  const placeOnRight = coords.x < window.innerWidth / 2;
  const petLeft = placeOnRight
    ? Math.min(window.innerWidth - 140, coords.x + coords.width + 16)
    : Math.max(16, coords.x - 110);
  const petTop = Math.max(70, Math.min(window.innerHeight - 150, coords.y - 20));

  return (
    <div className="fixed inset-0 z-50 pointer-events-none transition-all duration-300">
      {/* Target Highlight Pulsing Ring */}
      <div
        className="absolute rounded-xl pointer-events-none transition-all duration-500 ring-4 ring-primary ring-offset-4 ring-offset-surface shadow-[0_0_35px_rgba(2,132,199,0.55)] animate-pulse"
        style={{
          left: `${coords.x - 4}px`,
          top: `${coords.y - 4}px`,
          width: `${coords.width + 8}px`,
          height: `${coords.height + 8}px`,
        }}
      />

      {/* Floating Pet & Speech Bubble */}
      <div
        className="absolute pointer-events-auto flex items-start gap-3 transition-all duration-500 ease-out z-50"
        style={{
          left: `${petLeft}px`,
          top: `${petTop}px`,
        }}
      >
        {!placeOnRight && (
          <div className="shrink-0 animate-bounce">
            <PetMascot mood="pointing" isPointingLeft={false} size="sm" />
          </div>
        )}

        {/* Speech Card */}
        <div className="bg-surface/95 dark:bg-surface-elevated/95 backdrop-blur-md border-2 border-primary shadow-2xl rounded-2xl p-4 max-w-xs text-text-heading text-xs font-medium space-y-2.5">
          <div className="flex items-center justify-between gap-2 border-b border-border/70 pb-1.5">
            <div className="flex items-center gap-1.5 text-primary font-bold">
              <SparklesIcon className="h-4 w-4" />
              <span>Sparky found it!</span>
            </div>
            <button
              type="button"
              onClick={onDismiss}
              className="text-text-muted hover:text-text-heading p-0.5 rounded cursor-pointer"
            >
              <XMarkIcon className="h-3.5 w-3.5" />
            </button>
          </div>

          <p className="text-text leading-relaxed">
            {target.explanation || "Here is the button you were looking for!"}
          </p>

          <div className="flex items-center gap-2 pt-1">
            {onAutoClick && (
              <button
                type="button"
                onClick={onAutoClick}
                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-primary text-white font-bold py-1.5 px-3 rounded-xl hover:bg-primary/90 transition-colors shadow-sm text-xs cursor-pointer"
              >
                <CursorArrowRaysIcon className="h-3.5 w-3.5" />
                <span>Click It Now</span>
              </button>
            )}
            <button
              type="button"
              onClick={onDismiss}
              className="bg-surface-muted text-text font-semibold py-1.5 px-3 rounded-xl hover:bg-surface-muted/80 transition-colors text-xs cursor-pointer"
            >
              Got it!
            </button>
          </div>
        </div>

        {placeOnRight && (
          <div className="shrink-0 animate-bounce">
            <PetMascot mood="pointing" isPointingLeft={true} size="sm" />
          </div>
        )}
      </div>
    </div>
  );
});
