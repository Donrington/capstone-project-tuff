import type { SessionUser } from "@/lib/auth/get-current-user";
import type { Persona } from "@/lib/types";
import { NavSignIn } from "./nav-sign-in";
import { ProfileMenu, TopBarProfileMenu, type NavProfileUser } from "./profile-menu";

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2);
  return letters.toUpperCase();
}

/** Only the minimal, serializable parts of the user cross into the client. */
function toNavUser(user: SessionUser): NavProfileUser {
  return { name: user.name, email: user.email, avatarUrl: user.avatarUrl, initials: initialsOf(user.name) };
}

/** The profile slot: the signed-in block, or Sign in. */
export function NavProfile({ user, persona }: { user: SessionUser | null; persona: Persona | null }) {
  if (!user) return <NavSignIn />;
  return <ProfileMenu user={toNavUser(user)} persona={persona} />;
}

/** The top bar's avatar, which opens the account menu on small screens. */
export function NavTopBarProfile({ user, persona }: { user: SessionUser; persona: Persona | null }) {
  return <TopBarProfileMenu user={toNavUser(user)} persona={persona} />;
}
