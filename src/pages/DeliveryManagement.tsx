import { memo, useState, useCallback, useMemo, useEffect } from "react";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  selectDeliveryMethods,
  selectProductDeliveryFees,
  fetchDeliveryMethods,
  createDeliveryMethod,
  updateDeliveryMethod,
  deleteDeliveryMethod,
  fetchProductDeliveryFees,
  createProductDeliveryFee,
  updateProductDeliveryFee,
  deleteProductDeliveryFee,
} from "../store/deliveriesSlice";
import { selectProducts, fetchProducts } from "../store/productsSlice";
import { selectCategories, fetchCategories } from "../store/categoriesSlice";
import { Card, CardHeader, Button, Table, Modal, Input, Tooltip, Select } from "../components/ui";
import type { SelectOption } from "../components/ui/Select";
import { toast } from "../lib/toast";
import type { DeliveryMethod, Product, ProductDeliveryFee } from "../types";

const UNCATEGORIZED_KEY = "__uncategorized__";

/** API may omit prepaid/COD during rollout; older payloads used `feeAmount` only. */
type ProductDeliveryFeeRow = ProductDeliveryFee & { feeAmount?: number };

function parseProductFeeAmounts(r: ProductDeliveryFeeRow): {
  prepaid: number;
  cod: number;
} {
  const num = (v: unknown): number | null => {
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const prepaidRaw = num(r.feePrepaid);
  const codRaw = num(r.feeCod);
  const legacy = num(r.feeAmount);
  if (prepaidRaw === null && codRaw === null && legacy !== null) {
    return { prepaid: legacy, cod: legacy };
  }
  return { prepaid: prepaidRaw ?? 0, cod: codRaw ?? 0 };
}

function productCategoryKey(p: Product): string {
  return p.categoryId ?? UNCATEGORIZED_KEY;
}

function DeliveryManagementPage() {
  const dispatch = useAppDispatch();
  const methods = useAppSelector(selectDeliveryMethods);
  const fees = useAppSelector(selectProductDeliveryFees);
  const products = useAppSelector(selectProducts);
  const categories = useAppSelector(selectCategories);

  const [methodModal, setMethodModal] = useState(false);
  const [methodEditingId, setMethodEditingId] = useState<string | null>(null);
  const [methodName, setMethodName] = useState("");
  const [methodDesc, setMethodDesc] = useState("");
  const [methodSort, setMethodSort] = useState("0");

  const [feeModal, setFeeModal] = useState(false);
  const [feeEditingId, setFeeEditingId] = useState<string | null>(null);
  const [feeCategoryId, setFeeCategoryId] = useState("");
  const [feeProductId, setFeeProductId] = useState("");
  const [feeMethodId, setFeeMethodId] = useState("");
  const [feePrepaid, setFeePrepaid] = useState("");
  const [feeCod, setFeeCod] = useState("");

  useEffect(() => {
    void dispatch(fetchDeliveryMethods());
    void dispatch(fetchProductDeliveryFees());
    void dispatch(fetchProducts());
    void dispatch(fetchCategories());
  }, [dispatch]);

  const categoryOptionsForFee: SelectOption[] = useMemo(() => {
    const sorted = [...categories].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );
    const opts: SelectOption[] = [
      { value: "", label: "Select category…" },
      ...sorted.map((c) => ({ value: c.id, label: c.name })),
    ];
    if (products.some((p) => !p.categoryId)) {
      opts.push({
        value: UNCATEGORIZED_KEY,
        label: "Uncategorized (legacy)",
      });
    }
    return opts;
  }, [categories, products]);

  const productsInFeeCategory = useMemo(() => {
    if (!feeCategoryId) return [];
    return products
      .filter((p) => productCategoryKey(p) === feeCategoryId)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }, [products, feeCategoryId]);

  const feeProductSelectOptions: SelectOption[] = useMemo(() => {
    let rows = productsInFeeCategory;
    if (feeProductId && !rows.some((p) => p.id === feeProductId)) {
      const extra = products.find((p) => p.id === feeProductId);
      if (extra) {
        rows = [...rows, extra].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        );
      }
    }
    const firstLabel = feeCategoryId ? "Select product…" : "Choose category first";
    return [
      { value: "", label: firstLabel },
      ...(feeCategoryId ? rows.map((p) => ({ value: p.id, label: p.name })) : []),
    ];
  }, [feeCategoryId, feeProductId, productsInFeeCategory, products]);

  const methodOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: "Select delivery type…" },
      ...methods.map((m) => ({ value: m.id, label: m.name })),
    ],
    [methods]
  );

  const openAddMethod = useCallback(() => {
    setMethodEditingId(null);
    setMethodName("");
    setMethodDesc("");
    setMethodSort("0");
    setMethodModal(true);
  }, []);

  const openEditMethod = useCallback((m: DeliveryMethod) => {
    setMethodEditingId(m.id);
    setMethodName(m.name);
    setMethodDesc(m.description ?? "");
    setMethodSort(String(m.sortOrder ?? 0));
    setMethodModal(true);
  }, []);

  const saveMethod = useCallback(async () => {
    if (!methodName.trim()) {
      toast.error("Name is required");
      return;
    }
    const sort = parseInt(methodSort, 10);
    if (Number.isNaN(sort) || sort < 0) {
      toast.error("Sort order must be a non-negative integer");
      return;
    }
    try {
      if (methodEditingId) {
        await dispatch(
          updateDeliveryMethod({
            id: methodEditingId,
            patch: {
              name: methodName.trim(),
              description: methodDesc.trim() || undefined,
              sortOrder: sort,
            },
          })
        ).unwrap();
        toast.success("Delivery type updated");
      } else {
        await dispatch(
          createDeliveryMethod({
            name: methodName.trim(),
            description: methodDesc.trim() || undefined,
            sortOrder: sort,
          })
        ).unwrap();
        toast.success("Delivery type created");
      }
      setMethodModal(false);
    } catch (err) {
      toast.fromError(err, "Failed to save");
    }
  }, [methodEditingId, methodName, methodDesc, methodSort, dispatch]);

  const removeMethod = useCallback(
    async (id: string) => {
      if (!window.confirm("Delete this delivery type? Remove all product fees for it first."))
        return;
      try {
        await dispatch(deleteDeliveryMethod(id)).unwrap();
        toast.success("Deleted");
      } catch (err) {
        toast.fromError(err, "Cannot delete");
      }
    },
    [dispatch]
  );

  const openAddFee = useCallback(() => {
    setFeeEditingId(null);
    setFeeCategoryId("");
    setFeeProductId("");
    setFeeMethodId("");
    setFeePrepaid("");
    setFeeCod("");
    setFeeModal(true);
  }, []);

  const openEditFee = useCallback(
    (f: ProductDeliveryFeeRow) => {
      const p = products.find((x) => x.id === f.productId);
      const { prepaid, cod } = parseProductFeeAmounts(f);
      setFeeEditingId(f.id);
      setFeeCategoryId(p ? productCategoryKey(p) : "");
      setFeeProductId(f.productId);
      setFeeMethodId(f.deliveryMethodId);
      setFeePrepaid(String(prepaid));
      setFeeCod(String(cod));
      setFeeModal(true);
    },
    [products]
  );

  const closeFeeModal = useCallback(() => {
    setFeeModal(false);
    setFeeCategoryId("");
  }, []);

  const saveFee = useCallback(async () => {
    if (!feeEditingId && !feeCategoryId) {
      toast.error("Select a category first");
      return;
    }
    if (!feeProductId || !feeMethodId) {
      toast.error("Choose product and delivery type");
      return;
    }
    const prepaid = parseFloat(feePrepaid);
    const cod = parseFloat(feeCod);
    if (Number.isNaN(prepaid) || prepaid < 0 || Number.isNaN(cod) || cod < 0) {
      toast.error("Enter valid prepaid and COD fees (₹)");
      return;
    }
    try {
      if (feeEditingId) {
        await dispatch(
          updateProductDeliveryFee({
            id: feeEditingId,
            patch: {
              productId: feeProductId,
              deliveryMethodId: feeMethodId,
              feePrepaid: prepaid,
              feeCod: cod,
            },
          })
        ).unwrap();
        toast.success("Fee updated");
      } else {
        await dispatch(
          createProductDeliveryFee({
            productId: feeProductId,
            deliveryMethodId: feeMethodId,
            feePrepaid: prepaid,
            feeCod: cod,
          })
        ).unwrap();
        toast.success("Fee added");
      }
      closeFeeModal();
    } catch (err) {
      toast.fromError(err, "Failed to save fee");
    }
  }, [
    feeEditingId,
    feeCategoryId,
    feeProductId,
    feeMethodId,
    feePrepaid,
    feeCod,
    dispatch,
    closeFeeModal,
  ]);

  const removeFee = useCallback(
    async (id: string) => {
      if (!window.confirm("Remove this product delivery fee?")) return;
      try {
        await dispatch(deleteProductDeliveryFee(id)).unwrap();
        toast.success("Removed");
      } catch (err) {
        toast.fromError(err, "Failed to remove");
      }
    },
    [dispatch]
  );

  const methodColumns = useMemo(
    () => [
      { key: "sortOrder", header: "Order", render: (r: DeliveryMethod) => r.sortOrder },
      { key: "name", header: "Name" },
      {
        key: "description",
        header: "Description",
        render: (r: DeliveryMethod) => r.description?.trim() || "—",
      },
      {
        key: "actions",
        header: "",
        render: (r: DeliveryMethod) => (
          <div className="flex items-center gap-1">
            <Tooltip content="Edit" side="top">
              <button
                type="button"
                onClick={() => openEditMethod(r)}
                className="rounded-[var(--radius-md)] p-2 text-text-muted hover:bg-primary-muted hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Edit"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
            </Tooltip>
            <Tooltip content="Delete" side="top">
              <button
                type="button"
                onClick={() => void removeMethod(r.id)}
                className="rounded-[var(--radius-md)] p-2 text-text-muted hover:bg-error-bg hover:text-error focus:outline-none focus:ring-2 focus:ring-error"
                aria-label="Delete"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </Tooltip>
          </div>
        ),
      },
    ],
    [openEditMethod, removeMethod]
  );

  const feeColumns = useMemo(
    () => [
      {
        key: "category",
        header: "Category",
        render: (r: ProductDeliveryFee) => {
          const p = products.find((x) => x.id === r.productId);
          if (!p?.categoryId) return "Uncategorized";
          return categories.find((c) => c.id === p.categoryId)?.name ?? "—";
        },
      },
      {
        key: "product",
        header: "Product",
        render: (r: ProductDeliveryFee) => r.productName ?? r.productId,
      },
      {
        key: "method",
        header: "Delivery",
        render: (r: ProductDeliveryFee) =>
          r.deliveryMethodName ??
          methods.find((x) => x.id === r.deliveryMethodId)?.name ??
          r.deliveryMethodId,
      },
      {
        key: "feePrepaid",
        header: "Prepaid (₹)",
        render: (r: ProductDeliveryFee) =>
          parseProductFeeAmounts(r as ProductDeliveryFeeRow).prepaid.toFixed(2),
      },
      {
        key: "feeCod",
        header: "COD (₹)",
        render: (r: ProductDeliveryFee) =>
          parseProductFeeAmounts(r as ProductDeliveryFeeRow).cod.toFixed(2),
      },
      {
        key: "actions",
        header: "",
        render: (r: ProductDeliveryFee) => (
          <div className="flex items-center gap-1">
            <Tooltip content="Edit" side="top">
              <button
                type="button"
                onClick={() => openEditFee(r)}
                className="rounded-[var(--radius-md)] p-2 text-text-muted hover:bg-primary-muted hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Edit"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
            </Tooltip>
            <Tooltip content="Delete" side="top">
              <button
                type="button"
                onClick={() => void removeFee(r.id)}
                className="rounded-[var(--radius-md)] p-2 text-text-muted hover:bg-error-bg hover:text-error focus:outline-none focus:ring-2 focus:ring-error"
                aria-label="Delete"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </Tooltip>
          </div>
        ),
      },
    ],
    [openEditFee, removeFee, products, categories, methods]
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Delivery types"
          // subtitle="Carriers or modes (e.g. Professional, DTDC, Post office, Cash on delivery, KSRTC). Used in the order form when fees exist per product."
          action={
            <Button type="button" onClick={openAddMethod}>
              Add type
            </Button>
          }
        />
        <Table
          columns={methodColumns}
          data={methods}
          keyExtractor={(m) => m.id}
          emptyMessage="No delivery types yet."
        />
      </Card>

      <Card>
        <CardHeader
          title="Fees by product"
          // subtitle="For each product, set the delivery charge per type. A carrier appears on the order if at least one cart product has a fee; other products add ₹0 for that carrier."
          action={
            <Button type="button" onClick={openAddFee}>
              Add fee
            </Button>
          }
        />
        <Table
          columns={feeColumns}
          data={fees}
          keyExtractor={(f) => f.id}
          emptyMessage="No per-product fees. Add rows so staff can pick delivery on orders."
        />
      </Card>

      <Modal
        isOpen={methodModal}
        onClose={() => setMethodModal(false)}
        title={methodEditingId ? "Edit delivery type" : "Add delivery type"}
      >
        <div className="space-y-4">
          <Input
            label="Name *"
            value={methodName}
            onChange={(e) => setMethodName(e.target.value)}
            placeholder="e.g. DTDC, KSRTC, Cash on delivery"
          />
          <Input
            label="Description"
            value={methodDesc}
            onChange={(e) => setMethodDesc(e.target.value)}
            placeholder="Optional"
          />
          <Input
            label="Sort order"
            type="number"
            min={0}
            step={1}
            value={methodSort}
            onChange={(e) => setMethodSort(e.target.value)}
          />
          <div className="flex gap-2">
            <Button type="button" onClick={() => void saveMethod()}>
              Save
            </Button>
            <Button type="button" variant="secondary" onClick={() => setMethodModal(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={feeModal}
        onClose={closeFeeModal}
        title={feeEditingId ? "Edit fee" : "Add product fee"}
      >
        <div className="space-y-4">
          <Select
            label="Category *"
            options={categoryOptionsForFee}
            value={feeCategoryId}
            onChange={(e) => {
              setFeeCategoryId(e.target.value);
              setFeeProductId("");
            }}
          />
          <Select
            label="Product *"
            options={feeProductSelectOptions}
            value={feeProductId}
            onChange={(e) => setFeeProductId(e.target.value)}
            disabled={!feeCategoryId}
          />
          <Select
            label="Delivery type *"
            options={methodOptions}
            value={feeMethodId}
            onChange={(e) => setFeeMethodId(e.target.value)}
          />
          <Input
            label="Fee — Prepaid orders (₹) *"
            type="number"
            min={0}
            step="0.01"
            value={feePrepaid}
            onChange={(e) => setFeePrepaid(e.target.value)}
            placeholder="0"
          />
          <Input
            label="Fee — COD orders (₹) *"
            type="number"
            min={0}
            step="0.01"
            value={feeCod}
            onChange={(e) => setFeeCod(e.target.value)}
            placeholder="0"
          />
          <p className="text-[11px] text-text-muted leading-relaxed">
            On Create Order, the total uses the prepaid column when the order is Prepaid and the COD column when it is
            COD. Quantity multiplies per unit the same way as before.
          </p>
          <div className="flex gap-2">
            <Button type="button" onClick={() => void saveFee()}>
              Save
            </Button>
            <Button type="button" variant="secondary" onClick={closeFeeModal}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default memo(DeliveryManagementPage);
