/**
 * Where data comes from. `api` (the default) talks to the Express backend
 * at API_URL; `mock` keeps the in-memory demo data — handy without a
 * backend running, and what the e2e tests use.
 */
export const DATA_SOURCE: "api" | "mock" = process.env.TUFF_DATA_SOURCE === "mock" ? "mock" : "api";

/** The backend's base URL, server-side only (the browser never calls it). */
export const API_URL = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");

/** Cookie names — the same ones the backend sets (backend/utils/jwt.js). */
export const ACCESS_COOKIE = "tuff_access";
export const REFRESH_COOKIE = "tuff_refresh";
