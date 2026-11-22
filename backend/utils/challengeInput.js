const ApiError = require("./ApiError");

/**
 * Leaderboard points are value x pointsPerUnit, summed across every
 * challenge. If the client chose pointsPerUnit, anyone could create a
 * challenge worth a billion points per rep and top the global board with one
 * entry — so scoring is owned here, by unit, and never read from a request.
 * Values match what the app has always sent (and what production data holds);
 * units that can't be logged score nothing.
 */
const POINTS_PER_UNIT = Object.freeze({
  reps: 1,
  seconds: 0.5,
  minutes: 30,
  steps: 0.01,
  km: 2,
  miles: 3.2,
});

const LIMITS = Object.freeze({
  title: 80,
  description: 500,
  maxGoal: 10_000_000,
  maxDays: 90,
  maxParticipants: 100,
});

const DAY_MS = 24 * 60 * 60 * 1000;

function pointsFor(unit) {
  return POINTS_PER_UNIT[unit] ?? 0;
}

function text(value, field, max, { required }) {
  if (value === undefined || value === null || value === "") {
    if (required) throw ApiError.badRequest("Please provide all required challenge fields.", { [field]: "Required." });
    return undefined;
  }
  const s = String(value).trim();
  if (required && !s) throw ApiError.badRequest("Please provide all required challenge fields.", { [field]: "Required." });
  if (s.length > max) throw ApiError.badRequest(`Keep the ${field} under ${max} characters.`, { [field]: `Max ${max} characters.` });
  return s;
}

function goalOf(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > LIMITS.maxGoal) {
    throw ApiError.badRequest(`The goal must be a whole number from 1 to ${LIMITS.maxGoal.toLocaleString("en-US")}.`, { goal: "Out of range." });
  }
  return n;
}

function dateOf(value, field) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw ApiError.badRequest("Check the challenge dates.", { [field]: "Not a date." });
  return d;
}

function checkSpan(start, end) {
  if (end <= start) throw ApiError.badRequest("End date must be after start date.");
  if (end - start > LIMITS.maxDays * DAY_MS) {
    throw ApiError.badRequest(`A challenge can last at most ${LIMITS.maxDays} days.`);
  }
}

function maxParticipantsOf(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > LIMITS.maxParticipants) {
    throw ApiError.badRequest(`Participants must be between 1 and ${LIMITS.maxParticipants}.`, { maxParticipants: "Out of range." });
  }
  return n;
}

/**
 * The fields a creator may set on a NEW challenge. Never taken from the body:
 * pointsPerUnit (scoring), status (the status job owns it), featured (admins
 * only), inviteCode, createdBy. teamId must be the creator's own team.
 *
 * @param {object} body  req.body
 * @param {{ teamId: string | null, isAdmin: boolean }} creator
 */
function challengeCreateFields(body = {}, creator) {
  const unit = String(body.unit ?? "");
  const startDate = dateOf(body.startDate, "startDate");
  const endDate = dateOf(body.endDate, "endDate");
  checkSpan(startDate, endDate);

  const fields = {
    title: text(body.title, "title", LIMITS.title, { required: true }),
    description: text(body.description, "description", LIMITS.description, { required: true }),
    type: body.type === undefined ? undefined : String(body.type),
    goal: goalOf(body.goal),
    unit,
    pointsPerUnit: pointsFor(unit),
    startDate,
    endDate,
    maxParticipants: maxParticipantsOf(body.maxParticipants),
  };
  if (!fields.type || !unit) throw ApiError.badRequest("Please provide all required challenge fields.");

  if (body.teamId !== undefined && body.teamId !== null && body.teamId !== "") {
    // A team challenge shows up for everyone on that team: only its own
    // members may create one, or anyone could post into another team's list.
    if (!creator.teamId || String(body.teamId) !== String(creator.teamId)) {
      throw ApiError.forbidden("You can only create team challenges for your own team.");
    }
    fields.teamId = creator.teamId;
  }
  if (creator.isAdmin && body.featured !== undefined) fields.featured = Boolean(body.featured);
  return fields;
}

/**
 * What a creator may change afterwards. Unit, scoring and team are fixed at
 * creation — changing them would rewrite points already on the leaderboard
 * (the board multiplies by the challenge's CURRENT pointsPerUnit). The only
 * status change a creator makes is cancelling.
 *
 * @returns {object} the validated subset to assign
 */
function challengeUpdateFields(body = {}, current, { isAdmin }) {
  for (const locked of ["unit", "pointsPerUnit", "teamId", "inviteCode", "createdBy"]) {
    if (body[locked] !== undefined && String(body[locked]) !== String(current[locked] ?? "")) {
      throw ApiError.badRequest(`A challenge's ${locked} can't be changed after it's created.`);
    }
  }
  const out = {};
  if (body.title !== undefined) out.title = text(body.title, "title", LIMITS.title, { required: true });
  if (body.description !== undefined) out.description = text(body.description, "description", LIMITS.description, { required: true });
  if (body.type !== undefined) out.type = String(body.type);
  if (body.goal !== undefined) out.goal = goalOf(body.goal);
  if (body.maxParticipants !== undefined) out.maxParticipants = maxParticipantsOf(body.maxParticipants);
  const start = body.startDate !== undefined ? dateOf(body.startDate, "startDate") : new Date(current.startDate);
  const end = body.endDate !== undefined ? dateOf(body.endDate, "endDate") : new Date(current.endDate);
  if (body.startDate !== undefined || body.endDate !== undefined) {
    checkSpan(start, end);
    out.startDate = start;
    out.endDate = end;
  }
  if (body.status !== undefined) {
    if (body.status !== "cancelled") throw ApiError.badRequest("A challenge can only be cancelled; its other states follow its dates.");
    out.status = "cancelled";
  }
  if (body.featured !== undefined) {
    if (!isAdmin) throw ApiError.forbidden("Only admins can feature a challenge.");
    out.featured = Boolean(body.featured);
  }
  return out;
}

module.exports = { POINTS_PER_UNIT, LIMITS, pointsFor, challengeCreateFields, challengeUpdateFields };
