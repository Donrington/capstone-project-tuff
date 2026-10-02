import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function ExerciseNotFound() {
  return (
    <EmptyState
      icon={SearchX}
      title="That exercise isn't in the library"
      text="The link may be wrong, or it hasn't been added yet."
      action={<ButtonLink href="/exercises">All exercises</ButtonLink>}
    />
  );
}
