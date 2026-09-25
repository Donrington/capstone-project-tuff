/**
 * Throw this from anywhere — a controller, a service, a validator — and
 * `middleware/error.middleware.ts` turns it into the right HTTP response.
 * Prefer the named helpers below over `new ApiError(...)` directly, so every
 * call site reads as intent ("not found", "forbidden") not a status number.
 */
export class ApiError extends Error {
  status: number;
  /** Field-level messages, e.g. { email: "Already in use" } — optional. */
  details?: Record<string, string>;

  constructor(status: number, message: string, details?: Record<string, string>) {
    super(message);
    this.status = status;
    this.details = details;
  }

  static badRequest(message: string, details?: Record<string, string>) {
    return new ApiError(400, message, details);
  }
  static unauthorized(message = "Sign in required.") {
    return new ApiError(401, message);
  }
  static forbidden(message = "Not allowed.") {
    return new ApiError(403, message);
  }
  static notFound(message = "Not found.") {
    return new ApiError(404, message);
  }
  static conflict(message: string) {
    return new ApiError(409, message);
  }
}
