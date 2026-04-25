import { memo, useCallback, useEffect, useState, useMemo } from "react";
import { Card, CardHeader, Table, Badge, Button, Input, Modal } from "../components/ui";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";
import { toast } from "../lib/toast";
import { ArrowPathIcon, MagnifyingGlassIcon, TrashIcon } from "@heroicons/react/24/outline";

interface ReviewRow {
  id: string;
  productId: string;
  customerId: string;
  orderId: string | null;
  rating: number;
  comment: string | null;
  createdAt: string;
  product?: {
    name: string;
  };
  customer?: {
    customerName: string;
    email: string;
  };
  order?: {
    orderId: string;
  };
}

function ReviewManagementPage() {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<ReviewRow[]>(endpoints.adminReviews);
      setRows(data);
    } catch (e) {
      toast.fromError(e, "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDeleteClick = (id: string) => {
    setSelectedReviewId(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedReviewId) return;
    try {
      await api.delete(endpoints.adminReviewById(selectedReviewId));
      toast.success("Review deleted successfully");
      setRows((prev) => prev.filter((r) => r.id !== selectedReviewId));
    } catch (e) {
      toast.fromError(e, "Failed to delete review");
    } finally {
      setDeleteConfirmOpen(false);
      setSelectedReviewId(null);
    }
  };

  const filteredRows = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter(r => 
      r.comment?.toLowerCase().includes(q) || 
      r.customer?.customerName.toLowerCase().includes(q) ||
      r.product?.name.toLowerCase().includes(q) ||
      r.order?.orderId.toLowerCase().includes(q) ||
      r.orderId?.toLowerCase().includes(q)
    );
  }, [rows, searchQuery]);

  const columns = [
    { 
      key: "product", 
      header: "Product",
      render: (row: ReviewRow) => row.product?.name || row.productId
    },
    { 
      key: "customer", 
      header: "Customer",
      render: (row: ReviewRow) => (
        <div>
          <div className="font-medium">{row.customer?.customerName || "Unknown"}</div>
          <div className="text-xs text-muted-foreground">{row.customer?.email}</div>
        </div>
      )
    },
    {
      key: "rating",
      header: "Rating",
      render: (row: ReviewRow) => (
        <Badge variant={row.rating >= 4 ? "success" : row.rating <= 2 ? "error" : "warning"}>
          {row.rating} / 5
        </Badge>
      ),
    },
    {
      key: "comment",
      header: "Comment",
      render: (row: ReviewRow) => (
        <div className="max-w-xs truncate" title={row.comment || ""}>
          {row.comment || <span className="text-muted-foreground italic">No comment</span>}
        </div>
      )
    },
    {
      key: "orderId",
      header: "Order ID",
      render: (row: ReviewRow) => {
        const displayId = row.order?.orderId || row.orderId;
        return <span className="font-mono text-xs">{displayId ? (displayId.includes('-') ? displayId.toUpperCase() : displayId) : <span className="italic text-muted-foreground">N/A</span>}</span>;
      }
    },
    {
      key: "createdAt",
      header: "Date",
      render: (row: ReviewRow) => new Date(row.createdAt).toLocaleDateString()
    },
    {
      key: "actions",
      header: "",
      render: (row: ReviewRow) => (
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
          title="Product Reviews"
          subtitle="Manage customer reviews and ratings from the web application."
          action={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={loading}
              onClick={() => void load()}
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
            emptyMessage={loading ? "Loading..." : "No reviews found."}
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
