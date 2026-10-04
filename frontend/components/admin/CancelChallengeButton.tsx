"use client";

import { cancelChallengeAction } from "@/app/(app)/admin/actions";
import { ConfirmAction } from "./ConfirmAction";

export function CancelChallengeButton({ id, title }: { id: string; title: string }) {
  return (
    <ConfirmAction
      label="Cancel"
      title={`Cancel ${title}?`}
      description="It ends for everyone in it, and nobody can log to it any more. Past entries stay on people's history. This can't be undone."
      confirmLabel="Cancel challenge"
      success={`${title} was cancelled.`}
      run={() => cancelChallengeAction(id)}
      danger
    />
  );
}
