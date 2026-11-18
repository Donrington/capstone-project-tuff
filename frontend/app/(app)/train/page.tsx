import type { Metadata } from "next";
import { CameraCounter } from "@/components/train/CameraCounter";
import { PageHeader } from "@/components/ui/PageHeader";
import type { Exercise } from "@/lib/rep-counter/counter";

export const metadata: Metadata = { title: "Camera counter" };

export default async function TrainPage({
  searchParams,
}: {
  searchParams: Promise<{ exercise?: string | string[] }>;
}) {
  const { exercise } = await searchParams;
  const requested = Array.isArray(exercise) ? exercise[0] : exercise;
  const initialExercise: Exercise = requested === "squats" ? "squats" : "pushups";

  return (
    <div>
      <PageHeader
        kicker="Train"
        title="Camera counter"
        subtitle="Live rep counting and form feedback, right in your browser."
      />
      <CameraCounter initialExercise={initialExercise} />
    </div>
  );
}
