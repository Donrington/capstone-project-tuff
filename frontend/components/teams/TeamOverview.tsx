import { ArrowUpRight, Flame } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import type { TeamMember } from "@/lib/data";
import type { Team } from "@/lib/types";
import styles from "./teams.module.css";

/** Your team at a glance, on /teams. */
export function TeamOverview({ team, members, totalTeams }: { team: Team; members: TeamMember[]; totalTeams: number }) {
  const shown = members.slice(0, 6);
  return (
    <section className={styles.overview} aria-labelledby="your-team-heading">
      <div className={styles.overviewHead}>
        <p className={styles.kicker}>Your team</p>
        {team.rank !== null && (
          <Badge variant="neutral">
            #{team.rank} of {totalTeams}
          </Badge>
        )}
      </div>
      <h2 id="your-team-heading" className={styles.overviewName}>
        {team.name}
      </h2>
      <dl className={styles.statRow}>
        <div>
          <dt>Weekly points</dt>
          <dd>{team.weeklyPoints?.toLocaleString("en-US") ?? "—"}</dd>
        </div>
        <div>
          <dt>Team streak</dt>
          <dd>
            {team.streakDays === null ? (
              "—"
            ) : (
              <>
                <Flame size={16} aria-hidden="true" className={styles.flame} />
                {team.streakDays} {team.streakDays === 1 ? "day" : "days"}
              </>
            )}
          </dd>
        </div>
        <div>
          <dt>Members</dt>
          <dd>{team.memberCount}</dd>
        </div>
      </dl>
      <div className={styles.avatarRow} aria-label={`${members.length} members`}>
        {shown.map((m) => (
          <span key={m.id} className={styles.avatarWrap}>
            <Avatar initials={m.initials} size="sm" photoUrl={m.profilePicture} />
          </span>
        ))}
        {members.length > shown.length && <span className={styles.more}>+{members.length - shown.length}</span>}
      </div>
      <ButtonLink href={`/teams/${team.id}`} variant="secondary">
        Open team
        <ArrowUpRight size={16} strokeWidth={2.25} aria-hidden="true" />
      </ButtonLink>
    </section>
  );
}
