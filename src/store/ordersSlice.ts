import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { Order } from "../types";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";

export const fetchOrders = createAsyncThunk(
  "orders/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      return await api.get<Order[]>(endpoints.orders);
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

export const createOrder = createAsyncThunk(
  "orders/create",
  async (payload: Omit<Order, "id" | "orderId" | "createdAt">, { rejectWithValue }) => {
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
  loading: boolean;
  error: string | null;
}

const initialState: OrdersState = {
  list: [],
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
        s.list = a.payload;
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
