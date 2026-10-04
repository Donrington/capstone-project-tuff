"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import type { AdminResult } from "@/lib/types";
import styles from "./admin.module.css";

interface ConfirmActionProps {
  /** The button in the row. */
  label: string;
  title: string;
  description: string;
  confirmLabel: string;
  /** Said in a toast when it worked. */
  success: string;
  /** Calls the server action. The page refreshes itself when it succeeds. */
  run: () => Promise<AdminResult>;
  /** Styles the confirm button as the careful one — for suspending, cancelling. */
  danger?: boolean;
}

/** A row action that asks first: a small button, then a dialog that says what will happen. */
export function ConfirmAction({ label, title, description, confirmLabel, success, run, danger }: ConfirmActionProps) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    if (!pending) setOpen(false);
  }

  function confirm() {
    startTransition(async () => {
      const result = await run();
      if (result.ok) {
        setOpen(false);
        toast({ title: success, tone: "success" });
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        className={styles.rowButton}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        {label}
      </button>
      <Dialog open={open} onClose={close} size="sm" title={title} description={description}>
        {error && (
          <p className={styles.dialogError} role="alert">
            {error}
          </p>
        )}
        <div className={styles.dialogActions}>
          <Button type="button" variant="ghost" onClick={close} disabled={pending}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={danger ? "secondary" : "primary"}
            className={danger ? styles.dangerButton : undefined}
            onClick={confirm}
            disabled={pending}
            aria-busy={pending || undefined}
          >
            {pending ? (
              <>
                <Loader2 size={18} className={styles.spin} aria-hidden="true" />
                Working…
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
