/**
 * Small fixed-window limiter shared by the auth and user endpoints. No new
 * dependency: each instance keeps its own in-memory map. `now` is injectable
 * so tests can advance a window without waiting, and expired windows are
 * swept on every request so a stream of unique keys can't grow it forever.
 *
 * `key` is "ip" (default) or "user" for authenticated routes; a function is
 * accepted for anything more specific. Every request counts, including the
 * ones that end in a successful sign-in — otherwise an attacker could keep a
 * limit parked at zero by interleaving successful attempts.
 */
function createRateLimit({
  limit = 30,
  windowMs = 60 * 1000,
  now = () => Date.now(),
  key = "ip",
  message = "Too many requests. Please slow down and try again.",
} = {}) {
  const windows = new Map();

  function keyFor(req) {
    if (typeof key === "function") return String(key(req));
    if (key === "user") return `user:${req.user?.id ?? "unknown"}`;
    return `ip:${req.ip || req.socket?.remoteAddress || "unknown"}`;
  }

  return function rateLimit(req, res, next) {
    const id = keyFor(req);
    const time = now();

    for (const [windowKey, window] of windows) {
      if (time >= window.resetAt) windows.delete(windowKey);
    }

    let window = windows.get(id);
    if (!window) {
      window = { count: 0, resetAt: time + windowMs };
      windows.set(id, window);
    }
    window.count += 1;

    if (window.count > limit) {
      const seconds = Math.max(1, Math.ceil((window.resetAt - time) / 1000));
      res.set("Retry-After", String(seconds));
      // errorHandler's shape — the frontend's ApiError parser reads error.message.
      res.status(429).json({ error: { message } });
      return;
    }
    next();
  };
}

module.exports = createRateLimit;
