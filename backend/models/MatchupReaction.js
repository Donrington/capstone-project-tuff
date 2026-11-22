const mongoose = require("mongoose");

const EMOJIS = ["fire", "muscle", "clap", "grit"];

const matchupReactionSchema = new mongoose.Schema(
  {
    team: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
    /** Monday 00:00 UTC of the shared leaderboard week — never a local Monday. */
    weekStart: { type: Date, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    emoji: { type: String, enum: EMOJIS, required: true },
  },
  { timestamps: true },
);

// One vote per member per week: changing your mind updates the same document,
// and the unique index still holds when two taps race.
matchupReactionSchema.index({ team: 1, weekStart: 1, user: 1 }, { unique: true });

// Reactions only decorate the live week; nobody reads them in the results
// history. Let MongoDB reclaim them three weeks after the week began.
matchupReactionSchema.index({ weekStart: 1 }, { expireAfterSeconds: 21 * 24 * 60 * 60 });

const MatchupReaction = mongoose.model("MatchupReaction", matchupReactionSchema);

module.exports = MatchupReaction;
module.exports.EMOJIS = EMOJIS;
