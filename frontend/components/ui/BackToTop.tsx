"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { getLenis } from "@/components/motion/lenis-instance";
import styles from "./BackToTop.module.css";

/**
 * A round volt button, fixed bottom-right, that appears once you've
 * scrolled a screen or so and glides back to the top of the page. Like
 * SmoothAnchor, it moves focus to the element with id="top" afterwards for
 * keyboard and screen-reader users, and jumps instead of gliding under
 * reduced motion. Inside the app shell the glide goes through Lenis.
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.75);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleClick() {
    const top = document.getElementById("top");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(0, { immediate: reduceMotion });
    else window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });

    if (!top) return;
    if (!top.hasAttribute("tabindex")) {
      top.setAttribute("tabindex", "-1");
      top.addEventListener("blur", () => top.removeAttribute("tabindex"), { once: true });
    }
    top.focus({ preventScroll: true });
  }

  return (
    <button
      type="button"
      className={styles.button}
      data-visible={visible}
      onClick={handleClick}
      aria-label="Back to top"
      tabIndex={visible ? 0 : -1}
    >
      <ArrowUp size={20} strokeWidth={2.5} aria-hidden="true" />
    </button>
  );
}
