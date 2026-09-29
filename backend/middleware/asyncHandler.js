/**
 * Wrap every async controller in this: `router.post("/", asyncHandler(fn))`.
 * Express doesn't catch a rejected promise on its own — without this, a
 * thrown ApiError (or any error) inside an `async` handler hangs the
 * request instead of reaching the error middleware.
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
