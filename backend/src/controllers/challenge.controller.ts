import type { Request, Response } from "express";
import { Activity } from "../models/Activity.model.js";
import { Challenge } from "../models/Challenge.model.js";
import { ApiError } from "../utils/ApiError.js";

// GET /challenges — frontend: lib/data.ts getChallenges
export async function listChallenges(req: Request, res: Response) {
  const challenges = await Challenge.find({
    $or: [{ teamId: null }, { teamId: req.user!.id }], // TODO(team): scope to the user's actual team, not their user id
  });
  res.json(challenges.map((c) => c.toJSON()));
}

// GET /challenges/:id — frontend: lib/data.ts getChallenge
export async function getChallengeById(req: Request, res: Response) {
  const challenge = await Challenge.findById(req.params.id);
  if (!challenge) throw ApiError.notFound("Challenge not found.");
  res.json(challenge.toJSON());
}

// POST /challenges — frontend: lib/data.ts createChallenge
//
// TODO(team): port the slugify()/date-math logic from
// frontend/lib/data.ts (createChallenge, ~line 311) — it's plain JS, no
// framework code in it, so it copies over almost as-is. Also generate an
// invite `code` (see findByCode below) when `isTeam` is true.
export async function createChallenge(req: Request, res: Response) {
  throw ApiError.notFound("TODO: not implemented yet.");
}

// POST /challenges/:id/activities — frontend: lib/data.ts addActivity
//
// TODO(team): port the logic from frontend/lib/data.ts (addActivity,
// ~line 352): create an Activity, bump Challenge.current, and — for a
// "steps" challenge logged "today" — this is also where GET /me/stats/today
// and GET /me/activity/week get their numbers from, so make sure this is
// the *only* place `current`/today's steps change.
export async function addActivity(req: Request, res: Response) {
  const { value, when } = req.body as { value: number; when: "today" | "yesterday" };

  const challenge = await Challenge.findById(req.params.id);
  if (!challenge) throw ApiError.notFound("Challenge not found.");

  const loggedAt = new Date();
  if (when === "yesterday") loggedAt.setDate(loggedAt.getDate() - 1);

  await Activity.create({ userId: req.user!.id, challengeId: challenge.id, loggedAt, value });

  const previous = challenge.current;
  challenge.current += value;
  await challenge.save();

  // Response shape matches frontend's `LoggedActivity` (see the return value
  // of addActivity in lib/data.ts) — the challenge-complete celebration on
  // the frontend reads `completed` off this.
  res.status(201).json({
    challengeId: challenge.id,
    challengeName: challenge.name,
    code: challenge.code ?? null,
    unit: challenge.unit,
    previous,
    current: challenge.current,
    target: challenge.target,
    completed: previous < challenge.target && challenge.current >= challenge.target,
    daysLeft: Math.max(0, challenge.totalDays - (challenge as unknown as { dayIndex: number }).dayIndex),
  });
}
