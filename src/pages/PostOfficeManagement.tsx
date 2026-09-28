import { memo, useCallback, useMemo, useState } from "react";
import {
  useIndiaPostBulkTrackingMutation,
  useIndiaPostLoginTestMutation,
} from "../store/api/edenApi";
import { Card, CardHeader, Button, Input } from "../components/ui";
import { toast } from "../lib/toast";
import { isIndiaPostDirectDevProxy } from "../lib/india-post-dev-proxy";

const MAX_ARTICLES = 50;

function parseArticleList(raw: string): string[] {
  const parts = raw
    .split(/[\s,;]+/u)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    if (seen.has(p)) continue;
    seen.add(p);
    out.push(p);
    if (out.length >= MAX_ARTICLES) break;
  }
  return out;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function bulkTrackingRows(res: unknown): unknown[] {
  if (!isRecord(res)) return [];
  const d = res.data;
  return Array.isArray(d) ? d : [];
}

function loginExpiresSeconds(r: unknown): number | null {
  if (!isRecord(r)) return null;
  if (typeof r.expiresIn === "number") return r.expiresIn;
  const d = r.data;
  if (isRecord(d) && typeof d.expires_in === "number") return d.expires_in;
  return null;
}

function indiaPostAccessTokenFromLogin(r: unknown): string | null {
  if (!isRecord(r)) return null;
  const d = r.data;
  if (isRecord(d) && typeof d.access_token === "string") return d.access_token;
  return null;
}

