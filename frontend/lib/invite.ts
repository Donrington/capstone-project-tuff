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

export function inviteDetail(preview: InvitePreview): string {
  if (preview.kind === "team") {
    return `${preview.memberCount.toLocaleString("en-US")} ${preview.memberCount === 1 ? "member" : "members"}`;
  }
  const end = new Date(preview.endDate);
  const when = Number.isNaN(end.getTime())
    ? ""
    : ` · ends ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`;
  return `${preview.goal.toLocaleString("en-US")} ${preview.unit}${when}`;
}
