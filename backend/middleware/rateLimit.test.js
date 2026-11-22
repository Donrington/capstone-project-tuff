const test = require("node:test");
const assert = require("node:assert/strict");
const createRateLimit = require("./rateLimit");

function call(limiter, req) {
  return new Promise((resolve) => {
    const res = {
      headers: {},
      status(code) {
        this.statusCode = code;
        return this;
      },
      set(name, value) {
        this.headers[name] = value;
        return this;
      },
      json(body) {
        resolve({ status: this.statusCode, body, headers: this.headers });
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
  assert.match(blocked.body.error.message, /too many requests/i);
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

test("a blocked request gets the API error shape and a Retry-After in seconds", async () => {
  let now = 0;
  const limiter = createRateLimit({ limit: 1, windowMs: 90_000, now: () => now });

  assert.equal((await call(limiter, { ip: "1.2.3.4" })).status, 200);
  now = 30_000;
  const blocked = await call(limiter, { ip: "1.2.3.4" });
  assert.equal(blocked.status, 429);
  assert.match(blocked.body.error.message, /too many requests/i);
  assert.equal(blocked.headers["Retry-After"], "60");
});

test("the user key separates signed-in users sharing one IP", async () => {
  const limiter = createRateLimit({ limit: 1, windowMs: 60_000, key: "user" });
  const ada = { ip: "10.0.0.1", user: { id: "ada" } };
  const kofi = { ip: "10.0.0.1", user: { id: "kofi" } };

  assert.equal((await call(limiter, ada)).status, 200);
  assert.equal((await call(limiter, kofi)).status, 200);
  assert.equal((await call(limiter, ada)).status, 429);
});

test("a successful request still consumes its slot", async () => {
  let successes = 0;
  const limiter = createRateLimit({ limit: 2, windowMs: 60_000, key: "user" });
  const req = { user: { id: "ada" } };
  const succeed = new Promise((resolve) => {
    limiter(req, responseFor(), () => {
      successes += 1;
      resolve();
    });
  });
  await succeed;
  assert.equal(successes, 1);
  assert.equal((await call(limiter, req)).status, 200);
  assert.equal((await call(limiter, req)).status, 429);
});

function responseFor() {
  return {
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    set(name, value) {
      this.headers[name] = value;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}
