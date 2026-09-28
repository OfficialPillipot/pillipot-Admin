import {
  memo,
  lazy,
  Suspense,
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  useCreateBlogAdminPostMutation,
  useDeleteBlogAdminPostMutation,
  useGetBlogAdminPostsQuery,
  useGetStaffPositionsQuery,
  useGetStaffQuery,
  useLazyGetBlogAdminPostByIdQuery,
  useUpdateBlogAdminPostMutation,
} from "../store/api/edenApi";
import {
  ChatBubbleLeftIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../context/AuthContext";
import {
  Card,
  CardHeader,
  Button,
  Table,
  Modal,
  Input,
  Badge,
} from "../components/ui";
import { toast } from "../lib/toast";
import { hasEveryPermission } from "../lib/permissions";
import type { BlogAdminListRow, BlogAudience, Staff } from "../types";

type AudienceMode = "all" | "staff" | "positions";

const BlogQuillEditor = lazy(() =>
  import("../components/blog/BlogQuillEditor").then((m) => ({
    default: m.BlogQuillEditor,
  })),
);

const BlogCommentsPanel = lazy(() =>
  import("../components/blog/BlogCommentsPanel").then((m) => ({
    default: m.BlogCommentsPanel,
  })),
);

function audienceToMode(a: BlogAudience): AudienceMode {
  return a.kind;
}

function buildAudiencePayload(
  mode: AudienceMode,
  staffIds: string[],
  positionIds: string[],
): BlogAudience {
  if (mode === "all") return { kind: "all" };
  if (mode === "staff") return { kind: "staff", staffIds };
  return { kind: "positions", positionIds };
}

function AdminBlogManagementPage() {
  const { user } = useAuth();
  const canView = hasEveryPermission(user, ["blogs.view"]);
  const canCreate = hasEveryPermission(user, ["blogs.create"]);
  const canUpdate = hasEveryPermission(user, ["blogs.update"]);
  const canDelete = hasEveryPermission(user, ["blogs.delete"]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [published, setPublished] = useState(true);
  const [audienceMode, setAudienceMode] = useState<AudienceMode>("all");
  const [pickedStaff, setPickedStaff] = useState<string[]>([]);
  const [pickedPositions, setPickedPositions] = useState<string[]>([]);
  const [commentsModal, setCommentsModal] = useState<{
    postId: string;
    title: string;
  } | null>(null);
  const {
    data: rows = [],
    isLoading,
    refetch,
  } = useGetBlogAdminPostsQuery(undefined, { skip: !canView });
  const [fetchBlogDetail] = useLazyGetBlogAdminPostByIdQuery();
  const [createBlogPost, { isLoading: creatingPost }] =
    useCreateBlogAdminPostMutation();
  const [updateBlogPost, { isLoading: updatingPost }] =
    useUpdateBlogAdminPostMutation();
  const [deleteBlogPost] = useDeleteBlogAdminPostMutation();
  const { data: staffRows = [] } = useGetStaffQuery(undefined, {
    skip: !canView || !modalOpen,
  });
  const { data: positions = [] } = useGetStaffPositionsQuery(undefined, {
    skip: !canView || !modalOpen,
  });
  const staffList = useMemo(
    () => (staffRows as Staff[]).filter((x) => x.isActive),
    [staffRows],
  );
  const saving = creatingPost || updatingPost;

  const openCreate = useCallback(() => {
    setEditingId(null);
    setTitle("");
    setBodyHtml("");
    setPublished(true);
    setAudienceMode("all");
    setPickedStaff([]);
    setPickedPositions([]);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback(
    async (id: string) => {
      try {
        const d = await fetchBlogDetail(id).unwrap();
        setEditingId(id);
        setTitle(d.title);
        setBodyHtml(d.bodyHtml);
        setPublished(d.published);
        const mode = audienceToMode(d.audience);
        setAudienceMode(mode);
        setPickedStaff(
          d.audience.kind === "staff" ? [...d.audience.staffIds] : [],
        );
        setPickedPositions(
          d.audience.kind === "positions"
            ? [...d.audience.positionIds]
            : [],
        );
        setModalOpen(true);
      } catch (e) {
        toast.fromError(e, "Failed to load post");
      }
    },
    [fetchBlogDetail],
  );

  const save = useCallback(async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    const audience = buildAudiencePayload(
      audienceMode,
      pickedStaff,
      pickedPositions,
    );
    try {
      if (editingId) {
        await updateBlogPost({
          id: editingId,
          patch: {
            title: title.trim(),
            bodyHtml,
            published,
            audience,
          },
        }).unwrap();
        toast.success("Post updated");
      } else {
        await createBlogPost({
          title: title.trim(),
          bodyHtml,
          published,
          audience,
        }).unwrap();
        toast.success("Post created");
      }
      setModalOpen(false);
    } catch (e) {
      toast.fromError(e, "Save failed");
    }
  }, [
    title,
    bodyHtml,
    published,
    audienceMode,
    pickedStaff,
    pickedPositions,
    editingId,
    createBlogPost,
    updateBlogPost,
  ]);

  const remove = useCallback(
    async (id: string) => {
      if (!window.confirm("Delete this post and all comments/likes?")) return;
      try {
        await deleteBlogPost(id).unwrap();
        toast.success("Deleted");
      } catch (e) {
        toast.fromError(e, "Delete failed");
      }
    },
    [deleteBlogPost],
  );

  const bumpRowCommentCount = useCallback(() => {
    void refetch();
  }, [refetch]);

  const audienceLabel = useCallback((a: BlogAudience) => {
    if (a.kind === "all") return "All staff";
    if (a.kind === "staff") return `${a.staffIds.length} staff`;
    return `${a.positionIds.length} role(s)`;
  }, []);

  const columns = useMemo(
    () => [
      {
        key: "title",
        header: "Title",
        render: (r: BlogAdminListRow) => (
          <span className="font-medium text-text-heading">{r.title}</span>
        ),
      },
      {
        key: "audience",
        header: "Audience",
        render: (r: BlogAdminListRow) => (
          <Badge variant="default">{audienceLabel(r.audience)}</Badge>
        ),
      },
      {
        key: "published",
        header: "Status",
        render: (r: BlogAdminListRow) => (
          <Badge variant={r.published ? "success" : "muted"}>
            {r.published ? "Published" : "Draft"}
          </Badge>
        ),
      },
      {
        key: "stats",
        header: "Engagement",
        render: (r: BlogAdminListRow) => (
          <span className="flex flex-wrap items-center gap-2 text-sm text-text-muted">
            <span>{r.likeCount} likes</span>
            <span aria-hidden>·</span>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md text-primary underline decoration-primary/40 hover:decoration-primary"
              onClick={() =>
                setCommentsModal({ postId: r.id, title: r.title })
              }
            >
              <ChatBubbleLeftIcon className="h-4 w-4 shrink-0" />
              {r.commentCount}{" "}
              {r.commentCount === 1 ? "comment" : "comments"}
            </button>
          </span>
        ),
      },
      {
        key: "actions",
        header: "",
        render: (r: BlogAdminListRow) => (
          <div className="flex gap-1">
            {canUpdate && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Edit"
                onClick={() => void openEdit(r.id)}
              >
                <PencilIcon className="h-4 w-4" />
              </Button>
            )}
            {canDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Delete"
                onClick={() => void remove(r.id)}
              >
                <TrashIcon className="h-4 w-4 text-error" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [audienceLabel, canDelete, canUpdate, openEdit, remove],
  );

  if (!canView) {
    return (
      <div className="text-text-muted">
        You don&apos;t have permission to manage the staff blog.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          action={
            canCreate ? (
              <Button type="button" onClick={openCreate}>
                New post
              </Button>
            ) : undefined
          }
        />
        {isLoading ? (
          <p className="px-4 py-8 text-sm text-text-muted md:px-6">Loading…</p>
        ) : (
          <Table
            columns={columns}
            data={rows}
            keyExtractor={(r) => r.id}
            emptyMessage="No posts yet."
          />
        )}
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit post" : "New post"}
        size="xl"
      >
        <div className="space-y-4">
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-text-heading">
              Content
            </label>
            <div className="rounded-lg border border-border bg-surface [&_.ql-container]:min-h-[200px] [&_.ql-editor]:min-h-[200px]">
              <Suspense
                fallback={
                  <div className="p-3 text-sm text-text-muted">
                    Loading editor…
                  </div>
                }
              >
                <BlogQuillEditor
                  key={editingId ?? "new"}
                  value={bodyHtml}
                  onChange={setBodyHtml}
                />
              </Suspense>
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            Published (visible to targeted staff)
          </label>
          <div>
            <p className="mb-2 text-sm font-medium text-text-heading">
              Who can see this
            </p>
            <div className="flex flex-col gap-2 text-sm">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="aud"
                  checked={audienceMode === "all"}
                  onChange={() => setAudienceMode("all")}
                />
                All staff
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="aud"
                  checked={audienceMode === "staff"}
                  onChange={() => setAudienceMode("staff")}
                />
                Specific staff only
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="aud"
                  checked={audienceMode === "positions"}
                  onChange={() => setAudienceMode("positions")}
                />
                By job role
              </label>
            </div>
          </div>
          {audienceMode === "staff" && (
            <div className="max-h-40 overflow-y-auto rounded-lg border border-border p-2">
              {staffList.map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-2 py-1 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={pickedStaff.includes(s.id)}
                    onChange={(e) => {
                      setPickedStaff((prev) =>
                        e.target.checked
                          ? [...prev, s.id]
                          : prev.filter((x) => x !== s.id),
                      );
                    }}
                  />
                  {s.name}
                </label>
              ))}
            </div>
          )}
          {audienceMode === "positions" && (
            <div className="max-h-40 overflow-y-auto rounded-lg border border-border p-2">
              {positions.map((p) => (
                <label
                  key={p.id}
                  className="flex cursor-pointer items-center gap-2 py-1 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={pickedPositions.includes(p.id)}
                    onChange={(e) => {
                      setPickedPositions((prev) =>
                        e.target.checked
                          ? [...prev, p.id]
                          : prev.filter((x) => x !== p.id),
                      );
                    }}
                  />
                  {p.name}
                </label>
              ))}
            </div>
          )}
          {editingId ? (
            <div className="max-h-[min(420px,50vh)] space-y-2 overflow-y-auto rounded-lg border border-border bg-surface-alt/30 p-3">
              <p className="text-sm font-semibold text-text-heading">
                Staff comments
              </p>
              <p className="text-xs text-text-muted">
                Read what staff wrote and reply as admin. Staff see your replies
                on the post.
              </p>
              <Suspense
                fallback={
                  <div className="p-2 text-sm text-text-muted">
                    Loading comments…
                  </div>
                }
              >
                <BlogCommentsPanel
                  key={editingId}
                  postId={editingId}
                  variant="admin"
                  canReply={canUpdate}
                  onPosted={() => bumpRowCommentCount()}
                />
              </Suspense>
            </div>
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              loading={saving}
              onClick={() => void save()}
            >
              {editingId ? "Save" : "Publish"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={commentsModal !== null}
        onClose={() => setCommentsModal(null)}
        title={
          commentsModal
            ? `Comments — ${commentsModal.title}`
            : "Comments"
        }
        size="lg"
      >
        {commentsModal ? (
          <Suspense
            fallback={
              <div className="p-2 text-sm text-text-muted">
                Loading comments…
              </div>
            }
          >
            <BlogCommentsPanel
              key={commentsModal.postId}
              postId={commentsModal.postId}
              variant="admin"
              canReply={canUpdate}
              onPosted={() => bumpRowCommentCount()}
            />
          </Suspense>
        ) : null}
      </Modal>
    </div>
  );
}

export default memo(AdminBlogManagementPage);
