/**
 * Pure policy for the pose engine. Kept free of MediaPipe/DOM imports so the
 * tier decisions can be tested under node:test with plain objects.
 */

export type PoseTier = "lite" | "full";
export type TierPreference = "auto" | PoseTier;

export interface TierCapabilities {
  /** "auto" needs a working GPU and a capable device before using full. */
  preferTier?: TierPreference;
  gpuAvailable: boolean;
  /** Defaults to 4 when the browser doesn't report it (Safari/Firefox). */
  hardwareConcurrency?: number;
  /** Chrome-only; default to 4 so an unknown device is treated as modest. */
  deviceMemory?: number;
}

/** Rolling window and latency budget for adaptive downgrade. */
export const SLOW_FRAME_SAMPLES = 30;
export const SLOW_FRAME_MS = 40;

/**
 * Full landmarks are worth their cost only on a device that can afford them.
 * A failed GPU delegate disqualifies full even on a fast CPU, because the
 * float16 model running on CPU blows the frame budget this app needs for
 * counting. Explicit preferences are honoured (the caller then owns the cost).
 */
export function chooseTier(caps: TierCapabilities): PoseTier {
  const preference = caps.preferTier ?? "auto";
  if (preference !== "auto") return preference;
  const cores = caps.hardwareConcurrency ?? 4;
  const memory = caps.deviceMemory ?? 4;
  return caps.gpuAvailable && cores >= 6 && memory >= 4 ? "full" : "lite";
}

/**
 * True once the last `SLOW_FRAME_SAMPLES` detections average more than
 * `SLOW_FRAME_MS`. Fewer samples are not enough evidence to downgrade: model
 * loading and the first few frames are routinely slow.
 */
export function shouldDowngrade(samples: readonly number[]): boolean {
  if (samples.length < SLOW_FRAME_SAMPLES) return false;
  const window = samples.slice(-SLOW_FRAME_SAMPLES);
  const average = window.reduce((total, sample) => total + sample, 0) / SLOW_FRAME_SAMPLES;
  return average > SLOW_FRAME_MS;
}
