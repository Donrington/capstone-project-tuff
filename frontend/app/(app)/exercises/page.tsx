import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { ExerciseBrowser } from "@/components/exercises/ExerciseBrowser";

export const metadata: Metadata = { title: "Exercises" };

export default function ExercisesPage() {
  return (
    <div>
      <PageHeader
        kicker="Exercises"
        title="Exercise library"
        subtitle="How to do each move properly, and the mistakes that cost you reps."
      />
      <ExerciseBrowser />
    </div>
  );
}
