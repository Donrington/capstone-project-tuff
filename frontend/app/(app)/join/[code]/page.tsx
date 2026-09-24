import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound, UsersRound } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { JoinForm } from "@/components/invite/JoinForm";
import { findByCode } from "@/lib/data";
import styles from "./join.module.css";

type Params = Promise<{ code: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { code } = await params;
  const match = await findByCode(code);
  return { title: match ? `Join ${match.name}` : "Join" };
}

export default async function JoinPage({ params }: { params: Params }) {
  const { code } = await params;
  const match = await findByCode(code);

  if (!match) {
    return (
      <div>
        <PageHeader kicker="Join" title="That code didn't work" />
        <EmptyState
          icon={KeyRound}
          title="No match for that code"
          text="That code doesn't match a team or challenge. Check it with whoever sent it."
          action={<ButtonLink href="/dashboard">Go to your dashboard</ButtonLink>}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        kicker={match.kind === "team" ? "Team invite" : "Challenge invite"}
        title={`Join ${match.name}`}
      />

      <div className={styles.card}>
        <div className={styles.iconWrap}>
          <UsersRound size={26} strokeWidth={2} aria-hidden="true" />
        </div>
        <h2 className={styles.name}>{match.name}</h2>
        <p className={styles.detail}>{match.detail}</p>
        <p className={styles.code}>{match.code}</p>
        <JoinForm code={match.code} />
        <p className={styles.bail}>
          <Link href="/dashboard">Not now</Link>
        </p>
      </div>
    </div>
  );
}
