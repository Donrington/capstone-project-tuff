"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MOCK_SESSION_COOKIE } from "@/lib/auth/get-current-user";
import { api, ApiError } from "@/lib/api/client";
import { DATA_SOURCE } from "@/lib/api/config";
import { clearSessionCookies } from "@/lib/api/cookies";
import {
  PERSONA_COOKIE,
  addActivity,
  addDailySteps,
  parseActivityText,
  deleteAccount,
  joinChallengeByCode,
  completeOnboarding,
  createChallenge,
  createTeam,
  findByCode,
  joinSuggestedChallenge,
  joinTeamByCode,
  leaveTeam,
  markAllNotificationsRead,
  markNotificationRead,
  updateGoals,
  updateNotificationPrefs,
  updatePassword,
  updatePrivacy,
  updateProfile,
  updateProfilePhoto,
  type DailyStepsLogged,
  type LoggedActivity,
} from "@/lib/data";
import { DAILY_STEPS_ID } from "@/lib/daily-steps";
import type { FitnessLevel, Gender, Motivation, NotificationPrefs, Persona, ProfileVisibility } from "@/lib/types";

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

const YEAR = 60 * 60 * 24 * 365;

function refresh() {
  revalidatePath("/", "layout");
}

/**
 * Turns a backend validation error into form state: field messages where the
 * backend named the field, otherwise one message. Anything that isn't an
 * ApiError (a redirect, a real bug) is rethrown.
 */
function failed<Field extends string>(err: unknown, values?: ActionState<Field>["values"]): ActionState<Field> {
  if (!(err instanceof ApiError)) throw err;
  return {
    errors: err.details as ActionState<Field>["errors"],
    message: err.details ? undefined : err.message,
    values,
  };
}

/* ------------------------------------------------------------- logging --- */

export type LogActivityState = ActionState<"challengeId" | "value"> & {
  logged?: LoggedActivity;
  /** Set instead of `logged` when the entry was steps with no challenge. */
  daily?: DailyStepsLogged;
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
  const daily = challengeId === DAILY_STEPS_ID;

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

  if (daily) {
    try {
      const result = await addDailySteps({ value, when });
      refresh();
      return { ok: true, daily: result };
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
      return { errors: { value: err.message }, values: { challengeId, value: raw } };
    }
  }

  let logged;
  try {
    logged = await addActivity({ challengeId, value, when, note: note || undefined });
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
    return { errors: { value: err.message }, values: { challengeId, value: raw } };
  }
  if (!logged) {
    return { errors: { challengeId: "That challenge isn't there any more." } };
  }

  refresh();
  return { ok: true, logged };
}

/** The log dialog's "describe it" field. Only ever fills in the amount —
 *  the entry itself still goes through logActivity above, same validation
 *  either way. */
export async function parseActivityTextAction(
  text: string,
  unit: string,
): Promise<{ value: number } | { error: string }> {
  if (!text.trim()) return { error: "Describe what you did." };
  return parseActivityText({ text, unit });
}

/* ------------------------------------------------------------- session --- */

export async function signOut() {
  const jar = await cookies();
  if (DATA_SOURCE === "api") {
    // Revokes the refresh token server-side, then drops our copies.
    await api("/api/auth/sign-out", { method: "POST", session: true }).catch(() => undefined);
    await clearSessionCookies();
  } else {
    // The mock remembers you signed out, so the nav shows its signed-out
    // state until you sign in again.
    jar.set(MOCK_SESSION_COOKIE, "signed-out", { path: "/", sameSite: "lax", httpOnly: true, maxAge: YEAR });
  }
  jar.delete(PERSONA_COOKIE);
  redirect("/");
}

/** Dev only (#20): flips between the returning and brand-new datasets. */
export async function switchPersonaAction(persona: Persona) {
  if (process.env.NODE_ENV === "production" || DATA_SOURCE !== "mock") return;
  (await cookies()).set(PERSONA_COOKIE, persona, { path: "/", sameSite: "lax", httpOnly: true, maxAge: YEAR });
  refresh();
  redirect("/dashboard");
}

/* ------------------------------------------------------- notifications --- */

export async function markNotificationReadAction(id: string) {
  await markNotificationRead(id);
  refresh();
}

export async function markAllNotificationsReadAction() {
  await markAllNotificationsRead();
  refresh();
}

