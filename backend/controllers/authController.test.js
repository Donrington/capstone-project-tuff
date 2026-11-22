const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const controller = require("./authController");
const { response, queryResult, withMocks } = require("../testHelpers");

const SECRET = "a-test-access-secret-that-is-definitely-long-enough";

function user(overrides = {}) {
  return {
    _id: { toString: () => "user-1" },
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    role: "member",
    status: "active",
    passwordHash: "$2a$12$abcdefghijklmnopqrstuv",
    save: async () => {},
    ...overrides,
  };
}

async function withSecret(run) {
  const saved = process.env.JWT_ACCESS_SECRET;
  process.env.JWT_ACCESS_SECRET = SECRET;
  try {
    return await run();
  } finally {
    if (saved === undefined) delete process.env.JWT_ACCESS_SECRET;
    else process.env.JWT_ACCESS_SECRET = saved;
  }
}

test("sign-up hashes new passwords with cost 12", async () => {
  let hashArgs;
  await withSecret(() =>
    withMocks(
      {
        findOne: { object: User, method: "findOne", value: async () => null },
        createUser: { object: User, method: "create", value: async () => user() },
        hash: { object: bcrypt, method: "hash", value: async (...args) => { hashArgs = args; return "new-hash"; } },
        createToken: { object: RefreshToken, method: "create", value: async () => ({}) },
      },
      async () => {
        const res = response();
        await controller.signUp(
          { body: { firstName: "Ada", lastName: "Lovelace", email: "ADA@example.com", password: "correct horse" } },
          res,
        );
        assert.equal(res.statusCode, 201);
        assert.equal(hashArgs[0], "correct horse");
        assert.equal(hashArgs[1], 12);
      },
    ),
  );
});

test("sign-in spends the same bcrypt cost on an unknown email", async () => {
  let comparedWith;
  await withMocks(
    {
      findOne: { object: User, method: "findOne", value: () => queryResult(null) },
      compare: {
        object: bcrypt,
        method: "compare",
        value: async (_password, hash) => {
          comparedWith = hash;
          return false;
        },
      },
    },
    async () => {
      const res = response();
      await assert.rejects(
        controller.signIn({ body: { email: "nobody@example.com", password: "whatever1" } }, res),
        (err) => err.status === 401 && /wrong email or password/i.test(err.message),
      );
      assert.equal(comparedWith?.slice(0, 4), "$2a$");
      assert.equal(comparedWith?.slice(4, 6), "12");
    },
  );
});

test("sign-in upgrades an old low-cost hash without locking the user out", async () => {
  const existing = user({ passwordHash: "$2a$08$abcdefghijklmnopqrstuv" });
  let saved = false;
  let hashCost;
  existing.save = async () => { saved = true; };

  await withSecret(() =>
    withMocks(
      {
        findOne: { object: User, method: "findOne", value: () => queryResult(existing) },
        compare: { object: bcrypt, method: "compare", value: async () => true },
        getRounds: { object: bcrypt, method: "getRounds", value: () => 8 },
        hash: {
          object: bcrypt,
          method: "hash",
          value: async (password, cost) => { hashCost = cost; return "rehashed"; },
        },
        createToken: { object: RefreshToken, method: "create", value: async () => ({}) },
      },
      async () => {
        const res = response();
        await controller.signIn({ body: { email: existing.email, password: "correct horse" } }, res);
        assert.equal(hashCost, 12);
        assert.equal(saved, true);
        assert.equal(existing.passwordHash, "rehashed");
        assert.equal(res.statusCode, null); // res.json() for a 200
        assert.equal(res.body.id, "user-1");
      },
    ),
  );
});

