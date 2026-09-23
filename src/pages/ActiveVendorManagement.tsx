import { useState } from "react";
import { 
  Card, 
  CardHeader, 
  Table, 
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
  useResetVendorPasswordMutation
} from "../store/api/edenApi";
import type { Vendor } from "../types";
import { toast } from "../lib/toast";

function ActiveVendorManagementPage() {
  const { data: vendors, isLoading } = useGetVendorsQuery();
  const [toggleVendorStatus] = useToggleVendorStatusMutation();
  const [resetPassword] = useResetVendorPasswordMutation();
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const handleToggleStatus = async (vendor: Vendor) => {
    try {
      await toggleVendorStatus(vendor.id).unwrap();
      toast.success(`Vendor ${vendor.user?.isActive ? "disabled" : "enabled"} successfully`);
    } catch (err) {
      toast.fromError(err, "Failed to update vendor status");
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

  const activeVendors = vendors?.filter((v) => v.status === "APPROVED" || v.status === "DISABLED") || [];

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
        <CardHeader
          title="Active Vendors"
          subtitle="View and manage approved vendors and their login status."
        />
        <Table
          isLoading={isLoading}
          keyExtractor={(v: Vendor) => v.id}
          emptyMessage="No active vendors"
          columns={[
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
          data={activeVendors}
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
