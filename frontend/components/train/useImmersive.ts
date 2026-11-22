"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

interface OrientationWithLock extends ScreenOrientation {
  lock?: (orientation: "portrait" | string) => Promise<void>;
}

/**
 * Real fullscreen where the browser supports element fullscreen (Android
 * Chrome, desktop). iOS Safari can't fullscreen arbitrary elements, so it gets
 * a fixed, safe-area-aware layer that covers the app chrome instead. Both use
 * the same toggle and the same exit keys.
 */
export function useImmersive(stageRef: RefObject<HTMLElement | null>) {
  const [fullscreen, setFullscreen] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const active = fullscreen || immersive;

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [stageRef]);

  useEffect(() => {
    if (!immersive) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setImmersive(false);
    };
    const onPopState = () => setImmersive(false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("popstate", onPopState);
    // A history entry makes the hardware/Android back button close the layer.
    window.history.pushState({ tuffImmersive: true }, "");
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("popstate", onPopState);
      if (window.history.state?.tuffImmersive) window.history.back();
    };
  }, [immersive]);

  const exit = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    setImmersive(false);
  }, []);

  const toggle = useCallback(async () => {
    const stage = stageRef.current;
    if (!stage) return;
    if (active) {
      exit();
      return;
    }
    try {
      if (typeof stage.requestFullscreen !== "function") throw new Error("no fullscreen");
      await stage.requestFullscreen();
      try {
        const orientation = window.screen.orientation as OrientationWithLock | undefined;
        await orientation?.lock?.("portrait");
      } catch {
        // Orientation lock is optional and often blocked outside fullscreen.
      }
      return;
    } catch {
      // iOS Safari and embedded webviews land here.
    }
    setImmersive(true);
  }, [active, exit, stageRef]);

  return { active, fullscreen, immersive, toggle, exit };
}
