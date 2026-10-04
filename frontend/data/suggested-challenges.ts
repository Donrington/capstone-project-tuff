import type { SuggestedChallenge } from "@/lib/types";

/** Ready-made starter challenges, offered in onboarding (#6) and on a
 *  first-run dashboard (#20). Picking one creates a solo challenge from it
 *  that starts today. Static content, so both data sources share it. */
export const suggestedChallenges: SuggestedChallenge[] = [
  {
    id: "daily-8k-walk",
    title: "Daily 8K Walk",
    description: "Eight thousand steps a day for a week. The simplest way to start burning more than you store.",
    unit: "steps",
    goal: 56000,
    totalDays: 7,
    activity: "steps",
  },
  {
    id: "push-up-starter",
    title: "Push-Up Starter",
    description: "Three hundred push-ups across seven days. Chest, shoulders and arms, no equipment needed.",
    unit: "reps",
    goal: 300,
    totalDays: 7,
    activity: "pushups",
  },
  {
    id: "plank-a-day",
    title: "Plank a Day",
    description: "Ten minutes of planks over a week. Ninety seconds a day builds the core everything else stands on.",
    unit: "seconds",
    goal: 600,
    totalDays: 7,
    activity: "plank",
  },
];
