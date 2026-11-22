/**
 * LocalTime — every user-facing "day" belongs to the signed-in user's IANA
 * timezone, never to the browser's locale and never to UTC by accident.
 *
 * The server owns the source of truth: `User.timezone` comes from session
 * state, is passed into server components, and is threaded into the small
 * client components that render dates. Rendering with the same zone on the
 * server and the client avoids hydration mismatches; reading
 * `Intl.DateTimeFormat().resolvedOptions().timeZone` in a client component
 * would only be correct after hydration.
 *
 * Day keys are strings ("YYYY-MM-DD") rather than 24-hour timestamps. A
 * daylight-saving day is 23 or 25 hours long, so `t + 86_400_000` is not the
 * next day. Helpers here resolve real UTC instants for boundaries in the
 * requested zone and fall back to UTC only for old accounts with no zone.
 */

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export type DateLike = Date | string | number;
type WallParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  ms: number;
};

const formatterCache = new Map<string, Intl.DateTimeFormat>();

export function normalizeTimeZone(timeZone?: string | null): string {
  return typeof timeZone === "string" ? timeZone.trim() || "UTC" : "UTC";
}

const normalizeZone = normalizeTimeZone;

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  const name = normalizeZone(timeZone);
  let formatter = formatterCache.get(name);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: name,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatterCache.set(name, formatter);
  }
  return formatter;
}

function toDate(value: DateLike): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError("Invalid date");
  return date;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function isValidTimeZone(timeZone: string): boolean {
  try {
    formatterFor(timeZone);
    return true;
  } catch {
    return false;
  }
}

/** Local wall-clock fields of an instant in the given zone. */
export function partsAt(value: DateLike, timeZone: string): WallParts {
  const date = toDate(value);
  const parts: Partial<Record<string, number>> = {};
  for (const part of formatterFor(timeZone).formatToParts(date)) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }
  return {
    year: parts.year!,
    month: parts.month!,
    day: parts.day!,
    hour: parts.hour!,
    minute: parts.minute!,
    second: parts.second!,
    ms: date.getUTCMilliseconds(),
  };
}

/** "YYYY-MM-DD" for the instant, in the user's zone. */
export function dayKey(value: DateLike, timeZone: string): string {
  const { year, month, day } = partsAt(value, timeZone);
  return `${year}-${pad(month)}-${pad(day)}`;
}

function offsetMsAt(ms: number, timeZone: string): number {
  const { year, month, day, hour, minute, second, ms: millis } = partsAt(ms, timeZone);
  return Date.UTC(year, month - 1, day, hour, minute, second, millis) - ms;
}

function sameWallTime(parts: WallParts, candidateMs: number, timeZone: string): boolean {
  const actual = partsAt(candidateMs, timeZone);
  return (
    parts.year === actual.year &&
    parts.month === actual.month &&
    parts.day === actual.day &&
    parts.hour === actual.hour &&
    parts.minute === actual.minute &&
    parts.second === actual.second
  );
}

function resolveWallTime(wallMs: number, target: WallParts, timeZone: string, referenceMs: number): number {
  const offsets = new Set<number>([offsetMsAt(referenceMs, timeZone)]);
  for (const probe of [
    wallMs - 2 * DAY_MS,
    wallMs - DAY_MS,
    wallMs - HOUR_MS,
    wallMs,
    wallMs + HOUR_MS,
    wallMs + DAY_MS,
    wallMs + 2 * DAY_MS,
  ]) {
    offsets.add(offsetMsAt(probe, timeZone));
  }

  let best: number | null = null;
  for (const offset of offsets) {
    const candidate = wallMs - offset;
    if (candidate <= referenceMs && sameWallTime(target, candidate, timeZone)) {
      if (best === null || candidate > best) best = candidate;
    }
  }
  if (best !== null) return best;

  // The wall time was skipped by a spring-forward gap. Use the first instant
  // of that local day (e.g. 01:00 instead of a nonexistent midnight).
  const targetKey = `${target.year}-${pad(target.month)}-${pad(target.day)}`;
  const anchor = wallMs - offsetMsAt(referenceMs, timeZone);
  let lo = anchor - 4 * HOUR_MS;
  let hi = anchor + 6 * HOUR_MS;
  if (dayKey(lo, timeZone) >= targetKey) return lo;
  if (dayKey(hi, timeZone) < targetKey) return hi;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (dayKey(mid, timeZone) < targetKey) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function localMidnight(year: number, month: number, day: number, timeZone: string, referenceMs?: number): Date {
  const wallMs = Date.UTC(year, month - 1, day);
  const target: WallParts = { year, month, day, hour: 0, minute: 0, second: 0, ms: 0 };
  return new Date(resolveWallTime(wallMs, target, timeZone, referenceMs ?? wallMs + 12 * HOUR_MS));
}

/** First UTC instant of the local day containing `value`. */
export function startOfDay(value: DateLike, timeZone: string): Date {
  const { year, month, day } = partsAt(value, timeZone);
  return localMidnight(year, month, day, timeZone, toDate(value).getTime());
}

/** Move `count` calendar days and return the start of that local day. */
export function addDays(value: DateLike, timeZone: string, count: number): Date {
  const amount = Math.trunc(Number(count));
  if (!Number.isFinite(amount)) throw new TypeError("count must be a number");
  const { year, month, day } = partsAt(value, timeZone);
  const shifted = new Date(Date.UTC(year, month - 1, day + amount));
  return localMidnight(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate(),
    timeZone,
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate(), 12),
  );
}

/** Calendar position of a day key — one step per day, DST notwithstanding. */
export function dayNumber(key: string): number {
  return Date.parse(`${key}T00:00:00Z`) / DAY_MS;
}

export function dayKeyFromNumber(number: number): string {
  const d = new Date(number * DAY_MS);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Formatting a day label: date-only strings are calendar labels and are
 *  rendered as-is (UTC noon) so a +14 zone can't shift them by a day. */
function formatterDate(value: DateLike, timeZone: string): { date: Date; zone: string } {
  if (typeof value === "string" && DATE_ONLY.test(value)) {
    return { date: new Date(`${value}T00:00:00Z`), zone: "UTC" };
  }
  return { date: toDate(value), zone: normalizeZone(timeZone) };
}

const defaultDayOptions: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
const defaultTimeOptions: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };

/** A user-facing calendar label in the user's zone (or the label's own day). */
export function formatDay(value: DateLike, timeZone: string, options?: Intl.DateTimeFormatOptions): string {
  const { date, zone } = formatterDate(value, timeZone);
  return date.toLocaleDateString("en-US", { ...(options ?? defaultDayOptions), timeZone: zone });
}

/** A user-facing clock time in the user's zone. */
export function formatTime(value: DateLike, timeZone: string, options?: Intl.DateTimeFormatOptions): string {
  return toDate(value).toLocaleTimeString("en-US", {
    ...(options ?? defaultTimeOptions),
    timeZone: normalizeZone(timeZone),
  });
}

export { DAY_MS };
