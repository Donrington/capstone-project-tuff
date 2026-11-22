const createRateLimit = require("./rateLimit");
const { trustedClientIp } = require("./clientIp");

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/**
 * Pre-auth endpoints limit by IP, but in production every request arrives
 * from the frontend server. When the frontend vouches for the visitor's IP
 * (clientIp.js), the strict per-visitor budget applies; when it doesn't (no
 * shared secret configured yet, or a direct caller), all traffic from that
 * address shares a much larger budget — still a flood guard, but never a
 * site-wide lockout of real users.
 */
function perClientIp({ strict, lenient, windowMs }) {
  const visitor = createRateLimit({ limit: strict, windowMs, key: (req) => `cip:${trustedClientIp(req)}` });
  const shared = createRateLimit({ limit: lenient, windowMs, key: "ip" });
  return function perClientIpLimit(req, res, next) {
    return trustedClientIp(req) ? visitor(req, res, next) : shared(req, res, next);
  };
}

/**
 * Brute force against ONE account is stopped per account, whatever the IP:
 * only failed attempts (401) count, so a real user's successful sign-ins
 * never use up their own budget, and once the budget is spent even the right
 * password waits out the window — an attacker can't interleave a known-good
 * login to reset it.
 */
function perAccountFailures({ limit, windowMs, field = "email" }) {
  const failures = new Map(); // key -> { count, resetAt }
  const keyOf = (req) => `acct:${String(req.body?.[field] ?? "").trim().toLowerCase()}`;
  return function perAccountLimit(req, res, next) {
    const now = Date.now();
    for (const [k, w] of failures) if (w.resetAt <= now) failures.delete(k);
    const key = keyOf(req);
    const window = failures.get(key);
    if (window && window.count >= limit) {
      const seconds = Math.max(1, Math.ceil((window.resetAt - now) / 1000));
      res.set("Retry-After", String(seconds));
      res.status(429).json({ error: { message: "Too many attempts for this account. Try again in a few minutes." } });
      return;
    }
    res.on("finish", () => {
      if (res.statusCode !== 401) return;
      const w = failures.get(key);
      if (!w || w.resetAt <= Date.now()) failures.set(key, { count: 1, resetAt: Date.now() + windowMs });
      else w.count += 1;
    });
    next();
  };
}

const signInPerAccount = perAccountFailures({ limit: 10, windowMs: 15 * MINUTE });
const signInPerIp = perClientIp({ strict: 30, lenient: 600, windowMs: 15 * MINUTE });

module.exports = {
  signIn: [signInPerAccount, signInPerIp],
  signUp: perClientIp({ strict: 5, lenient: 300, windowMs: HOUR }),
  google: perClientIp({ strict: 20, lenient: 600, windowMs: 15 * MINUTE }),
  // Every active session refreshes about every 15 minutes through the
  // frontend server, so the shared budget has to be large.
  refresh: perClientIp({ strict: 60, lenient: 3000, windowMs: 15 * MINUTE }),

  passwordChange: createRateLimit({ limit: 5, windowMs: 15 * MINUTE, key: "user" }),
  accountDelete: createRateLimit({ limit: 5, windowMs: 15 * MINUTE, key: "user" }),
  parseActivity: createRateLimit({ limit: 20, windowMs: HOUR, key: "user" }),
  // Both logging paths share this budget: one user can't double it by
  // splitting entries between a challenge and daily steps.
  logActivity: createRateLimit({ limit: 120, windowMs: HOUR, key: "user" }),
};
