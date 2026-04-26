import { createApi } from "@reduxjs/toolkit/query/react";
import { endpoints } from "../../api/endpoints";
import { normalizeStaff } from "../../lib/staffNormalize";
import type {
  AdminReviewRow,
  AppSettings,
  AssignedNumber,
  Banner,
  BlogAdminDetail,
  BlogAdminListRow,
  BlogAudience,
  Category,
  CreateOrderPayload,
  Customer,
  DeliveryMethod,
  GuestUserRow,
  Order,
  PdfSize,
  Product,
  ProductDeliveryFee,
  ProductOffer,
  RbacMatrixResponse,
  RbacRoleRow,
  Sender,
  Staff,
  StaffEarnings,
  StaffSalaryPaymentRow,
  StaffPosition,
  Subcategory,
  Vendor,
} from "../../types";
import { baseQueryWithAuth } from "./baseQueryWithAuth";
import { isIndiaPostDirectDevProxy } from "../../lib/india-post-dev-proxy";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";

function indiaPostError(
  status: number,
  message: string,
): { error: FetchBaseQueryError } {
  return { error: { status, data: { message } } };
}

export type OrderListFilters = {
  dateFrom?: string;
  dateTo?: string;
  orderId?: string;
  search?: string;
  page?: number;
  limit?: number;
  isVendorOrder?: boolean;
};

export type OrderListPayload = { items: Order[]; total: number };

export type NewProductPayload = Pick<Product, "name" | "price"> & {
  categoryId: string;
  subcategoryId?: string;
  buyingPrice?: number;
  stockQuantity?: number;
  size?: string;
  color?: string;
  description?: string;
  image?: File | File[];
  video?: File;
};

/** POST /staff body (shared with legacy slice exports). */
export interface CreateStaffPayload {
  name: string;
  username: string;
  phone: string;
  joinedDate: string;
  staffPositionId: string;
  assignedNumberId?: string | null;
  isActive?: boolean;
  payoutPerOrder?: number;
  bonusMilestones?: { orders: number; bonus: number }[];
  avatar?: string;
  upiId?: string;
}

export interface UpdateStaffPayload {
  name?: string;
  phone?: string;
  joinedDate?: string;
  isActive?: boolean;
  staffPositionId?: string | null;
  assignedNumberId?: string | null;
  payoutPerOrder?: number;
  bonusMilestones?: { orders: number; bonus: number }[];
  avatar?: string;
  upiId?: string | null;
  extraPermissionSlugs?: string[];
}

type SenderPayload = Omit<Sender, "id" | "createdAt" | "updatedAt">;

function ordersQueryParams(filters: OrderListFilters | undefined): string {
  const params = new URLSearchParams();
  if (filters?.dateFrom) params.append("dateFrom", filters.dateFrom);
  if (filters?.dateTo) params.append("dateTo", filters.dateTo);
  if (filters?.orderId?.trim())
    params.append("orderId", filters.orderId.trim());
  if (filters?.search?.trim())
    params.append("search", filters.search.trim());
  if (filters?.isVendorOrder != null)
    params.append("isVendorOrder", String(filters.isVendorOrder));
  const narrowed = !!(
    filters?.dateFrom ||
    filters?.dateTo ||
    filters?.orderId?.trim() ||
    filters?.search?.trim()
  );
  if (!narrowed && filters?.page != null) {
    params.append("page", String(filters.page));
    params.append("limit", String(filters.limit ?? 50));
  }
  return params.toString();
}

