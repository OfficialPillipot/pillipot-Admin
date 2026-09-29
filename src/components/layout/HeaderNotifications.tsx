import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  BellIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import { api } from "../../api/client";
import { endpoints } from "../../api/endpoints";
import { hasPermission } from "../../lib/permissions";
import {
  LS_ADMIN_ENQUIRY_LAST_SEEN,
  LS_STAFF_BLOG_LAST_SEEN,
  LS_VENDOR_HEADER_NOTIF_LAST_SEEN,
  HEADER_NOTIFICATIONS_REFRESH,
  markVendorNotificationsSeen,
  REMINDER_HOURS,
  getPendingReminderLevel,
  isVendorOrderUnread,
  isVendorReviewUnread,
} from "../../lib/header-notifications";
import { isCompletedOrCodOrder } from "../../lib/orderUtils";
import {
  useGetVendorPortalOrdersQuery,
  useGetVendorPortalReviewsQuery,
} from "../../store/api/edenApi";
import type { AdminReviewRow, BlogFeedItem, Order, StaffEnquiryListRow, User } from "../../types";

function postPublishedMs(iso: string): number {
  const n = new Date(iso).getTime();
  return Number.isFinite(n) ? n : 0;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (isNaN(diff) || diff < 0) return "just now";
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function badgeLabel(n: number): string {
  if (n <= 0) return "Notifications";
  return n > 9 ? "9+ notifications" : `${n} notification${n === 1 ? "" : "s"}`;
}

function getBalanceTime24h(createdAt: string): {
  hours: number;
  mins: number;
  isExpired: boolean;
  text: string;
} {
  const created = new Date(createdAt).getTime();
  const expiresAt = created + 24 * 60 * 60 * 1000;
  const diff = expiresAt - Date.now();
  if (diff <= 0) {
    return { hours: 0, mins: 0, isExpired: true, text: "Auto-cancelling (24h passed)" };
  }
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours === 0) {
    return { hours, mins, isExpired: false, text: `${mins}m balance left` };
  }
  return { hours, mins, isExpired: false, text: `${hours}h ${mins}m balance left` };
}

function playNotificationSound(): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.28);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.12); // A5
    gain2.gain.setValueAtTime(0.22, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.52);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.52);
  } catch {
    /* ignore browser audio restrictions */
  }
}

