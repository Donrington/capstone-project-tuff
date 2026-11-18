import { formatCount } from "./challenge-card";
import { pluralize } from "./pluralize";
import type { ChallengeDetail } from "./types";

/**
 * Text and number rules for the personal win cards. Kept out of the image
 * route so the copy can be unit-tested without rendering a PNG.
 */

export const SHARE_CARD_FOOTER = "thetuffapp.com";
export const CARD_FOOTER = SHARE_CARD_FOOTER;
export const CARD_KICKER_CHALLENGE = "Challenge complete";
export const CARD_KICKER_TEAM = "Team challenge complete";
export const CARD_KICKER_STREAK = "Streak";
export const CAMERA_LINE = "Camera-counted";

/** Session names are one display string; the card only needs the first word. */
export function firstNameFrom(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

/** Units arrive plural from the challenges ("squats", "reps", "seconds"). */
export function shareCardUnit(count: number, unit: string): string {
  const plural = unit.endsWith("s") ? unit : `${unit}s`;
  const singular = unit.endsWith("s") ? unit.slice(0, -1) : unit;
  return pluralize(count, singular, plural);
}

export function formatCardCount(count: number): string {
  return formatCount(count);
}

function dayLine(days: number | null | undefined): string | null {
  return days && days > 0 ? `in ${days} ${pluralize(days, "day")}` : null;
}

export interface ChallengeWin {
  /** Always the current user's OWN total — never the team's. */
  total: number;
  days: number | null;
  cameraCounted: boolean;
  /** Team challenges only: the shared total the team finished on. */
  teamTotal: number | null;
}

/**
 * There is no stored per-user completion flag, so a win is derived:
 * - solo: the current user's own total reaches the goal;
 * - team: the goal is the team's shared total, which one person almost never
 *   reaches alone — so it's a win when the TEAM reaches the goal and the user
 *   put something in. The big number on the card is still only their own
 *   part; the team total is shown as context, never as theirs.
 * Teammates' individual entries never reach the card. Null means no win.
 */
export function challengeWinFromDetail(detail: ChallengeDetail): ChallengeWin | null {
  const { challenge, activities, contributions } = detail;
  const mine = activities.filter((a) => a.isCurrentUser);
  const ownTotal = contributions.find((c) => c.isCurrentUser)?.total ?? mine.reduce((sum, a) => sum + a.value, 0);
  const isTeam = Boolean(challenge.teamId);
  if (isTeam ? challenge.current < challenge.goal || ownTotal <= 0 : ownTotal < challenge.goal) return null;

  const loggedDays = new Set(mine.map((a) => a.recordedAt.slice(0, 10))).size;
  return {
    total: ownTotal,
    days: loggedDays > 0 ? loggedDays : challenge.dayIndex > 0 ? challenge.dayIndex : null,
    cameraCounted: mine.some((a) => a.source === "camera"),
    teamTotal: isTeam ? challenge.current : null,
  };
}

export interface ChallengeCardInput {
  title: string;
  total: number;
  unit: string;
  days?: number | null;
  firstName: string;
  cameraCounted?: boolean;
  teamTotal?: number | null;
}

export function challengeCardCopy(input: ChallengeCardInput) {
  const team = typeof input.teamTotal === "number";
  // On a team card the big number is the user's part, so say so — the team's
  // total is the context, not a claim about them.
  const teamLine = team
    ? `My part of the team's ${formatCardCount(input.teamTotal as number)} ${shareCardUnit(input.teamTotal as number, input.unit)}`
    : null;
  return {
    kicker: team ? CARD_KICKER_TEAM : CARD_KICKER_CHALLENGE,
    number: formatCardCount(input.total),
    unit: shareCardUnit(input.total, input.unit),
    title: input.title,
    detail: [teamLine, dayLine(input.days)].filter(Boolean).join(" · ") || null,
    cameraLine: input.cameraCounted ? CAMERA_LINE : null,
    firstName: input.firstName,
  };
}

export interface StreakCardInput {
  days: number;
  firstName: string;
}

export function streakCardCopy(input: StreakCardInput) {
  const unit = pluralize(input.days, "day");
  return {
    kicker: CARD_KICKER_STREAK,
    number: formatCardCount(input.days),
    unit,
    line: `${formatCardCount(input.days)} ${unit} in a row on TUFF`,
    firstName: input.firstName,
  };
}

/** Small aliases keep the older call names readable in tests and callers. */
export const challengeWinCopy = (input: ChallengeCardInput) => {
  const copy = challengeCardCopy(input);
  return {
    kicker: copy.kicker,
    total: copy.number,
    unit: copy.unit,
    title: copy.title,
    days: copy.detail,
    person: copy.firstName,
    camera: copy.cameraLine,
    footer: CARD_FOOTER,
  };
};

export const streakWinCopy = (input: StreakCardInput) => {
  const copy = streakCardCopy(input);
  return {
    kicker: copy.kicker,
    total: copy.number,
    unit: copy.unit,
    line: copy.line,
    person: copy.firstName,
    footer: CARD_FOOTER,
  };
};
