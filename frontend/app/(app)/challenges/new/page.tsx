import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { NewChallengeWizard } from "@/components/challenges/NewChallengeWizard";
import { getCurrentUser, getTeammates } from "@/lib/data";

export const metadata: Metadata = { title: "New challenge" };

export default async function NewChallengePage({
  searchParams,
}: {
  searchParams: Promise<{ activity?: string }>;
}) {
  const [{ activity }, user, teammates] = await Promise.all([
    searchParams,
    getCurrentUser(),
    getTeammates(),
  ]);

  return (
    <div>
      <PageHeader
        kicker="Challenges"
        title="New challenge"
        subtitle="Five quick questions and it's live."
      />
      <NewChallengeWizard
        user={user}
        teammates={teammates}
        initialActivity={activity ?? null}
      />
    </div>
  );
}
