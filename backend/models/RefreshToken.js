const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        token: {
            type: String,
            required: true,
            unique: true,
        },

        expiresAt: {
            type: Date,
            required: true,
        },

        // Kept after rotation rather than deleted: replaying a revoked token
        // is how the server detects a stolen session and kills its family.
        revokedAt: {
            type: Date,
            default: null,
        },

        replacedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "RefreshToken",
            default: null,
        },

        createdAt: {
            type: Date,
            default: Date.now,
        },
    }
);

// Automatically delete expired refresh tokens
refreshTokenSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
);

const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);

module.exports = RefreshToken;