import { memo, useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { ChatBubbleLeftIcon, HeartIcon } from "@heroicons/react/24/outline";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";
import { Card, CardHeader, Badge } from "../components/ui";
import { toast } from "../lib/toast";
import {
  LS_STAFF_BLOG_LAST_SEEN,
  dispatchNotificationsRefresh,
} from "../lib/header-notifications";
import type { BlogFeedItem } from "../types";

function formatBlogDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StaffBlogPage() {
  const [items, setItems] = useState<BlogFeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<BlogFeedItem[]>(endpoints.blogStaffFeed);
      setItems(data);
    } catch (e) {
      toast.fromError(e, "Could not load blog");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (loading || items.length === 0) return;
    const maxT = Math.max(
      ...items.map((p) => new Date(p.publishedAt).getTime()),
    );
    localStorage.setItem(LS_STAFF_BLOG_LAST_SEEN, new Date(maxT).toISOString());
    dispatchNotificationsRefresh();
  }, [loading, items]);

  return (
    <div className="space-y-4">
      <CardHeader
        title="Blog"
      // subtitle="Updates from your team leads and admin."
      />
      {loading ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : items.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-sm text-text-muted">
            No posts yet. When admin publishes something for you, it will show
            here.
          </p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {items.map((p) => (
            <li key={p.id}>
              <Card className="transition-colors hover:border-primary/30">
                <Link to={`/blog/${p.id}`} className="block px-4 py-4 md:px-6">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="text-lg font-semibold text-text-heading">
                      {p.title}
                    </h2>
                    <Badge variant="muted">{formatBlogDate(p.publishedAt)}</Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-text-muted">
                    {p.excerpt}
                  </p>
                  <p className="mt-2 text-xs text-text-muted">
                    By {p.authorName}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-text-muted">
                    <span className="inline-flex items-center gap-1">
                      <HeartIcon
                        className={`h-4 w-4 ${p.likedByMe ? "text-error fill-current" : ""}`}
                      />
                      {p.likeCount}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <ChatBubbleLeftIcon className="h-4 w-4" />
                      {p.commentCount}
                    </span>
                  </div>
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default memo(StaffBlogPage);
