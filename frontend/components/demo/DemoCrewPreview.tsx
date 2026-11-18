import { Flame, Plus, UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { CreateTeamButton } from "@/components/teams/CreateTeamButton";
import { demoCrew } from "@/data/demo-crew";
import styles from "./DemoCrewPreview.module.css";

interface DemoCrewPreviewProps {
  variant: "leaderboard" | "crew";
  /** The viewer's real team, when they have one — the CTA then points there. */
  teamId?: string | null;
}

/**
 * An honestly labelled example of what a crew board could look like. The rows
 * are plain text and initials, never links, and the block sits below real
 * entries under its own heading — it is not part of any leaderboard.
 */
export function DemoCrewPreview({ variant, teamId }: DemoCrewPreviewProps) {
  const compact = variant === "crew";
  const cta = teamId ? (
    <ButtonLink
      variant="secondary"
      fullWidth={compact}
      href={`/teams/${teamId}`}
    >
      <UserPlus size={16} strokeWidth={2.25} aria-hidden="true" />
      Invite friends
    </ButtonLink>
  ) : (
    <CreateTeamButton variant="secondary" fullWidth={compact}>
      <Plus size={16} strokeWidth={2.25} aria-hidden="true" />
      Start your crew
    </CreateTeamButton>
  );

  return (
    <section className={styles.section} aria-label="Example crew">
      <div className={styles.head}>
        <h2 className={styles.title}>{demoCrew.name}</h2>
        <Badge variant="neutral">Example</Badge>
      </div>
      <p className={styles.explanation}>
        An example crew, so you can see how it works — invite friends to fill your own board.
      </p>

      {variant === "leaderboard" ? (
        <>
          <h3 className={styles.listTitle}>Example ranking</h3>
          <ol className={styles.rows} aria-label="Example ranking, not part of your leaderboard">
            {demoCrew.members.map((member, i) => (
              <li key={member.name} className={styles.row}>
                <span className={styles.rank}>{i + 1}</span>
                <Avatar initials={member.initials} size="sm" />
                <span className={styles.name}>{member.name}</span>
                <span className={styles.points}>
                  {member.weeklyPoints.toLocaleString("en-US")}
                  <small className={styles.unit}>pts</small>
                </span>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <>
          <h3 className={styles.listTitle}>Example members</h3>
          <ul className={styles.members}>
            {demoCrew.members.map((member) => (
              <li key={member.name} className={styles.member}>
                <Avatar initials={member.initials} size="sm" />
                <span className={styles.name}>{member.name}</span>
                <span className={styles.streak}>
                  <Flame size={13} strokeWidth={2.25} aria-hidden="true" />
                  {member.streakDays}d
                </span>
              </li>
            ))}
          </ul>
          <h3 className={styles.listTitle}>Example activity</h3>
          <ul className={styles.activities}>
            {demoCrew.activities.slice(0, 3).map((activity) => (
              <li key={activity}>{activity}</li>
            ))}
          </ul>
        </>
      )}

      <div className={styles.actions}>{cta}</div>
    </section>
  );
}
