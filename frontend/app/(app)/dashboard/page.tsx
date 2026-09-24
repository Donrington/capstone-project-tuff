import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Flame, Footprints, Search, Timer, Zap } from "lucide-react";
import { FeaturedCard } from "@/components/ui/Card";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Leaderboard } from "@/components/ui/Leaderboard";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { LogActivityButton } from "@/components/activity/LogActivityButton";
import { WeeklyActivity } from "@/components/dashboard/WeeklyActivity";
import { TeamCard } from "@/components/dashboard/TeamCard";
import { challengeCardCopy, challengePercent, formatCount } from "@/lib/challenge-card";
import {
  getChallenge,
  getCurrentUser,
  getDashboardLeaderboard,
  getFeaturedChallenge,
  getTeamSummary,
  getTodayStats,
  getWeeklyActivity,
} from "@/lib/data";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Dashboard" };

const order = (n: number) => ({ "--i": n }) as CSSProperties;

export default async function DashboardPage() {
  const [currentUser, todayStats, week, team, featured, steps, dashboardLeaderboard] =
    await Promise.all([
      getCurrentUser(),
      getTodayStats(),
      getWeeklyActivity(),
      getTeamSummary(),
      getFeaturedChallenge(),
      getChallenge("10k-steps"),
      getDashboardLeaderboard(),
    ]);

  const todayPct = (todayStats.steps / todayStats.stepGoal) * 100;
  const remaining = Math.max(0, todayStats.stepGoal - todayStats.steps);

  return (
    <div className={styles.page}>
      <PageHeader
        kicker="Dashboard"
        title={`Welcome back, ${currentUser.firstName}`}
        subtitle={
          <>
            You&apos;re on a {todayStats.streakDays}-day streak. {formatCount(remaining)} more steps
            closes today out.
          </>
        }
        actions={
          <label className={styles.search}>
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Search</span>
            <input type="search" placeholder="Search challenges, teams…" />
          </label>
        }
      />

      <div className={styles.bento}>
        <section className={`${styles.tile} ${styles.ring}`} style={order(0)} aria-labelledby="today-heading">
          <div className={styles.tileHead}>
            <h2 id="today-heading" className={styles.tileLabel}>
              Today
            </h2>
            <Badge variant="streak">
              <Flame size={14} strokeWidth={2.5} aria-hidden="true" />
              {todayStats.streakDays}-day streak
            </Badge>
          </div>
          <div className={styles.ringBody}>
            <ProgressRing
              percent={todayPct}
              sublabel={`${formatCount(todayStats.steps)} / ${formatCount(todayStats.stepGoal)}`}
            />
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
          </div>
        </section>

        {featured && (
          <div className={`${styles.reveal} ${styles.feat}`} style={order(1)}>
            <FeaturedCard
              stretch
              {...challengeCardCopy(featured)}
              description={featured.description}
              progressPercent={challengePercent(featured)}
              statLeft={<b>{currentUser.teamName}</b>}
              statRight="+12 today"
              action={
                <LogActivityButton challengeId={featured.id} variant="primary" size="lg" fullWidth>
                  Log today&apos;s set
                </LogActivityButton>
              }
            />
          </div>
        )}

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
          <Leaderboard entries={dashboardLeaderboard} variant="bare" />
        </section>

        {steps && (
          <Link
            href={`/challenges/${steps.id}`}
            className={`${styles.tile} ${styles.chal}`}
            style={order(4)}
          >
            <div className={styles.tileHead}>
              <span className={styles.tileLabel}>Challenge</span>
              <ArrowUpRight size={18} className={styles.arrow} aria-hidden="true" />
            </div>
            <div className={styles.chalBody}>
              <ProgressRing size="compact" percent={challengePercent(steps)} />
              <div className={styles.chalText}>
                <h3 className={styles.chalTitle}>{steps.name}</h3>
                <p className={styles.chalMeta}>
                  Day {steps.dayIndex} of {steps.totalDays} · {formatCount(steps.current)} {steps.unit}
                </p>
              </div>
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
