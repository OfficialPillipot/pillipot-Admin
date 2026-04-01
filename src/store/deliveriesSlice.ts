import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { DeliveryMethod, ProductDeliveryFee } from "../types";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";

export const fetchDeliveryMethods = createAsyncThunk(
  "deliveries/fetchMethods",
  async (_, { rejectWithValue }) => {
    try {
      return await api.get<DeliveryMethod[]>(endpoints.deliveryMethods);
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

export const createDeliveryMethod = createAsyncThunk(
  "deliveries/createMethod",
  async (
    payload: { name: string; description?: string; sortOrder?: number },
    { rejectWithValue }
  ) => {
    try {
      return await api.post<DeliveryMethod>(endpoints.deliveryMethods, payload);
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

export const updateDeliveryMethod = createAsyncThunk(
  "deliveries/updateMethod",
  async (
    {
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Pick<DeliveryMethod, "name" | "description" | "sortOrder">>;
    },
    { rejectWithValue }
  ) => {
    try {
      return await api.put<DeliveryMethod>(endpoints.deliveryMethodById(id), patch);
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

export const deleteDeliveryMethod = createAsyncThunk(
  "deliveries/deleteMethod",
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(endpoints.deliveryMethodById(id));
      return id;
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

export const fetchProductDeliveryFees = createAsyncThunk(
  "deliveries/fetchFees",
  async (_, { rejectWithValue }) => {
    try {
      return await api.get<ProductDeliveryFee[]>(endpoints.productDeliveryFees);
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

export const createProductDeliveryFee = createAsyncThunk(
  "deliveries/createFee",
  async (
    payload: {
      productId: string;
      deliveryMethodId: string;
      feePrepaid: number;
      feeCod: number;
    },
    { rejectWithValue }
  ) => {
    try {
      return await api.post<ProductDeliveryFee>(endpoints.productDeliveryFees, payload);
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

export const updateProductDeliveryFee = createAsyncThunk(
  "deliveries/updateFee",
  async (
    {
      id,
      patch,
    }: {
      id: string;
      patch: Partial<{
        productId: string;
        deliveryMethodId: string;
        feePrepaid: number;
        feeCod: number;
      }>;
    },
    { rejectWithValue }
  ) => {
    try {
      return await api.put<ProductDeliveryFee>(
        endpoints.productDeliveryFeeById(id),
        patch
      );
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

export const deleteProductDeliveryFee = createAsyncThunk(
  "deliveries/deleteFee",
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(endpoints.productDeliveryFeeById(id));
      return id;
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

interface DeliveriesState {
  methods: DeliveryMethod[];
  fees: ProductDeliveryFee[];
  loadingMethods: boolean;
  loadingFees: boolean;
  error: string | null;
}

const initialState: DeliveriesState = {
  methods: [],
  fees: [],
  loadingMethods: false,
  loadingFees: false,
  error: null,
};

const deliveriesSlice = createSlice({
  name: "deliveries",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDeliveryMethods.pending, (s) => {
        s.loadingMethods = true;
        s.error = null;
      })
      .addCase(fetchDeliveryMethods.fulfilled, (s, a) => {
        s.loadingMethods = false;
        s.methods = a.payload;
      })
      .addCase(fetchDeliveryMethods.rejected, (s, a) => {
        s.loadingMethods = false;
        s.error = (a.payload as Error)?.message ?? "Failed to load delivery methods";
      })
      .addCase(createDeliveryMethod.fulfilled, (s, a) => {
        s.methods.push(a.payload);
        s.methods.sort((x, y) => x.sortOrder - y.sortOrder || x.name.localeCompare(y.name));
      })
      .addCase(updateDeliveryMethod.fulfilled, (s, a) => {
        const i = s.methods.findIndex((m) => m.id === a.payload.id);
        if (i !== -1) s.methods[i] = a.payload;
        s.methods.sort((x, y) => x.sortOrder - y.sortOrder || x.name.localeCompare(y.name));
      })
      .addCase(deleteDeliveryMethod.fulfilled, (s, a) => {
        s.methods = s.methods.filter((m) => m.id !== a.payload);
      })
      .addCase(fetchProductDeliveryFees.pending, (s) => {
        s.loadingFees = true;
        s.error = null;
      })
      .addCase(fetchProductDeliveryFees.fulfilled, (s, a) => {
        s.loadingFees = false;
        s.fees = a.payload;
      })
      .addCase(fetchProductDeliveryFees.rejected, (s, a) => {
        s.loadingFees = false;
        s.error = (a.payload as Error)?.message ?? "Failed to load product fees";
      })
      .addCase(createProductDeliveryFee.fulfilled, (s, a) => {
        s.fees.push(a.payload);
      })
      .addCase(updateProductDeliveryFee.fulfilled, (s, a) => {
        const i = s.fees.findIndex((f) => f.id === a.payload.id);
        if (i !== -1) s.fees[i] = a.payload;
      })
      .addCase(deleteProductDeliveryFee.fulfilled, (s, a) => {
        s.fees = s.fees.filter((f) => f.id !== a.payload);
      });
  },
});

export const deliveriesReducer = deliveriesSlice.reducer;

export const selectDeliveryMethods = (state: { deliveries: DeliveriesState }) =>
  state.deliveries.methods;
export const selectProductDeliveryFees = (state: { deliveries: DeliveriesState }) =>
  state.deliveries.fees;
