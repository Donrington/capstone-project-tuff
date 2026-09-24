import type { Metadata } from "next";
import { KeyRound, UserPlus, UsersRound } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { InviteButton } from "@/components/invite/InviteButton";
import { JoinWithCodeButton } from "@/components/invite/JoinWithCodeButton";
import { getTeamSummary } from "@/lib/data";

export const metadata: Metadata = { title: "Teams" };

export default async function TeamsPage() {
  const team = await getTeamSummary();

  return (
    <div>
      <PageHeader
        kicker="Teams"
        title="Your teams"
        actions={
          <JoinWithCodeButton variant="ghost">
            <KeyRound size={18} strokeWidth={2.25} aria-hidden="true" />
            Join with a code
          </JoinWithCodeButton>
        }
      />
      <EmptyState
        icon={UsersRound}
        title="Team pages are next"
        text="Rosters, team streaks, and head-to-head stats will live here. Invite your crew in the meantime."
        action={
          <InviteButton
            variant="secondary"
            subject={{ kind: "team", name: team.name, code: team.code }}
          >
            <UserPlus size={18} strokeWidth={2.25} aria-hidden="true" />
            Invite your team
          </InviteButton>
        }
      />
    </div>
  );
}
