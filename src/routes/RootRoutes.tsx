import { Routes, Route } from "react-router";
import { ProtectedRoute } from "../components/auth";
import { useAuth } from "../context/AuthContext";
import { AppLayout } from "../components/layout";
import { LayoutRoutes } from "./LayoutRoutes";
import Login from "../pages/Login";

function AuthenticatedLayout() {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <AppLayout user={user} onLogout={logout}>
      <LayoutRoutes user={user} />
    </AppLayout>
  );
}

export function RootRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AuthenticatedLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
