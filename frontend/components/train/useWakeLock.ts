"use client";

import { useEffect, useRef } from "react";

type WakeLockLike = { release(): Promise<void> };
type NavigatorWithWakeLock = Navigator & {
  wakeLock?: { request(type: "screen"): Promise<WakeLockLike> };
};

/** Keeps the screen awake while the camera is live. Unsupported browsers no-op. */
export function useWakeLock(active: boolean) {
  const sentinelRef = useRef<WakeLockLike | null>(null);

  useEffect(() => {
    if (!active || typeof navigator === "undefined") return;
    const wakeLock = (navigator as NavigatorWithWakeLock).wakeLock;
    if (!wakeLock) return;

    let cancelled = false;
    const acquire = async () => {
      if (cancelled || document.visibilityState !== "visible" || sentinelRef.current) return;
      try {
        sentinelRef.current = await wakeLock.request("screen");
      } catch {
        // Denied, unsupported on this device, or hidden tab — try again later.
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void sentinelRef.current?.release().catch(() => {});
      sentinelRef.current = null;
    };
  }, [active]);
}
