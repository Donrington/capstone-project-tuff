import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function TeamNotFound() {
  return (
    <EmptyState
      icon={SearchX}
      title="That team isn't here"
      text="It may have been renamed or closed, or the link is wrong."
      action={<ButtonLink href="/teams">All teams</ButtonLink>}
    />
  );
}
