"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { joinWithCode, type JoinState } from "@/app/(app)/actions";
import styles from "./JoinWithCode.module.css";

const INITIAL: JoinState = {};

/** The Join button on /join/[code] — the code is already known. */
export function JoinForm({ code }: { code: string }) {
  const [state, formAction] = useActionState(joinWithCode, INITIAL);

  return (
    <form action={formAction}>
      <input type="hidden" name="code" value={code} />
      <JoinButton />
      {state.errors?.code && <p className={styles.error}>{state.errors.code}</p>}
    </form>
  );
}

function JoinButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} aria-busy={pending || undefined}>
      {pending ? (
        <>
          <Loader2 size={18} className={styles.spin} aria-hidden="true" />
          Joining…
        </>
      ) : (
        "Join"
      )}
    </Button>
  );
}
