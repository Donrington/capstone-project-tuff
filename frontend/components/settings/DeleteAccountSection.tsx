"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FormField } from "@/components/ui/FormField";
import { deleteAccountAction, type DeleteAccountState } from "@/app/(app)/actions";
import { DialogActions } from "@/components/teams/CreateTeamButton";
import { SettingsSection } from "./SettingsSection";
import styles from "./settings.module.css";

const INITIAL: DeleteAccountState = {};

export function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(deleteAccountAction, INITIAL);

  return (
    <SettingsSection
      id="delete"
      title="Delete account"
      sub="Removes your profile, activity, achievements and notifications for good. Teams and challenges you started stay for everyone else in them."
      danger
    >
      <div className={styles.actions}>
        <Button variant="secondary" className={styles.dangerButton} onClick={() => setOpen(true)}>
          <Trash2 size={16} strokeWidth={2.25} aria-hidden="true" />
          Delete my account
        </Button>
      </div>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="sm"
        title="Delete your account?"
        description="This can't be undone. Type DELETE to confirm."
      >
        <form action={formAction} className={styles.form}>
          <FormField
            label="Type DELETE"
            name="confirm"
            autoComplete="off"
            spellCheck={false}
            error={Boolean(state.errors?.confirm)}
            helperText={state.errors?.confirm}
          />
          {state.message && (
            <p className={styles.note} role="status">
              {state.message}
            </p>
          )}
          <DialogActions
            onCancel={() => setOpen(false)}
            submitLabel="Delete account"
            pendingLabel="Deleting…"
            danger
          />
        </form>
      </Dialog>
    </SettingsSection>
  );
}
