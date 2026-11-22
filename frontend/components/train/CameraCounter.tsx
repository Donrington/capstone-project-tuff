"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";
import { createPoseEngine, type PoseEngine } from "@/lib/pose/engine";
import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { useToast } from "@/components/ui/Toast";
import { formatCount } from "@/lib/challenge-card";
import { createCounter, type Counter, type CounterState, type Exercise, type FormFlag } from "@/lib/rep-counter/counter";
import type { Landmark2D } from "@/lib/rep-counter/geometry";
import { createHoldTimer, MIN_SEGMENT_MS, type HoldState, type HoldTimer } from "@/lib/rep-counter/hold";
import type { Challenge } from "@/lib/types";
import {
  saveCameraHold,
  saveCameraSession,
  type SaveCameraSessionState,
} from "@/app/(app)/actions";
import { coverTransform } from "@/lib/train-ui/cover";
import { depthFromAngle } from "@/lib/train-ui/depth";
import { bodyFitsFrame } from "@/lib/train-ui/framing";
import {
  playRepFeedback,
  primeFeedback,
  readSoundPreference,
  writeSoundPreference,
} from "@/lib/train-ui/feedback";
import { drawPose, type OverlayTransform } from "./draw-pose";
import { FramingGuide, StageMessage, TrainHud } from "./TrainHud";
import { averageRepSeconds, SaveSheet } from "./SaveSheet";
import { TrainControls } from "./TrainControls";
import { useImmersive } from "./useImmersive";
import { useWakeLock } from "./useWakeLock";
import styles from "./CameraCounter.module.css";

export type TrainExercise = Exercise | "plank";

type CameraStatus =
  | "idle"
  | "loading-model"
  | "starting-camera"
  | "framing"
  | "countdown"
  | "live"
  | "denied"
  | "no-camera"
  | "error";

const FRAME_INTERVAL = 1000 / 30;
const MIN_HOLD_MS = 5000;
const FRAME_STABLE_MS = 700;
const COUNTDOWN_STEP_MS = 700;
const CUE_MS = 2800;

const INITIAL_STATE: CounterState = { reps: 0, repTimes: [], phase: "not-visible", angle: null, flags: [] };
const INITIAL_HOLD: HoldState = {
  heldMs: 0,
  holding: false,
  phase: "not-visible",
  angle: null,
  flags: [],
  segments: [],
};

const STATUS_COPY: Record<CameraStatus, string> = {
  idle: "Press start to frame yourself, then counting begins.",
  "loading-model": "Loading the pose model…",
  "starting-camera": "Starting the camera…",
  framing: "",
  countdown: "",
  live: "",
  denied: "Camera access was blocked — allow it in your browser settings to count reps and holds.",
  "no-camera": "No camera found — connect a camera and try again.",
  error: "The camera couldn't start. Check your browser and try again.",
};

const PHASE_LABEL: Record<CounterState["phase"], string> = {
  up: "Up",
  down: "Down",
  "not-visible": "Not visible",
};

const HOLD_PHASE_LABEL: Record<HoldState["phase"], string> = {
  holding: "Holding",
  broken: "Hold broken",
  "not-visible": "Not visible",
};

const TITLE_HINT: Record<TrainExercise, RegExp> = {
  pushups: /push[\s-]?up/i,
  squats: /squat/i,
  plank: /plank/i,
};

const TIP: Record<TrainExercise, string> = {
  // Device-neutral: the same tip shows beside a laptop webcam and on a phone.
  pushups: "Side-on to the camera, about 2 m away, at hip height — head to feet in frame.",
  squats: "Side-on to the camera, about 2 m away, at hip height — head to feet in frame.",
  plank: "Side-on to the camera, about 2 m away, at floor level — head to heels in frame.",
};

