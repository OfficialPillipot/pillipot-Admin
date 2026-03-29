import { getAccessToken } from "./auth-token";
import { endpoints } from "../api/endpoints";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

/**
 * GET /v1/api/orders/:id/pdf with JWT; triggers browser download.
 */
export async function downloadOrderPdf(
  orderInternalId: string,
  fallbackFilename: string,
  options?: { size?: "thermal" | "a4"; senderId?: string }
): Promise<void> {
  const params = new URLSearchParams();
  if (options?.size) params.set("size", options.size);
  if (options?.senderId) params.set("senderId", options.senderId);
  const qs = params.toString();
  const path = `/v1/api/orders/${encodeURIComponent(orderInternalId)}/pdf${
    qs ? `?${qs}` : ""
  }`;
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const headers: Record<string, string> = {};
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    let message = res.statusText || "Download failed";
    try {
      const text = await res.text();
      const body = JSON.parse(text) as { message?: string | string[] };
      if (typeof body.message === "string") message = body.message;
      else if (Array.isArray(body.message)) message = body.message.join(", ");
    } catch {
      /* keep message */
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition");
  let filename = fallbackFilename;
  const quoted = /filename="([^"]+)"/.exec(cd ?? "");
  const unquoted = /filename=([^;\s]+)/.exec(cd ?? "");
  if (quoted?.[1]) filename = quoted[1];
  else if (unquoted?.[1]) filename = unquoted[1].replace(/["']/g, "");

  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function downloadBulkOrdersPdf(
  orderInternalIds: string[],
  fallbackFilename: string,
  options?: { size?: "thermal" | "a4"; senderId?: string }
): Promise<void> {
  const path = endpoints.ordersPdfBulk;
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      ids: orderInternalIds,
      ...(options?.size ? { size: options.size } : {}),
      ...(options?.senderId ? { senderId: options.senderId } : {}),
    }),
  });

  if (!res.ok) {
    let message = res.statusText || "Download failed";
    try {
      const text = await res.text();
      const body = JSON.parse(text) as { message?: string | string[] };
      if (typeof body.message === "string") message = body.message;
      else if (Array.isArray(body.message)) message = body.message.join(", ");
    } catch {
      /* keep message */
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition");
  let filename = fallbackFilename;
  const quoted = /filename="([^"]+)"/.exec(cd ?? "");
  const unquoted = /filename=([^;\s]+)/.exec(cd ?? "");
  if (quoted?.[1]) filename = quoted[1];
  else if (unquoted?.[1]) filename = unquoted[1].replace(/["']/g, "");

  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}
