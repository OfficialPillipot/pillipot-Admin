import { memo, useState, useEffect } from "react";
import { ToggleSwitch, Tooltip, Modal, Button } from "../ui";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import {
  useGetVendorPortalProfileQuery,
  useUpdateVendorPortalProfileMutation,
} from "../../store/api/edenApi";
import { toast } from "../../lib/toast";

export const HeaderVendorStoreToggle = memo(function HeaderVendorStoreToggle() {
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);

  const {
    data: vendorProfile,
    isLoading: isLoadingProfile,
    refetch: refetchProfile,
  } = useGetVendorPortalProfileQuery(undefined, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  });

  const [updateProfile, { isLoading: isUpdatingProfile }] =
    useUpdateVendorPortalProfileMutation();

  // Listen for admin toggle events across browser tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "pillipot_vendor_store_updated") {
        void refetchProfile();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [refetchProfile]);

  const isStoreActive =
    vendorProfile?.isStoreActive !== undefined
      ? vendorProfile.isStoreActive
      : vendorProfile?.isActive !== false;

  const isStoreDisabledByAdmin = Boolean(vendorProfile?.storeDisabledByAdmin);

  const handleToggleStoreActive = async (newVal: boolean) => {
    try {
      await updateProfile({ isStoreActive: newVal }).unwrap();
      if (newVal) {
        toast.success(
          "Store is now Active! Your products are in stock and available for purchase."
        );
      } else {
        toast.warning(
          "Store is now Inactive (Paused). Your products are marked as Out of Stock."
        );
      }
    } catch (err) {
      toast.fromError(err, "Failed to update store status");
    }
  };

  const handleToggleClick = (newVal: boolean) => {
    if (isStoreDisabledByAdmin) {
      toast.error(
        vendorProfile?.storeDisabledReason
          ? `The store has been disabled: ${vendorProfile.storeDisabledReason} Please contact admin.`
          : "The store has been disabled by admin. Please contact admin."
      );
      return;
    }
    if (!newVal) {
      setShowDeactivateModal(true);
    } else {
      handleToggleStoreActive(true);
    }
  };

  return (
    <>
      <Tooltip
        content={
          isStoreDisabledByAdmin
            ? `The store has been disabled${vendorProfile?.storeDisabledReason
              ? ` (${vendorProfile.storeDisabledReason})`
              : " by admin"
            }. Please contact admin.`
            : isStoreActive
              ? "Store is Active (Online) — Click to deactivate store"
              : "Store is Inactive (Paused) — Click to activate store"
        }
        side="bottom"
      >
        <div
          className={`flex items-center gap-2 rounded-xl border border-border bg-surface-elevated  shadow-[var(--shadow-card)] transition-colors ${isStoreDisabledByAdmin ? "opacity-60 cursor-not-allowed" : ""
            }`}
        >
          {/* <span
            className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${isStoreDisabledByAdmin
                ? "bg-rose-600 ring-2 ring-rose-600/30"
                : isStoreActive
                  ? "bg-emerald-500 animate-pulse ring-2 ring-emerald-500/20"
                  : "bg-rose-500 ring-2 ring-rose-500/20"
              }`}
          /> */}
          {/* <span className="hidden text-xs font-semibold text-text-heading sm:inline">
            {isStoreDisabledByAdmin
              ? "Disabled"
              : isStoreActive
              ? "Store Open"
              : "Store Paused"}
          </span> */}
          <ToggleSwitch
            checked={isStoreActive}
            onChange={handleToggleClick}
            disabled={
              isStoreDisabledByAdmin || isUpdatingProfile || isLoadingProfile
            }
            aria-label="Toggle store active status"
          />
        </div>
      </Tooltip>

      {/* Warning Confirmation Modal for Store Deactivation */}
      <Modal
        isOpen={showDeactivateModal}
        onClose={() => setShowDeactivateModal(false)}
        title="Warning: Deactivate Store"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowDeactivateModal(false)}
              disabled={isUpdatingProfile}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                setShowDeactivateModal(false);
                await handleToggleStoreActive(false);
              }}
              loading={isUpdatingProfile}
            >
              OK
            </Button>
          </div>
        }
      >
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-amber-100 rounded-full text-amber-600 shrink-0">
            <ExclamationTriangleIcon className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-text-heading">
              Are you sure you want to deactivate your store?
            </h4>
            <p className="text-xs text-text-muted leading-relaxed">
              When your store is inactive, all of your products will be displayed
              as <strong className="text-rose-600 font-semibold">Out of Stock</strong>{" "}
              on the store with ordering disabled. Customers will not be able to
              purchase your items until you switch the store back to active.
            </p>
            <p className="text-xs text-text-muted">
              Click <strong>OK</strong> to confirm deactivating, or{" "}
              <strong>Cancel</strong> to remain active.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
});
