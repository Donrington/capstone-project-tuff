const test = require("node:test");
const assert = require("node:assert/strict");
const securityHeaders = require("./securityHeaders");

function run(env) {
  const original = process.env.NODE_ENV;
  if (env === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = env;

  const headers = {};
  let nextCalled = false;
  try {
    securityHeaders({}, { set(name, value) { headers[name] = value; } }, () => { nextCalled = true; });
  } finally {
    if (original === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = original;
  }
  return { headers, nextCalled };
}

test("every response gets the JSON API's hardening headers", () => {
  const { headers, nextCalled } = run(undefined);
  assert.equal(nextCalled, true);
  assert.deepEqual(headers, {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Cross-Origin-Resource-Policy": "same-site",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  });
});

test("HSTS is only sent in production", () => {
  assert.equal("Strict-Transport-Security" in run("development").headers, false);
  assert.equal(run("production").headers["Strict-Transport-Security"], "max-age=63072000; includeSubDomains");
});
