"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import styles from "./TrainHud.module.css";

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export interface HudProps {
  display: string;
  unitLabel: string;
  depth: number;
  phaseLabel: string;
  phaseTone: "neutral" | "good" | "warning";
  cue: string | null;
  /** Changes on each counted rep to restart the pop animation. */
  pulseKey: number;
}

/**
 * The live readout, phased like an iOS watch face: a progress ring around a
 * big tabular number, a phase pill and a one-at-a-time form cue. All of it is
 * glass over the video rather than a separate panel below it.
 */
export function TrainHud({ display, unitLabel, depth, phaseLabel, phaseTone, cue, pulseKey }: HudProps) {
  return (
    <div className={styles.hud} aria-hidden="true">
      <div className={`${styles.glass} ${styles.readout}`}>
        <div className={styles.ringWrap}>
          <svg className={styles.ring} viewBox="0 0 120 120" aria-hidden="true">
            <circle className={styles.ringTrack} cx="60" cy="60" r={RADIUS} />
            <circle
              className={styles.ringProgress}
              cx="60"
              cy="60"
              r={RADIUS}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, depth)))}
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div className={styles.countWrap}>
            <span key={pulseKey} className={styles.count}>
              {display}
            </span>
            <span className={styles.unit}>{unitLabel}</span>
          </div>
        </div>
        <span className={styles.phase} data-tone={phaseTone}>
          {phaseLabel}
        </span>
      </div>
      <div className={styles.cueSlot} aria-live="polite" aria-atomic="true">
        {cue && (
          <p key={cue} className={`${styles.glass} ${styles.cue}`}>
            {cue}
          </p>
        )}
      </div>
    </div>
  );
}

/** The pre-count silhouette and the 3-2-1 countdown share the stage centre. */
export function FramingGuide({
  ready,
  countdown,
  message,
}: {
  ready: boolean;
  countdown: number | null;
  message: string;
}) {
  return (
    <div className={styles.guide} data-ready={ready ? "true" : undefined} data-counting={countdown !== null ? "true" : undefined}>
      <div className={`${styles.glass} ${styles.guideCard}`}>
        <svg className={styles.silhouette} viewBox="0 0 100 130" fill="none" aria-hidden="true">
          <circle cx="50" cy="17" r="12" strokeWidth="3" />
          <path d="M50 30v43M28 44h44M50 73L33 118M50 73l17 45" strokeWidth="3" strokeLinecap="round" />
        </svg>
        {ready && (
          <span className={styles.check} aria-hidden="true">
            <Check size={22} strokeWidth={3} />
          </span>
        )}
        <p className={styles.guideText}>{countdown !== null ? "Hold still — counting starts in" : message}</p>
      </div>
      {countdown !== null && (
        <div className={styles.countdown} aria-hidden="true">
          <span key={countdown}>{countdown}</span>
        </div>
      )}
    </div>
  );
}

/** Small glass badge used for stage-level copy (loading, denied, etc.). */
export function StageMessage({ children }: { children: ReactNode }) {
  return <p className={`${styles.glass} ${styles.message}`}>{children}</p>;
}
