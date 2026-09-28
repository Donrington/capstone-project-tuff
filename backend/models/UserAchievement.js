const mongoose = require("mongoose");

const userAchievementSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        achievement: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Achievement",
            required: true,
        },

        earnedAt: {
            type: Date,
            default: Date.now,
        },
    }
);

// Prevent a user from earning the same achievement more than once
userAchievementSchema.index(
    { user: 1, achievement: 1 },
    { unique: true }
);

const UserAchievement = mongoose.model("UserAchievement", userAchievementSchema);

module.exports = UserAchievement;