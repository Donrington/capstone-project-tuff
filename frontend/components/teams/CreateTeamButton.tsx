"use client";

import { useActionState, useState, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FormField } from "@/components/ui/FormField";
import { TextArea } from "@/components/ui/TextArea";
import { createTeamAction, type CreateTeamState } from "@/app/(app)/actions";
import styles from "./teams.module.css";

const INITIAL: CreateTeamState = {};

type CreateTeamButtonProps = Omit<ComponentProps<typeof Button>, "onClick" | "children"> & {
  children: ReactNode;
};

/** Opens the create-team dialog. On success the action redirects to the new team. */
export function CreateTeamButton({ children, ...rest }: CreateTeamButtonProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createTeamAction, INITIAL);

  return (
    <>
      <Button {...rest} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="sm"
        title="Create a team"
        description="You'll get an invite code to share as soon as it's made."
      >
        <form action={formAction} className={styles.dialogForm}>
          <FormField
            label="Team name"
            name="name"
            placeholder="Team Owambe Movers"
            autoComplete="off"
            maxLength={40}
            defaultValue={state.values?.name}
            error={Boolean(state.errors?.name)}
            helperText={state.errors?.name}
          />
          <TextArea
            label="What's the team about? (optional)"
            name="description"
            rows={2}
            maxLength={160}
            defaultValue={state.values?.description}
            error={Boolean(state.errors?.description)}
            helperText={state.errors?.description}
          />
          <DialogActions onCancel={() => setOpen(false)} submitLabel="Create team" pendingLabel="Creating…" />
        </form>
      </Dialog>
    </>
  );
}

export function DialogActions({
  onCancel,
  submitLabel,
  pendingLabel,
  danger,
}: {
  onCancel: () => void;
  submitLabel: string;
  pendingLabel: string;
  danger?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <div className={styles.dialogActions}>
      <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
        Cancel
      </Button>
      <Button
        type="submit"
        variant={danger ? "secondary" : "primary"}
        className={danger ? styles.dangerButton : undefined}
        disabled={pending}
        aria-busy={pending || undefined}
      >
        {pending ? (
          <>
            <Loader2 size={18} className={styles.spin} aria-hidden="true" />
            {pendingLabel}
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </div>
  );
}
