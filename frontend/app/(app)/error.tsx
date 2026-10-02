"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import styles from "./error.module.css";

/** Inside the app shell, so the nav stays put while the page recovers. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // TODO(backend): report to error monitoring (with error.digest).
    console.error(error);
  }, [error]);

  return (
    <EmptyState
      icon={TriangleAlert}
      title="Something broke on our side."
      text="It's not you. Try again, and if it keeps happening, head back to your dashboard."
      action={
        <div className={styles.actions}>
          <Button onClick={reset}>Try again</Button>
          <ButtonLink href="/dashboard" variant="ghost">
            Go to your dashboard
          </ButtonLink>
        </div>
      }
    />
  );
}
