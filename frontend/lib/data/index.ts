import { DATA_SOURCE } from "@/lib/api/config";
import * as mock from "./mock";
import * as real from "./api";

/**
 * The app's only data source. Every page and action imports from here;
 * which implementation answers is decided by TUFF_DATA_SOURCE:
 *
 * - `api` (default): the Express backend, through lib/data/api.ts.
 * - `mock`: the in-memory demo data in lib/data/mock.ts — no backend needed.
 *   The e2e tests run against this.
 *
 * Typed as the mock's module, so if the two ever drift apart (a missing
 * export, a different signature) this file stops compiling.
 *
 * Server-only: import it from Server Components and server actions, never
 * from a `"use client"` file (types are fine).
 */
const source: typeof mock = DATA_SOURCE === "mock" ? mock : real;

export const PERSONA_COOKIE = mock.PERSONA_COOKIE;

export const {
  getPersona,
  getCurrentUser,
  getTodayStats,
  getWeeklyActivity,
  getTeams,
  getTeam,
  getMyTeam,
  getTeamMembers,
  getTeamActivity,
  getTeamSummary,
  getChallenges,
  getChallenge,
  getFeaturedChallenge,
  getStepChallenge,
  getTodayOnChallenge,
  getChallengeDetail,
  getLeaderboard,
  getDashboardLeaderboard,
  getTeammates,
  getActiveChallenges,
  getActivityFeed,
  getNotifications,
  getAchievements,
  getProfile,
  getSearchIndex,
  getSuggestedChallenges,
  findByCode,
  startNewPersona,
  updateProfile,
  updateProfilePhoto,
  updatePassword,
  updateGoals,
  updateNotificationPrefs,
  updatePrivacy,
  completeOnboarding,
  createChallenge,
  joinSuggestedChallenge,
  addActivity,
  addDailySteps,
  createTeam,
  joinTeamByCode,
  leaveTeam,
  joinChallengeByCode,
  deleteAccount,
  markNotificationRead,
  markAllNotificationsRead,
} = source;

export type { CodeMatch, DailyStepsLogged, LoggedActivity, OnboardingAnswers, TeamMember, TeamResult } from "./mock";
