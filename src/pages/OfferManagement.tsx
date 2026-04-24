import { useState, useMemo } from "react";
import { 
  TagIcon, 
  PlusIcon, 
  TrashIcon, 
  PencilIcon, 
  MagnifyingGlassIcon
} from "@heroicons/react/24/outline";
import {
  Card,
  CardHeader,
  Select,
  Table,
  Button,
  Input,
  ToggleSwitch,
  Tooltip,
  Modal,
} from "../components/ui";
import {
  useGetProductsQuery,
  useGetCategoriesQuery,
  useGetProductOffersQuery,
  useCreateProductOfferMutation,
  useUpdateProductOfferMutation,
  useDeleteProductOfferMutation,
} from "../store/api/edenApi";
import { toast } from "../lib/toast";
import type { Product, ProductOffer } from "../types";

export default function OfferManagementPage() {
  const { data: products = [], isLoading: isLoadingProducts } = useGetProductsQuery();
  const { data: categories = [] } = useGetCategoriesQuery();
  
  const { data: allOffers = [] } = useGetProductOffersQuery(undefined);
  
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // Map product IDs to their offer counts
  const productOfferCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allOffers.forEach(o => {
      counts[o.productId] = (counts[o.productId] || 0) + 1;
    });
    return counts;
  }, [allOffers]);

  // Filtered products for the table
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCategory = !selectedCategoryId || p.categoryId === selectedCategoryId;
      const matchSearch = !searchQuery || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.productCode || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [products, selectedCategoryId, searchQuery]);

  const productColumns = [
    { 
      key: "edit", 
      header: "Action", 
      className: "w-[80px]", 
      render: (row: Product) => (
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={() => setEditingProductId(row.id)}
          className="!py-1.5 !px-3 shadow-none hover:bg-primary/10 hover:text-primary border-none"
        >
          <div className="flex items-center gap-1.5 font-black uppercase text-[10px] tracking-wider">
            <PencilIcon className="h-3.5 w-3.5" />
            Edit
          </div>
        </Button>
      )
    },
    { 
      key: "image", 
      header: "Product", 
      render: (row: Product) => (
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-surface-muted overflow-hidden flex items-center justify-center border border-border shadow-sm shrink-0">
            {row.imageUrl ? (
              <img src={row.imageUrl} alt={row.name} className="h-full w-full object-cover" />
            ) : (
              <TagIcon className="h-6 w-6 text-text-muted/20" />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-sm text-text-heading truncate">{row.name}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">{row.productCode || "No Code"}</span>
          </div>
        </div>
      )
    },
    {
      key: "offers",
      header: "Active Offers",
      render: (row: Product) => {
        const count = productOfferCounts[row.id] || 0;
        return (
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center justify-center h-6 min-w-[24px] px-1.5 rounded-full text-[10px] font-black ${count > 0 ? "bg-success/10 text-success border border-success/20" : "bg-surface-muted text-text-muted/40 border border-border"}`}>
              {count}
            </span>
            {count > 0 && <span className="text-[10px] font-bold text-success/70 uppercase tracking-tight">Active</span>}
          </div>
        );
      }
    },
    { 
      key: "category", 
      header: "Category", 
      render: (row: Product) => (
        <span className="inline-flex items-center rounded-full bg-surface-muted px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-text-muted border border-border">
          {row.categoryName || "Uncategorized"}
        </span>
      )
    },
    { 
      key: "price", 
      header: "Price", 
      render: (row: Product) => (
        <span className="text-sm font-black text-primary">₹{row.price}</span>
      )
    },
    {
      key: "stock",
      header: "Stock",
      render: (row: Product) => (
        <span className={`text-xs font-bold ${row.stockQuantity > 0 ? "text-text-muted" : "text-error"}`}>
          {row.stockQuantity} in stock
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <Card padding="none">
        <div className="p-4 md:p-6 border-b border-border/60">
          <CardHeader 
            title="Product Offers Management" 
            subtitle="Configure discounts, bulk offers, and promo codes for your catalog"
            icon={<TagIcon className="h-6 w-6 text-primary" />} 
          />
          
          <div className="mt-6 flex flex-col md:flex-row gap-4 items-end">
            <div className="w-full md:w-72">
              <Select
                label="Filter by Category"
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                options={[
                  { value: "", label: "All Categories" },
                  ...categories.map(c => ({ value: c.id, label: c.name }))
                ]}
              />
            </div>
            <div className="w-full md:w-96">
              <Input
                label="Search Products"
                placeholder="Find by name or product code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                endNode={<MagnifyingGlassIcon className="h-4 w-4" />}
              />
            </div>
            <div className="flex-1 text-right text-[10px] font-black uppercase tracking-[0.2em] text-text-muted/60 mb-2.5">
              {filteredProducts.length} Results
            </div>
          </div>
        </div>

        <div className="p-1">
          {isLoadingProducts ? (
            <div className="py-24 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
              <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-text-muted">Fetching Catalog...</p>
            </div>
          ) : (
            <Table 
              columns={productColumns} 
              data={filteredProducts} 
              keyExtractor={(p) => p.id} 
              emptyMessage="No products match your current filters." 
              mobileCards={true}
            />
          )}
        </div>
      </Card>

      {editingProductId && (
        <OfferEditModal 
          productId={editingProductId} 
          productName={products.find(p => p.id === editingProductId)?.name || "Product"}
          onClose={() => setEditingProductId(null)} 
        />
      )}
    </div>
  );
}

function OfferEditModal({ productId, productName, onClose }: { productId: string; productName: string; onClose: () => void }) {
  const { data: offers = [], isLoading } = useGetProductOffersQuery(productId);
  const [createOffer] = useCreateProductOfferMutation();
  const [updateOffer] = useUpdateProductOfferMutation();
  const [deleteOffer] = useDeleteProductOfferMutation();

  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newMinQty, setNewMinQty] = useState("1");
  const [newDiscountPct, setNewDiscountPct] = useState("0");
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setSubmitting(true);
    try {
      await createOffer({
        productId,
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
      toast.success("Offer added successfully");
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
      toast.success("Offer removed");
    } catch (err) {
      toast.fromError(err, "Failed to delete offer");
    }
  };

  const offerColumns = [
    { 
      key: "title", 
      header: "Offer Info", 
      render: (row: ProductOffer) => (
        <div className="flex flex-col">
          <span className="font-bold text-sm text-text-heading">{row.title}</span>
          <div className="flex items-center gap-2 mt-0.5">
            {row.code && (
              <span className="bg-primary/10 text-primary text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                {row.code}
              </span>
            )}
            <span className="text-[11px] text-text-muted">{row.description}</span>
          </div>
        </div>
      )
    },
    { 
      key: "condition", 
      header: "Condition", 
      render: (row: ProductOffer) => (
        <span className="text-xs font-bold text-text-muted">Min {row.minQuantity} items</span>
      )
    },
    { 
      key: "value", 
      header: "Discount", 
      render: (row: ProductOffer) => (
        <span className="text-sm font-black text-success">{row.discountPercentage}% OFF</span>
      )
    },
    { 
      key: "status", 
      header: "Active", 
      render: (row: ProductOffer) => (
        <ToggleSwitch 
          checked={row.isActive} 
          onChange={(next) => handleToggle(row.id, next)} 
          aria-label={`Toggle status for ${row.title}`}
        />
      )
    },
    { 
      key: "actions", 
      header: "", 
      render: (row: ProductOffer) => (
        <Tooltip content="Delete Offer">
          <button onClick={() => handleDelete(row.id)} className="text-text-muted hover:text-error p-1.5 rounded-lg hover:bg-error/10 transition-colors">
            <TrashIcon className="h-4 w-4" />
          </button>
        </Tooltip>
      )
    },
  ];

  return (
    <Modal isOpen={true} onClose={onClose} title={`Offers: ${productName}`} size="xl">
      <div className="space-y-8 py-2">
        {/* Create Form */}
        <div className="bg-surface-muted/40 border border-border/80 rounded-[1.8rem] p-6 shadow-inner">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-text-muted">Create New Discount</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2">
              <Input 
                label="Offer Title *" 
                value={newTitle} 
                onChange={(e) => setNewTitle(e.target.value)} 
                placeholder="e.g. Special Weekend Offer" 
              />
            </div>
            <Input 
              label="Promo Code" 
              value={newCode} 
              onChange={(e) => setNewCode(e.target.value)} 
              placeholder="SAVE30" 
            />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Min Qty" type="number" value={newMinQty} onChange={(e) => setNewMinQty(e.target.value)} min={1} />
              <Input label="Discount %" type="number" value={newDiscountPct} onChange={(e) => setNewDiscountPct(e.target.value)} min={0} max={100} />
            </div>
            <div className="lg:col-span-1">
              <Input label="Description (Optional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button fullWidth onClick={handleCreate} disabled={submitting || !newTitle.trim()} icon={<PlusIcon className="h-4 w-4" />}>
                {submitting ? "Processing..." : "Add Offer"}
              </Button>
            </div>
          </div>
        </div>

        {/* Existing Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-text-muted">Currently Active</h4>
            <span className="text-[10px] font-bold text-text-muted/40">{offers.length} Offers</span>
          </div>
          
          <div className="rounded-[1.5rem] border border-border/60 overflow-hidden shadow-sm">
            {isLoading ? (
              <div className="py-12 text-center text-[10px] font-black uppercase tracking-widest text-text-muted">Loading...</div>
            ) : (
              <Table 
                columns={offerColumns} 
                data={offers} 
                keyExtractor={(o) => o.id} 
                emptyMessage="No offers defined yet." 
                mobileCards={false}
              />
            )}
          </div>
        </div>

        <div className="pt-2 text-center">
          <button onClick={onClose} className="text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-text-heading transition-colors">
            Close Panel
          </button>
        </div>
      </div>
    </Modal>
  );
}
