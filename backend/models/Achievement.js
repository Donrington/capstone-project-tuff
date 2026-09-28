const mongoose = require("mongoose");

const achievementSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            unique: true,
        },

        description: {
            type: String,
            required: true,
            trim: true,
        },

        icon: {
            type: String,
            default: null,
            trim: true,
        },

        requirement: {
            type: String,
            required: true,
            trim: true,
        },

        points: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
    }
);

const Achievement = mongoose.model("Achievement", achievementSchema);

module.exports = Achievement;