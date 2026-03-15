import { useEffect } from "react";
import { ToastContainer } from "react-toastify";
import { BrowserRouter } from "react-router";
import { AuthProvider } from "./context/AuthContext";
import { useAppDispatch } from "./store/hooks";
import { fetchProducts, fetchOrders, fetchStaff } from "./store";
import { RootRoutes } from "./routes";

function DataLoader() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(fetchProducts());
    dispatch(fetchOrders());
    dispatch(fetchStaff());
  }, [dispatch]);
  return null;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataLoader />
        <RootRoutes />
        <ToastContainer theme="light" />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
