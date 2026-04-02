import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import { endpoints } from "../../api/endpoints";
import { Button, Textarea, Badge } from "../ui";
import { toast } from "../../lib/toast";
import type { BlogComment } from "../../types";

function formatBlogDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function commentsByParent(comments: BlogComment[]) {
  const map = new Map<string | null, BlogComment[]>();
  for (const c of comments) {
    const p = c.parentId ?? null;
    if (!map.has(p)) map.set(p, []);
    map.get(p)!.push(c);
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  return map;
}

interface BlogCommentsPanelProps {
  postId: string;
  variant: "admin" | "staff";
  canReply: boolean;
  /** Called after a new comment is stored (e.g. bump parent commentCount). */
  onPosted?: () => void;
}

function BlogCommentsPanelInner({
  postId,
  variant,
  canReply,
  onPosted,
}: BlogCommentsPanelProps) {
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [topDraft, setTopDraft] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const url =
        variant === "admin"
          ? endpoints.blogAdminComments(postId)
          : endpoints.blogStaffComments(postId);
      const data = await api.get<BlogComment[]>(url);
      setComments(data);
    } catch (e) {
      toast.fromError(e, "Could not load comments");
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [postId, variant]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  const byParent = useMemo(() => commentsByParent(comments), [comments]);

  const submit = useCallback(
    async (body: string, parentId: string | null) => {
      const text = body.trim();
      if (!text || busy) return;
      setBusy(true);
      try {
        const url =
          variant === "admin"
            ? endpoints.blogAdminComments(postId)
            : endpoints.blogStaffComments(postId);
        const created = await api.post<BlogComment>(url, {
          body: text,
          ...(parentId ? { parentId } : {}),
        });
        setComments((prev) => [...prev, created]);
        if (parentId) {
          setReplyToId(null);
          setReplyDraft("");
        } else {
          setTopDraft("");
        }
        onPosted?.();
        toast.success(parentId ? "Reply posted" : "Comment posted");
      } catch (e) {
        toast.fromError(e, "Could not post");
      } finally {
        setBusy(false);
      }
    },
    [postId, variant, busy, onPosted],
  );

  const renderBranch = (parentId: string | null, depth: number) => {
    const list = byParent.get(parentId) ?? [];
    if (list.length === 0) return null;
    return (
      <ul
        className={
          depth === 0
            ? "space-y-3"
            : "mt-2 space-y-2 border-l border-border pl-3"
        }
      >
        {list.map((c) => (
          <li
            key={c.id}
            className="rounded-lg border border-border bg-surface-alt/40 px-3 py-2"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-text-heading">
                {c.authorName}
              </span>
              <Badge
                variant={c.authorKind === "admin" ? "info" : "default"}
                className="text-[10px] uppercase"
              >
                {c.authorKind === "admin" ? "Admin" : "Staff"}
              </Badge>
              <span className="text-xs text-text-muted">
                {formatBlogDate(c.createdAt)}
              </span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-text">{c.body}</p>
            {canReply ? (
              <div className="mt-2">
                {replyToId === c.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={replyDraft}
                      onChange={(e) => setReplyDraft(e.target.value)}
                      placeholder="Write a reply…"
                      rows={2}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        loading={busy}
                        disabled={!replyDraft.trim()}
                        onClick={() => void submit(replyDraft, c.id)}
                      >
                        Post reply
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setReplyToId(null);
                          setReplyDraft("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-primary"
                    onClick={() => {
                      setReplyToId(c.id);
                      setReplyDraft("");
                    }}
                  >
                    Reply
                  </Button>
                )}
              </div>
            ) : null}
            {renderBranch(c.id, depth + 1)}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="space-y-4">
      {canReply ? (
        <div className="space-y-2">
          <Textarea
            label={variant === "admin" ? "Admin reply" : "Add a comment"}
            value={topDraft}
            onChange={(e) => setTopDraft(e.target.value)}
            placeholder="Write something…"
            rows={3}
          />
          <Button
            type="button"
            size="sm"
            loading={busy}
            disabled={!topDraft.trim()}
            onClick={() => void submit(topDraft, null)}
          >
            {variant === "admin" ? "Post as admin" : "Post comment"}
          </Button>
        </div>
      ) : null}
      {loading ? (
        <p className="text-sm text-text-muted">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-text-muted">No comments yet.</p>
      ) : (
        renderBranch(null, 0)
      )}
    </div>
  );
}

export const BlogCommentsPanel = memo(BlogCommentsPanelInner);
