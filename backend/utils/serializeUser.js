/**
 * The one shape a user takes in any API response. Strips passwordHash
 * (User.create() returns it in memory even though the schema marks it
 * select: false — that only affects queries), renames _id to id, and turns
 * ObjectIds into strings. Every controller that returns a user goes through
 * this rather than sending a raw Mongoose document.
 */
function toSafeUser(userDoc) {
  const obj = typeof userDoc.toObject === "function" ? userDoc.toObject() : { ...userDoc };
  delete obj.passwordHash;
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  if (obj.teamId) obj.teamId = obj.teamId.toString();
  return obj;
}

module.exports = { toSafeUser };
