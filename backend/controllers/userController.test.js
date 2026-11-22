const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const controller = require("./userController");
const { response, queryResult, withMocks } = require("../testHelpers");

const SECRET = "a-test-access-secret-that-is-definitely-long-enough";

test("changing a password stores a cost-12 hash and revokes other sessions", async () => {
  const existing = {
    _id: { toString: () => "user-1" },
    email: "ada@example.com",
    role: "member",
    status: "active",
    passwordHash: "old-hash",
    save: async () => {},
  };
  let hashArgs;
  let deleteArgs;

  const savedSecret = process.env.JWT_ACCESS_SECRET;
  process.env.JWT_ACCESS_SECRET = SECRET;
  try {
    await withMocks(
      {
        findById: { object: User, method: "findById", value: () => queryResult(existing) },
        compare: { object: bcrypt, method: "compare", value: async () => true },
        hash: {
          object: bcrypt,
          method: "hash",
          value: async (...args) => { hashArgs = args; return "new-hash"; },
        },
        deleteMany: {
          object: RefreshToken,
          method: "deleteMany",
          value: async (...args) => { deleteArgs = args; return { deletedCount: 2 }; },
        },
        createToken: { object: RefreshToken, method: "create", value: async () => ({}) },
      },
      async () => {
        const res = response();
        await controller.updatePassword(
          { user: { id: "user-1" }, body: { currentPassword: "old-password", newPassword: "new-password" } },
          res,
        );
        assert.equal(hashArgs[0], "new-password");
        assert.equal(hashArgs[1], 12);
        assert.equal(existing.passwordHash, "new-hash");
        assert.equal(deleteArgs[0].user, existing._id);
        assert.equal(res.statusCode, 204);
        assert.equal(res.cookies.length, 2); // this device gets a fresh session
      },
    );
  } finally {
    if (savedSecret === undefined) delete process.env.JWT_ACCESS_SECRET;
    else process.env.JWT_ACCESS_SECRET = savedSecret;
  }
});
