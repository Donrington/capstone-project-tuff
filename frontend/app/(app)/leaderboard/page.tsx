import type { Metadata } from "next";
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
      <LeaderboardBrowser
        boards={{ week, "all-time": allTime }}
        initialPeriod={initialPeriod}
      />
    </div>
  );
}
