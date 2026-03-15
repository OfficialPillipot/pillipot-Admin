import { configureStore } from "@reduxjs/toolkit";
import { productsReducer, fetchProducts } from "./productsSlice";
import { ordersReducer, fetchOrders } from "./ordersSlice";
import { staffReducer, fetchStaff } from "./staffSlice";

export const store = configureStore({
  reducer: {
    products: productsReducer,
    orders: ordersReducer,
    staff: staffReducer,
  },
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;

export { fetchProducts, fetchOrders, fetchStaff };
