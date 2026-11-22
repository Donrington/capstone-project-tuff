"use client";

import type { ReactNode } from "react";
import { LogActivityProvider } from "@/components/activity/LogActivityProvider";
import { TimezoneReporter } from "@/components/shell/TimezoneReporter";
import type { Challenge } from "@/lib/types";

/** Client providers for the signed-in app, wrapped around the shell. */
export function AppProviders({
  challenges,
  children,
}: {
  challenges: Challenge[];
  children: ReactNode;
}) {
  return (
    <LogActivityProvider challenges={challenges}>
      <TimezoneReporter />
      {children}
    </LogActivityProvider>
  );
}
