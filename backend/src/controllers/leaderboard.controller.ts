import type { Request, Response } from "express";
import { ApiError } from "../utils/ApiError.js";

// GET /leaderboard?period=week|all-time — frontend: lib/data.ts getLeaderboard
//
// TODO(team): LeaderboardEntry[] = { rank, previousRank?, user: {id, name,
// initials}, teamName, score, scoreUnit, isCurrentUser? } — ranked by summed
// Activity value per user (period="week" filters loggedAt to the last 7
// days; "all-time" doesn't filter). Sort descending by score, then assign
// `rank` by position. Mark the row matching req.user.id as
// isCurrentUser: true.
export async function getLeaderboard(req: Request, res: Response) {
  const period = req.query.period === "all-time" ? "all-time" : "week";
  throw ApiError.notFound(`TODO: not implemented yet (period=${period}).`);
}
