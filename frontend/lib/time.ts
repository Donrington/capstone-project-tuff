/**
 * Formats `iso` relative to `now` — both are fixed snapshots the caller
 * passes in, never `Date.now()` computed inside a component. That's what
 * keeps this safe to call during SSR: the server bakes a `now` snapshot into
 * the HTML, and the client's first render reuses that exact same string
 * instead of computing a new one a few hundred ms later, which is what
 * causes a hydration mismatch on "changes each time it's called" values.
 */
export function relativeTime(iso: string, nowIso: string): string {
  const diffMs = new Date(nowIso).getTime() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
