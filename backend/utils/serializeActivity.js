/**
 * One logged entry as the feeds return it: who, how much, against what.
 * Expects `user` populated with firstName/lastName/profilePicture and
 * `challenge` populated with title/unit (either may be missing if the user or
 * challenge was deleted since).
 */
function toActivityEntry(doc) {
  const user = doc.user && typeof doc.user === "object" && "firstName" in doc.user ? doc.user : null;
  const challenge = doc.challenge && typeof doc.challenge === "object" && "title" in doc.challenge ? doc.challenge : null;
  const name = user ? `${user.firstName} ${user.lastName}`.trim() : "Someone";
  return {
    id: doc._id.toString(),
    person: {
      id: user ? user._id.toString() : null,
      name,
      initials: user ? `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase() : "?",
      profilePicture: user?.profilePicture ?? null,
    },
    challengeId: challenge ? challenge._id.toString() : doc.challenge ? doc.challenge.toString() : null,
    challengeName: challenge?.title ?? "a challenge",
    value: doc.value,
    unit: doc.unit,
    recordedAt: doc.recordedAt,
  };
}

const USER_FIELDS = "firstName lastName profilePicture";
const CHALLENGE_FIELDS = "title unit";

/** Clamp a `?limit=` query to a sane range. */
function limitFrom(query, fallback, max) {
  return Math.min(Math.max(Number(query.limit) || fallback, 1), max);
}

module.exports = { toActivityEntry, USER_FIELDS, CHALLENGE_FIELDS, limitFrom };
