import { memo, useState, type ReactNode } from "react";
import { FunnelIcon } from "@heroicons/react/24/outline";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { ManagementFilterLayoutProvider } from "./ManagementFilterPanel";

const MD_UP = "(min-width: 768px)";

interface ResponsiveManagementFiltersProps {
  children: ReactNode;
  /** Modal title (mobile / small screens only). */
  modalTitle?: string;
  /** Label on the trigger button. */
  triggerLabel?: string;
}

/**
 * Below `md`: shows a right-aligned “Filters” button; filters open in a full-width sheet / modal.
 * `md` and up: renders children inline (typically `ManagementFilterPanel`).
 */
export const ResponsiveManagementFilters = memo(function ResponsiveManagementFilters({
  children,
  modalTitle = "Filters",
  triggerLabel = "Filters",
}: ResponsiveManagementFiltersProps) {
  const isMdUp = useMediaQuery(MD_UP);
  const [open, setOpen] = useState(false);

  if (isMdUp) {
    return <div className="relative z-20 w-full">{children}</div>;
  }

  return (
    <div className="w-full">
      <div className="mb-3 flex justify-end">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="gap-2"
          onClick={() => setOpen(true)}
        >
          <FunnelIcon className="h-4 w-4 shrink-0" aria-hidden />
          {triggerLabel}
        </Button>
      </div>
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={modalTitle}
        size="xl"
        footer={
          <Button type="button" className="w-full sm:w-auto" onClick={() => setOpen(false)}>
            Done
          </Button>
        }
      >
        <ManagementFilterLayoutProvider embedded>
          {children}
        </ManagementFilterLayoutProvider>
      </Modal>
    </div>
  );
});
