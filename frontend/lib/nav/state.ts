/** Shared by the server (reads it for first paint) and the toggle (writes it). */
export const NAV_STATE_COOKIE = "nav-state";

export type NavState = "collapsed" | "expanded";

export function parseNavState(value: string | undefined): NavState {
  return value === "expanded" ? "expanded" : "collapsed";
}
