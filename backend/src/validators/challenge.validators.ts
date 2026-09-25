import { z } from "zod";

// Matches createChallenge's `input` in frontend/lib/data.ts exactly.
export const createChallengeSchema = z.object({
  name: z.string().trim().min(2),
  description: z.string().default(""),
  unit: z.enum(["steps", "reps", "seconds"]),
  target: z.number().positive(),
  totalDays: z.number().int().positive(),
  startsTomorrow: z.boolean(),
  isTeam: z.boolean(),
  activity: z.string(),
});

// Matches addActivity's `input` in frontend/lib/data.ts exactly.
export const addActivitySchema = z.object({
  value: z.number().positive(),
  when: z.enum(["today", "yesterday"]),
  note: z.string().optional(),
});
