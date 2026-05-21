import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // ProfitAnalytics (Chart.js) may approach this; route + scanner code-splitting keeps most chunks small.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Keep heavy optional features out of the primary startup chunk.
        manualChunks(id) {
          if (id.includes("node_modules/chart.js") || id.includes("node_modules/react-chartjs-2")) {
            return "admin-charts";
          }
          if (id.includes("node_modules/quill")) {
            return "admin-editor";
          }
          if (
            id.includes("node_modules/html5-qrcode") ||
            id.includes("node_modules/@zxing/browser") ||
            id.includes("node_modules/@zxing/library")
          ) {
            return "admin-scanners";
          }
          return undefined;
        },
      },
    },
  },
  server: {
    proxy: {
      // India Post (CEPT) — must be registered before the generic /v1/api rule.
      "/v1/api/india-post": {
        target: "https://test.cept.gov.in",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => {
          if (path.includes("/login-test")) {
            return "/beextcustomer/v1/access/login";
          }
          if (path.includes("/tracking/bulk")) {
            return "/beextcustomer/v1/tracking/bulk";
          }
          return path;
        },
      },
      // When VITE_API_BASE_URL is unset, use relative /v1/api and this proxy to the Nest app.
      "/v1/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
      },
    },
  },
})
