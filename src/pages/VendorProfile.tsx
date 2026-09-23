import { memo, useState, useCallback, useEffect } from "react";
import {
  Card,
  CardHeader,
  Button,
  Badge,
  Modal,
  Input,
  PageLoader,
} from "../components/ui";
import {
  BuildingOffice2Icon,
  UserCircleIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  BanknotesIcon,
  IdentificationIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  TruckIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import {
  useGetVendorPortalProfileQuery,
  useUpdateVendorPortalProfileMutation,
} from "../store/api/edenApi";
import { formatDate } from "../lib/orderUtils";
import { toast } from "../lib/toast";
import type { UpdateVendorProfilePayload, VendorDocument } from "../types";

function VendorProfilePage() {
  const { data: vendor, isLoading, error, refetch } = useGetVendorPortalProfileQuery();
  const [updateProfile, { isLoading: isUpdating }] = useUpdateVendorPortalProfileMutation();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [formData, setFormData] = useState<UpdateVendorProfilePayload>({
    businessName: "",
    ownerName: "",
    phoneNumber: "",
    address: "",
    pickupAddress: "",
    pickupPincode: "",
    bankAccountNumber: "",
    ifscCode: "",
    bankName: "",
    bankAccountHolderName: "",
    bankBranch: "",
  });

  // Sync form when modal opens or vendor changes
  useEffect(() => {
    if (vendor) {
      setFormData({
        businessName: vendor.businessName || "",
        ownerName: vendor.ownerName || "",
        phoneNumber: vendor.phoneNumber || "",
        address: vendor.address || "",
        pickupAddress: vendor.pickupAddress || vendor.address || "",
        pickupPincode: vendor.pickupPincode || (vendor.pickupAddress || vendor.address || "").match(/\b\d{6}\b/)?.[0] || "",
        bankAccountNumber: vendor.bankAccountNumber || "",
        ifscCode: vendor.ifscCode || "",
        bankName: vendor.bankName || "",
        bankAccountHolderName: vendor.bankAccountHolderName || "",
        bankBranch: vendor.bankBranch || "",
      });
    }
  }, [vendor]);

  const handleOpenEdit = useCallback(() => {
    if (vendor) {
      setFormData({
        businessName: vendor.businessName || "",
        ownerName: vendor.ownerName || "",
        phoneNumber: vendor.phoneNumber || "",
        address: vendor.address || "",
        pickupAddress: vendor.pickupAddress || vendor.address || "",
        pickupPincode: vendor.pickupPincode || (vendor.pickupAddress || vendor.address || "").match(/\b\d{6}\b/)?.[0] || "",
        bankAccountNumber: vendor.bankAccountNumber || "",
        ifscCode: vendor.ifscCode || "",
        bankName: vendor.bankName || "",
        bankAccountHolderName: vendor.bankAccountHolderName || "",
        bankBranch: vendor.bankBranch || "",
      });
    }
    setIsEditOpen(true);
  }, [vendor]);

  const handleCopyBusinessAddressToPickup = () => {
    setFormData((prev) => {
      const pinMatch = (prev.address || "").match(/\b\d{6}\b/);
      return {
        ...prev,
        pickupAddress: prev.address || "",
        pickupPincode: pinMatch ? pinMatch[0] : prev.pickupPincode || "",
      };
    });
    toast.success("Business address copied to pickup address");
  };

  const handleFieldChange = (field: keyof UpdateVendorProfilePayload, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: field === "ifscCode" ? value.toUpperCase() : value,
    }));
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.businessName?.trim()) {
      toast.error("Company / Business name is required");
      return;
    }
    if (!formData.address?.trim()) {
      toast.error("Registered business address is required");
      return;
    }
    if (!formData.pickupAddress?.trim()) {
      toast.error("Pickup address is required for dispatch");
      return;
    }

    try {
      await updateProfile(formData).unwrap();
      toast.success("Vendor profile updated successfully");
      setIsEditOpen(false);
    } catch (err) {
      toast.fromError(err, "Failed to update profile");
    }
  };

  if (isLoading) {
    return <PageLoader minHeight="min-h-[50vh]" label="Loading vendor profile..." />;
  }

  if (error || !vendor) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <p className="text-text-muted mb-4">Could not load your vendor profile.</p>
        <Button variant="secondary" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge variant="success">Approved</Badge>;
      case "PENDING":
        return <Badge variant="warning">Under Review</Badge>;
      case "REJECTED":
        return <Badge variant="error">Rejected</Badge>;
      case "DISABLED":
        return <Badge variant="muted">Disabled</Badge>;
      default:
        return <Badge variant="warning">{status}</Badge>;
    }
  };

  const getDocTypeLabel = (type: string) => {
    switch (type) {
      case "GST":
        return "GST Certificate";
      case "PAN":
        return "PAN Card Document";
      case "BANK_PROOF":
        return "Bank Proof / Cancelled Cheque";
      default:
        return type;
    }
  };

  return (
    <div className="vendor-profile-page mx-auto max-w-5xl space-y-6 pb-12">
      {/* Top Banner / Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/15 to-primary/5 text-2xl font-bold text-primary shadow-sm sm:h-20 sm:w-20 sm:text-3xl">
              {vendor.businessName ? vendor.businessName.charAt(0).toUpperCase() : "V"}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-text-heading sm:text-2xl">
                  {vendor.businessName}
                </h1>
                {getStatusBadge(vendor.status)}
              </div>
              <p className="text-sm text-text-muted">
                Contact: <span className="font-medium text-text-body">{vendor.ownerName}</span>
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-text-muted">
                <span>Registered: {formatDate(vendor.createdAt)}</span>
                <span>•</span>
                <span className="font-mono">ID: {vendor.id.slice(0, 8)}...</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="primary"
              className="inline-flex items-center gap-2"
              onClick={handleOpenEdit}
            >
              <PencilSquareIcon className="h-4 w-4" />
              <span>Edit Profile</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Grid of Profile Sections */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Company & Contact Information */}
        <Card>
          <CardHeader
            title="Company & Contact Information"
            subtitle="Details registered with Pillipot"
          />
          <dl className="mt-4 space-y-4 divide-y divide-border/60">
            <div className="pt-3 first:pt-0">
              <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-text-muted">
                <BuildingOffice2Icon className="h-4 w-4 text-primary" />
                Company / Business Name
              </dt>
              <dd className="mt-1 text-sm font-semibold text-text-heading">
                {vendor.businessName}
              </dd>
            </div>

            <div className="pt-3">
              <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-text-muted">
                <UserCircleIcon className="h-4 w-4 text-primary" />
                Owner / Authorized Contact
              </dt>
              <dd className="mt-1 text-sm font-semibold text-text-heading">
                {vendor.ownerName}
              </dd>
            </div>

            <div className="pt-3">
              <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-text-muted">
                <EnvelopeIcon className="h-4 w-4 text-primary" />
                Account Email
              </dt>
              <dd className="mt-1 flex items-center justify-between text-sm font-medium text-text-heading">
                <span>{vendor.email}</span>
                <span className="text-xs text-text-muted">(Primary login)</span>
              </dd>
            </div>

            <div className="pt-3">
              <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-text-muted">
                <PhoneIcon className="h-4 w-4 text-primary" />
                Phone Number
              </dt>
              <dd className="mt-1 text-sm font-medium text-text-heading">
                {vendor.phoneNumber}
              </dd>
            </div>
          </dl>
        </Card>

        {/* Tax & Verification Details */}
        <Card>
          <CardHeader
            title="Tax & Verification Compliance"
            subtitle="Verified official identity credentials"
          />
          <dl className="mt-4 space-y-4 divide-y divide-border/60">
            <div className="pt-3 first:pt-0">
              <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-text-muted">
                <IdentificationIcon className="h-4 w-4 text-primary" />
                GST Number
              </dt>
              <dd className="mt-1 flex items-center gap-2">
                <span className="font-mono text-sm font-semibold text-text-heading">
                  {vendor.gstNumber}
                </span>
                {vendor.status === "APPROVED" && (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                    <CheckCircleIcon className="h-4 w-4" /> Verified
                  </span>
                )}
              </dd>
            </div>

            <div className="pt-3">
              <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-text-muted">
                <IdentificationIcon className="h-4 w-4 text-primary" />
                PAN Number
              </dt>
              <dd className="mt-1 font-mono text-sm font-semibold text-text-heading">
                {vendor.panNumber}
              </dd>
            </div>

            <div className="pt-3">
              <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-text-muted">
                <ShieldCheckIcon className="h-4 w-4 text-primary" />
                Vendor Account Status
              </dt>
              <dd className="mt-1 flex items-center gap-2">
                {getStatusBadge(vendor.status)}
                {vendor.user?.isActive && (
                  <span className="text-xs text-text-muted">• Login active</span>
                )}
              </dd>
            </div>
          </dl>
        </Card>

        {/* Addresses: Registered Business & Pickup */}
        <Card padding="md" className="lg:col-span-2">
          <CardHeader
            title="Location & Pickup Addresses"
            subtitle="Registered corporate address and order pickup / dispatch location"
          />
          <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface-soft p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-heading">
                  <MapPinIcon className="h-4 w-4 text-primary" />
                  Registered Business Address
                </span>
                <Badge variant="muted">Official</Badge>
              </div>
              <p className="whitespace-pre-line text-sm text-text-body">
                {vendor.address || "No registered address recorded"}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface-soft p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-heading">
                  <TruckIcon className="h-4 w-4 text-primary" />
                  Pickup / Dispatch Address
                </span>
                <Badge variant="info">Shipping Dispatch</Badge>
              </div>
              <p className="whitespace-pre-line text-sm text-text-body">
                {vendor.pickupAddress || vendor.address || "Same as business address"}
              </p>
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-surface border border-border px-3 py-1.5 text-xs">
                <span className="text-text-muted">Origin PIN Code:</span>
                <strong className="font-mono text-primary font-bold">
                  {vendor.pickupPincode || (vendor.pickupAddress || vendor.address || "").match(/\b\d{6}\b/)?.[0] || "Not set"}
                </strong>
                <span className="text-[10px] text-text-muted ml-auto hidden sm:inline">
                  Used by Delhivery for Expected TAT
                </span>
              </div>
              <p className="mt-2 text-xs text-text-muted">
                Couriers and delivery partners will collect vendor shipments from this address.
              </p>
            </div>
          </div>
        </Card>

        {/* Bank Account Details */}
        <Card padding="md" className="lg:col-span-2">
          <CardHeader
            title="Bank Account Details"
            subtitle="Account used for vendor payouts and settlements"
            action={
              <span className="flex items-center gap-1.5 text-xs text-text-muted">
                <BanknotesIcon className="h-4 w-4 text-primary" />
                <span>Direct Payout</span>
              </span>
            }
          />
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div className="rounded-xl border border-border/80 bg-surface-soft/60 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                Account Number
              </p>
              <p className="mt-1 font-mono text-base font-bold text-text-heading">
                {vendor.bankAccountNumber || "—"}
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-surface-soft/60 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                IFSC Code
              </p>
              <p className="mt-1 font-mono text-base font-bold text-text-heading">
                {vendor.ifscCode || "—"}
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-surface-soft/60 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                Account Holder Name
              </p>
              <p className="mt-1 text-sm font-semibold text-text-heading">
                {vendor.bankAccountHolderName || vendor.ownerName || "—"}
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-surface-soft/60 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                Bank Name
              </p>
              <p className="mt-1 text-sm font-medium text-text-heading">
                {vendor.bankName || "—"}
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-surface-soft/60 p-4 sm:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                Branch
              </p>
              <p className="mt-1 text-sm font-medium text-text-heading">
                {vendor.bankBranch || "—"}
              </p>
            </div>
          </div>
        </Card>

        {/* Uploaded Verification Documents */}
        <Card padding="md" className="lg:col-span-2">
          <CardHeader
            title="Registration Documents"
            subtitle="Official documents submitted during vendor registration"
          />
          {vendor.documents && vendor.documents.length > 0 ? (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {vendor.documents.map((doc: VendorDocument) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-soft p-4 transition-colors hover:border-primary/50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <DocumentTextIcon className="h-4 w-4 text-primary shrink-0" />
                      <p className="text-xs font-semibold text-text-heading uppercase">
                        {getDocTypeLabel(doc.documentType)}
                      </p>
                    </div>
                    <p className="truncate text-xs text-text-muted mt-1" title={doc.fileName}>
                      {doc.fileName || "View Document"}
                    </p>
                  </div>
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-surface-elevated transition-colors"
                  >
                    <span>View</span>
                    <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-border p-6 text-center text-sm text-text-muted">
              No documents available or documents were verified directly.
            </div>
          )}
        </Card>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Vendor Profile"
      >
        <form onSubmit={handleSubmitEdit} className="space-y-5">
          <p className="text-xs text-text-muted">
            Update your business details, addresses, and bank payout information.
          </p>

          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Company Details
            </h4>
            <Input
              label="Company / Business Name *"
              type="text"
              value={formData.businessName || ""}
              onChange={(e) => handleFieldChange("businessName", e.target.value)}
              placeholder="e.g. Apex Traders Pvt Ltd"
              required
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Contact Person Name"
                type="text"
                value={formData.ownerName || ""}
                onChange={(e) => handleFieldChange("ownerName", e.target.value)}
                placeholder="Full Name"
              />
              <Input
                label="Phone Number"
                type="text"
                value={formData.phoneNumber || ""}
                onChange={(e) => handleFieldChange("phoneNumber", e.target.value)}
                placeholder="e.g. 9876543210"
              />
            </div>
          </div>

          <div className="border-t border-border pt-4 space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Addresses
            </h4>

            <div>
              <label className="mb-1 block text-xs font-medium text-text-heading">
                Registered Business Address *
              </label>
              <textarea
                className="w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm text-text-body focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                rows={2}
                value={formData.address || ""}
                onChange={(e) => handleFieldChange("address", e.target.value)}
                placeholder="Registered office address with city, state & pincode"
                required
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-medium text-text-heading">
                  Pickup / Dispatch Address *
                </label>
                <button
                  type="button"
                  onClick={handleCopyBusinessAddressToPickup}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Same as Business Address
                </button>
              </div>
              <textarea
                className="w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm text-text-body focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                rows={2}
                value={formData.pickupAddress || ""}
                onChange={(e) => handleFieldChange("pickupAddress", e.target.value)}
                placeholder="Address where delivery couriers can collect orders"
                required
              />
              <p className="mt-1 text-[11px] text-text-muted">
                Crucial for India Post / courier dispatch pickups.
              </p>
            </div>

            <div>
              <Input
                label="Pickup PIN Code (6-digits)"
                type="text"
                maxLength={6}
                value={formData.pickupPincode || ""}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  handleFieldChange("pickupPincode", val);
                }}
                placeholder="e.g. 122003"
              />
              <p className="mt-1 text-[11px] text-text-muted">
                Used by Delhivery as origin_pin to calculate Expected Turnaround Time (TAT) for your products.
              </p>
            </div>
          </div>

          <div className="border-t border-border pt-4 space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Bank Account Details
            </h4>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Bank Account Number"
                type="text"
                value={formData.bankAccountNumber || ""}
                onChange={(e) => handleFieldChange("bankAccountNumber", e.target.value)}
                placeholder="e.g. 123456789012"
              />
              <Input
                label="IFSC Code"
                type="text"
                value={formData.ifscCode || ""}
                onChange={(e) => handleFieldChange("ifscCode", e.target.value)}
                placeholder="e.g. HDFC0001234"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Account Holder Name"
                type="text"
                value={formData.bankAccountHolderName || ""}
                onChange={(e) => handleFieldChange("bankAccountHolderName", e.target.value)}
                placeholder="Name as per bank passbook"
              />
              <Input
                label="Bank Name"
                type="text"
                value={formData.bankName || ""}
                onChange={(e) => handleFieldChange("bankName", e.target.value)}
                placeholder="e.g. HDFC Bank, SBI"
              />
            </div>

            <Input
              label="Branch Name / Location"
              type="text"
              value={formData.bankBranch || ""}
              onChange={(e) => handleFieldChange("bankBranch", e.target.value)}
              placeholder="e.g. MG Road Branch"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={isUpdating}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default memo(VendorProfilePage);
