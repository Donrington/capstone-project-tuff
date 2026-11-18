import type { Metadata } from "next";
import { CameraCounter, type TrainExercise } from "@/components/train/CameraCounter";
import { PageHeader } from "@/components/ui/PageHeader";
import { getActiveChallenges } from "@/lib/data";

export const metadata: Metadata = { title: "Camera counter" };

export default async function TrainPage({
  searchParams,
}: {
  searchParams: Promise<{ exercise?: string | string[] }>;
}) {
  const { exercise } = await searchParams;
  const requested = Array.isArray(exercise) ? exercise[0] : exercise;
  const initialExercise: TrainExercise =
    requested === "squats" ? "squats" : requested === "plank" ? "plank" : "pushups";
  // Both counters live here: reps challenges take sets, seconds challenges
  // take holds. The picker narrows the list again once an exercise is chosen.
  const challenges = (await getActiveChallenges()).filter((c) => c.unit === "reps" || c.unit === "seconds");

  return (
    <div>
      <PageHeader
        kicker="Train"
        title="Camera counter"
        subtitle="Live counting, timing and form feedback, right in your browser."
      />
      <CameraCounter initialExercise={initialExercise} challenges={challenges} />
    </div>
  );
}
