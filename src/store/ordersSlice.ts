import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { CreateOrderPayload, Order } from "../types";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";

export type OrderListFilters = {
  dateFrom?: string;
  dateTo?: string;
  /** Display order id (e.g. ORD-1005); API normalizes digits-only to ORD-{n}. */
  orderId?: string;
  /** When set (and no date/orderId filters), API paginates. */
  page?: number;
  limit?: number;
};

export type OrderListPayload = { items: Order[]; total: number };

export const fetchOrders = createAsyncThunk(
  "orders/fetchAll",
  async (filters: OrderListFilters | undefined, { rejectWithValue }) => {
    try {
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
      const qs = params.toString();
      const path = qs ? `${endpoints.orders}?${qs}` : endpoints.orders;
      const data = await api.get<OrderListPayload | Order[]>(path);
      if (Array.isArray(data)) {
        return { items: data, total: data.length } satisfies OrderListPayload;
      }
      return data;
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

export const createOrder = createAsyncThunk(
  "orders/create",
  async (payload: CreateOrderPayload, { rejectWithValue }) => {
    try {
      return await api.post<Order>(endpoints.orders, payload);
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

export const updateOrder = createAsyncThunk(
  "orders/update",
  async (
    { id, patch }: { id: string; patch: Partial<Order> },
    { rejectWithValue }
  ) => {
    try {
      return await api.put<Order>(endpoints.orderById(id), patch);
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

export const deleteOrder = createAsyncThunk(
  "orders/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(endpoints.orderById(id));
      return id;
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

interface OrdersState {
  list: Order[];
  /** Total rows matching the last list query (for paginated fetches). */
  listTotal: number;
  loading: boolean;
  error: string | null;
}

const initialState: OrdersState = {
  list: [],
  listTotal: 0,
  loading: false,
  error: null,
};

const ordersSlice = createSlice({
  name: "orders",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (s) => {
        s.loading = true;
        s.error = null;
      })
      .addCase(fetchOrders.fulfilled, (s, a) => {
        s.loading = false;
        s.list = a.payload.items;
        s.listTotal = a.payload.total;
      })
      .addCase(fetchOrders.rejected, (s, a) => {
        s.loading = false;
        s.error = (a.payload as Error)?.message ?? "Failed to fetch orders";
      })
      .addCase(createOrder.fulfilled, (s, a) => {
        s.list.push(a.payload);
      })
      .addCase(updateOrder.fulfilled, (s, a) => {
        const i = s.list.findIndex((o) => o.id === a.payload.id);
        if (i !== -1) s.list[i] = a.payload;
      })
      .addCase(deleteOrder.fulfilled, (s, a) => {
        s.list = s.list.filter((o) => o.id !== a.payload);
      });
  },
});

export const ordersReducer = ordersSlice.reducer;

export const selectOrders = (state: { orders: OrdersState }) => state.orders.list;
export const selectOrdersListTotal = (state: { orders: OrdersState }) =>
  state.orders.listTotal;
