"use client";

import { useActionState, useState, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { joinWithCode, type JoinState } from "@/app/(app)/actions";
import styles from "./JoinWithCode.module.css";

const INITIAL: JoinState = {};

type JoinWithCodeButtonProps = Omit<ComponentProps<typeof Button>, "onClick" | "children"> & {
  children: ReactNode;
};

export function JoinWithCodeButton({ children, ...rest }: JoinWithCodeButtonProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(joinWithCode, INITIAL);
  const [code, setCode] = useState("");

  return (
    <>
      <Button {...rest} onClick={() => setOpen(true)}>
        {children}
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="sm"
        title="Join with a code"
        description="Paste the code someone sent you — the dash is optional."
      >
        <form action={formAction} className={styles.form}>
          <FormField
            label="Invite code"
            name="code"
            value={code}
            // Codes read as uppercase whatever the sender typed.
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="IRON-7Q4K"
            autoComplete="off"
            spellCheck={false}
            className={styles.code}
            error={Boolean(state.errors?.code)}
            helperText={state.errors?.code}
          />
          <JoinActions onCancel={() => setOpen(false)} />
        </form>
      </Dialog>
    </>
  );
}

function JoinActions({ onCancel }: { onCancel: () => void }) {
  const { pending } = useFormStatus();
  return (
    <div className={styles.actions}>
      <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
        Cancel
      </Button>
      <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
        {pending ? (
          <>
            <Loader2 size={18} className={styles.spin} aria-hidden="true" />
            Checking…
          </>
        ) : (
          "Join"
        )}
      </Button>
    </div>
  );
}
