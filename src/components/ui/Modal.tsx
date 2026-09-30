import { memo, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "screen-gap";
  className?: string;
  /** Pinned below scrollable body (e.g. primary action on mobile filter sheets). */
  footer?: React.ReactNode;
  /** Whether clicking the backdrop closes the modal. Defaults to true. */
  closeOnOutsideClick?: boolean;
}

const sizeClasses = {
  sm: "max-w-sm max-h-[min(90vh,42rem)]",
  md: "max-w-md max-h-[min(90vh,42rem)]",
  lg: "max-w-lg max-h-[min(90vh,42rem)]",
  xl: "max-w-4xl max-h-[min(90vh,42rem)]",
  "screen-gap": "w-[calc(100vw-2rem)] sm:w-[calc(100vw-200px)] max-w-[calc(100vw-200px)] max-h-[92vh]",
};

function ModalComponent({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  className,
  footer,
  closeOnOutsideClick = true,
}: ModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  const content = (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4",
        size === "screen-gap" ? "sm:p-0" : "sm:p-6"
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={cn(
          "admin-modal-backdrop-in absolute inset-0 bg-black/40 backdrop-blur-sm",
          !closeOnOutsideClick && "cursor-default"
        )}
        onClick={closeOnOutsideClick ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        className={cn(
          "admin-modal-panel-in relative flex w-full flex-col overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface shadow-[var(--shadow-card-lg)]",
          sizeClasses[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3.5 sm:gap-3 sm:px-6 sm:py-4">
          <h3
            id="modal-title"
            className="min-w-0 flex-1 text-sm font-semibold tracking-tight text-text-heading sm:text-base md:text-lg"
          >
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-transparent text-text-muted transition-colors hover:border-border hover:bg-surface-alt hover:text-text-heading focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:h-10 sm:w-10"
            aria-label="Close"
          >
            <span className="text-xl leading-none sm:text-2xl">&times;</span>
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-4 sm:p-6 sm:pb-6">
            {children}
          </div>
          {footer ? (
            <div className="shrink-0 border-t border-border bg-surface px-4 py-3 sm:px-6 sm:py-4">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(content, document.body)
    : content;
}

export const Modal = memo(ModalComponent);
