/**
 * API client. Set VITE_API_BASE_URL (e.g. http://localhost:3000/v1/api).
 * JWT is sent automatically when present (see auth-token).
 */

import { getAccessToken } from "../lib/auth-token";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const text = await res.text();
  if (!res.ok) {
    let message = res.statusText || "Request failed";
    if (text) {
      try {
        const body = JSON.parse(text) as {
          message?: string | string[];
        };
        if (typeof body.message === "string") message = body.message;
        else if (Array.isArray(body.message))
          message = body.message.join(", ");
      } catch {
        /* use statusText */
      }
    }
    const err = new Error(message);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (path: string) => request<void>(path, { method: "DELETE" }),
};