function HeaderNotificationsComponent({ user }: { user: User }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [blogUnread, setBlogUnread] = useState(0);
  const [enquiryUnread, setEnquiryUnread] = useState(0);
  const [vendorOrders, setVendorOrders] = useState<Order[]>([]);
  const [vendorOrderUnread, setVendorOrderUnread] = useState(0);
  const [vendorReviews, setVendorReviews] = useState<AdminReviewRow[]>([]);
  const [vendorReviewUnread, setVendorReviewUnread] = useState(0);
  const [activeFilter, setActiveFilter] = useState<"all" | "orders" | "reviews">("all");

  const isStaff = user.role === "staff";
  const isVendor = user.role === "vendor";
  const showAdminEnquiries =
    user.role === "super_admin" ||
    (user.role === "guest" && hasPermission(user, "staff_enquiries.view"));

  // Shared RTK Query hooks: deduplicates requests with Sidebar.tsx automatically
  const { data: rawVendorOrders = [], refetch: refetchVendorOrders } = useGetVendorPortalOrdersQuery(undefined, {
    skip: !isVendor,
    pollingInterval: 20000,
  });

  const { data: rawVendorReviews = [], refetch: refetchVendorReviews } = useGetVendorPortalReviewsQuery(undefined, {
    skip: !isVendor,
    pollingInterval: 20000,
  });

  // Keep track of known orders and triggered reminder milestones
  const knownOrderIdsRef = useRef<Set<string> | null>(null);
  const remindedMilestonesRef = useRef<Set<string>>(new Set());

  // Keep track of known reviews
  const knownReviewIdsRef = useRef<Set<string> | null>(null);

  // Update vendor orders notification state whenever shared RTK Query orders update
  useEffect(() => {
    if (!isVendor) return;
    const valid = rawVendorOrders.filter(isCompletedOrCodOrder);

    // Sort: Prioritize higher reminder levels (23h, 22h, 20h, 18h, 12h), then pending, then newest
    const sorted = [...valid].sort((a, b) => {
      const aLevel = getPendingReminderLevel(a) ?? 0;
      const bLevel = getPendingReminderLevel(b) ?? 0;
      if (aLevel !== bLevel) return bLevel - aLevel;
      const aPending = a.status === "pending";
      const bPending = b.status === "pending";
      if (aPending && !bPending) return -1;
      if (!aPending && bPending) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    setVendorOrders(sorted.slice(0, 10));

    // Check unread count for header bell (based on notification bell's own last seen)
    const last = localStorage.getItem(LS_VENDOR_HEADER_NOTIF_LAST_SEEN);
    const lastSeenMs = last ? new Date(last).getTime() : 0;
    const unreadCount = valid.filter((o) => isVendorOrderUnread(o, lastSeenMs)).length;
    setVendorOrderUnread(unreadCount);

    // Detect real-time new incoming orders and reminder milestones (12h, 18h, 20h, 22h, 23h)
    if (knownOrderIdsRef.current === null) {
      knownOrderIdsRef.current = new Set(valid.map((o) => o.id));
      valid.forEach((o) => {
        if (o.status === "pending") {
          const elapsedMs = Date.now() - new Date(o.createdAt).getTime();
          REMINDER_HOURS.forEach((h) => {
            if (elapsedMs >= h * 60 * 60 * 1000) {
              remindedMilestonesRef.current.add(`${o.id}-${h}`);
            }
          });
        }
      });
    } else {
      const freshOrders = valid.filter((o) => !knownOrderIdsRef.current!.has(o.id));
      let hasNewMilestone = false;

      valid.forEach((o) => {
        if (o.status === "pending") {
          const elapsedMs = Date.now() - new Date(o.createdAt).getTime();
          REMINDER_HOURS.forEach((h) => {
            if (elapsedMs >= h * 60 * 60 * 1000) {
              const key = `${o.id}-${h}`;
              if (!remindedMilestonesRef.current.has(key)) {
                remindedMilestonesRef.current.add(key);
                hasNewMilestone = true;
              }
            }
          });
        }
      });

      let shouldAlert = false;
      if (freshOrders.length > 0) {
        freshOrders.forEach((o) => knownOrderIdsRef.current!.add(o.id));
        shouldAlert = true;
      }
      if (hasNewMilestone) {
        shouldAlert = true;
      }

      if (shouldAlert) {
        playNotificationSound();
      }
    }
  }, [rawVendorOrders, isVendor]);

  // Update vendor reviews notification state whenever shared RTK Query reviews update
  useEffect(() => {
    if (!isVendor) return;
    const sorted = [...rawVendorReviews].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    setVendorReviews(sorted.slice(0, 10));

    const last = localStorage.getItem(LS_VENDOR_HEADER_NOTIF_LAST_SEEN);
    const lastSeenMs = last ? new Date(last).getTime() : 0;
    const unreadCount = sorted.filter((r) => isVendorReviewUnread(r, lastSeenMs)).length;
    setVendorReviewUnread(unreadCount);

    if (knownReviewIdsRef.current === null) {
      knownReviewIdsRef.current = new Set(rawVendorReviews.map((r) => r.id));
    } else {
      const freshReviews = rawVendorReviews.filter((r) => !knownReviewIdsRef.current!.has(r.id));
      if (freshReviews.length > 0) {
        freshReviews.forEach((r) => knownReviewIdsRef.current!.add(r.id));
        playNotificationSound();
      }
    }
  }, [rawVendorReviews, isVendor]);

  const refresh = useCallback(async () => {
    if (isStaff) {
      try {
        const feed = await api.get<BlogFeedItem[]>(endpoints.blogStaffFeed, {
          silent: true,
        });
        const last = localStorage.getItem(LS_STAFF_BLOG_LAST_SEEN);
        if (!last) {
          setBlogUnread(feed.length);
        } else {
          const t = new Date(last).getTime();
          if (!Number.isFinite(t)) {
            setBlogUnread(feed.length);
          } else {
            setBlogUnread(feed.filter((p) => postPublishedMs(p.publishedAt) > t).length);
          }
        }
      } catch {
        /* ignore poll errors */
      }
    }

    if (showAdminEnquiries) {
      try {
        const rows = await api.get<StaffEnquiryListRow[]>(
          endpoints.staffEnquiriesAdmin,
          { silent: true },
        );
        const openRows = rows.filter((r) => r.status === "open");
        const last = localStorage.getItem(LS_ADMIN_ENQUIRY_LAST_SEEN);
        if (!last) {
          setEnquiryUnread(openRows.length);
        } else {
          const t = new Date(last).getTime();
          setEnquiryUnread(
            openRows.filter((r) => new Date(r.updatedAt).getTime() > t).length,
          );
        }
      } catch {
        /* ignore */
      }
    }
  }, [isStaff, showAdminEnquiries]);

  // Polling for non-RTK staff / admin feeds
  useEffect(() => {
    if (!isStaff && !showAdminEnquiries) return;
    void refresh();

    let intervalId: ReturnType<typeof setInterval> | null = null;
    const pollIntervalMs = 60_000;

    const stopPolling = () => {
      if (intervalId != null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      void refresh();
    };

    const startPolling = () => {
      if (intervalId != null) return;
      intervalId = window.setInterval(tick, pollIntervalMs);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refresh();
        startPolling();
      } else {
        stopPolling();
      }
    };

    if (document.visibilityState === "visible") {
      startPolling();
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh, isStaff, showAdminEnquiries]);

  useEffect(() => {
    const onRefresh = () => {
      if (isVendor) {
        void refetchVendorOrders();
        void refetchVendorReviews();
      }
      if (isStaff || showAdminEnquiries) {
        void refresh();
      }
    };
    window.addEventListener(HEADER_NOTIFICATIONS_REFRESH, onRefresh);
    return () => window.removeEventListener(HEADER_NOTIFICATIONS_REFRESH, onRefresh);
  }, [refresh, isVendor, isStaff, showAdminEnquiries, refetchVendorOrders, refetchVendorReviews]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const el = e.target as Node;
      const panel = document.getElementById("header-notifications-panel");
      const btn = document.getElementById("header-notifications-trigger");
      if (panel?.contains(el) || btn?.contains(el)) return;
      setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [open]);

  const markAllVendorNotificationsRead = () => {
    markVendorNotificationsSeen();
    setVendorOrderUnread(0);
    setVendorReviewUnread(0);
  };

  const toggleOpen = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next && isVendor) {
        markVendorNotificationsSeen();
        setVendorOrderUnread(0);
        setVendorReviewUnread(0);
      }
      return next;
    });
  };

  const handleOrderClick = (order: Order) => {
    markVendorNotificationsSeen();
    setVendorOrderUnread(0);
    setVendorReviewUnread(0);
    setOpen(false);
    navigate(`/vendor/orders?search=${encodeURIComponent(order.orderId)}`);
  };

  const handleReviewClick = (review: AdminReviewRow) => {
    markVendorNotificationsSeen();
    setVendorOrderUnread(0);
    setVendorReviewUnread(0);
    setOpen(false);
    const searchTarget = review.order?.orderId || review.orderId || review.product?.name || "";
    navigate(searchTarget ? `/vendor/reviews?search=${encodeURIComponent(searchTarget)}` : `/vendor/reviews`);
  };

  const vendorTotalUnread = vendorOrderUnread + vendorReviewUnread;
  const total = blogUnread + enquiryUnread + vendorTotalUnread;
  if (!isStaff && !showAdminEnquiries && !isVendor) return null;

  const vendorLastSeenMs = (() => {
    const s = localStorage.getItem(LS_VENDOR_HEADER_NOTIF_LAST_SEEN);
    return s ? new Date(s).getTime() : 0;
  })();

  type VendorNotifItem =
    | { type: "order"; id: string; date: string; data: Order }
    | { type: "review"; id: string; date: string; data: AdminReviewRow };

  const items: VendorNotifItem[] = useMemo(() => {
    const list: VendorNotifItem[] = [];
    if (activeFilter === "all" || activeFilter === "orders") {
      vendorOrders.forEach((o) =>
        list.push({ type: "order", id: o.id, date: o.createdAt, data: o })
      );
    }
    if (activeFilter === "all" || activeFilter === "reviews") {
      vendorReviews.forEach((r) =>
        list.push({ type: "review", id: r.id, date: r.createdAt, data: r })
      );
    }
    return list.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [vendorOrders, vendorReviews, activeFilter]);

  return (
    <div className="relative">
      <button
        id="header-notifications-trigger"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleOpen();
        }}
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-border bg-surface-alt text-text-muted shadow-sm transition-colors hover:text-text-heading focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:h-9 sm:w-9"
        aria-label={badgeLabel(total)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <BellIcon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
        {total > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold leading-none text-white sm:h-[18px] sm:min-w-[18px] sm:text-xs">
            {total > 9 ? "9+" : total}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          id="header-notifications-panel"
          className="absolute right-0 top-full z-50 mt-1.5 w-[min(calc(100vw-1.5rem),23rem)] overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-dropdown)] ring-1 ring-black/5"
          role="menu"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Title Bar */}
          <div className="flex items-center justify-between border-b border-border bg-surface-alt/70 px-3.5 py-2.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Notifications
              </span>
              {total > 0 && (
                <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[11px] font-bold text-primary">
                  {total}
                </span>
              )}
            </div>
            {isVendor && vendorTotalUnread > 0 && (
              <button
                type="button"
                onClick={markAllVendorNotificationsRead}
                className="text-xs font-medium text-primary hover:underline focus:outline-none"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Vendor Filter Tabs */}
          {isVendor && (vendorOrders.length > 0 || vendorReviews.length > 0) && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border bg-surface-alt/40">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors ${
                  activeFilter === "all"
                    ? "bg-primary text-white shadow-xs"
                    : "text-text-muted hover:text-text-heading hover:bg-surface-alt"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("orders")}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors inline-flex items-center gap-1 ${
                  activeFilter === "orders"
                    ? "bg-primary text-white shadow-xs"
                    : "text-text-muted hover:text-text-heading hover:bg-surface-alt"
                }`}
              >
                Orders
                {vendorOrderUnread > 0 && (
                  <span className={`px-1 rounded-full text-[9px] ${
                    activeFilter === "orders" ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                  }`}>
                    {vendorOrderUnread}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("reviews")}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors inline-flex items-center gap-1 ${
                  activeFilter === "reviews"
                    ? "bg-primary text-white shadow-xs"
                    : "text-text-muted hover:text-text-heading hover:bg-surface-alt"
                }`}
              >
                Reviews
                {vendorReviewUnread > 0 && (
                  <span className={`px-1 rounded-full text-[9px] ${
                    activeFilter === "reviews" ? "bg-white/20 text-white" : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                  }`}>
                    {vendorReviewUnread}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Vendor Notifications Feed */}
          {isVendor && (
            <div className="max-h-[22rem] overflow-y-auto divide-y divide-border">
              {items.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-surface-alt text-text-muted">
                    <CheckCircleIcon className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium text-text-heading">No notifications</p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    New orders and customer reviews will appear here in real time.
                  </p>
                </div>
              ) : (
                items.map((item) => {
                  if (item.type === "order") {
                    const ord = item.data;
                    const reminderLevel = getPendingReminderLevel(ord);
                    const balance = ord.status === "pending" ? getBalanceTime24h(ord.createdAt) : null;
                    const isUnread = isVendorOrderUnread(ord, vendorLastSeenMs);
                    const isPending = ord.status === "pending";

                    return (
                      <button
                        key={`order-${ord.id}`}
                        type="button"
                        onClick={() => handleOrderClick(ord)}
                        className={`group flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-surface-alt/80 ${
                          reminderLevel && reminderLevel >= 20
                            ? "bg-rose-500/[0.06]"
                            : reminderLevel
                            ? "bg-amber-500/[0.04]"
                            : isUnread
                            ? "bg-primary/[0.04]"
                            : ""
                        }`}
                      >
                        <div
                          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            reminderLevel && reminderLevel >= 20
                              ? "bg-rose-500/20 text-rose-600 dark:bg-rose-500/30 dark:text-rose-400"
                              : reminderLevel
                              ? "bg-amber-500/15 text-amber-600 dark:bg-amber-500/25 dark:text-amber-400"
                              : isPending
                              ? "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
                              : ord.status === "accepted"
                              ? "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                              : "bg-surface-alt text-text-muted"
                          }`}
                        >
                          <ClipboardDocumentListIcon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <p className="truncate text-xs font-semibold text-text-heading group-hover:text-primary">
                              #{ord.orderId}
                            </p>
                            <span className="shrink-0 text-[10px] text-text-muted">
                              {timeAgo(ord.createdAt)}
                            </span>
                          </div>
                          <p className="truncate text-xs font-medium text-text-muted">
                            {ord.productName || "Product"} {ord.quantity > 1 ? `(x${ord.quantity})` : ""}
                          </p>

                          {/* 24-hr Balance Time & Reminder Pill */}
                          {balance && (
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                  balance.isExpired
                                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                                    : balance.hours < 2
                                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-bold"
                                    : balance.hours < 6
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                                    : "border border-border/70 bg-surface-alt text-text-muted"
                                }`}
                              >
                                ⏱ {balance.text}
                              </span>
                              {reminderLevel ? (
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                                    reminderLevel >= 22
                                      ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                                      : reminderLevel >= 18
                                      ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                                      : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                                  }`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${
                                      reminderLevel >= 20 ? "bg-rose-600" : "bg-amber-600"
                                    }`}
                                  />
                                  {reminderLevel}h Reminder
                                </span>
                              ) : null}
                            </div>
                          )}

                          <div className="mt-1 flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold text-text-heading">
                              ₹{ord.sellingAmount}
                            </span>
                            {!reminderLevel && (
                              <span
                                className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize ${
                                  isPending
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                                    : ord.status === "accepted"
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                                    : ord.status === "dispatch"
                                    ? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
                                    : ord.status === "delivered"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                                    : "bg-surface-alt text-text-muted"
                                }`}
                              >
                                {ord.status === "pending" ? "Pending acceptance" : ord.status}
                              </span>
                            )}
                          </div>
                        </div>
                        {isUnread && (
                          <span
                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ring-2 ${
                              reminderLevel && reminderLevel >= 20
                                ? "bg-rose-600 ring-rose-600/30"
                                : reminderLevel
                                ? "bg-amber-500 ring-amber-500/30"
                                : "bg-primary ring-primary/20"
                            }`}
                            title={reminderLevel ? `${reminderLevel}h Reminder` : "Unread order"}
                            aria-hidden
                          />
                        )}
                      </button>
                    );
                  }

                  // Review Item
                  const rev = item.data;
                  const isUnread = isVendorReviewUnread(rev, vendorLastSeenMs);
                  const ratingNum = Number(rev.rating) || 0;

                  return (
                    <button
                      key={`review-${rev.id}`}
                      type="button"
                      onClick={() => handleReviewClick(rev)}
                      className={`group flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-surface-alt/80 ${
                        isUnread ? "bg-amber-500/[0.05]" : ""
                      }`}
                    >
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                        <StarSolidIcon className="h-4 w-4 fill-amber-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="truncate text-xs font-semibold text-text-heading group-hover:text-primary">
                            New Review ({ratingNum.toFixed(1)}★)
                          </p>
                          <span className="shrink-0 text-[10px] text-text-muted">
                            {timeAgo(rev.createdAt)}
                          </span>
                        </div>
                        <p className="truncate text-xs font-medium text-text-muted">
                          {rev.product?.name || "Product"} {rev.customer?.customerName ? `· ${rev.customer.customerName}` : ""}
                        </p>
                        {rev.comment ? (
                          <p className="mt-0.5 text-xs text-text-body line-clamp-1 italic text-text-muted" title={rev.comment}>
                            “{rev.comment}”
                          </p>
                        ) : null}
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200/60">
                            ⭐ {ratingNum.toFixed(1)}
                          </span>
                          {rev.order?.orderId ? (
                            <span className="text-[10px] text-text-muted font-mono">
                              #{rev.order.orderId}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      {isUnread && (
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500 ring-2 ring-amber-500/30"
                          title="Unread review"
                          aria-hidden
                        />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* Staff Blog Option */}
          {isStaff ? (
            <Link
              to="/blog"
              role="menuitem"
              className="block border-t border-border px-3.5 py-2.5 text-sm transition-colors hover:bg-surface-alt"
              onClick={() => setOpen(false)}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-text-heading">Staff Blog</span>
                {blogUnread > 0 && (
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    {blogUnread} new
                  </span>
                )}
              </div>
              <span className="mt-0.5 block text-xs text-text-muted">
                {blogUnread > 0
                  ? `${blogUnread} new post${blogUnread === 1 ? "" : "s"} from admin`
                  : "No new posts"}
              </span>
            </Link>
          ) : null}

          {/* Admin Enquiries Option */}
          {showAdminEnquiries ? (
            <Link
              to="/admin/staff-enquiries"
              role="menuitem"
              className="block border-t border-border px-3.5 py-2.5 text-sm transition-colors hover:bg-surface-alt"
              onClick={() => setOpen(false)}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-text-heading">Staff enquiries</span>
                {enquiryUnread > 0 && (
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    {enquiryUnread} new
                  </span>
                )}
              </div>
              <span className="mt-0.5 block text-xs text-text-muted">
                {enquiryUnread > 0
                  ? `${enquiryUnread} open message${enquiryUnread === 1 ? "" : "s"}`
                  : "No new staff messages"}
              </span>
            </Link>
          ) : null}

          {/* Vendor Footer Links */}
          {isVendor && (
            <div className="border-t border-border bg-surface-alt/40 p-2 flex items-center justify-around text-xs font-medium text-primary">
              <Link
                to="/vendor/orders"
                onClick={() => setOpen(false)}
                className="py-1 px-3 rounded-[var(--radius-sm)] hover:bg-surface-alt transition-colors"
              >
                View all orders →
              </Link>
              <span className="text-border">|</span>
              <Link
                to="/vendor/reviews"
                onClick={() => setOpen(false)}
                className="py-1 px-3 rounded-[var(--radius-sm)] hover:bg-surface-alt transition-colors"
              >
                View all reviews →
              </Link>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export const HeaderNotifications = memo(HeaderNotificationsComponent);
