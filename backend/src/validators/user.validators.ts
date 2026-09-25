import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2),
  displayName: z.string().trim().min(1),
  bio: z.string().max(160).default(""),
});

// dataUrl: null removes the photo — see updateProfilePhoto in the frontend's
// lib/data.ts for the exact contract this mirrors.
export const updatePhotoSchema = z.object({
  dataUrl: z.string().nullable(),
});
