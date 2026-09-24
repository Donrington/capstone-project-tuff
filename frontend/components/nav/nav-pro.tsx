"use client";

import { Sparkles } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import { useToast } from "@/components/ui/Toast";
import { useNavContext } from "./nav-context";
import styles from "./nav.module.css";

/** Pro isn't launching yet, so this just says so. */
export function NavPro() {
  const toast = useToast();
  const { collapsed } = useNavContext();

  return (
    <Tooltip label="Upgrade to Pro" enabled={collapsed}>
      <button
        type="button"
        className={styles.pro}
        onClick={() =>
          toast({ title: "Pro is coming soon.", description: "We'll let you know when it's ready." })
        }
      >
        <Sparkles size={20} strokeWidth={2} className={styles.icon} aria-hidden="true" />
        <span className={styles.label}>Upgrade to Pro</span>
        <span className={styles.soon} aria-hidden="true">
          Soon
        </span>
      </button>
    </Tooltip>
  );
}
