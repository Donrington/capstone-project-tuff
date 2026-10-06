const cron = require("node-cron");
const Team = require("../models/Team");
const { weeklyTeamRanks } = require("../services/leaderboardService");
const aiService = require("../services/aiService");

/**
 * Writes one AI line per team about this week's rival (see Team.rivalLine).
 * Who the rival is was never ambiguous — weeklyTeamRanks computes the same
 * rank-based rule the frontend already uses — this only writes the flourish
 * text. Skipped entirely without ANTHROPIC_API_KEY, same as the rest of the
 * AI features; a team with no rival yet (fewer than two scoring teams) just
 * keeps whatever rivalLine it last had, or null.
 */
async function writeRivalBanter() {
  if (!aiService.isConfigured()) return;

  const ranks = await weeklyTeamRanks();
  const byId = new Map(ranks.map((r) => [r.id, r]));

  for (const team of ranks) {
    if (!team.rivalId) continue;
    const rival = byId.get(team.rivalId);
    if (!rival) continue;

    try {
      const line = await aiService.complete({
        system:
          "You write one short, punchy, good-natured competitive line for a team fitness app's team page — " +
          "like a sports rivalry callout. Never mean-spirited, never about anyone's body or health, no emoji, " +
          "under 140 characters, one sentence.",
        prompt:
          `${team.name}: ${team.points.toLocaleString("en-US")} points this week.\n` +
          `${rival.name} (their rival): ${rival.points.toLocaleString("en-US")} points this week.\n` +
          `Write one line from ${team.name}'s point of view about ${rival.name}.`,
        maxTokens: 60,
      });
      await Team.updateOne({ _id: team.id }, { rivalLine: line, rivalLineAt: new Date() });
    } catch (err) {
      // One team's failure (a content-filter trip, a transient API error)
      // shouldn't stop the rest of the league from getting their line.
      console.error(`[rival banter] ${team.name}:`, err.message);
    }
  }
}

// Once a day, well off the hour so it doesn't land on a shared spike.
cron.schedule("17 6 * * *", () => {
  writeRivalBanter().catch((err) => console.error("[rival banter] job failed:", err));
});

module.exports = { writeRivalBanter };
