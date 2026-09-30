import { memo, useState, useMemo, useDeferredValue, useEffect } from "react";
import { useSearchParams } from "react-router";
import { Card, Table, TablePagination, Badge, Button, Input, Modal, Select, Tooltip } from "../components/ui";
import { useGetVendorPortalReviewsQuery } from "../store/api/edenApi";
import {
  markVendorSidebarReviewsSeen,
  dispatchSidebarVendorReviewsRefresh,
} from "../lib/header-notifications";
import {
  MagnifyingGlassIcon,
  StarIcon as StarOutlineIcon,
  Squares2X2Icon,
  ChatBubbleBottomCenterTextIcon,
  CalendarDaysIcon,
  ShoppingBagIcon,
  UserCircleIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import type { AdminReviewRow } from "../types";

function VendorReviewManagement() {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [selectedReview, setSelectedReview] = useState<AdminReviewRow | null>(null);

  // Pagination state (default: 10 items)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Checkbox selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const {
    data: rows = [],
    isLoading,
  } = useGetVendorPortalReviewsQuery();

  useEffect(() => {
    markVendorSidebarReviewsSeen();
    dispatchSidebarVendorReviewsRefresh();
  }, []);

  useEffect(() => {
    if (rows.length > 0) {
      markVendorSidebarReviewsSeen();
      dispatchSidebarVendorReviewsRefresh();
    }
  }, [rows.length]);

  const deferredQuery = useDeferredValue(searchQuery);

  // Summary statistics
  const stats = useMemo(() => {
    const total = rows.length;
    if (total === 0) {
      return { total: 0, average: "0.0", fiveStars: 0, positivePercentage: "0%" };
    }
    const sum = rows.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    const avg = (sum / total).toFixed(1);
    const fiveStars = rows.filter((r) => Number(r.rating) === 5).length;
    const positiveCount = rows.filter((r) => Number(r.rating) >= 4).length;
    const positivePercentage = `${Math.round((positiveCount / total) * 100)}%`;

    return { total, average: avg, fiveStars, positivePercentage };
  }, [rows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    let result = rows;

    if (ratingFilter !== "all") {
      const targetRating = Number(ratingFilter);
      result = result.filter((r) => Number(r.rating) === targetRating);
    }

    const q = deferredQuery.toLowerCase().trim();
    if (!q) return result;

    return result.filter(
      (r) =>
        r.product?.name?.toLowerCase().includes(q) ||
        r.order?.orderId?.toLowerCase().includes(q) ||
        r.orderId?.toLowerCase().includes(q) ||
        r.customer?.customerName?.toLowerCase().includes(q) ||
        r.customer?.email?.toLowerCase().includes(q) ||
        r.comment?.toLowerCase().includes(q)
    );
  }, [rows, deferredQuery, ratingFilter]);

  const paginatedRows = useMemo(
    () => filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredRows, currentPage, pageSize]
  );

  const allOnPageSelected = paginatedRows.length > 0 && paginatedRows.every((r) => selectedIds.has(r.id));
  const isIndeterminate = selectedIds.size > 0 && !allOnPageSelected;

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        paginatedRows.forEach((r) => next.delete(r.id));
      } else {
        paginatedRows.forEach((r) => next.add(r.id));
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

  // Table columns: Select, Order ID, Date, Product Name, Customer, Rating, Review Comment
  const columns = [
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
          aria-label="Select all reviews on page"
        />
      ),
      className: "w-10 px-3 text-center",
      mobileHeaderStart: true,
      render: (row: AdminReviewRow) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.id)}
          onChange={() => toggleSelectRow(row.id)}
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer accent-primary"
          aria-label="Select review"
        />
      ),
    },
    {
      key: "orderId",
      header: "Order ID",
      className: "whitespace-nowrap min-w-[7.5rem]",
      render: (row: AdminReviewRow) => {
        const displayId = row.order?.orderId || row.orderId;
        return displayId ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-surface-alt border border-border text-primary whitespace-nowrap">
            #{displayId}
          </span>
        ) : (
          <span className="text-xs text-text-muted italic whitespace-nowrap">N/A</span>
        );
      },
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
            <span className="text-[11px] text-text-muted whitespace-nowrap">
              {timeStr}
            </span>
          </div>
        );
      },
    },
    {
      key: "product",
      header: "Product Name",
      mobileCardTitle: true,
      className: "min-w-[12rem] max-w-[16rem]",
      render: (row: AdminReviewRow) => (
        <div className="flex items-center gap-3 py-1 min-w-0">
          <div className="h-10 w-10 shrink-0 rounded-lg overflow-hidden border border-border bg-surface-alt flex items-center justify-center">
            {row.product?.imageUrl ? (
              <img
                src={row.product.imageUrl}
                alt={row.product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <Squares2X2Icon className="h-5 w-5 text-text-muted" />
            )}
          </div>
          <div className="min-w-0 max-w-xs">
            <p
              className="font-medium text-sm text-text-heading truncate"
              title={row.product?.name || "Product"}
            >
              {row.product?.name || <span className="italic text-text-muted">Unknown Product</span>}
            </p>
            <p className="text-[11px] text-text-muted font-mono truncate">
              {row.productId ? `ID: ${row.productId.slice(0, 8)}...` : ""}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      className: "whitespace-nowrap min-w-[8.5rem] max-w-[13rem]",
      render: (row: AdminReviewRow) => {
        const name = row.customer?.customerName || "Customer";
        return (
          <div className="min-w-0 max-w-[170px] text-xs">
            <Tooltip content={name} side="top" className="max-w-full min-w-0">
              <span
                className="font-medium text-text-heading truncate block whitespace-nowrap cursor-default"
                title={name}
              >
                {name}
              </span>
            </Tooltip>
            {row.customer?.email && (
              <span
                className="text-[11px] text-text-muted truncate block max-w-[160px] whitespace-nowrap"
                title={row.customer.email}
              >
                {row.customer.email}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "rating",
      header: "Rating",
      className: "whitespace-nowrap w-36",
      render: (row: AdminReviewRow) => {
        const score = Number(row.rating) || 0;
        return (
          <div className="flex items-center gap-2 whitespace-nowrap">
            <div className="flex items-center text-amber-400">
              {[1, 2, 3, 4, 5].map((star) =>
                star <= score ? (
                  <StarSolidIcon key={star} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ) : (
                  <StarOutlineIcon key={star} className="h-4 w-4 text-slate-300" />
                )
              )}
            </div>
            <Badge
              variant={
                score >= 4 ? "success" : score <= 2 ? "error" : "warning"
              }
              className="font-semibold text-xs px-1.5 py-0.5"
            >
              {score}.0
            </Badge>
          </div>
        );
      },
    },
    {
      key: "comment",
      header: "Review Comment",
      className: "min-w-[12rem] max-w-md",
      render: (row: AdminReviewRow) => (
        <div className="max-w-md text-xs text-text-body">
          {row.comment ? (
            <p className="line-clamp-2" title={row.comment}>
              “{row.comment}”
            </p>
          ) : (
            <span className="italic text-text-muted">No comment provided</span>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "View",
      className: "w-20 text-center whitespace-nowrap",
      render: (row: AdminReviewRow) => (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="p-1.5 hover:text-primary"
            onClick={() => setSelectedReview(row)}
            title="View full review details"
          >
            <EyeIcon className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Reviews */}
        <div className="p-5 rounded-2xl border border-border bg-surface shadow-xs">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Total Reviews</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <ChatBubbleBottomCenterTextIcon className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-text-heading">
              {isLoading ? "..." : stats.total}
            </span>
            <span className="text-xs text-text-muted">reviews</span>
          </div>
        </div>

        {/* Card 2: Average Rating */}
        <div className="p-5 rounded-2xl border border-border bg-surface shadow-xs">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Average Rating</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <StarSolidIcon className="h-5 w-5 fill-amber-500 text-amber-500" />
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-3xl font-black text-text-heading">
              {isLoading ? "..." : stats.average}
            </span>
            <span className="text-xs text-text-muted">/ 5.0</span>
            <div className="flex items-center text-amber-400 ml-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <StarSolidIcon
                  key={star}
                  className={`h-3.5 w-3.5 ${star <= Math.round(Number(stats.average))
                    ? "text-amber-400 fill-amber-400"
                    : "text-slate-200 fill-slate-200 dark:text-slate-700"
                    }`}
                />
              ))}
            </div>
          </div>

        </div>

        {/* Card 3: 5-Star Reviews */}
        <div className="p-5 rounded-2xl border border-border bg-surface shadow-xs">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-bold uppercase tracking-wider">5-Star Ratings</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <StarSolidIcon className="h-5 w-5 fill-emerald-500 text-emerald-500" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-text-heading">
              {isLoading ? "..." : stats.fiveStars}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
              Top Rated
            </span>
          </div>

        </div>

        {/* Card 4: Positive % */}
        <div className="p-5 rounded-2xl border border-border bg-surface shadow-xs">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Positive Feedback</span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
              <ShoppingBagIcon className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-text-heading">
              {isLoading ? "..." : stats.positivePercentage}
            </span>
            <span className="text-xs text-text-muted">4 & 5 star ratings</span>
          </div>

        </div>
      </div>

      {/* Main Reviews Card */}
      <Card>
        {/* Filters */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="w-full sm:max-w-md">
            <Input
              placeholder="Search by product, order ID, customer or comment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              endNode={<MagnifyingGlassIcon className="h-4 w-4 text-muted-foreground" />}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-text-muted whitespace-nowrap">
              Filter by Rating:
            </span>
            <Select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="w-36 text-xs"
              options={[
                { value: "all", label: "All Ratings" },
                { value: "5", label: "⭐⭐⭐⭐⭐ (5)" },
                { value: "4", label: "⭐⭐⭐⭐ (4)" },
                { value: "3", label: "⭐⭐⭐ (3)" },
                { value: "2", label: "⭐⭐ (2)" },
                { value: "1", label: "⭐ (1)" },
              ]}
            />
          </div>
        </div>

        {/* Reviews Table */}
        <div className="p-4 space-y-3">
          <Table
            columns={columns}
            data={paginatedRows}
            keyExtractor={(row) => row.id}
            isLoading={isLoading}
            emptyMessage={
              isLoading
                ? "Loading reviews..."
                : searchQuery || ratingFilter !== "all"
                  ? "No reviews match your filters."
                  : "No customer reviews received yet."
            }
          />

          <TablePagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={filteredRows.length}
            totalPages={Math.max(1, Math.ceil(filteredRows.length / pageSize))}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            pageSizeOptions={[10, 20, 50, 80, 100]}
            itemLabel="reviews"
            disabled={isLoading}
          />
        </div>
      </Card>

      {/* Review Details Modal */}
      {selectedReview && (
        <Modal
          isOpen={Boolean(selectedReview)}
          onClose={() => setSelectedReview(null)}
          title="Review Details"
          size="md"
        >
          <div className="p-5 space-y-4">
            {/* Product Header */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-alt border border-border">
              <div className="h-12 w-12 rounded-lg overflow-hidden border border-border bg-surface shrink-0 flex items-center justify-center">
                {selectedReview.product?.imageUrl ? (
                  <img
                    src={selectedReview.product.imageUrl}
                    alt={selectedReview.product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Squares2X2Icon className="h-6 w-6 text-text-muted" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-text-heading">
                  {selectedReview.product?.name || "Product"}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {selectedReview.product?.productCode && (
                    <span className="text-xs font-mono text-text-muted">
                      {selectedReview.product.productCode}
                    </span>
                  )}
                  <span className="text-xs text-text-muted font-mono">
                    ID: {selectedReview.productId}
                  </span>
                </div>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-border space-y-1">
                <span className="text-text-muted font-medium flex items-center gap-1.5">
                  <CalendarDaysIcon className="h-4 w-4" /> Review Date
                </span>
                <p className="font-semibold text-text-heading">
                  {new Date(selectedReview.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                <p className="text-[11px] text-text-muted">
                  {new Date(selectedReview.createdAt).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border space-y-1">
                <span className="text-text-muted font-medium flex items-center gap-1.5">
                  <ShoppingBagIcon className="h-4 w-4" /> Order Reference
                </span>
                <p className="font-mono font-semibold text-primary">
                  {selectedReview.order?.orderId || selectedReview.orderId
                    ? `#${selectedReview.order?.orderId || selectedReview.orderId}`
                    : "Not specified"}
                </p>
                <p className="text-[11px] text-text-muted">Verified Purchase</p>
              </div>

              <div className="p-3 rounded-lg border border-border space-y-1 col-span-2">
                <span className="text-text-muted font-medium flex items-center gap-1.5">
                  <UserCircleIcon className="h-4 w-4" /> Customer Information
                </span>
                <p className="font-semibold text-text-heading">
                  {selectedReview.customer?.customerName || "Customer"}
                </p>
                {selectedReview.customer?.email && (
                  <p className="text-text-muted">{selectedReview.customer.email}</p>
                )}
              </div>
            </div>

            {/* Rating & Comment */}
            <div className="p-4 rounded-xl bg-surface-alt border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-heading">Given Rating</span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center text-amber-400">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <StarSolidIcon
                        key={star}
                        className={`h-4 w-4 ${star <= Number(selectedReview.rating)
                          ? "fill-amber-400 text-amber-400"
                          : "fill-slate-200 text-slate-200"
                          }`}
                      />
                    ))}
                  </div>
                  <Badge
                    variant={
                      Number(selectedReview.rating) >= 4
                        ? "success"
                        : Number(selectedReview.rating) <= 2
                          ? "error"
                          : "warning"
                    }
                  >
                    {selectedReview.rating} / 5
                  </Badge>
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <span className="text-xs font-medium text-text-muted">Customer Feedback:</span>
                <p className="mt-1 text-sm text-text-heading whitespace-pre-wrap leading-relaxed">
                  {selectedReview.comment || (
                    <span className="italic text-text-muted">No comment text provided with this rating.</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setSelectedReview(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default memo(VendorReviewManagement);
