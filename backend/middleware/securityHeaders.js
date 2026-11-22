/**
 * This is a JSON API with no HTML pages and no browser plugins, so nothing
 * needs to be framed or loaded as a resource from another origin. CSP has no
 * allow-list to keep in sync with a frontend build. HSTS is HTTPS-only in
 * practice, so it's only sent once the deployment says it's in production.
 */
function securityHeaders(req, res, next) {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("X-Frame-Options", "DENY");
  res.set("Referrer-Policy", "no-referrer");
  res.set("Cross-Origin-Resource-Policy", "same-site");
  res.set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  if (process.env.NODE_ENV === "production") {
    res.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  }
  next();
}

module.exports = securityHeaders;
