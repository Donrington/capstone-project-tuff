"use client";

/** Renders a clock time in the browser's own timezone so activity feeds don't
 *  show server-UTC times to someone in a different timezone. */
export function LocalTime({ iso, className }: { iso: string; className?: string }) {
  const value = new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <time dateTime={iso} suppressHydrationWarning className={className}>
      {value}
    </time>
  );
}
