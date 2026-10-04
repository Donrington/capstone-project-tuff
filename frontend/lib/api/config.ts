/**
 * Where data comes from. `api` (the default) talks to the Express backend
 * at API_URL; `mock` keeps the in-memory demo data — handy without a
 * backend running, and what the e2e tests use.
 */
export const DATA_SOURCE: "api" | "mock" = process.env.TUFF_DATA_SOURCE === "mock" ? "mock" : "api";

/** The backend's base URL, server-side only (the browser never calls it). */
export const API_URL = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");

/** Mock only: set to "admin" to see the app as an admin. The admin pages
 *  change data, so they get a mock DB of their own (see lib/data/mock.ts). */
export const MOCK_ROLE_COOKIE = "tuff-mock-role";

/** Cookie names — the same ones the backend sets (backend/utils/jwt.js). */
export const ACCESS_COOKIE = "tuff_access";
export const REFRESH_COOKIE = "tuff_refresh";
