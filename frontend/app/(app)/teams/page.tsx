import type { Metadata } from "next";
import { KeyRound, Plus, UserPlus, UsersRound } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { InviteButton } from "@/components/invite/InviteButton";
import { JoinWithCodeButton } from "@/components/invite/JoinWithCodeButton";
import { CreateTeamButton } from "@/components/teams/CreateTeamButton";
import { HeadToHead } from "@/components/teams/HeadToHead";
import { TeamOverview } from "@/components/teams/TeamOverview";
import { TeamStandings } from "@/components/teams/TeamStandings";
import { getMyTeam, getTeamMembers, getTeams } from "@/lib/data";
import styles from "./teams.module.css";

export const metadata: Metadata = { title: "Teams" };

/** Days left in the weekly matchup, which ends Sunday (UTC). */
function daysLeftThisWeek() {
  return (7 - new Date().getUTCDay()) % 7;
}

export default async function TeamsPage() {
  const [teams, myTeam] = await Promise.all([getTeams(), getMyTeam()]);
  const members = myTeam ? await getTeamMembers(myTeam.id) : [];
  const rival = myTeam ? teams.find((t) => t.id === myTeam.rivalId) : undefined;
  // Head to head needs points for both sides — from the leaderboard.
  const showHeadToHead = rival && myTeam?.weeklyPoints != null && rival.weeklyPoints != null;

  // One team per person, so Join and Create only make sense without one.
  const actions = myTeam ? (
    <InviteButton variant="secondary" subject={{ kind: "team", name: myTeam.name, code: myTeam.inviteCode }}>
      <UserPlus size={18} strokeWidth={2.25} aria-hidden="true" />
      Invite
    </InviteButton>
  ) : (
    <>
      <JoinWithCodeButton variant="ghost">
        <KeyRound size={18} strokeWidth={2.25} aria-hidden="true" />
        Join with a code
      </JoinWithCodeButton>
      <CreateTeamButton variant="secondary">
        <Plus size={18} strokeWidth={2.25} aria-hidden="true" />
        Create a team
      </CreateTeamButton>
    </>
  );

  return (
    <div>
      <PageHeader
        kicker="Teams"
        title={myTeam ? myTeam.name : "Teams"}
        subtitle={
          myTeam
            ? myTeam.rank !== null
              ? `#${myTeam.rank} of ${teams.length} this week.`
              : `${myTeam.memberCount} ${myTeam.memberCount === 1 ? "member" : "members"}.`
            : "Train with people who'll notice when you skip a day."
        }
        actions={actions}
      />

      <div className={styles.layout}>
        <div className={styles.main}>
          {myTeam ? (
            <>
              <TeamOverview team={myTeam} members={members} totalTeams={teams.length} />
              {showHeadToHead && <HeadToHead team={myTeam} rival={rival} daysLeft={daysLeftThisWeek()} />}
            </>
          ) : (
            <EmptyState
              icon={UsersRound}
              title="You're not on a team yet"
              text="Join one with a code from a friend, or start your own and invite people in."
              action={
                <div className={styles.emptyActions}>
                  <JoinWithCodeButton>
                    <KeyRound size={18} strokeWidth={2.25} aria-hidden="true" />
                    Join with a code
                  </JoinWithCodeButton>
                  <CreateTeamButton variant="secondary">
                    <Plus size={18} strokeWidth={2.25} aria-hidden="true" />
                    Create a team
                  </CreateTeamButton>
                </div>
              }
            />
          )}
        </div>
        <TeamStandings teams={teams} myTeamId={myTeam?.id ?? null} />
      </div>
    </div>
  );
}
