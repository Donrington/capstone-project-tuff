/** "4 Oct 2026". UTC, so the same date shows wherever the admin is. */
export function shortDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words.length > 1 ? (words[words.length - 1][0] ?? "") : "")).toUpperCase() || "?";
}

type BadgeVariant = "volt" | "surge" | "success" | "neutral" | "streak";

export const USER_STATUS_BADGE: Record<string, BadgeVariant> = {
  active: "success",
  inactive: "neutral",
  suspended: "surge",
};

export const CHALLENGE_STATUS_BADGE: Record<string, BadgeVariant> = {
  active: "success",
  upcoming: "volt",
  draft: "neutral",
  completed: "neutral",
  cancelled: "surge",
};

export const capitalise = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);
