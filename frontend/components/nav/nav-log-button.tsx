"use client";

import { Plus } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import { useLogActivity } from "@/components/activity/LogActivityProvider";
import { useNavContext } from "./nav-context";
import styles from "./nav.module.css";

/** The rail's main action: a volt liquid-glass pill that shrinks to a disc. */
export function NavLogButton() {
  const { open } = useLogActivity();
  const { collapsed } = useNavContext();

  return (
    <Tooltip label="Log activity" enabled={collapsed} className={styles.logWrap}>
      <button type="button" className={styles.logButton} onClick={() => open()}>
        <Plus size={20} strokeWidth={2.5} className={styles.icon} aria-hidden="true" />
        <span className={styles.label}>Log activity</span>
      </button>
    </Tooltip>
  );
}

/** The same action in the small-screen top bar. */
export function TopBarLogButton() {
  const { open } = useLogActivity();

  return (
    <button type="button" className={styles.topLog} onClick={() => open()}>
      <Plus size={18} strokeWidth={2.5} aria-hidden="true" />
      <span className={styles.topLogLabel}>Log activity</span>
    </button>
  );
}
