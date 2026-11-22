/**
 * Pure, dependency-free day-boundary helpers for one user's IANA timezone.
 *
 * Days are identified by a string key ("2026-11-22"), not by a 24-hour
 * timestamp: between spring-forward and fall-back a local day is 23 or 25
 * hours long, so adding 86_400_000 ms is not the next day. Every boundary
 * here is resolved against Intl's zone rules and always returns a real UTC
 * instant that can be stored in MongoDB or compared with a Date.
 */

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const formatterCache = new Map();

function formatterFor(timeZone) {
  // Be forgiving of a copied/pasted zone with stray whitespace. The model and
  // the update route trim before storing; helpers still accept the raw value.
  const name = typeof timeZone === "string" ? timeZone.trim() : timeZone;
  if (typeof name !== "string" || !name) {
    throw new TypeError("timeZone must be a non-empty IANA time zone name");
  }
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

function toDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError("Invalid date");
  return date;
}

const pad = (n) => String(n).padStart(2, "0");

/** True only if Intl can actually apply the zone (Intl throws on garbage). */
function isValidTimeZone(timeZone) {
  try {
    formatterFor(timeZone);
    return true;
  } catch {
    return false;
  }
}

/** The local wall-clock fields of an instant in the given zone. */
function partsAt(value, timeZone) {
  const date = toDate(value);
  const parts = {};
  for (const part of formatterFor(timeZone).formatToParts(date)) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }
  return { ...parts, ms: date.getUTCMilliseconds() };
}

/** The local calendar day of an instant, as "YYYY-MM-DD". */
function dayKey(value, timeZone) {
  const { year, month, day } = partsAt(value, timeZone);
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** How far the zone's wall clock is ahead of UTC at this instant. */
function offsetMsAt(ms, timeZone) {
  const { year, month, day, hour, minute, second, ms: millis } = partsAt(ms, timeZone);
  return Date.UTC(year, month - 1, day, hour, minute, second, millis) - ms;
}

function sameWallTime(parts, candidateMs, timeZone) {
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

/**
 * Resolve a local wall-clock time (as UTC-valued ms) to a UTC instant in the
 * zone. `referenceMs` is an instant in that same local day; it disambiguates
 * fall-back folds by preferring the occurrence that is current at that point.
 *
 * Most instants are found in one offset step. Around a transition we test the
 * offsets observed in a +/-2 day window and verify each candidate. If the
 * wall time is in a spring-forward gap (it never existed), we return the
 * first instant of that local day instead — the conventional answer.
 */
function resolveWallTime(wallMs, targetParts, timeZone, referenceMs) {
  const offsets = new Set([offsetMsAt(referenceMs, timeZone)]);
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

  let best = null;
  for (const offset of offsets) {
    const candidate = wallMs - offset;
    if (candidate <= referenceMs && sameWallTime(targetParts, candidate, timeZone)) {
      if (best === null || candidate > best) best = candidate;
    }
  }
  if (best !== null) return best;

  // Nonexistent wall time (DST gap): find the first instant whose local day
  // is the requested one. Day keys are monotonic across a gap.
  const targetDay = `${targetParts.year}-${pad(targetParts.month)}-${pad(targetParts.day)}`;
  const anchor = wallMs - offsetMsAt(referenceMs, timeZone);
  let lo = anchor - 4 * HOUR_MS;
  let hi = anchor + 6 * HOUR_MS;
  if (dayKey(lo, timeZone) >= targetDay) return new Date(lo);
  if (dayKey(hi, timeZone) < targetDay) return new Date(hi);
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (dayKey(mid, timeZone) < targetDay) lo = mid + 1;
    else hi = mid;
  }
  return new Date(lo);
}

/** First UTC instant of the local day containing `value`. */
function localMidnight(year, month, day, timeZone, referenceMs) {
  const wallMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  const targetParts = { year, month, day, hour: 0, minute: 0, second: 0 };
  return new Date(resolveWallTime(wallMs, targetParts, timeZone, referenceMs ?? wallMs + 12 * HOUR_MS));
}

function startOfDay(value, timeZone) {
  const { year, month, day } = partsAt(value, timeZone);
  return localMidnight(year, month, day, timeZone, toDate(value).getTime());
}

/**
 * Move `count` local calendar days from `value` and return the start of that
 * day as a UTC instant. Unlike `new Date(t + n * DAY_MS)` this stays correct
 * across DST and across months/years.
 */
function addDays(value, timeZone, count) {
  const amount = Math.trunc(Number(count));
  if (!Number.isFinite(amount)) throw new TypeError("count must be a number");
  const { year, month, day } = partsAt(value, timeZone);
  const shifted = new Date(Date.UTC(year, month - 1, day + amount));
  return localMidnight(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate(),
    timeZone,
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate(), 12)
  );
}

/** Numeric position of a day key, so streaks can use calendar arithmetic. */
function dayNumber(key) {
  return Date.parse(`${key}T00:00:00Z`) / DAY_MS;
}

/** Inverse of dayNumber, for walking backwards through consecutive days. */
function dayKeyFromNumber(number) {
  const d = new Date(number * DAY_MS);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

module.exports = {
  isValidTimeZone,
  dayKey,
  dayNumber,
  dayKeyFromNumber,
  partsAt,
  startOfDay,
  addDays,
  MINUTE_MS,
  HOUR_MS,
  DAY_MS,
};
