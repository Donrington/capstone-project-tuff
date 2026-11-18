"use client";

import { useEffect, useRef, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { completeGoogleSignIn } from "./actions";
import styles from "./callback.module.css";

interface CallbackQuery {
  code?: string;
  state?: string;
  error?: string;
}

/** Shows a steady pending state while the token exchange and redirect happen. */
export function GoogleCallback({ query }: { query: CallbackQuery }) {
  const [, startTransition] = useTransition();
  const started = useRef(false);
  const { code, state, error } = query;

  useEffect(() => {
    // Strict Mode and refreshes can run the effect twice; the code is one-time.
    if (started.current) return;
    started.current = true;
    startTransition(() => {
      void completeGoogleSignIn({ code, state, error });
    });
  }, [code, state, error]);

  return (
    <div className={styles.pending} role="status" aria-live="polite" aria-busy="true">
      <Loader2 size={34} strokeWidth={2} className={styles.spinner} aria-hidden="true" />
      <p>Signing you in…</p>
    </div>
  );
}
