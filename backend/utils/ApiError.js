/**
 * Throw this from anywhere — a controller, a helper — and the error
 * middleware (middleware/errorHandler.js) turns it into the right HTTP
 * response. Prefer the named helpers below over `new ApiError(...)`
 * directly, so a call site reads as intent ("not found", "conflict") not a
 * bare status number.
 */
class ApiError extends Error {
  /**
   * @param {number} status
   * @param {string} message
   * @param {Record<string, string>} [details] Field-level messages, e.g. `{ email: "Already in use" }`.
   */
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }

  static badRequest(message, details) {
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
  static conflict(message) {
    return new ApiError(409, message);
  }
  static unavailable(message = "That isn't available right now.") {
    return new ApiError(503, message);
  }
}

module.exports = ApiError;
