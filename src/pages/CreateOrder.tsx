import {
  memo,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import { ArrowLeftIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useLocation, useNavigate, useParams } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { selectProducts, fetchProducts } from "../store/productsSlice";
import { selectCategories, fetchCategories } from "../store/categoriesSlice";
import { createOrder, fetchOrders, selectOrders, updateOrder } from "../store/ordersSlice";
import { Card, CardHeader, Button, Input, Modal, Select, Textarea } from "../components/ui";
import type { SelectOption } from "../components/ui/Select";
import { getErrorMessage, toast } from "../lib/toast";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";
import type {
  Customer,
  DeliveryOptionForCart,
  Order,
  OrderStatus,
  OrderType,
  Product,
} from "../types";
import { LuClipboardList } from "react-icons/lu";


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

/** Extract 10-digit Indian mobile from pasted text (handles +91, spaces). */
function extractPhoneDigits(blob: string): string {
  const digits = blob.replace(/\D/g, "");
  for (let i = Math.max(0, digits.length - 12); i <= digits.length - 10; i++) {
    const slice = digits.slice(i, i + 10);
    if (/^[6-9]\d{9}$/.test(slice)) return slice;
  }
  const m = blob.match(/\b(\d{10})\b/);
  return m && /^[6-9]\d{9}$/.test(m[1]) ? m[1] : "";
}

/** Strip WhatsApp / forward noise from a single line (timestamp brackets, sender labels). */
function stripWhatsAppLinePrefix(line: string): string {
  return line
    .replace(/^\[[^\]]{4,120}\]\s*[^:]*:\s*/i, "")
    .replace(/^\[[^\]]+\]\s*[^\n]*?Whatsapp\s*:\s*/i, "")
    .trim();
}

/** True if line starts a *LABEL : value block (WhatsApp bold labels). */
function isStarLabelLine(line: string): boolean {
  return /^\*+\s*[a-zA-Z]{2,}[\w\s]*\s*[:：]/.test(line.trim());
}

/**
 * Fill customer fields from a WhatsApp / notes paste (name, phone, address, pincode, email).
 * Handles *NAME :, *ADDRES :, *PINCODE :, "District - …", "Post - …", and strips metadata lines.
 */
function parsePastedCustomerDetails(text: string): Partial<typeof INITIAL> {
  const out: Partial<typeof INITIAL> = {};
  const rawLines = text.split(/\r?\n/).map((l) => stripWhatsAppLinePrefix(l.trim()));

  const lines = rawLines.filter((l) => {
    if (!l) return false;
    if (/^\|+$/.test(l)) return false;
    if (/^\[[^\]]+\]\s*.*whatsapp/i.test(l)) return false;
    if (/^[^\d\w\s@*.,\-–—/:()&]+$/u.test(l) && l.length <= 6) return false;
    return true;
  });

  const blob = lines.join("\n");

  const labelField =
    /^\*+\s*(name|namae|address|addr|addres|delivery|pincode|pin|state|district|post\s*office|post)\s*[:：]\s*(.*)$/i;

  const consumed = new Set<number>();

  for (let i = 0; i < lines.length; i++) {
    if (consumed.has(i)) continue;

    const dm = lines[i].match(/^district\s*[-–—]\s*(.+)$/i);
    if (dm) {
      out.district = dm[1].trim();
      consumed.add(i);
      continue;
    }
    const pm = lines[i].match(/^post\s*[-–—]\s*(.+)$/i);
    if (pm) {
      out.postOffice = pm[1].trim();
      consumed.add(i);
      continue;
    }

    const m = lines[i].match(labelField);
    if (!m) continue;

    const rawKey = m[1].toLowerCase().replace(/\s+/g, "");
    let rest = (m[2] ?? "").trim();

    const takeContinuation = (): string[] => {
      const acc: string[] = [];
      if (rest) acc.push(rest);
      let j = i + 1;
      while (j < lines.length) {
        const nl = lines[j];
        if (!nl) {
          j++;
          continue;
        }
        if (labelField.test(nl)) break;
        if (/^district\s*[-–—]/i.test(nl) || /^post\s*[-–—]/i.test(nl)) break;
        if (isStarLabelLine(nl)) break;
        acc.push(nl);
        consumed.add(j);
        j++;
      }
      return acc;
    };

    if (rawKey === "name" || rawKey === "namae") {
      const parts = takeContinuation();
      const nameVal = parts.join(" ").replace(/\s+/g, " ").trim();
      if (nameVal) out.customerName = nameVal;
      consumed.add(i);
      continue;
    }

    if (
      rawKey.includes("address") ||
      rawKey === "addr" ||
      rawKey === "addres" ||
      rawKey === "delivery"
    ) {
      const parts = takeContinuation();
      let addr = parts.join(", ").replace(/\s+/g, " ").trim();
      addr = addr.replace(/\b(Tamil Nadu|Kerala|Karnataka|Maharashtra|Gujarat|Delhi|India)\s+(\d{6})\b/gi, "$1");
      if (addr) {
        const sp = splitDeliveryAddress(addr);
        out.flatBuilding = sp.flat || addr;
        out.areaSector = sp.area;
      }
      consumed.add(i);
      continue;
    }

    if (rawKey === "pincode" || rawKey === "pin") {
      const six = (rest + blob).match(/\b(\d{6})\b/);
      if (six) out.pincode = six[1];
      consumed.add(i);
      continue;
    }

    if (rawKey === "state") {
      if (rest) out.state = rest;
      consumed.add(i);
      continue;
    }

    if (rawKey === "district") {
      if (rest) out.district = rest;
      consumed.add(i);
      continue;
    }

    if (rawKey === "post" || rawKey === "postoffice") {
      if (rest) out.postOffice = rest;
      consumed.add(i);
      continue;
    }
  }

  const phone = extractPhoneDigits(blob);
  if (phone) out.phone = phone;

  if (!out.pincode) {
    const pinM = blob.match(/\b(\d{6})\b/);
    if (pinM) out.pincode = pinM[1];
  }

  const emailM = blob.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (emailM) out.email = emailM[0];

  let work = lines.filter((_, idx) => !consumed.has(idx));

  work = work.filter((l) => {
    if (/^phone\s*[:：.-]/i.test(l) || /^mobile\s*[:：.-]/i.test(l)) return false;
    const d = l.replace(/\D/g, "");
    if (phone && (d === phone || (d.length >= 10 && d.endsWith(phone)))) return false;
    return true;
  });

  work = work.filter((l) => !(out.email && l.includes(out.email)));

  work = work.filter((l) => {
    const t = l.trim();
    if (out.pincode && t === out.pincode) return false;
    if (/^\d{6}$/.test(t)) return false;
    return true;
  });

  work = work
    .map((l) => l.replace(/^\*+\s*[a-zA-Z][^:：\n]{0,56}[:：]\s*/i, "").trim())
    .filter(Boolean);

  const addrLabelIdx = work.findIndex((ln) =>
    /^(address|addr|delivery|shipping)\s*[:：.-]/i.test(ln),
  );
  if (addrLabelIdx >= 0) {
    const raw = work[addrLabelIdx].replace(
      /^(address|addr|delivery|shipping)\s*[:：.-]\s*/i,
      "",
    );
    work.splice(addrLabelIdx, 1);
    if (raw.trim()) work.unshift(raw.trim());
  }

  if (!out.customerName && work[0] && !/^\d/.test(work[0]) && !/@/.test(work[0])) {
    const maybeName = work[0];
    if (!maybeName.includes(",") || maybeName.length < 40) {
      out.customerName = maybeName;
      work = work.slice(1);
    }
  }

  if (!out.flatBuilding && !out.areaSector) {
    const addrStr = work.join(", ").replace(/\s+/g, " ").trim();
    if (addrStr) {
      const { flat, area } = splitDeliveryAddress(addrStr);
      out.flatBuilding = flat || addrStr;
      out.areaSector = area;
    }
  }

  return out;
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

