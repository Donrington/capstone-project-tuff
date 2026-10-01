const cron = require("node-cron");
const Challenge = require("../models/Challenge");

// Run every minute
cron.schedule("* * * * *", async () => {
    try {
        const now = new Date();

        // Change draft challenges to active
        const activatedChallenges = await Challenge.updateMany(
            {
                status: "draft",
                startDate: { $lte: now },
            },
            {
                $set: {
                    status: "active",
                },
            }
        );

        // Change active challenges to completed
        const completedChallenges = await Challenge.updateMany(
            {
                status: "active",
                endDate: { $lte: now },
            },
            {
                $set: {
                    status: "completed",
                },
            }
        );

        if (activatedChallenges.modifiedCount > 0) {
            console.log(
                `${activatedChallenges.modifiedCount} challenge(s) activated`
            );
        }

        if (completedChallenges.modifiedCount > 0) {
            console.log(
                `${completedChallenges.modifiedCount} challenge(s) completed`
            );
        }
    } catch (error) {
        console.error(
            "Error updating challenge statuses:",
            error
        );
    }
});
