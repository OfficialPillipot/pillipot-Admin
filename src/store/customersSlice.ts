import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { Customer } from "../types";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";

export const fetchCustomers = createAsyncThunk(
  "customers/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      return await api.get<Customer[]>(endpoints.customers);
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

interface CustomersState {
  list: Customer[];
  loading: boolean;
  error: string | null;
}

const initialState: CustomersState = {
  list: [],
  loading: false,
  error: null,
};

const customersSlice = createSlice({
  name: "customers",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomers.pending, (s) => {
        s.loading = true;
        s.error = null;
      })
      .addCase(fetchCustomers.fulfilled, (s, a) => {
        s.loading = false;
        s.list = a.payload;
      })
      .addCase(fetchCustomers.rejected, (s, a) => {
        s.loading = false;
        s.error = (a.payload as Error)?.message ?? "Failed to fetch customers";
      });
  },
});

export const customersReducer = customersSlice.reducer;

export const selectCustomers = (state: { customers: CustomersState }) =>
  state.customers.list;
