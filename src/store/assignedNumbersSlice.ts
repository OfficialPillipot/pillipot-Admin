import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { AssignedNumber } from "../types";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";

export const fetchAssignedNumbers = createAsyncThunk(
  "assignedNumbers/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      return await api.get<AssignedNumber[]>(endpoints.assignedNumbers);
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

export const createAssignedNumber = createAsyncThunk(
  "assignedNumbers/create",
  async (payload: { number: string }, { rejectWithValue }) => {
    try {
      return await api.post<AssignedNumber>(endpoints.assignedNumbers, payload);
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

export const updateAssignedNumber = createAsyncThunk(
  "assignedNumbers/update",
  async (
    { id, number }: { id: string; number: string },
    { rejectWithValue }
  ) => {
    try {
      return await api.put<AssignedNumber>(
        endpoints.assignedNumberById(id),
        { number }
      );
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

export const deleteAssignedNumber = createAsyncThunk(
  "assignedNumbers/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(endpoints.assignedNumberById(id));
      return id;
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

interface State {
  list: AssignedNumber[];
  loading: boolean;
  error: string | null;
}

const initialState: State = {
  list: [],
  loading: false,
  error: null,
};

const assignedNumbersSlice = createSlice({
  name: "assignedNumbers",
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchAssignedNumbers.pending, (s) => {
      s.loading = true;
      s.error = null;
    })
      .addCase(fetchAssignedNumbers.fulfilled, (s, a) => {
        s.loading = false;
        s.list = a.payload;
      })
      .addCase(fetchAssignedNumbers.rejected, (s) => {
        s.loading = false;
        s.error = "Failed to load numbers";
      })
      .addCase(createAssignedNumber.fulfilled, (s, a) => {
        s.list.push(a.payload);
        s.list.sort((x, y) => x.number.localeCompare(y.number, undefined, { numeric: true }));
      })
      .addCase(updateAssignedNumber.fulfilled, (s, a) => {
        const i = s.list.findIndex((x) => x.id === a.payload.id);
        if (i !== -1) s.list[i] = a.payload;
        s.list.sort((x, y) => x.number.localeCompare(y.number, undefined, { numeric: true }));
      })
      .addCase(deleteAssignedNumber.fulfilled, (s, a) => {
        s.list = s.list.filter((x) => x.id !== a.payload);
      });
  },
});

export const assignedNumbersReducer = assignedNumbersSlice.reducer;

export const selectAssignedNumbers = (state: {
  assignedNumbers: State;
}) => state.assignedNumbers.list;
