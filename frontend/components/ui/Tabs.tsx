"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./Tabs.module.css";

interface TabsProps {
  tabs: string[];
  /** Ties tabs to their panels. Pair with `tabPanelId()` on each panel. */
  idBase?: string;
  defaultIndex?: number;
  /** Pass to drive the tabs from outside — e.g. from a URL param. */
  index?: number;
  onChange?: (index: number) => void;
}

interface Rect {
  left: number;
  width: number;
}

export const tabId = (base: string, index: number) => `${base}-tab-${index}`;
export const tabPanelId = (base: string, index: number) => `${base}-panel-${index}`;

/**
 * Segmented control whose active indicator melts between tabs via an SVG
 * goo filter instead of sliding. A "ghost" blob spawns at the departure
 * point and shrinks toward the new tab while the real pill travels there;
 * the two fuse mid-flight, then the ghost dissolves.
 *
 * Keyboard: arrow keys, Home and End move between tabs with a roving
 * tabindex, selecting as they go.
 */
export function Tabs({ tabs, idBase, defaultIndex = 0, index, onChange }: TabsProps) {
  const autoId = useId().replace(/:/g, "");
  const base = idBase ?? autoId;
  const filterId = `goo-${autoId}`;
  const tabsRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const mainBlobRef = useRef<HTMLDivElement>(null);
  const ghostBlobRef = useRef<HTMLDivElement>(null);
  const animating = useRef(false);
  const [internal, setInternal] = useState(defaultIndex);

  const current = index ?? internal;
  const rendered = useRef(current);

  function rectFor(btn: HTMLButtonElement): Rect {
    const tabsRect = tabsRef.current!.getBoundingClientRect();
    const r = btn.getBoundingClientRect();
    return { left: r.left - tabsRect.left - 6, width: r.width };
  }

  function place(el: HTMLDivElement, rect: Rect, animated: boolean) {
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.style.transition =
      animated && !reduceMotion
        ? "left 0.55s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)"
        : "none";
    el.style.left = `${rect.left}px`;
    el.style.width = `${rect.width}px`;
  }

  useEffect(() => {
    const btn = buttonRefs.current[current];
    if (btn && mainBlobRef.current) place(mainBlobRef.current, rectFor(btn), false);
    // run once on mount — placement afterward is driven by selection/resize
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleResize() {
      const btn = buttonRefs.current[current];
      if (btn && mainBlobRef.current) place(mainBlobRef.current, rectFor(btn), false);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [current]);

  // The goo runs off whatever the selection became, so it covers both a click
  // here and a controlled change from outside.
  useEffect(() => {
    const from = rendered.current;
    if (from === current) return;
    rendered.current = current;

    const main = mainBlobRef.current;
    const ghost = ghostBlobRef.current;
    const fromBtn = buttonRefs.current[from];
    const toBtn = buttonRefs.current[current];
    if (!main || !ghost || !fromBtn || !toBtn) return;

    const fromRect = rectFor(fromBtn);
    const toRect = rectFor(toBtn);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      place(main, toRect, false);
      return;
    }

    animating.current = true;
    place(ghost, fromRect, false);
    ghost.style.opacity = "1";
    ghost.style.transform = "scaleX(1)";
    // force reflow so the transition below is picked up
    void ghost.offsetWidth;

    place(main, toRect, true);

    ghost.style.transition =
      "left 0.55s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.45s ease-in 0.1s, opacity 0.3s ease-in 0.25s";
    ghost.style.left = `${toRect.left + toRect.width * 0.35}px`;
    ghost.style.transform = "scaleX(0.15)";
    ghost.style.opacity = "0";

    const timer = window.setTimeout(() => {
      animating.current = false;
    }, 580);
    return () => window.clearTimeout(timer);
  }, [current]);

  function select(next: number) {
    if (animating.current || next === current) return;
    if (index === undefined) setInternal(next);
    onChange?.(next);
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    const last = tabs.length - 1;
    let next: number | null = null;
    if (event.key === "ArrowRight") next = current === last ? 0 : current + 1;
    else if (event.key === "ArrowLeft") next = current === 0 ? last : current - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    if (next === null) return;

    event.preventDefault();
    select(next);
    buttonRefs.current[next]?.focus();
  }

  return (
    <div>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <filter id={filterId}>
            <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9"
              result="goo"
            />
          </filter>
        </defs>
      </svg>
      <div className={styles.tabs} ref={tabsRef} role="tablist" onKeyDown={handleKeyDown}>
        <div className={styles.gooLayer} style={{ filter: `url(#${filterId})` }} aria-hidden="true">
          <div className={styles.blob} ref={mainBlobRef} />
          <div className={styles.blob} ref={ghostBlobRef} style={{ opacity: 0 }} />
        </div>
        {tabs.map((label, i) => (
          <button
            key={label}
            ref={(el) => {
              buttonRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={tabId(base, i)}
            aria-selected={i === current}
            aria-controls={tabPanelId(base, i)}
            tabIndex={i === current ? 0 : -1}
            className={`${styles.tabBtn} ${i === current ? styles.active : ""}`}
            onClick={() => select(i)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
