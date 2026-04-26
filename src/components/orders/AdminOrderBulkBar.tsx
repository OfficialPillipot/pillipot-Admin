import { memo, useCallback } from "react";
import { Button } from "../ui";
import type { OrderStatus } from "../../types";
import { ArrowDownTrayIcon } from "@heroicons/react/20/solid";
import { toast } from "../../lib/toast";

export type AdminBulkAdvanceAction =
  | null
  | { kind: "blocked"; message: string }
  | {
    kind: "action";
    current: OrderStatus;
    next: OrderStatus;
    label: string;
    hint?: string;
  };

export type AdminOrderBulkBarProps = {
  selectedCount: number;
  bulkAdvanceAction: AdminBulkAdvanceAction;
  bulkStatusLoading: boolean;
  bulkPdfLoading: boolean;
  onBulkAdvance: (next: OrderStatus) => void;
  onDownloadSelectedPdf: () => void;
  onClearSelection: () => void;
  filteredOrders?: any[];
  selectedIds?: Set<string>;
  defaultSender?: any;
};

function AdminOrderBulkBarComponent({
  selectedCount,
  bulkAdvanceAction,
  bulkStatusLoading,
  bulkPdfLoading,
  onBulkAdvance,
  onDownloadSelectedPdf,
  onClearSelection,
  filteredOrders,
  selectedIds,
  defaultSender,
}: AdminOrderBulkBarProps) {
  if (selectedCount <= 0) return null;

  const downloadExcel = useCallback(() => {
    if (!filteredOrders || !selectedIds) return;
    
    const selectedOrders = filteredOrders.filter((o) => selectedIds.has(o.id));

    const headers = [
      "SERIAL NUMBER", "BARCODE NO", "PHYSICAL WEIGHT", "REG", "OTP", 
      "RECEIVER CITY", "RECEIVER PINCODE", "RECEIVER NAME", "RECEIVER ADD LINE 1", 
      "RECEIVER ADD LINE 2", "RECEIVER ADD LINE 3", "ACK", "SENDER MOBILE NO", 
      "SENDER MOBILE NO", "PREPAYMENT CODE", "VALUE OF PREPAYMENT", "CODR/COD", 
      "VALUE FOR CODR/COD", "INSURANCE TYPE", "VALUE OF INSURANCE", "SHAPE OF ARTICLE", 
      "LENGTH", "BREADTH/DIAMETER", "HEIGHT", "PRIORITY FLAG", "DELIVERY INSTRUCTION", 
      "DELIVERY SLOT", "INSTRUCTION RTS", "SENDER NAME", "SENDER COMPANY NAME", 
      "SENDER CITY", "SENDER STATE/UT", "SENDER PINCODE", "SENDER EMAILID", 
      "SENDER ALT CONTACT", "SENDER KYC", "SENDER TAX", "RECEIVER COMPANY NAME", 
      "RECEIVER STATE/UT", "RECEIVER EMAILID", "RECEIVER ALT CONTACT", "RECEIVER KYC", 
      "RECEIVER TAX REF", "ALT ADDRESS FLAG", "BULK REFERENCE", "SENDER ADD LINE 1", 
      "SENDER ADD LINE 2", "SENDER ADD LINE 3"
    ];

    const rows = selectedOrders.map((o, index) => {
      const serialNumber = String(index + 1);
      const barcodeNo = o.trackingId || "";
      const receiverCity = o.district || o.postOffice || "";
      const receiverPincode = o.pincode || "";
      const receiverName = o.customerName || "";
      const receiverAddLine1 = o.deliveryAddress || "";
      const senderMobileNo = o.phone || "";
      const receiverState = o.state || "";
      const receiverEmail = o.email || "";
      const receiverAltContact = o.secondaryPhone || "";

      return [
        serialNumber,        // SERIAL NUMBER
        barcodeNo,           // BARCODE NO
        "",                  // PHYSICAL WEIGHT
        "",                  // REG
        "",                  // OTP
        receiverCity,        // RECEIVER CITY
        receiverPincode,     // RECEIVER PINCODE
        receiverName,        // RECEIVER NAME
        receiverAddLine1,    // RECEIVER ADD LINE 1
        "",                  // RECEIVER ADD LINE 2
        "",                  // RECEIVER ADD LINE 3
        "",                  // ACK
        senderMobileNo,      // SENDER MOBILE NO
        senderMobileNo,      // SENDER MOBILE NO
        "",                  // PREPAYMENT CODE
        "",                  // VALUE OF PREPAYMENT
        "",                  // CODR/COD
        "",                  // VALUE FOR CODR/COD
        "",                  // INSURANCE TYPE
        "",                  // VALUE OF INSURANCE
        "",                  // SHAPE OF ARTICLE
        "",                  // LENGTH
        "",                  // BREADTH/DIAMETER
        "",                  // HEIGHT
        "",                  // PRIORITY FLAG
        "",                  // DELIVERY INSTRUCTION
        "",                  // DELIVERY SLOT
        "",                  // INSTRUCTION RTS
        defaultSender?.name || "",                  // SENDER NAME
        defaultSender?.name || "",                  // SENDER COMPANY NAME
        defaultSender?.district || defaultSender?.cityState || "", // SENDER CITY
        defaultSender?.state || "",                 // SENDER STATE/UT
        defaultSender?.pincode || "",               // SENDER PINCODE
        defaultSender?.email || "",                 // SENDER EMAILID
        defaultSender?.phone || "",                 // SENDER ALT CONTACT
        "",                                         // SENDER KYC
        "",                                         // SENDER TAX
        "",                  // RECEIVER COMPANY NAME
        receiverState,       // RECEIVER STATE/UT
        receiverEmail,       // RECEIVER EMAILID
        receiverAltContact,  // RECEIVER ALT CONTACT
        "",                  // RECEIVER KYC
        "",                  // RECEIVER TAX REF
        "",                  // ALT ADDRESS FLAG
        "",                  // BULK REFERENCE
        defaultSender?.streetLine1 || "",           // SENDER ADD LINE 1
        defaultSender?.streetLine2 || "",           // SENDER ADD LINE 2
        defaultSender?.area || ""                   // SENDER ADD LINE 3
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Orders exported successfully");
  }, [filteredOrders, selectedIds, defaultSender]);

  const showExportButton = bulkAdvanceAction?.kind === "action" && bulkAdvanceAction?.current === "packed";

  return (
    <div className="mb-2 flex flex-col gap-2 rounded-[var(--radius-md)] border border-border bg-surface-alt/50 p-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
      <span className="text-sm font-medium text-text-heading">
        {selectedCount} order{selectedCount === 1 ? "" : "s"} selected
      </span>
      {bulkAdvanceAction?.kind === "blocked" && (
        <p className="max-w-xl text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-[var(--radius-sm)] px-2 py-1.5">
          {bulkAdvanceAction.message}
        </p>
      )}
      {bulkAdvanceAction?.kind === "action" && (
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
          <Button
            type="button"
            size="sm"
            loading={bulkStatusLoading}
            onClick={() => onBulkAdvance(bulkAdvanceAction.next)}
          >
            {bulkAdvanceAction.label}
          </Button>
          <span className="text-xs text-text-muted capitalize">
            All selected: {bulkAdvanceAction.current}
          </span>
          {bulkAdvanceAction.hint ? (
            <span className="text-xs text-text-muted max-w-md">
              {bulkAdvanceAction.hint}
            </span>
          ) : null}
        </div>
      )}
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => void onDownloadSelectedPdf()}
        loading={bulkPdfLoading}
        className="sm:ml-auto"
      >
        Download selected PDF
      </Button>
      <button
        type="button"
        className="text-sm font-medium text-primary underline hover:no-underline"
        onClick={onClearSelection}
      >
        Clear selection
      </button>
      {showExportButton && (
        <Button
          onClick={downloadExcel}
          variant="secondary"
          size="sm"
          icon={<ArrowDownTrayIcon className="h-4 w-4" />}
        >
          Export CSV
        </Button>
      )}
    </div>
  );
}

export const AdminOrderBulkBar = memo(AdminOrderBulkBarComponent);
