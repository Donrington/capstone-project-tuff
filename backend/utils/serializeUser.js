/**
 * The one shape a user takes in any API response. Strips passwordHash
 * (User.create() returns it in memory even though the schema marks it
 * select: false — that only affects queries), renames _id to id, and turns
 * ObjectIds into strings. Every controller that returns a user goes through
 * this rather than sending a raw Mongoose document.
 */
function toSafeUser(userDoc) {
  const obj = typeof userDoc.toObject === "function" ? userDoc.toObject() : { ...userDoc };
  // Settings needs to know whether a password form makes sense, but never
  // the hash itself — Google-only accounts have none.
  obj.hasPassword = Boolean(obj.passwordHash);
  delete obj.passwordHash;
  delete obj.googleId;
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  if (obj.teamId) obj.teamId = obj.teamId.toString();
  return obj;
}

/** The self-only view. A timezone is a private preference, so it is added
 *  here instead of toSafeUser (public profiles and leaderboards must not
 *  leak it). Older documents without the field read as UTC. */
function toSelfUser(userDoc) {
  const user = toSafeUser(userDoc);
  user.timezone = userDoc.timezone || "UTC";
  return user;
}

module.exports = { toSafeUser, toSelfUser };
