"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu as MenuIcon, X } from "lucide-react";
import { AboutSectionLinks } from "./about-section-links";
import styles from "./AboutNav.module.css";

const DRAWER_ID = "about-nav-drawer";

/**
 * Small screens: a menu button and a drawer with the section links and the
 * calls to action, like the app's. It's a modal <dialog>, so the focus trap,
 * Escape and the inert page come from showModal(); page scroll is locked by
 * hand.
 */
export function AboutNavMenu({
  homeHref,
  homeLabel,
  actions,
}: {
  homeHref: string;
  homeLabel: string;
  actions: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  function openDrawer() {
    document.documentElement.style.overflow = "hidden";
    dialogRef.current?.showModal();
    setOpen(true);
  }

  // Closes and unlocks scrolling synchronously, so a section link can scroll
  // the page in the same click.
  const closeDrawer = useCallback(() => {
    document.documentElement.style.overflow = "";
    if (dialogRef.current?.open) dialogRef.current.close();
    setOpen(false);
  }, []);

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 900px)");
    const handleChange = () => {
      if (wide.matches) closeDrawer();
    };
    wide.addEventListener("change", handleChange);
    return () => wide.removeEventListener("change", handleChange);
  }, [closeDrawer]);

  // Leaving the page with the drawer open mustn't leave the next one locked.
  useEffect(
    () => () => {
      document.documentElement.style.overflow = "";
    },
    [],
  );

  return (
    <>
      <button
        type="button"
        className={styles.menuButton}
        onClick={openDrawer}
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls={DRAWER_ID}
      >
        <MenuIcon size={20} aria-hidden="true" />
      </button>

      <dialog
        ref={dialogRef}
        id={DRAWER_ID}
        aria-label="Menu"
        className={styles.drawer}
        onClose={closeDrawer}
        onClick={(event) => {
          if (event.target === dialogRef.current) closeDrawer();
        }}
      >
        <div className={styles.drawerPanel}>
          <div className={styles.drawerHead}>
            <Link href={homeHref} className={styles.drawerBrand} aria-label={homeLabel}>
              <Image src="/logo/logo_2.png" alt="" width={340} height={113} className={styles.drawerLogo} />
            </Link>
            <button type="button" className={styles.iconButton} onClick={closeDrawer} aria-label="Close menu">
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          <p className={styles.drawerLabel}>On this page</p>
          <AboutSectionLinks variant="drawer" onNavigate={closeDrawer} />

          <div className={styles.drawerActions}>{actions}</div>
        </div>
      </dialog>
    </>
  );
}
