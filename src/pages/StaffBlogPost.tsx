import { memo, useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import {
  HeartIcon,
  ChatBubbleLeftIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";
import { Card, CardHeader, Button } from "../components/ui";
import { BlogCommentsPanel } from "../components/blog/BlogCommentsPanel";
import { toast } from "../lib/toast";
import type { BlogPostDetail } from "../types";

function StaffBlogPostPage() {
  const { postId } = useParams<{ postId: string }>();
  const [post, setPost] = useState<BlogPostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [likeBusy, setLikeBusy] = useState(false);

  const loadPost = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const p = await api.get<BlogPostDetail>(endpoints.blogStaffPost(postId));
      setPost(p);
    } catch (e) {
      toast.fromError(e, "Could not load post");
      setPost(null);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    void loadPost();
  }, [loadPost]);

  const bumpCommentCount = useCallback(() => {
    setPost((prev) =>
      prev ? { ...prev, commentCount: prev.commentCount + 1 } : null,
    );
  }, []);

  const toggleLike = useCallback(async () => {
    if (!postId || !post || likeBusy) return;
    setLikeBusy(true);
    try {
      const r = await api.post<{ liked: boolean; likeCount: number }>(
        endpoints.blogStaffLike(postId),
        {},
      );
      setPost((prev) =>
        prev
          ? {
              ...prev,
              likedByMe: r.liked,
              likeCount: r.likeCount,
            }
          : null,
      );
    } catch (e) {
      toast.fromError(e, "Could not update like");
    } finally {
      setLikeBusy(false);
    }
  }, [postId, post, likeBusy]);

  if (!postId) {
    return <p className="text-text-muted">Missing post.</p>;
  }

  if (loading) {
    return <p className="text-text-muted">Loading…</p>;
  }

  if (!post) {
    return (
      <div className="space-y-4">
        <Link
          to="/blog"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to blog
        </Link>
        <p className="text-text-muted">Post not found or not visible to you.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        to="/blog"
        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to blog
      </Link>

      <Card>
        <div className="space-y-3 px-4 py-5 md:px-6">
          <h1 className="text-2xl font-bold text-text-heading">{post.title}</h1>
          <p className="text-sm text-text-muted">
            {new Date(post.publishedAt).toLocaleString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            · By {post.authorName}
          </p>
          <div
            className="max-w-none text-sm leading-relaxed text-text [&_a]:text-primary [&_a]:underline [&_h1]:mb-3 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:font-semibold [&_img]:max-h-96 [&_img]:max-w-full [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-3 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6"
            dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
          />
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <Button
              type="button"
              variant={post.likedByMe ? "primary" : "outline"}
              size="sm"
              loading={likeBusy}
              onClick={() => void toggleLike()}
              className="inline-flex items-center gap-2"
            >
              {post.likedByMe ? (
                <HeartSolid className="h-4 w-4" />
              ) : (
                <HeartIcon className="h-4 w-4" />
              )}
              {post.likeCount} {post.likeCount === 1 ? "like" : "likes"}
            </Button>
            <span className="inline-flex items-center gap-1 text-sm text-text-muted">
              <ChatBubbleLeftIcon className="h-4 w-4" />
              {post.commentCount} comments
            </span>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Comments" />
        <div className="px-4 pb-5 md:px-6">
          <BlogCommentsPanel
            postId={postId}
            variant="staff"
            canReply
            onPosted={bumpCommentCount}
          />
        </div>
      </Card>
    </div>
  );
}

export default memo(StaffBlogPostPage);
