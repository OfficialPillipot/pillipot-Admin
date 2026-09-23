import { useState } from "react";
import { 
  Card, 
  CardHeader, 
  Table, 
  Badge, 
  Button, 
  Modal, 
  Input,
  Tooltip
} from "../components/ui";
import { 
  CheckIcon, 
  XMarkIcon,
  EyeIcon
} from "@heroicons/react/24/outline";
import { 
  useGetVendorsQuery, 
  useApproveVendorMutation, 
  useRejectVendorMutation
} from "../store/api/edenApi";
import type { Vendor } from "../types";
import { toast } from "../lib/toast";

function VendorManagementPage() {
  const { data: vendors, isLoading } = useGetVendorsQuery();
  const [approveVendor] = useApproveVendorMutation();
  const [rejectVendor] = useRejectVendorMutation();

  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [tempPassword, setTempPassword] = useState("");
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const handleApproveClick = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setTempPassword("");
    setIsApproveModalOpen(true);
  };

  const handleRejectClick = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setRejectReason("");
    setIsRejectModalOpen(true);
  };

  const handleViewClick = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsViewModalOpen(true);
  };

  const onConfirmApprove = async () => {
    if (!selectedVendor || !tempPassword) {
      toast.error("Please enter a temporary password");
      return;
    }
    try {
      await approveVendor({ id: selectedVendor.id, password: tempPassword }).unwrap();
      toast.success("Vendor approved successfully");
      setIsApproveModalOpen(false);
    } catch (err) {
      toast.error("Failed to approve vendor");
    }
  };

  const onConfirmReject = async () => {
    if (!selectedVendor || !rejectReason) {
      toast.error("Please enter a reason for rejection");
      return;
    }
    try {
      await rejectVendor({ id: selectedVendor.id, reason: rejectReason }).unwrap();
      toast.success("Vendor rejected");
      setIsRejectModalOpen(false);
    } catch (err) {
      toast.error("Failed to reject vendor");
    }
  };

  const pendingVendors = vendors?.filter((v) => v.status === "PENDING" || v.status === "REJECTED") || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge variant="success">Approved</Badge>;
      case "REJECTED":
        return <Badge variant="error">Rejected</Badge>;
      case "DISABLED":
        return <Badge variant="muted">Disabled</Badge>;
      default:
        return <Badge variant="warning">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Vendor Management"
          subtitle="Manage marketplace vendors, review onboarding status, and approve new sellers."
        />
        
        <Table
          isLoading={isLoading}
          keyExtractor={(v: Vendor) => v.id}
          emptyMessage="No pending applications"
          columns={[
            { key: "businessName", header: "Business Name" },
            { key: "ownerName", header: "Owner" },
            { key: "contact", header: "Email/Phone", render: (v: Vendor) => (
              <div className="text-xs">
                <div>{v.email}</div>
                <div className="text-slate-400">{v.phoneNumber}</div>
              </div>
            )},
            { key: "address", header: "Location" },
            { key: "status", header: "Status", render: (v: Vendor) => getStatusBadge(v.status) },
            { key: "actions", header: "Actions", render: (v: Vendor) => (
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
                <Tooltip content="Approve Vendor">
                  <Button 
                    size="sm" 
                    variant="primary"
                    className="w-9 h-9 p-0"
                    onClick={() => handleApproveClick(v)}
                    icon={<CheckIcon className="w-5 h-5" />}
                  />
                </Tooltip>
                <Tooltip content="Reject Vendor">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-9 h-9 p-0 text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleRejectClick(v)}
                    icon={<XMarkIcon className="w-5 h-5" />}
                  />
                </Tooltip>
              </div>
            )},
          ]}
          data={pendingVendors}
        />
      </Card>

      {/* Approval Modal */}
      <Modal
        isOpen={isApproveModalOpen}
        onClose={() => setIsApproveModalOpen(false)}
        title="Approve Vendor"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Set a temporary password for <strong>{selectedVendor?.ownerName}</strong> ({selectedVendor?.businessName}).
            They will be required to change this password upon their first login.
          </p>
          <Input
            label="Temporary Password"
            type="text"
            value={tempPassword}
            onChange={(e) => setTempPassword(e.target.value)}
            placeholder="e.g. Welcome@2024"
          />
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setIsApproveModalOpen(false)}>Cancel</Button>
            <Button onClick={onConfirmApprove}>Confirm Approval</Button>
          </div>
        </div>
      </Modal>

      {/* Rejection Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Reject Vendor"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to reject <strong>{selectedVendor?.businessName}</strong>?
          </p>
          <Input
            label="Reason for Rejection"
            type="text"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. Documents incomplete"
          />
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setIsRejectModalOpen(false)}>Cancel</Button>
            <Button variant="outline" className="bg-red-600 text-white hover:bg-red-700 border-none" onClick={onConfirmReject}>Reject Application</Button>
          </div>
        </div>
      </Modal>

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

export default VendorManagementPage;
