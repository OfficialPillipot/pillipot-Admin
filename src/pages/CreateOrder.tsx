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

const INITIAL = {
  customerName: "",
  deliveryAddress: "",
  phone: "",
  pincode: "",
  postOffice: "",
  email: "",
  state: "",
  district: "",
  orderType: "" as OrderType | "",
  productId: "",
  quantity: "",
  sellingAmount: "",
  notes: "",
};

function CreateOrderPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const products = useAppSelector(selectProducts);
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const productOptions: SelectOption[] = useMemo(
    () => products.map((p) => ({ value: p.id, label: p.name })),
    [products]
  );

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
    if (!form.deliveryAddress.trim()) e.deliveryAddress = "Required";
    if (!form.phone.trim()) e.phone = "Required";
    if (!form.pincode.trim()) e.pincode = "Required";
    if (!form.postOffice.trim()) e.postOffice = "Required";
    if (!form.email.trim()) e.email = "Required";
    if (!form.state.trim()) e.state = "Required";
    if (!form.district.trim()) e.district = "Required";
    if (!form.orderType) e.orderType = "Select order type";
    if (!form.productId) e.productId = "Select product";
    if (!form.quantity.trim()) e.quantity = "Required";
    else if (Number(form.quantity) < 1) e.quantity = "Must be at least 1";
    if (!form.sellingAmount.trim()) e.sellingAmount = "Required";
    else if (Number(form.sellingAmount) < 0) e.sellingAmount = "Invalid amount";
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate() || !user?.staffId) return;
      setSubmitting(true);
      try {
        const result = await dispatch(
          createOrder({
            staffId: user.staffId!,
            customerName: form.customerName.trim(),
            deliveryAddress: form.deliveryAddress.trim(),
            phone: form.phone.trim(),
            pincode: form.pincode.trim(),
            postOffice: form.postOffice.trim(),
            email: form.email.trim(),
            state: form.state.trim(),
            district: form.district.trim(),
            orderType: form.orderType as OrderType,
            productId: form.productId,
            quantity: Number(form.quantity),
            sellingAmount: Number(form.sellingAmount),
            notes: form.notes.trim() || undefined,
            status: "pending",
          })
        ).unwrap();
        toast.success(`Order ${result.orderId} created`);
        navigate(`/orders/${result.id}`);
      } catch {
        toast.error("Failed to create order");
      } finally {
        setSubmitting(false);
      }
    },
    [form, validate, user?.staffId, dispatch, navigate]
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
              onChange={(e) => update("phone", e.target.value)}
              error={errors.phone}
            />
          </div>
          <Input
            label="Delivery Address *"
            value={form.deliveryAddress}
            onChange={(e) => update("deliveryAddress", e.target.value)}
            error={errors.deliveryAddress}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Pincode *"
              value={form.pincode}
              onChange={(e) => update("pincode", e.target.value)}
              error={errors.pincode}
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
          <Select
            label="Product *"
            options={productOptions}
            value={form.productId}
            onChange={(e) => update("productId", e.target.value)}
            placeholder="Select product"
            error={errors.productId}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Quantity *"
              type="number"
              min={1}
              value={form.quantity}
              onChange={(e) => update("quantity", e.target.value)}
              error={errors.quantity}
            />
            <Input
              label="Selling Amount (₹) *"
              type="number"
              min={0}
              value={form.sellingAmount}
              onChange={(e) => update("sellingAmount", e.target.value)}
              error={errors.sellingAmount}
            />
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
