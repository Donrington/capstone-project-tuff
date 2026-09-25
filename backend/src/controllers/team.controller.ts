import type { Request, Response } from "express";
import { ApiError } from "../utils/ApiError.js";

// GET /me/team — frontend: lib/data.ts getTeamSummary
//
// TODO(team): TeamSummary = { name, code, rank, totalTeams, rivalName,
// gapToRival, members: {initials}[], extraMembers } (frontend/lib/types.ts).
// `rank`/`totalTeams`/`gapToRival` are computed by ranking every Team by
// total score (reuse the leaderboard aggregation in
// leaderboard.controller.ts rather than writing a second version of it).
export async function getMyTeam(req: Request, res: Response) {
  throw ApiError.notFound("TODO: not implemented yet.");
}

// GET /me/team/mates — frontend: lib/data.ts getTeammates
// Returns Pick<User, "id" | "name" | "initials">[] for the current user's team.
export async function getTeammates(req: Request, res: Response) {
  throw ApiError.notFound("TODO: not implemented yet.");
}
