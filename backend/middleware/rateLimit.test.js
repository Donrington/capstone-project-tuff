const test = require("node:test");
const assert = require("node:assert/strict");
const createRateLimit = require("./rateLimit");

function call(limiter, req) {
  return new Promise((resolve) => {
    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        resolve({ status: this.statusCode, body });
      },
    };
    limiter(req, res, () => resolve({ status: 200, body: null }));
  });
}

test("allows 30 requests, then blocks the 31st in the same minute", async () => {
  let now = 0;
  const limiter = createRateLimit({ now: () => now, limit: 30, windowMs: 60_000 });

  for (let i = 0; i < 30; i += 1) {
    assert.equal((await call(limiter, { ip: "1.2.3.4" })).status, 200);
  }
  const blocked = await call(limiter, { ip: "1.2.3.4" });
  assert.equal(blocked.status, 429);
  assert.match(blocked.body.message, /too many requests/i);
});

test("an expired window starts fresh", async () => {
  let now = 0;
  const limiter = createRateLimit({ now: () => now, limit: 2, windowMs: 60_000 });

  assert.equal((await call(limiter, { ip: "1.2.3.4" })).status, 200);
  assert.equal((await call(limiter, { ip: "1.2.3.4" })).status, 200);
  assert.equal((await call(limiter, { ip: "1.2.3.4" })).status, 429);

  now = 60_000;
  assert.equal((await call(limiter, { ip: "1.2.3.4" })).status, 200);
});

test("each IP has its own window", async () => {
  const limiter = createRateLimit({ limit: 1, windowMs: 60_000 });

  assert.equal((await call(limiter, { ip: "1.2.3.4" })).status, 200);
  assert.equal((await call(limiter, { ip: "5.6.7.8" })).status, 200);
  assert.equal((await call(limiter, { ip: "1.2.3.4" })).status, 429);
});

test("falls back to the socket address when req.ip isn't populated", async () => {
  const limiter = createRateLimit({ limit: 1, windowMs: 60_000 });
  const req = { socket: { remoteAddress: "10.0.0.9" } };

  assert.equal((await call(limiter, req)).status, 200);
  assert.equal((await call(limiter, req)).status, 429);
});
