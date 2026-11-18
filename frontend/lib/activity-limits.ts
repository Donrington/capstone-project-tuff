/** Per-entry caps for logged activity. Keep in sync with backend/utils/activityLimits.js. */
export const ACTIVITY_CAPS: Record<string, number> = {
  reps: 1000,
  steps: 100000,
  seconds: 14400,
};

export function capFor(unit: string): number | undefined {
  return ACTIVITY_CAPS[unit];
}

export function capMessage(unit: string): string {
  const cap = ACTIVITY_CAPS[unit];
  if (!cap) return "That's more than one entry can hold.";
  return `That's more than one session allows (max ${cap.toLocaleString("en-US")} ${unit}).`;
}
