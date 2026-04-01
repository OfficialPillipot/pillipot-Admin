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
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
];

/** High-res first; many devices fall back if unsupported. */
const BARCODE_VIDEO_HD: MediaTrackConstraints = {
  facingMode: "environment",
  width: { ideal: 1920, min: 640 },
  height: { ideal: 1080, min: 480 },
};

const BARCODE_VIDEO_SD: MediaTrackConstraints = {
  facingMode: "environment",
  width: { ideal: 1280, min: 480 },
  height: { ideal: 720, min: 360 },
};

type BarcodeCameraTry =
  | { preset: "hd" | "sd"; videoConstraints: MediaTrackConstraints }
  | { preset: "default" };

const BARCODE_CAMERA_TRIES: BarcodeCameraTry[] = [
  { preset: "hd", videoConstraints: BARCODE_VIDEO_HD },
  { preset: "sd", videoConstraints: BARCODE_VIDEO_SD },
  { preset: "default" },
];

interface Html5CameraScannerProps {
  /** Stable DOM id for the library (empty div). */
  elementId: string;
  active: boolean;
  mode: ScannerMode;
  onDecoded: (text: string) => void;
  onCameraError?: (message: string) => void;
  /**
   * When true (barcode mode only), skip the browser BarcodeDetector and use ZXing only.
   * Try on devices where the native path mis-reads or misses Code 128.
   */
  barcodeSoftwareDecoderOnly?: boolean;
  /**
   * When true (barcode mode only), scan almost the full preview (easier alignment; more CPU).
   */
  barcodeFullFrame?: boolean;
}

function Html5CameraScannerComponent({
  elementId,
  active,
  mode,
  onDecoded,
  onCameraError,
  barcodeSoftwareDecoderOnly = false,
  barcodeFullFrame = false,
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
    /** In-flight instance before `instanceRef` is assigned (so unmount can always stop the camera). */
    let scopedInstance: Html5Qrcode | null = null;

    const stopAndClear = (h: Html5Qrcode) =>
      h
        .stop()
        .catch(() => {})
        .finally(() => {
          try {
            h.clear();
          } catch {
            /* ignore */
          }
        });

    const qrbox = (vw: number, vh: number) => {
      if (mode === "qr") {
        const side = Math.min(
          300,
          Math.floor(vw * 0.9),
          Math.floor(vh * 0.72)
        );
        return { width: side, height: side };
      }
      if (barcodeFullFrame) {
        const w = Math.max(50, Math.floor(vw - 12));
        const h = Math.max(50, Math.floor(vh - 12));
        return { width: w, height: h };
      }
      const w = Math.max(50, Math.floor(vw - 16));
      const h = Math.max(88, Math.min(220, Math.floor(vh * 0.38)));
      return { width: w, height: h };
    };

    const noopErr = () => {};

    const run = async () => {
      const libConfig = {
        verbose: false as const,
        formatsToSupport: mode === "qr" ? QR_FORMATS : BARCODE_FORMATS,
        useBarCodeDetectorIfSupported:
          mode === "barcode" ? !barcodeSoftwareDecoderOnly : true,
      };

      if (mode === "qr") {
        const html5 = new Html5Qrcode(elementId, libConfig);
        scopedInstance = html5;
        try {
          await html5.start(
            { facingMode: "environment" },
            { fps: 10, qrbox, disableFlip: false },
            (text) => {
              if (!cancelled) onDecodedRef.current(text);
            },
            noopErr
          );
          if (cancelled) {
            void stopAndClear(html5);
            scopedInstance = null;
            return;
          }
          instanceRef.current = html5;
          scopedInstance = null;
        } catch (e: unknown) {
          scopedInstance = null;
          try {
            html5.clear();
          } catch {
            /* ignore */
          }
          if (!cancelled) {
            onCameraError?.(e instanceof Error ? e.message : String(e));
          }
        }
        return;
      }

      let lastError: unknown = null;
      for (const attempt of BARCODE_CAMERA_TRIES) {
        if (cancelled) return;
        const html5 = new Html5Qrcode(elementId, libConfig);
        scopedInstance = html5;
        const scanBase = {
          fps: 12,
          qrbox,
          disableFlip: true as const,
        };
        try {
          if (attempt.preset === "default") {
            await html5.start(
              { facingMode: "environment" },
              scanBase,
              (text) => {
                if (!cancelled) onDecodedRef.current(text);
              },
              noopErr
            );
          } else {
            await html5.start(
              attempt.videoConstraints,
              {
                ...scanBase,
                videoConstraints: attempt.videoConstraints,
              },
              (text) => {
                if (!cancelled) onDecodedRef.current(text);
              },
              noopErr
            );
          }
          if (cancelled) {
            void stopAndClear(html5);
            scopedInstance = null;
            return;
          }
          instanceRef.current = html5;
          scopedInstance = null;
          return;
        } catch (e: unknown) {
          lastError = e;
          scopedInstance = null;
          try {
            await html5.stop();
          } catch {
            /* ignore */
          }
          try {
            html5.clear();
          } catch {
            /* ignore */
          }
          if (cancelled) return;
        }
      }
      if (!cancelled) {
        onCameraError?.(
          lastError instanceof Error ? lastError.message : String(lastError)
        );
      }
    };

    void run();

    return () => {
      cancelled = true;
      const inst = instanceRef.current ?? scopedInstance;
      instanceRef.current = null;
      scopedInstance = null;
      if (inst) void stopAndClear(inst);
    };
  }, [
    active,
    mode,
    elementId,
    onCameraError,
    barcodeSoftwareDecoderOnly,
    barcodeFullFrame,
  ]);

  return (
    <div
      id={elementId}
      className={
        mode === "barcode"
          ? "w-full min-h-[300px] overflow-hidden rounded-[var(--radius-md)] bg-black/90 sm:min-h-[340px]"
          : "w-full min-h-[220px] overflow-hidden rounded-[var(--radius-md)] bg-black/90"
      }
    />
  );
}

export const Html5CameraScanner = memo(Html5CameraScannerComponent);
