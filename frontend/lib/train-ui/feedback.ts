/**
 * Generated feedback: a short WebAudio tick on each counted rep plus a tiny
 * haptic nudge where supported. No audio files, no context until the user has
 * started a session (a gesture), and no failures surfaced to the UI.
 */

type AudioContextLike = {
  state: string;
  currentTime: number;
  destination: AudioDestinationNode;
  createOscillator(): OscillatorNode;
  createGain(): GainNode;
  resume(): Promise<void>;
};

type AudioContextConstructor = new () => AudioContextLike;

const SOUND_KEY = "tuff:train:sound";
let context: AudioContextLike | null = null;

function audioConstructor(): AudioContextConstructor | null {
  if (typeof window === "undefined") return null;
  const scope = window as typeof window & { webkitAudioContext?: AudioContextConstructor };
  return scope.AudioContext ?? scope.webkitAudioContext ?? null;
}

/** Called from the Start button so the context is created inside a gesture. */
export function primeFeedback(): void {
  if (context || !audioConstructor()) return;
  try {
    context = new (audioConstructor()!)();
  } catch {
    context = null;
  }
}

export function playRepFeedback(enabled: boolean): void {
  if (!enabled) return;
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate?.(12);
  }
  try {
    primeFeedback();
    if (!context) return;
    if (context.state === "suspended") void context.resume();
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, now);
    oscillator.frequency.exponentialRampToValueAtTime(1320, now + 0.05);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.1);
  } catch {
    // Audio is a nicety: a blocked or missing output never stops counting.
  }
}

export function readSoundPreference(): boolean {
  try {
    return window.localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

export function writeSoundPreference(enabled: boolean): void {
  try {
    window.localStorage.setItem(SOUND_KEY, enabled ? "on" : "off");
  } catch {
    // Private mode / disabled storage: keep the in-memory toggle only.
  }
}
