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

        // Where the entry came from. "camera" means the on-device counter
        // filled it in — a label for the UI, not a guarantee of accuracy.
        source: {
            type: String,
            enum: ["manual", "camera"],
            default: "manual",
        },

        // Only camera entries carry this summary. The per-rep offsets are
        // checked when the entry is saved but never stored.
        cameraSession: {
            durationMs: Number,
            exercise: {
                type: String,
                enum: ["pushups", "squats"],
            },
        },

        // Set deterministically at creation (utils/flagActivity.js) when a
        // single entry's value is well outside the normal range for its
        // unit — not blocked, just worth an admin's attention.
        flagged: {
            type: Boolean,
            default: false,
        },
        flagReason: {
            type: String,
            default: null,
        },
        // One AI sentence on why a flagged entry looks off, generated lazily
        // the first time an admin opens the flags list (see adminController
        // listFlags) and cached here so it's never regenerated on a revisit.
        aiNote: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: {
            createdAt: true,
            updatedAt: false,
        },
    }
);

// The feeds: one user's history, and one challenge's, newest first.
activitySchema.index({ user: 1, recordedAt: -1 });
activitySchema.index({ challenge: 1, recordedAt: -1 });
// The admin flags queue.
activitySchema.index({ flagged: 1, recordedAt: -1 });

const Activity = mongoose.model("Activity", activitySchema);

module.exports = Activity;