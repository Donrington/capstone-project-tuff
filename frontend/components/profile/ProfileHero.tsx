import { Pencil } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/Button";
import { formatDay } from "@/lib/dates";
import type { User } from "@/lib/types";
import styles from "./ProfileHero.module.css";

export function ProfileHero({ user }: { user: User }) {
  return (
    <section className={styles.hero}>
      <Avatar initials={user.initials} size="xl" activeToday photoUrl={user.profilePicture} />
      <div className={styles.info}>
        <h1 className={styles.name}>
          {user.firstName} {user.lastName}
        </h1>
        <p className={styles.meta}>
          {user.teamName || "No team yet"} · Member since{" "}
          {formatDay(user.memberSince, user.timezone, { month: "long", year: "numeric" })}
        </p>
      </div>
      <ButtonLink href="/settings#profile" variant="ghost">
        <Pencil size={16} strokeWidth={2.25} aria-hidden="true" />
        Edit profile
      </ButtonLink>
    </section>
  );
}
