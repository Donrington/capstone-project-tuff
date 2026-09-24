"use client";

import type { AnchorHTMLAttributes, MouseEvent } from "react";

type SmoothAnchorProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

/**
 * An in-page `#section` link that glides instead of jumping, then moves focus
 * to the section so keyboard and screen-reader users continue from there.
 * It's a real anchor, so it still works before hydration. Under reduced
 * motion it jumps.
 */
export function SmoothAnchor({ href, onClick, ...rest }: SmoothAnchorProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented || !href.startsWith("#")) return;

    const target = document.getElementById(decodeURIComponent(href.slice(1)));
    if (!target) return;

    event.preventDefault();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });

    // A section isn't focusable on its own. Make it focusable just long
    // enough to take focus — a permanent tabindex would let any click inside
    // it steal focus.
    if (!target.hasAttribute("tabindex")) {
      target.setAttribute("tabindex", "-1");
      target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true });
    }
    target.focus({ preventScroll: true });
  }

  return <a href={href} onClick={handleClick} {...rest} />;
}
