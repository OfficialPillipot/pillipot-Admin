import { memo, useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { BellIcon } from "@heroicons/react/24/outline";
import { api } from "../../api/client";
import { endpoints } from "../../api/endpoints";
import { hasPermission } from "../../lib/permissions";
import {
  LS_ADMIN_ENQUIRY_LAST_SEEN,
  LS_STAFF_BLOG_LAST_SEEN,
  HEADER_NOTIFICATIONS_REFRESH,
} from "../../lib/header-notifications";
import type { BlogFeedItem, StaffEnquiryListRow, User } from "../../types";

const POLL_MS = 25_000;

function postPublishedMs(iso: string): number {
  const n = new Date(iso).getTime();
  return Number.isFinite(n) ? n : 0;
}

function badgeLabel(n: number): string {
  if (n <= 0) return "Notifications";
  return n > 9 ? "9+ notifications" : `${n} notification${n === 1 ? "" : "s"}`;
}

function HeaderNotificationsComponent({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const [blogUnread, setBlogUnread] = useState(0);
  const [enquiryUnread, setEnquiryUnread] = useState(0);

  const isStaff = user.role === "staff";
  const showAdminEnquiries =
    user.role === "super_admin" ||
    (user.role === "guest" && hasPermission(user, "staff_enquiries.view"));

  const refresh = useCallback(async () => {
    if (isStaff) {
      try {
        const feed = await api.get<BlogFeedItem[]>(endpoints.blogStaffFeed, {
          silent: true,
        });
        const last = localStorage.getItem(LS_STAFF_BLOG_LAST_SEEN);
        if (!last) {
          // Do not write last_seen here — only StaffBlog / StaffBlogPost set it after
          // the user actually opens the feed or a post. Otherwise every post looked
          // "read" before staff ever saw the blog.
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

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    const onRefresh = () => void refresh();
    window.addEventListener(HEADER_NOTIFICATIONS_REFRESH, onRefresh);
    return () => window.removeEventListener(HEADER_NOTIFICATIONS_REFRESH, onRefresh);
  }, [refresh]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [refresh]);

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

  const total = blogUnread + enquiryUnread;
  if (!isStaff && !showAdminEnquiries) return null;

  return (
    <div className="relative">
      <button
        id="header-notifications-trigger"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
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
          className="absolute right-0 top-full z-50 mt-1 w-[min(calc(100vw-2rem),16rem)] rounded-[var(--radius-md)] border border-border bg-surface py-2 shadow-[var(--shadow-dropdown)]"
          role="menu"
          onClick={(e) => e.stopPropagation()}
        >
          {isStaff ? (
            <Link
              to="/blog"
              role="menuitem"
              className="block px-3 py-2.5 text-sm transition-colors hover:bg-surface-alt"
              onClick={() => setOpen(false)}
            >
              <span className="font-medium text-text-heading">Blog</span>
              <span className="mt-0.5 block text-xs text-text-muted">
                {blogUnread > 0
                  ? `${blogUnread} new post${blogUnread === 1 ? "" : "s"} from admin`
                  : "No new posts"}
              </span>
            </Link>
          ) : null}
          {showAdminEnquiries ? (
            <Link
              to="/admin/staff-enquiries"
              role="menuitem"
              className="block px-3 py-2.5 text-sm transition-colors hover:bg-surface-alt"
              onClick={() => setOpen(false)}
            >
              <span className="font-medium text-text-heading">Staff enquiries</span>
              <span className="mt-0.5 block text-xs text-text-muted">
                {enquiryUnread > 0
                  ? `${enquiryUnread} open message${enquiryUnread === 1 ? "" : "s"}`
                  : "No new staff messages"}
              </span>
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export const HeaderNotifications = memo(HeaderNotificationsComponent);
