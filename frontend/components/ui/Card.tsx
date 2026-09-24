import type { ReactNode } from "react";
import styles from "./Card.module.css";

interface CardContentProps {
  eyebrow: string;
  title: string;
  description: string;
  /** 0-100 */
  progressPercent: number;
  statLeft: ReactNode;
  statRight: ReactNode;
  action?: ReactNode;
  /** Fill the parent's height and pin the action to the bottom (bento tiles). */
  stretch?: boolean;
}

export function StandardCard({ stretch, ...content }: CardContentProps) {
  return (
    <div className={`${styles.standard} ${stretch ? styles.stretch : ""}`}>
      <CardBody {...content} />
    </div>
  );
}

interface FeaturedCardProps extends CardContentProps {
  chipLabel?: string;
}

/**
 * Liquid-glass card with an animated border beam. Never more than one on
 * screen at once — the beam is a "this is the one" signal.
 */
export function FeaturedCard({ chipLabel = "Active", stretch, ...content }: FeaturedCardProps) {
  return (
    <div className={`${styles.featuredWrap} ${stretch ? styles.stretch : ""}`}>
      {/* Colour for the glass to refract — clipped to the card so it never
          leaks onto neighbouring tiles. */}
      <div className={styles.blobs} aria-hidden="true">
        <div className={`${styles.glassBlob} ${styles.blobA}`} />
        <div className={`${styles.glassBlob} ${styles.blobB}`} />
      </div>
      <div className={styles.featured}>
        <div className={styles.chip}>{chipLabel}</div>
        <CardBody {...content} />
      </div>
    </div>
  );
}

function CardBody({
  eyebrow,
  title,
  description,
  progressPercent,
  statLeft,
  statRight,
  action,
}: Omit<CardContentProps, "stretch">) {
  const clamped = Math.min(100, Math.max(0, progressPercent));
  return (
    <>
      <div className={styles.eyebrow}>{eyebrow}</div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.desc}>{description}</p>
      <div className={styles.footer}>
        <div
          className={styles.track}
          role="progressbar"
          aria-valuenow={Math.round(clamped)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${title} progress`}
        >
          <div className={styles.fill} style={{ width: `${clamped}%` }} />
        </div>
        <div className={styles.statRow}>
          <span>{statLeft}</span>
          <span>{statRight}</span>
        </div>
        {action && <div className={styles.action}>{action}</div>}
      </div>
    </>
  );
}
