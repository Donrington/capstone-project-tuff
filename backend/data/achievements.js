/**
 * The achievement catalog. Synced into the Achievement collection on boot
 * (services/achievementService.js syncAchievementCatalog), upserted by
 * `name` — so editing copy or points here and restarting is all it takes.
 * Removing an entry here does NOT delete it from the database.
 *
 * `requirement` is a machine rule, "<metric>:<target>", read by
 * services/achievementService.js. `description` is the human copy shown on
 * the card. `icon` is a Lucide icon name the frontend maps to a component.
 *
 * Metrics:
 *   activities_logged     total Activity documents
 *   streak_days           current run of consecutive days with any activity
 *   team_joined           1 once the user is on a team
 *   challenges_completed  ChallengeParticipant docs with completed: true
 *   reps_in_day           most reps logged in a single day
 *   steps_in_day          most steps logged in a single day
 */
module.exports = [
  { name: "First Log", description: "Log your first activity.", requirement: "activities_logged:1", icon: "footprints", points: 10 },
  { name: "Team Player", description: "Join a team.", requirement: "team_joined:1", icon: "users", points: 10 },
  { name: "First Finish", description: "Complete your first challenge.", requirement: "challenges_completed:1", icon: "flag", points: 25 },
  { name: "7-Day Streak", description: "Keep a streak alive for 7 days.", requirement: "streak_days:7", icon: "flame", points: 25 },
  { name: "Century Club", description: "Log 100 reps in one day.", requirement: "reps_in_day:100", icon: "dumbbell", points: 25 },
  { name: "10K Day", description: "Log 10,000 steps in one day.", requirement: "steps_in_day:10000", icon: "footprints", points: 25 },
  { name: "Challenge Clearer", description: "Complete 5 challenges.", requirement: "challenges_completed:5", icon: "trophy", points: 50 },
  { name: "30-Day Streak", description: "Keep a streak alive for 30 days.", requirement: "streak_days:30", icon: "flame", points: 100 },
];
