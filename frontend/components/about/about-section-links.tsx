"use client";

import { useEffect, useState } from "react";
import { BookOpen, UsersRound, Workflow, type LucideIcon } from "lucide-react";
import { SmoothAnchor } from "@/components/ui/SmoothAnchor";
import styles from "./AboutNav.module.css";

const SECTIONS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "story", label: "Story", icon: BookOpen },
  { id: "how", label: "How it works", icon: Workflow },
  { id: "community", label: "Community", icon: UsersRound },
];

/** The section crossing a thin band across the middle of the viewport, if any. */
function useActiveSection() {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const inBand = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) inBand.add(entry.target.id);
          else inBand.delete(entry.target.id);
        }
        setActive(SECTIONS.find((section) => inBand.has(section.id))?.id ?? null);
      },
      { rootMargin: "-45% 0px -54% 0px" },
    );
    for (const { id } of SECTIONS) {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    }
    return () => observer.disconnect();
  }, []);

  return active;
}

/**
 * The About page's section links, as icon pills like the app nav's. The one
 * for the section you're reading gets the volt notch and aria-current.
 */
export function AboutSectionLinks({
  variant,
  onNavigate,
}: {
  variant: "bar" | "drawer";
  onNavigate?: () => void;
}) {
  const active = useActiveSection();

  return (
    <nav aria-label="About sections" className={variant === "bar" ? styles.links : styles.drawerLinks}>
      <ul className={styles.linkList}>
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <li key={id}>
            <SmoothAnchor
              href={`#${id}`}
              className={styles.link}
              aria-current={active === id ? "true" : undefined}
              onClick={onNavigate ? () => onNavigate() : undefined}
            >
              <Icon size={17} strokeWidth={2.25} className={styles.icon} aria-hidden="true" />
              {label}
            </SmoothAnchor>
          </li>
        ))}
      </ul>
    </nav>
  );
}
