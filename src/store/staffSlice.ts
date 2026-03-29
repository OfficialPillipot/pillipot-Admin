import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { Staff } from "../types";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";

/** Payload for POST /staff (no server-generated fields). */
export type CreateStaffPayload = Omit<
  Staff,
  | "id"
  | "temporaryPassword"
  | "pendingPasswordResetRequest"
  | "staffPositionName"
  | "assignedNumber"
>;

function normalizeStaff(row: Staff): Staff {
  return {
    ...row,
    jobRole: row.jobRole ?? "sales",
    staffPositionId: row.staffPositionId ?? null,
    staffPositionName: row.staffPositionName ?? null,
    assignedNumberId: row.assignedNumberId ?? null,
    assignedNumber: row.assignedNumber ?? null,
    phone: row.phone ?? "",
    temporaryPassword:
      row.temporaryPassword === undefined || row.temporaryPassword === ""
        ? null
        : row.temporaryPassword,
    pendingPasswordResetRequest:
      row.pendingPasswordResetRequest === undefined
        ? null
        : row.pendingPasswordResetRequest,
  };
}

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

export const fetchStaffMe = createAsyncThunk(
  "staff/fetchMe",
  async (_, { rejectWithValue }) => {
    try {
      return await api.get<Staff>(endpoints.staffMe);
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

export const createStaff = createAsyncThunk(
  "staff/create",
  async (payload: CreateStaffPayload, { rejectWithValue }) => {
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

export const resetStaffPassword = createAsyncThunk(
  "staff/resetPassword",
  async (id: string, { rejectWithValue }) => {
    try {
      return await api.post<Staff>(endpoints.staffResetPassword(id), {});
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

export const requestMyPasswordReset = createAsyncThunk(
  "staff/requestMyPasswordReset",
  async (_, { rejectWithValue, dispatch }) => {
    try {
      await api.post<{ ok: true }>(endpoints.staffRequestPasswordReset, {});
      await dispatch(fetchStaffMe()).unwrap();
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

export const fulfillPasswordResetRequest = createAsyncThunk(
  "staff/fulfillPasswordResetRequest",
  async (requestId: string, { rejectWithValue }) => {
    try {
      return await api.post<Staff & { requestId: string }>(
        endpoints.staffPasswordResetRequestFulfill(requestId),
        {}
      );
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

export const deleteStaff = createAsyncThunk(
  "staff/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(endpoints.staffById(id));
      return id;
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

interface StaffState {
  list: Staff[];
  /** Logged-in staff user’s own row from GET /staff/me */
  me: Staff | null;
  loading: boolean;
  meLoading: boolean;
  error: string | null;
}

const initialState: StaffState = {
  list: [],
  me: null,
  loading: false,
  meLoading: false,
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
        s.list = a.payload.map(normalizeStaff);
        s.me = null;
      })
      .addCase(fetchStaff.rejected, (s, a) => {
        s.loading = false;
        s.error = (a.payload as Error)?.message ?? "Failed to fetch staff";
      })
      .addCase(fetchStaffMe.pending, (s) => {
        s.meLoading = true;
      })
      .addCase(fetchStaffMe.fulfilled, (s, a) => {
        s.meLoading = false;
        s.me = normalizeStaff(a.payload);
      })
      .addCase(fetchStaffMe.rejected, (s) => {
        s.meLoading = false;
        s.me = null;
      })
      .addCase(createStaff.fulfilled, (s, a) => {
        s.list.push(normalizeStaff(a.payload));
      })
      .addCase(updateStaff.fulfilled, (s, a) => {
        const i = s.list.findIndex((st) => st.id === a.payload.id);
        if (i !== -1) s.list[i] = normalizeStaff(a.payload);
        if (s.me?.id === a.payload.id) {
          s.me = normalizeStaff(a.payload);
        }
      })
      .addCase(resetStaffPassword.fulfilled, (s, a) => {
        const i = s.list.findIndex((st) => st.id === a.payload.id);
        if (i !== -1) s.list[i] = normalizeStaff(a.payload);
        if (s.me?.id === a.payload.id) {
          s.me = normalizeStaff(a.payload);
        }
      })
      .addCase(fulfillPasswordResetRequest.fulfilled, (s, a) => {
        const { requestId, ...staff } = a.payload;
        void requestId;
        const normalized = normalizeStaff(staff);
        const si = s.list.findIndex((st) => st.id === staff.id);
        if (si !== -1) s.list[si] = normalized;
        if (s.me?.id === staff.id) s.me = normalized;
      })
      .addCase(deleteStaff.fulfilled, (s, a) => {
        s.list = s.list.filter((st) => st.id !== a.payload);
        if (s.me?.id === a.payload) s.me = null;
      });
  },
});

export const staffReducer = staffSlice.reducer;

export const selectStaff = (state: { staff: StaffState }) => state.staff.list;
export const selectStaffMe = (state: { staff: StaffState }) => state.staff.me;
export const selectStaffMeLoading = (state: { staff: StaffState }) =>
  state.staff.meLoading;
export const selectStaffById = (state: { staff: StaffState }, id: string) =>
  state.staff.list.find((s) => s.id === id);
