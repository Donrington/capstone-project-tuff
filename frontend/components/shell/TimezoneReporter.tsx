"use client";

import { useEffect } from "react";
import { saveBrowserTimezone } from "@/app/(app)/actions";

const SESSION_KEY = "tuff-timezone-reported";

/** Sends the browser's IANA zone to the server once per tab session. It has no
 *  UI and runs in an effect, so it never delays the first render: pages use the
 *  zone already stored on `User`, and the next navigation picks up any update. */
export function TimezoneReporter() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // Private-mode storage denial: still try once for this mount.
    }

    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone) void saveBrowserTimezone(zone).catch(() => {});
  }, []);

  return null;
}
