import { createApi } from "@reduxjs/toolkit/query/react";
import { endpoints } from "../../api/endpoints";
import { normalizeStaff } from "../../lib/staffNormalize";
import type {
  AppSettings,
  AssignedNumber,
  Category,
  CreateOrderPayload,
  Customer,
  DeliveryMethod,
  Order,
  PdfSize,
  Product,
  ProductDeliveryFee,
  Sender,
  Staff,
  StaffPosition,
} from "../../types";
import { baseQueryWithAuth } from "./baseQueryWithAuth";

export type OrderListFilters = {
  dateFrom?: string;
  dateTo?: string;
  orderId?: string;
  page?: number;
  limit?: number;
};

export type OrderListPayload = { items: Order[]; total: number };

export type NewProductPayload = Pick<Product, "name" | "price"> & {
  categoryId: string;
  buyingPrice?: number;
  stockQuantity?: number;
  size?: string;
  color?: string;
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
  const narrowed = !!(
    filters?.dateFrom ||
    filters?.dateTo ||
    filters?.orderId?.trim()
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
      query: (body) => ({
        url: endpoints.products,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Product", id: "LIST" }],
    }),
    updateProduct: builder.mutation<
      Product,
      { id: string; patch: Partial<Product> }
    >({
      query: ({ id, patch }) => ({
        url: endpoints.productById(id),
        method: "PUT",
        body: patch,
      }),
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
      Pick<Category, "name"> & { description?: string }
    >({
      query: (body) => ({
        url: endpoints.categories,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Category", id: "LIST" }],
    }),
    updateCategory: builder.mutation<
      Category,
      {
        id: string;
        patch: Partial<Pick<Category, "name" | "description">>;
      }
    >({
      query: ({ id, patch }) => ({
        url: endpoints.categoryById(id),
        method: "PUT",
        body: patch,
      }),
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
              ...r.map((f) => ({
                type: "ProductDeliveryFee" as const,
                id: f.id,
              })),
            ]
          : [{ type: "ProductDeliveryFee", id: "LIST" }],
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
  }),
});

export const {
  useGetProductsQuery,
  useGetCategoriesQuery,
  useGetOrdersQuery,
  useGetStaffQuery,
  useGetStaffMeQuery,
  useGetCustomersQuery,
  useGetSendersQuery,
  useGetSettingsQuery,
  useGetStaffPositionsQuery,
  useGetAssignedNumbersQuery,
  useGetDeliveryMethodsQuery,
  useGetProductDeliveryFeesQuery,
} = edenApi;
