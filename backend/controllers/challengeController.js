const Challenge = require("../models/Challenge");
const ChallengeParticipant = require("../models/ChallengeParticipant");
const ApiError = require("../utils/ApiError");

// Create a new challenge
const createChallenge = async (req, res) => {
    try {
        const {
            title,
            description,
            type,
            goal,
            unit,
            pointsPerUnit,
            startDate,
            endDate,
            maxParticipants,
            status,
            teamId,
            // inviteCode,
            featured,
        } = req.body;

        // Check required fields
        if (
            !title ||
            !description ||
            !type ||
            goal === undefined ||
            !unit ||
            pointsPerUnit === undefined ||
            !startDate ||
            !endDate
        ) {
            return res.status(400).json({
                message: "Please provide all required challenge fields",
            });
        }

        // Make sure the end date is after the start date
        if (new Date(endDate) <= new Date(startDate)) {
            return res.status(400).json({
                message: "End date must be after start date",
            });
        }

        const generateChallengeCode = () => {
            return Math.random()
                .toString(36)
                .substring(2, 12)
                .toUpperCase();
        };

        const inviteCode = generateChallengeCode();

        // Create the challenge
        const challenge = await Challenge.create({
            title,
            description,
            type,
            goal,
            unit,
            pointsPerUnit,
            startDate,
            endDate,
            maxParticipants,
            status,
            teamId,
            inviteCode: inviteCode,
            featured,
            createdBy: req.user.id,
        });

        return res.status(201).json({
            message: "Challenge created successfully",
            challenge,
        });
    } catch (error) {
        console.error("Error creating challenge:", error);

        return res.status(500).json({
            message: "Failed to create challenge",
            error: error.message,
        });
    }
};


// Update an existing challenge
const updateChallenge = async (req, res) => {
    try {
        const { id } = req.params;

        const challenge = await Challenge.findById(id);

        // Check if challenge exists
        if (!challenge) {
            return res.status(404).json({
                message: "Challenge not found",
            });
        }

        // Update only fields that were provided
        const {
            title,
            description,
            type,
            goal,
            unit,
            pointsPerUnit,
            startDate,
            endDate,
            maxParticipants,
            status,
            teamId,
            code,
            featured,
        } = req.body;

        if (title !== undefined) challenge.title = title;
        if (description !== undefined) challenge.description = description;
        if (type !== undefined) challenge.type = type;
        if (goal !== undefined) challenge.goal = goal;
        if (unit !== undefined) challenge.unit = unit;
        if (pointsPerUnit !== undefined) {
            challenge.pointsPerUnit = pointsPerUnit;
        }
        if (startDate !== undefined) challenge.startDate = startDate;
        if (endDate !== undefined) challenge.endDate = endDate;
        if (maxParticipants !== undefined) {
            challenge.maxParticipants = maxParticipants;
        }
        if (status !== undefined) challenge.status = status;
        if (teamId !== undefined) challenge.teamId = teamId;
        if (code !== undefined) challenge.code = code;
        if (featured !== undefined) challenge.featured = featured;

        // Validate the date range if either date was changed
        if (challenge.endDate <= challenge.startDate) {
            return res.status(400).json({
                message: "End date must be after start date",
            });
        }

        await challenge.save();

        return res.status(200).json({
            message: "Challenge updated successfully",
            challenge,
        });
    } catch (error) {
        console.error("Error updating challenge:", error);

        return res.status(500).json({
            message: "Failed to update challenge",
            error: error.message,
        });
    }
};


// Get a challenge using its invite code
const getChallengeByInviteCode = async (req, res) => {
    try {
        const { code } = req.params;

        // Find challenge by invite code
        console.log(code.toUpperCase());
        const challenge = await Challenge.findOne({
            inviteCode: code.toUpperCase(),
        });

        
        // Check if challenge exists
        if (!challenge) {
            return res.status(404).json({
                message: "Challenge not found",
            });
        }

        return res.status(200).json({
            message: "Challenge found",
            challenge,
        });
    } catch (error) {
        console.error("Error getting challenge:", error);

        return res.status(500).json({
            message: "Failed to get challenge",
            error: error.message,
        });
    }
};


const getChallenge = async (req, res) => {
    try {
        const challenge = await Challenge.findById(req.params.id);

        if (!challenge) {
            return res.status(404).json({
                message: "Challenge not found",
            });
        }

        const participants = await ChallengeParticipant.find({
            challenge: challenge._id,
        });

        const current = participants.reduce(
            (total, participant) =>
                total + participant.progress,
            0
        );

        const totalDays = Math.ceil(
            (new Date(challenge.endDate) -
                new Date(challenge.startDate)) /
                (1000 * 60 * 60 * 24)
        );

        const dayIndex = Math.min(
            Math.max(
                Math.floor(
                    (new Date() -
                        new Date(challenge.startDate)) /
                        (1000 * 60 * 60 * 24)
                ) + 1,
                0
            ),
            totalDays
        );

        res.status(200).json({
            ...challenge.toObject(),
            current,
            dayIndex,
            totalDays,
        });
    } catch (error) {
        res.status(500).json({
            message: "Server error",
            error: error.message,
        });
    }
};

const deleteChallenge = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const challenge = await Challenge.findById(id);
        if (!challenge) {
            return res.status(404).json({
                message: "Challenge not found",
            });
        }

        console.log(challenge.createdBy.toString());
        console.log(req.user.id);
        if(challenge.createdBy.toString() !== req.user.id){
            return res.status(403).json({ message: "Unauthorized. You cannot delete a challenge you didn't create"});
        }

        await Challenge.findByIdAndDelete(challenge._id);

        return res.status(200).json({
            message: "Challenge deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting challenge:", error);

        return res.status(500).json({
            message: "Failed to delete challenge",
            error: error.message,
        });
    }
};

module.exports = {
    createChallenge,
    updateChallenge,
    getChallengeByInviteCode,
    getChallenge,
    deleteChallenge
};
