import { addDays, dayKey, formatDay, normalizeTimeZone } from "./dates";

/**
 * The tiny, public shape shared by the invite API, the join page and the
 * generated share images. Deliberately no ids, email addresses, rosters or
 * challenge descriptions: a code is enough to see *what* you were invited to.
 */
export type InvitePreview =
  | {
      kind: "team";
      name: string;
      memberCount: number;
      inviterFirstName: string;
    }
  | {
      kind: "challenge";
      title: string;
      goal: number;
      unit: string;
      endDate: string;
      inviterFirstName: string;
    };

const MAX_CODE_LENGTH = 32;

/** Codes are typed and pasted with dashes, spaces and mixed case. */
export function normalizeInviteCode(raw: string | null | undefined): string | null {
  const code = (raw ?? "").replace(/[^a-z0-9]/gi, "").toUpperCase();
  return code.length >= 1 && code.length <= MAX_CODE_LENGTH ? code : null;
}

/** Auth return links may only point at a canonical join URL. */
export function safeJoinPath(raw: string | null | undefined): string | null {
  const code = normalizeInviteCode(raw);
  return code ? `/join/${code}` : null;
}

export function inviteTitle(preview: InvitePreview): string {
  return preview.kind === "team" ? preview.name : preview.title;
}

export function inviteKicker(preview: InvitePreview): string {
  return preview.kind === "team" ? "Team invite" : "Challenge invite";
}

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * `timeZone` is the signed-in viewer's zone when one is available. Public share
 * images have no viewer, so they fall back to UTC and render the challenge's
 * stored calendar day as a label — never a browser-locale guess at build time.
 */
export function inviteDetail(preview: InvitePreview, timeZone = "UTC"): string {
  if (preview.kind === "team") {
    return `${preview.memberCount.toLocaleString("en-US")} ${preview.memberCount === 1 ? "member" : "members"}`;
  }
  const zone = normalizeTimeZone(timeZone);
  if (Number.isNaN(Date.parse(preview.endDate))) {
    return `${preview.goal.toLocaleString("en-US")} ${preview.unit}`;
  }
  // The API's endDate is an exclusive instant; the mock's is already an
  // inclusive day key. Only the instant needs a one-day step back.
  const lastDay = DAY_KEY.test(preview.endDate)
    ? preview.endDate
    : dayKey(addDays(preview.endDate, zone, -1), zone);
  const when = ` · ends ${formatDay(lastDay, zone, { month: "short", day: "numeric" })}`;
  return `${preview.goal.toLocaleString("en-US")} ${preview.unit}${when}`;
}
