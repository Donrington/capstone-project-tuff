import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError.js";

/** Mount last, after every route — turns a 404 route (not a 404 resource) into a clean error. */
export function notFound(req: Request, res: Response, next: NextFunction) {
  next(ApiError.notFound(`No route: ${req.method} ${req.originalUrl}`));
}

/**
 * The single place HTTP error responses are shaped. Every error ends up
 * here (via `next(err)` or a rejected promise inside `asyncHandler`).
 * Response shape: `{ error: { message, details? } }`.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Express needs 4 params to recognize an error handler.
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: { message: err.message, details: err.details } });
    return;
  }

  console.error(err);
  res.status(500).json({ error: { message: "Something went wrong." } });
}
