"use client";

import { ChevronRight } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import styles from "./nav.module.css";

interface NavToggleProps {
  expanded: boolean;
  /** id of the element whose width this changes */
  controls: string;
  onToggle: () => void;
}

/** A glass handle on the rail's edge. Click only — no hover-expand. */
export function NavToggle({ expanded, controls, onToggle }: NavToggleProps) {
  const label = expanded ? "Collapse navigation" : "Expand navigation";

  return (
    <Tooltip label={label} className={styles.toggleWrap}>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={expanded}
        aria-controls={controls}
        aria-label={label}
        onClick={onToggle}
      >
        <ChevronRight size={16} strokeWidth={2.5} aria-hidden="true" className={styles.toggleIcon} />
      </button>
    </Tooltip>
  );
}
