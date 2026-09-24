import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import {
  ChallengesBrowser,
  type ChallengeFilter,
} from "@/components/challenges/ChallengesBrowser";
import { getChallenges } from "@/lib/data";

export const metadata: Metadata = { title: "Challenges" };

const FILTERS: ChallengeFilter[] = ["all", "solo", "team"];

export default async function ChallengesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const [{ type }, challenges] = await Promise.all([searchParams, getChallenges()]);
  const initialFilter = FILTERS.find((f) => f === type) ?? "all";

  return (
    <div>
      <PageHeader
        kicker="Challenges"
        title="Your challenges"
        subtitle="Solo streaks and team goals, all in one place."
        actions={
          <ButtonLink href="/challenges/new" variant="primary">
            <Plus size={18} strokeWidth={2.5} aria-hidden="true" />
            New challenge
          </ButtonLink>
        }
      />
      <ChallengesBrowser challenges={challenges} initialFilter={initialFilter} />
    </div>
  );
}