/* --------------------------------------------------------- invites/teams --- */

export type JoinState = ActionState<"code">;

const NO_MATCH = "That code doesn't match a team or challenge. Check it with whoever sent it.";

export async function joinWithCode(_prev: JoinState, formData: FormData): Promise<JoinState> {
  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { errors: { code: "Enter the code you were sent." } };

  const match = await findByCode(code);
  if (!match) return { errors: { code: NO_MATCH }, values: { code } };

  const result = match.kind === "team" ? await joinTeamByCode(match.code) : await joinChallengeByCode(match.code);
  if (!result.ok) return { errors: { code: result.error }, values: { code } };

  refresh();
  redirect(`${match.href}?flash=joined`);
}

export type CreateTeamState = ActionState<"name" | "description">;

export async function createTeamAction(_prev: CreateTeamState, formData: FormData): Promise<CreateTeamState> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  const errors: CreateTeamState["errors"] = {};
  if (name.length < 3) errors.name = "Give the team a name of at least 3 characters.";
  else if (name.length > 40) errors.name = "Keep the name under 40 characters.";
  if (description.length > 160) errors.description = "Keep it under 160 characters.";
  if (Object.keys(errors).length > 0) return { errors, values: { name, description } };

  const result = await createTeam({ name, description });
  if (!result.ok) return { errors: { name: result.error }, values: { name, description } };

  refresh();
  redirect(`/teams/${result.teamId}?flash=team-created`);
}

export async function leaveTeamAction() {
  await leaveTeam();
  refresh();
  redirect("/teams?flash=left-team");
}

/* ----------------------------------------------------------- challenges --- */

export type CreateChallengeState = ActionState<"title" | "goal" | "days">;

export async function createChallengeAction(
  _prev: CreateChallengeState,
  formData: FormData,
): Promise<CreateChallengeState> {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const unit = String(formData.get("unit") ?? "reps");
  const activity = String(formData.get("activity") ?? "");
  const isTeam = formData.get("type") === "team";
  const startsTomorrow = formData.get("start") === "tomorrow";
  const goal = Number(String(formData.get("goal") ?? ""));
  const totalDays = Number(String(formData.get("days") ?? ""));

  const errors: CreateChallengeState["errors"] = {};
  if (title.length < 3) errors.title = "Give the challenge a name people will recognise.";
  if (!Number.isInteger(goal) || goal <= 0) errors.goal = "Use a whole number above zero.";
  if (!Number.isInteger(totalDays) || totalDays < 3 || totalDays > 90) {
    errors.days = "Pick a length between 3 and 90 days.";
  }

  if (Object.keys(errors).length > 0) return { errors };

  let challenge;
  try {
    challenge = await createChallenge({
      title,
      description: description || `${goal.toLocaleString("en-US")} ${unit} in ${totalDays} days.`,
      unit,
      goal,
      totalDays,
      startsTomorrow,
      isTeam,
      activity,
    });
  } catch (err) {
    return failed(err);
  }

  refresh();
  redirect(`/challenges/${challenge.id}?flash=created`);
}

/** Starts one of the ready-made challenges (first-run dashboard). */
export async function joinSuggestedChallengeAction(id: string) {
  const challenge = await joinSuggestedChallenge(id);
  refresh();
  if (challenge) redirect(`/challenges/${challenge.id}?flash=joined`);
}

/* ------------------------------------------------------------- settings --- */

export type UpdateProfileState = ActionState<"firstName" | "lastName" | "displayName" | "bio">;

const BIO_LIMIT = 160;

export async function updateProfileAction(
  _prev: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();

  const errors: UpdateProfileState["errors"] = {};
  if (firstName.length < 1) errors.firstName = "Tell us what to call you.";
  if (lastName.length < 1) errors.lastName = "Enter your last name.";
  if (displayName.length < 1) errors.displayName = "Pick a display name.";
  else if (displayName.length > 40) errors.displayName = "Keep it under 40 characters.";
  if (bio.length > BIO_LIMIT) errors.bio = `Keep it under ${BIO_LIMIT} characters.`;

  if (Object.keys(errors).length > 0) {
    return { errors, values: { firstName, lastName, displayName, bio } };
  }

  try {
    await updateProfile({ firstName, lastName, displayName, bio });
  } catch (err) {
    return failed(err, { firstName, lastName, displayName, bio });
  }
  refresh();
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

  try {
    await updateProfilePhoto(dataUrl);
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
    return { ok: false, error: err.message };
  }
  refresh();
  return { ok: true };
}

