const mongoose = require("mongoose");

const challengeParticipantSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        challenge: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Challenge",
            required: true,
        },

        joinedAt: {
            type: Date,
            default: Date.now,
        },

        progress: {
            type: Number,
            default: 0,
            min: 0,
        },

        points: {
            type: Number,
            default: 0,
            min: 0,
        },

        rank: {
            type: Number,
            default: null,
            min: 1,
        },

        completed: {
            type: Boolean,
            default: false,
        },

        completedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

const ChallengeParticipant = mongoose.model("ChallengeParticipant", challengeParticipantSchema);

module.exports = ChallengeParticipant;