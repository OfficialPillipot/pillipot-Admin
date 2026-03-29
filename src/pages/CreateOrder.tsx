import { memo, useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { selectProducts, fetchProducts } from "../store/productsSlice";
import { selectCategories, fetchCategories } from "../store/categoriesSlice";
import { createOrder } from "../store/ordersSlice";
import { Card, CardHeader, Button, Input, Select, Textarea } from "../components/ui";
import { toast } from "../lib/toast";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";
import type { Customer, OrderType, Product } from "../types";
import type { SelectOption } from "../components/ui/Select";

interface ProductRow {
  productId: string;
  name: string;
  quantity: number;
  /** Optional discount ₹ for this line */
  discount: string;
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

function splitDeliveryAddress(deliveryAddress: string): { flat: string; area: string } {
  const t = deliveryAddress.trim();
  if (!t) return { flat: "", area: "" };
  const i = t.indexOf(",");
  if (i === -1) return { flat: t, area: "" };
  return { flat: t.slice(0, i).trim(), area: t.slice(i + 1).trim() };
}

/** API may send price as number or decimal string */
function catalogUnitPrice(p: Product | undefined): number {
  if (!p) return 0;
  const raw = p.price as unknown;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const n = parseFloat(raw.trim());
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function formatRupee(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `₹${n.toFixed(2)}`;
}

/** Products with no category_id (legacy) */
const UNCATEGORIZED_KEY = "__uncategorized__";

function productCategoryKey(p: Product): string {
  return p.categoryId ?? UNCATEGORIZED_KEY;
}

function CreateOrderPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const products = useAppSelector(selectProducts);
  const categories = useAppSelector(selectCategories);
  const [form, setForm] = useState(INITIAL);
  const [productRows, setProductRows] = useState<ProductRow[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const lookupGen = useRef(0);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [orderCategory, setOrderCategory] = useState("");

  const phoneTrim = form.phone.trim();
  const detailsEnabled = phoneTrim.length === 10;
  const disabledHint = "Enter 10-digit phone first";

  const unitPrice = useCallback(
    (productId: string) => {
      const p = products.find((x) => x.id === productId);
      return catalogUnitPrice(p);
    },
    [products]
  );

  useEffect(() => {
    void dispatch(fetchProducts());
    void dispatch(fetchCategories());
  }, [dispatch]);

  useEffect(() => {
    if (phoneTrim.length === 10) return;
    lookupGen.current += 1;
    setProductRows([]);
    setForm((f) => ({
      ...f,
      flatBuilding: "",
      areaSector: "",
      pincode: "",
      postOffice: "",
      email: "",
      state: "",
      district: "",
      orderType: "" as OrderType | "",
    }));
  }, [phoneTrim]);

  useEffect(() => {
    if (!detailsEnabled) setIsDropdownOpen(false);
  }, [detailsEnabled]);

  useEffect(() => {
    if (phoneTrim.length !== 10) {
      setLookupLoading(false);
      return;
    }

    const gen = ++lookupGen.current;
    const timer = setTimeout(() => {
      void (async () => {
        setLookupLoading(true);
        try {
          const data = await api.get<Customer | null>(
            endpoints.customerLookupPhone(phoneTrim)
          );
          if (gen !== lookupGen.current) return;
          if (data && typeof data === "object" && "id" in data && data.id) {
            const { flat, area } = splitDeliveryAddress(data.deliveryAddress);
            setForm((f) => ({
              ...f,
              customerName: data.customerName,
              flatBuilding: flat,
              areaSector: area,
              pincode: data.pincode,
              postOffice: data.postOffice,
              email: data.email,
              state: data.state,
              district: data.district,
            }));
          }
        } catch (err) {
          if (gen === lookupGen.current) {
            toast.fromError(err, "Could not look up customer");
          }
        } finally {
          if (gen === lookupGen.current) {
            setLookupLoading(false);
          }
        }
      })();
    }, 400);

    return () => clearTimeout(timer);
  }, [phoneTrim]);

  const toggleProductSelection = useCallback(
    (product: { id: string; name: string }) => {
      if (!detailsEnabled) return;
      setProductRows((current) => {
        const exists = current.some((r) => r.productId === product.id);
        if (exists) {
          return current.filter((r) => r.productId !== product.id);
        }
        return [
          ...current,
          {
            productId: product.id,
            name: product.name,
            quantity: 1,
            discount: "",
          },
        ];
      });
      setErrors((e) => ({ ...e, products: "" }));
    },
    [detailsEnabled]
  );

  const lineSubtotal = useCallback(
    (row: ProductRow) => {
      const price = unitPrice(row.productId);
      const disc = parseFloat(row.discount) || 0;
      const gross = price * row.quantity;
      return Math.max(0, gross - disc);
    },
    [unitPrice]
  );

  const grandTotal = useMemo(() => {
    return productRows.reduce((sum, row) => sum + lineSubtotal(row), 0);
  }, [productRows, lineSubtotal]);

  const updateProductRow = (
    productId: string,
    field: keyof ProductRow,
    value: string | number
  ) => {
    if (!detailsEnabled) return;
    setProductRows((rows) =>
      rows.map((r) => (r.productId === productId ? { ...r, [field]: value } : r))
    );
    setErrors((e) => ({ ...e, products: "" }));
  };

  const orderTypeOptions: SelectOption[] = useMemo(
    () => [
      { value: "cod", label: "Cash on Delivery (COD)" },
      { value: "prepaid", label: "Prepaid" },
    ],
    []
  );

  const categoryOptions: SelectOption[] = useMemo(() => {
    const sorted = [...categories].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );
    const opts: SelectOption[] = [
      {
        value: "",
        label: detailsEnabled ? "All categories" : disabledHint,
      },
      ...sorted.map((c) => ({ value: c.id, label: c.name })),
    ];
    if (products.some((p) => !p.categoryId)) {
      opts.push({
        value: UNCATEGORIZED_KEY,
        label: "Uncategorized (legacy)",
      });
    }
    return opts;
  }, [categories, products, detailsEnabled]);

  const productsInCategory = useMemo(() => {
    if (!orderCategory) return products;
    return products.filter((p) => productCategoryKey(p) === orderCategory);
  }, [products, orderCategory]);

  const validate = useCallback((): boolean => {
    const e: Record<string, string> = {};
    if (!form.customerName.trim()) e.customerName = "Required";
    if (!detailsEnabled) {
      e.phone = form.phone.trim() ? "Enter full 10-digit phone first" : "Required";
      setErrors(e);
      return false;
    }
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

    const selected = productRows.filter((r) => r.quantity > 0);
    if (selected.length === 0) {
      e.products = "Select at least one product with quantity > 0";
    } else {
      for (const r of selected) {
        const up = unitPrice(r.productId);
        if (up <= 0) {
          e.products = `Product "${r.name}" has no catalog price. Ask admin to set price.`;
          break;
        }
        const gross = up * r.quantity;
        const disc = parseFloat(r.discount) || 0;
        if (disc < 0) {
          e.products = "Discount cannot be negative";
          break;
        }
        if (disc > gross) {
          e.products = `Discount for "${r.name}" cannot exceed ₹${gross.toFixed(2)}`;
          break;
        }
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form, productRows, detailsEnabled, unitPrice]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate() || !user?.staffId) return;
      setSubmitting(true);
      try {
        const fullAddress = `${form.flatBuilding.trim()}, ${form.areaSector.trim()}`;
        const selectedProducts = productRows.filter((r) => r.quantity > 0);

        for (const item of selectedProducts) {
          const disc = parseFloat(item.discount) || 0;
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
              ...(disc > 0 ? { discountAmount: disc } : {}),
              notes: form.notes.trim() || undefined,
              status: "pending",
            })
          ).unwrap();
        }

        toast.success(`Created ${selectedProducts.length} order(s) successfully!`);
        navigate(`/orders`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create order");
      } finally {
        setSubmitting(false);
      }
    },
    [form, productRows, validate, user?.staffId, dispatch, navigate]
  );

  const update = useCallback((field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((er) => ({ ...er, [field]: "" }));
  }, []);

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader
          title="Create Order"
          subtitle="Add one or more products (including from different categories). Prices come from the catalog; optional line discounts apply per product."
        />
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Customer Name *"
              value={form.customerName}
              onChange={(e) => update("customerName", e.target.value)}
              error={errors.customerName}
            />
            <div className="w-full">
              <div className="mb-1 flex items-center justify-between gap-2">
                <label className="block text-sm font-medium text-text-heading">
                  Phone Number *
                </label>
                {lookupLoading && (
                  <span className="text-xs text-text-muted">Looking up…</span>
                )}
              </div>
              <Input
                label=""
                value={form.phone}
                onChange={(e) =>
                  update("phone", e.target.value.replace(/\D/g, "").slice(0, 10))
                }
                error={errors.phone}
                placeholder="10 digits"
                aria-label="Phone number"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Flat/House/Building Name *"
              value={form.flatBuilding}
              onChange={(e) => update("flatBuilding", e.target.value)}
              error={errors.flatBuilding}
              disabled={!detailsEnabled}
              placeholder={!detailsEnabled ? disabledHint : undefined}
            />
            <Input
              label="Area/Sector/Locality *"
              value={form.areaSector}
              onChange={(e) => update("areaSector", e.target.value)}
              error={errors.areaSector}
              disabled={!detailsEnabled}
              placeholder={!detailsEnabled ? disabledHint : undefined}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Pincode *"
              value={form.pincode}
              onChange={(e) => update("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
              error={errors.pincode}
              disabled={!detailsEnabled}
              placeholder={!detailsEnabled ? disabledHint : "6 digits"}
            />
            <Input
              label="Post Office *"
              value={form.postOffice}
              onChange={(e) => update("postOffice", e.target.value)}
              error={errors.postOffice}
              disabled={!detailsEnabled}
              placeholder={!detailsEnabled ? disabledHint : undefined}
            />
          </div>
          <Input
            label="Email *"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            error={errors.email}
            disabled={!detailsEnabled}
            placeholder={!detailsEnabled ? disabledHint : undefined}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="State *"
              value={form.state}
              onChange={(e) => update("state", e.target.value)}
              error={errors.state}
              disabled={!detailsEnabled}
              placeholder={!detailsEnabled ? disabledHint : undefined}
            />
            <Input
              label="District *"
              value={form.district}
              onChange={(e) => update("district", e.target.value)}
              error={errors.district}
              disabled={!detailsEnabled}
              placeholder={!detailsEnabled ? disabledHint : undefined}
            />
          </div>
          <Select
            label="Order Type *"
            options={orderTypeOptions}
            value={form.orderType}
            onChange={(e) => update("orderType", e.target.value)}
            placeholder={!detailsEnabled ? disabledHint : "Select type"}
            error={errors.orderType}
            disabled={!detailsEnabled}
          />
          <div className="space-y-4 pt-4">
            <h3 className="border-b pb-2 text-lg font-bold text-gray-800">Products</h3>

            <Select
              label="Category filter (optional)"
              options={categoryOptions}
              value={orderCategory}
              onChange={(e) => {
                setOrderCategory(e.target.value);
                setErrors((er) => ({ ...er, products: "" }));
                setIsDropdownOpen(false);
                setProductSearch("");
              }}
              placeholder={!detailsEnabled ? disabledHint : "All categories"}
              disabled={!detailsEnabled}
            />

            <div className="relative">
              <label className="mb-1 block text-sm font-medium text-text-heading">
                Select products *
              </label>
              <div
                className={[
                  "flex w-full items-center justify-between rounded-[var(--radius-md)] border bg-surface px-3 py-2.5 text-text shadow-[var(--shadow-card)] transition-colors",
                  errors.products && productRows.length === 0
                    ? "border-red-500"
                    : "border-border",
                  !detailsEnabled
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer hover:border-gray-400",
                ].join(" ")}
                onClick={() => detailsEnabled && setIsDropdownOpen(!isDropdownOpen)}
              >
                <span
                  className={
                    productRows.length > 0 ? "font-medium text-primary" : "text-gray-500"
                  }
                >
                  {!detailsEnabled
                    ? disabledHint
                    : productRows.length > 0
                        ? `${productRows.length} product(s) selected`
                        : "Search & select products…"}
                </span>
                <span className="text-xs text-gray-400">▼</span>
              </div>

              {isDropdownOpen && detailsEnabled && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsDropdownOpen(false)}
                  />
                  <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-xl">
                    <div className="border-b border-gray-100 bg-gray-50 p-2">
                      <input
                        type="text"
                        autoFocus
                        placeholder="Search products..."
                        className="w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        onClick={(ev) => ev.stopPropagation()}
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto p-1">
                      {[...productsInCategory]
                        .filter((p) =>
                          p.name.toLowerCase().includes(productSearch.toLowerCase())
                        )
                        .sort((a, b) => {
                          const aSelected = productRows.some((r) => r.productId === a.id);
                          const bSelected = productRows.some((r) => r.productId === b.id);
                          if (aSelected && !bSelected) return -1;
                          if (!aSelected && bSelected) return 1;
                          return 0;
                        })
                        .map((p) => {
                          const isSelected = productRows.some((r) => r.productId === p.id);
                          const pu = catalogUnitPrice(p);
                          const pLabel =
                            pu > 0 ? formatRupee(pu) : "price not set";
                          return (
                            <div
                              key={p.id}
                              className={`flex cursor-pointer items-center gap-3 rounded px-3 py-2 text-sm transition-colors hover:bg-gray-100 ${isSelected ? "bg-primary/5 font-medium" : "text-gray-700"}`}
                              onClick={() => toggleProductSelection(p)}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                readOnly
                                className="h-4 w-4 cursor-pointer rounded text-primary focus:ring-primary"
                              />
                              <span>
                                {p.name}{" "}
                                <span className="text-xs font-normal text-gray-500">({pLabel})</span>
                              </span>
                            </div>
                          );
                        })}
                      {productsInCategory.filter((p) =>
                        p.name.toLowerCase().includes(productSearch.toLowerCase())
                      ).length === 0 && (
                        <div className="px-3 py-4 text-center text-sm text-gray-500">
                          {productsInCategory.length === 0
                            ? "No products in this category."
                            : "No products match your search."}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {productRows.length > 0 && (
              <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4 shadow-inner">
                {productRows.map((row) => {
                  const up = unitPrice(row.productId);
                  const gross = up * row.quantity;
                  const subtotal = lineSubtotal(row);
                  const hasCatalogPrice = up > 0;
                  return (
                    <div
                      key={row.productId}
                      className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_auto_minmax(0,11rem)_auto] md:items-center md:gap-x-4"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-gray-900">{row.name}</div>
                        {hasCatalogPrice ? (
                          <p className="mt-0.5 text-xs text-gray-500">
                            Unit {formatRupee(up)} × {row.quantity} = {formatRupee(gross)}
                          </p>
                        ) : (
                          <p className="mt-0.5 text-xs font-medium text-amber-800">
                            No catalog price for this product. Ask an admin to open{" "}
                            <span className="whitespace-nowrap">Product Management</span> and set
                            a price — then refresh this page.
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-start md:justify-center">
                        <div className="inline-flex h-9 items-stretch overflow-hidden rounded-md border border-gray-300 bg-white shadow-sm">
                          <button
                            type="button"
                            disabled={!detailsEnabled}
                            onClick={() =>
                              updateProductRow(
                                row.productId,
                                "quantity",
                                Math.max(0, row.quantity - 1)
                              )
                            }
                            className="flex w-9 items-center justify-center bg-gray-50 text-gray-700 transition hover:bg-gray-100 disabled:opacity-40"
                            aria-label="Decrease quantity"
                          >
                            -
                          </button>
                          <span className="flex min-w-[2.25rem] items-center justify-center border-x border-gray-200 px-1 text-sm font-semibold tabular-nums text-gray-900">
                            {row.quantity}
                          </span>
                          <button
                            type="button"
                            disabled={!detailsEnabled}
                            onClick={() =>
                              updateProductRow(row.productId, "quantity", row.quantity + 1)
                            }
                            className="flex w-9 items-center justify-center bg-gray-50 text-gray-700 transition hover:bg-gray-100 disabled:opacity-40"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 md:max-w-none">
                        <label
                          htmlFor={`disc-${row.productId}`}
                          className="shrink-0 text-xs font-medium text-gray-600"
                        >
                          Discount
                        </label>
                        <div className="flex h-9 min-w-0 flex-1 items-stretch overflow-hidden rounded-md border border-gray-300 bg-white shadow-sm">
                          <span className="flex items-center border-r border-gray-200 bg-gray-50 px-2 text-sm text-gray-600">
                            ₹
                          </span>
                          <input
                            id={`disc-${row.productId}`}
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step="0.01"
                            disabled={!detailsEnabled}
                            placeholder="Optional"
                            className="min-w-0 flex-1 border-0 px-2 py-0 text-sm tabular-nums outline-none focus:ring-2 focus:ring-inset focus:ring-primary disabled:bg-gray-50 disabled:opacity-60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            value={row.discount}
                            onChange={(e) =>
                              updateProductRow(row.productId, "discount", e.target.value)
                            }
                          />
                        </div>
                      </div>

                      <div className="text-left md:text-right">
                        <div className="text-[10px] font-medium uppercase tracking-wide text-gray-400 md:hidden">
                          Line total
                        </div>
                        <div className="text-lg font-bold tabular-nums text-indigo-600 md:text-xl">
                          {formatRupee(subtotal)}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="mt-2 flex items-center justify-between border-t border-gray-300 px-2 pt-4">
                  <span className="text-xl font-bold uppercase tracking-wide text-gray-800">
                    Grand Total
                  </span>
                  <span className="text-2xl font-black tabular-nums text-green-600">
                    {formatRupee(grandTotal)}
                  </span>
                </div>
              </div>
            )}
            {errors.products && (
              <p className="text-sm font-medium text-red-500">{errors.products}</p>
            )}
          </div>
          <Textarea
            label="Notes (optional)"
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Customization or customer requirements"
            rows={3}
            disabled={!detailsEnabled}
          />
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={submitting}>
              Create Order
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate("/orders")}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default memo(CreateOrderPage);
