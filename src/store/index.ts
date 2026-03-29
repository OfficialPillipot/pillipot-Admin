import { configureStore } from "@reduxjs/toolkit";
import { productsReducer, fetchProducts } from "./productsSlice";
import { categoriesReducer, fetchCategories } from "./categoriesSlice";
import { ordersReducer, fetchOrders } from "./ordersSlice";
import { staffReducer, fetchStaff, fetchStaffMe } from "./staffSlice";
import { customersReducer, fetchCustomers } from "./customersSlice";
import { staffPositionsReducer } from "./staffPositionsSlice";
import { assignedNumbersReducer } from "./assignedNumbersSlice";
import { sendersReducer, fetchSenders } from "./sendersSlice";
import { settingsReducer, fetchSettings } from "./settingsSlice";

export const store = configureStore({
  reducer: {
    products: productsReducer,
    categories: categoriesReducer,
    orders: ordersReducer,
    staff: staffReducer,
    staffPositions: staffPositionsReducer,
    assignedNumbers: assignedNumbersReducer,
    customers: customersReducer,
    senders: sendersReducer,
    settings: settingsReducer,
  },
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;

export {
  fetchProducts,
  fetchCategories,
  fetchOrders,
  fetchStaff,
  fetchStaffMe,
  fetchCustomers,
  fetchSenders,
  fetchSettings,
};
