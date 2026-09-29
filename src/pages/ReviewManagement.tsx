import { memo, useState, useMemo, useDeferredValue } from "react";
import { Card, CardHeader, Table, Badge, Button, Input, Modal, Tooltip } from "../components/ui";
import {
  useDeleteAdminReviewMutation,
  useGetAdminReviewsQuery,
} from "../store/api/edenApi";
import { toast } from "../lib/toast";
import { ArrowPathIcon, MagnifyingGlassIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { AdminReviewRow } from "../types";

function ReviewManagementPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const {
    data: rows = [],
    isLoading,
    isFetching,
    refetch,
  } = useGetAdminReviewsQuery();
  const [deleteAdminReview] = useDeleteAdminReviewMutation();

  const handleDeleteClick = (id: string) => {
    setSelectedReviewId(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedReviewId) return;
    try {
      await deleteAdminReview(selectedReviewId).unwrap();
      toast.success("Review deleted successfully");
    } catch (e) {
      toast.fromError(e, "Failed to delete review");
    } finally {
      setDeleteConfirmOpen(false);
      setSelectedReviewId(null);
    }
  };

  const deferredQuery = useDeferredValue(searchQuery);

  const filteredRows = useMemo(() => {
    const q = deferredQuery.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter(r => 
      r.comment?.toLowerCase().includes(q) || 
      r.customer?.customerName.toLowerCase().includes(q) ||
      r.product?.name.toLowerCase().includes(q) ||
      r.order?.orderId.toLowerCase().includes(q) ||
      r.orderId?.toLowerCase().includes(q)
    );
  }, [rows, deferredQuery]);

  const columns = [
    {
      key: "orderId",
      header: "Order ID",
      className: "whitespace-nowrap min-w-[7.5rem]",
      render: (row: AdminReviewRow) => {
        const displayId = row.order?.orderId || row.orderId;
        return (
          <span className="font-mono text-xs font-medium whitespace-nowrap">
            {displayId ? (displayId.includes('-') ? displayId.toUpperCase() : displayId) : <span className="italic text-muted-foreground">N/A</span>}
          </span>
        );
      }
    },
    {
      key: "createdAt",
      header: "Date",
      className: "whitespace-nowrap min-w-[7.5rem]",
      render: (row: AdminReviewRow) => {
        const d = new Date(row.createdAt);
        const dateStr = d.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
        const timeStr = d.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
        return (
          <div className="flex flex-col text-xs leading-snug">
            <span className="font-semibold text-text-heading whitespace-nowrap">
              {dateStr}
            </span>
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
              {timeStr}
            </span>
          </div>
        );
      },
    },
    { 
      key: "product", 
      header: "Product",
      className: "min-w-[10rem] max-w-[15rem]",
      render: (row: AdminReviewRow) => (
        <span className="truncate block" title={row.product?.name || row.productId}>
          {row.product?.name || row.productId}
        </span>
      )
    },
    { 
      key: "customer", 
      header: "Customer",
      className: "whitespace-nowrap min-w-[8.5rem] max-w-[13rem]",
      render: (row: AdminReviewRow) => {
        const name = row.customer?.customerName || "Unknown";
        return (
          <div className="min-w-0 max-w-[160px]">
            <Tooltip content={name} side="top" className="max-w-full min-w-0">
              <span className="font-medium truncate block whitespace-nowrap cursor-default" title={name}>
                {name}
              </span>
            </Tooltip>
            {row.customer?.email && (
              <div className="text-xs text-muted-foreground truncate whitespace-nowrap" title={row.customer.email}>
                {row.customer.email}
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: "rating",
      header: "Rating",
      className: "whitespace-nowrap",
      render: (row: AdminReviewRow) => (
        <Badge variant={row.rating >= 4 ? "success" : row.rating <= 2 ? "error" : "warning"}>
          {row.rating} / 5
        </Badge>
      ),
    },
    {
      key: "comment",
      header: "Comment",
      render: (row: AdminReviewRow) => (
        <div className="max-w-xs truncate" title={row.comment || ""}>
          {row.comment || <span className="text-muted-foreground italic">No comment</span>}
        </div>
      )
    },
    {
      key: "actions",
      header: "",
      className: "w-16 text-right whitespace-nowrap",
      render: (row: AdminReviewRow) => (
        <div className="flex justify-end">
          <button
            type="button"
            className="p-2 text-error hover:bg-error/10 rounded-md transition-colors focus:outline-none"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDeleteClick(row.id);
            }}
            title="Delete Review"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          action={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" aria-hidden />
              Refresh
            </Button>
          }
        />
        
        <div className="mb-4 max-w-md px-4">
          <Input
            placeholder="Search reviews..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            endNode={<MagnifyingGlassIcon className="h-4 w-4 text-muted-foreground" />}
          />
        </div>

        <div className="px-4 pb-4">
          <Table
            columns={columns}
            data={filteredRows}
            keyExtractor={(row) => row.id}
            emptyMessage={isLoading ? "Loading..." : "No reviews found."}
          />
        </div>
      </Card>

      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Delete Review"
      >
        <div className="p-4 space-y-4">
          <p className="text-sm">
            Are you sure you want to delete this review? This action cannot be undone and will recalculate the product's average rating.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirmDelete}
            >
              Delete Review
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default memo(ReviewManagementPage);
