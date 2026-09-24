import { Suspense } from "react";
import { cookies } from "next/headers";
import { NAV_STATE_COOKIE, parseNavState } from "@/lib/nav/state";
import { NavBody, NavTopBarAction } from "./nav-body";
import { NavShell } from "./nav-shell";
import { NavSkeleton } from "./nav-skeleton";

/**
 * The app's navigation. Reads the saved collapsed/expanded choice from the
 * nav-state cookie so the first paint is already right — no flash, and the
 * server and client agree, so no hydration mismatch. The session-aware part
 * streams in behind a same-shaped skeleton; the page doesn't wait on it.
 */
export async function AppNav() {
  const initialState = parseNavState((await cookies()).get(NAV_STATE_COOKIE)?.value);

  return (
    <NavShell
      initialState={initialState}
      body={
        <Suspense fallback={<NavSkeleton />}>
          <NavBody />
        </Suspense>
      }
      topBarAction={
        <Suspense fallback={null}>
          <NavTopBarAction />
        </Suspense>
      }
    />
  );
}
