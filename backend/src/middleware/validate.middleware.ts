import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";
import { ApiError } from "../utils/ApiError.js";

/**
 * `router.post("/", validate(createChallengeSchema), asyncHandler(create))`
 * Validates `req.body` against a zod schema and replaces it with the parsed
 * (typed, trimmed, defaulted) result. On failure, responds 400 with one
 * message per field — see validators/*.ts for the schemas.
 */
export function validate(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details: Record<string, string> = {};
      for (const issue of result.error.issues) details[issue.path.join(".") || "_"] = issue.message;
      next(ApiError.badRequest("Check the form and try again.", details));
      return;
    }
    req.body = result.data;
    next();
  };
}
