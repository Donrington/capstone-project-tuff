import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Flame, Footprints, Timer, Zap } from "lucide-react";
import { FeaturedCard } from "@/components/ui/Card";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Leaderboard } from "@/components/ui/Leaderboard";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { LogActivityButton } from "@/components/activity/LogActivityButton";
import { WeeklyActivity } from "@/components/dashboard/WeeklyActivity";
import { TeamCard } from "@/components/dashboard/TeamCard";
import { StartChallenge } from "@/components/dashboard/StartChallenge";
import { challengeCardCopy, challengePercent, formatCount } from "@/lib/challenge-card";
import {
  getCurrentUser,
  getDashboardLeaderboard,
  getFeaturedChallenge,
  getStepChallenge,
  getSuggestedChallenges,
  getTeamSummary,
  getTodayOnChallenge,
  getTodayStats,
  getWeeklyActivity,
} from "@/lib/data";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Dashboard" };

const order = (n: number) => ({ "--i": n }) as CSSProperties;

export default async function DashboardPage() {
  const [currentUser, todayStats, week, team, featured, steps, board, suggestions] = await Promise.all([
    getCurrentUser(),
    getTodayStats(),
    getWeeklyActivity(),
    getTeamSummary(),
    getFeaturedChallenge(),
    getStepChallenge(),
    getDashboardLeaderboard(),
    getSuggestedChallenges(),
  ]);
  const featuredToday = featured ? await getTodayOnChallenge(featured.id) : 0;
  // The Today ring counts steps, so its empty state points at a steps challenge to log to.
  const stepsTarget = featured?.unit === "steps" ? featured : steps;

  const todayPct = (todayStats.steps / todayStats.stepGoal) * 100;
  const remaining = Math.max(0, todayStats.stepGoal - todayStats.steps);
  const ranked = board.some((entry) => entry.isCurrentUser);
  const firstRun = todayStats.streakDays === 0 && todayStats.steps === 0 && !featured;

  const subtitle =
    todayStats.streakDays > 0 ? (
      <>
        You&apos;re on a {todayStats.streakDays}-day streak.{" "}
        {remaining > 0 ? `${formatCount(remaining)} more steps closes today out.` : "Today's goal is done."}
      </>
    ) : firstRun ? (
      "Start a challenge, then log your first activity to start a streak."
    ) : (
      "Log something today to start a streak."
    );

  return (
    <div className={styles.page}>
      <PageHeader
        kicker="Dashboard"
        title={firstRun ? `Welcome, ${currentUser.firstName}` : `Welcome back, ${currentUser.firstName}`}
        subtitle={subtitle}
      />

      <div className={styles.bento}>
        <section className={`${styles.tile} ${styles.ring}`} style={order(0)} aria-labelledby="today-heading">
          <div className={styles.tileHead}>
            <h2 id="today-heading" className={styles.tileLabel}>
              Today
            </h2>
            {todayStats.streakDays > 0 && (
              <Badge variant="streak">
                <Flame size={14} strokeWidth={2.5} aria-hidden="true" />
                {todayStats.streakDays}-day streak
              </Badge>
            )}
          </div>
          <div className={styles.ringBody}>
            <ProgressRing
              percent={todayPct}
              sublabel={`${formatCount(todayStats.steps)} / ${formatCount(todayStats.stepGoal)}`}
            />
            {todayStats.steps === 0 && todayStats.activeMinutes === 0 ? (
              <div className={styles.firstLogBlock}>
                <p className={styles.firstLog}>Log your steps to fill the ring.</p>
                {stepsTarget ? (
                  <LogActivityButton challengeId={stepsTarget.id} variant="secondary">
                    Log steps
                  </LogActivityButton>
                ) : (
                  <ButtonLink href="/challenges/new?activity=steps" variant="secondary">
                    Start a steps challenge
                  </ButtonLink>
                )}
              </div>
            ) : (
              <ul className={styles.stats}>
                <li>
                  <span className={styles.statIcon}>
                    <Footprints size={18} aria-hidden="true" />
                  </span>
                  <span className={styles.statText}>
                    <strong>{formatCount(todayStats.steps)}</strong>
                    <small>steps</small>
                  </span>
                </li>
                <li>
                  <span className={styles.statIcon}>
                    <Timer size={18} aria-hidden="true" />
                  </span>
                  <span className={styles.statText}>
                    <strong>{todayStats.activeMinutes}</strong>
                    <small>active minutes</small>
                  </span>
                </li>
                <li>
                  <span className={styles.statIcon}>
                    <Zap size={18} aria-hidden="true" />
                  </span>
                  <span className={styles.statText}>
                    <strong>{formatCount(todayStats.calories)}</strong>
                    <small>kcal burned</small>
                  </span>
                </li>
              </ul>
            )}
          </div>
        </section>

        <div className={`${styles.reveal} ${styles.feat}`} style={order(1)}>
          {featured ? (
            <FeaturedCard
              stretch
              {...challengeCardCopy(featured)}
              description={featured.description}
              progressPercent={challengePercent(featured)}
              statLeft={<b>{featured.teamId ? currentUser.teamName : "Solo"}</b>}
              statRight={featuredToday > 0 ? `+${formatCount(featuredToday)} today` : "Nothing yet today"}
              action={
                <LogActivityButton challengeId={featured.id} variant="primary" size="lg" fullWidth>
                  Log today&apos;s set
                </LogActivityButton>
              }
            />
          ) : (
            <StartChallenge suggestions={suggestions} />
          )}
        </div>

        <section className={`${styles.tile} ${styles.week}`} style={order(2)}>
          <WeeklyActivity data={week.days} goal={todayStats.stepGoal} deltaPct={week.deltaPct} />
        </section>

        <section className={`${styles.tile} ${styles.lead}`} style={order(3)} aria-labelledby="lead-heading">
          <div className={styles.tileHead}>
            <h2 id="lead-heading" className={styles.tileLabel}>
              Leaderboard
            </h2>
            <Link href="/leaderboard" className={styles.tileLink}>
              View all
              <ArrowUpRight size={14} strokeWidth={2.5} aria-hidden="true" />
            </Link>
          </div>
          <Leaderboard entries={board} variant="bare" />
          {!ranked && <p className={styles.unranked}>Log once to get ranked.</p>}
        </section>

        {steps ? (
          <Link href={`/challenges/${steps.id}`} className={`${styles.tile} ${styles.chal}`} style={order(4)}>
            <div className={styles.tileHead}>
              <span className={styles.tileLabel}>Challenge</span>
              <ArrowUpRight size={18} className={styles.arrow} aria-hidden="true" />
            </div>
            <div className={styles.chalBody}>
              <ProgressRing size="compact" percent={challengePercent(steps)} />
              <div className={styles.chalText}>
                <h3 className={styles.chalTitle}>{steps.title}</h3>
                <p className={styles.chalMeta}>
                  Day {steps.dayIndex} of {steps.totalDays} · {formatCount(steps.current)} {steps.unit}
                </p>
              </div>
            </div>
          </Link>
        ) : (
          <Link href="/challenges/new" className={`${styles.tile} ${styles.chal}`} style={order(4)}>
            <div className={styles.tileHead}>
              <span className={styles.tileLabel}>Challenge</span>
              <ArrowUpRight size={18} className={styles.arrow} aria-hidden="true" />
            </div>
            <div className={styles.chalText}>
              <h3 className={styles.chalTitle}>Make your own</h3>
              <p className={styles.chalMeta}>Pick an exercise, a goal and a length. Five quick questions.</p>
            </div>
          </Link>
        )}

        <section className={`${styles.tile} ${styles.team}`} style={order(5)}>
          <TeamCard team={team} />
        </section>
      </div>
    </div>
  );
}
