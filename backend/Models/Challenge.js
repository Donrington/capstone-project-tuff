const mongoose = require("mongoose");

const challengeSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },

        description: {
            type: String,
            required: true,
            trim: true,
            maxlength: 1000,
        },

        type: {
            type: String,
            enum: [
                "running",
                "walking",
                "cycling",
                "workout",
                "steps",
                "calories",
                "weight-loss",
                "custom",
            ],
            required: true,
        },

        goal: {
            type: Number,
            required: true,
            min: 1,
        },

        unit: {
            type: String,
            enum: [
                "km",
                "miles",
                "steps",
                "minutes",
                "calories",
                "reps",
                "kg",
                "points",
            ],
            required: true,
        },

        pointsPerUnit: {
            type: Number,
            required: true,
            min: 0,
        },

        startDate: {
            type: Date,
            required: true,
        },

        endDate: {
            type: Date,
            required: true,
        },

        maxParticipants: {
            type: Number,
            min: 1,
            default: null,
        },

        status: {
            type: String,
            enum: [
                "draft",
                "upcoming",
                "active",
                "completed",
                "cancelled",
            ],
            default: "draft",
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

const Challenge = mongoose.model("Challenge", challengeSchema);

module.exports = Challenge;