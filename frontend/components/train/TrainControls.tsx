"use client";

import type { CSSProperties } from "react";
import { Maximize2, Minimize2, RotateCcw, Square, Volume2, VolumeX } from "lucide-react";
import type { TrainExercise } from "./CameraCounter";
import styles from "./TrainControls.module.css";

const OPTIONS: Array<{ value: TrainExercise; label: string }> = [
  { value: "pushups", label: "Push-ups" },
  { value: "squats", label: "Squats" },
  { value: "plank", label: "Plank" },
];

export interface TrainControlsProps {
  exercise: TrainExercise;
  onExerciseChange(next: TrainExercise): void;
  running: boolean;
  busy: boolean;
  hasResult: boolean;
  locked: boolean;
  canReset: boolean;
  saving: boolean;
  immersive: boolean;
  onFullscreen(): void;
  soundOn: boolean;
  onSoundToggle(): void;
  onStartStop(): void;
  onReset(): void;
  /**
   * "overlay" is the approved phone/immersive bar. "panel" is the desktop
   * layout in the side card; its styling is scoped to wide screens so the
   * phone bar stays byte-for-byte the same at < 1024px.
   */
  variant?: "overlay" | "panel";
}

/** The bottom glass bar: iOS-style exercise segments plus thumb-reachable actions. */
export function TrainControls({
  exercise,
  onExerciseChange,
  running,
  busy,
  hasResult,
  locked,
  canReset,
  saving,
  immersive,
  onFullscreen,
  soundOn,
  onSoundToggle,
  onStartStop,
  onReset,
  variant = "overlay",
}: TrainControlsProps) {
  const index = OPTIONS.findIndex((option) => option.value === exercise);
  const segmentStyle = { "--index": index, "--count": OPTIONS.length } as CSSProperties;

  return (
    <div className={styles.bar} data-variant={variant}>
      <fieldset className={styles.segmentGroup}>
        <legend className="sr-only">Exercise</legend>
        <div className={styles.segments} style={segmentStyle}>
          <span className={styles.selection} aria-hidden="true" />
          {OPTIONS.map((option) => (
            <label key={option.value} className={styles.segment} data-selected={option.value === exercise ? "true" : undefined}>
              <input
                type="radio"
                name="train-exercise"
                value={option.value}
                checked={exercise === option.value}
                disabled={locked}
                onChange={() => onExerciseChange(option.value)}
                className={styles.input}
              />
              <span className={styles.segmentLabel}>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primary}
          data-running={running ? "true" : undefined}
          onClick={onStartStop}
          disabled={busy || (!running && hasResult)}
          aria-busy={busy || undefined}
        >
          {running ? (
            <>
              <Square size={17} strokeWidth={2.5} aria-hidden="true" />
              Stop
            </>
          ) : (
            <>
              <span className={styles.liveDot} aria-hidden="true" />
              Start
            </>
          )}
        </button>
        <div className={styles.secondaryRow}>
          {/* display:contents keeps the overlay bar's flex children identical;
              the labels only appear in the wide-screen side panel. */}
          <div className={styles.secondaryItem}>
            <button
              type="button"
              className={styles.iconButton}
              onClick={onReset}
              disabled={!canReset || saving}
              aria-label="Reset this set"
              title="Reset"
            >
              <RotateCcw size={19} strokeWidth={2.25} aria-hidden="true" />
            </button>
            <span className={styles.secondaryLabel}>Reset</span>
          </div>
          <div className={styles.secondaryItem}>
            <button
              type="button"
              className={styles.iconButton}
              onClick={onFullscreen}
              aria-label={immersive ? "Exit fullscreen" : "Enter fullscreen"}
              aria-pressed={immersive || undefined}
              title={immersive ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {immersive ? (
                <Minimize2 size={19} strokeWidth={2.25} aria-hidden="true" />
              ) : (
                <Maximize2 size={19} strokeWidth={2.25} aria-hidden="true" />
              )}
            </button>
            <span className={styles.secondaryLabel}>{immersive ? "Exit" : "Fullscreen"}</span>
          </div>
          <div className={styles.secondaryItem}>
            <button
              type="button"
              className={styles.iconButton}
              onClick={onSoundToggle}
              aria-label={soundOn ? "Turn sound off" : "Turn sound on"}
              aria-pressed={soundOn || undefined}
              title={soundOn ? "Sound on" : "Sound off"}
            >
              {soundOn ? (
                <Volume2 size={19} strokeWidth={2.25} aria-hidden="true" />
              ) : (
                <VolumeX size={19} strokeWidth={2.25} aria-hidden="true" />
              )}
            </button>
            <span className={styles.secondaryLabel}>Sound</span>
          </div>
        </div>
      </div>
    </div>
  );
}
