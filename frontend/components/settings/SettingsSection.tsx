"use client";

import { useEffect, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { ActionState } from "@/app/(app)/actions";
import styles from "./settings.module.css";

/** One settings card. `id` is what `/settings#<id>` and the section nav point at. */
export function SettingsSection({
  id,
  title,
  sub,
  danger,
  children,
}: {
  id: string;
  title: string;
  sub: string;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={`${styles.section} ${danger ? styles.danger : ""}`}
      aria-labelledby={`${id}-heading`}
      data-settings-section
    >
      <h2 id={`${id}-heading`} className={styles.heading}>
        {title}
      </h2>
      <p className={styles.sub}>{sub}</p>
      {children}
    </section>
  );
}

/** "Saved." (or the action's own message) as a success toast, once per save. */
export function useSavedToast(state: ActionState) {
  const toast = useToast();
  useEffect(() => {
    if (state.ok) toast({ title: state.message ?? "Saved.", tone: "success" });
  }, [state, toast]);
}

export function SaveButton({ label = "Save", pendingLabel = "Saving…" }: { label?: string; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
      {pending ? (
        <>
          <Loader2 size={18} className={styles.spin} aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        label
      )}
    </Button>
  );
}
