import type { Request, Response } from "express";
import { Challenge } from "../models/Challenge.model.js";
import { Team } from "../models/Team.model.js";
import { ApiError } from "../utils/ApiError.js";

/** Codes are compared without the dash and case-insensitively — matches
 *  frontend/lib/data.ts's normalizeCode exactly; keep both in sync. */
function normalizeCode(code: string) {
  return code.replace(/[^a-z0-9]/gi, "").toUpperCase();
}

// GET /invites/:code — frontend: lib/data.ts findByCode
// Response shape (CodeMatch, see frontend/lib/data.ts): either
// { kind: "team", name, code, href, detail } or
// { kind: "challenge", name, code, href, detail }.
export async function getInvite(req: Request, res: Response) {
  const wanted = normalizeCode(req.params.code);
  if (!wanted) throw ApiError.notFound("Invalid code.");

  const team = await Team.findOne({ code: new RegExp(`^${wanted}$`, "i") });
  if (team) {
    res.json({
      kind: "team",
      name: team.name,
      code: team.code,
      href: "/teams",
      detail: `${team.memberIds.length} members`, // TODO(team): add rank/totalTeams once leaderboard ranking exists
    });
    return;
  }

  const challenge = await Challenge.findOne({ code: new RegExp(`^${wanted}$`, "i") });
  if (!challenge) throw ApiError.notFound("That code doesn't match a team or challenge.");

  res.json({
    kind: "challenge",
    name: challenge.name,
    code: challenge.code,
    href: `/challenges/${challenge.id}`,
    detail: `${challenge.current.toLocaleString("en-US")} of ${challenge.target.toLocaleString("en-US")} ${challenge.unit}`,
  });
}

// POST /invites/:code/accept — frontend: app/(app)/actions.ts joinWithCode
//
// TODO(team): add req.user.id to the matched Team.memberIds (or, for a
// challenge invite whose challenge has a teamId, join that team). Reject
// with ApiError.conflict() if the user's already a member.
export async function acceptInvite(req: Request, res: Response) {
  throw ApiError.notFound("TODO: not implemented yet.");
}