export type UpdatePasswordState = ActionState<"currentPassword" | "newPassword" | "confirmPassword">;

export async function updatePasswordAction(
  _prev: UpdatePasswordState,
  formData: FormData,
): Promise<UpdatePasswordState> {
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const errors: UpdatePasswordState["errors"] = {};
  if (!currentPassword) errors.currentPassword = "Enter your current password.";
  if (newPassword.length < 8) errors.newPassword = "Use at least 8 characters.";
  else if (newPassword === currentPassword) errors.newPassword = "Pick a password you're not already using.";
  if (confirmPassword !== newPassword) errors.confirmPassword = "The two passwords don't match.";
  if (Object.keys(errors).length > 0) return { errors };

  let result;
  try {
    result = await updatePassword({ currentPassword, newPassword });
  } catch (err) {
    return failed(err);
  }
  if (!result.ok) return { errors: { currentPassword: "That's not your current password." } };
  return { ok: true, message: "Password changed. Other devices are signed out." };
}

export type UpdateGoalsState = ActionState<"stepGoal" | "workoutDaysPerWeek">;

export async function updateGoalsAction(_prev: UpdateGoalsState, formData: FormData): Promise<UpdateGoalsState> {
  const preset = String(formData.get("stepGoal") ?? "");
  const raw = preset === "custom" ? String(formData.get("customStepGoal") ?? "") : preset;
  const stepGoal = Number(raw);
  const workoutDaysPerWeek = Number(String(formData.get("workoutDaysPerWeek") ?? ""));

  const errors: UpdateGoalsState["errors"] = {};
  if (!Number.isInteger(stepGoal) || stepGoal < 1000 || stepGoal > 100000) {
    errors.stepGoal = "Pick a goal between 1,000 and 100,000 steps.";
  }
  if (!Number.isInteger(workoutDaysPerWeek) || workoutDaysPerWeek < 0 || workoutDaysPerWeek > 7) {
    errors.workoutDaysPerWeek = "Pick between 0 and 7 days.";
  }
  if (Object.keys(errors).length > 0) return { errors, values: { stepGoal: raw } };

  try {
    await updateGoals({ stepGoal, workoutDaysPerWeek });
  } catch (err) {
    return failed(err, { stepGoal: raw });
  }
  refresh();
  return { ok: true, message: "Saved." };
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function updateNotificationPrefsAction(
  _prev: ActionState<"reminderTime">,
  formData: FormData,
): Promise<ActionState<"reminderTime">> {
  const reminderTime = String(formData.get("reminderTime") ?? "");
  if (!TIME_RE.test(reminderTime)) return { errors: { reminderTime: "Pick a time, like 18:00." } };

  const on = (key: keyof NotificationPrefs) => formData.get(key) === "on";
  try {
    await updateNotificationPrefs({
      streakReminders: on("streakReminders"),
      teamActivity: on("teamActivity"),
      leaderboardChanges: on("leaderboardChanges"),
      challengeInvites: on("challengeInvites"),
      weeklySummary: on("weeklySummary"),
      reminderTime,
    });
  } catch (err) {
    return failed(err);
  }
  refresh();
  return { ok: true, message: "Saved." };
}

const VISIBILITY: ProfileVisibility[] = ["everyone", "teammates", "only_me"];

export async function updatePrivacyAction(
  _prev: ActionState<"profileVisibility">,
  formData: FormData,
): Promise<ActionState<"profileVisibility">> {
  const profileVisibility = String(formData.get("profileVisibility") ?? "") as ProfileVisibility;
  if (!VISIBILITY.includes(profileVisibility)) {
    return { errors: { profileVisibility: "Pick who can see your profile." } };
  }
  try {
    await updatePrivacy({ showOnLeaderboards: formData.get("showOnLeaderboards") === "on", profileVisibility });
  } catch (err) {
    return failed(err);
  }
  refresh();
  return { ok: true, message: "Saved." };
}

export type DeleteAccountState = ActionState<"confirm">;

export async function deleteAccountAction(_prev: DeleteAccountState, formData: FormData): Promise<DeleteAccountState> {
  if (String(formData.get("confirm") ?? "") !== "DELETE") {
    return { errors: { confirm: "Type DELETE, in capitals, to confirm." } };
  }
  let result;
  try {
    result = await deleteAccount();
  } catch (err) {
    return failed(err);
  }
  if (!result.ok) return { message: result.message };
  (await cookies()).delete(PERSONA_COOKIE);
  redirect("/?flash=account-deleted");
}

/* ----------------------------------------------------------- onboarding --- */

const MOTIVATIONS: Motivation[] = [
  "lose_weight",
  "build_muscle",
  "get_stronger",
  "more_energy",
  "feel_confident",
  "team",
  // Older wording, still accepted so a half-finished form from before works.
  "move_more",
  "build_streak",
  "compete",
];
const GENDERS: Gender[] = ["male", "female", "other"];
const LEVELS: FitnessLevel[] = ["beginner", "intermediate", "advanced"];

export type OnboardingState = ActionState<
  "dateOfBirth" | "height" | "weight" | "teamCode" | "teamName" | "stepGoal"
>;

/** The whole flow posts once at the end. Every answer is optional. */
export async function completeOnboardingAction(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const motivations = formData
    .getAll("motivations")
    .map(String)
    .filter((m): m is Motivation => MOTIVATIONS.includes(m as Motivation));
  const stepGoalRaw = String(formData.get("stepGoal") ?? "");
  const dateOfBirth = String(formData.get("dateOfBirth") ?? "").trim();
  const gender = String(formData.get("gender") ?? "");
  const heightRaw = String(formData.get("height") ?? "").trim();
  const weightRaw = String(formData.get("weight") ?? "").trim();
  const fitnessLevel = String(formData.get("fitnessLevel") ?? "");
  const challengeIds = formData.getAll("challengeIds").map(String);
  const teamChoice = String(formData.get("teamChoice") ?? "skip");
  const teamCode = String(formData.get("teamCode") ?? "").trim();
  const teamName = String(formData.get("teamName") ?? "").trim();

  const errors: OnboardingState["errors"] = {};
  const stepGoal = stepGoalRaw && stepGoalRaw !== "later" ? Number(stepGoalRaw) : undefined;
  if (stepGoal !== undefined && (!Number.isInteger(stepGoal) || stepGoal < 1000 || stepGoal > 100000)) {
    errors.stepGoal = "Pick one of the goals, or set it later.";
  }
  if (dateOfBirth) {
    const dob = new Date(dateOfBirth);
    if (Number.isNaN(dob.getTime()) || dob > new Date()) errors.dateOfBirth = "Enter a real date of birth.";
  }
  const height = heightRaw ? Number(heightRaw) : undefined;
  if (height !== undefined && (!Number.isFinite(height) || height < 50 || height > 300)) {
    errors.height = "Enter your height in centimetres, between 50 and 300.";
  }
  const weight = weightRaw ? Number(weightRaw) : undefined;
  if (weight !== undefined && (!Number.isFinite(weight) || weight < 20 || weight > 400)) {
    errors.weight = "Enter your weight in kilograms, 20 or more.";
  }
  if (teamChoice === "join" && !teamCode) errors.teamCode = "Enter the code you were sent, or skip this step.";
  if (teamChoice === "create" && teamName.length < 3) errors.teamName = "Give the team a name of at least 3 characters.";
  if (Object.keys(errors).length > 0) return { errors };

  if (teamChoice === "join") {
    const result = await joinTeamByCode(teamCode);
    if (!result.ok) return { errors: { teamCode: result.error } };
  } else if (teamChoice === "create") {
    const result = await createTeam({ name: teamName, description: "" });
    if (!result.ok) return { errors: { teamName: result.error } };
  }

  try {
    await completeOnboarding({
      motivations,
      stepGoal,
      dateOfBirth: dateOfBirth || undefined,
      gender: GENDERS.includes(gender as Gender) ? (gender as Gender) : undefined,
      height,
      weight,
      fitnessLevel: LEVELS.includes(fitnessLevel as FitnessLevel) ? (fitnessLevel as FitnessLevel) : undefined,
      challengeIds,
    });
  } catch (err) {
    return failed(err);
  }

  refresh();
  redirect("/dashboard?flash=welcome");
}
