const Team = require("../models/Team");
const User = require("../models/User");


// Create a team
const createTeam = async (req, res) => {
    try {
        const { name, description, maxMembers } = req.body;

        const userId = req.user.id;

        // Validate required fields
        if (!name) {
            return res.status(400).json({
                message: "Team name is are required",
            });
        }

        const generateChallengeCode = () => {
            return Math.random()
                .toString(36)
                .substring(2, 12)
                .toUpperCase();
        };

        const inviteCode = generateChallengeCode();

        // Check if invite code already exists
        const existingTeam = await Team.findOne({
            inviteCode: inviteCode.toUpperCase(),
        });

        if (existingTeam) {
            return res.status(400).json({
                message: "A team with this invite code already exists",
            });
        }

        // Create team
        const team = await Team.create({
            name,
            description,
            inviteCode: inviteCode,
            maxMembers,
            createdBy: userId,
        });

        // Add creator to the team
        await User.findByIdAndUpdate(userId, {
            teamId: team._id,
        });

        return res.status(201).json({
            message: "Team created successfully",
            team,
        });
    } catch (error) {
        console.error("Error creating team:", error);

        return res.status(500).json({
            message: "Failed to create team",
            error: error.message,
        });
    }
};


// Get a team by ID
const getTeamById = async (req, res) => {
    try {
        const { id } = req.params;

        const team = await Team.findById(id)
            .populate("createdBy", "firstName lastName email");

        if (!team) {
            return res.status(404).json({
                message: "Team not found",
            });
        }

        return res.status(200).json({
            team,
        });
    } catch (error) {
        console.error("Error getting team:", error);

        return res.status(500).json({
            message: "Failed to get team",
            error: error.message,
        });
    }
};


// Get all teams
const getAllTeams = async (req, res) => {
    try {
        const teams = await Team.find({
            status: "active",
        })
            .populate("createdBy", "firstName lastName")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            count: teams.length,
            teams,
        });
    } catch (error) {
        console.error("Error getting teams:", error);

        return res.status(500).json({
            message: "Failed to get teams",
            error: error.message,
        });
    }
};


// Update a team
const updateTeam = async (req, res) => {
    try {
        const { id } = req.params;

        const team = await Team.findById(id);

        if (!team) {
            return res.status(404).json({
                message: "Team not found",
            });
        }

        // Only the team creator can update the team
        if (team.createdBy.toString() !== req.user.id) {
            return res.status(403).json({
                message: "You are not authorized to update this team",
            });
        }

        const {
            name,
            description,
            inviteCode,
            maxMembers,
            status,
        } = req.body;

        if (name !== undefined) {
            team.name = name;
        }

        if (description !== undefined) {
            team.description = description;
        }

        if (inviteCode !== undefined) {
            const existingTeam = await Team.findOne({
                inviteCode: inviteCode.toUpperCase(),
                _id: { $ne: id },
            });

            if (existingTeam) {
                return res.status(400).json({
                    message: "A team with this invite code already exists",
                });
            }

            team.inviteCode = inviteCode;
        }

        if (maxMembers !== undefined) {
            team.maxMembers = maxMembers;
        }

        if (status !== undefined) {
            team.status = status;
        }

        await team.save();

        return res.status(200).json({
            message: "Team updated successfully",
            team,
        });
    } catch (error) {
        console.error("Error updating team:", error);

        return res.status(500).json({
            message: "Failed to update team",
            error: error.message,
        });
    }
};


// Join a team using invite code
const joinTeam = async (req, res) => {
    try {
        const { inviteCode } = req.body;

        const userId = req.user.id;

        if (!inviteCode) {
            return res.status(400).json({
                message: "Invite code is required",
            });
        }

        // Find team
        const team = await Team.findOne({
            inviteCode: inviteCode.toUpperCase(),
            status: "active",
        });

        if (!team) {
            return res.status(404).json({
                message: "Team not found or inactive",
            });
        }

        // Check if user is already in a team
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        if (user.teamId) {
            return res.status(400).json({
                message: "You are already a member of a team",
            });
        }

        // Check team capacity
        const memberCount = await User.countDocuments({
            teamId: team._id,
        });

        if (
            team.maxMembers &&
            memberCount >= team.maxMembers
        ) {
            return res.status(400).json({
                message: "This team is already full",
            });
        }

        // Add user to team
        user.teamId = team._id;

        await user.save();

        return res.status(200).json({
            message: "Successfully joined team",
            team,
        });
    } catch (error) {
        console.error("Error joining team:", error);

        return res.status(500).json({
            message: "Failed to join team",
            error: error.message,
        });
    }
};


// Leave a team
const leaveTeam = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        if (!user.teamId) {
            return res.status(400).json({
                message: "You are not a member of a team",
            });
        }

        user.teamId = null;

        await user.save();

        return res.status(200).json({
            message: "You have left the team",
        });
    } catch (error) {
        console.error("Error leaving team:", error);

        return res.status(500).json({
            message: "Failed to leave team",
            error: error.message,
        });
    }
};


// Get all members of a team
const getTeamMembers = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if team exists
        const team = await Team.findById(id);

        if (!team) {
            return res.status(404).json({
                message: "Team not found",
            });
        }

        const members = await User.find({
            teamId: id,
        }).select(
            "firstName lastName email profilePicture fitnessLevel"
        );

        return res.status(200).json({
            count: members.length,
            members,
        });
    } catch (error) {
        console.error("Error getting team members:", error);

        return res.status(500).json({
            message: "Failed to get team members",
            error: error.message,
        });
    }
};


module.exports = {
    createTeam,
    getTeamById,
    getAllTeams,
    updateTeam,
    joinTeam,
    leaveTeam,
    getTeamMembers,
};

