"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Check, type LucideIcon } from "lucide-react";
import { Popover } from "./Popover";
import styles from "./Menu.module.css";

export interface MenuItemSpec {
  label: string;
  icon?: LucideIcon;
  /** A link item. Give an item either `href` or `onSelect`, not both. */
  href?: string;
  onSelect?: () => void;
  /** Draws a tick — for a set of choices like the theme. */
  checked?: boolean;
  danger?: boolean;
  separatorBefore?: boolean;
}

interface MenuProps {
  items: MenuItemSpec[];
  /** Accessible name for the menu itself. */
  label: string;
  /** Contents of the trigger button. */
  trigger: ReactNode;
  triggerClassName?: string;
  /** Accessible name for the trigger, when its contents don't say enough
   *  (an avatar on its own). */
  triggerLabel?: string;
  side?: "bottom" | "right";
  align?: "start" | "end" | "center";
  onOpenChange?: (open: boolean) => void;
}

/**
 * Menu button per WAI-ARIA: the trigger owns `aria-haspopup`/`aria-expanded`,
 * arrow keys and Home/End move between items, and Escape returns focus to the
 * trigger.
 */
export function Menu({
  items,
  label,
  trigger,
  triggerClassName,
  triggerLabel,
  side = "bottom",
  align = "start",
  onOpenChange,
}: MenuProps) {
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | HTMLButtonElement | null)[]>([]);
  const [open, setOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    itemRefs.current[focusIndex]?.focus({ preventScroll: true });
  }, [open, focusIndex]);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  function openAt(index: number) {
    setFocusIndex(index);
    setOpen(true);
  }

  function closeToTrigger() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleTriggerKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openAt(0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openAt(items.length - 1);
    }
  }

  function handleMenuKeyDown(event: React.KeyboardEvent) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setFocusIndex((i) => (i + 1) % items.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        setFocusIndex((i) => (i - 1 + items.length) % items.length);
        break;
      case "Home":
        event.preventDefault();
        setFocusIndex(0);
        break;
      case "End":
        event.preventDefault();
        setFocusIndex(items.length - 1);
        break;
      case "Escape":
      case "Tab":
        closeToTrigger();
        break;
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={triggerClassName}
        aria-label={triggerLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? setOpen(false) : openAt(0))}
        onKeyDown={handleTriggerKeyDown}
      >
        {trigger}
      </button>

      <Popover
        id={menuId}
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={triggerRef}
        side={side}
        align={align}
        role="menu"
        aria-label={label}
        className={styles.menu}
      >
        <div onKeyDown={handleMenuKeyDown} className={styles.list}>
          {items.map((item, index) => {
            const Icon = item.icon;
            const className = [
              styles.item,
              item.danger ? styles.danger : "",
              item.separatorBefore ? styles.separated : "",
            ]
              .filter(Boolean)
              .join(" ");

            const content = (
              <>
                {Icon && <Icon size={17} className={styles.icon} aria-hidden="true" />}
                <span className={styles.label}>{item.label}</span>
                {item.checked && <Check size={16} className={styles.check} aria-hidden="true" />}
              </>
            );

            const shared = {
              role: "menuitem",
              tabIndex: index === focusIndex ? 0 : -1,
              className,
              onFocus: () => setFocusIndex(index),
              ref: (el: HTMLAnchorElement | HTMLButtonElement | null) => {
                itemRefs.current[index] = el;
              },
            } as const;

            return item.href ? (
              <Link key={item.label} href={item.href} {...shared} onClick={() => setOpen(false)}>
                {content}
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                {...shared}
                onClick={() => {
                  setOpen(false);
                  item.onSelect?.();
                }}
              >
                {content}
              </button>
            );
          })}
        </div>
      </Popover>
    </>
  );
}