/**
 * Create-order API still expects a valid email string. When staff leaves email blank,
 * send a stable synthetic address (per phone) so validation passes — no UI validation.
 */
function emailForCreateOrderApi(typed: string, phoneDigits: string): string {
  const t = typed.trim();
  if (t) return t;
  const p = phoneDigits.replace(/\D/g, "").slice(-10) || "unknown";
  return `noemail.${p}@example.com`;
}

/** Staff `/orders/.../edit`: pending or scheduled. Admin `/admin/orders/.../edit`: pending or packed only. */
function canEditOrderLineStatus(
  status: OrderStatus | undefined,
  role: string | undefined,
  isAdminOrderEdit: boolean,
): boolean {
  if (!status) return false;
  if (isAdminOrderEdit) {
    return status === "pending" || status === "packed";
  }
  if (status === "pending" || status === "scheduled") return true;
  if (status === "packed") return role === "super_admin" || role === "guest";
  return false;
}

function CreateOrderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: editOrderId } = useParams<{ id: string }>();
  const isAdminOrderEdit =
    location.pathname.startsWith("/admin/orders/") &&
    location.pathname.endsWith("/edit");
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const orders = useAppSelector(selectOrders);
  const products = useAppSelector(selectProducts);
  /** Staff API returns only active; admin list includes inactive — exclude from new orders. */
  const catalogProducts = useMemo(
    () => products.filter((p) => p.isActive !== false),
    [products],
  );
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
  const [addOn, setAddOn] = useState<{ amount: string; note: string } | null>(null);
  const [isAddOnModalOpen, setIsAddOnModalOpen] = useState(false);
  const [tempAddOn, setTempAddOn] = useState({ amount: "", note: "" });
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOptionForCart[]>([]);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [selectedDeliveryMethodId, setSelectedDeliveryMethodId] = useState("");
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteReading, setPasteReading] = useState(false);
  const [scheduledForDate, setScheduledForDate] = useState("");
  /** When true, show date picker and send `scheduledFor` on create / patch. */
  const [scheduleOrder, setScheduleOrder] = useState(false);
  /** Earliest selectable fulfilment date (tomorrow UTC) — matches API scheduledFor rules. */
  const minScheduleDateYmd = useMemo(() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);
  /** Full row from GET /orders/:id — list cache can omit fields; always fetch on edit. */
  const [editOrderDetail, setEditOrderDetail] = useState<Order | null>(null);
  const editingOrder = useMemo(() => {
    if (!editOrderId) return null;
    if (editOrderDetail?.id === editOrderId) return editOrderDetail;
    return orders.find((o) => o.id === editOrderId) ?? null;
  }, [editOrderId, orders, editOrderDetail]);
  const isEditMode = Boolean(editOrderId);
  const scheduleAllowed = useMemo(
    () =>
      !isEditMode ||
      editingOrder?.status === "pending" ||
      editingOrder?.status === "scheduled",
    [isEditMode, editingOrder?.status],
  );

  useEffect(() => {
    if (!editOrderId) {
      setEditOrderDetail(null);
      return;
    }
    let cancelled = false;
    void api
      .get<Order>(endpoints.orderById(editOrderId), { silent: true })
      .then((o) => {
        if (!cancelled) setEditOrderDetail(o);
      })
      .catch(() => {
        if (!cancelled) {
          setEditOrderDetail(null);
          toast.error("Could not load this order to edit.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [editOrderId]);

  useEffect(() => {
    if (isEditMode) void dispatch(fetchOrders());
  }, [dispatch, isEditMode]);

  /** Last 10 digits — used so edit mode unlocks before form.phone is copied from the order (mobile race). */
  const normalizedPhone10 = useMemo(() => {
    const fromForm = form.phone.replace(/\D/g, "");
    if (fromForm.length >= 10) return fromForm.slice(-10);
    if (isEditMode && editingOrder?.phone) {
      const fromOrder = String(editingOrder.phone).replace(/\D/g, "");
      if (fromOrder.length >= 10) return fromOrder.slice(-10);
    }
    return fromForm.length > 0 ? fromForm : "";
  }, [form.phone, editingOrder, isEditMode]);

  const phoneTrim = form.phone.trim();
  const detailsEnabled = normalizedPhone10.length === 10;
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

  /** Track last hydrated order so the layout effect only sets form+rows once per order. */
  const hydratedOrderIdRef = useRef<string | null>(null);

  /** Layout: hydrate edit form before paint and before other effects (delivery fees) read stale `form.orderType`. */
  useLayoutEffect(() => {
    if (!editingOrder) {
      setScheduledForDate("");
      setScheduleOrder(false);
      hydratedOrderIdRef.current = null;
      return;
    }
    /* Only fully hydrate when the *order* changes — not every time the products catalog updates.
     * Allow re-hydration if productRows is empty (e.g. cleared by a race condition reset). */
    if (hydratedOrderIdRef.current === editingOrder.id && productRows.length > 0) return;
    hydratedOrderIdRef.current = editingOrder.id;

    setProductSearch("");
    setIsDropdownOpen(false);
    const lineProduct = products.find((p) => p.id === editingOrder.productId);
    setOrderCategory(lineProduct ? productCategoryKey(lineProduct) : "");
    const { flat, area } = splitDeliveryAddress(editingOrder.deliveryAddress);
    setForm({
      customerName: editingOrder.customerName ?? "",
      flatBuilding: flat,
      areaSector: area,
      phone: editingOrder.phone ?? "",
      pincode: editingOrder.pincode ?? "",
      postOffice: editingOrder.postOffice ?? "",
      email: editingOrder.email ?? "",
      state: editingOrder.state ?? "",
      district: editingOrder.district ?? "",
      orderType: editingOrder.orderType ?? "",
      notes: editingOrder.notes ?? "",
    });
    setProductRows([
      {
        productId: editingOrder.productId,
        name:
          products.find((p) => p.id === editingOrder.productId)?.name ??
          editingOrder.productName ??
          "Product",
        quantity: editingOrder.quantity,
        discount:
          editingOrder.discountAmount != null ? String(editingOrder.discountAmount) : "",
      },
    ]);
    setSelectedDeliveryMethodId(editingOrder.deliveryMethodId ?? "");
    setAddOn(
      editingOrder.addOnAmount != null
        ? {
          amount: String(editingOrder.addOnAmount),
          note: editingOrder.addOnNote ?? "",
        }
        : null
    );
    setScheduledForDate(
      editingOrder.scheduledFor
        ? editingOrder.scheduledFor.slice(0, 10)
        : "",
    );
    setScheduleOrder(
      Boolean(editingOrder.scheduledFor?.trim()) ||
      editingOrder.status === "scheduled",
    );
  }, [editingOrder, products, productRows.length]);

  /** Once the products catalog arrives, patch product names + category into already-hydrated rows.
   * If rows are somehow lost in edit mode, restore the primary row from the order. */
  useEffect(() => {
    if (!editOrderId || products.length === 0) return;

    setProductRows((prev) => {
      // 1. Restore if missing
      if (prev.length === 0 && editingOrder) {
        return [
          {
            productId: editingOrder.productId,
            name:
              products.find((p) => p.id === editingOrder.productId)?.name ??
              editingOrder.productName ??
              "Product",
            quantity: editingOrder.quantity,
            discount:
              editingOrder.discountAmount != null ? String(editingOrder.discountAmount) : "",
          },
        ];
      }

      // 2. Patch names if they changed or were fallback
      let changed = false;
      const next = prev.map((row) => {
        const catalogP = products.find((p) => p.id === row.productId);
        if (catalogP && catalogP.name !== row.name) {
          changed = true;
          return { ...row, name: catalogP.name };
        }
        return row;
      });
      return changed ? next : prev;
    });

    // 3. Robust category resolution
    setProductRows((prev) => {
      if (prev.length > 0 && !orderCategory) {
        const firstP = products.find((p) => p.id === prev[0].productId);
        if (firstP) {
          setOrderCategory(productCategoryKey(firstP));
        }
      }
      return prev;
    });
  }, [products, editOrderId, editingOrder, orderCategory]);

  const cartProductIdsKey = useMemo(
    () =>
      productRows
        .filter((r) => r.quantity > 0)
        .flatMap((r) => Array.from({ length: r.quantity }, () => r.productId))
        .sort()
        .join(","),
    [productRows]
  );

  /** Debounce cart changes so mobile quantity taps / product toggles don’t hit the API every tap.
   * First product(s) in the cart fetch immediately; later changes wait 400ms after activity stops. */
  const [debouncedDeliveryCartKey, setDebouncedDeliveryCartKey] = useState("");
  const deliveryCartWasEmptyRef = useRef(true);

  useEffect(() => {
    deliveryCartWasEmptyRef.current = true;
  }, [editOrderId]);

  useEffect(() => {
    if (!cartProductIdsKey) {
      setDebouncedDeliveryCartKey("");
      deliveryCartWasEmptyRef.current = true;
      return;
    }
    if (deliveryCartWasEmptyRef.current) {
      deliveryCartWasEmptyRef.current = false;
      setDebouncedDeliveryCartKey(cartProductIdsKey);
      return;
    }
    const t = window.setTimeout(() => {
      setDebouncedDeliveryCartKey(cartProductIdsKey);
    }, 400);
    return () => window.clearTimeout(t);
  }, [cartProductIdsKey]);

  useEffect(() => {
    if (!debouncedDeliveryCartKey) {
      setDeliveryOptions([]);
      /** Same race as phone reset: first edit paint has no rows yet; don't wipe delivery selection. */
      if (!isEditMode) setSelectedDeliveryMethodId("");
      return;
    }
    if (form.orderType !== "prepaid" && form.orderType !== "cod") {
      setDeliveryOptions([]);
      /** Edit hydrate can lag one frame; don’t wipe courier from the order before type is applied. */
      if (!isEditMode) setSelectedDeliveryMethodId("");
      return;
    }
    const ids = debouncedDeliveryCartKey.split(",").filter(Boolean);
    let cancelled = false;
    setDeliveryLoading(true);
    const qs = ids.join(",");
    const ot = encodeURIComponent(form.orderType);
    void api
      .get<DeliveryOptionForCart[]>(
        `${endpoints.productDeliveryFeesForCart}?productIds=${encodeURIComponent(qs)}&orderType=${ot}`
      )
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setDeliveryOptions(list);
        setSelectedDeliveryMethodId((prev) =>
          list.some((o) => o.deliveryMethodId === prev) ? prev : ""
        );
      })
      .catch(() => {
        if (!cancelled) {
          setDeliveryOptions([]);
          if (!isEditMode) setSelectedDeliveryMethodId("");
        }
      })
      .finally(() => {
        if (!cancelled) setDeliveryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedDeliveryCartKey, form.orderType, isEditMode]);

  /** Create-order only: reset cart when phone is incomplete. Skip in edit mode — otherwise the first
   * paint has empty phone, this clears rows, and the populate effect may not re-run (same deps). */
  useEffect(() => {
    if (isEditMode) return;
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
  }, [phoneTrim, isEditMode]);

  useEffect(() => {
    if (!detailsEnabled) setIsDropdownOpen(false);
  }, [detailsEnabled]);

  useEffect(() => {
    if (isEditMode) {
      setLookupLoading(false);
      return;
    }
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
  }, [phoneTrim, isEditMode]);

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

  const selectedDeliveryFee = useMemo(() => {
    const o = deliveryOptions.find((x) => x.deliveryMethodId === selectedDeliveryMethodId);
    return o?.totalFee ?? 0;
  }, [deliveryOptions, selectedDeliveryMethodId]);

  const grandTotal = useMemo(() => {
    const productsSum = productRows.reduce((sum, row) => sum + lineSubtotal(row), 0);
    return (
      productsSum +
      (parseFloat(addOn?.amount || "0") || 0) +
      selectedDeliveryFee
    );
  }, [productRows, lineSubtotal, addOn, selectedDeliveryFee]);

  const deliverySelectOptions: SelectOption[] = useMemo(
    () => deliveryOptions.map((o) => ({
      value: o.deliveryMethodId,
      label: `${o.name} (+₹${o.totalFee.toFixed(2)})`,
    })),
    [deliveryOptions]
  );

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

  const removeProductRow = useCallback(
    (productId: string) => {
      if (!detailsEnabled) return;
      setProductRows((rows) => rows.filter((r) => r.productId !== productId));
      setErrors((e) => ({ ...e, products: "" }));
    },
    [detailsEnabled]
  );

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
    const opts: SelectOption[] = sorted.map((c) => ({ value: c.id, label: c.name }));
    if (catalogProducts.some((p) => !p.categoryId)) {
      opts.push({
        value: UNCATEGORIZED_KEY,
        label: "Uncategorized (legacy)",
      });
    }
    return opts;
  }, [categories, catalogProducts]);

  const productsInCategory = useMemo(() => {
    if (!orderCategory) return catalogProducts;
    return catalogProducts.filter(
      (p) => productCategoryKey(p) === orderCategory,
    );
  }, [catalogProducts, orderCategory]);

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

    if (!form.state.trim()) e.state = "Required";
    if (!form.district.trim()) e.district = "Required";
    if (!form.orderType) e.orderType = "Select order type";
    if (!selectedDeliveryMethodId) e.deliveryMethod = "Select a courier service";

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

    if (scheduleAllowed && scheduleOrder) {
      const y = scheduledForDate.trim();
      if (!y) {
        e.scheduledFor = "Choose a schedule date";
      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(y)) {
        e.scheduledFor = "Invalid date";
      } else {
        const today = new Date().toISOString().slice(0, 10);
        if (y <= today) e.scheduledFor = "Choose a date after today";
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }, [
    form,
    productRows,
    detailsEnabled,
    unitPrice,
    selectedDeliveryMethodId,
    scheduleAllowed,
    scheduledForDate,
    scheduleOrder,
  ]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;
      if (!user) {
        toast.error("Not signed in");
        return;
      }
      const needsStaffProfile = !isEditMode || user.role === "staff";
      if (needsStaffProfile && !user.staffId) {
        toast.error("Your account must be linked to a staff profile to save orders.");
        return;
      }
      setSubmitting(true);
      try {
        const fullAddress = `${form.flatBuilding.trim()}, ${form.areaSector.trim()}`;
        const selectedProducts = productRows.filter((r) => r.quantity > 0);

        if (isEditMode) {
          if (!editingOrder) {
            toast.error("Order not found for editing");
            return;
          }
          if (!canEditOrderLineStatus(editingOrder.status, user?.role, isAdminOrderEdit)) {
            toast.error(
              isAdminOrderEdit
                ? "Only pending or packed orders can be edited"
                : "Only pending or scheduled orders can be edited",
            );
            return;
          }
          if (selectedProducts.length !== 1) {
            toast.error("Edit mode supports one product line only");
            return;
          }
          const item = selectedProducts[0];
          const disc = parseFloat(item.discount) || 0;
          const s = scheduleOrder ? scheduledForDate.trim() : "";
          const schedulePatch =
            editingOrder.status === "pending" || editingOrder.status === "scheduled"
              ? s
                ? { scheduledFor: s }
                : editingOrder.status === "scheduled"
                  ? { scheduledFor: null }
                  : {}
              : {};
          const patch: Partial<Order> = {
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
            discountAmount: disc > 0 ? disc : null,
            deliveryMethodId: selectedDeliveryMethodId || null,
            addOnAmount: addOn?.amount ? parseFloat(addOn.amount) : null,
            addOnNote: addOn?.note?.trim() ? addOn.note.trim() : null,
            notes: form.notes.trim() || undefined,
            ...schedulePatch,
          };
          await dispatch(
            updateOrder({
              id: editingOrder.id,
              patch,
            })
          ).unwrap();
          toast.success("Order updated successfully");
          navigate(isAdminOrderEdit ? "/admin/orders" : "/orders");
          return;
        }

        // Fetch a single order ID to share across all items (Single Order support)
        const { orderId: commonOrderId } = await api.get<{ orderId: string }>(endpoints.orderNextDisplayId);

        let lastCreatedLine: Order | undefined;

        const scheduleYmd = scheduleOrder ? scheduledForDate.trim() : "";

        for (let i = 0; i < selectedProducts.length; i++) {
          const item = selectedProducts[i];
          const disc = parseFloat(item.discount) || 0;
          const isFirst = i === 0;
          const isLastLine = i === selectedProducts.length - 1;

          console.log("[CreateOrder] posting line", {
            index: i + 1,
            of: selectedProducts.length,
            orderId: commonOrderId,
            productId: item.productId,
            notifyCustomerEmail: isLastLine,
          });

          lastCreatedLine = await dispatch(
            createOrder({
              staffId: user.staffId!,
              orderId: commonOrderId, // Pass shared ID
              customerName: form.customerName.trim(),
              deliveryAddress: fullAddress,
              phone: form.phone.trim(),
              pincode: form.pincode.trim(),
              postOffice: form.postOffice.trim(),
              email: emailForCreateOrderApi(form.email, form.phone),
              state: form.state.trim(),
              district: form.district.trim(),
              orderType: form.orderType as OrderType,
              productId: item.productId,
              quantity: item.quantity,
              ...(disc > 0 ? { discountAmount: disc } : {}),
              ...(isFirst && addOn
                ? {
                  addOnAmount: parseFloat(addOn.amount),
                  addOnNote: addOn.note.trim(),
                }
                : {}),
              ...(selectedDeliveryMethodId
                ? { deliveryMethodId: selectedDeliveryMethodId }
                : {}),
              notes: form.notes.trim() || undefined,
              ...(scheduleOrder
                ? (isFirst ? { scheduledFor: scheduleYmd } : {})
                : { status: "pending" }),
              // One confirmation email after the whole order is created (API debounces / last line schedules).
              notifyCustomerEmail: isLastLine,
            })
          ).unwrap();
        }

        const scheduled =
          lastCreatedLine?.emailConfirmationScheduled === true;
        const outboundReady =
          lastCreatedLine?.outboundEmailReady === true;
        console.log("[CreateOrder] all lines created", {
          orderId: commonOrderId,
          lines: selectedProducts.length,
          customerEmail: form.email.trim(),
          emailConfirmationScheduled: scheduled,
          outboundEmailReady: outboundReady,
          whyNoEmail:
            scheduled && !outboundReady
              ? "API has incomplete SMTP (set SMTP_HOST, MAIL_FROM, SMTP_USER, SMTP_PASS on Railway). Queued job does nothing."
              : scheduled && outboundReady
                ? "If inbox is empty: check spam, Railway logs for [OrderEmail] FAILED, and SMTP auth (Gmail needs an App Password)."
                : undefined,
        });

        if (scheduled && !outboundReady) {
          toast.warning(
            "Order saved, but customer email was not sent — add SMTP_HOST, MAIL_FROM, SMTP_USER, and SMTP_PASS on your API (e.g. Railway).",
            { autoClose: 8000 },
          );
        }

        toast.success(`Created ${selectedProducts.length} order(s) successfully!`);
        navigate(`/orders`);
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to create order"));
      } finally {
        setSubmitting(false);
      }
    },
    [
      form,
      productRows,
      validate,
      user?.staffId,
      user?.role,
      dispatch,
      navigate,
      isAdminOrderEdit,
      addOn,
      selectedDeliveryMethodId,
      isEditMode,
      editingOrder,
      scheduledForDate,
      scheduleOrder,
    ]
  );

  const update = useCallback((field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((er) => ({ ...er, [field]: "" }));
  }, []);

  const readClipboard = useCallback(async () => {
    setPasteReading(true);
    try {
      const t = await navigator.clipboard.readText();
      setPasteText(t);
      toast.success("Loaded from clipboard");
    } catch {
      toast.error("Could not read clipboard — paste manually (⌘V / Ctrl+V)");
    } finally {
      setPasteReading(false);
    }
  }, []);

  const applyPaste = useCallback(() => {
    const raw = pasteText.trim();
    if (!raw) {
      toast.error("Paste customer details first");
      return;
    }
    const parsed = parsePastedCustomerDetails(raw);
    const entries = Object.entries(parsed).filter(
      (e): e is [keyof typeof INITIAL, string] =>
        typeof e[1] === "string" && (e[1] as string).trim().length > 0,
    );
    if (entries.length === 0) {
      toast.warning("Could not detect details — include name, phone, or address and try again");
      return;
    }
    setForm((f) => {
      const next = { ...f };
      for (const [k, v] of entries) {
        (next as Record<string, string>)[k as string] = v.trim();
      }
      return next;
    });
    setErrors((e) => {
      const next = { ...e };
      for (const [k] of entries) delete next[k as string];
      return next;
    });
    setPasteModalOpen(false);
    toast.success("Details applied — complete state, district, and post office if needed");
  }, [pasteText]);

  return (
    <div className="mx-auto max-w-3xl px-1 sm:px-2">
      <Card>
        <CardHeader
          title={isEditMode ? "Edit Order" : "Create Order"}
          action={
            isAdminOrderEdit ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="inline-flex items-center gap-1.5"
                onClick={() => navigate("/admin/orders")}
              >
                <ArrowLeftIcon className="h-4 w-4" aria-hidden />
                Back to orders
              </Button>
            ) : undefined
          }
        />
        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="rounded-xl border border-border bg-surface-alt/30 p-4 sm:p-5">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-base font-semibold text-text-heading">Customer details</h3>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="shrink-0 self-start cursor-pointer sm:self-auto"
                onClick={() => setPasteModalOpen(true)}
              >
                <LuClipboardList />
              </Button>
            </div>
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
            <div className={`relative transition-all duration-300 ${!detailsEnabled ? "opacity-50 grayscale select-none" : ""}`}>
              {!detailsEnabled && <div className="absolute inset-0 z-10 cursor-not-allowed" title="Enter 10-digit phone first" />}
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Input
                  label="Flat/House/Building Name *"
                  value={form.flatBuilding}
                  onChange={(e) => update("flatBuilding", e.target.value)}
                  error={errors.flatBuilding}
                  disabled={!detailsEnabled}
                  placeholder="Flat/House/Building Name"
                />
                <Input
                  label="Area/Sector/Locality *"
                  value={form.areaSector}
                  onChange={(e) => update("areaSector", e.target.value)}
                  error={errors.areaSector}
                  disabled={!detailsEnabled}
                  placeholder="Area/Sector/Locality"
                />
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Input
                  label="Pincode *"
                  value={form.pincode}
                  onChange={(e) => update("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                  error={errors.pincode}
                  disabled={!detailsEnabled}
                  placeholder="Pincode"
                />
                <Input
                  label="Post Office *"
                  value={form.postOffice}
                  onChange={(e) => update("postOffice", e.target.value)}
                  error={errors.postOffice}
                  disabled={!detailsEnabled}
                  placeholder="Post Office"
                />
              </div>
              <div className="mt-4">
                <Input
                  label="Email (optional)"
                  type="text"
                  inputMode="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  error={errors.email}
                  disabled={!detailsEnabled}
                  placeholder="Leave blank if not available"
                />
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Input
                  label="State *"
                  value={form.state}
                  onChange={(e) => update("state", e.target.value)}
                  error={errors.state}
                  disabled={!detailsEnabled}
                  placeholder="State"
                />
                <Input
                  label="District *"
                  value={form.district}
                  onChange={(e) => update("district", e.target.value)}
                  error={errors.district}
                  disabled={!detailsEnabled}
                  placeholder="District"
                />
              </div>
            </div>
          </section>
          <section className={`relative space-y-4 rounded-xl border border-border bg-surface-alt/30 p-4 sm:p-5 transition-all duration-300 ${!detailsEnabled ? "opacity-50 grayscale select-none" : ""}`}>
            {!detailsEnabled && <div className="absolute inset-0 z-10 cursor-not-allowed" title="Enter 10-digit phone first" />}
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
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
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
                          <button
                            type="button"
                            disabled={!detailsEnabled}
                            onClick={() => removeProductRow(row.productId)}
                            className="shrink-0 rounded-[var(--radius-md)] p-2 text-text-muted transition hover:bg-error-bg hover:text-error focus:outline-none focus:ring-2 focus:ring-error disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label={`Remove ${row.name} from order`}
                            title="Remove from order"
                          >
                            <TrashIcon className="h-4 w-4" aria-hidden />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-start md:justify-center">
                        <div className="inline-flex h-9 items-stretch overflow-hidden rounded-md border border-gray-300 bg-white shadow-sm">
                          <button
                            type="button"
                            disabled={!detailsEnabled || row.quantity <= 1}
                            onClick={() =>
                              updateProductRow(
                                row.productId,
                                "quantity",
                                Math.max(1, row.quantity - 1)
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
                        <div className="text-lg font-bold tabular-nums text-primary md:text-xl">
                          {formatRupee(subtotal)}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="mt-2 flex items-center justify-between border-t border-gray-300 px-2 pt-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xl font-bold uppercase tracking-wide text-gray-800">
                      Grand Total
                    </span>
                    {addOn && (
                      <span className="text-xs font-medium text-primary">
                        Incl. Add-on: {addOn.note} (+{formatRupee(parseFloat(addOn.amount))})
                      </span>
                    )}
                    {selectedDeliveryFee > 0 && (
                      <span className="text-xs font-medium text-teal-700">
                        Incl. delivery:{" "}
                        {deliveryOptions.find((o) => o.deliveryMethodId === selectedDeliveryMethodId)
                          ?.name ?? "—"}{" "}
                        (+{formatRupee(selectedDeliveryFee)})
                      </span>
                    )}
                  </div>
                  <span className="text-2xl font-black tabular-nums text-green-600">
                    {formatRupee(grandTotal)}
                  </span>
                </div>
              </div>
            )}
            <div className="flex justify-start">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={!detailsEnabled}
                onClick={() => {
                  setTempAddOn(addOn || { amount: "", note: "" });
                  setIsAddOnModalOpen(true);
                }}
              >
                {addOn ? "Edit Add-on" : "+ Add-on (Gift Wrap, etc.)"}
              </Button>
              {addOn && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-2 text-red-500 hover:text-red-700"
                  onClick={() => setAddOn(null)}
                >
                  Remove Add-on
                </Button>
              )}
            </div>
            {errors.products && (
              <p className="text-sm font-medium text-red-500">{errors.products}</p>
            )}
          </section>
          <section className={`relative space-y-4 rounded-[var(--radius-md)] border border-border bg-surface-alt/60 p-4 sm:p-5 transition-all duration-300 ${!detailsEnabled ? "opacity-50 grayscale select-none" : ""}`}>
            {!detailsEnabled && <div className="absolute inset-0 z-10 cursor-not-allowed" title="Enter 10-digit phone first" />}
            <Select
              label="Payment Type"
              options={orderTypeOptions}
              value={form.orderType}
              onChange={(e) => update("orderType", e.target.value)}
              placeholder="Select Payment Type "
              error={errors.orderType}
              disabled={!detailsEnabled}
            />
            {deliveryLoading && detailsEnabled ? (
              <p className="text-sm text-text-muted py-1">Loading delivery options…</p>
            ) : (
              <Select
                label="Select the courier service"
                options={deliverySelectOptions}
                value={selectedDeliveryMethodId}
                onChange={(e) => setSelectedDeliveryMethodId(e.target.value)}
                placeholder="Select the courier service"
                error={errors.deliveryMethod}
                disabled={!detailsEnabled}
              />
            )}
            <p className="text-xs text-text-muted leading-relaxed">
              {!detailsEnabled
                ? "Enter 10-digit phone above to enable order type and delivery."
                : !cartProductIdsKey
                  ? "Select products above first."
                  : form.orderType !== "prepaid" && form.orderType !== "cod"
                    ? "Choose Prepaid or COD — only matching delivery types are listed."
                    : deliveryOptions.length === 0
                      ? "No delivery options: add product fees under Admin → Delivery (set prepaid and COD amounts per carrier)."
                      : "Delivery total uses the prepaid or COD fee you configured for each product × quantity."}
            </p>
          </section>
          {scheduleAllowed && (
            <section
              className={`relative space-y-3 rounded-xl border border-border bg-surface-alt/30 p-4 sm:p-5 transition-all duration-300 ${!detailsEnabled ? "opacity-50 grayscale select-none" : ""}`}
            >
              {!detailsEnabled && (
                <div
                  className="absolute inset-0 z-10 cursor-not-allowed"
                  title="Enter 10-digit phone first"
                />
              )}
              <h3 className="text-base font-semibold text-text-heading">Schedule</h3>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary"
                  checked={scheduleOrder}
                  disabled={!detailsEnabled}
                  onChange={(ev) => {
                    const on = ev.target.checked;
                    setScheduleOrder(on);
                    if (!on) {
                      setScheduledForDate("");
                      setErrors((er) => ({ ...er, scheduledFor: "" }));
                    }
                  }}
                />

              </label>
              {scheduleOrder && (
                <Input
                  type="date"
                  label="Fulfil on *"
                  min={minScheduleDateYmd}
                  value={scheduledForDate}
                  onChange={(ev) => {
                    setScheduledForDate(ev.target.value);
                    setErrors((er) => ({ ...er, scheduledFor: "" }));
                  }}
                  error={errors.scheduledFor}
                  disabled={!detailsEnabled}
                />
              )}
            </section>
          )}
          <section className={`relative transition-all duration-300 ${!detailsEnabled ? "opacity-50 grayscale select-none" : ""}`}>
            {!detailsEnabled && <div className="absolute inset-0 z-10 cursor-not-allowed" title="Enter 10-digit phone first" />}
            <Textarea
              label="Notes (optional)"
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Customization or customer requirements"
              rows={3}
              disabled={!detailsEnabled}
            />
          </section>
          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <Button type="submit" loading={submitting} className="sm:min-w-[140px]">
              {isEditMode ? "Update Order" : "Create Order"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/orders")}
              className="sm:min-w-[120px]"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>

      <Modal
        isOpen={isAddOnModalOpen}
        onClose={() => setIsAddOnModalOpen(false)}
        title="Add-on Details"
      >
        <div className="space-y-4 pt-2">
          <Input
            label="Add-on Amount (₹) *"
            type="number"
            value={tempAddOn.amount}
            onChange={(e) => setTempAddOn({ ...tempAddOn, amount: e.target.value })}
            placeholder="0.00"
          />
          <Textarea
            label="Add-on Note (Gift Wrap, Chocolate, etc.) *"
            value={tempAddOn.note}
            onChange={(e) => setTempAddOn({ ...tempAddOn, note: e.target.value })}
            placeholder="Mandatory note for the add-on"
            rows={2}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setIsAddOnModalOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!tempAddOn.note.trim() || !tempAddOn.amount}
              onClick={() => {
                setAddOn({
                  amount: tempAddOn.amount,
                  note: tempAddOn.note.trim(),
                });
                setIsAddOnModalOpen(false);
              }}
            >
              Save Add-on
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={pasteModalOpen}
        onClose={() => setPasteModalOpen(false)}
        title="Paste customer details"
        size="xl"
      >
        <div className="space-y-4 pt-1 max-md:[&_label]:text-[14px] max-md:[&_label]:leading-snug">
          {/* <p className="text-base text-text-muted leading-relaxed md:text-sm">
            Copy the full customer message from WhatsApp (or notes), then tap{" "}
            <span className="font-medium text-text-heading">Read from clipboard</span> or paste
            here (⌘V / Ctrl+V). We try to fill name, phone, address, PIN, and email — you can edit
            anything after applying.
          </p> */}
          <div className="relative">
            <Textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={12}
              className="!text-[14px] md:!text-sm text-center"
            />
            {!pasteText && (
              <span className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-400">
                Paste the address or WhatsApp message here
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 justify-end">

            <Button className="cursor-pointer"
              type="button" onClick={applyPaste}>
              Apply to form
            </Button>
            <Button
              type="button"
              className="cursor-pointer"
              variant="secondary"
              loading={pasteReading}
              onClick={() => void readClipboard()}
            >
              Read from clipboard
            </Button>
            <Button className="cursor-pointer"
              type="button" variant="secondary" onClick={() => setPasteModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default memo(CreateOrderPage);
