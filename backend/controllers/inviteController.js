const Team = require("../models/Team");
const Challenge = require("../models/Challenge");
const User = require("../models/User");

const NOT_FOUND = "No invite with that code.";
const MAX_CODE_LENGTH = 32;

/** Same shape the join UI already accepts: dashes and case don't matter, but
 *  a code has to be short and contain at least one letter or number. Anything
 *  else gets the identical 404 as an unknown code, so the endpoint can't be
 *  used to tell "malformed" from "not found". */
function normalizeCode(raw) {
  const code = String(raw ?? "").replace(/[^a-z0-9]/gi, "").toUpperCase();
  return code.length >= 1 && code.length <= MAX_CODE_LENGTH ? code : null;
}

function notFound(res) {
  // Sent directly, not via ApiError: errorHandler shapes ApiError as
  // `{ error: { message } }`, while this public endpoint's contract is
  // `{ message }` (the same shape the frontend's ApiError parser expects).
  res.status(404).json({ message: NOT_FOUND });
}

// GET /api/invites/:code — deliberately public. Only the fields a stranger
// needs to decide whether to accept are returned: no roster, email, progress,
// descriptions or ids that aren't part of the preview.
async function getInvitePreview(req, res) {
  const code = normalizeCode(req.params.code);
  if (!code) return notFound(res);

  const [team, challenge] = await Promise.all([
    Team.findOne({ inviteCode: code, status: "active" }).lean(),
    // A cancelled challenge can't be joined, so it gets the same 404 as no match.
    Challenge.findOne({ inviteCode: code, status: { $ne: "cancelled" } }).lean(),
  ]);

  const invite = team || challenge;
  if (!invite) return notFound(res);

  const creator = invite.createdBy
    ? await User.findById(invite.createdBy).select("firstName").lean()
    : null;

  if (team) {
    const memberCount = await User.countDocuments({ teamId: team._id });
    res.json({
      kind: "team",
      name: team.name,
      memberCount,
      inviterFirstName: creator?.firstName ?? "A teammate",
    });
    return;
  }

  res.json({
    kind: "challenge",
    title: challenge.title,
    goal: challenge.goal,
    unit: challenge.unit,
    endDate: challenge.endDate,
    inviterFirstName: creator?.firstName ?? "A teammate",
  });
}

module.exports = { getInvitePreview, normalizeCode };
