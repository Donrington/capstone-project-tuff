const ApiError = require("../utils/ApiError");

/** Mount last, after every route — turns a 404 route (not a 404 resource) into a clean error. */
function notFound(req, res, next) {
  next(ApiError.notFound(`No route: ${req.method} ${req.originalUrl}`));
}

/**
 * The single place HTTP error responses are shaped. Every error ends up
 * here (via `next(err)`, or a rejected promise inside asyncHandler).
 * Response shape: `{ error: { message, details? } }`.
 */
// eslint-disable-next-line no-unused-vars -- Express needs 4 params to recognize an error handler.
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: { message: err.message, details: err.details } });
    return;
  }

  // A Mongoose validation error (e.g. a bad enum value) — surface the
  // field-level messages instead of a generic 500.
  if (err.name === "ValidationError" && err.errors) {
    const details = {};
    for (const field in err.errors) details[field] = err.errors[field].message;
    res.status(400).json({ error: { message: "Check the form and try again.", details } });
    return;
  }

  // Mongoose's duplicate-key error (a `unique: true` field, e.g. email).
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    res.status(409).json({ error: { message: `That ${field} is already in use.` } });
    return;
  }

  console.error(err);
  res.status(500).json({ error: { message: "Something went wrong." } });
}

module.exports = { notFound, errorHandler };
