import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";
import type { Sender } from "../types";

type SenderPayload = Omit<Sender, "id" | "createdAt" | "updatedAt">;

export const fetchSenders = createAsyncThunk(
  "senders/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      return await api.get<Sender[]>(endpoints.senders);
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

export const createSender = createAsyncThunk(
  "senders/create",
  async (payload: SenderPayload, { rejectWithValue }) => {
    try {
      return await api.post<Sender>(endpoints.senders, payload);
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

export const updateSender = createAsyncThunk(
  "senders/update",
  async (
    { id, patch }: { id: string; patch: Partial<SenderPayload> },
    { rejectWithValue }
  ) => {
    try {
      return await api.put<Sender>(endpoints.senderById(id), patch);
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

export const setDefaultSender = createAsyncThunk(
  "senders/setDefault",
  async (id: string, { rejectWithValue }) => {
    try {
      return await api.put<Sender>(endpoints.senderSetDefault(id), {});
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

export const deleteSender = createAsyncThunk(
  "senders/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(endpoints.senderById(id));
      return id;
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

interface SendersState {
  list: Sender[];
  loading: boolean;
  error: string | null;
}

const initialState: SendersState = {
  list: [],
  loading: false,
  error: null,
};

const sendersSlice = createSlice({
  name: "senders",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSenders.pending, (s) => {
        s.loading = true;
        s.error = null;
      })
      .addCase(fetchSenders.fulfilled, (s, a) => {
        s.loading = false;
        s.list = a.payload;
      })
      .addCase(fetchSenders.rejected, (s, a) => {
        s.loading = false;
        s.error = (a.payload as Error)?.message ?? "Failed to fetch senders";
      })
      .addCase(createSender.fulfilled, (s, a) => {
        s.list = [a.payload, ...s.list.filter((x) => x.id !== a.payload.id)].map(
          (sender) =>
            a.payload.isDefault && sender.id !== a.payload.id
              ? { ...sender, isDefault: false }
              : sender
        );
      })
      .addCase(updateSender.fulfilled, (s, a) => {
        s.list = s.list.map((sender) => {
          if (sender.id === a.payload.id) return a.payload;
          if (a.payload.isDefault) return { ...sender, isDefault: false };
          return sender;
        });
      })
      .addCase(setDefaultSender.fulfilled, (s, a) => {
        s.list = s.list.map((sender) =>
          sender.id === a.payload.id
            ? a.payload
            : { ...sender, isDefault: false }
        );
      })
      .addCase(deleteSender.fulfilled, (s, a) => {
        s.list = s.list.filter((sender) => sender.id !== a.payload);
      });
  },
});

export const sendersReducer = sendersSlice.reducer;
export const selectSenders = (state: { senders: SendersState }) =>
  state.senders.list;
export const selectSendersLoading = (state: { senders: SendersState }) =>
  state.senders.loading;
