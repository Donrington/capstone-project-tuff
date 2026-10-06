"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { dismissFlagAction } from "@/app/(app)/admin/actions";
import { useToast } from "@/components/ui/Toast";
import styles from "./admin.module.css";

/** Clears a flag — reviewed, nothing wrong. The logged activity itself is
 *  untouched, so unlike suspend/cancel this doesn't need a confirmation
 *  dialog: there's nothing destructive to walk back. */
export function DismissFlagButton({ id, person }: { id: string; person: string }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function dismiss() {
    startTransition(async () => {
      const result = await dismissFlagAction(id);
      if (result.ok) toast({ title: `Dismissed ${person}'s entry.`, tone: "success" });
      else toast({ title: result.error, tone: "danger" });
    });
  }

  return (
    <button type="button" className={styles.rowButton} onClick={dismiss} disabled={pending}>
      {pending ? <Loader2 size={14} className={styles.spin} aria-hidden="true" /> : "Dismiss"}
    </button>
  );
}
