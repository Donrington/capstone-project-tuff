"use client";

import { useRouter } from "next/navigation";
import { RadioChips } from "@/components/ui/RadioChips";
import { CATEGORY_FILTERS } from "@/data/exercises";

/** The filter lives in the URL so a view can be shared or revisited. */
export function ExerciseFilters({ active }: { active: string }) {
  const router = useRouter();

  return (
    <RadioChips
      legend="Filter exercises by category"
      hideLegend
      name="exercise-category"
      options={CATEGORY_FILTERS}
      value={active}
      onChange={(value) => {
        const slug = String(value);
        // Push so the back button steps through the filters the user chose.
        router.push(slug === "all" ? "/exercises" : `/exercises?category=${slug}`, { scroll: false });
      }}
    />
  );
}
