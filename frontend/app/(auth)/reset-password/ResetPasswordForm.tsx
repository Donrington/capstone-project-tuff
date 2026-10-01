"use client";

import { useActionState } from "react";
import { PasswordField } from "@/components/ui/PasswordField";
import { resetPassword, type ResetPasswordState } from "../actions";
import { Submit } from "../forgot-password/ForgotPasswordForm";
import styles from "../password.module.css";

const INITIAL: ResetPasswordState = {};

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(resetPassword, INITIAL);

  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="token" value={token} />
      <PasswordField
        label="New password"
        name="password"
        autoComplete="new-password"
        error={Boolean(state.errors?.password)}
        helperText={state.errors?.password ?? "At least 8 characters."}
      />
      <PasswordField
        label="Confirm new password"
        name="confirm"
        autoComplete="new-password"
        error={Boolean(state.errors?.confirm)}
        helperText={state.errors?.confirm}
      />
      {state.message && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}
      <Submit label="Save new password" pending="Saving…" />
    </form>
  );
}
