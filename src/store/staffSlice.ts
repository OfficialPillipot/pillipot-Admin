import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { Staff } from "../types";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";

export const fetchStaff = createAsyncThunk(
  "staff/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      return await api.get<Staff[]>(endpoints.staff);
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

export const createStaff = createAsyncThunk(
  "staff/create",
  async (payload: Omit<Staff, "id">, { rejectWithValue }) => {
    try {
      return await api.post<Staff>(endpoints.staff, payload);
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

export const updateStaff = createAsyncThunk(
  "staff/update",
  async (
    { id, patch }: { id: string; patch: Partial<Staff> },
    { rejectWithValue }
  ) => {
    try {
      return await api.put<Staff>(endpoints.staffById(id), patch);
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

interface StaffState {
  list: Staff[];
  loading: boolean;
  error: string | null;
}

const initialState: StaffState = {
  list: [],
  loading: false,
  error: null,
};

const staffSlice = createSlice({
  name: "staff",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStaff.pending, (s) => {
        s.loading = true;
        s.error = null;
      })
      .addCase(fetchStaff.fulfilled, (s, a) => {
        s.loading = false;
        s.list = a.payload;
      })
      .addCase(fetchStaff.rejected, (s, a) => {
        s.loading = false;
        s.error = (a.payload as Error)?.message ?? "Failed to fetch staff";
      })
      .addCase(createStaff.fulfilled, (s, a) => {
        s.list.push(a.payload);
      })
      .addCase(updateStaff.fulfilled, (s, a) => {
        const i = s.list.findIndex((st) => st.id === a.payload.id);
        if (i !== -1) s.list[i] = a.payload;
      });
  },
});

export const staffReducer = staffSlice.reducer;

export const selectStaff = (state: { staff: StaffState }) => state.staff.list;
export const selectStaffById = (state: { staff: StaffState }, id: string) =>
  state.staff.list.find((s) => s.id === id);
