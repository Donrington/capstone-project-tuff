"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import styles from "./Popover.module.css";

interface PopoverProps {
  open: boolean;
  onClose: () => void;
  /** The element the panel hangs off. */
  anchorRef: RefObject<HTMLElement | null>;
  /** "right" opens beside the anchor, bottom-aligned — for menus hung off a
   *  side nav. It flips to the left if there's no room. */
  side?: "bottom" | "right";
  align?: "start" | "end" | "center";
  /** Take the anchor's width — for a search field's results. */
  matchWidth?: boolean;
  id?: string;
  role?: string;
  "aria-label"?: string;
  className?: string;
  children: ReactNode;
}

const GAP = 8;
const EDGE = 8;

/**
 * Panel on the native `popover` attribute, so the browser handles the top
 * layer, light dismiss and Escape. It hangs off the anchor's bounding rect
 * and flips above when there isn't room below.
 */
export function Popover({
  open,
  onClose,
  anchorRef,
  side = "bottom",
  align = "start",
  matchWidth,
  className,
  children,
  ...rest
}: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width?: number } | null>(null);

  const place = useCallback(() => {
    const panel = ref.current;
    const anchor = anchorRef.current;
    if (!panel || !anchor) return;

    const a = anchor.getBoundingClientRect();
    const p = panel.getBoundingClientRect();
    const width = matchWidth ? a.width : undefined;
    const w = width ?? p.width;

    if (side === "right") {
      let left = a.right + GAP;
      if (left + w > window.innerWidth - EDGE) left = Math.max(EDGE, a.left - GAP - w);
      const top = Math.min(
        Math.max(EDGE, a.bottom - p.height),
        Math.max(EDGE, window.innerHeight - p.height - EDGE),
      );
      setPos({ top, left, width });
      return;
    }

    let top = a.bottom + GAP;
    const overflowsBelow = top + p.height > window.innerHeight - EDGE;
    const fitsAbove = a.top - GAP - p.height > EDGE;
    if (overflowsBelow && fitsAbove) top = a.top - GAP - p.height;

    let left = a.left;
    if (align === "end") left = a.right - w;
    else if (align === "center") left = a.left + a.width / 2 - w / 2;
    left = Math.min(Math.max(EDGE, left), Math.max(EDGE, window.innerWidth - w - EDGE));

    setPos({ top, left, width });
  }, [align, anchorRef, matchWidth, side]);

  useEffect(() => {
    const panel = ref.current;
    if (!panel) return;
    if (open) {
      if (!panel.matches(":popover-open")) panel.showPopover();
      place();
    } else {
      if (panel.matches(":popover-open")) panel.hidePopover();
      setPos(null);
    }
  }, [open, place]);

  // Light dismiss and Escape close it without React knowing — sync back.
  useEffect(() => {
    const panel = ref.current;
    if (!panel) return;
    const handleToggle = (event: Event) => {
      if ((event as Event & { newState?: string }).newState === "closed") onClose();
    };
    panel.addEventListener("toggle", handleToggle);
    return () => panel.removeEventListener("toggle", handleToggle);
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const handle = () => place();
    window.addEventListener("resize", handle);
    window.addEventListener("scroll", handle, true);
    return () => {
      window.removeEventListener("resize", handle);
      window.removeEventListener("scroll", handle, true);
    };
  }, [open, place]);

  return (
    <div
      ref={ref}
      popover="auto"
      className={[styles.panel, className].filter(Boolean).join(" ")}
      style={{
        top: pos?.top ?? 0,
        left: pos?.left ?? 0,
        width: pos?.width,
        // Invisible until placed. Not visibility: hidden, which would stop a
        // Menu from moving focus into the panel as it opens.
        opacity: pos ? undefined : 0,
        pointerEvents: pos ? undefined : "none",
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
