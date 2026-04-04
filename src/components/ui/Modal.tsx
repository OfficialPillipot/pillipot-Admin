import { memo, useEffect, useCallback } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  /** Pinned below scrollable body (e.g. primary action on mobile filter sheets). */
  footer?: React.ReactNode;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-4xl",
};

function ModalComponent({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  footer,
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="admin-modal-backdrop-in absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={
          "admin-modal-panel-in relative m-0 flex max-h-[min(92dvh,calc(100vh-0.5rem))] w-full flex-col overflow-hidden rounded-t-[var(--radius-2xl)] border border-border bg-surface shadow-[var(--shadow-dropdown)] sm:m-auto sm:max-h-[min(88dvh,42rem)] sm:rounded-[var(--radius-2xl)] " +
          sizeClasses[size]
        }
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-3 sm:gap-3 sm:px-6 sm:py-4">
          <h3
            id="modal-title"
            className="min-w-0 flex-1 text-sm font-semibold tracking-tight text-text-heading sm:text-base md:text-lg"
          >
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-text-muted transition-colors hover:bg-surface-alt hover:text-text-heading focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:h-10 sm:w-10"
            aria-label="Close"
          >
            <span className="text-xl leading-none sm:text-2xl">&times;</span>
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-6 sm:pb-6">
            {children}
          </div>
          {footer ? (
            <div className="shrink-0 border-t border-border bg-surface px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export const Modal = memo(ModalComponent);
