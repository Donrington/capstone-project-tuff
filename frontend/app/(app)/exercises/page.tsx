import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { ExerciseBrowser } from "@/components/exercises/ExerciseBrowser";
import { FeaturedPilates } from "@/components/exercises/FeaturedPilates";
import { CATEGORY_FILTERS } from "@/data/exercises";

export const metadata: Metadata = {
  title: "Exercises and Pilates",
  description:
    "Browse the exercise library, including the 13 classical Pilates mat moves, with form cues and common mistakes.",
};

export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string | string[] }>;
}) {
  const { category } = await searchParams;
  const requested = Array.isArray(category) ? category[0] : category;
  // Unknown values fall back to All instead of showing an empty library.
  const active =
    typeof requested === "string" && CATEGORY_FILTERS.some((f) => f.value === requested)
      ? requested
      : "all";

  return (
    <div>
      <PageHeader
        kicker="Exercises"
        title="Exercise library"
        subtitle="How to do each move properly, and the mistakes that cost you reps."
      />
      {/* Filtering to Pilates already lists the sequence — don't show it twice. */}
      {active !== "pilates" && <FeaturedPilates />}
      <ExerciseBrowser active={active} />
    </div>
  );
}
