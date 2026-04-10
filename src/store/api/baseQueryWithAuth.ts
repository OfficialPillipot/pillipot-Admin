import {
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { getAccessToken } from "../../lib/auth-token";
import { getApiBaseUrl } from "../../api/api-base-url";
import { notifyApiLoading } from "../../api/api-loading";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: getApiBaseUrl(),
  prepareHeaders: (headers, { arg }) => {
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const body =
      typeof arg === "object" &&
      arg !== null &&
      "body" in arg &&
      (arg as { body?: unknown }).body !== undefined
        ? (arg as { body?: unknown }).body
        : undefined;
    if (!(body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
    return headers;
  },
});

function parseError(error: FetchBaseQueryError): Error {
  if ("status" in error && error.status === "FETCH_ERROR") {
    return new Error("Network error");
  }
  const data = "data" in error ? error.data : undefined;
  if (data && typeof data === "object" && "message" in data) {
    const m = (data as { message?: unknown }).message;
    if (typeof m === "string") return new Error(m);
    if (Array.isArray(m)) return new Error(m.join(", "));
  }
  return new Error("Request failed");
}

export const baseQueryWithAuth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const silent = Boolean(
    (extraOptions as { silent?: boolean } | undefined)?.silent,
  );
  if (!silent) notifyApiLoading(1);
  try {
    const result = await rawBaseQuery(args, api, extraOptions);
    if (result.error) {
      return { ...result, error: result.error };
    }
    return result;
  } finally {
    if (!silent) notifyApiLoading(-1);
  }
};

/** For use in `.unwrap()`-style error handling from thunks. */
export function throwIfError<T>(result: {
  data?: T;
  error?: FetchBaseQueryError;
}): T {
  if (result.error) throw parseError(result.error);
  if (result.data === undefined) throw new Error("Empty response");
  return result.data;
}
