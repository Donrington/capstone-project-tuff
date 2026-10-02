import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Flame, KeyRound, Trophy, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { StandardCard } from "@/components/ui/Card";
import { InviteButton } from "@/components/invite/InviteButton";
import { JoinWithCodeButton } from "@/components/invite/JoinWithCodeButton";
import { ActivityHistory } from "@/components/challenge/ActivityHistory";
import { HeaderUtilities } from "@/components/shell/HeaderUtilities";
import { HeadToHeadResults } from "@/components/teams/HeadToHeadResults";
import { LeaveTeamButton } from "@/components/teams/LeaveTeamButton";
import { Roster } from "@/components/teams/Roster";
import { challengeCardCopy, challengePercent, formatCount } from "@/lib/challenge-card";
import { getChallenges, getCurrentUser, getTeam, getTeamActivity, getTeamMembers, getTeams } from "@/lib/data";
import styles from "./team.module.css";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const team = await getTeam(id);
  return { title: team?.name ?? "Team" };
}

export default async function TeamPage({ params }: { params: Params }) {
  const { id } = await params;
  const team = await getTeam(id);
  if (!team) notFound();

  const [teams, members, activity, challenges, user] = await Promise.all([
    getTeams(),
    getTeamMembers(id),
    getTeamActivity(id),
    getChallenges(),
    getCurrentUser(),
  ]);
  const isMine = user.teamId === team.id;
  const teamChallenges = challenges.filter((c) => c.teamId === team.id && c.current < c.goal);
  const now = new Date().toISOString();

  return (
    <div className={styles.page}>
      <div className={styles.topRow}>
        <Link href="/teams" className={styles.back}>
          <ArrowLeft size={16} strokeWidth={2.5} aria-hidden="true" />
          All teams
        </Link>
        <div className={styles.utilities}>
          <HeaderUtilities />
        </div>
      </div>

      <section className={styles.hero}>
        <div className={styles.heroText}>
          <Badge variant={isMine ? "surge" : "neutral"}>{isMine ? "Your team" : "Team"}</Badge>
          <h1 className={styles.title}>{team.name}</h1>
          {team.description && <p className={styles.desc}>{team.description}</p>}
          <ul className={styles.facts}>
            <li>
              <Trophy size={16} aria-hidden="true" />#{team.rank} of {teams.length}
            </li>
            <li>
              <Flame size={16} aria-hidden="true" />
              {team.streakDays}-day team streak
            </li>
            <li>{team.weeklyPoints.toLocaleString("en-US")} points this week</li>
          </ul>
        </div>
        <div className={styles.heroActions}>
          {isMine ? (
            <>
              <InviteButton variant="primary" size="lg" subject={{ kind: "team", name: team.name, code: team.inviteCode }}>
                <UserPlus size={18} strokeWidth={2.25} aria-hidden="true" />
                Invite
              </InviteButton>
              <LeaveTeamButton teamName={team.name} />
            </>
          ) : (
            !user.teamId && (
              <JoinWithCodeButton variant="primary" size="lg">
                <KeyRound size={18} strokeWidth={2.25} aria-hidden="true" />
                Join with a code
              </JoinWithCodeButton>
            )
          )}
        </div>
      </section>

      <div className={styles.grid}>
        <div className={styles.column}>
          <Roster members={members} />
          <HeadToHeadResults results={team.headToHead} />
        </div>
        <div className={styles.column}>
          {isMine && teamChallenges.length > 0 && (
            <section className={styles.challenges} aria-labelledby="team-challenges-heading">
              <h2 id="team-challenges-heading" className={styles.sectionTitle}>
                Active team challenges
              </h2>
              {teamChallenges.map((c) => (
                <Link key={c.id} href={`/challenges/${c.id}`} className={styles.cardLink}>
                  <StandardCard
                    {...challengeCardCopy({ ...c, featured: false })}
                    description={`Day ${c.dayIndex} of ${c.totalDays}`}
                    progressPercent={challengePercent(c)}
                    statLeft={`${formatCount(c.current)} ${c.unit}`}
                    statRight={`of ${formatCount(c.goal)}`}
                  />
                </Link>
              ))}
            </section>
          )}
          <ActivityHistory
            entries={activity}
            now={now}
            title="Team activity"
            showChallenge
            headingId="team-activity-heading"
            emptyText="No activity yet. Be first."
          />
        </div>
      </div>
    </div>
  );
}
