const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        firstName: {
            type: String,
            required: true,
            trim: true,
        },

        lastName: {
            type: String,
            required: true,
            trim: true,
        },

        // What the app shows by default (sidebar, leaderboards). Falls back
        // to firstName on the frontend when empty.
        displayName: {
            type: String,
            trim: true,
            maxlength: 40,
        },

        bio: {
            type: String,
            required: false,
            trim: true,
            maxlength: 160,
        },

        teamId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Team",
            default: null,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        passwordHash: {
            type: String,
            required: true,
            select: false,
            minlength: 8
        },

        dateOfBirth: {
            type: Date,
            required: false,
        },

        gender: {
            type: String,
            enum: ["male", "female", "other"],
            required: false,
        },

        //height is in cm
        height: {
            type: Number,
            required: false,
            min: 50,
            max: 300,
        },

        //weight is in kg
        weight: {
            type: Number,
            required: false,
            min: 20,
        },

        fitnessLevel: {
            type: String,
            enum: ["beginner", "intermediate", "advanced"],
            required: false
        },

        profilePicture: {
            type: String,
            default: null,
        },

        role: {
            type: String,
            enum: ["member", "admin"],
            default: "member",
        },

        status: {
            type: String,
            enum: ["active", "inactive", "suspended"],
            default: "active",
        },

        onboardingCompletedAt: {
            type: Date,
            required: false
        },

        // Onboarding step 1, "What brings you to TUFF?"
        motivations: {
            type: [String],
            enum: ["move_more", "get_stronger", "build_streak", "compete", "team"],
            default: [],
        },

        // Goals (settings + onboarding). The dashboard ring's target.
        stepGoal: {
            type: Number,
            min: 1000,
            max: 100000,
            default: 10000,
        },

        workoutDaysPerWeek: {
            type: Number,
            min: 0,
            max: 7,
            default: 3,
        },

        notificationPrefs: {
            streakReminders: { type: Boolean, default: true },
            teamActivity: { type: Boolean, default: true },
            leaderboardChanges: { type: Boolean, default: true },
            challengeInvites: { type: Boolean, default: true },
            weeklySummary: { type: Boolean, default: false },
            // "HH:MM", 24-hour, in the user's local time.
            reminderTime: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/, default: "18:00" },
        },

        privacy: {
            showOnLeaderboards: { type: Boolean, default: true },
            profileVisibility: {
                type: String,
                enum: ["everyone", "teammates", "only_me"],
                default: "everyone",
            },
        },
    },
    {
        timestamps: true,
    }
);

const User = mongoose.model("User", userSchema);

module.exports = User;