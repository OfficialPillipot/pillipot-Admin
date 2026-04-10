import {
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { getAccessToken } from "../../lib/auth-token";
import { getApiBaseUrl } from "../../api/api-base-url";
import { notifyApiLoading } from "../../api/api-loading";
import { getApiErrorMessage } from "../../lib/api-error";

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
  return new Error(getApiErrorMessage(error, "Request failed"));
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
      // Flatten backend text onto the error so `.unwrap()` / UI always see a string `message`
      // (RTK passes this object through as the thrown value).
      const text = getApiErrorMessage(result.error, "");
      if (text) {
        return {
          ...result,
          error: {
            ...result.error,
            message: text,
          } as FetchBaseQueryError,
        };
      }
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
