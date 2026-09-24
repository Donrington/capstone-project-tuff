"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MOCK_SESSION_COOKIE } from "@/lib/auth/get-current-user";
import {
  addActivity,
  createChallenge,
  findByCode,
  setActivityFeedSeen,
  updateProfile,
  updateProfilePhoto,
  type LoggedActivity,
} from "@/lib/data";

/**
 * Server actions for the app shell. Every action validates its input, calls a
 * mutation in `lib/data.ts`, then revalidates so each screen re-reads the
 * mock DB.
 */

/** Mirrors `AuthState` in `app/(auth)/actions.ts`, so forms read the same way. */
export interface ActionState<Field extends string = string> {
  ok?: boolean;
  errors?: Partial<Record<Field, string>>;
  message?: string;
  values?: Partial<Record<Field, string>>;
}

export type LogActivityState = ActionState<"challengeId" | "value"> & {
  logged?: LoggedActivity;
};

/** One entry can only hold so much before it's probably a typo. */
const CAPS: Record<string, number> = { reps: 1000, steps: 100000, seconds: 3600 };

const EMPTY_MESSAGE: Record<string, string> = {
  reps: "Enter how many reps you did.",
  steps: "Enter how many steps you took.",
  seconds: "Enter how many seconds you held.",
};

export async function logActivity(
  _prev: LogActivityState,
  formData: FormData,
): Promise<LogActivityState> {
  const challengeId = String(formData.get("challengeId") ?? "").trim();
  const unit = String(formData.get("unit") ?? "reps");
  const raw = String(formData.get("value") ?? "").trim();
  const when = formData.get("when") === "yesterday" ? "yesterday" : "today";
  const note = String(formData.get("note") ?? "").trim();

  const errors: LogActivityState["errors"] = {};
  if (!challengeId) errors.challengeId = "Pick a challenge to log against.";

  const value = Number(raw);
  if (!raw) {
    errors.value = EMPTY_MESSAGE[unit] ?? "Enter how much you did.";
  } else if (!Number.isInteger(value) || value <= 0) {
    errors.value = "Use a whole number above zero.";
  } else if (value > (CAPS[unit] ?? 1000)) {
    errors.value = "That's more than one entry can hold. Split it into two.";
  }

  if (Object.keys(errors).length > 0) {
    return { errors, values: { challengeId, value: raw } };
  }

  const logged = await addActivity({ challengeId, value, when, note: note || undefined });
  if (!logged) {
    return { errors: { challengeId: "That challenge isn't there any more." } };
  }

  revalidatePath("/", "layout");
  return { ok: true, logged };
}

export async function signOut() {
  // TODO(auth): end the real session. The mock remembers you signed out, so
  // the nav shows its signed-out state until you sign in again.
  (await cookies()).set(MOCK_SESSION_COOKIE, "signed-out", {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/");
}

/** Clears the activity bell's unread dot. Called from the client when the
 *  panel opens — see components/shell/ActivityBell.tsx. */
export async function markActivityFeedSeen() {
  await setActivityFeedSeen();
  revalidatePath("/", "layout");
}

export type JoinState = ActionState<"code">;

const NO_MATCH = "That code doesn't match a team or challenge. Check it with whoever sent it.";

export async function joinWithCode(_prev: JoinState, formData: FormData): Promise<JoinState> {
  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { errors: { code: "Enter the code you were sent." } };

  const match = await findByCode(code);
  if (!match) return { errors: { code: NO_MATCH }, values: { code } };

  // TODO(backend): POST /invites/:code/accept — add the user to the roster.
  revalidatePath("/", "layout");
  redirect(`${match.href}?flash=joined`);
}

export type UpdateProfileState = ActionState<"name" | "displayName" | "bio">;

const BIO_LIMIT = 160;

export async function updateProfileAction(
  _prev: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const name = String(formData.get("name") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();

  const errors: UpdateProfileState["errors"] = {};
  if (name.length < 2) errors.name = "Tell us what to call you.";
  if (displayName.length < 1) errors.displayName = "Pick a display name.";
  if (bio.length > BIO_LIMIT) errors.bio = `Keep it under ${BIO_LIMIT} characters.`;

  if (Object.keys(errors).length > 0) {
    return { errors, values: { name, displayName, bio } };
  }

  await updateProfile({ name, displayName, bio });
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}

/** ~2MB of base64 is a generous ceiling for a 320px avatar — the client
 *  resizes before calling this, so a legitimate upload never gets close. */
const MAX_PHOTO_DATA_URL_LENGTH = 2_000_000;
const ALLOWED_PHOTO_PREFIX = /^data:image\/(jpeg|png|webp|gif);base64,/;

/**
 * Called directly from a client `onClick` (not a `<form>`), so it takes a
 * plain argument instead of `(prevState, formData)`. `dataUrl: null` removes
 * the photo.
 */
export async function updateProfilePhotoAction(
  dataUrl: string | null,
): Promise<{ ok: boolean; error?: string }> {
  if (dataUrl !== null) {
    if (!ALLOWED_PHOTO_PREFIX.test(dataUrl)) {
      return { ok: false, error: "Use a JPEG, PNG, WebP or GIF." };
    }
    if (dataUrl.length > MAX_PHOTO_DATA_URL_LENGTH) {
      return { ok: false, error: "That photo's too large." };
    }
  }

  await updateProfilePhoto(dataUrl);
  revalidatePath("/", "layout");
  return { ok: true };
}

export type CreateChallengeState = ActionState<"name" | "target" | "days">;

export async function createChallengeAction(
  _prev: CreateChallengeState,
  formData: FormData,
): Promise<CreateChallengeState> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const unit = String(formData.get("unit") ?? "reps");
  const activity = String(formData.get("activity") ?? "");
  const isTeam = formData.get("type") === "team";
  const startsTomorrow = formData.get("start") === "tomorrow";
  const target = Number(String(formData.get("target") ?? ""));
  const totalDays = Number(String(formData.get("days") ?? ""));

  const errors: CreateChallengeState["errors"] = {};
  if (name.length < 3) errors.name = "Give the challenge a name people will recognise.";
  if (!Number.isInteger(target) || target <= 0) errors.target = "Use a whole number above zero.";
  if (!Number.isInteger(totalDays) || totalDays < 3 || totalDays > 90) {
    errors.days = "Pick a length between 3 and 90 days.";
  }

  if (Object.keys(errors).length > 0) return { errors };

  const challenge = await createChallenge({
    name,
    description: description || `${target.toLocaleString("en-US")} ${unit} in ${totalDays} days.`,
    unit,
    target,
    totalDays,
    startsTomorrow,
    isTeam,
    activity,
  });

  revalidatePath("/", "layout");
  redirect(`/challenges/${challenge.id}?flash=created`);
}
