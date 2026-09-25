import type { NextFunction, Request, Response } from "express";

/**
 * Wrap every async controller in this: `router.get("/", asyncHandler(fn))`.
 * Express doesn't catch a rejected promise on its own — without this, a
 * thrown ApiError (or any error) inside an `async` handler hangs the
 * request instead of reaching error.middleware.ts.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
