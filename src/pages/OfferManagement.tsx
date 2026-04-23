import { useState, useMemo } from "react";
import { TagIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import {
  Card,
  CardHeader,
  Select,
  Table,
  Button,
  Input,
  ToggleSwitch,
  Tooltip,
} from "../components/ui";
import { useAppSelector } from "../store/hooks";
import { selectProducts } from "../store/productsSlice";
import {
  useGetProductOffersQuery,
  useCreateProductOfferMutation,
  useUpdateProductOfferMutation,
  useDeleteProductOfferMutation,
} from "../store/api/edenApi";
import { toast } from "../lib/toast";
import type { ProductOffer } from "../types";

export default function OfferManagementPage() {
  const products = useAppSelector(selectProducts);
  const [selectedProductId, setSelectedProductId] = useState("");

  const { data: offers = [], isLoading } = useGetProductOffersQuery(selectedProductId, {
    skip: !selectedProductId,
  });

  const [createOffer] = useCreateProductOfferMutation();
  const [updateOffer] = useUpdateProductOfferMutation();
  const [deleteOffer] = useDeleteProductOfferMutation();

  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newMinQty, setNewMinQty] = useState("1");
  const [newDiscountPct, setNewDiscountPct] = useState("0");
  const [submitting, setSubmitting] = useState(false);

  const productOptions = useMemo(() => [
    { value: "", label: "Select a product..." },
    ...products.map(p => ({ value: p.id, label: `${p.productCode || ""} - ${p.name}` }))
  ], [products]);

  const handleCreate = async () => {
    if (!selectedProductId || !newTitle.trim()) return;
    setSubmitting(true);
    try {
      await createOffer({
        productId: selectedProductId,
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        code: newCode.trim() || undefined,
        minQuantity: parseInt(newMinQty) || 1,
        discountPercentage: parseFloat(newDiscountPct) || 0,
      }).unwrap();
      setNewTitle("");
      setNewDesc("");
      setNewCode("");
      setNewMinQty("1");
      setNewDiscountPct("0");
      toast.success("Offer created");
    } catch (err) {
      toast.fromError(err, "Failed to create offer");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id: string, next: boolean) => {
    try {
      await updateOffer({ id, patch: { isActive: next } }).unwrap();
    } catch (err) {
      toast.fromError(err, "Failed to update offer");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this offer?")) return;
    try {
      await deleteOffer(id).unwrap();
      toast.success("Offer deleted");
    } catch (err) {
      toast.fromError(err, "Failed to delete offer");
    }
  };

  const columns = [
    { key: "title", header: "Title", render: (row: ProductOffer) => (
      <div className="flex flex-col">
        <span className="font-bold">{row.title}</span>
        {row.code && <span className="text-[10px] text-primary font-black uppercase">Code: {row.code}</span>}
      </div>
    )},
    { key: "minQuantity", header: "Min Qty", render: (row: ProductOffer) => (
      <span className="text-xs font-medium">{row.minQuantity} unit(s)</span>
    )},
    { key: "discountPercentage", header: "Discount", render: (row: ProductOffer) => (
      <span className="text-xs font-bold text-success">{row.discountPercentage}%</span>
    )},
    { key: "isActive", header: "Status", render: (row: ProductOffer) => (
      <ToggleSwitch 
        checked={row.isActive} 
        onChange={(next) => handleToggle(row.id, next)} 
        aria-label={`Toggle active status for ${row.title}`}
      />
    )},
    { key: "actions", header: "", render: (row: ProductOffer) => (
      <Tooltip content="Delete">
        <button onClick={() => handleDelete(row.id)} className="text-text-muted hover:text-error">
          <TrashIcon className="h-4 w-4" />
        </button>
      </Tooltip>
    )},
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Product Offers Management" icon={<TagIcon className="h-6 w-6 text-primary" />} />
        <div className="p-4 space-y-6">
          <div className="max-w-md">
            <Select
              label="Select Product"
              options={productOptions}
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
            />
          </div>

          {selectedProductId && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-1 space-y-4 rounded-2xl border border-border bg-surface-muted/30 p-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-text-muted">Create New Offer</h3>
                <Input label="Title *" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. 10% Discount" />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Code" value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="SAVE10" />
                  <Input label="Min Qty" type="number" value={newMinQty} onChange={(e) => setNewMinQty(e.target.value)} min={1} />
                </div>
                <Input label="Discount %" type="number" value={newDiscountPct} onChange={(e) => setNewDiscountPct(e.target.value)} min={0} max={100} />
                <Input label="Description (Optional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
                <Button fullWidth onClick={handleCreate} disabled={submitting || !newTitle.trim()} icon={<PlusIcon className="h-4 w-4" />}>
                  {submitting ? "Creating..." : "Add Offer"}
                </Button>
              </div>

              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-text-muted">Active Offers</h3>
                {isLoading ? (
                  <div className="py-10 text-center">Loading...</div>
                ) : (
                  <Table columns={columns} data={offers} keyExtractor={(o) => o.id} emptyMessage="No offers found for this product." />
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
