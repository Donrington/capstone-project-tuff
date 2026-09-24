"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useToast, type ToastOptions } from "./Toast";

/** Every message a redirect can ask for, keyed by `?flash=`. */
const MESSAGES: Record<string, ToastOptions> = {
  created: { title: "Challenge created.", description: "Invite your team to get them moving." },
  joined: { title: "You're in.", description: "Log something today to get on the board." },
  "password-reset": { title: "Password updated.", description: "Sign in with the new one." },
  welcome: { title: "Welcome to TUFF.", description: "Log your first activity to start a streak." },
};

/**
 * Shows the toast a redirect asked for, then strips `?flash=` from the URL so
 * a reload doesn't repeat it. Mounted once, in `app/providers.tsx`.
 */
export function FlashToast() {
  // useSearchParams opts a page out of static rendering unless it sits under
  // a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <FlashToastInner />
    </Suspense>
  );
}

function FlashToastInner() {
  const toast = useToast();
  const params = useSearchParams();
  const key = params.get("flash");
  const shownFor = useRef<string | null>(null);

  useEffect(() => {
    if (!key || shownFor.current === key) return;
    shownFor.current = key;

    const url = new URL(window.location.href);
    url.searchParams.delete("flash");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);

    const message = MESSAGES[key];
    if (message) toast(message);
  }, [key, toast]);

  return null;
}
