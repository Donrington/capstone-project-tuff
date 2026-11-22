const crypto = require("crypto");

/**
 * The frontend server makes every API call (the browser never does), so
 * req.ip is our own server's address for all visitors. The frontend forwards
 * the visitor's IP in x-tuff-client-ip, and proves the header is ours with a
 * shared secret in x-tuff-edge-key. Without a valid secret the header is
 * ignored — otherwise any client could pick an IP to dodge a rate limit.
 */
const CLIENT_IP_HEADER = "x-tuff-client-ip";
const EDGE_KEY_HEADER = "x-tuff-edge-key";
const IP_SHAPE = /^[0-9a-fA-F:.]{2,45}$/;

function edgeSecretOk(req) {
  const secret = process.env.EDGE_SHARED_SECRET;
  if (!secret || secret.length < 32) return false;
  const given = Buffer.from(String(req.get?.(EDGE_KEY_HEADER) ?? req.headers?.[EDGE_KEY_HEADER] ?? ""));
  const expected = Buffer.from(secret);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

/** The visitor's real IP when the frontend vouched for it, else null. */
function trustedClientIp(req) {
  if (!edgeSecretOk(req)) return null;
  const ip = String(req.get?.(CLIENT_IP_HEADER) ?? req.headers?.[CLIENT_IP_HEADER] ?? "").trim();
  return IP_SHAPE.test(ip) ? ip : null;
}

module.exports = { trustedClientIp, CLIENT_IP_HEADER, EDGE_KEY_HEADER };
