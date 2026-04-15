/**
 * API origin for fetch calls. Paths in endpoints.ts already start with `/v1/api`.
 *
 * - Dev: empty string → same-origin + Vite proxy (see vite.config.ts).
 * - Production build: Railway API unless `VITE_API_BASE_URL` is set.
 */
const PRODUCTION_API_ORIGIN = "https://api.pillipot.com";

export function getApiBaseUrl(): string {
  const env = import.meta.env.VITE_API_BASE_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  if (import.meta.env.PROD) return PRODUCTION_API_ORIGIN;
  return "";
}
