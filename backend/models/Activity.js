const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        challenge: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Challenge",
            default: null,
        },

        type: {
            type: String,
            enum: [
                "running",
                "walking",
                "cycling",
                "swimming",
                "workout",
                "steps",
                "hiking",
                "other",
            ],
            required: true,
        },

        value: {
            type: Number,
            required: true,
            min: 0,
        },

        unit: {
            type: String,
            enum: [
                "km",
                "miles",
                "steps",
                "minutes",
                "seconds",
                "reps",
            ],
            required: true,
        },

        //duration is in minutes
        duration: {
            type: Number,
            min: 0,
            default: null,
        },

        calories: {
            type: Number,
            min: 0,
            default: null,
        },

        recordedAt: {
            type: Date,
            required: true,
        },
    },
    {
        timestamps: {
            createdAt: true,
            updatedAt: false,
        },
    }
);

const Activity = mongoose.model("Activity", activitySchema);

module.exports = Activity;