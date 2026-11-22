const test = require("node:test");
const assert = require("node:assert/strict");
const limiters = require("./limiters");
const authRoutes = require("../routes/authRoutes");
const userRoutes = require("../routes/userRoutes");
const participantRoutes = require("../routes/challengeParticipantRoutes");

function call(limiter, req) {
  return new Promise((resolve) => {
    const res = {
      set() {
        return this;
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        resolve({ status: this.statusCode, body });
      },
    };
    limiter(req, res, () => resolve({ status: 200 }));
  });
}

const budgets = [
  ["passwordChange", 5, { user: { id: "user-password" } }],
  ["accountDelete", 5, { user: { id: "user-delete" } }],
  ["parseActivity", 20, { user: { id: "user-parse" } }],
  ["logActivity", 120, { user: { id: "user-log" } }],
];

for (const [name, limit, req] of budgets) {
  test(`${name} limiter allows ${limit} requests then returns 429`, async () => {
    for (let i = 0; i < limit; i += 1) {
      assert.equal((await call(limiters[name], req)).status, 200);
    }
    const blocked = await call(limiters[name], req);
    assert.equal(blocked.status, 429);
    assert.deepEqual(Object.keys(blocked.body), ["error"]);
  });
}

// --- pre-auth limits: every request reaches us via the frontend server ---
const SECRET = "s".repeat(40);
const vouched = (ip, serverIp = "10.9.9.9") => ({
  ip: serverIp,
  headers: { "x-tuff-client-ip": ip, "x-tuff-edge-key": SECRET },
});
async function countUntil429(limiter, makeReq, max) {
  for (let i = 1; i <= max; i += 1) if ((await call(limiter, makeReq(i))).status === 429) return i;
  return 0;
}

test("vouched visitor IPs each get the strict sign-up budget", async () => {
  process.env.EDGE_SHARED_SECRET = SECRET;
  try {
    const limiter = require("./limiters").signUp;
    assert.equal(await countUntil429(limiter, () => vouched("203.0.113.1"), 10), 6, "6th sign-up from one visitor is refused");
    // A different visitor behind the same frontend server is unaffected.
    assert.equal((await call(limiter, vouched("203.0.113.2"))).status, 200);
  } finally {
    delete process.env.EDGE_SHARED_SECRET;
  }
});

test("without the shared secret, the frontend's IP gets a large shared budget, not a site-wide lockout", async () => {
  delete process.env.EDGE_SHARED_SECRET;
  const limiter = limiters.signUp;
  // 5 would lock the whole site out after 5 sign-ups; the shared cap is 300.
  assert.equal(await countUntil429(limiter, () => ({ ip: "10.8.8.8" }), 310), 301);
});

test("a forged client-IP header without the secret is ignored", async () => {
  process.env.EDGE_SHARED_SECRET = SECRET;
  try {
    const limiter = limiters.google;
    const forged = (i) => ({ ip: "10.7.7.7", headers: { "x-tuff-client-ip": `198.51.100.${i}`, "x-tuff-edge-key": "wrong" } });
    // Rotating forged IPs doesn't earn fresh strict budgets: all share 10.7.7.7's bucket (600).
    assert.equal(await countUntil429(limiter, forged, 610), 601);
  } finally {
    delete process.env.EDGE_SHARED_SECRET;
  }
});

function callWithStatus(limiter, req, handlerStatus) {
  return new Promise((resolve) => {
    const listeners = {};
    const res = {
      statusCode: 200,
      set() { return this; },
      status(code) { this.statusCode = code; return this; },
      json(body) { resolve({ status: this.statusCode, body }); },
      on(event, cb) { listeners[event] = cb; },
    };
    const chain = Array.isArray(limiter) ? limiter : [limiter];
    const run = (i) => {
      if (i === chain.length) {
        res.statusCode = handlerStatus;
        listeners.finish?.();
        return resolve({ status: handlerStatus });
      }
      chain[i](req, res, () => run(i + 1));
    };
    run(0);
  });
}

test("sign-in: 10 failed attempts lock that account, and then even the right password waits", async () => {
  const req = (n) => ({ ip: "10.6.6.6", body: { email: "Victim@Example.com" }, headers: {} , n });
  for (let i = 0; i < 10; i += 1) assert.equal((await callWithStatus(limiters.signIn, req(i), 401)).status, 401);
  const blocked = await callWithStatus(limiters.signIn, req(11), 200);
  assert.equal(blocked.status, 429, "the correct password must not bypass the lock");
  // Another account from the same server IP is unaffected.
  assert.equal((await callWithStatus(limiters.signIn, { ip: "10.6.6.6", body: { email: "other@example.com" }, headers: {} }, 200)).status, 200);
});

test("sign-in: successful logins never use up the account's budget", async () => {
  const req = { ip: "10.5.5.5", body: { email: "regular@example.com" }, headers: {} };
  for (let i = 0; i < 25; i += 1) assert.equal((await callWithStatus(limiters.signIn, req, 200)).status, 200);
});

function layerFor(router, method, path) {
  return router.stack.find((layer) => layer.route?.path === path && layer.route.methods[method]);
}

test("sensitive auth routes carry their limiters before the controller", () => {
  const LIMITERS = ["rateLimit", "perClientIpLimit", "perAccountLimit"];
  for (const path of ["/sign-up", "/sign-in", "/google", "/refresh"]) {
    const names = layerFor(authRoutes, "post", path).route.stack.map((layer) => layer.name);
    const at = names.findIndex((n) => LIMITERS.includes(n));
    assert.ok(at >= 0, `${path} has no rate limiter: ${names}`);
    assert.ok(at < names.length - 1, `${path} runs its limiter after the handler`);
  }
  const signIn = layerFor(authRoutes, "post", "/sign-in").route.stack.map((layer) => layer.name);
  assert.ok(signIn.includes("perAccountLimit"), "sign-in must be limited per account");
  // Sign-out deliberately has no budget: it only clears cookies and one token.
  const signOut = layerFor(authRoutes, "post", "/sign-out").route.stack.map((layer) => layer.name);
  assert.equal(signOut.some((n) => LIMITERS.includes(n)), false);
});

test("user and challenge logging routes carry the per-user limiters", () => {
  for (const [router, method, path] of [
    [userRoutes, "patch", "/me/password"],
    [userRoutes, "delete", "/me"],
    [userRoutes, "post", "/me/activities/parse"],
    [userRoutes, "post", "/me/activities"],
    [participantRoutes, "post", "/:challengeId/activities"],
  ]) {
    const names = layerFor(router, method, path).route.stack.map((layer) => layer.name);
    assert.ok(names.includes("rateLimit"), `${method} ${path} has no rate limiter: ${names}`);
  }
});

test("the photo route keeps its own 3mb JSON parser", () => {
  const names = layerFor(userRoutes, "put", "/me/photo").route.stack.map((layer) => layer.name);
  assert.ok(names.includes("jsonParser"), names.join(", "));
});
