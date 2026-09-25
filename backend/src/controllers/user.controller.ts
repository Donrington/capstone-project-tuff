import type { Request, Response } from "express";
import { User } from "../models/User.model.js";
import { ApiError } from "../utils/ApiError.js";

// GET /me — frontend: lib/data.ts getCurrentUser
export async function getMe(req: Request, res: Response) {
  const user = await User.findById(req.user!.id);
  if (!user) throw ApiError.notFound();
  res.json(user.toJSON());
}

// PATCH /me — frontend: lib/data.ts updateProfile
export async function updateMe(req: Request, res: Response) {
  const { name, displayName, bio } = req.body as {
    name: string;
    displayName: string;
    bio: string;
  };

  const user = await User.findByIdAndUpdate(
    req.user!.id,
    { name, firstName: name.split(" ")[0] || name, displayName, bio },
    { new: true },
  );
  if (!user) throw ApiError.notFound();
  res.json(user.toJSON());
}

// PUT /me/photo — frontend: lib/data.ts updateProfilePhoto
//
// TODO(team): the frontend still sends a resized data URL — swap this for
// real object storage (S3, Cloudinary, etc.) once someone owns that: accept
// a multipart upload (or a signed-upload flow) instead of a data URL, store
// the resulting CDN URL on `photoUrl`, and update lib/image.ts on the
// frontend to match whatever upload contract you land on.
export async function updateMyPhoto(req: Request, res: Response) {
  const { dataUrl } = req.body as { dataUrl: string | null };

  const user = await User.findByIdAndUpdate(req.user!.id, { photoUrl: dataUrl }, { new: true });
  if (!user) throw ApiError.notFound();
  res.json(user.toJSON());
}

// GET /me/stats/today — frontend: lib/data.ts getTodayStats
//
// TODO(team): TodayStats = { steps, stepGoal, activeMinutes, calories,
// streakDays }. Aggregate from today's Activity documents for the current
// user (unit === "steps") plus User.stepGoal and a streak computed from
// consecutive days with at least one logged activity.
export async function getTodayStats(req: Request, res: Response) {
  throw ApiError.notFound("TODO: not implemented yet.");
}

// GET /me/activity/week — frontend: lib/data.ts getWeeklyActivity
//
// TODO(team): DayActivity[] = { day, steps, today? }[], 7 entries, oldest
// first. Group the current user's step-unit Activity documents by day for
// the last 7 days.
export async function getWeeklyActivity(req: Request, res: Response) {
  throw ApiError.notFound("TODO: not implemented yet.");
}

// GET /me/profile — frontend: lib/data.ts getProfile
//
// TODO(team): Profile = { user, stats, achievements, personalBests,
// recentActivity, activeChallenges } — see frontend/lib/types.ts for every
// field. This is a fan-in of several other queries; build it last, once
// getTodayStats/getWeeklyActivity/achievements exist, by calling into those
// same helper functions rather than duplicating the aggregation logic here.
export async function getMyProfile(req: Request, res: Response) {
  throw ApiError.notFound("TODO: not implemented yet.");
}
