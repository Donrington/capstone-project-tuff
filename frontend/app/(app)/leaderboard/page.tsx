import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { LeaderboardBrowser } from "@/components/leaderboard/LeaderboardBrowser";
import { DemoCrewPreview } from "@/components/demo/DemoCrewPreview";
import { DATA_SOURCE } from "@/lib/api/config";
import { getLeaderboard, getMyTeam } from "@/lib/data";
import type { LeaderboardEntry, LeaderboardPeriod } from "@/lib/types";

export const metadata: Metadata = { title: "Leaderboard" };

/** Dev + mock only: keep real rows (so they still render first) but few enough
 *  to preview the demo block. No data is written or invented. */
function thinForPreview(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  const top = entries.slice(0, 1);
  const me = entries.find((entry) => entry.isCurrentUser && !top.some((t) => t.user.id === entry.user.id));
  return me ? [...top, me] : top;
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; preview?: string }>;
}) {
  const [{ period, preview }, week, allTime, myTeam] = await Promise.all([
    searchParams,
    getLeaderboard("week"),
    getLeaderboard("all-time"),
    getMyTeam(),
  ]);
  const initialPeriod: LeaderboardPeriod = period === "all-time" ? "all-time" : "week";
  const previewDemo =
    process.env.NODE_ENV !== "production" && DATA_SOURCE === "mock" && preview === "demo-board";
  const boards: Record<LeaderboardPeriod, LeaderboardEntry[]> = previewDemo
    ? { week: thinForPreview(week), "all-time": thinForPreview(allTime) }
    : { week, "all-time": allTime };

  return (
    <div>
      <PageHeader kicker="Leaderboard" title="Who's moving" />
      <LeaderboardBrowser
        boards={boards}
        initialPeriod={initialPeriod}
        demoPreview={<DemoCrewPreview variant="leaderboard" teamId={myTeam?.id ?? null} />}
      />
    </div>
  );
}
