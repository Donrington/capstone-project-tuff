const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
require("./dbConfig"); // sets mongoose's sanitizeFilter before any query is built

const Probe = mongoose.model("SanitizeFilterProbe", new mongoose.Schema({ email: String }));

function cast(filter) {
  const query = Probe.find(filter);
  query._castConditions(); // sanitizeFilter runs while the filter is cast
  return query.getFilter();
}

test("client-supplied operators are data, not query operators", () => {
  // Without sanitizeFilter this would match every user with an email.
  assert.deepEqual(cast({ email: { $ne: null } }), { email: { $eq: { $ne: null } } });
});

test("operators deliberately built in server code are still allowed", () => {
  const filter = cast({ email: mongoose.trusted({ $ne: null }) });
  assert.deepEqual(filter.email, mongoose.trusted({ $ne: null }));
});
