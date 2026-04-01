import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TrashIcon } from "@heroicons/react/24/outline";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  fetchOrders,
  selectOrders,
  updateOrder,
} from "../store/ordersSlice";
import { Html5CameraScanner } from "../components/tracking/Html5CameraScanner";
import { Button, Card, CardHeader, Table, type Column } from "../components/ui";
import { toast } from "../lib/toast";

type QueueRow = {
  key: string;
  orderId: string;
  trackingId: string;
  lineIds: string[];
};

function extractOrderIdFromScan(raw: string): string {
  const t = raw.trim();
  const m = t.match(/\b(ORD-\d+)\b/i);
  if (m) return m[1].toUpperCase();
  return t;
}

function normalizeTrackingId(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

function lineIdsForDisplayOrderId(
  displayId: string,
  orders: { id: string; orderId: string }[]
): string[] {
  const want = displayId.trim().toUpperCase();
  return orders
    .filter((o) => o.orderId.trim().toUpperCase() === want)
    .map((o) => o.id);
}

function useStableElementId(prefix: string): string {
  return useMemo(
    () => `${prefix}-${Math.random().toString(36).slice(2, 11)}`,
    [prefix]
  );
}

function TrackingScannerPage() {
  const dispatch = useAppDispatch();
  const orders = useAppSelector(selectOrders);
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [saveBusy, setSaveBusy] = useState(false);

  /** null = idle; order = scanning PDF QR; tracking = scanning post label barcode */
  const [scanPhase, setScanPhase] = useState<null | "order" | "tracking">(
    null
  );
  const [draftOrderId, setDraftOrderId] = useState<string | null>(null);
  const [manualOrder, setManualOrder] = useState("");
  const [manualTracking, setManualTracking] = useState("");

  const orderBoxId = useStableElementId("h5-order");
  const trackingBoxId = useStableElementId("h5-tracking");

  const lastDecodeRef = useRef<{ t: number; text: string }>({
    t: 0,
    text: "",
  });

  const dedupeDecode = useCallback((text: string): boolean => {
    const now = Date.now();
    const prev = lastDecodeRef.current;
    if (prev.text === text && now - prev.t < 1800) return false;
    lastDecodeRef.current = { t: now, text };
    return true;
  }, []);

  useEffect(() => {
    void dispatch(fetchOrders());
  }, [dispatch]);

  const resolveAndAppendRow = useCallback(
    (orderId: string, trackingRaw: string) => {
      const oid = extractOrderIdFromScan(orderId);
      const tid = normalizeTrackingId(trackingRaw);
      if (!tid) {
        toast.error("Tracking id empty");
        return;
      }
      const lineIds = lineIdsForDisplayOrderId(oid, orders);
      if (lineIds.length === 0) {
        toast.warning(
          `No order lines loaded for "${oid}" — refresh orders or check the id.`
        );
      } else {
        toast.success(`Queued ${oid}`);
      }
      setQueue((q) => [
        ...q,
        {
          key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          orderId: oid,
          trackingId: tid,
          lineIds,
        },
      ]);
      setDraftOrderId(null);
      setScanPhase(null);
    },
    [orders]
  );

  const onOrderDecoded = useCallback(
    (text: string) => {
      if (!dedupeDecode(text)) return;
      const oid = extractOrderIdFromScan(text);
      if (!oid) {
        toast.error("Could not read order id from scan");
        return;
      }
      setDraftOrderId(oid);
      setScanPhase("tracking");
    },
    [dedupeDecode]
  );

  const onTrackingDecoded = useCallback(
    (text: string) => {
      if (!dedupeDecode(text)) return;
      if (!draftOrderId) {
        toast.error("Scan the order QR first");
        return;
      }
      resolveAndAppendRow(draftOrderId, text);
    },
    [dedupeDecode, draftOrderId, resolveAndAppendRow]
  );

  const onCameraError = useCallback((msg: string) => {
    toast.error(msg || "Camera failed to start (use HTTPS on mobile)");
  }, []);

  const removeRow = useCallback((key: string) => {
    setQueue((q) => q.filter((r) => r.key !== key));
  }, []);

  const addManualRow = useCallback(() => {
    if (!manualOrder.trim() || !manualTracking.trim()) {
      toast.error("Enter both order id and tracking id");
      return;
    }
    resolveAndAppendRow(manualOrder, manualTracking);
    setManualOrder("");
    setManualTracking("");
  }, [manualOrder, manualTracking, resolveAndAppendRow]);

  const saveAll = useCallback(async () => {
    const blocked = queue.filter((r) => r.lineIds.length === 0);
    if (blocked.length > 0) {
      toast.error(
        "Some rows have no matching order lines. Refresh orders or fix ids before saving."
      );
      return;
    }
    if (queue.length === 0) {
      toast.error("Nothing to save");
      return;
    }
    setSaveBusy(true);
    try {
      for (const row of queue) {
        for (const id of row.lineIds) {
          await dispatch(
            updateOrder({ id, patch: { trackingId: row.trackingId } })
          ).unwrap();
        }
      }
      toast.success("Tracking ids saved");
      setQueue([]);
      await dispatch(fetchOrders()).unwrap();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Save failed — check permissions"
      );
    } finally {
      setSaveBusy(false);
    }
  }, [dispatch, queue]);

  const queueColumns: Column<QueueRow>[] = useMemo(
    () => [
      {
        key: "orderId",
        header: "Order",
        render: (r) => (
          <span className="font-mono text-sm">{r.orderId}</span>
        ),
      },
      {
        key: "trackingId",
        header: "Tracking",
        render: (r) => (
          <span className="font-mono text-sm">{r.trackingId}</span>
        ),
      },
      {
        key: "lineIds",
        header: "Lines",
        render: (r) =>
          r.lineIds.length > 0 ? (
            String(r.lineIds.length)
          ) : (
            <span className="text-error">No match</span>
          ),
      },
      {
        key: "actions",
        header: "",
        mobileHeaderEnd: true,
        render: (r) => (
          <button
            type="button"
            className="rounded p-1 text-text-muted hover:bg-surface-alt hover:text-error"
            aria-label="Remove row"
            onClick={() => removeRow(r.key)}
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        ),
      },
    ],
    [removeRow]
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 pb-16 md:p-6">
      <Card>
        <CardHeader
          title="Tracking scan"
          subtitle="1) Scan the order QR on the delivery PDF. 2) Scan the post-office barcode. Repeat, then Save. Camera needs HTTPS on phones (or localhost)."
        />
        <div className="space-y-4 px-4 pb-4 md:px-6 md:pb-6">
          {draftOrderId && scanPhase === "tracking" && (
            <p className="rounded-[var(--radius-md)] bg-primary-muted px-3 py-2 text-sm text-text">
              Order <span className="font-mono font-semibold">{draftOrderId}</span>{" "}
              — now scan the tracking barcode
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={scanPhase === "order" ? "primary" : "secondary"}
              onClick={() => {
                setDraftOrderId(null);
                setScanPhase("order");
              }}
            >
              {scanPhase === "order" ? "Scanning order QR…" : "Scan order QR"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!draftOrderId}
              onClick={() => setScanPhase("tracking")}
            >
              Scan tracking only
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setScanPhase(null);
                setDraftOrderId(null);
              }}
            >
              Stop camera
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void dispatch(fetchOrders())}
            >
              Refresh orders
            </Button>
          </div>

          {scanPhase === "order" && (
            <Html5CameraScanner
              elementId={orderBoxId}
              active
              mode="qr"
              onDecoded={onOrderDecoded}
              onCameraError={onCameraError}
            />
          )}
          {scanPhase === "tracking" && (
            <Html5CameraScanner
              elementId={trackingBoxId}
              active
              mode="barcode"
              onDecoded={onTrackingDecoded}
              onCameraError={onCameraError}
            />
          )}

          <div className="border-t border-border pt-4">
            <p className="mb-2 text-sm font-medium text-text">Manual entry</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
              <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-xs text-text-muted">
                Order id
                <input
                  id="ts-manual-order"
                  value={manualOrder}
                  onChange={(e) => setManualOrder(e.target.value)}
                  className="rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm text-text"
                  placeholder="ORD-1008"
                  autoComplete="off"
                />
              </label>
              <label className="flex min-w-[160px] flex-1 flex-col gap-1 text-xs text-text-muted">
                Tracking id
                <input
                  id="ts-manual-tracking"
                  value={manualTracking}
                  onChange={(e) => setManualTracking(e.target.value)}
                  className="rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm text-text"
                  placeholder="EL 38746773 8IN"
                  autoComplete="off"
                />
              </label>
              <Button type="button" variant="secondary" onClick={addManualRow}>
                Add to queue
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Queue"
          subtitle={`${queue.length} package(s) — Save updates every line for that display order id.`}
        />
        <div className="space-y-3 px-4 pb-4 md:px-6 md:pb-6">
          <Table<QueueRow>
            columns={queueColumns}
            data={queue}
            keyExtractor={(r) => r.key}
            emptyMessage="No rows yet."
          />
          <Button
            type="button"
            fullWidth
            loading={saveBusy}
            disabled={queue.length === 0 || saveBusy}
            onClick={() => void saveAll()}
          >
            Save all tracking ids
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default memo(TrackingScannerPage);
