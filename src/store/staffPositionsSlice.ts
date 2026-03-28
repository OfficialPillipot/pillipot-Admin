import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { StaffPosition } from "../types";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";

export const fetchStaffPositions = createAsyncThunk(
  "staffPositions/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      return await api.get<StaffPosition[]>(endpoints.staffPositions);
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

export const createStaffPosition = createAsyncThunk(
  "staffPositions/create",
  async (payload: { name: string }, { rejectWithValue }) => {
    try {
      return await api.post<StaffPosition>(endpoints.staffPositions, payload);
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

export const updateStaffPosition = createAsyncThunk(
  "staffPositions/update",
  async (
    { id, name }: { id: string; name: string },
    { rejectWithValue }
  ) => {
    try {
      return await api.put<StaffPosition>(endpoints.staffPositionById(id), {
        name,
      });
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

export const deleteStaffPosition = createAsyncThunk(
  "staffPositions/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(endpoints.staffPositionById(id));
      return id;
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

interface State {
  list: StaffPosition[];
  loading: boolean;
  error: string | null;
}

const initialState: State = {
  list: [],
  loading: false,
  error: null,
};

const staffPositionsSlice = createSlice({
  name: "staffPositions",
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchStaffPositions.pending, (s) => {
      s.loading = true;
      s.error = null;
    })
      .addCase(fetchStaffPositions.fulfilled, (s, a) => {
        s.loading = false;
        s.list = a.payload;
      })
      .addCase(fetchStaffPositions.rejected, (s) => {
        s.loading = false;
        s.error = "Failed to load roles";
      })
      .addCase(createStaffPosition.fulfilled, (s, a) => {
        s.list.push(a.payload);
        s.list.sort((x, y) => x.name.localeCompare(y.name));
      })
      .addCase(updateStaffPosition.fulfilled, (s, a) => {
        const i = s.list.findIndex((x) => x.id === a.payload.id);
        if (i !== -1) s.list[i] = a.payload;
        s.list.sort((x, y) => x.name.localeCompare(y.name));
      })
      .addCase(deleteStaffPosition.fulfilled, (s, a) => {
        s.list = s.list.filter((x) => x.id !== a.payload);
      });
  },
});

export const staffPositionsReducer = staffPositionsSlice.reducer;

export const selectStaffPositions = (state: {
  staffPositions: State;
}) => state.staffPositions.list;