export const edenApi = createApi({
  reducerPath: "edenApi",
  baseQuery: baseQueryWithAuth,
  /** No automatic refetch on window focus/reconnect — avoids surprise API traffic on management pages. */
  refetchOnFocus: false,
  refetchOnReconnect: false,
  tagTypes: [
    "Product",
    "Category",
    "Order",
    "Staff",
    "StaffMe",
    "Customer",
    "Sender",
    "Settings",
    "StaffPosition",
    "AssignedNumber",
    "DeliveryMethod",
    "ProductDeliveryFee",
    "Banner",
    "Subcategory",
    "Offer",
    "Review",
    "Blog",
    "RBAC",
    "GuestUser",
    "Salary",
    "Vendor",
    "VendorPortalProduct",
    "VendorPortalOrder",
  ],
  endpoints: (builder) => ({
    getProducts: builder.query<Product[], void>({
      query: () => endpoints.products,
      providesTags: (r) =>
        r
          ? [
              { type: "Product" as const, id: "LIST" },
              ...r.map((p) => ({ type: "Product" as const, id: p.id })),
            ]
          : [{ type: "Product", id: "LIST" }],
    }),
    createProduct: builder.mutation<Product, NewProductPayload>({
      query: (body) => {
        const fd = new FormData();
        fd.append("name", body.name);
        fd.append("categoryId", body.categoryId);
        if (body.subcategoryId) fd.append("subcategoryId", body.subcategoryId);
        fd.append("price", String(body.price));
        if (body.description != null && body.description !== "") {
          fd.append("description", body.description);
        }
        if (body.buyingPrice != null && body.buyingPrice !== undefined) {
          fd.append("buyingPrice", String(body.buyingPrice));
        }
        if (body.stockQuantity != null && body.stockQuantity !== undefined) {
          fd.append("stockQuantity", String(body.stockQuantity));
        }
        if (body.size) fd.append("size", body.size);
        if (body.color) fd.append("color", body.color);
        if (body.image) {
          if (Array.isArray(body.image)) {
            body.image.forEach((f) => fd.append("image", f));
          } else {
            fd.append("image", body.image);
          }
        }
        if (body.video) fd.append("video", body.video);
        return {
          url: endpoints.products,
          method: "POST",
          body: fd,
        };
      },
      invalidatesTags: [{ type: "Product", id: "LIST" }],
    }),
    updateProduct: builder.mutation<
      Product,
      { id: string; patch: Partial<Product> & { image?: File | File[]; video?: File } }
    >({
      query: ({ id, patch }) => {
        const fd = new FormData();
        Object.entries(patch).forEach(([key, val]) => {
          if (val === undefined || key === "image" || key === "video") return;
          fd.append(key, val === null ? "" : String(val));
        });
        if (patch.image) {
          if (Array.isArray(patch.image)) {
            patch.image.forEach((f) => fd.append("image", f));
          } else {
            fd.append("image", patch.image);
          }
        }
        if (patch.video) fd.append("video", patch.video);
        return {
          url: endpoints.productById(id),
          method: "PUT",
          body: fd,
        };
      },
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Product", id },
        { type: "Product", id: "LIST" },
      ],
    }),
    deleteProduct: builder.mutation<void, string>({
      query: (id) => ({
        url: endpoints.productById(id),
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Product", id },
        { type: "Product", id: "LIST" },
      ],
    }),

    getCategories: builder.query<Category[], void>({
      query: () => endpoints.categories,
      providesTags: (r) =>
        r
          ? [
              { type: "Category", id: "LIST" },
              ...r.map((c) => ({ type: "Category" as const, id: c.id })),
            ]
          : [{ type: "Category", id: "LIST" }],
    }),
    createCategory: builder.mutation<
      Category,
      Pick<Category, "name"> & { description?: string; image?: File }
    >({
      query: (body) => {
        const fd = new FormData();
        fd.append("name", body.name);
        if (body.description) fd.append("description", body.description);
        if (body.image) fd.append("image", body.image);
        return {
          url: endpoints.categories,
          method: "POST",
          body: fd,
        };
      },
      invalidatesTags: [{ type: "Category", id: "LIST" }],
    }),
    updateCategory: builder.mutation<
      Category,
      {
        id: string;
        patch: Partial<Pick<Category, "name" | "description" | "imageUrl">> & {
          image?: File | null;
        };
      }
    >({
      query: ({ id, patch }) => {
        const fd = new FormData();
        Object.entries(patch).forEach(([key, val]) => {
          if (val === undefined || key === "image") return;
          fd.append(key, val === null ? "" : String(val));
        });
        if (patch.image) fd.append("image", patch.image);
        return {
          url: endpoints.categoryById(id),
          method: "PUT",
          body: fd,
        };
      },
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Category", id },
        { type: "Category", id: "LIST" },
      ],
    }),
    deleteCategory: builder.mutation<void, string>({
      query: (id) => ({
        url: endpoints.categoryById(id),
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Category", id },
        { type: "Category", id: "LIST" },
      ],
    }),
    getSubcategories: builder.query<Subcategory[], void>({
      query: () => endpoints.subcategories,
      providesTags: (r) =>
        r
          ? [
              { type: "Subcategory", id: "LIST" },
              ...r.map((s) => ({ type: "Subcategory" as const, id: s.id })),
            ]
          : [{ type: "Subcategory", id: "LIST" }],
    }),
    createSubcategory: builder.mutation<
      Subcategory,
      Pick<Subcategory, "name" | "categoryId"> & { description?: string }
    >({
      query: (body) => ({
        url: endpoints.subcategories,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Subcategory", id: "LIST" }],
    }),
    updateSubcategory: builder.mutation<
      Subcategory,
      {
        id: string;
        patch: Partial<Pick<Subcategory, "name" | "description" | "categoryId">>;
      }
    >({
      query: ({ id, patch }) => ({
        url: endpoints.subcategoryById(id),
        method: "PATCH",
        body: patch,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Subcategory", id },
        { type: "Subcategory", id: "LIST" },
      ],
    }),
    deleteSubcategory: builder.mutation<void, string>({
      query: (id) => ({
        url: endpoints.subcategoryById(id),
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Subcategory", id },
        { type: "Subcategory", id: "LIST" },
      ],
    }),
    getBanners: builder.query<Banner[], void>({
      query: () => endpoints.banners,
      providesTags: (r) =>
        r
          ? [
              { type: "Banner", id: "LIST" },
              ...r.map((b) => ({ type: "Banner" as const, id: b.id })),
            ]
          : [{ type: "Banner", id: "LIST" }],
    }),
    createBanner: builder.mutation<
      Banner,
      Pick<Banner, "title" | "description" | "linkUrl" | "order" | "isActive"> & {
        image: File;
      }
    >({
      query: (body) => {
        const fd = new FormData();
        fd.append("title", body.title);
        if (body.description) fd.append("description", body.description);
        if (body.linkUrl) fd.append("linkUrl", body.linkUrl);
        fd.append("order", String(body.order));
        fd.append("isActive", String(body.isActive));
        fd.append("image", body.image);
        return {
          url: endpoints.banners,
          method: "POST",
          body: fd,
        };
      },
      invalidatesTags: [{ type: "Banner", id: "LIST" }],
    }),
    updateBanner: builder.mutation<
      Banner,
      {
        id: string;
        patch: Partial<Banner> & { image?: File | null };
      }
    >({
      query: ({ id, patch }) => {
        const fd = new FormData();
        Object.entries(patch).forEach(([key, val]) => {
          if (val === undefined || key === "image") return;
          fd.append(key, val === null ? "" : String(val));
        });
        if (patch.image) fd.append("image", patch.image);
        return {
          url: endpoints.bannerById(id),
          method: "PUT",
          body: fd,
        };
      },
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Banner", id },
        { type: "Banner", id: "LIST" },
      ],
    }),
    deleteBanner: builder.mutation<void, string>({
      query: (id) => ({
        url: endpoints.bannerById(id),
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Banner", id },
        { type: "Banner", id: "LIST" },
      ],
    }),

    getOrders: builder.query<OrderListPayload, OrderListFilters | undefined>({
      query: (filters) => {
        const qs = ordersQueryParams(filters);
        const path = qs ? `${endpoints.orders}?${qs}` : endpoints.orders;
        return path;
      },
      transformResponse: (data: OrderListPayload | Order[]) => {
        if (Array.isArray(data)) {
          return { items: data, total: data.length };
        }
        return data;
      },
      providesTags: (r) =>
        r?.items?.length
          ? [
              { type: "Order" as const, id: "LIST" },
              ...r.items.map((o) => ({ type: "Order" as const, id: o.id })),
            ]
          : [{ type: "Order", id: "LIST" }],
    }),
    createOrder: builder.mutation<Order, CreateOrderPayload>({
      query: (body) => ({
        url: endpoints.orders,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Order", id: "LIST" }],
    }),
    updateOrder: builder.mutation<
      Order,
      { id: string; patch: Partial<Order> }
    >({
      query: ({ id, patch }) => ({
        url: endpoints.orderById(id),
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Order", id },
        { type: "Order", id: "LIST" },
      ],
    }),
    bulkUpdateOrderStatus: builder.mutation<
      {
        updated: number;
        failed: number;
        errors: { id: string; message: string }[];
      },
      { ids: string[]; status: Order["status"] }
    >({
      query: (body) => ({
        url: endpoints.ordersBulkUpdateStatus,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "Order", id: "LIST" },
        ...arg.ids.map((id) => ({ type: "Order" as const, id })),
      ],
    }),
    bulkUpdateTracking: builder.mutation<
      {
        updated: number;
        failed: number;
        errors: { id: string; message: string }[];
      },
      { items: { id: string; trackingId: string }[] }
    >({
      query: (body) => ({
        url: endpoints.ordersBulkUpdateTracking,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "Order", id: "LIST" },
        ...arg.items.map((it) => ({ type: "Order" as const, id: it.id })),
      ],
    }),
    deleteOrder: builder.mutation<void, string>({
      query: (id) => ({
        url: endpoints.orderById(id),
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Order", id },
        { type: "Order", id: "LIST" },
      ],
    }),

    getStaff: builder.query<Staff[], void>({
      query: () => endpoints.staff,
      transformResponse: (rows: Staff[]) => rows.map(normalizeStaff),
      providesTags: (r) =>
        r
          ? [
              { type: "Staff", id: "LIST" },
              ...r.map((s) => ({ type: "Staff" as const, id: s.id })),
            ]
          : [{ type: "Staff", id: "LIST" }],
    }),
    getStaffMe: builder.query<Staff, void>({
      query: () => endpoints.staffMe,
      extraOptions: { silent: true },
      transformResponse: (row: Staff) => normalizeStaff(row),
      providesTags: [{ type: "StaffMe", id: "ME" }],
    }),
    createStaff: builder.mutation<Staff, CreateStaffPayload>({
      query: (body) => ({
        url: endpoints.staff,
        method: "POST",
        body,
      }),
      transformResponse: (row: Staff) => normalizeStaff(row),
      invalidatesTags: [{ type: "Staff", id: "LIST" }],
    }),
    updateStaff: builder.mutation<
      Staff,
      { id: string; patch: UpdateStaffPayload }
    >({
      query: ({ id, patch }) => ({
        url: endpoints.staffById(id),
        method: "PUT",
        body: patch,
      }),
      transformResponse: (row: Staff) => normalizeStaff(row),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Staff", id },
        { type: "Staff", id: "LIST" },
        { type: "StaffMe", id: "ME" },
      ],
    }),
    deleteStaff: builder.mutation<void, string>({
      query: (id) => ({
        url: endpoints.staffById(id),
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Staff", id },
        { type: "Staff", id: "LIST" },
      ],
    }),
    resetStaffPassword: builder.mutation<Staff, string>({
      query: (id) => ({
        url: endpoints.staffResetPassword(id),
        method: "POST",
        body: {},
      }),
      transformResponse: (row: Staff) => normalizeStaff(row),
      invalidatesTags: (_r, _e, id) => [
        { type: "Staff", id },
        { type: "Staff", id: "LIST" },
        { type: "StaffMe", id: "ME" },
      ],
    }),
    requestMyPasswordReset: builder.mutation<{ ok: true }, void>({
      query: () => ({
        url: endpoints.staffRequestPasswordReset,
        method: "POST",
        body: {},
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          void dispatch(
            edenApi.endpoints.getStaffMe.initiate(undefined, {
              forceRefetch: true,
            }),
          );
        } catch {
          /* error handled by mutation */
        }
      },
      invalidatesTags: [{ type: "StaffMe", id: "ME" }],
    }),
    fulfillPasswordResetRequest: builder.mutation<Staff, string>({
      query: (requestId) => ({
        url: endpoints.staffPasswordResetRequestFulfill(requestId),
        method: "POST",
        body: {},
      }),
      transformResponse: (row: Staff & { requestId?: string }) => {
        const { requestId: _r, ...rest } = row;
        return normalizeStaff(rest as Staff);
      },
      invalidatesTags: (_r, _e, _id) => [
        { type: "Staff", id: "LIST" },
        { type: "StaffMe", id: "ME" },
      ],
    }),

    getCustomers: builder.query<Customer[], void>({
      query: () => endpoints.customers,
      providesTags: [{ type: "Customer", id: "LIST" }],
    }),
    bulkImportCustomers: builder.mutation<{ imported: number, errors: string[] }, any[]>({
      query: (customers) => ({
        url: endpoints.customersBulkImport,
        method: "POST",
        body: { customers },
      }),
      invalidatesTags: [{ type: "Customer", id: "LIST" }],
    }),

    getSenders: builder.query<Sender[], void>({
      query: () => endpoints.senders,
      providesTags: (r) =>
        r
          ? [
              { type: "Sender", id: "LIST" },
              ...r.map((s) => ({ type: "Sender" as const, id: s.id })),
            ]
          : [{ type: "Sender", id: "LIST" }],
    }),
    createSender: builder.mutation<Sender, SenderPayload>({
      query: (body) => ({
        url: endpoints.senders,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Sender", id: "LIST" }],
    }),
    updateSender: builder.mutation<
      Sender,
      { id: string; patch: Partial<SenderPayload> }
    >({
      query: ({ id, patch }) => ({
        url: endpoints.senderById(id),
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Sender", id },
        { type: "Sender", id: "LIST" },
      ],
    }),
    setDefaultSender: builder.mutation<Sender, string>({
      query: (id) => ({
        url: endpoints.senderSetDefault(id),
        method: "PUT",
        body: {},
      }),
      invalidatesTags: [{ type: "Sender", id: "LIST" }],
    }),
    deleteSender: builder.mutation<void, string>({
      query: (id) => ({
        url: endpoints.senderById(id),
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Sender", id },
        { type: "Sender", id: "LIST" },
      ],
    }),

    getSettings: builder.query<AppSettings, void>({
      query: () => endpoints.settings,
      providesTags: [{ type: "Settings", id: "APP" }],
    }),
    updateSettings: builder.mutation<
      AppSettings,
      {
        defaultPdfSize?: PdfSize;
        defaultSenderId?: string;
        lowStockThreshold?: number;
      }
    >({
      query: (patch) => ({
        url: endpoints.settings,
        method: "PATCH",
        body: patch,
      }),
      invalidatesTags: [{ type: "Settings", id: "APP" }],
    }),

    getStaffPositions: builder.query<StaffPosition[], void>({
      query: () => endpoints.staffPositions,
      providesTags: (r) =>
        r
          ? [
              { type: "StaffPosition", id: "LIST" },
              ...r.map((p) => ({ type: "StaffPosition" as const, id: p.id })),
            ]
          : [{ type: "StaffPosition", id: "LIST" }],
    }),
    createStaffPosition: builder.mutation<StaffPosition, { name: string }>({
      query: (body) => ({
        url: endpoints.staffPositions,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "StaffPosition", id: "LIST" }],
    }),
    updateStaffPosition: builder.mutation<
      StaffPosition,
      { id: string; name: string }
    >({
      query: ({ id, name }) => ({
        url: endpoints.staffPositionById(id),
        method: "PUT",
        body: { name },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "StaffPosition", id },
        { type: "StaffPosition", id: "LIST" },
      ],
    }),
    deleteStaffPosition: builder.mutation<void, string>({
      query: (id) => ({
        url: endpoints.staffPositionById(id),
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "StaffPosition", id },
        { type: "StaffPosition", id: "LIST" },
      ],
    }),

    getAssignedNumbers: builder.query<AssignedNumber[], void>({
      query: () => endpoints.assignedNumbers,
      providesTags: (r) =>
        r
          ? [
              { type: "AssignedNumber", id: "LIST" },
              ...r.map((n) => ({ type: "AssignedNumber" as const, id: n.id })),
            ]
          : [{ type: "AssignedNumber", id: "LIST" }],
    }),
    createAssignedNumber: builder.mutation<
      AssignedNumber,
      { number: string }
    >({
      query: (body) => ({
        url: endpoints.assignedNumbers,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "AssignedNumber", id: "LIST" }],
    }),
    updateAssignedNumber: builder.mutation<
      AssignedNumber,
      { id: string; number: string }
    >({
      query: ({ id, number }) => ({
        url: endpoints.assignedNumberById(id),
        method: "PUT",
        body: { number },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "AssignedNumber", id },
        { type: "AssignedNumber", id: "LIST" },
      ],
    }),
    deleteAssignedNumber: builder.mutation<void, string>({
      query: (id) => ({
        url: endpoints.assignedNumberById(id),
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "AssignedNumber", id },
        { type: "AssignedNumber", id: "LIST" },
      ],
    }),

    getDeliveryMethods: builder.query<DeliveryMethod[], void>({
      query: () => endpoints.deliveryMethods,
      providesTags: (r) =>
        r
          ? [
              { type: "DeliveryMethod", id: "LIST" },
              ...r.map((m) => ({ type: "DeliveryMethod" as const, id: m.id })),
            ]
          : [{ type: "DeliveryMethod", id: "LIST" }],
    }),
    createDeliveryMethod: builder.mutation<
      DeliveryMethod,
      { name: string; description?: string; sortOrder?: number }
    >({
      query: (body) => ({
        url: endpoints.deliveryMethods,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "DeliveryMethod", id: "LIST" }],
    }),
    updateDeliveryMethod: builder.mutation<
      DeliveryMethod,
      {
        id: string;
        patch: Partial<
          Pick<DeliveryMethod, "name" | "description" | "sortOrder">
        >;
      }
    >({
      query: ({ id, patch }) => ({
        url: endpoints.deliveryMethodById(id),
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "DeliveryMethod", id },
        { type: "DeliveryMethod", id: "LIST" },
      ],
    }),
    deleteDeliveryMethod: builder.mutation<void, string>({
      query: (id) => ({
        url: endpoints.deliveryMethodById(id),
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "DeliveryMethod", id },
        { type: "DeliveryMethod", id: "LIST" },
      ],
    }),

    getProductDeliveryFees: builder.query<ProductDeliveryFee[], void>({
      query: () => endpoints.productDeliveryFees,
      providesTags: (r) =>
        r
          ? [
              { type: "ProductDeliveryFee", id: "LIST" },
              ...r.map((f) => ({ type: "ProductDeliveryFee" as const, id: f.id })),
            ]
          : [{ type: "ProductDeliveryFee", id: "LIST" }],
    }),

    getProductOffers: builder.query<ProductOffer[], string | undefined>({
      query: (productId) =>
        productId ? `${endpoints.productOffers}?productId=${productId}` : endpoints.productOffers,
      providesTags: (r) =>
        r
          ? [
              { type: "Offer" as const, id: "LIST" },
              ...r.map((o) => ({ type: "Offer" as const, id: o.id })),
            ]
          : [{ type: "Offer", id: "LIST" }],
    }),
    createProductOffer: builder.mutation<
      ProductOffer,
      Partial<ProductOffer> & Pick<ProductOffer, "productId" | "title">
    >({
      query: (body) => ({
        url: endpoints.productOffers,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Offer", id: "LIST" }],
    }),
    updateProductOffer: builder.mutation<
      ProductOffer,
      { id: string; patch: Partial<ProductOffer> }
    >({
      query: ({ id, patch }) => ({
        url: endpoints.productOfferById(id),
        method: "PATCH",
        body: patch,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Offer", id },
        { type: "Offer", id: "LIST" },
      ],
    }),
    deleteProductOffer: builder.mutation<void, string>({
      query: (id) => ({
        url: endpoints.productOfferById(id),
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Offer", id },
        { type: "Offer", id: "LIST" },
      ],
    }),
    getAdminReviews: builder.query<AdminReviewRow[], void>({
      query: () => endpoints.adminReviews,
      providesTags: (r) =>
        r
          ? [
              { type: "Review", id: "LIST" },
              ...r.map((row) => ({ type: "Review" as const, id: row.id })),
            ]
          : [{ type: "Review", id: "LIST" }],
    }),
    deleteAdminReview: builder.mutation<void, string>({
      query: (id) => ({
        url: endpoints.adminReviewById(id),
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Review", id: "LIST" },
        { type: "Review", id },
      ],
    }),
    getBlogAdminPosts: builder.query<BlogAdminListRow[], void>({
      query: () => endpoints.blogAdmin,
      providesTags: (r) =>
        r
          ? [
              { type: "Blog", id: "LIST" },
              ...r.map((row) => ({ type: "Blog" as const, id: row.id })),
            ]
          : [{ type: "Blog", id: "LIST" }],
    }),
    getBlogAdminPostById: builder.query<BlogAdminDetail, string>({
      query: (id) => endpoints.blogAdminById(id),
      providesTags: (_r, _e, id) => [{ type: "Blog", id }],
    }),
    createBlogAdminPost: builder.mutation<
      BlogAdminDetail,
      {
        title: string;
        bodyHtml: string;
        published: boolean;
        audience: BlogAudience;
      }
    >({
      query: (body) => ({
        url: endpoints.blogAdmin,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Blog", id: "LIST" }],
    }),
    updateBlogAdminPost: builder.mutation<
      BlogAdminDetail,
      {
        id: string;
        patch: {
          title: string;
          bodyHtml: string;
          published: boolean;
          audience: BlogAudience;
        };
      }
    >({
      query: ({ id, patch }) => ({
        url: endpoints.blogAdminById(id),
        method: "PATCH",
        body: patch,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Blog", id: "LIST" },
        { type: "Blog", id },
      ],
    }),
    deleteBlogAdminPost: builder.mutation<void, string>({
      query: (id) => ({
        url: endpoints.blogAdminById(id),
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Blog", id: "LIST" },
        { type: "Blog", id },
      ],
    }),
    changePassword: builder.mutation<void, { currentPassword: string; newPassword: string }>({
      query: (body) => ({
        url: endpoints.authChangePassword,
        method: "POST",
        body,
      }),
    }),
    getStaffEarnings: builder.query<
      StaffEarnings[],
      { dateFrom?: string; dateTo?: string } | void
    >({
      query: (arg) => {
        const params = new URLSearchParams();
        if (arg?.dateFrom) params.set("dateFrom", arg.dateFrom);
        if (arg?.dateTo) params.set("dateTo", arg.dateTo);
        const qs = params.toString();
        return qs ? `${endpoints.staffEarnings}?${qs}` : endpoints.staffEarnings;
      },
      providesTags: [{ type: "Salary", id: "EARNINGS" }],
    }),
    getStaffSalaryPayments: builder.query<
      StaffSalaryPaymentRow[],
      { dateFrom?: string; dateTo?: string; staffProfileId?: string } | void
    >({
      query: (arg) => {
        const params = new URLSearchParams();
        if (arg?.dateFrom) params.set("dateFrom", arg.dateFrom);
        if (arg?.dateTo) params.set("dateTo", arg.dateTo);
        if (arg?.staffProfileId) params.set("staffProfileId", arg.staffProfileId);
        const qs = params.toString();
        return qs ? `${endpoints.staffSalaryPayments}?${qs}` : endpoints.staffSalaryPayments;
      },
      providesTags: [{ type: "Salary", id: "PAYMENTS" }],
    }),
    createStaffSalaryPayment: builder.mutation<
      void,
      { staffProfileId: string; dateFrom: string; dateTo: string }
    >({
      query: (body) => ({
        url: endpoints.staffSalaryPayments,
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "Salary", id: "EARNINGS" },
        { type: "Salary", id: "PAYMENTS" },
      ],
    }),
    getRbacRoles: builder.query<RbacRoleRow[], void>({
      query: () => endpoints.rbacRoles,
      providesTags: [{ type: "RBAC", id: "ROLES" }],
    }),
    getRbacMatrix: builder.query<RbacMatrixResponse, void>({
      query: () => endpoints.rbacMatrix,
      providesTags: [{ type: "RBAC", id: "MATRIX" }],
    }),
    updateRbacRolePermissions: builder.mutation<
      void,
      { roleId: string; permissionSlugs: string[] }
    >({
      query: ({ roleId, permissionSlugs }) => ({
        url: endpoints.rbacRolePermissions(roleId),
        method: "PUT",
        body: { permissionSlugs },
      }),
      invalidatesTags: [{ type: "RBAC", id: "ROLES" }],
    }),
    getRbacGuestUsers: builder.query<GuestUserRow[], void>({
      query: () => endpoints.rbacGuestUsers,
      providesTags: (r) =>
        r
          ? [
              { type: "GuestUser", id: "LIST" },
              ...r.map((u) => ({ type: "GuestUser" as const, id: u.id })),
            ]
          : [{ type: "GuestUser", id: "LIST" }],
    }),
    createRbacGuestUser: builder.mutation<
      { id: string; username: string; name: string; temporaryPassword: string },
      { username: string; name: string; password?: string }
    >({
      query: (body) => ({
        url: endpoints.rbacGuestUsers,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "GuestUser", id: "LIST" }],
    }),
    updateRbacGuestUser: builder.mutation<
      void,
      { id: string; name: string; isActive: boolean }
    >({
      query: ({ id, ...body }) => ({
        url: endpoints.rbacGuestUserById(id),
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "GuestUser", id: "LIST" },
        { type: "GuestUser", id },
      ],
    }),
    resetRbacGuestUserPassword: builder.mutation<
      { temporaryPassword: string },
      { id: string; newPassword: string }
    >({
      query: ({ id, newPassword }) => ({
        url: endpoints.rbacGuestUserResetPassword(id),
        method: "POST",
        body: { newPassword },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "GuestUser", id: "LIST" },
        { type: "GuestUser", id },
      ],
    }),
    deleteRbacGuestUser: builder.mutation<void, string>({
      query: (id) => ({
        url: endpoints.rbacGuestUserById(id),
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "GuestUser", id: "LIST" },
        { type: "GuestUser", id },
      ],
    }),
    createProductDeliveryFee: builder.mutation<
      ProductDeliveryFee,
      {
        productId: string;
        deliveryMethodId: string;
        feePrepaid: number;
        feeCod: number;
      }
    >({
      query: (body) => ({
        url: endpoints.productDeliveryFees,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "ProductDeliveryFee", id: "LIST" }],
    }),
    updateProductDeliveryFee: builder.mutation<
      ProductDeliveryFee,
      {
        id: string;
        patch: Partial<{
          productId: string;
          deliveryMethodId: string;
          feePrepaid: number;
          feeCod: number;
        }>;
      }
    >({
      query: ({ id, patch }) => ({
        url: endpoints.productDeliveryFeeById(id),
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "ProductDeliveryFee", id },
        { type: "ProductDeliveryFee", id: "LIST" },
      ],
    }),
    deleteProductDeliveryFee: builder.mutation<void, string>({
      query: (id) => ({
        url: endpoints.productDeliveryFeeById(id),
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "ProductDeliveryFee", id },
        { type: "ProductDeliveryFee", id: "LIST" },
      ],
    }),

    indiaPostLoginTest: builder.mutation<
      unknown,
      { username?: string; password?: string } | void
    >({
      async queryFn(arg, _api, _extraOptions, fetchWithBQ) {
        if (!isIndiaPostDirectDevProxy()) {
          const body = arg && typeof arg === "object" ? arg : {};
          return fetchWithBQ({
            url: endpoints.indiaPostLoginTest,
            method: "POST",
            body,
          });
        }
        let username: string | undefined;
        let password: string | undefined;
        if (arg && typeof arg === "object") {
          username = arg.username?.trim() || undefined;
          password = arg.password || undefined;
        }
        if (!username || !password) {
          username = import.meta.env.VITE_INDIA_POST_USERNAME?.trim();
          password = import.meta.env.VITE_INDIA_POST_PASSWORD?.trim();
        }
        if (!username || !password) {
          return indiaPostError(
            400,
            "Local Vite → CEPT proxy: enter India Post username and password, or set VITE_INDIA_POST_USERNAME and VITE_INDIA_POST_PASSWORD in the admin .env (API .env is not used for this path).",
          );
        }
        const res = await fetch(endpoints.indiaPostLoginTest, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ username, password }),
        });
        const text = await res.text();
        let parsed: unknown;
        try {
          parsed = text ? JSON.parse(text) : null;
        } catch {
          parsed = { raw: text };
        }
        if (!res.ok) {
          const o = parsed as { message?: unknown };
          const msg =
            typeof o?.message === "string" ? o.message : `HTTP ${String(res.status)}`;
          return indiaPostError(res.status, msg);
        }
        const root = parsed as { success?: boolean; message?: string };
        if (root && root.success === false) {
          return indiaPostError(
            400,
            typeof root.message === "string" && root.message
              ? root.message
              : "India Post login failed",
          );
        }
        return { data: parsed };
      },
    }),
    indiaPostBulkTracking: builder.mutation<
      unknown,
      { bulk: string[]; accessToken?: string | null }
    >({
      async queryFn(arg, _api, _extraOptions, fetchWithBQ) {
        if (!isIndiaPostDirectDevProxy()) {
          return fetchWithBQ({
            url: endpoints.indiaPostTrackingBulk,
            method: "POST",
            body: { bulk: arg.bulk },
          });
        }
        const token = arg.accessToken?.trim();
        if (!token) {
          return indiaPostError(
            400,
            "Run Test connection first so we have an India Post access token (direct Vite → CEPT mode).",
          );
        }
        const res = await fetch(endpoints.indiaPostTrackingBulk, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ bulk: arg.bulk }),
        });
        const text = await res.text();
        let parsed: unknown;
        try {
          parsed = text ? JSON.parse(text) : null;
        } catch {
          parsed = { raw: text };
        }
        if (!res.ok) {
          const o = parsed as { message?: unknown };
          const msg =
            typeof o?.message === "string" ? o.message : `HTTP ${String(res.status)}`;
          return indiaPostError(res.status, msg);
        }
        return { data: parsed };
      },
    }),
 
    getVendors: builder.query<Vendor[], void>({
      query: () => endpoints.adminVendors,
      providesTags: (r) =>
        r
          ? [
              { type: "Vendor" as const, id: "LIST" },
              ...r.map((v) => ({ type: "Vendor" as const, id: v.id })),
            ]
          : [{ type: "Vendor", id: "LIST" }],
    }),
    approveVendor: builder.mutation<Vendor, { id: string; password?: string }>({
      query: ({ id, password }) => ({
        url: endpoints.adminVendorApprove(id),
        method: "PUT",
        body: { password },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Vendor", id },
        { type: "Vendor", id: "LIST" },
      ],
    }),
    rejectVendor: builder.mutation<Vendor, { id: string; reason: string }>({
      query: ({ id, reason }) => ({
        url: endpoints.adminVendorReject(id),
        method: "PUT",
        body: { reason },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Vendor", id },
        { type: "Vendor", id: "LIST" },
      ],
    }),
    toggleVendorStatus: builder.mutation<Vendor, string>({
      query: (id) => ({
        url: endpoints.adminVendorToggleStatus(id),
        method: "PUT",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Vendor", id },
        { type: "Vendor", id: "LIST" },
      ],
    }),
    resetVendorPassword: builder.mutation<Vendor, { id: string; password?: string }>({
      query: ({ id, password }) => ({
        url: endpoints.adminVendorResetPassword(id),
        method: "PUT",
        body: { password },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Vendor", id },
        { type: "Vendor", id: "LIST" },
      ],
    }),

    getVendorPortalProducts: builder.query<Product[], { search?: string; categoryId?: string } | void>({
      query: (params) => ({
        url: endpoints.vendorPortalProducts,
        params: params || undefined,
      }),
      providesTags: (r) =>
        r
          ? [
              { type: "VendorPortalProduct" as const, id: "LIST" },
              { type: "Product" as const, id: "LIST" },
              ...r.map((p) => ({ type: "VendorPortalProduct" as const, id: p.id })),
            ]
          : [{ type: "VendorPortalProduct", id: "LIST" }],
    }),
    createVendorPortalProduct: builder.mutation<Product, Partial<Product> & { image?: File | File[]; video?: File }>({
      query: (body) => {
        const fd = new FormData();
        Object.entries(body).forEach(([key, val]) => {
          if (val === undefined || key === "image" || key === "video") return;
          fd.append(key, val === null ? "" : String(val));
        });
        if (body.image) {
          if (Array.isArray(body.image)) {
            body.image.forEach((f) => fd.append("image", f));
          } else {
            fd.append("image", body.image);
          }
        }
        if (body.video) fd.append("video", body.video);
        return {
          url: endpoints.vendorPortalProducts,
          method: "POST",
          body: fd,
        };
      },
      invalidatesTags: [
        { type: "VendorPortalProduct", id: "LIST" },
        { type: "Product", id: "LIST" },
      ],
    }),
    updateVendorPortalProduct: builder.mutation<
      Product,
      { id: string; patch: Partial<Product> & { image?: File | File[]; video?: File } }
    >({
      query: ({ id, patch }) => {
        const fd = new FormData();
        Object.entries(patch).forEach(([key, val]) => {
          if (val === undefined || key === "image" || key === "video") return;
          fd.append(key, val === null ? "" : String(val));
        });
        if (patch.image) {
          if (Array.isArray(patch.image)) {
            patch.image.forEach((f) => fd.append("image", f));
          } else {
            fd.append("image", patch.image);
          }
        }
        if (patch.video) fd.append("video", patch.video);
        return {
          url: endpoints.vendorPortalProductById(id),
          method: "PUT",
          body: fd,
        };
      },
      invalidatesTags: (_r, _e, { id }) => [
        { type: "VendorPortalProduct", id },
        { type: "VendorPortalProduct", id: "LIST" },
        { type: "Product", id },
        { type: "Product", id: "LIST" },
      ],
    }),
    deleteVendorPortalProduct: builder.mutation<void, string>({
      query: (id) => ({
        url: endpoints.vendorPortalProductById(id),
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "VendorPortalProduct", id },
        { type: "VendorPortalProduct", id: "LIST" },
        { type: "Product", id },
        { type: "Product", id: "LIST" },
      ],
    }),

    getVendorPortalOrders: builder.query<Order[], { 
      search?: string, 
      status?: string,
      dateFrom?: string,
      dateTo?: string,
      type?: string,
      productId?: string,
    } | void>({
      query: (params) => ({
        url: endpoints.vendorPortalOrders,
        params: params || undefined,
      }),
      providesTags: (r) =>
        r
          ? [
              { type: "VendorPortalOrder" as const, id: "LIST" },
              { type: "Order" as const, id: "LIST" },
              ...r.map((o) => ({ type: "VendorPortalOrder" as const, id: o.id })),
            ]
          : [{ type: "VendorPortalOrder", id: "LIST" }],
    }),
    updateVendorPortalOrderStatus: builder.mutation<
      Order,
      { id: string; status?: Order["status"]; trackingId?: string }
    >({
      query: ({ id, ...body }) => ({
        url: endpoints.vendorPortalOrderUpdateStatus(id),
        method: "PUT",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "VendorPortalOrder", id },
        { type: "VendorPortalOrder", id: "LIST" },
        { type: "Order", id },
        { type: "Order", id: "LIST" },
      ],
    }),

    getVendorPortalCategories: builder.query<Category[], void>({
      query: () => endpoints.vendorPortalCategories,
      providesTags: [{ type: "Category", id: "LIST" }],
    }),
    createVendorPortalCategory: builder.mutation<Category, FormData>({
      query: (body) => ({
        url: endpoints.vendorPortalCategories,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Category", id: "LIST" }],
    }),
    createVendorPortalSubcategory: builder.mutation<
      Subcategory,
      { name: string; categoryId: string; description?: string }
    >({
      query: (body) => ({
        url: endpoints.vendorPortalSubcategories,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Category", id: "LIST" }, { type: "Subcategory", id: "LIST" }],
    }),
    updateVendorPortalCategory: builder.mutation<Category, { id: string; formData: FormData }>({
      query: ({ id, formData }) => ({
        url: `${endpoints.vendorPortalCategories}/${id}`,
        method: "PUT",
        body: formData,
      }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Category", id: "LIST" }, { type: "Category", id }],
    }),
    updateVendorPortalSubcategory: builder.mutation<
      Subcategory,
      { id: string; name?: string; categoryId?: string; description?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `${endpoints.vendorPortalSubcategories}/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Category", id: "LIST" }, { type: "Subcategory", id: "LIST" }, { type: "Subcategory", id }],
    }),
    getVendorPortalOffers: builder.query<ProductOffer[], void>({
      query: () => endpoints.vendorPortalOffers,
      providesTags: (r) =>
        r
          ? [
              { type: "Offer" as const, id: "LIST" },
              ...r.map((o) => ({ type: "Offer" as const, id: o.id })),
            ]
          : [{ type: "Offer", id: "LIST" }],
    }),
    createVendorPortalOffer: builder.mutation<
      ProductOffer,
      Partial<ProductOffer> & Pick<ProductOffer, "productId" | "title">
    >({
      query: (body) => ({
        url: endpoints.vendorPortalOffers,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Offer", id: "LIST" }],
    }),
    updateVendorPortalOffer: builder.mutation<
      ProductOffer,
      { id: string; patch: Partial<ProductOffer> }
    >({
      query: ({ id, patch }) => ({
        url: endpoints.vendorPortalOfferById(id),
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Offer", id },
        { type: "Offer", id: "LIST" },
      ],
    }),
    deleteVendorPortalOffer: builder.mutation<void, string>({
      query: (id) => ({
        url: endpoints.vendorPortalOfferById(id),
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Offer", id },
        { type: "Offer", id: "LIST" },
      ],
    }),
    getAdminVendorProducts: builder.query<Product[], void>({
      query: () => endpoints.adminVendorProducts,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Product" as const, id })),
              { type: "Product", id: "LIST" },
            ]
          : [{ type: "Product", id: "LIST" }],
    }),
    getAdminVendorOrders: builder.query<OrderListPayload, void>({
      query: () => endpoints.adminVendorOrders,
      providesTags: (r) =>
        r?.items?.length
          ? [
              { type: "Order" as const, id: "VENDOR_LIST" },
              ...r.items.map((o) => ({ type: "Order" as const, id: o.id })),
            ]
          : [{ type: "Order", id: "VENDOR_LIST" }],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useGetCategoriesQuery,
  useGetOrdersQuery,
  useGetStaffQuery,
  useGetStaffMeQuery,
  useGetCustomersQuery,
  useBulkImportCustomersMutation,
  useGetSendersQuery,
  useGetSettingsQuery,
  useGetStaffPositionsQuery,
  useGetAssignedNumbersQuery,
  useGetDeliveryMethodsQuery,
  useGetProductDeliveryFeesQuery,
  useGetProductOffersQuery,
  useCreateProductOfferMutation,
  useUpdateProductOfferMutation,
  useDeleteProductOfferMutation,
  useGetAdminReviewsQuery,
  useDeleteAdminReviewMutation,
  useGetBlogAdminPostsQuery,
  useLazyGetBlogAdminPostByIdQuery,
  useCreateBlogAdminPostMutation,
  useUpdateBlogAdminPostMutation,
  useDeleteBlogAdminPostMutation,
  useChangePasswordMutation,
  useGetStaffEarningsQuery,
  useGetStaffSalaryPaymentsQuery,
  useCreateStaffSalaryPaymentMutation,
  useGetRbacRolesQuery,
  useGetRbacMatrixQuery,
  useUpdateRbacRolePermissionsMutation,
  useGetRbacGuestUsersQuery,
  useCreateRbacGuestUserMutation,
  useUpdateRbacGuestUserMutation,
  useResetRbacGuestUserPasswordMutation,
  useDeleteRbacGuestUserMutation,
  useIndiaPostLoginTestMutation,
  useIndiaPostBulkTrackingMutation,
  useGetVendorsQuery,
  useApproveVendorMutation,
  useRejectVendorMutation,
  useToggleVendorStatusMutation,
  useResetVendorPasswordMutation,
  useGetVendorPortalProductsQuery,
  useCreateVendorPortalProductMutation,
  useUpdateVendorPortalProductMutation,
  useDeleteVendorPortalProductMutation,
  useGetVendorPortalOrdersQuery,
  useUpdateVendorPortalOrderStatusMutation,
  useGetVendorPortalCategoriesQuery,
  useCreateVendorPortalCategoryMutation,
  useUpdateVendorPortalCategoryMutation,
  useCreateVendorPortalSubcategoryMutation,
  useUpdateVendorPortalSubcategoryMutation,
  useGetVendorPortalOffersQuery,
  useCreateVendorPortalOfferMutation,
  useUpdateVendorPortalOfferMutation,
  useDeleteVendorPortalOfferMutation,
  useGetAdminVendorProductsQuery,
  useGetAdminVendorOrdersQuery,
} = edenApi;
