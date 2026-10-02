import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function ChallengeNotFound() {
  return (
    <EmptyState
      icon={SearchX}
      title="That challenge isn't here"
      text="It may have ended, or the link is wrong."
      action={<ButtonLink href="/challenges">All challenges</ButtonLink>}
    />
  );
}
