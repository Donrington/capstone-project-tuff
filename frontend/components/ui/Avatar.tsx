import { AvatarPhoto } from "./AvatarPhoto";
import styles from "./Avatar.module.css";

interface AvatarProps {
  initials: string;
  size?: "sm" | "md" | "lg" | "xl";
  /** accent-volt ring = logged an activity today — a status signal, not decoration */
  activeToday?: boolean;
  /** Initials show when there's no photo, and if the photo fails to load. */
  photoUrl?: string | null;
}

export function Avatar({ initials, size = "md", activeToday, photoUrl }: AvatarProps) {
  const sizeClass = { sm: styles.sm, md: styles.md, lg: styles.lg, xl: styles.xl }[size];
  return (
    <div className={`${styles.avatar} ${sizeClass} ${activeToday ? styles.activeRing : ""}`}>
      {initials}
      {photoUrl && <AvatarPhoto src={photoUrl} className={styles.photo} />}
    </div>
  );
}
