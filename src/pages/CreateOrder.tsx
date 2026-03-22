import { memo, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { selectProducts } from "../store/productsSlice";
import { createOrder } from "../store/ordersSlice";
import { Card, CardHeader, Button, Input, Select, Textarea } from "../components/ui";
import { toast } from "../lib/toast";
import type { OrderType } from "../types";
import type { SelectOption } from "../components/ui/Select";

interface ProductRow {
  productId: string;
  name: string;
  quantity: number;
  customPrice: string;
}

const INITIAL = {
  customerName: "",
  flatBuilding: "",
  areaSector: "",
  phone: "",
  pincode: "",
  postOffice: "",
  email: "",
  state: "",
  district: "",
  orderType: "" as OrderType | "",
  notes: "",
};

function CreateOrderPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const products = useAppSelector(selectProducts);
  const [form, setForm] = useState(INITIAL);
  const [productRows, setProductRows] = useState<ProductRow[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  const toggleProductSelection = useCallback((product: { id: string; name: string }) => {
    setProductRows(current => {
      const exists = current.some(r => r.productId === product.id);
      if (exists) {
        return current.filter(r => r.productId !== product.id);
      } else {
        return [...current, {
          productId: product.id,
          name: product.name,
          quantity: 1,
          customPrice: "",
        }];
      }
    });
    setErrors(e => ({ ...e, products: "" }));
  }, []);

  const grandTotal = useMemo(() => {
    return productRows.reduce((sum, row) => {
      const price = parseFloat(row.customPrice) || 0;
      return sum + (row.quantity * price);
    }, 0);
  }, [productRows]);

  const updateProductRow = (productId: string, field: keyof ProductRow, value: string | number) => {
    setProductRows(rows =>
      rows.map(r => r.productId === productId ? { ...r, [field]: value } : r)
    );
    setErrors(e => ({ ...e, products: "" }));
  };

  const orderTypeOptions: SelectOption[] = useMemo(
    () => [
      { value: "cod", label: "Cash on Delivery (COD)" },
      { value: "prepaid", label: "Prepaid" },
    ],
    []
  );

  const validate = useCallback((): boolean => {
    const e: Record<string, string> = {};
    if (!form.customerName.trim()) e.customerName = "Required";
    if (!form.flatBuilding.trim()) e.flatBuilding = "Required";
    if (!form.areaSector.trim()) e.areaSector = "Required";
    
    const phone = form.phone.trim();
    if (!phone) e.phone = "Required";
    else if (phone.length !== 10) e.phone = "Must be exactly 10 digits";

    const pincode = form.pincode.trim();
    if (!pincode) e.pincode = "Required";
    else if (pincode.length !== 6) e.pincode = "Must be exactly 6 digits";

    if (!form.postOffice.trim()) e.postOffice = "Required";
    
    const email = form.email.trim();
    if (!email) e.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Invalid email format";

    if (!form.state.trim()) e.state = "Required";
    if (!form.district.trim()) e.district = "Required";
    if (!form.orderType) e.orderType = "Select order type";
    
    const selected = productRows.filter(r => r.quantity > 0);
    if (selected.length === 0) {
      e.products = "Select at least one product with quantity > 0";
    } else {
      selected.forEach(r => {
        if (!r.customPrice || Number(r.customPrice) <= 0) {
          e.products = "Enter required price for selected products";
        }
      });
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate() || !user?.staffId) return;
      setSubmitting(true);
      try {
        const fullAddress = `${form.flatBuilding.trim()}, ${form.areaSector.trim()}`;
        const selectedProducts = productRows.filter(r => r.quantity > 0);
        
        for (const item of selectedProducts) {
          await dispatch(
            createOrder({
              staffId: user.staffId!,
              customerName: form.customerName.trim(),
              deliveryAddress: fullAddress,
              phone: form.phone.trim(),
              pincode: form.pincode.trim(),
              postOffice: form.postOffice.trim(),
              email: form.email.trim(),
              state: form.state.trim(),
              district: form.district.trim(),
              orderType: form.orderType as OrderType,
              productId: item.productId,
              quantity: item.quantity,
              sellingAmount: Number(item.customPrice),
              notes: form.notes.trim() || undefined,
              status: "pending",
            })
          ).unwrap();
        }
        
        toast.success(`Created ${selectedProducts.length} order(s) successfully!`);
        navigate(`/orders`);
      } catch {
        toast.error("Failed to create order");
      } finally {
        setSubmitting(false);
      }
    },
    [form, productRows, validate, user?.staffId, dispatch, navigate]
  );

  const update = useCallback((field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  }, []);

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader
          title="Create Order"
          subtitle="Fill mandatory fields. Order ID will be generated after submit."
        />
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Customer Name *"
              value={form.customerName}
              onChange={(e) => update("customerName", e.target.value)}
              error={errors.customerName}
            />
            <Input
              label="Phone Number *"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value.replace(/\D/g, '').slice(0, 10))}
              error={errors.phone}
              placeholder="10 digits"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Flat/House/Building Name *"
              value={form.flatBuilding}
              onChange={(e) => update("flatBuilding", e.target.value)}
              error={errors.flatBuilding}
            />
            <Input
              label="Area/Sector/Locality *"
              value={form.areaSector}
              onChange={(e) => update("areaSector", e.target.value)}
              error={errors.areaSector}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Pincode *"
              value={form.pincode}
              onChange={(e) => update("pincode", e.target.value.replace(/\D/g, '').slice(0, 6))}
              error={errors.pincode}
              placeholder="6 digits"
            />
            <Input
              label="Post Office *"
              value={form.postOffice}
              onChange={(e) => update("postOffice", e.target.value)}
              error={errors.postOffice}
            />
          </div>
          <Input
            label="Email *"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            error={errors.email}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="State *"
              value={form.state}
              onChange={(e) => update("state", e.target.value)}
              error={errors.state}
            />
            <Input
              label="District *"
              value={form.district}
              onChange={(e) => update("district", e.target.value)}
              error={errors.district}
            />
          </div>
          <Select
            label="Order Type *"
            options={orderTypeOptions}
            value={form.orderType}
            onChange={(e) => update("orderType", e.target.value)}
            placeholder="Select type"
            error={errors.orderType}
          />
          <div className="space-y-4 pt-4">
            <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Products</h3>
            
            <div className="relative">
              <label className="mb-1 block text-sm font-medium text-text-heading">Select Products *</label>
              <div 
                className={`w-full rounded-[var(--radius-md)] border bg-surface px-3 py-2.5 text-text shadow-[var(--shadow-card)] cursor-pointer flex justify-between items-center transition-colors ${errors.products && productRows.length === 0 ? 'border-red-500' : 'border-border hover:border-gray-400'}`}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <span className={productRows.length > 0 ? "font-medium text-primary" : "text-gray-500"}>
                  {productRows.length > 0 ? `${productRows.length} product(s) selected` : "Search & select products..."}
                </span>
                <span className="text-gray-400 text-xs">▼</span>
              </div>

              {isDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)}></div>
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-xl overflow-hidden">
                    <div className="p-2 border-b border-gray-100 bg-gray-50">
                      <input 
                        type="text" 
                        autoFocus
                        placeholder="Search products..." 
                        className="w-full px-3 py-1.5 border border-gray-300 rounded outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm bg-white"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto p-1">
                      {[...products]
                        .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                        .sort((a, b) => {
                          const aSelected = productRows.some(r => r.productId === a.id);
                          const bSelected = productRows.some(r => r.productId === b.id);
                          if (aSelected && !bSelected) return -1;
                          if (!aSelected && bSelected) return 1;
                          return 0;
                        })
                        .map(p => {
                        const isSelected = productRows.some(r => r.productId === p.id);
                        return (
                          <div 
                            key={p.id}
                            className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 flex items-center gap-3 rounded transition-colors ${isSelected ? 'bg-primary/5 font-medium' : 'text-gray-700'}`}
                            onClick={() => toggleProductSelection(p)}
                          >
                            <input type="checkbox" checked={isSelected} readOnly className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"/>
                            <span>{p.name}</span>
                          </div>
                        )
                      })}
                      {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                        <div className="px-3 py-4 text-sm text-gray-500 text-center">No products found.</div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {productRows.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-xl space-y-3 border border-gray-100 shadow-inner">
              {productRows.map((row) => {
                const price = parseFloat(row.customPrice) || 0;
                const subtotal = row.quantity * price;
                return (
                  <div key={row.productId} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="flex-1 font-semibold text-gray-900 truncate">
                      {row.name}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center border border-gray-300 rounded overflow-hidden shadow-sm">
                        <button type="button" onClick={() => updateProductRow(row.productId, 'quantity', Math.max(0, row.quantity - 1))} className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-700 transition">-</button>
                        <span className="w-10 text-center font-bold text-gray-800 border-x border-gray-200 h-8 flex items-center justify-center bg-white">{row.quantity}</span>
                        <button type="button" onClick={() => updateProductRow(row.productId, 'quantity', row.quantity + 1)} className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-700 transition">+</button>
                      </div>

                      <div className="flex items-center shadow-sm rounded">
                        <span className="px-2.5 py-1.5 bg-gray-100 border border-gray-300 border-r-0 rounded-l text-gray-600 font-medium">₹</span>
                        <input type="number" min="0" className="w-20 sm:w-24 px-2 py-1.5 border border-gray-300 rounded-r focus:ring-1 focus:ring-primary focus:border-primary outline-none" placeholder="Price" value={row.customPrice} onChange={(e) => updateProductRow(row.productId, 'customPrice', e.target.value)} />
                      </div>

                      <div className="w-20 text-right font-black text-indigo-600 text-lg">
                        ₹{subtotal.toFixed(2)}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              <div className="flex items-center justify-between border-t border-gray-300 pt-4 mt-2 px-2">
                <span className="text-gray-800 font-bold text-xl uppercase tracking-wide">Grand Total</span>
                <span className="text-2xl font-black text-green-600">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
            )}
            {errors.products && <p className="text-sm text-red-500 font-medium">{errors.products}</p>}
          </div>
          <Textarea
            label="Notes (optional)"
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Customization or customer requirements"
            rows={3}
          />
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={submitting}>
              Create Order
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/orders")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default memo(CreateOrderPage);
