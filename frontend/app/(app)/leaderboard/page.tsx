import type { Metadata } from "next";
import { Medal } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { LeaderboardBrowser } from "@/components/leaderboard/LeaderboardBrowser";
import { getLeaderboard } from "@/lib/data";
import type { LeaderboardPeriod } from "@/lib/types";

export const metadata: Metadata = { title: "Leaderboard" };

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const [{ period }, week, allTime] = await Promise.all([
    searchParams,
    getLeaderboard("week"),
    getLeaderboard("all-time"),
  ]);
  const initialPeriod: LeaderboardPeriod = period === "all-time" ? "all-time" : "week";

  return (
    <div>
      <PageHeader kicker="Leaderboard" title="Who's moving" />
      {week && allTime ? (
        <LeaderboardBrowser boards={{ week, "all-time": allTime }} initialPeriod={initialPeriod} />
      ) : (
        // TODO(leaderboard): until GET /api/leaderboard exists.
        <EmptyState
          icon={Medal}
          title="The leaderboard is on its way"
          text="Every activity you log already earns points. They'll show up here as soon as the board goes live."
        />
      )}
    </div>
  );
}
