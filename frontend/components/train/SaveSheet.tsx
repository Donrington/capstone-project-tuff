"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { formatCount } from "@/lib/challenge-card";
import type { Challenge } from "@/lib/types";
import styles from "./SaveSheet.module.css";

/** m:ss, used for both the session clock and the average rep tempo. */
function formatTimer(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** Mean gap between counted reps — the repTimes the engine already records. */
export function averageRepSeconds(repTimes: readonly number[], durationMs: number): number | null {
  if (repTimes.length === 0) return null;
  if (repTimes.length === 1) return Math.max(0, durationMs) / 1000;
  let total = 0;
  for (let index = 1; index < repTimes.length; index += 1) total += repTimes[index] - repTimes[index - 1];
  return Math.max(0, total) / (repTimes.length - 1) / 1000;
}

export interface SaveSheetProps {
  isHold: boolean;
  reps: number;
  repTimes: readonly number[];
  heldSeconds: number;
  holdCount: number;
  durationMs: number;
  challenges: Challenge[];
  challengeId: string;
  onChallengeChange(id: string): void;
  saveError: string | null;
  saving: boolean;
  onSave(): void;
  onDiscard(): void;
}

/** The old Save panel, promoted to a bottom sheet over the stage. */
export function SaveSheet({
  isHold,
  reps,
  repTimes,
  heldSeconds,
  holdCount,
  durationMs,
  challenges,
  challengeId,
  onChallengeChange,
  saveError,
  saving,
  onSave,
  onDiscard,
}: SaveSheetProps) {
  const relevantChallenges = challenges.filter((challenge) => challenge.unit === (isHold ? "seconds" : "reps"));
  const tempo = isHold ? null : averageRepSeconds(repTimes, durationMs);
  const summary = isHold
    ? `${heldSeconds} s held · ${formatTimer(durationMs)} · ${holdCount} ${holdCount === 1 ? "stretch" : "stretches"}`
    : tempo === null
      ? `${reps} ${reps === 1 ? "rep" : "reps"} · ${formatTimer(durationMs)}`
      : `${reps} ${reps === 1 ? "rep" : "reps"} · ${formatTimer(durationMs)} · avg ${tempo.toFixed(1)} s/rep`;

  return (
    <div className={styles.sheet} role="dialog" aria-modal="false" aria-labelledby="save-sheet-title">
      <span className={styles.handle} aria-hidden="true" />
      <h3 id="save-sheet-title" className={styles.title}>
        Save this {isHold ? "hold" : "set"}
      </h3>
      <p className={styles.summary}>{summary}</p>

      {relevantChallenges.length === 0 ? (
        <p className={styles.text}>
          {isHold ? (
            <Link href="/challenges">Join or start a seconds challenge — like Plank a Day — to save holds.</Link>
          ) : (
            <>
              {formatCount(reps)} {reps === 1 ? "rep" : "reps"} counted, but you&rsquo;re not in a reps challenge yet —{" "}
              <Link href="/challenges">find a reps challenge</Link> to save them to.
            </>
          )}
        </p>
      ) : (
        <>
          <p className={styles.text}>
            {isHold ? (
              <>
                {heldSeconds} seconds counted on your device. Saving adds them to the challenge as{" "}
                <strong>Camera-counted</strong>.
              </>
            ) : (
              <>
                {formatCount(reps)} {reps === 1 ? "rep" : "reps"} counted on your device. Saving adds them to the
                challenge as <strong>Camera-counted</strong>.
              </>
            )}
          </p>
          <Select
            label="Challenge"
            name="camera-challenge"
            value={challengeId}
            onChange={(event) => onChallengeChange(event.target.value)}
            disabled={saving}
            options={relevantChallenges.map((challenge) => ({ value: challenge.id, label: challenge.title }))}
          />
        </>
      )}

      {saveError && (
        <p className={styles.error} role="alert">
          {saveError}
        </p>
      )}
      <div className={styles.actions}>
        {relevantChallenges.length > 0 && (
          <Button onClick={onSave} disabled={saving || !challengeId} aria-busy={saving || undefined}>
            {saving ? (
              <>
                <Loader2 size={18} className={styles.spin} aria-hidden="true" />
                Saving…
              </>
            ) : isHold ? (
              `Save ${heldSeconds} seconds`
            ) : (
              `Save ${formatCount(reps)} ${reps === 1 ? "rep" : "reps"}`
            )}
          </Button>
        )}
        <Button variant="ghost" onClick={onDiscard} disabled={saving}>
          Discard
        </Button>
      </div>
    </div>
  );
}
