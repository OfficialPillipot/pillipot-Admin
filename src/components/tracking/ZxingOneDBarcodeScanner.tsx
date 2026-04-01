import { memo, useEffect, useRef } from "react";
import {
  BrowserCodeReader,
  BrowserMultiFormatOneDReader,
} from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";

const VIDEO_CONSTRAINTS_TRIES: MediaStreamConstraints[] = [
  {
    video: {
      facingMode: "environment",
      width: { ideal: 1920, min: 640 },
      height: { ideal: 1080, min: 480 },
    },
  },
  {
    video: {
      facingMode: "environment",
      width: { ideal: 1280, min: 480 },
      height: { ideal: 720, min: 360 },
    },
  },
  {
    video: { facingMode: "environment" },
  },
];

interface ZxingOneDBarcodeScannerProps {
  active: boolean;
  onDecoded: (text: string) => void;
  onCameraError?: (message: string) => void;
}

/**
 * ZXing MultiFormatOneDReader on the live camera — often reads Code 128 / postal
 * barcodes more reliably than html5-qrcode on mid-range Android phones.
 */
function ZxingOneDBarcodeScannerComponent({
  active,
  onDecoded,
  onCameraError,
}: ZxingOneDBarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDecodedRef = useRef(onDecoded);
  onDecodedRef.current = onDecoded;

  useEffect(() => {
    if (!active) return;

    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    let controls: IScannerControls | null = null;

    const run = async () => {
      let lastErr: unknown = null;
      for (const constraints of VIDEO_CONSTRAINTS_TRIES) {
        if (cancelled) return;
        const reader = new BrowserMultiFormatOneDReader(undefined, {
          delayBetweenScanAttempts: 50,
          delayBetweenScanSuccess: 900,
          tryPlayVideoTimeout: 9000,
        });
        try {
          const c = await reader.decodeFromConstraints(
            constraints,
            video,
            (result) => {
              if (cancelled || !result) return;
              const text = result.getText();
              if (text) onDecodedRef.current(text);
            }
          );
          if (cancelled) {
            c.stop();
            return;
          }
          controls = c;
          return;
        } catch (e: unknown) {
          lastErr = e;
          try {
            BrowserCodeReader.cleanVideoSource(video);
          } catch {
            /* ignore */
          }
        }
      }
      if (!cancelled) {
        onCameraError?.(
          lastErr instanceof Error
            ? lastErr.message
            : String(lastErr ?? "Could not start barcode camera")
        );
      }
    };

    void run();

    return () => {
      cancelled = true;
      try {
        controls?.stop();
      } catch {
        /* ignore */
      }
      controls = null;
      const v = videoRef.current;
      if (v) {
        try {
          BrowserCodeReader.cleanVideoSource(v);
        } catch {
          /* ignore */
        }
      }
    };
  }, [active, onCameraError]);

  if (!active) {
    return (
      <div className="w-full min-h-[300px] overflow-hidden rounded-[var(--radius-md)] bg-black/90 sm:min-h-[340px]" />
    );
  }

  return (
    <div className="w-full min-h-[300px] overflow-hidden rounded-[var(--radius-md)] bg-black/90 sm:min-h-[340px]">
      <video
        ref={videoRef}
        className="h-full w-full min-h-[300px] object-cover sm:min-h-[340px]"
        playsInline
        muted
        autoPlay
        aria-label="Barcode camera preview"
      />
    </div>
  );
}

export const ZxingOneDBarcodeScanner = memo(ZxingOneDBarcodeScannerComponent);
