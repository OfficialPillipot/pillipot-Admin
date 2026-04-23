import { useState, useCallback } from "react";
import { PlusIcon, TrashIcon, TagIcon } from "@heroicons/react/24/outline";
import {
  Modal,
  Button,
  Input,
  Table,
  ToggleSwitch,
  Tooltip,
} from "../ui";
import {
  useGetProductOffersQuery,
  useCreateProductOfferMutation,
  useUpdateProductOfferMutation,
  useDeleteProductOfferMutation,
} from "../../store/api/edenApi";
import { toast } from "../../lib/toast";
import type { Product, ProductOffer } from "../../types";

interface ProductOffersModalProps {
  product: Product | null;
  onClose: () => void;
}

export function ProductOffersModal({ product, onClose }: ProductOffersModalProps) {
  const productId = product?.id;
  const { data: offers = [], isLoading } = useGetProductOffersQuery(productId!, {
    skip: !productId,
  });

  const [createOffer] = useCreateProductOfferMutation();
  const [updateOffer] = useUpdateProductOfferMutation();
  const [deleteOffer] = useDeleteProductOfferMutation();

  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCode, setNewCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddOffer = useCallback(async () => {
    if (!productId || !newTitle.trim()) return;
    setIsSubmitting(true);
    try {
      await createOffer({
        productId,
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        code: newCode.trim() || undefined,
        isActive: true,
      }).unwrap();
      setNewTitle("");
      setNewDesc("");
      setNewCode("");
      toast.success("Offer added");
    } catch (err) {
      toast.fromError(err, "Failed to add offer");
    } finally {
      setIsSubmitting(false);
    }
  }, [productId, newTitle, newDesc, newCode, createOffer]);

  const handleToggleActive = useCallback(
    async (offer: ProductOffer, active: boolean) => {
      try {
        await updateOffer({
          id: offer.id,
          patch: { isActive: active },
        }).unwrap();
        toast.success(active ? "Offer activated" : "Offer deactivated");
      } catch (err) {
        toast.fromError(err, "Failed to update offer");
      }
    },
    [updateOffer]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm("Delete this offer?")) return;
      try {
        await deleteOffer(id).unwrap();
        toast.success("Offer deleted");
      } catch (err) {
        toast.fromError(err, "Failed to delete offer");
      }
    },
    [deleteOffer]
  );

  const columns = [
    {
      key: "title",
      header: "Offer Title",
      render: (row: ProductOffer) => (
        <div className="flex flex-col">
          <span className="font-bold text-text">{row.title}</span>
          {row.description && (
            <span className="text-xs text-text-muted line-clamp-1">{row.description}</span>
          )}
          {row.code && (
            <span className="mt-1 inline-block w-fit rounded bg-primary-muted px-1.5 py-0.5 text-[10px] font-black uppercase text-primary">
              CODE: {row.code}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "isActive",
      header: "Active",
      render: (row: ProductOffer) => (
        <ToggleSwitch
          checked={row.isActive}
          onChange={(next) => void handleToggleActive(row, next)}
          aria-label={`Toggle active status for ${row.title}`}
        />
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row: ProductOffer) => (
        <Tooltip content="Delete" side="top">
          <button
            onClick={() => handleDelete(row.id)}
            className="rounded p-2 text-text-muted hover:bg-error-bg hover:text-error"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </Tooltip>
      ),
    },
  ];

  return (
    <Modal
      isOpen={!!product}
      onClose={onClose}
      title={`Manage Offers: ${product?.name ?? ""}`}
    >
      <div className="space-y-6">
        {/* Add New Offer Form */}
        <div className="rounded-2xl border border-border bg-surface-muted/30 p-4">
          <h3 className="mb-3 text-sm font-black uppercase tracking-widest text-text-muted">
            Add New Offer
          </h3>
          <div className="space-y-4">
            <Input
              label="Offer Title *"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. 10% instant discount on Pillipot Pay"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Offer Code (Optional)"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="e.g. SAVE10"
              />
              <Input
                label="Additional Desc (Optional)"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="e.g. up to ₹1,000"
              />
            </div>
            <Button
              onClick={handleAddOffer}
              disabled={isSubmitting || !newTitle.trim()}
              icon={<PlusIcon className="h-4 w-4" />}
              fullWidth
            >
              Add Offer
            </Button>
          </div>
        </div>

        {/* Existing Offers Table */}
        <div className="space-y-3">
          <h3 className="text-sm font-black uppercase tracking-widest text-text-muted">
            Active Offers
          </h3>
          {isLoading ? (
            <div className="py-8 text-center text-sm text-text-muted">Loading offers...</div>
          ) : offers.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-12 text-center">
              <TagIcon className="mb-2 h-10 w-10 text-border" />
              <p className="text-sm font-medium text-text-muted">No offers yet for this product.</p>
            </div>
          ) : (
            <Table
              columns={columns}
              data={offers}
              keyExtractor={(o) => o.id}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}
