"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PoseLandmarker as PoseLandmarkerInstance } from "@mediapipe/tasks-vision";
import { AlertTriangle, Camera, RotateCcw, ShieldCheck, Square } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { RadioChips, type ChipOption } from "@/components/ui/RadioChips";
import { createCounter, type Counter, type CounterState, type Exercise } from "@/lib/rep-counter/counter";
import { drawPose } from "./draw-pose";
import styles from "./CameraCounter.module.css";

type CameraStatus = "idle" | "loading-model" | "starting-camera" | "live" | "denied" | "no-camera" | "error";

const MODEL_PATH = "/mediapipe/pose_landmarker_lite.task";
const WASM_PATH = "/mediapipe/wasm";
const FRAME_INTERVAL = 1000 / 30;

const INITIAL_STATE: CounterState = { reps: 0, phase: "not-visible", angle: null, flags: [] };

const OPTIONS: ChipOption[] = [
  { value: "pushups", label: "Push-ups", hint: "Tracks your elbow angle" },
  { value: "squats", label: "Squats", hint: "Tracks your knee angle" },
];

const STATUS_COPY: Record<CameraStatus, string> = {
  idle: "Press start camera to begin counting.",
  "loading-model": "Loading the pose model…",
  "starting-camera": "Starting the camera…",
  live: "",
  denied: "Camera access was blocked — allow it in your browser settings to count reps.",
  "no-camera": "No camera found — connect a camera and try again.",
  error: "The camera couldn't start. Check your browser and try again.",
};

const PHASE_LABEL: Record<CounterState["phase"], string> = {
  up: "Up",
  down: "Down",
  "not-visible": "Not visible",
};

