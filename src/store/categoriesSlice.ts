import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { Category } from "../types";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";

export const fetchCategories = createAsyncThunk(
  "categories/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      return await api.get<Category[]>(endpoints.categories);
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

export const createCategory = createAsyncThunk(
  "categories/create",
  async (payload: Pick<Category, "name"> & { description?: string }, { rejectWithValue }) => {
    try {
      return await api.post<Category>(endpoints.categories, payload);
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

export const updateCategory = createAsyncThunk(
  "categories/update",
  async (
    { id, patch }: { id: string; patch: Partial<Pick<Category, "name" | "description">> },
    { rejectWithValue }
  ) => {
    try {
      return await api.put<Category>(endpoints.categoryById(id), patch);
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

export const deleteCategory = createAsyncThunk(
  "categories/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(endpoints.categoryById(id));
      return id;
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

interface CategoriesState {
  list: Category[];
  loading: boolean;
  error: string | null;
}

const initialState: CategoriesState = {
  list: [],
  loading: false,
  error: null,
};

const categoriesSlice = createSlice({
  name: "categories",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (s) => {
        s.loading = true;
        s.error = null;
      })
      .addCase(fetchCategories.fulfilled, (s, a) => {
        s.loading = false;
        s.list = a.payload;
      })
      .addCase(fetchCategories.rejected, (s, a) => {
        s.loading = false;
        s.error = (a.payload as Error)?.message ?? "Failed to fetch categories";
      })
      .addCase(createCategory.fulfilled, (s, a) => {
        s.list.push(a.payload);
        s.list.sort((x, y) => x.name.localeCompare(y.name));
      })
      .addCase(updateCategory.fulfilled, (s, a) => {
        const i = s.list.findIndex((c) => c.id === a.payload.id);
        if (i !== -1) s.list[i] = a.payload;
        s.list.sort((x, y) => x.name.localeCompare(y.name));
      })
      .addCase(deleteCategory.fulfilled, (s, a) => {
        s.list = s.list.filter((c) => c.id !== a.payload);
      });
  },
});

export const categoriesReducer = categoriesSlice.reducer;

export const selectCategories = (state: { categories: CategoriesState }) =>
  state.categories.list;