function PostOfficeManagementPage() {
  const directProxy = isIndiaPostDirectDevProxy();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [articlesText, setArticlesText] = useState("");
  const [lastPayload, setLastPayload] = useState<unknown>(null);
  /** India Post bearer — only used when Vite proxies straight to CEPT (dev, no API base URL). */
  const [indiaPostAccessToken, setIndiaPostAccessToken] = useState<string | null>(
    null,
  );

  const [loginTest, loginState] = useIndiaPostLoginTestMutation();
  const [bulkTrack, trackState] = useIndiaPostBulkTrackingMutation();

  const onTestConnection = useCallback(async () => {
    const u = username.trim();
    const hasU = u.length > 0;
    const hasP = password.length > 0;
    if (hasU !== hasP) {
      if (directProxy) {
        const hasVite =
          Boolean(import.meta.env.VITE_INDIA_POST_USERNAME?.trim()) &&
          Boolean(import.meta.env.VITE_INDIA_POST_PASSWORD);
        if (!hasVite) {
          toast.error(
            "Enter both India Post username and password, or set VITE_INDIA_POST_USERNAME / VITE_INDIA_POST_PASSWORD in the admin .env for local CEPT proxy.",
          );
          return;
        }
      } else {
        toast.error(
          "Enter both India Post username and password, or leave both empty to use the API server configuration.",
        );
        return;
      }
    }
    try {
      const body = hasU && hasP ? { username: u, password } : {};
      const r = await loginTest(body).unwrap();
      const token = indiaPostAccessTokenFromLogin(r);
      if (token) setIndiaPostAccessToken(token);
      else setIndiaPostAccessToken(null);
      const exp = loginExpiresSeconds(r);
      toast.success(
        exp != null
          ? `India Post login OK (access token TTL ~${String(exp)}s).`
          : "India Post login OK.",
      );
    } catch (e) {
      toast.fromError(e, "India Post login failed");
    }
  }, [loginTest, username, password, directProxy]);

  const onTrack = useCallback(async () => {
    const bulk = parseArticleList(articlesText);
    if (bulk.length === 0) {
      toast.error("Enter at least one article number (e.g. EB126023474IN).");
      return;
    }
    try {
      const data = await bulkTrack({
        bulk,
        accessToken: directProxy ? indiaPostAccessToken : undefined,
      }).unwrap();
      setLastPayload(data);
      toast.success("Tracking data retrieved.");
    } catch (e) {
      setLastPayload(null);
      toast.fromError(e, "Tracking request failed");
    }
  }, [articlesText, bulkTrack, directProxy, indiaPostAccessToken]);

  const rows = useMemo(() => bulkTrackingRows(lastPayload), [lastPayload]);

  return (
    <div className="space-y-4">
      <Card>
        <p className="mb-3 max-w-3xl text-sm text-text-muted">
          {directProxy ? (
            <>
              <strong className="font-medium text-text">Local dev:</strong>{" "}
              <code className="rounded bg-muted/60 px-1 py-0.5 text-xs">
                /v1/api/india-post/*
              </code>{" "}
              is proxied by Vite straight to{" "}
              <code className="rounded bg-muted/60 px-1 py-0.5 text-xs">
                https://test.cept.gov.in/beextcustomer/v1
              </code>{" "}
              (no Nest hop). Use the form or{" "}
              <code className="rounded bg-muted/60 px-1 py-0.5 text-xs">
                VITE_INDIA_POST_*
              </code>{" "}
              in the admin .env. After login, the app keeps the India Post access token for
              tracking. Other <code className="rounded bg-muted/60 px-1 py-0.5 text-xs">
                /v1/api
              </code>{" "}
              routes still go to Nest on port 3000.
            </>
          ) : (
            <>
              Requests go to your Eden API, which calls India Post at{" "}
              <code className="rounded bg-muted/60 px-1 py-0.5 text-xs">
                test.cept.gov.in
              </code>
              . Use server{" "}
              <code className="rounded bg-muted/60 px-1 py-0.5 text-xs">
                INDIA_POST_*
              </code>{" "}
              env vars or the fields below. Set{" "}
              <code className="rounded bg-muted/60 px-1 py-0.5 text-xs">
                VITE_API_BASE_URL=http://localhost:3000
              </code>{" "}
              in the admin .env to force this mode while on Vite.
            </>
          )}{" "}
          Bulk tracking: up to {MAX_ARTICLES} articles per request.
        </p>
        <details className="mb-4 max-w-3xl rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-text-muted">
          <summary className="cursor-pointer font-medium text-text">
            Testing with curl
          </summary>
          <div className="mt-2 space-y-2">
            <p>
              <span className="font-medium text-text">India Post only</span> (no Eden JWT) — same
              as your sandbox check:
            </p>
            <pre className="overflow-x-auto rounded bg-muted/50 p-2 text-[11px] leading-relaxed">
              {`curl -sS -X POST "https://test.cept.gov.in/beextcustomer/v1/access/login" \\
  -H "Content-Type: application/json" \\
  -d '{"username":"YOUR_INDIA_POST_USER","password":"YOUR_INDIA_POST_PASS"}'`}
            </pre>
            <p>
              <span className="font-medium text-text">Through Eden API</span> — requires an admin
              JWT (login in the app first, or call auth):
            </p>
            <pre className="overflow-x-auto rounded bg-muted/50 p-2 text-[11px] leading-relaxed">
              {`# 1) Eden login → copy access_token from response
curl -sS -X POST "http://localhost:3000/v1/api/auth/login" \\
  -H "Content-Type: application/json" \\
  -d '{"username":"YOUR_EDEN_ADMIN_USER","password":"YOUR_EDEN_ADMIN_PASS"}'

# 2) Proxy uses India Post creds from .env.development (or send username/password in JSON)
curl -sS -X POST "http://localhost:3000/v1/api/india-post/login-test" \\
  -H "Authorization: Bearer ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{}'`}
            </pre>
            <p>
              With default dev setup,{" "}
              <code className="rounded bg-muted/60 px-1">
                POST http://localhost:5173/v1/api/india-post/login-test
              </code>{" "}
              is rewritten by Vite to CEPT{" "}
              <code className="rounded bg-muted/60 px-1">/access/login</code> (no Eden JWT). With{" "}
              <code className="rounded bg-muted/60 px-1">VITE_API_BASE_URL</code> pointing at Nest,
              that path is handled by the API instead.
            </p>
          </div>
        </details>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Session
              {directProxy
                ? " (or VITE_INDIA_POST_USERNAME / VITE_INDIA_POST_PASSWORD)"
                : " (optional if API has INDIA_POST_USERNAME / INDIA_POST_PASSWORD)"}
            </p>
            <Input
              label="India Post username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. customer ID or mobile"
              autoComplete="username"
            />
            <Input
              label="India Post password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <Button
              type="button"
              variant="secondary"
              disabled={loginState.isLoading}
              onClick={() => void onTestConnection()}
            >
              {loginState.isLoading ? "Testing…" : "Test connection"}
            </Button>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Bulk tracking
            </p>
            <label className="block text-sm font-medium text-text">
              Article numbers (comma, space, or newline — max {MAX_ARTICLES})
            </label>
            <textarea
              className="min-h-[140px] w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
              value={articlesText}
              onChange={(e) => setArticlesText(e.target.value)}
              placeholder={"EB126023474IN\nEB126023770IN"}
              spellCheck={false}
            />
            <Button
              type="button"
              variant="primary"
              disabled={trackState.isLoading}
              onClick={() => void onTrack()}
            >
              {trackState.isLoading ? "Fetching…" : "Track articles"}
            </Button>
          </div>
        </div>
      </Card>

      {rows.length > 0 ? (
        <Card>
          <CardHeader title="Latest results" />
          <div className="space-y-4">
            {rows.map((row, idx) => {
              if (!isRecord(row)) {
                return (
                  <pre
                    key={`row-${String(idx)}`}
                    className="max-h-64 overflow-auto rounded-md border border-border bg-muted/30 p-3 text-xs"
                  >
                    {JSON.stringify(row, null, 2)}
                  </pre>
                );
              }
              const booking = isRecord(row.booking_details)
                ? row.booking_details
                : null;
              const article =
                typeof booking?.article_number === "string"
                  ? booking.article_number
                  : `Article ${String(idx + 1)}`;
              const events = Array.isArray(row.tracking_details)
                ? row.tracking_details
                : [];
              const lastEv = events.length > 0 ? events[events.length - 1] : null;
              const del = isRecord(row.del_status) ? row.del_status : null;
              const status =
                typeof del?.del_status === "string" ? del.del_status : "—";

              return (
                <div
                  key={article}
                  className="rounded-[var(--radius-md)] border border-border bg-surface p-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-sm font-semibold text-text">{article}</h3>
                    <span className="text-xs text-text-muted">
                      Status: <span className="font-medium text-text">{status}</span>
                    </span>
                  </div>
                  {booking ? (
                    <dl className="mt-2 grid gap-1 text-xs text-text-muted sm:grid-cols-2">
                      {typeof booking.booked_at === "string" ? (
                        <>
                          <dt className="font-medium text-text">Booked at</dt>
                          <dd>{booking.booked_at}</dd>
                        </>
                      ) : null}
                      {typeof booking.destination_pincode === "string" ? (
                        <>
                          <dt className="font-medium text-text">Destination PIN</dt>
                          <dd>{booking.destination_pincode}</dd>
                        </>
                      ) : null}
                      {typeof booking.delivery_location === "string" ? (
                        <>
                          <dt className="font-medium text-text">Delivery office</dt>
                          <dd>{booking.delivery_location}</dd>
                        </>
                      ) : null}
                    </dl>
                  ) : null}
                  {lastEv && isRecord(lastEv) ? (
                    <p className="mt-2 text-xs text-text-muted">
                      Last event:{" "}
                      <span className="text-text">
                        {typeof lastEv.event === "string" ? lastEv.event : "—"}
                      </span>
                      {typeof lastEv.office === "string" ? ` — ${lastEv.office}` : ""}
                      {typeof lastEv.date === "string" || typeof lastEv.time === "string"
                        ? ` (${String(lastEv.date ?? "").slice(0, 10)} ${String(lastEv.time ?? "")})`
                        : ""}
                    </p>
                  ) : null}
                  {events.length > 1 ? (
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer text-text-muted hover:text-text">
                        Full trail ({events.length} events)
                      </summary>
                      <ol className="mt-2 list-decimal space-y-1 pl-5 text-text-muted">
                        {events.map((ev, i) =>
                          isRecord(ev) ? (
                            <li key={`${article}-ev-${String(i)}`}>
                              {typeof ev.event === "string" ? ev.event : "—"}
                              {typeof ev.office === "string" ? ` — ${ev.office}` : ""}
                            </li>
                          ) : (
                            <li key={`${article}-ev-${String(i)}`}>
                              {JSON.stringify(ev)}
                            </li>
                          ),
                        )}
                      </ol>
                    </details>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Card>
      ) : lastPayload !== null ? (
        <Card>
          <CardHeader title="Raw response" />
          <pre className="max-h-[480px] overflow-auto rounded-md border border-border bg-muted/30 p-3 text-xs">
            {JSON.stringify(lastPayload, null, 2)}
          </pre>
        </Card>
      ) : null}
    </div>
  );
}

export default memo(PostOfficeManagementPage);
