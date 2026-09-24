"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, Menu as MenuIcon, X } from "lucide-react";
import { NAV_STATE_COOKIE, type NavState } from "@/lib/nav/state";
import { NavContext } from "./nav-context";
import { NavToggle } from "./nav-toggle";
import styles from "./nav.module.css";

const RAIL_ID = "app-nav";
const DRAWER_ID = "app-nav-drawer";
const YEAR = 60 * 60 * 24 * 365;

interface NavShellProps {
  /** From the nav-state cookie, read on the server, so first paint is right. */
  initialState: NavState;
  /** Session-aware contents (server-rendered, streamed behind a skeleton). */
  body: ReactNode;
  /** The top bar's right-hand action on small screens. */
  topBarAction: ReactNode;
}

/**
 * Owns the collapsed/expanded state and publishes it as `data-state` on the
 * rail, so everything inside — server-rendered or not — styles itself off
 * that one attribute. Below 1024px the rail gives way to a top bar whose
 * button opens the same contents in a native <dialog> drawer (focus trap,
 * Escape, inert page and top layer all come from showModal()).
 */
export function NavShell({ initialState, body, topBarAction }: NavShellProps) {
  const [state, setState] = useState<NavState>(initialState);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const collapsed = state === "collapsed";

  function toggle() {
    const next: NavState = collapsed ? "expanded" : "collapsed";
    setState(next);
    document.cookie = `${NAV_STATE_COOKIE}=${next}; path=/; max-age=${YEAR}; samesite=lax`;
  }

  useEffect(() => {
    const drawer = drawerRef.current;
    if (!drawer) return;
    if (drawerOpen && !drawer.open) drawer.showModal();
    else if (!drawerOpen && drawer.open) drawer.close();
  }, [drawerOpen]);

  // Following a link inside the drawer lands on a new page — close it.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // showModal() makes the page inert but leaves it scrollable.
  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [drawerOpen]);

  // If the window widens past the breakpoint, the rail takes over.
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (wide.matches) setDrawerOpen(false);
    };
    wide.addEventListener("change", onChange);
    return () => wide.removeEventListener("change", onChange);
  }, []);

  return (
    <>
      <aside id={RAIL_ID} aria-label="Sidebar" className={styles.rail} data-state={state}>
        <div className={styles.panel}>
          <Link href="/dashboard" className={styles.brand} aria-label="TUFF dashboard">
            <span className={styles.brandMark} aria-hidden="true">
              <Check size={20} strokeWidth={3.25} />
            </span>
            <Image
              src="/logo/logo_2.png"
              alt=""
              width={340}
              height={113}
              loading="eager"
              className={styles.brandLogo}
            />
          </Link>
          <NavContext.Provider value={{ collapsed }}>{body}</NavContext.Provider>
        </div>
        <NavToggle expanded={!collapsed} controls={RAIL_ID} onToggle={toggle} />
      </aside>

      <header className={styles.topBar}>
        <button
          type="button"
          className={styles.iconButton}
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation"
          aria-expanded={drawerOpen}
          aria-controls={DRAWER_ID}
        >
          <MenuIcon size={20} aria-hidden="true" />
        </button>
        <Link href="/dashboard" className={styles.topBrand} aria-label="TUFF dashboard">
          <Image
            src="/logo/logo_2.png"
            alt=""
            width={340}
            height={113}
            loading="eager"
            className={styles.topLogo}
          />
        </Link>
        <div className={styles.topActions}>{topBarAction}</div>
      </header>

      <dialog
        ref={drawerRef}
        id={DRAWER_ID}
        aria-label="Navigation"
        className={styles.drawer}
        onClose={() => setDrawerOpen(false)}
        onClick={(event) => {
          if (event.target === drawerRef.current) setDrawerOpen(false);
        }}
      >
        <div className={styles.drawerPanel} data-state="expanded">
          <div className={styles.drawerHead}>
            <Link href="/dashboard" className={styles.drawerBrand} aria-label="TUFF dashboard">
              <Image
                src="/logo/logo_2.png"
                alt=""
                width={340}
                height={113}
                className={styles.drawerLogo}
              />
            </Link>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => setDrawerOpen(false)}
              aria-label="Close navigation"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <NavContext.Provider value={{ collapsed: false }}>{body}</NavContext.Provider>
        </div>
      </dialog>
    </>
  );
}
