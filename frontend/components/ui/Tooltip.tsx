"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./Tooltip.module.css";

interface TooltipProps {
  /** Visual only — the child must already carry this as its accessible name. */
  label: ReactNode;
  enabled?: boolean;
  className?: string;
  children: ReactNode;
}

const GAP = 12;
const HIDE_DELAY = 90;

/**
 * A label that appears to the right of its child on hover and on keyboard
 * focus. It lives in the top layer (`popover`), so an ancestor's overflow
 * can't clip it. It's hidden from assistive tech because the child already
 * says the same thing. Escape dismisses it, and it stays put while the
 * pointer moves onto it.
 */
export function Tooltip({ label, enabled = true, className, children }: TooltipProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const hideTimer = useRef<number | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const visible = open && enabled;

  function show() {
    window.clearTimeout(hideTimer.current);
    setOpen(true);
  }
  function hide() {
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setOpen(false), HIDE_DELAY);
  }

  useEffect(() => {
    const tip = tipRef.current;
    const anchor = anchorRef.current;
    if (!tip || !anchor) return;

    if (!visible) {
      if (tip.matches(":popover-open")) tip.hidePopover();
      return;
    }
    if (!tip.matches(":popover-open")) tip.showPopover();
    const a = anchor.getBoundingClientRect();
    const t = tip.getBoundingClientRect();
    tip.style.left = `${Math.round(a.right + GAP)}px`;
    tip.style.top = `${Math.round(a.top + a.height / 2 - t.height / 2)}px`;
  }, [visible]);

  // Escape dismisses without moving focus; scrolling or resizing would leave
  // the tip stranded, so those dismiss it too.
  useEffect(() => {
    if (!visible) return;
    const close = () => setOpen(false);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [visible]);

  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  return (
    <div
      ref={anchorRef}
      className={[styles.anchor, className].filter(Boolean).join(" ")}
      onPointerEnter={show}
      onPointerLeave={hide}
      onFocus={(event) => {
        // Keyboard focus only — a mouse click already had the hover.
        if ((event.target as HTMLElement).matches(":focus-visible")) show();
      }}
      onBlur={hide}
    >
      {children}
      <span
        ref={tipRef}
        popover="manual"
        aria-hidden="true"
        className={styles.tip}
        onPointerEnter={show}
        onPointerLeave={hide}
      >
        {label}
      </span>
    </div>
  );
}
