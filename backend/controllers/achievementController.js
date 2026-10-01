const { listForUser, evaluateAchievements } = require("../services/achievementService");

// GET /api/achievements — the full catalog from the signed-in user's view:
// earned ones carry earnedAt, locked ones carry { progress: { current, target } }.
// Evaluates first, so anything earned but not yet awarded (e.g. data that
// predates an achievement being added) is granted before the list is built.
async function getMyAchievements(req, res) {
  await evaluateAchievements(req.user.id);
  res.json(await listForUser(req.user.id));
}

module.exports = { getMyAchievements };
