/**
 * Small fixed-window limiter for the one public endpoint that needs it. No new
 * dependency: each instance keeps its own in-memory map, keyed by `req.ip`.
 *
 * `now` is injectable so the tests can advance a window without waiting a
 * minute. Expired windows are swept on every request, so a stream of unique
 * visitor IPs can't leave entries behind forever.
 */
function createRateLimit({
  limit = 30,
  windowMs = 60 * 1000,
  now = () => Date.now(),
} = {}) {
  const windows = new Map();

  return function rateLimit(req, res, next) {
    const ip = req.ip || req.socket?.remoteAddress || "unknown";
    const time = now();

    for (const [key, window] of windows) {
      if (time >= window.resetAt) windows.delete(key);
    }

    let window = windows.get(ip);
    if (!window) {
      window = { count: 0, resetAt: time + windowMs };
      windows.set(ip, window);
    }
    window.count += 1;

    if (window.count > limit) {
      res.status(429).json({ message: "Too many requests. Try again shortly." });
      return;
    }
    next();
  };
}

module.exports = createRateLimit;
