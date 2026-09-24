"use client";

import Link from "next/link";
import { LogIn } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import { useNavContext } from "./nav-context";
import styles from "./nav.module.css";

/** The profile slot when nobody's signed in: an icon on the rail, a full
 *  button when expanded. */
export function NavSignIn() {
  const { collapsed } = useNavContext();

  return (
    <Tooltip label="Sign in" enabled={collapsed}>
      <Link href="/?mode=signin" className={styles.signIn}>
        <LogIn size={20} strokeWidth={2.25} className={styles.icon} aria-hidden="true" />
        <span className={styles.label}>Sign in</span>
      </Link>
    </Tooltip>
  );
}