/** m:ss, from the time the camera actually spent holding the plank. */
function formatTimer(heldMs: number) {
  const total = Math.floor(heldMs / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

const flagsKey = (flags: readonly FormFlag[]) => flags.map((flag) => flag.id).join("|");

/**
 * ▼ THE SINGLE DETECTION CALL ▼
 * The only place the pose runtime is invoked. When the engine is upgraded,
 * swap this function's body for the new detector and keep the same signature.
 */
function runDetection(
  engine: PoseEngine,
  video: HTMLVideoElement,
  timestampMs: number,
): readonly Landmark2D[] {
  // The engine picks the model tier (full on capable devices, lite otherwise,
  // with one automatic downgrade if full runs slow) and the GPU/CPU delegate.
  return engine.detect(video, timestampMs)?.landmarks ?? [];
}
/** ▲ END DETECTION CALL ▲ */

/** The challenge that best matches what's being counted. */
function bestChallenge(challenges: Challenge[], exercise: TrainExercise) {
  const unit = exercise === "plank" ? "seconds" : "reps";
  const candidates = challenges.filter((c) => c.unit === unit);
  return (
    candidates.find((c) => c.activity === exercise) ??
    candidates.find((c) => TITLE_HINT[exercise].test(c.title)) ??
    candidates[0]
  );
}

/** On-demand camera counting: no getUserMedia call until the button is pressed. */
export function CameraCounter({
  initialExercise,
  challenges,
}: {
  initialExercise: TrainExercise;
  challenges: Challenge[];
}) {
  const toast = useToast();
  const [exercise, setExercise] = useState<TrainExercise>(initialExercise);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [state, setState] = useState<CounterState>(INITIAL_STATE);
  const [hold, setHold] = useState<HoldState>(INITIAL_HOLD);
  const [framed, setFramed] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [cue, setCue] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [challengeId, setChallengeId] = useState(() => bestChallenge(challenges, initialExercise)?.id ?? "");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<PoseEngine | null>(null);
  const rafRef = useRef<number | null>(null);
  const counterRef = useRef<Counter>(createCounter(initialExercise === "plank" ? "pushups" : initialExercise));
  const holdTimerRef = useRef<HoldTimer>(createHoldTimer("plank"));
  const overlayRef = useRef<OverlayTransform | null>(null);
  // The stable rAF callback reads mutable snapshots; React state is only for
  // HUD fields that actually changed, never per-frame landmark data.
  const stateRef = useRef<CounterState>(INITIAL_STATE);
  const holdRef = useRef<HoldState>(INITIAL_HOLD);
  const exerciseRef = useRef<TrainExercise>(initialExercise);
  const statusRef = useRef<CameraStatus>("idle");
  const soundOnRef = useRef(true);
  const cueRef = useRef<FormFlag | null>(null);
  const cueTimerRef = useRef<number | null>(null);
  const framedRef = useRef(false);
  const framedSinceRef = useRef<number | null>(null);
  const countdownStartRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  const mountedRef = useRef(true);
  /** performance.now() marks for the current set, used to describe its pacing. */
  const sessionStartRef = useRef<number | null>(null);
  const sessionEndRef = useRef<number | null>(null);

  const isHold = exercise === "plank";
  const seconds = Math.floor(hold.heldMs / 1000);
  const cameraOn = status === "framing" || status === "countdown" || status === "live";
  const immersive = useImmersive(stageRef);
  useWakeLock(cameraOn);

  const changeStatus = useCallback((next: CameraStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const resizeOverlay = useCallback(() => {
    const stage = stageRef.current;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!stage || !video || !canvas) return;
    const rect = stage.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
    const width = Math.round(rect.width * pixelRatio);
    const height = Math.round(rect.height * pixelRatio);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    overlayRef.current = {
      ...coverTransform(
        { width: video.videoWidth || 720, height: video.videoHeight || 1280 },
        { width: rect.width, height: rect.height },
      ),
      pixelRatio,
    };
  }, []);

  const clearCue = useCallback(() => {
    if (cueTimerRef.current !== null) window.clearTimeout(cueTimerRef.current);
    cueTimerRef.current = null;
    cueRef.current = null;
    setCue(null);
  }, []);

  const pushCue = useCallback((flags: readonly FormFlag[]) => {
    const latest = flags[flags.length - 1] ?? null;
    if (latest?.id === cueRef.current?.id) return;
    if (cueTimerRef.current !== null) window.clearTimeout(cueTimerRef.current);
    cueTimerRef.current = null;
    cueRef.current = latest;
    if (!latest) {
      setCue(null);
      return;
    }
    setCue(latest.message);
    cueTimerRef.current = window.setTimeout(() => {
      if (cueRef.current?.id === latest.id) {
        cueRef.current = null;
        setCue(null);
      }
      cueTimerRef.current = null;
    }, CUE_MS);
  }, []);

  /** Stops every camera resource without changing the visible status. */
  const cleanupCamera = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    drawPose(canvasRef.current, null, overlayRef.current);
    framedRef.current = false;
    framedSinceRef.current = null;
    countdownStartRef.current = null;
    countdownRef.current = null;
    setFramed(false);
    setCountdown(null);
    clearCue();
  }, [clearCue]);

  useEffect(() => {
    mountedRef.current = true;
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resizeOverlay);
    if (stageRef.current && observer) observer.observe(stageRef.current);
    return () => {
      mountedRef.current = false;
      observer?.disconnect();
      cleanupCamera();
    };
  }, [cleanupCamera, resizeOverlay]);

  const stop = useCallback(() => {
    // The set ends when the camera does, so the saved duration is the span
    // the counter was actually watching — not the time spent on this panel.
    if (sessionStartRef.current !== null && sessionEndRef.current === null) {
      sessionEndRef.current = performance.now();
    }
    cleanupCamera();
    changeStatus("idle");
  }, [changeStatus, cleanupCamera]);

  const tick = useCallback((now: number) => {
    rafRef.current = requestAnimationFrame(tick);
    if (now - lastFrameRef.current < FRAME_INTERVAL) return;
    lastFrameRef.current = now;

    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !landmarker || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
    if (!overlayRef.current) resizeOverlay();

    const timestamp = performance.now();
    const detected = runDetection(landmarker, video, timestamp);
    drawPose(canvasRef.current, detected.length > 0 ? detected : null, overlayRef.current);

    // Framing and countdown are detection-only: frames here never reach a
    // counter, so the 3-2-1 lead-in cannot score a rep or a hold.
    if (statusRef.current === "framing") {
      const fits = bodyFitsFrame(detected);
      if (framedRef.current !== fits) {
        framedRef.current = fits;
        setFramed(fits);
      }
      if (fits) {
        if (framedSinceRef.current === null) framedSinceRef.current = now;
        if (now - framedSinceRef.current >= FRAME_STABLE_MS) {
          changeStatus("countdown");
          countdownStartRef.current = now;
          countdownRef.current = 3;
          setCountdown(3);
        }
      } else {
        framedSinceRef.current = null;
      }
      return;
    }
    if (statusRef.current === "countdown") {
      const elapsed = now - (countdownStartRef.current ?? now);
      const next = Math.max(1, 3 - Math.floor(elapsed / COUNTDOWN_STEP_MS));
      if (countdownRef.current !== next) {
        countdownRef.current = next;
        setCountdown(next);
      }
      if (elapsed >= COUNTDOWN_STEP_MS * 3) {
        changeStatus("live");
        setCountdown(null);
        sessionStartRef.current = performance.now();
        sessionEndRef.current = null;
      }
      return;
    }
    if (statusRef.current !== "live") return;

    if (exerciseRef.current === "plank") {
      const next = holdTimerRef.current.update(detected, timestamp);
      const previous = holdRef.current;
      holdRef.current = next;
      const bucket = Math.floor(next.heldMs / 100);
      if (
        next.phase !== previous.phase ||
        next.holding !== previous.holding ||
        flagsKey(next.flags) !== flagsKey(previous.flags) ||
        bucket !== Math.floor(previous.heldMs / 100)
      ) {
        setHold(next);
      }
      pushCue(next.flags);
      return;
    }

    const next = counterRef.current.update(detected, timestamp);
    const previous = stateRef.current;
    stateRef.current = next;
    if (next.reps > previous.reps) playRepFeedback(soundOnRef.current);
    const depthBucket = Math.round(
      (next.depth ?? depthFromAngle(exerciseRef.current as Exercise, next.angle)) * 40,
    );
    if (
      next.reps !== previous.reps ||
      next.phase !== previous.phase ||
      flagsKey(next.flags) !== flagsKey(previous.flags) ||
      depthBucket !== Math.round((previous.depth ?? depthFromAngle(exerciseRef.current as Exercise, previous.angle)) * 40)
    ) {
      setState(next);
    }
    pushCue(next.flags);
  }, [changeStatus, pushCue, resizeOverlay]);

  async function start() {
    clearSet();
    changeStatus("loading-model");
    primeFeedback();
    try {
      // Created on click so the (large) WASM bundle never touches the server
      // render, and so the browser sees the user gesture for getUserMedia.
      // The engine owns model tier, delegate fallback and slow-device downgrade.
      const landmarker = await createPoseEngine();
      if (!mountedRef.current) {
        landmarker.close();
        return;
      }
      landmarkerRef.current = landmarker;

      changeStatus("starting-camera");
      // Phones in portrait keep the approved portrait stream. Desktop asks for
      // a proper HD landscape frame so the 16:10 stage isn't fed a cropped 4:3
      // one; tablets use 4:3. Whatever the camera returns, the overlay reads
      // videoWidth/videoHeight and maps through the real cover crop.
      const desktop = window.matchMedia("(min-width: 1024px)").matches;
      const portrait = !desktop && window.matchMedia("(orientation: portrait)").matches && window.innerWidth < 1024;
      const video: MediaTrackConstraints = portrait
        ? { facingMode: "user", width: { ideal: 720 }, height: { ideal: 1280 }, aspectRatio: { ideal: 9 / 16 } }
        : desktop
          ? { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 }, aspectRatio: { ideal: 16 / 9 } }
          : { facingMode: "user", width: { ideal: 960 }, height: { ideal: 720 }, aspectRatio: { ideal: 4 / 3 } };
      const stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
      if (!mountedRef.current || !landmarkerRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;

      const element = videoRef.current;
      if (!element) throw new Error("Video element missing");
      element.srcObject = stream;
      await element.play();
      resizeOverlay();
      changeStatus("framing");
      sessionStartRef.current = null;
      sessionEndRef.current = null;
      lastFrameRef.current = 0;
      rafRef.current = requestAnimationFrame(tick);
    } catch (error) {
      if (!mountedRef.current) return;
      let next: CameraStatus = "error";
      if (error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError")) {
        next = "denied";
      } else if (
        error instanceof DOMException &&
        (error.name === "NotFoundError" || error.name === "OverconstrainedError")
      ) {
        next = "no-camera";
      }
      cleanupCamera();
      changeStatus(next);
    }
  }

  function clearSet(next: TrainExercise = exercise) {
    counterRef.current = createCounter(next === "plank" ? "pushups" : next);
    holdTimerRef.current = createHoldTimer("plank");
    stateRef.current = INITIAL_STATE;
    holdRef.current = INITIAL_HOLD;
    setState(INITIAL_STATE);
    setHold(INITIAL_HOLD);
    setSaveError(null);
    framedRef.current = false;
    framedSinceRef.current = null;
    countdownStartRef.current = null;
    countdownRef.current = null;
    setFramed(false);
    setCountdown(null);
    clearCue();
  }

  function reset() {
    clearSet();
    // Resetting while the camera is live starts a fresh set from now; after a
    // stop it drops the unsaved one.
    sessionStartRef.current = status === "live" ? performance.now() : null;
    sessionEndRef.current = null;
  }

  function changeExercise(next: string | string[]) {
    if (next !== "pushups" && next !== "squats" && next !== "plank") return;
    exerciseRef.current = next;
    setExercise(next);
    clearSet(next);
    sessionStartRef.current = null;
    sessionEndRef.current = null;
    setChallengeId(bestChallenge(challenges, next)?.id ?? "");
  }

  function discard() {
    clearSet();
    sessionStartRef.current = null;
    sessionEndRef.current = null;
  }

  function finishSave(result: SaveCameraSessionState, unit: "reps" | "seconds") {
    if (result.error || !result.logged) {
      setSaveError(result.error ?? "Couldn't save that set. Try again.");
      return;
    }
    const logged = result.logged;
    const saved = logged.current - logged.previous;
    toast({
      title: unit === "seconds"
        ? `Saved ${saved} seconds.`
        : `Saved ${formatCount(saved)} ${saved === 1 ? "rep" : "reps"}.`,
      description: `${logged.challengeName} · Camera-counted.`,
      tone: "success",
    });
    discard();
  }

  function save() {
    const startedAt = sessionStartRef.current;
    const endedAt = sessionEndRef.current;
    if (startedAt === null || endedAt === null || !challengeId) {
      setSaveError("Count a set and stop the camera before saving.");
      return;
    }
    const durationMs = Math.round(endedAt - startedAt);
    setSaveError(null);

    if (isHold) {
      // Round first, then derive the seconds from exactly what's sent: the
      // server checks value === floor(sum of segments / 1000), and rounding
      // each end separately can tip the sum across a whole second. The open
      // segment at Stop can also be shorter than the server accepts.
      const segmentsMs = holdRef.current.segments
        .map(
          (segment) =>
            [Math.round(segment.startMs - startedAt), Math.round(segment.endMs - startedAt)] as [number, number],
        )
        .filter(([start, end]) => end - start >= MIN_SEGMENT_MS);
      const heldSeconds = Math.floor(segmentsMs.reduce((total, [start, end]) => total + (end - start), 0) / 1000);
      if (heldSeconds < 5) {
        setSaveError("Hold at least 5 seconds before saving.");
        return;
      }
      startSaving(async () => {
        finishSave(await saveCameraHold({ challengeId, value: heldSeconds, durationMs, segmentsMs }), "seconds");
      });
      return;
    }

    const value = stateRef.current.reps;
    const repOffsetsMs = stateRef.current.repTimes.map((time) => Math.round(time - startedAt));
    startSaving(async () => {
      finishSave(
        await saveCameraSession({ challengeId, value, exercise, durationMs, repOffsetsMs }),
        "reps",
      );
    });
  }

  function toggleSound() {
    const next = !soundOnRef.current;
    soundOnRef.current = next;
    setSoundOn(next);
    writeSoundPreference(next);
  }

  useEffect(() => {
    setSoundOn(readSoundPreference());
  }, []);

  useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  const canReset = isHold ? hold.heldMs > 0 : state.reps > 0;
  const hasResult = isHold ? hold.heldMs >= MIN_HOLD_MS : state.reps > 0;
  const busy = status === "loading-model" || status === "starting-camera";
  const notVisible = status === "live" && (isHold ? hold.phase === "not-visible" : state.phase === "not-visible");
  const phaseLabel = isHold ? HOLD_PHASE_LABEL[hold.phase] : PHASE_LABEL[state.phase];
  const phaseTone: "neutral" | "good" | "warning" = isHold
    ? hold.phase === "holding"
      ? "good"
      : "warning"
    : state.phase === "down"
      ? "good"
      : state.phase === "not-visible"
        ? "warning"
        : "neutral";
  const depth = isHold
    ? hold.holding
      ? Math.min(1, hold.heldMs / 60000)
      : 0
    : (state.depth ?? depthFromAngle(exercise as Exercise, state.angle));
  const message =
    status === "idle" && hasResult
      ? isHold
        ? "Hold finished — save it below."
        : "Set finished — save it below."
      : STATUS_COPY[status];
  const announcement = isHold
    ? `${formatTimer(hold.heldMs)} held. ${HOLD_PHASE_LABEL[hold.phase]}. ${cue ?? ""}`.trim()
    : `${state.reps} ${state.reps === 1 ? "rep" : "reps"}. ${cue ?? ""}`.trim();

  // Values shared by the side panel's live stats and the save sheet. Refs are
  // read during render only for these display values; rAF still owns counting.
  const showSave = hasResult && status !== "live";
  const durationMs =
    sessionStartRef.current !== null && sessionEndRef.current !== null
      ? Math.max(0, Math.round(sessionEndRef.current - sessionStartRef.current))
      : 0;
  const idle = !cameraOn && !hasResult;
  const tempo = isHold ? null : averageRepSeconds(state.repTimes, durationMs);
  // Idle shows a real zero, not a dash: at this size a dash reads as a bar.
  const statValue = idle ? (isHold ? "0:00" : "0") : isHold ? formatTimer(hold.heldMs) : String(state.reps);
  // No verdict on form while nobody is in frame — "Looking good" next to
  // "Not visible" would contradict itself.
  const formValue = idle || notVisible ? "—" : cue ?? "Looking good";

  function onStageKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      immersive.exit();
      return;
    }
    if (event.code !== "Space" && event.key !== " ") return;
    // Let focused buttons own their own Space activation.
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    if (cameraOn) stop();
    else if (!busy && !hasResult) void start();
  }

  return (
    <div
      className={styles.page}
      data-immersive={immersive.active ? "true" : undefined}
      data-result={showSave ? "true" : undefined}
    >
      <section
        ref={stageRef}
        className={`${styles.stage} theme-dark-island`}
        data-live={status === "live" ? "true" : undefined}
        data-camera={cameraOn ? "true" : undefined}
        data-immersive={immersive.active ? "true" : undefined}
        tabIndex={0}
        role="group"
        aria-label="Camera training stage. Press Space to start or stop."
        onKeyDown={onStageKeyDown}
      >
        <video
          ref={videoRef}
          className={styles.video}
          autoPlay
          playsInline
          muted
          aria-label="Mirrored camera preview"
          onLoadedMetadata={resizeOverlay}
        />
        <canvas ref={canvasRef} className={styles.overlay} aria-hidden="true" />
        <div className={styles.vignette} aria-hidden="true" />

        <div className={styles.topRow}>
          <div className={`${styles.glass} ${styles.brand}`}>
            {/* Immersive pill sits over the camera feed — always the colour mark. */}
            <Logo surface="dark" alt="TUFF" width={84} height={28} priority />
          </div>
          <p className={`${styles.glass} ${styles.privacy}`} title="Runs on your device. Video never leaves your phone.">
            <ShieldCheck size={14} strokeWidth={2} aria-hidden="true" />
            Runs on your device. Video never leaves your phone.
          </p>
        </div>

        {(status === "framing" || status === "countdown") && (
          <FramingGuide
            ready={framed}
            countdown={countdown}
            message={framed ? "Looking good — hold still…" : "Step back until your whole body fits"}
          />
        )}
        {message && <StageMessage>{message}</StageMessage>}

        {(status === "live" || hasResult) && (
          <TrainHud
            display={isHold ? formatTimer(hold.heldMs) : String(state.reps)}
            unitLabel={isHold ? "held" : "reps"}
            depth={depth}
            phaseLabel={phaseLabel}
            phaseTone={phaseTone}
            cue={cue}
            pulseKey={isHold ? 0 : state.reps}
          />
        )}
        {notVisible && <p className={`${styles.glass} ${styles.liveHint}`}>Step back so your whole body is in frame.</p>}
        {/* The setup tip is for before the camera starts; once it's on, the framing guide takes over. */}
        {!cameraOn && !hasResult && <p className={`${styles.glass} ${styles.tip}`}>{TIP[exercise]}</p>}

        <p className={styles.srOnly} aria-live="polite" aria-atomic="true">
          {announcement}
        </p>
      </section>

      {/* One DOM tree for every breakpoint: CSS turns this into the phone's
          glass bar over the video, the tablet's row below it, or the desktop
          side card. That keeps state, handlers and focus order identical. */}
      <div className={styles.panelSlot}>
        <aside className={styles.panel} aria-label="Training controls and live stats">
          <div className={styles.controls}>
            <TrainControls
              exercise={exercise}
              onExerciseChange={changeExercise}
              // Framing and the countdown are "on" too: the camera is running and
              // the person must be able to cancel, so the button is Stop from the
              // moment the stream starts, not only once counting begins.
              running={cameraOn}
              busy={busy}
              hasResult={hasResult}
              locked={busy || cameraOn}
              canReset={canReset}
              saving={saving}
              immersive={immersive.active}
              onFullscreen={() => void immersive.toggle()}
              soundOn={soundOn}
              onSoundToggle={toggleSound}
              onStartStop={() => (cameraOn ? stop() : void start())}
              onReset={reset}
              variant={immersive.active ? "overlay" : "panel"}
            />
          </div>

          <div className={styles.stats}>
            <div className={styles.statHero}>
              <span className={styles.statValue}>{statValue}</span>
              <span className={styles.statUnit}>{isHold ? "held" : "reps"}</span>
            </div>
            <dl className={styles.statRows}>
              <div className={styles.statRow}>
                <dt>Phase</dt>
                <dd data-tone={idle ? undefined : phaseTone}>{idle ? "—" : phaseLabel}</dd>
              </div>
              <div className={styles.statRow}>
                <dt>Tempo</dt>
                <dd>{tempo === null ? "—" : `${tempo.toFixed(1)} s/rep`}</dd>
              </div>
              <div className={styles.statRow}>
                <dt>Form</dt>
                <dd data-clean={formValue === "Looking good" ? "true" : undefined}>{formValue}</dd>
              </div>
            </dl>
          </div>

          <div className={styles.panelFooter}>
            <p className={styles.tipText}>{TIP[exercise]}</p>
            <p className={styles.privacyNote}>
              <ShieldCheck size={16} strokeWidth={2} aria-hidden="true" />
              Runs on your device. Video never leaves your device.
            </p>
          </div>
        </aside>

        <div className={styles.sheetLayer}>
          {showSave && (
            <SaveSheet
              isHold={isHold}
              reps={state.reps}
              repTimes={state.repTimes}
              heldSeconds={seconds}
              holdCount={hold.segments.length}
              durationMs={durationMs}
              challenges={challenges}
              challengeId={challengeId}
              onChallengeChange={setChallengeId}
              saveError={saveError}
              saving={saving}
              onSave={save}
              onDiscard={discard}
            />
          )}
        </div>
      </div>
    </div>
  );
}
