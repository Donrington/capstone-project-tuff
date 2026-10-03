const ChallengeParticipant = require("../models/ChallengeParticipant");
const Challenge = require("../models/Challenge");
const Team = require("../models/Team");

const getChallengeLeaderboard = async (req, res) => {
    try {
        const { challengeId } = req.params;

        // Check that the challenge exists
        const challenge = await Challenge.findById(challengeId);

        if (!challenge) {
            return res.status(404).json({
                message: "Challenge not found",
            });
        }

        // Get all participants for this challenge
        const participants = await ChallengeParticipant.find({
            challenge: challengeId,
        })
            .populate(
                "user",
                "firstName lastName profilePicture"
            )
            .sort({
                points: -1,
                progress: -1,
            });

        // Add rank to each participant
        const leaderboard = participants.map(
            (participant, index) => ({
                rank: index + 1,
                user: participant.user,
                progress: participant.progress,
                points: participant.points,
                completed: participant.completed,
            })
        );

        return res.status(200).json({
            challenge: {
                id: challenge._id,
                title: challenge.title,
                goal: challenge.goal,
                unit: challenge.unit,
            },
            count: leaderboard.length,
            leaderboard,
        });
    } catch (error) {
        console.error(
            "Error getting challenge leaderboard:",
            error
        );

        return res.status(500).json({
            message: "Failed to get challenge leaderboard",
            error: error.message,
        });
    }
};


const getTeamLeaderboard = async (req, res) => {
    try {
        const { challengeId } = req.params;

        const challenge = await Challenge.findById(challengeId);

        if (!challenge) {
            return res.status(404).json({
                message: "Challenge not found",
            });
        }

        const participants = await ChallengeParticipant.find({
            challenge: challengeId,
        }).populate(
            "user",
            "firstName lastName teamId"
        );

        const teamScores = {};

        for (const participant of participants) {
            const user = participant.user;

            // Ignore users who are not in a team
            if (!user || !user.teamId) {
                continue;
            }

            const teamId = user.teamId.toString();

            if (!teamScores[teamId]) {
                teamScores[teamId] = {
                    teamId: user.teamId,
                    points: 0,
                    progress: 0,
                    members: 0,
                };
            }

            teamScores[teamId].points += participant.points;
            teamScores[teamId].progress += participant.progress;
            teamScores[teamId].members += 1;
        }

        const teamIds = Object.keys(teamScores);

        const teams = await Team.find({
            _id: { $in: teamIds },
        }).select("name description");

        const teamMap = {};

        for (const team of teams) {
            teamMap[team._id.toString()] = team;
        }

        const leaderboard = Object.values(teamScores)
            .map((team) => ({
                team: teamMap[team.teamId.toString()],
                points: team.points,
                progress: team.progress,
                members: team.members,
            }))
            .sort((a, b) => {
                if (b.points !== a.points) {
                    return b.points - a.points;
                }

                return b.progress - a.progress;
            })
            .map((team, index) => ({
                rank: index + 1,
                ...team,
            }));

        return res.status(200).json({
            challenge: {
                id: challenge._id,
                title: challenge.title,
                goal: challenge.goal,
                unit: challenge.unit,
            },
            count: leaderboard.length,
            leaderboard,
        });
    } catch (error) {
        console.error(
            "Error getting team leaderboard:",
            error
        );

        return res.status(500).json({
            message: "Failed to get team leaderboard",
            error: error.message,
        });
    }
};

const getTeamMemberLeaderboard = async (req, res) => {
    try {
        const { challengeId, teamId } = req.params;

        const challenge = await Challenge.findById(challengeId);

        if (!challenge) {
            return res.status(404).json({
                message: "Challenge not found",
            });
        }

        const team = await Team.findById(teamId);

        if (!team) {
            return res.status(404).json({
                message: "Team not found",
            });
        }

        const members = await User.find({
            teamId: teamId,
        }).select("_id firstName lastName profilePicture");

        const memberIds = members.map((member) => member._id);

        const participants = await ChallengeParticipant.find({
            challenge: challengeId,
            user: { $in: memberIds },
        })
            .populate(
                "user",
                "firstName lastName profilePicture"
            )
            .sort({
                points: -1,
                progress: -1,
            });

        const leaderboard = participants.map(
            (participant, index) => ({
                rank: index + 1,
                user: participant.user,
                points: participant.points,
                progress: participant.progress,
                completed: participant.completed,
            })
        );

        return res.status(200).json({
            team: {
                id: team._id,
                name: team.name,
            },
            challenge: {
                id: challenge._id,
                title: challenge.title,
            },
            count: leaderboard.length,
            leaderboard,
        });
    } catch (error) {
        console.error(
            "Error getting team member leaderboard:",
            error
        );

        return res.status(500).json({
            message: "Failed to get team member leaderboard",
            error: error.message,
        });
    }
};

module.exports = {
    getChallengeLeaderboard,
    getTeamLeaderboard,
    getTeamMemberLeaderboard
};