import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";
import type { AppSettings, PdfSize } from "../types";

export const fetchSettings = createAsyncThunk(
  "settings/fetch",
  async (_, { rejectWithValue }) => {
    try {
      return await api.get<AppSettings>(endpoints.settings);
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

export const updateSettings = createAsyncThunk(
  "settings/update",
  async (
    payload: { defaultPdfSize?: PdfSize; defaultSenderId?: string },
    { rejectWithValue }
  ) => {
    try {
      return await api.patch<AppSettings>(endpoints.settings, payload);
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

interface SettingsState {
  value: AppSettings | null;
  loading: boolean;
  error: string | null;
}

const initialState: SettingsState = {
  value: null,
  loading: false,
  error: null,
};

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSettings.pending, (s) => {
        s.loading = true;
        s.error = null;
      })
      .addCase(fetchSettings.fulfilled, (s, a) => {
        s.loading = false;
        s.value = a.payload;
      })
      .addCase(fetchSettings.rejected, (s, a) => {
        s.loading = false;
        s.error = (a.payload as Error)?.message ?? "Failed to load settings";
      })
      .addCase(updateSettings.fulfilled, (s, a) => {
        s.value = a.payload;
      });
  },
});

export const settingsReducer = settingsSlice.reducer;
export const selectSettings = (state: { settings: SettingsState }) =>
  state.settings.value;
export const selectSettingsLoading = (state: { settings: SettingsState }) =>
  state.settings.loading;
