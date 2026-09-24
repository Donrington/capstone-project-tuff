import { Pencil } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/Button";
import type { User } from "@/lib/types";
import styles from "./ProfileHero.module.css";

function memberSinceLabel(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function ProfileHero({ user }: { user: User }) {
  return (
    <section className={styles.hero}>
      <Avatar initials={user.initials} size="xl" activeToday photoUrl={user.photoUrl} />
      <div className={styles.info}>
        <h1 className={styles.name}>{user.name}</h1>
        <p className={styles.meta}>
          {user.teamName} · Member since {memberSinceLabel(user.memberSince)}
        </p>
      </div>
      <ButtonLink href="/settings#profile" variant="ghost">
        <Pencil size={16} strokeWidth={2.25} aria-hidden="true" />
        Edit profile
      </ButtonLink>
    </section>
  );
}
