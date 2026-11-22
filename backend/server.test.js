const test = require("node:test");
const assert = require("node:assert/strict");
const app = require("./server");

async function withServer(run) {
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, () => resolve(listener));
  });
  const { port } = server.address();
  try {
    return await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
}

test("security headers are attached even to 404s, and the stack is hidden", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/no-such-route`);
    assert.equal(res.status, 404);
    assert.equal(res.headers.get("x-powered-by"), null);
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    assert.equal(res.headers.get("x-frame-options"), "DENY");
    assert.equal(res.headers.get("referrer-policy"), "no-referrer");
    assert.equal(res.headers.get("content-security-policy"), "default-src 'none'; frame-ancestors 'none'");
  });
});

test("an oversized JSON body is rejected with a shaped 413", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/auth/sign-up`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload: "x".repeat(150 * 1024) }),
    });
    assert.equal(res.status, 413);
    const body = await res.json();
    assert.match(body.error.message, /too large/i);
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  });
});

test("the avatar route skips the global 100kb parser so its own 3mb parser can run", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/users/me/photo`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataUrl: "x".repeat(150 * 1024) }),
    });
    // It reaches the auth guard (401) instead of being cut off by the global
    // parser. A 413 here would mean the route-level 3mb parser is unreachable.
    assert.notEqual(res.status, 413);
    assert.notEqual(res.status, 500);
  });
});
