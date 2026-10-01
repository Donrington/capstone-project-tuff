const ChallengeParticipant = require("../models/ChallengeParticipant");
const Challenge = require("../models/Challenge");


// Join a challenge
const joinChallenge = async (req, res) => {
    try {
        const { challengeId } = req.params;

        // The authenticated user's ID
        const userId = req.user.id;

        // Check if the challenge exists
        const challenge = await Challenge.findById(challengeId);

        if (!challenge) {
            return res.status(404).json({
                message: "Challenge not found",
            });
        }

        // Check if the challenge can still accept participants
        if (
            challenge.status === "completed" ||
            challenge.status === "cancelled"
        ) {
            return res.status(400).json({
                message: "You cannot join this challenge",
            });
        }

        // Check if the user already joined
        const existingParticipant = await ChallengeParticipant.findOne({
            user: userId,
            challenge: challengeId,
        });

        if (existingParticipant) {
            return res.status(400).json({
                message: "You have already joined this challenge",
            });
        }

        // Check maximum participants
        if (challenge.maxParticipants) {
            const participantCount =
                await ChallengeParticipant.countDocuments({
                    challenge: challengeId,
                });

            if (participantCount >= challenge.maxParticipants) {
                return res.status(400).json({
                    message: "This challenge is already at full capacity",
                });
            }
        }

        // Create participant
        const participant = await ChallengeParticipant.create({
            user: userId,
            challenge: challengeId,
        });

        return res.status(201).json({
            message: "Successfully joined challenge",
            participant,
        });
    } catch (error) {
        console.error("Error joining challenge:", error);

        return res.status(500).json({
            message: "Failed to join challenge",
            error: error.message,
        });
    }
};


// Get a user's participation in a challenge
const getMyParticipation = async (req, res) => {
    try {
        const { challengeId } = req.params;
        const userId = req.user.id;

        const participant = await ChallengeParticipant.findOne({
            user: userId,
            challenge: challengeId,
        })
            .populate("user", "firstName lastName email")
            .populate("challenge", "title type goal unit startDate endDate");

        if (!participant) {
            return res.status(404).json({
                message: "You are not a participant in this challenge",
            });
        }

        return res.status(200).json({
            participant,
        });
    } catch (error) {
        console.error("Error getting participation:", error);

        return res.status(500).json({
            message: "Failed to get participation",
            error: error.message,
        });
    }
};


// Get all participants in a challenge
const getChallengeParticipants = async (req, res) => {
    try {
        const { challengeId } = req.params;

        // Check if challenge exists
        const challenge = await Challenge.findById(challengeId);

        if (!challenge) {
            return res.status(404).json({
                message: "Challenge not found",
            });
        }

        const participants = await ChallengeParticipant.find({
            challenge: challengeId,
        })
            .populate("user", "firstName lastName profilePicture")
            .sort({ points: -1, progress: -1 });

        return res.status(200).json({
            count: participants.length,
            participants,
        });
    } catch (error) {
        console.error("Error getting challenge participants:", error);

        return res.status(500).json({
            message: "Failed to get challenge participants",
            error: error.message,
        });
    }
};


// Update participant progress
const updateProgress = async (req, res) => {
    try {
        const { challengeId } = req.params;
        const userId = req.user.id;

        const { progress } = req.body;

        // Validate progress
        if (progress === undefined) {
            return res.status(400).json({
                message: "Progress is required",
            });
        }

        if (typeof progress !== "number" || progress < 0) {
            return res.status(400).json({
                message: "Progress must be a number greater than or equal to 0",
            });
        }

        // Find the participant
        const participant = await ChallengeParticipant.findOne({
            user: userId,
            challenge: challengeId,
        });

        if (!participant) {
            return res.status(404).json({
                message: "You are not a participant in this challenge",
            });
        }

        // Update progress
        participant.progress = progress;

        await participant.save();

        return res.status(200).json({
            message: "Progress updated successfully",
            participant,
        });
    } catch (error) {
        console.error("Error updating progress:", error);

        return res.status(500).json({
            message: "Failed to update progress",
            error: error.message,
        });
    }
};


// Mark participant as completed
const completeChallenge = async (req, res) => {
    try {
        const { challengeId } = req.params;
        const userId = req.user.id;

        const participant = await ChallengeParticipant.findOne({
            user: userId,
            challenge: challengeId,
        });

        if (!participant) {
            return res.status(404).json({
                message: "You are not a participant in this challenge",
            });
        }

        // Check if already completed
        if (participant.completed) {
            return res.status(400).json({
                message: "You have already completed this challenge",
            });
        }

        participant.completed = true;
        participant.completedAt = new Date();

        await participant.save();

        return res.status(200).json({
            message: "Challenge completed successfully",
            participant,
        });
    } catch (error) {
        console.error("Error completing challenge:", error);

        return res.status(500).json({
            message: "Failed to complete challenge",
            error: error.message,
        });
    }
};


// Leave a challenge
const leaveChallenge = async (req, res) => {
    try {
        const { challengeId } = req.params;
        const userId = req.user.id;

        const participant = await ChallengeParticipant.findOne({
            user: userId,
            challenge: challengeId,
        });

        if (!participant) {
            return res.status(404).json({
                message: "You are not a participant in this challenge",
            });
        }

        await ChallengeParticipant.findByIdAndDelete(participant._id);

        return res.status(200).json({
            message: "You have left the challenge",
        });
    } catch (error) {
        console.error("Error leaving challenge:", error);

        return res.status(500).json({
            message: "Failed to leave challenge",
            error: error.message,
        });
    }
};


module.exports = {
    joinChallenge,
    getMyParticipation,
    getChallengeParticipants,
    updateProgress,
    completeChallenge,
    leaveChallenge,
};
