import { useState, useMemo } from "react";
import { 
  Card, 
  Table, 
  TablePagination,
  Badge, 
  Tooltip,
  ToggleSwitch,
  Button,
  Modal
} from "../components/ui";
import { 
  CheckIcon,
  EyeIcon,
  ClipboardDocumentIcon,
  ArrowPathIcon,
  ExclamationCircleIcon
} from "@heroicons/react/24/outline";
import { 
  useGetVendorsQuery, 
  useToggleVendorStatusMutation,
  useToggleVendorStoreMutation,
  useResetVendorPasswordMutation
} from "../store/api/edenApi";
import type { Vendor } from "../types";
import { toast } from "../lib/toast";

function ActiveVendorManagementPage() {
  const { data: vendors, isLoading } = useGetVendorsQuery();
  const [toggleVendorStatus] = useToggleVendorStatusMutation();
  const [toggleVendorStore] = useToggleVendorStoreMutation();
  const [resetPassword] = useResetVendorPasswordMutation();
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Pagination state (default: 10 items)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Checkbox selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const handleToggleStatus = async (vendor: Vendor) => {
    try {
      await toggleVendorStatus(vendor.id).unwrap();
      toast.success(`Vendor ${vendor.user?.isActive ? "disabled" : "enabled"} successfully`);
    } catch (err) {
      toast.fromError(err, "Failed to update vendor status");
    }
  };

  const handleToggleStore = async (vendor: Vendor) => {
    try {
      await toggleVendorStore(vendor.id).unwrap();
      const currentStoreActive = vendor.isStoreActive ?? (vendor.isActive !== false);
      toast.success(
        `Store for ${vendor.businessName} ${currentStoreActive ? "disabled" : "enabled"} successfully`
      );
      try {
        localStorage.setItem("pillipot_vendor_store_updated", String(Date.now()));
      } catch {
        // ignore
      }
    } catch (err) {
      toast.fromError(err, "Failed to update store status");
    }
  };

  const handleResetPassword = async (vendor: Vendor) => {
    if (!confirm(`Are you sure you want to reset the password for ${vendor.businessName}? This will generate a new temporary password.`)) {
      return;
    }

    try {
      await resetPassword({ id: vendor.id }).unwrap();
      toast.success("Password reset successfully. A new temporary password has been set.");
    } catch (err) {
      toast.fromError(err, "Failed to reset password");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Password copied to clipboard");
  };

  const handleViewClick = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsViewModalOpen(true);
  };

  const activeVendors = useMemo(() => vendors?.filter((v) => v.status === "APPROVED" || v.status === "DISABLED") || [], [vendors]);

  const paginatedVendors = useMemo(
    () => activeVendors.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [activeVendors, currentPage, pageSize]
  );

  const allOnPageSelected = paginatedVendors.length > 0 && paginatedVendors.every((v) => selectedIds.has(v.id));
  const isIndeterminate = selectedIds.size > 0 && !allOnPageSelected;

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        paginatedVendors.forEach((v) => next.delete(v.id));
      } else {
        paginatedVendors.forEach((v) => next.add(v.id));
      }
      return next;
    });
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkToggleStatus = async (enable: boolean) => {
    if (selectedIds.size === 0) return;
    setBulkActionLoading(true);
    try {
      const selectedList = activeVendors.filter((v) => selectedIds.has(v.id));
      await Promise.all(
        selectedList.map((v) => {
          const isCurrentlyActive = v.user?.isActive ?? false;
          if (isCurrentlyActive !== enable) {
            return toggleVendorStatus(v.id).unwrap();
          }
          return Promise.resolve();
        })
      );
      toast.success(`${selectedIds.size} vendor(s) ${enable ? "enabled" : "disabled"}`);
      setSelectedIds(new Set());
    } catch (err) {
      toast.fromError(err, "Failed to update selected vendors");
    } finally {
      setBulkActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge variant="success">Approved</Badge>;
      case "DISABLED":
        return <Badge variant="muted">Disabled</Badge>;
      default:
        return <Badge variant="warning">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-primary/5 border border-primary/20 rounded-[var(--radius-lg)] mb-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary text-white text-xs font-bold">
                {selectedIds.size}
              </span>
              <span className="text-sm font-medium text-text">
                {selectedIds.size === 1 ? "1 vendor selected" : `${selectedIds.size} vendors selected`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={bulkActionLoading}
                onClick={() => handleBulkToggleStatus(true)}
              >
                Enable Selected
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={bulkActionLoading}
                onClick={() => handleBulkToggleStatus(false)}
              >
                Disable Selected
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        <Table
          isLoading={isLoading}
          keyExtractor={(v: Vendor) => v.id}
          emptyMessage="No active vendors"
          columns={[
            {
              key: "select",
              header: (
                <input
                  type="checkbox"
                  ref={(el) => {
                    if (el) el.indeterminate = isIndeterminate;
                  }}
                  checked={allOnPageSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer accent-primary"
                  aria-label="Select all vendors on page"
                />
              ),
              className: "w-10 px-3 text-center",
              mobileHeaderStart: true,
              render: (v: Vendor) => (
                <input
                  type="checkbox"
                  checked={selectedIds.has(v.id)}
                  onChange={() => toggleSelectRow(v.id)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer accent-primary"
                  aria-label={`Select vendor ${v.businessName || v.ownerName}`}
                />
              ),
            },
            { key: "businessName", header: "Business Name" },
            { key: "ownerName", header: "Owner" },
            { key: "email", header: "Email" },
            { 
              key: "password", 
              header: "Password Status", 
              render: (v: Vendor) => (
                <div className="text-xs">
                  {v.user?.mustChangePassword ? (
                    <div className="flex items-center gap-2">
                      <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-primary">
                        {v.user.initialTempPassword || "Temp set"}
                      </span>
                      {v.user.initialTempPassword && (
                        <button 
                          onClick={() => copyToClipboard(v.user!.initialTempPassword!)}
                          className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-primary transition-colors"
                          title="Copy Password"
                        >
                          <ClipboardDocumentIcon className="w-4 h-4" />
                        </button>
                      )}
                      {v.pendingPasswordResetRequest && (
                        <Tooltip content="Reset requested">
                          <ExclamationCircleIcon className="w-4 h-4 text-warning animate-pulse" />
                        </Tooltip>
                      )}
                    </div>
                  ) : (
                    <span className="text-success font-medium flex items-center gap-1">
                      <CheckIcon className="w-3.5 h-3.5" /> Password Changed
                    </span>
                  )}
                </div>
              )
            },
            { 
              key: "isActive", 
              header: "Active", 
              render: (v: Vendor) => (
                <ToggleSwitch
                  checked={v.user?.isActive ?? false}
                  onChange={() => handleToggleStatus(v)}
                  aria-label="Toggle vendor status"
                />
              )
            },
            { 
              key: "isStoreActive", 
              header: "Store", 
              render: (v: Vendor) => {
                const storeActive = v.isStoreActive ?? (v.isActive !== false);
                return (
                  <Tooltip
                    content={
                      v.storeDisabledByAdmin
                        ? `Store disabled by admin${v.storeDisabledReason ? ` (${v.storeDisabledReason})` : ""}. Click to re-enable.`
                        : storeActive
                        ? "Store is Active (Click to disable)"
                        : "Store is Paused by vendor (Click to enable)"
                    }
                  >
                    <div>
                      <ToggleSwitch
                        checked={storeActive}
                        onChange={() => handleToggleStore(v)}
                        aria-label="Toggle vendor store status"
                      />
                    </div>
                  </Tooltip>
                );
              }
            },
            { 
              key: "status", 
              header: "Status", 
              render: (v: Vendor) => getStatusBadge(v.status) 
            },
            {
              key: "actions",
              header: "Actions",
              render: (v: Vendor) => (
                <div className="flex gap-2">
                  <Tooltip content="View Details">
                    <Button 
                      size="sm" 
                      variant="secondary"
                      className="w-9 h-9 p-0"
                      onClick={() => handleViewClick(v)}
                      icon={<EyeIcon className="w-5 h-5" />}
                    />
                  </Tooltip>
                  <Tooltip content="Reset Password">
                    <Button 
                      size="sm" 
                      variant="secondary"
                      className={`w-9 h-9 p-0 ${
                        v.pendingPasswordResetRequest 
                          ? "!bg-warning/10 !text-warning border-warning/30 animate-pulse" 
                          : ""
                      }`}
                      onClick={() => handleResetPassword(v)}
                      icon={<ArrowPathIcon className="w-5 h-5" />}
                    />
                  </Tooltip>
                </div>
              )
            }
          ]}
          data={paginatedVendors}
        />

        <TablePagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={activeVendors.length}
          totalPages={Math.max(1, Math.ceil(activeVendors.length / pageSize))}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          pageSizeOptions={[10, 20, 50, 80, 100]}
          itemLabel="vendors"
          disabled={isLoading}
        />
      </Card>

      {/* View Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Vendor Details"
      >
        {selectedVendor && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Business Name</p>
                <p className="text-sm font-medium">{selectedVendor.businessName}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Owner Name</p>
                <p className="text-sm font-medium">{selectedVendor.ownerName}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</p>
                <p className="text-sm font-medium">{selectedVendor.email}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Phone</p>
                <p className="text-sm font-medium">{selectedVendor.phoneNumber}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">GST Number</p>
                <p className="text-sm font-medium">{selectedVendor.gstNumber}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">PAN Number</p>
                <p className="text-sm font-medium">{selectedVendor.panNumber}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Registered Address</p>
                <p className="text-sm font-medium">{selectedVendor.address}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pickup / Dispatch Address</p>
                <p className="text-sm font-medium">{selectedVendor.pickupAddress || selectedVendor.address}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-bold mb-3">Bank Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Account Number</p>
                  <p className="text-sm font-medium">{selectedVendor.bankAccountNumber}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">IFSC Code</p>
                  <p className="text-sm font-medium">{selectedVendor.ifscCode}</p>
                </div>
                {selectedVendor.bankName && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bank Name</p>
                    <p className="text-sm font-medium">{selectedVendor.bankName}</p>
                  </div>
                )}
                {selectedVendor.bankAccountHolderName && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Account Holder Name</p>
                    <p className="text-sm font-medium">{selectedVendor.bankAccountHolderName}</p>
                  </div>
                )}
                {selectedVendor.bankBranch && (
                  <div className="col-span-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Branch</p>
                    <p className="text-sm font-medium">{selectedVendor.bankBranch}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={() => setIsViewModalOpen(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default ActiveVendorManagementPage;
