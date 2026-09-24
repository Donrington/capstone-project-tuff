"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import styles from "./Dialog.module.css";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "full";
  /** Keeps `title` for screen readers only — for takeovers that draw their
   *  own headline, like the challenge-complete celebration. */
  hideTitle?: boolean;
}

/**
 * Modal built on native `<dialog>` + `showModal()`, so the browser owns focus
 * trapping, Escape, the top layer and returning focus to whatever opened it.
 * Below 720px it docks to the bottom as a sheet.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  hideTitle,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  // Escape, the close button and a backdrop click all end in the browser's
  // `close` event — tell the parent so its state matches.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, [onClose]);

  // showModal() makes the rest of the page inert but leaves it scrollable.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClick={(event) => {
        if (event.target === ref.current) ref.current?.close();
      }}
    >
      <div className={`${styles.panel} ${styles[size]}`}>
        <div className={hideTitle ? styles.headBare : styles.head}>
          <div className={hideTitle ? "sr-only" : styles.heading}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            {description && (
              <p id={descId} className={styles.desc}>
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            className={styles.close}
            onClick={() => ref.current?.close()}
            aria-label="Close"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className={styles.body} data-lenis-prevent>
          {children}
        </div>
        {footer && <div className={styles.foot}>{footer}</div>}
      </div>
    </dialog>
  );
}
