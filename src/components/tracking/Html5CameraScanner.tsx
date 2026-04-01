import { memo, useEffect, useRef } from "react";
import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats,
} from "html5-qrcode";

export type ScannerMode = "qr" | "barcode";

const QR_FORMATS = [Html5QrcodeSupportedFormats.QR_CODE];

const BARCODE_FORMATS = [
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
];

interface Html5CameraScannerProps {
  /** Stable DOM id for the library (empty div). */
  elementId: string;
  active: boolean;
  mode: ScannerMode;
  onDecoded: (text: string) => void;
  onCameraError?: (message: string) => void;
}

function Html5CameraScannerComponent({
  elementId,
  active,
  mode,
  onDecoded,
  onCameraError,
}: Html5CameraScannerProps) {
  const instanceRef = useRef<Html5Qrcode | null>(null);
  const onDecodedRef = useRef(onDecoded);
  onDecodedRef.current = onDecoded;

  useEffect(() => {
    if (!active) {
      const prev = instanceRef.current;
      instanceRef.current = null;
      if (prev) {
        prev
          .stop()
          .catch(() => {})
          .finally(() => {
            try {
              prev.clear();
            } catch {
              /* ignore */
            }
          });
      }
      return;
    }

    let cancelled = false;
    const formatsToSupport = mode === "qr" ? QR_FORMATS : BARCODE_FORMATS;
    const html5 = new Html5Qrcode(elementId, {
      verbose: false,
      formatsToSupport,
    });
    instanceRef.current = html5;

    html5
      .start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (vw, vh) => {
            const w = Math.min(300, vw * 0.92);
            const h = Math.min(mode === "qr" ? 300 : 180, vh * 0.42);
            return { width: w, height: h };
          },
        },
        (text) => {
          if (!cancelled) onDecodedRef.current(text);
        },
        () => {}
      )
      .catch((e: unknown) => {
        if (!cancelled) {
          onCameraError?.(e instanceof Error ? e.message : String(e));
        }
      });

    return () => {
      cancelled = true;
      instanceRef.current = null;
      html5
        .stop()
        .catch(() => {})
        .finally(() => {
          try {
            html5.clear();
          } catch {
            /* ignore */
          }
        });
    };
  }, [active, mode, elementId, onCameraError]);

  return (
    <div
      id={elementId}
      className="w-full min-h-[220px] overflow-hidden rounded-[var(--radius-md)] bg-black/90"
    />
  );
}

export const Html5CameraScanner = memo(Html5CameraScannerComponent);
