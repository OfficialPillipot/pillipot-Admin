import { useEffect } from "react";
import { ToastContainer } from "react-toastify";
import { BrowserRouter } from "react-router";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { useAppDispatch } from "./store/hooks";
import {
  fetchProducts,
  fetchCategories,
  fetchOrders,
  fetchStaff,
  fetchStaffMe,
  fetchCustomers,
} from "./store";
import { RootRoutes } from "./routes";

function DataLoader() {
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAuth();
  useEffect(() => {
    if (!isAuthenticated) return;
    dispatch(fetchProducts());
    dispatch(fetchCategories());
    dispatch(fetchOrders());
    if (user?.role === "super_admin") {
      dispatch(fetchStaff());
      dispatch(fetchCustomers());
    }
    if (user?.role === "staff" && user.staffId) {
      void dispatch(fetchStaffMe());
    }
  }, [dispatch, isAuthenticated, user?.role]);
  return null;
}

function AppWithData() {
  return (
    <>
      <DataLoader />
      <RootRoutes />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppWithData />
        <ToastContainer theme="light" />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
