const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },

        description: {
            type: String,
            trim: true,
            maxlength: 500,
            default: "",
        },

        inviteCode: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        maxMembers: {
            type: Number,
            min: 1,
            default: 10
        },

        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
        },

        // One AI-written line about this week's rival, refreshed daily by
        // jobs/rivalBanterJob.js. Who the rival is isn't stored here — the
        // frontend derives that from the leaderboard's own ranking (see
        // getTeams in lib/data/api.ts) — this is just the flourish text.
        rivalLine: {
            type: String,
            default: null,
        },
        rivalLineAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

const Team = mongoose.model("Team", teamSchema);

module.exports = Team;