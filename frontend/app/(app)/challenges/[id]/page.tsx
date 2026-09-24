import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Target, UserPlus, UsersRound } from "lucide-react";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Badge } from "@/components/ui/Badge";
import { LogActivityButton } from "@/components/activity/LogActivityButton";
import { InviteButton } from "@/components/invite/InviteButton";
import { challengePercent, formatCount } from "@/lib/challenge-card";
import { getChallenge } from "@/lib/data";
import styles from "./detail.module.css";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const challenge = await getChallenge(id);
  return { title: challenge?.name ?? "Challenge" };
}

export default async function ChallengeDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const challenge = await getChallenge(id);
  if (!challenge) notFound();

  const endsOn = new Date(`${challenge.endDate}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const daysLeft = challenge.totalDays - challenge.dayIndex;

  return (
    <div className={styles.page}>
      <Link href="/challenges" className={styles.back}>
        <ArrowLeft size={16} strokeWidth={2.5} aria-hidden="true" />
        All challenges
      </Link>

      <section className={styles.hero}>
        <div className={styles.heroRing}>
          <ProgressRing
            percent={challengePercent(challenge)}
            sublabel={`${formatCount(challenge.current)} / ${formatCount(challenge.target)} ${challenge.unit}`}
          />
        </div>
        <div className={styles.heroInfo}>
          <Badge variant={challenge.teamId ? "surge" : "neutral"}>
            {challenge.teamId ? "Team challenge" : "Solo challenge"}
          </Badge>
          <h1 className={styles.title}>{challenge.name}</h1>
          <p className={styles.desc}>{challenge.description}</p>
          <ul className={styles.facts}>
            <li>
              <CalendarDays size={16} aria-hidden="true" />
              Day {challenge.dayIndex} of {challenge.totalDays}
            </li>
            <li>
              <Target size={16} aria-hidden="true" />
              {formatCount(challenge.target)} {challenge.unit}
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
                  name: challenge.name,
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
    </div>
  );
}
