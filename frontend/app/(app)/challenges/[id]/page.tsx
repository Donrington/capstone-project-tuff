import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Target, UserPlus, UsersRound } from "lucide-react";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Badge } from "@/components/ui/Badge";
import { Leaderboard } from "@/components/ui/Leaderboard";
import { LogActivityButton } from "@/components/activity/LogActivityButton";
import { InviteButton } from "@/components/invite/InviteButton";
import { ActivityHistory } from "@/components/challenge/ActivityHistory";
import { MemberBreakdown } from "@/components/challenge/MemberBreakdown";
import { ProgressChart } from "@/components/challenge/ProgressChart";
import { SoloStats } from "@/components/challenge/SoloStats";
import { HeaderUtilities } from "@/components/shell/HeaderUtilities";
import { challengePercent, formatCount } from "@/lib/challenge-card";
import { getChallenge, getChallengeDetail, getTeam } from "@/lib/data";
import type { LeaderboardEntry } from "@/lib/types";
import styles from "./detail.module.css";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const challenge = await getChallenge(id);
  return { title: challenge?.title ?? "Challenge" };
}

export default async function ChallengeDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const detail = await getChallengeDetail(id);
  if (!detail) notFound();

  const { challenge } = detail;
  const team = challenge.teamId ? await getTeam(challenge.teamId) : undefined;
  const now = new Date().toISOString();

  const endsOn = new Date(`${challenge.endDate}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const daysLeft = challenge.totalDays - challenge.dayIndex;
  const notStarted = challenge.dayIndex === 0;

  const board: LeaderboardEntry[] = detail.contributions.map((c, i) => ({
    rank: i + 1,
    user: { id: c.person.id, name: c.person.name, initials: c.person.initials, profilePicture: c.person.profilePicture },
    teamName: team?.name ?? "",
    score: c.total,
    scoreUnit: challenge.unit,
    isCurrentUser: c.isCurrentUser || undefined,
  }));

  return (
    <div className={styles.page}>
      <div className={styles.topRow}>
        <Link href="/challenges" className={styles.back}>
          <ArrowLeft size={16} strokeWidth={2.5} aria-hidden="true" />
          All challenges
        </Link>
        <div className={styles.utilities}>
          <HeaderUtilities />
        </div>
      </div>

      <section className={styles.hero}>
        <div className={styles.heroRing}>
          <ProgressRing
            percent={challengePercent(challenge)}
            sublabel={`${formatCount(challenge.current)} / ${formatCount(challenge.goal)} ${challenge.unit}`}
          />
        </div>
        <div className={styles.heroInfo}>
          <Badge variant={challenge.teamId ? "surge" : "neutral"}>
            {challenge.teamId ? "Team challenge" : "Solo challenge"}
          </Badge>
          <h1 className={styles.title}>{challenge.title}</h1>
          <p className={styles.desc}>{challenge.description}</p>
          <ul className={styles.facts}>
            <li>
              <CalendarDays size={16} aria-hidden="true" />
              {notStarted ? "Starts tomorrow" : `Day ${challenge.dayIndex} of ${challenge.totalDays}`}
            </li>
            <li>
              <Target size={16} aria-hidden="true" />
              {formatCount(challenge.goal)} {challenge.unit}
            </li>
            <li>
              <UsersRound size={16} aria-hidden="true" />
              {daysLeft === 0 ? "Ends today" : `Ends ${endsOn} · ${daysLeft} days left`}
            </li>
          </ul>
          <div className={styles.actions}>
            <LogActivityButton challengeId={challenge.id} variant="primary" size="lg">
              Log today&apos;s activity
            </LogActivityButton>
            {challenge.teamId && (
              <InviteButton
                variant="secondary"
                size="lg"
                subject={{
                  kind: "challenge",
                  name: challenge.title,
                  code: challenge.code ?? null,
                }}
              >
                <UserPlus size={18} strokeWidth={2.25} aria-hidden="true" />
                Invite your team
              </InviteButton>
            )}
          </div>
        </div>
      </section>

      <div className={styles.extras}>
        <div className={styles.column}>
          <ProgressChart daily={detail.daily} pacePerDay={detail.pacePerDay} unit={challenge.unit} />
          {challenge.teamId ? (
            <MemberBreakdown contributions={detail.contributions} unit={challenge.unit} />
          ) : (
            <SoloStats streak={detail.streak} bestDays={detail.bestDays} unit={challenge.unit} />
          )}
        </div>
        <div className={styles.column}>
          {challenge.teamId && board.length > 0 && (
            <section className={styles.boardPanel} aria-labelledby="board-heading">
              <h2 id="board-heading" className={styles.boardTitle}>
                Challenge leaderboard
              </h2>
              <Leaderboard entries={board} variant="bare" />
            </section>
          )}
          <ActivityHistory entries={detail.activities} now={now} title="Activity history" />
        </div>
      </div>
    </div>
  );
}
