import { memo, useState, useCallback, useMemo, useEffect } from "react";
import { PencilIcon, TrashIcon, XMarkIcon, EyeIcon, ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/24/outline";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  selectBanners,
  fetchBanners,
  createBanner,
  updateBanner,
  deleteBanner,
} from "../store/bannersSlice";
import { Card, CardHeader, Button, Table, Modal, Input, Tooltip } from "../components/ui";
import { toast } from "../lib/toast";
import type { Banner } from "../types";

function BannerManagementPage() {
  const dispatch = useAppDispatch();
  const banners = useAppSelector(selectBanners);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [order, setOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingBanner, setViewingBanner] = useState<Banner | null>(null);

  const filteredBanners = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = [...banners].sort((a, b) => a.order - b.order);
    if (!q) return list;
    return list.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        (b.description || "").toLowerCase().includes(q)
    );
  }, [banners, searchQuery]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  useEffect(() => {
    void dispatch(fetchBanners());
  }, [dispatch]);

  const openAdd = useCallback(() => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setLinkUrl("");
    setOrder(banners.length > 0 ? Math.max(...banners.map(b => b.order)) + 1 : 0);
    setIsActive(true);
    setImageFile(null);
    setModalOpen(true);
  }, [banners]);

  const openEdit = useCallback((b: Banner) => {
    setEditingId(b.id);
    setTitle(b.title);
    setDescription(b.description ?? "");
    setLinkUrl(b.linkUrl ?? "");
    setOrder(b.order);
    setIsActive(b.isActive);
    setImageFile(null);
    setModalOpen(true);
  }, []);

  const openView = useCallback((b: Banner) => {
    setViewingBanner(b);
  }, []);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!editingId && !imageFile) {
      toast.error("Banner image is required");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        await dispatch(
          updateBanner({
            id: editingId,
            patch: {
              title: title.trim(),
              description: description.trim() || undefined,
              linkUrl: linkUrl.trim() || undefined,
              order,
              isActive,
              image: imageFile ?? undefined,
            },
          })
        ).unwrap();
        toast.success("Banner updated");
      } else {
        await dispatch(
          createBanner({
            title: title.trim(),
            description: description.trim() || undefined,
            linkUrl: linkUrl.trim() || undefined,
            order,
            isActive,
            image: imageFile!,
          })
        ).unwrap();
        toast.success("Banner created");
      }
      setModalOpen(false);
    } catch (err) {
      toast.fromError(err, "Failed to save banner");
    } finally {
      setIsSubmitting(false);
    }
  }, [editingId, title, description, linkUrl, order, isActive, imageFile, dispatch]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm("Delete this banner?")) return;
      try {
        await dispatch(deleteBanner(id)).unwrap();
        if (editingId === id) setModalOpen(false);
        toast.success("Banner deleted");
      } catch (err) {
        toast.fromError(err, "Failed to delete banner");
      }
    },
    [dispatch, editingId]
  );

  const toggleActive = useCallback(async (b: Banner) => {
    try {
      await dispatch(updateBanner({ id: b.id, patch: { isActive: !b.isActive } })).unwrap();
      toast.success(`Banner ${!b.isActive ? 'activated' : 'deactivated'}`);
    } catch (err) {
      toast.fromError(err, "Failed to update status");
    }
  }, [dispatch]);

  const columns = useMemo(
    () => [
      {
        key: "order",
        header: "Order",
        render: (row: Banner) => (
          <span className="font-mono font-bold text-primary">{row.order}</span>
        )
      },
      {
        key: "imageUrl",
        header: "Preview",
        render: (row: Banner) => (
          <img
            src={row.imageUrl}
            alt=""
            className="h-12 w-24 rounded object-cover border border-border shadow-sm"
          />
        ),
      },
      { key: "title", header: "Title" },
      {
        key: "isActive",
        header: "Status",
        render: (row: Banner) => (
          <button
            onClick={() => toggleActive(row)}
            className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${
              row.isActive 
                ? "bg-pp-success/10 text-pp-success border border-pp-success/20" 
                : "bg-gray-100 text-gray-400 border border-gray-200"
            }`}
          >
            {row.isActive ? "Active" : "Inactive"}
          </button>
        )
      },
      {
        key: "actions",
        header: "",
        render: (row: Banner) => {
          return (
            <div className="flex items-center gap-1">
              <Tooltip content="View" side="top">
                <button
                  type="button"
                  onClick={() => openView(row)}
                  className="rounded-[var(--radius-md)] p-2 text-text-muted hover:bg-primary-muted hover:text-primary"
                >
                  <EyeIcon className="h-4 w-4" />
                </button>
              </Tooltip>
              <Tooltip content="Edit" side="top">
                <button
                  type="button"
                  onClick={() => openEdit(row)}
                  className="rounded-[var(--radius-md)] p-2 text-text-muted hover:bg-primary-muted hover:text-primary"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
              </Tooltip>
              <Tooltip content="Delete" side="top">
                <button
                  type="button"
                  onClick={() => void handleDelete(row.id)}
                  className="rounded-[var(--radius-md)] p-2 text-text-muted hover:bg-error-bg hover:text-error"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </Tooltip>
            </div>
          );
        },
      },
    ],
    [openEdit, openView, handleDelete, toggleActive]
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Banner Management"
          subtitle="Manage homepage slider advertisements and promotional banners."
          action={<Button onClick={openAdd}>Add Banner</Button>}
        />
        <div className="mb-4">
          <Input
            label=""
            placeholder="Search banners..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Table
          columns={columns}
          data={filteredBanners}
          keyExtractor={(b) => b.id}
          emptyMessage="No banners found. Start by adding one!"
        />
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Banner" : "Add Banner"}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Title *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Summer Collection Sale"
            />
            <Input
              label="Order (sequence)"
              type="number"
              value={order}
              onChange={(e) => setOrder(Number(e.target.value))}
            />
          </div>
          
          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Subtext shown on the banner"
          />

          <Input
            label="Link URL (OnClick redirect)"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="e.g. /category/electronics"
          />

          <div className="flex items-center gap-2 py-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-text">
              Active (Visible on website)
            </label>
          </div>

          <div className="space-y-3 rounded-[var(--radius-md)] border border-border bg-surface-muted/40 p-3">
            <p className="text-sm font-medium text-text">Banner Image *</p>
            
            {editingId && banners.find(b => b.id === editingId)?.imageUrl && (
              <div className="group relative w-fit">
                <img
                  src={banners.find(b => b.id === editingId)?.imageUrl!}
                  alt="Current"
                  className="h-32 w-64 rounded border border-border object-cover"
                />
              </div>
            )}

            <div className="flex items-center gap-4">
              {imagePreviewUrl ? (
                <div className="group relative">
                  <img
                    src={imagePreviewUrl}
                    alt="Preview"
                    className="h-32 w-64 rounded border border-border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setImageFile(null)}
                    className="absolute -right-2 -top-2 rounded-full bg-error p-1 text-white shadow-lg"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed border-border bg-surface-muted/20 hover:bg-surface-muted/40 transition-colors">
                  <span className="text-2xl font-bold text-primary">+ Upload Banner Image</span>
                  <span className="text-xs text-text-muted">Recommended: 1200x450 or 3:1 aspect ratio</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setImageFile(f);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={() => void handleSave()} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Banner"}
            </Button>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!viewingBanner}
        onClose={() => setViewingBanner(null)}
        title="Banner Preview"
        size="lg"
      >
        {viewingBanner && (
          <div className="space-y-6">
            <div className="border-b border-border pb-4">
              <h3 className="text-xl font-bold text-text">{viewingBanner.title}</h3>
              {viewingBanner.description && (
                <p className="mt-1 text-sm text-text-muted">{viewingBanner.description}</p>
              )}
              {viewingBanner.linkUrl && (
                <p className="mt-2 text-xs font-mono text-primary bg-primary/5 p-1 rounded inline-block">
                  Link: {viewingBanner.linkUrl}
                </p>
              )}
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-pp-surface shadow-inner aspect-[3/1]">
              <img
                src={viewingBanner.imageUrl}
                alt={viewingBanner.title}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="flex justify-center pt-2">
              <Button onClick={() => setViewingBanner(null)}>Close Preview</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default memo(BannerManagementPage);
