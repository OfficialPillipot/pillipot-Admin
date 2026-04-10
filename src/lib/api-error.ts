/**
 * Pulls human-readable text from Nest/Express JSON bodies and RTK Query error objects.
 */

export function extractMessageFromResponseBody(data: unknown): string | null {
  if (data == null) return null;
  if (typeof data === "string") {
    const t = data.trim();
    if (!t) return null;
    if (
      (t.startsWith("{") || t.startsWith("[")) &&
      t.length > 0 &&
      t.length < 50_000
    ) {
      try {
        const parsed = JSON.parse(t) as unknown;
        const inner = extractMessageFromResponseBody(parsed);
        if (inner) return inner;
      } catch {
        /* plain text */
      }
    }
    return t.length > 2000 ? `${t.slice(0, 2000)}…` : t;
  }
  if (typeof data !== "object") return null;
  const o = data as Record<string, unknown>;

  if (typeof o.message === "string" && o.message.trim()) {
    return o.message.trim();
  }
  if (Array.isArray(o.message)) {
    const parts = o.message
      .map((x) => (typeof x === "string" ? x.trim() : String(x).trim()))
      .filter(Boolean);
    if (parts.length) return parts.join(", ");
  }

  if (typeof o.error === "string" && o.error.trim()) {
    return o.error.trim();
  }

  // Some validation payloads nest field errors
  if (o.errors && typeof o.errors === "object" && o.errors !== null) {
    const nested = extractMessageFromResponseBody(o.errors);
    if (nested) return nested;
    const flat = Object.values(o.errors as Record<string, unknown>)
      .flatMap((v) => (Array.isArray(v) ? v : [v]))
      .map((x) => (typeof x === "string" ? x : String(x)))
      .filter(Boolean);
    if (flat.length) return flat.join(", ");
  }

  return null;
}

/** Use for thrown/caught values from fetch, api client, or RTK Query `.unwrap()`. */
export function getApiErrorMessage(
  error: unknown,
  fallback = "Request failed",
): string {
  if (typeof error === "string") {
    const t = error.trim();
    return t || fallback;
  }

  if (error instanceof Error) {
    const m = error.message.trim();
    if (m) return m;
  }

  if (!error || typeof error !== "object") return fallback;

  const e = error as Record<string, unknown>;

  if (e.status === "FETCH_ERROR" || e.status === "TIMEOUT_ERROR") {
    if (typeof e.error === "string" && e.error.trim()) return e.error.trim();
    return e.status === "TIMEOUT_ERROR" ? "Request timed out" : "Network error";
  }

  if (e.status === "PARSING_ERROR") {
    if (typeof e.error === "string" && e.error.trim()) return e.error.trim();
    return "Could not parse server response";
  }

  if ("data" in e) {
    const fromData = extractMessageFromResponseBody(e.data);
    if (fromData) return fromData;
  }

  const direct = extractMessageFromResponseBody(error);
  if (direct) return direct;

  if (typeof e.message === "string" && e.message.trim()) {
    const msg = e.message.trim();
    if (msg !== "Rejected") return msg;
  }

  return fallback;
}
