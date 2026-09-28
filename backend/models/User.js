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

        bio: {
            type: String,
            required: false,
            trim: true
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
            default: "user",
        },

        status: {
            type: String,
            enum: ["active", "inactive", "suspended"],
            default: "active",
        },

        onboardingCompletedAt: {
            type: Date,
            required: false
        }
    },
    {
        timestamps: true,
    }
);

const User = mongoose.model("User", userSchema);

module.exports = User;