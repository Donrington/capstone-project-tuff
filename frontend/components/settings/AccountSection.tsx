"use client";

import { useActionState, useEffect, useRef } from "react";
import { FormField } from "@/components/ui/FormField";
import { PasswordField } from "@/components/ui/PasswordField";
import { updatePasswordAction, type UpdatePasswordState } from "@/app/(app)/actions";
import { SaveButton, SettingsSection, useSavedToast } from "./SettingsSection";
import styles from "./settings.module.css";

const INITIAL: UpdatePasswordState = {};

export function AccountSection({ email }: { email: string }) {
  const [state, formAction] = useActionState(updatePasswordAction, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);
  useSavedToast(state);

  // Don't leave passwords sitting in the fields after a successful change.
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <SettingsSection id="account" title="Account" sub="Your sign-in email and password.">
      <div className={styles.form}>
        <FormField
          label="Email"
          name="email"
          type="email"
          value={email}
          readOnly
          helperText="This is the email you sign in with."
        />
      </div>

      <form ref={formRef} action={formAction} className={`${styles.form} ${styles.split}`}>
        <h3 className={styles.subheading}>Change password</h3>
        <PasswordField
          label="Current password"
          name="currentPassword"
          autoComplete="current-password"
          error={Boolean(state.errors?.currentPassword)}
          helperText={state.errors?.currentPassword}
        />
        <PasswordField
          label="New password"
          name="newPassword"
          autoComplete="new-password"
          error={Boolean(state.errors?.newPassword)}
          helperText={state.errors?.newPassword ?? "At least 8 characters."}
        />
        <PasswordField
          label="Confirm new password"
          name="confirmPassword"
          autoComplete="new-password"
          error={Boolean(state.errors?.confirmPassword)}
          helperText={state.errors?.confirmPassword}
        />
        <p className={styles.note}>Changing it signs you out everywhere else.</p>
        <div className={styles.actions}>
          <SaveButton label="Change password" pendingLabel="Changing…" />
        </div>
      </form>
    </SettingsSection>
  );
}
