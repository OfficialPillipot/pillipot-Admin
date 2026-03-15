import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { Product } from "../types";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";

export const fetchProducts = createAsyncThunk(
  "products/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      return await api.get<Product[]>(endpoints.products);
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

export const createProduct = createAsyncThunk(
  "products/create",
  async (payload: Omit<Product, "id">, { rejectWithValue }) => {
    try {
      return await api.post<Product>(endpoints.products, payload);
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

export const updateProduct = createAsyncThunk(
  "products/update",
  async (
    { id, patch }: { id: string; patch: Partial<Product> },
    { rejectWithValue }
  ) => {
    try {
      return await api.put<Product>(endpoints.productById(id), patch);
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

export const deleteProduct = createAsyncThunk(
  "products/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(endpoints.productById(id));
      return id;
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

interface ProductsState {
  list: Product[];
  loading: boolean;
  error: string | null;
}

const initialState: ProductsState = {
  list: [],
  loading: false,
  error: null,
};

const productsSlice = createSlice({
  name: "products",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (s) => {
        s.loading = true;
        s.error = null;
      })
      .addCase(fetchProducts.fulfilled, (s, a) => {
        s.loading = false;
        s.list = a.payload;
      })
      .addCase(fetchProducts.rejected, (s, a) => {
        s.loading = false;
        s.error = (a.payload as Error)?.message ?? "Failed to fetch products";
      })
      .addCase(createProduct.fulfilled, (s, a) => {
        s.list.push(a.payload);
      })
      .addCase(updateProduct.fulfilled, (s, a) => {
        const i = s.list.findIndex((p) => p.id === a.payload.id);
        if (i !== -1) s.list[i] = a.payload;
      })
      .addCase(deleteProduct.fulfilled, (s, a) => {
        s.list = s.list.filter((p) => p.id !== a.payload);
      });
  },
});

export const productsReducer = productsSlice.reducer;

export const selectProducts = (state: { products: ProductsState }) => state.products.list;
export const selectProductById = (state: { products: ProductsState }, id: string) =>
  state.products.list.find((p) => p.id === id);