/** On-demand camera counting: no getUserMedia call until the button is pressed. */
export function CameraCounter({ initialExercise }: { initialExercise: Exercise }) {
  const [exercise, setExercise] = useState<Exercise>(initialExercise);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [state, setState] = useState<CounterState>(INITIAL_STATE);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<PoseLandmarkerInstance | null>(null);
  const rafRef = useRef<number | null>(null);
  const counterRef = useRef<Counter>(createCounter(initialExercise));
  const lastFrameRef = useRef(0);
  const mountedRef = useRef(true);

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    drawPose(canvasRef.current, null);
    setStatus("idle");
  }, []);

  const tick = useCallback((now: number) => {
    rafRef.current = requestAnimationFrame(tick);
    if (now - lastFrameRef.current < FRAME_INTERVAL) return;
    lastFrameRef.current = now;

    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !landmarker || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

    const timestamp = performance.now();
    const detected = landmarker.detectForVideo(video, timestamp).landmarks[0] ?? [];
    const next = counterRef.current.update(detected, timestamp);
    const visible = detected.length > 0 && next.phase !== "not-visible" ? detected : null;
    setState(next);
    drawPose(canvasRef.current, visible);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stop();
    };
  }, [stop]);

  async function start() {
    setStatus("loading-model");
    try {
      // Loaded on click so the (large) WASM bundle never touches the server
      // render, and so the browser sees the user gesture for getUserMedia.
      const vision = await import("@mediapipe/tasks-vision");
      const fileset = await vision.FilesetResolver.forVisionTasks(WASM_PATH);
      const options = (delegate: "GPU" | "CPU") => ({
        baseOptions: { modelAssetPath: MODEL_PATH, delegate },
        runningMode: "VIDEO" as const,
        numPoses: 1,
      });

      let landmarker: PoseLandmarkerInstance;
      try {
        landmarker = await vision.PoseLandmarker.createFromOptions(fileset, options("GPU"));
      } catch {
        // WebGL isn't available on every device; CPU is slower but portable.
        landmarker = await vision.PoseLandmarker.createFromOptions(fileset, options("CPU"));
      }
      if (!mountedRef.current) {
        landmarker.close();
        return;
      }
      landmarkerRef.current = landmarker;

      setStatus("starting-camera");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      if (!mountedRef.current || !landmarkerRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) throw new Error("Video element missing");
      video.srcObject = stream;
      await video.play();

      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
      }
      setStatus("live");
      lastFrameRef.current = 0;
      rafRef.current = requestAnimationFrame(tick);
    } catch (error) {
      if (!mountedRef.current) return;
      if (error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError")) {
        setStatus("denied");
      } else if (
        error instanceof DOMException &&
        (error.name === "NotFoundError" || error.name === "OverconstrainedError")
      ) {
        setStatus("no-camera");
      } else {
        setStatus("error");
      }
      stop();
    }
  }

  function reset() {
    counterRef.current = createCounter(exercise);
    setState(INITIAL_STATE);
  }

  function changeExercise(next: string | string[]) {
    if (next !== "pushups" && next !== "squats") return;
    setExercise(next);
    counterRef.current = createCounter(next);
    setState(INITIAL_STATE);
  }

  const latestFlag = state.flags[state.flags.length - 1];
  const busy = status === "loading-model" || status === "starting-camera";
  const locked = busy || status === "live";
  const announcement = `${state.reps} ${state.reps === 1 ? "rep" : "reps"}. ${latestFlag?.message ?? ""}`.trim();

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <section className={styles.panel} aria-labelledby="preview-heading">
          <h2 id="preview-heading" className={styles.sectionTitle}>
            Live preview
          </h2>
          <div className={styles.stage} data-live={status === "live" ? "true" : undefined}>
            <video
              ref={videoRef}
              className={styles.video}
              autoPlay
              playsInline
              muted
              aria-label="Mirrored camera preview"
            />
            <canvas ref={canvasRef} className={styles.overlay} aria-hidden="true" />
            {status !== "live" && (
              <p className={styles.placeholder} role="status">
                {STATUS_COPY[status]}
              </p>
            )}
          </div>

          <div className={styles.readout}>
            <div>
              <span className={styles.repNumber}>{state.reps}</span>
              <span className={styles.repLabel}>reps</span>
            </div>
            <p className={styles.phase}>
              Phase <strong>{PHASE_LABEL[state.phase]}</strong>
            </p>
          </div>

          {latestFlag && (
            <p className={styles.callout}>
              <AlertTriangle size={18} strokeWidth={2} aria-hidden="true" />
              {latestFlag.message}
            </p>
          )}
          {status === "live" && state.phase === "not-visible" && (
            <p className={styles.hint}>Step back so your whole body is in frame.</p>
          )}

          <div className={styles.controls}>
            {status === "live" ? (
              <Button variant="secondary" onClick={stop}>
                <Square size={16} strokeWidth={2.25} aria-hidden="true" />
                Stop camera
              </Button>
            ) : (
              <Button onClick={start} disabled={busy} aria-busy={busy}>
                <Camera size={18} strokeWidth={2.25} aria-hidden="true" />
                Start camera
              </Button>
            )}
            <Button variant="ghost" onClick={reset} disabled={state.reps === 0}>
              <RotateCcw size={16} strokeWidth={2.25} aria-hidden="true" />
              Reset
            </Button>
          </div>
          <p className={styles.privacy}>
            <ShieldCheck size={15} strokeWidth={2} aria-hidden="true" />
            Runs on your device. Video never leaves your phone.
          </p>
          <p className={styles.srOnly} aria-live="polite" aria-atomic="true">
            {announcement}
          </p>
        </section>

        <section className={styles.panel} aria-labelledby="exercise-heading">
          <h2 id="exercise-heading" className={styles.sectionTitle}>
            Exercise
          </h2>
          <RadioChips
            legend="What are you counting?"
            name="exercise"
            options={OPTIONS.map((option) => ({ ...option, disabled: locked }))}
            value={exercise}
            onChange={changeExercise}
          />
          <p className={styles.helper}>
            Prop your phone side-on, about 2 m away at hip height, so the camera sees you in profile. Keep your head, hips and feet in frame.
          </p>
        </section>
      </div>
    </div>
  );
}
