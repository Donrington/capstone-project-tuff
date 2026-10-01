"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { requestPasswordReset, type ResetRequestState } from "../actions";
import styles from "../password.module.css";

const INITIAL: ResetRequestState = {};

export function ForgotPasswordForm({ showDemoLink }: { showDemoLink: boolean }) {
  const [state, formAction] = useActionState(requestPasswordReset, INITIAL);

  if (state.sent) {
    return (
      <div className={styles.sent} role="status">
        <MailCheck size={22} aria-hidden="true" />
        <p>If that email has a TUFF account, a reset link is on its way. It expires in 30 minutes.</p>
        {showDemoLink && (
          <Link href="/reset-password?token=demo" className={styles.demo}>
            Open the reset page (demo)
          </Link>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className={styles.form}>
      <FormField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        defaultValue={state.values?.email}
        error={Boolean(state.errors?.email)}
        helperText={state.errors?.email}
      />
      <Submit label="Send reset link" pending="Sending…" />
    </form>
  );
}

export function Submit({ label, pending: pendingLabel }: { label: string; pending: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" fullWidth disabled={pending} aria-busy={pending || undefined}>
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
