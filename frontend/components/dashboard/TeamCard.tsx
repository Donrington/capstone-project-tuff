import Link from "next/link";
import { KeyRound, Plus, UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { InviteButton } from "@/components/invite/InviteButton";
import { JoinWithCodeButton } from "@/components/invite/JoinWithCodeButton";
import { CreateTeamButton } from "@/components/teams/CreateTeamButton";
import type { TeamSummary } from "@/lib/types";
import styles from "./TeamCard.module.css";

function gapLine(team: TeamSummary) {
  // No points yet this week, so there's no race to report — a nudge instead.
  if (team.weeklyPoints === null) return "Log together and invite your people in.";
  if (!team.rivalName) return "The only team so far. Invite some rivals.";
  const n = Math.abs(team.gapToRival).toLocaleString("en-US");
  return team.gapToRival > 0 ? `${n} points behind ${team.rivalName}.` : `${n} points ahead of ${team.rivalName}.`;
}

export function TeamCard({ team }: { team: TeamSummary | null }) {
  if (!team) {
    return (
      <div className={styles.team}>
        <p className={styles.label}>Your team</p>
        <h3 className={styles.name}>Train with a team</h3>
        <p className={styles.gap}>People who notice when you skip a day. Join one with a code, or start your own.</p>
        <div className={styles.emptyActions}>
          <JoinWithCodeButton variant="secondary" fullWidth>
            <KeyRound size={16} strokeWidth={2.25} aria-hidden="true" />
            Join with a code
          </JoinWithCodeButton>
          <CreateTeamButton variant="ghost" fullWidth>
            <Plus size={16} strokeWidth={2.25} aria-hidden="true" />
            Create a team
          </CreateTeamButton>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.team}>
      <div className={styles.head}>
        <p className={styles.label}>Your team</p>
        {team.rank !== null && (
          <Badge variant="neutral">
            #{team.rank} of {team.totalTeams}
          </Badge>
        )}
      </div>
      <h3 className={styles.name}>
        <Link href={`/teams/${team.id}`} className={styles.nameLink}>
          {team.name}
        </Link>
      </h3>
      <div className={styles.avatars} aria-label={`${team.members.length + team.extraMembers} members`}>
        {team.members.map((m) => (
          <span key={m.id} className={styles.avatarWrap}>
            <Avatar initials={m.initials} size="sm" photoUrl={m.profilePicture} />
          </span>
        ))}
        {team.extraMembers > 0 && <span className={styles.more}>+{team.extraMembers}</span>}
      </div>
      <p className={styles.gap}>{gapLine(team)}</p>
      <InviteButton
        variant="secondary"
        fullWidth
        subject={{ kind: "team", name: team.name, code: team.code }}
      >
        <UserPlus size={16} strokeWidth={2.25} aria-hidden="true" />
        Invite
      </InviteButton>
    </div>
  );
}
