"use client";

import { useEffect, useState } from "react";
import styles from "./SettingsNav.module.css";

export const SETTINGS_SECTIONS = [
  { id: "profile", label: "Profile" },
  { id: "account", label: "Account" },
  { id: "goals", label: "Goals" },
  { id: "notifications", label: "Notifications" },
  { id: "appearance", label: "Appearance" },
  { id: "trackers", label: "Trackers" },
  { id: "privacy", label: "Privacy" },
  { id: "delete", label: "Delete account" },
];

/**
 * The section nav: a sticky panel beside the forms from 1024px, a
 * horizontally scrolling pill row above them below that. The link for the
 * section in view is highlighted.
 */
export function SettingsNav() {
  const [current, setCurrent] = useState(SETTINGS_SECTIONS[0].id);

  useEffect(() => {
    const sections = SETTINGS_SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    // The section crossing a band near the top of the viewport is "in view".
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) setCurrent(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <nav aria-label="Settings sections" className={styles.nav}>
      <ul className={styles.list}>
        {SETTINGS_SECTIONS.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className={styles.link}
              aria-current={current === s.id ? "location" : undefined}
              onClick={() => setCurrent(s.id)}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
