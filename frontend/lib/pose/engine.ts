/**
 * Browser-only pose landmarker wrapper (no React). MediaPipe is imported
 * dynamically so this module can also be imported in node:test for its pure
 * tier-policy helpers without loading WASM or touching `window`.
 */
import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import type { Landmark2D, Landmark3D } from "../rep-counter/geometry";
import {
  chooseTier,
  shouldDowngrade,
  SLOW_FRAME_SAMPLES,
  type PoseTier,
  type TierPreference,
} from "./tier";

export type { PoseTier, TierCapabilities, TierPreference } from "./tier";
export { chooseTier, shouldDowngrade, SLOW_FRAME_MS, SLOW_FRAME_SAMPLES } from "./tier";

export type PoseDelegate = "GPU" | "CPU";

export interface PoseFrame {
  landmarks: Landmark2D[];
  /** Metric, hip-centred landmarks. Null when the runtime omits them. */
  worldLandmarks: Landmark3D[] | null;
  timestampMs: number;
}

export type TierChangeCallback = (tier: PoseTier) => void;

export interface PoseEngine {
  readonly tier: PoseTier;
  readonly delegate: PoseDelegate;
  detect(video: HTMLVideoElement, timestampMs: number): PoseFrame | null;
  onTierChange(cb: TierChangeCallback): void;
  close(): void;
}

export interface PoseEngineOptions {
  /** Directory containing the MediaPipe WASM files. */
  wasmBase?: string;
  preferTier?: TierPreference;
}

const DEFAULT_WASM_BASE = "/mediapipe/wasm";
const MODEL_PATH: Record<PoseTier, string> = {
  lite: "/mediapipe/pose_landmarker_lite.task",
  full: "/mediapipe/pose_landmarker_full.task",
};

/** `deviceMemory` is Chromium-only and absent from lib.dom's Navigator. */
function readCapabilities(preferTier: TierPreference) {
  const nav = typeof navigator === "undefined" ? null : navigator;
  const withMemory = nav as (Navigator & { deviceMemory?: number }) | null;
  return {
    preferTier,
    gpuAvailable: true, // refined by whether the GPU delegate can be created
    hardwareConcurrency: nav?.hardwareConcurrency,
    deviceMemory: withMemory?.deviceMemory,
  };
}

/**
 * Create a video-mode PoseLandmarker with a GPU→CPU fallback, an optional
 * full-detail tier, and a one-way adaptive downgrade when inference gets slow.
 */
export async function createPoseEngine(options: PoseEngineOptions = {}): Promise<PoseEngine> {
  const { wasmBase = DEFAULT_WASM_BASE, preferTier = "auto" } = options;
  const vision = await import("@mediapipe/tasks-vision");
  const fileset = await vision.FilesetResolver.forVisionTasks(wasmBase);
  const capabilities = readCapabilities(preferTier);

  const build = (tier: PoseTier, delegate: PoseDelegate): Promise<PoseLandmarker> =>
    vision.PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_PATH[tier], delegate },
      runningMode: "VIDEO",
      numPoses: 1,
      // 0.5, not higher: on a real-clip benchmark 0.6 lost the person in more
      // frames of dim/grainy video (71 vs 119 of 360) and gained nothing.
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      outputSegmentationMasks: false,
    });

  let tier = chooseTier(capabilities);
  let delegate: PoseDelegate = "GPU";
  let landmarker: PoseLandmarker | null = null;
  try {
    landmarker = await build(tier, "GPU");
  } catch {
    // WebGL isn't available on every device; CPU is slower but portable.
    delegate = "CPU";
    // Auto must not use full on CPU: the 9MB float16 model cannot hold 30fps.
    tier = chooseTier({ ...capabilities, gpuAvailable: false });
    landmarker = await build(tier, "CPU");
  }

  const listeners = new Set<TierChangeCallback>();
  const samples: number[] = [];
  let downgraded = false;
  let closed = false;
  let replacing: Promise<void> | null = null;

  function downgrade() {
    if (downgraded || closed) return;
    downgraded = true; // one-way: never oscillate between models
    tier = "lite";
    // Announce immediately and stop inferring until the lighter model exists;
    // a half-second of null frames beats continuing to miss the frame budget.
    listeners.forEach((cb) => cb(tier));
    landmarker?.close();
    landmarker = null;
    samples.length = 0;
    replacing = build("lite", delegate)
      .then((replacement) => {
        if (closed) replacement.close();
        else landmarker = replacement;
      })
      .catch(() => {
        // Keep the engine closed rather than silently reverting to full: the
        // caller sees no frames and can surface a "model unavailable" state.
      })
      .finally(() => {
        replacing = null;
      });
  }

  return {
    get tier() {
      return tier;
    },
    get delegate() {
      return delegate;
    },

    onTierChange(cb) {
      listeners.add(cb);
    },

    detect(video, timestampMs) {
      if (closed || !landmarker) return null;
      const started = performance.now();
      let result: ReturnType<PoseLandmarker["detectForVideo"]>;
      try {
        result = landmarker.detectForVideo(video, timestampMs);
      } catch {
        // A stale/reused video timestamp makes MediaPipe throw; skip the frame
        // rather than taking down the camera loop.
        return null;
      }
      const elapsed = performance.now() - started;

      if (tier === "full" && !downgraded) {
        samples.push(elapsed);
        if (samples.length > SLOW_FRAME_SAMPLES) samples.shift();
        if (shouldDowngrade(samples)) downgrade();
      }

      const landmarks = result.landmarks[0];
      if (!landmarks || landmarks.length === 0) return null;
      const world = result.worldLandmarks?.[0];
      return {
        landmarks: landmarks as Landmark2D[],
        worldLandmarks: world && world.length > 0 ? (world as Landmark3D[]) : null,
        timestampMs,
      };
    },

    close() {
      if (closed) return;
      closed = true;
      listeners.clear();
      landmarker?.close();
      landmarker = null;
      // If a downgrade is mid-flight, its .then closes the new instance too.
      void replacing;
    },
  };
}