test("sign-out revokes the refresh row instead of deleting it", async () => {
  let updateArgs;
  await withMocks(
    {
      updateOne: {
        object: RefreshToken,
        method: "updateOne",
        value: async (...args) => { updateArgs = args; return { modifiedCount: 1 }; },
      },
    },
    async () => {
      const res = response();
      await controller.signOut({ cookies: { tuff_refresh: "plain-token" } }, res);
      assert.equal(updateArgs[0].revokedAt, null);
      assert.ok(updateArgs[1].$set.revokedAt instanceof Date);
      assert.equal(res.cookies.length, 2); // both auth cookies cleared
      assert.ok(res.cookies.every((cookie) => cookie.value === null));
    },
  );
});

const future = () => new Date(Date.now() + 60_000);

test("refresh rotates the token with a compare-and-set and issues a new pair", async () => {
  const stored = { _id: "old-id", user: "user-1", expiresAt: future(), revokedAt: null };
  let updateArgs;
  await withSecret(() =>
    withMocks(
      {
        findOne: { object: RefreshToken, method: "findOne", value: async () => stored },
        findUser: { object: User, method: "findById", value: () => queryResult(user()) },
        createToken: { object: RefreshToken, method: "create", value: async () => ({ _id: "new-id" }) },
        updateOne: {
          object: RefreshToken,
          method: "updateOne",
          value: async (...args) => { updateArgs = args; return { modifiedCount: 1 }; },
        },
      },
      async () => {
        const res = response();
        await controller.refresh({ cookies: { tuff_refresh: "plain-token" } }, res);
        assert.equal(updateArgs[0]._id, "old-id");
        assert.equal(updateArgs[0].revokedAt, null);
        assert.ok(updateArgs[1].$set.revokedAt instanceof Date);
        assert.equal(updateArgs[1].$set.replacedBy, "new-id");
        assert.equal(res.statusCode, 204);
        assert.equal(res.cookies.length, 2);
      },
    ),
  );
});

test("refresh detects replay and revokes the whole token family", async () => {
  const stored = { _id: "old-id", user: "user-1", expiresAt: future(), revokedAt: new Date() };
  let revokedFamily;
  await withMocks(
    {
      findOne: { object: RefreshToken, method: "findOne", value: async () => stored },
      updateMany: {
        object: RefreshToken,
        method: "updateMany",
        value: async (...args) => { revokedFamily = args; return { modifiedCount: 2 }; },
      },
    },
    async () => {
      const res = response();
      await assert.rejects(
        controller.refresh({ cookies: { tuff_refresh: "stolen-token" } }, res),
        (err) => err.status === 401 && /session expired/i.test(err.message),
      );
      assert.equal(revokedFamily[0].user, "user-1");
      assert.equal(revokedFamily[0].revokedAt, null);
      assert.equal(res.cookies.length, 2); // session cleared on the client too
    },
  );
});

test("refresh loses the concurrent rotation race safely", async () => {
  const stored = { _id: "old-id", user: "user-1", expiresAt: future(), revokedAt: null };
  let familyRevoked = false;
  let replacementDeleted = false;
  await withSecret(() =>
    withMocks(
      {
        findOne: { object: RefreshToken, method: "findOne", value: async () => stored },
        findUser: { object: User, method: "findById", value: () => queryResult(user()) },
        createToken: { object: RefreshToken, method: "create", value: async () => ({ _id: "new-id" }) },
        updateOne: { object: RefreshToken, method: "updateOne", value: async () => ({ modifiedCount: 0 }) },
        updateMany: { object: RefreshToken, method: "updateMany", value: async () => { familyRevoked = true; return {}; } },
        deleteOne: { object: RefreshToken, method: "deleteOne", value: async () => { replacementDeleted = true; return {}; } },
      },
      async () => {
        const res = response();
        await assert.rejects(
          controller.refresh({ cookies: { tuff_refresh: "racing-token" } }, res),
          (err) => err.status === 401 && /session expired/i.test(err.message),
        );
        assert.equal(familyRevoked, true);
        assert.equal(replacementDeleted, true);
      },
    ),
  );
});
