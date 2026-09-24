import { UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { InviteButton } from "@/components/invite/InviteButton";
import type { TeamSummary } from "@/lib/types";
import styles from "./TeamCard.module.css";

interface TeamCardProps {
  team: TeamSummary;
}

export function TeamCard({ team }: TeamCardProps) {
  return (
    <div className={styles.team}>
      <div className={styles.head}>
        <p className={styles.label}>Your team</p>
        <Badge variant="neutral">
          #{team.rank} of {team.totalTeams}
        </Badge>
      </div>
      <h3 className={styles.name}>{team.name}</h3>
      <div className={styles.avatars} aria-label={`${team.members.length + team.extraMembers} members`}>
        {team.members.map((m) => (
          <span key={m.initials} className={styles.avatarWrap}>
            <Avatar initials={m.initials} size="sm" />
          </span>
        ))}
        <span className={styles.more}>+{team.extraMembers}</span>
      </div>
      <p className={styles.gap}>
        {team.gapToRival.toLocaleString("en-US")} steps behind {team.rivalName}.
      </p>
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
