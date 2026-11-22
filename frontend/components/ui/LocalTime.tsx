import { formatTime } from "@/lib/dates";

/** Renders a clock time in the signed-in user's stored IANA zone. The zone is
 *  a prop from the server, so the markup matches on both sides of hydration —
 *  no browser-only `Date.toLocaleTimeString()` guess and no hydration warning. */
export function LocalTime({
  iso,
  timeZone,
  className,
}: {
  iso: string;
  timeZone: string;
  className?: string;
}) {
  return (
    <time dateTime={iso} className={className}>
      {formatTime(iso, timeZone, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}
    </time>
  );
}
