import { Activity, HeartPulse, Smartphone, Watch, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import styles from "./settings.module.css";

const TRACKERS: { name: string; icon: LucideIcon }[] = [
  { name: "Google Fit", icon: Activity },
  { name: "Apple Health", icon: HeartPulse },
  { name: "Fitbit", icon: Watch },
  { name: "Garmin", icon: Watch },
  { name: "Samsung Health", icon: Smartphone },
];

/** Static for now: each tracker needs its own OAuth flow on the backend. */
// TODO(backend): tracker connections (OAuth per provider, then step sync).
export function TrackersSection() {
  return (
    <section id="trackers" className={styles.section} aria-labelledby="trackers-heading" data-settings-section>
      <h2 id="trackers-heading" className={styles.heading}>
        Connected trackers
      </h2>
      <p className={styles.sub}>Sync steps automatically instead of logging them by hand.</p>
      <ul className={styles.trackers}>
        {TRACKERS.map(({ name, icon: Icon }) => (
          <li key={name} className={styles.tracker}>
            <span className={styles.trackerIcon} aria-hidden="true">
              <Icon size={18} strokeWidth={2.25} />
            </span>
            <span className={styles.trackerName}>{name}</span>
            <Badge variant="neutral">Coming soon</Badge>
            <Button variant="secondary" disabled aria-label={`Connect ${name} (coming soon)`}>
              Connect
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
