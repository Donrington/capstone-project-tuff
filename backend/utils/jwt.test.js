const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const {
  signAccessToken,
  verifyAccessToken,
  assertProductionJwtSecret,
  hashRefreshToken,
  generateRefreshToken,
} = require("./jwt");

const SECRET = "a-test-access-secret-that-is-definitely-long-enough";

function withEnv(values, run) {
  const saved = {};
  const keys = Object.keys(values);
  for (const key of keys) saved[key] = process.env[key];
  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    return run();
  } finally {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

test("access tokens are signed and verified with HS256 only", () => {
  withEnv({ JWT_ACCESS_SECRET: SECRET }, () => {
    const token = signAccessToken({ sub: "u1", role: "member" });
    assert.equal(jwt.decode(token, { complete: true }).header.alg, "HS256");
    assert.equal(verifyAccessToken(token).sub, "u1");

    // A valid signature with a different algorithm must not be accepted.
    const hs384 = jwt.sign({ sub: "attacker", role: "admin" }, SECRET, { algorithm: "HS384" });
    assert.throws(() => verifyAccessToken(hs384), /invalid algorithm/i);
  });
});

test("production refuses to start without a strong access secret", () => {
  withEnv({ NODE_ENV: "production", JWT_ACCESS_SECRET: "short" }, () => {
    assert.throws(() => assertProductionJwtSecret(), /at least 32 characters/);
  });
  withEnv({ NODE_ENV: "production", JWT_ACCESS_SECRET: undefined }, () => {
    assert.throws(() => assertProductionJwtSecret(), /at least 32 characters/);
  });
  withEnv({ NODE_ENV: "production", JWT_ACCESS_SECRET: SECRET }, () => {
    assert.doesNotThrow(() => assertProductionJwtSecret());
  });
  withEnv({ NODE_ENV: "development", JWT_ACCESS_SECRET: "short" }, () => {
    assert.doesNotThrow(() => assertProductionJwtSecret());
  });
});

test("refresh tokens are opaque, hashed at rest, and unique", () => {
  const a = generateRefreshToken();
  const b = generateRefreshToken();
  assert.notEqual(a.token, b.token);
  assert.match(a.token, /^[0-9a-f]{96}$/);
  assert.equal(hashRefreshToken(a.token), a.hash);
  assert.notEqual(a.hash, a.token);
});
