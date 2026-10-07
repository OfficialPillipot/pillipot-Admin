import { useEffect, useState } from "react";
import { ToastContainer } from "react-toastify";
import { BrowserRouter } from "react-router";
import { AuthProvider } from "./context/AuthContext";
import { ApiLoadingOverlay } from "./components/ApiLoadingOverlay";
import { RootRoutes } from "./routes";

type ThemeMode = "light" | "dark";

function resolveTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  try {
    const saved = window.localStorage.getItem("eden_theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // ignore storage read errors
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function AppWithData() {
  return <RootRoutes />;
}

function App() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => resolveTheme());

  useEffect(() => {
    const applyTheme = (mode: ThemeMode) => {
      document.documentElement.setAttribute("data-theme", mode);
      document.documentElement.style.colorScheme = mode;
    };
    const sync = () => {
      const mode = resolveTheme();
      setThemeMode(mode);
      applyTheme(mode);
    };
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <ApiLoadingOverlay />
        <AppWithData />
        <ToastContainer theme={themeMode} />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
