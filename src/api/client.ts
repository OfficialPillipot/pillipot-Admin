/**
 * API client. For real-world API:
 * 1. Add VITE_API_BASE_URL in .env (e.g. VITE_API_BASE_URL=https://your-api.com)
 * 2. Ensure your server exposes the same paths as in endpoints.ts (/v1/api/products, etc.)
 * 3. Disable MSW in main.tsx (e.g. only start worker when import.meta.env.VITE_MSW === 'true')
 * No other code changes needed; thunks already use this client.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = new Error(res.statusText || "Request failed");
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: (path: string) => request<void>(path, { method: "DELETE" }),
};
